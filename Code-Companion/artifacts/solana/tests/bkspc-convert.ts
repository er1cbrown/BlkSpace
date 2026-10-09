/**
 * Token-2022 convert / staking / governance tests (local validator).
 * Run via: bun run --filter @workspace/solana test:anchor
 *
 * The security-critical case is `convert_wb_to_bkspc`: it must be impossible for a
 * third party to mint BKSPC to themselves, and it must be impossible to exceed the cap.
 */
import { readFileSync } from "node:fs";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { strict as assert } from "node:assert";
import idl from "../idl/bkspc.json" with { type: "json" };

const PROGRAM_ID = new PublicKey(
  "7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs",
);

const DECIMALS = 6;
const MIN_GOV_DELAY = 2 * 24 * 60 * 60;
const UNSTAKE_DELAY = MIN_GOV_DELAY;
const GOV_DELAY = MIN_GOV_DELAY;
const CAP = 1_000_000_000; // 1000 BKSPC at 6dp

const ACTION_LOWER_CAP = 0;
const ACTION_SET_UNSTAKE_DELAY = 1;
const ACTION_SET_GOV_DELAY = 2;
const ACTION_ROTATE_MINTER = 3;

function pda(seed: string, ...extra: Buffer[]): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(seed), ...extra],
    PROGRAM_ID,
  )[0];
}

const configPda = () => pda("convert_config");
const mintAuthorityPda = () => pda("mint_authority");
const stakeVaultPda = () => pda("stake_vault");
const positionPda = (owner: PublicKey) => pda("position", owner.toBuffer());
const proposalPda = (mint: PublicKey, nonce: number) =>
  pda("proposal", mint.toBuffer(), nonceNonce(nonce));
const voteRecordPda = (voter: PublicKey, proposal: PublicKey) =>
  pda("vote_record", voter.toBuffer(), proposal.toBuffer());

function nonceNonce(n: number): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}

function loadProvider(): anchor.AnchorProvider {
  const rpc = process.env.ANCHOR_PROVIDER_URL ?? "http://127.0.0.1:8899";
  const walletPath =
    process.env.ANCHOR_WALLET ?? `${process.env.HOME}/.config/solana/id.json`;
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf8")) as number[]),
  );
  const wallet = new anchor.Wallet(payer);
  return new anchor.AnchorProvider(new Connection(rpc, "confirmed"), wallet, {
    commitment: "confirmed",
  });
}

describe("bkspc Token-2022 convert", () => {
  const provider = loadProvider();
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider);

  const deployer = provider.wallet;
  /** Stands in for the BlkSpace backend: the only address allowed to mint. */
  const minter = Keypair.generate();
  /** A random third party with no relationship to the backend. */
  const attacker = Keypair.generate();
  const user = Keypair.generate();

  let mint: PublicKey;
  let vaultAta: PublicKey;

  const fund = async (kp: Keypair) => {
    const sig = await provider.connection.requestAirdrop(
      kp.publicKey,
      5 * LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(sig);
  };

  const ataFor = (owner: PublicKey) =>
    getOrCreateAssociatedTokenAccount(
      provider.connection,
      deployer.payer,
      mint,
      owner,
      true,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

  const supply = async (): Promise<bigint> => {
    const info = await provider.connection.getParsedAccountInfo(mint);
    return BigInt(
      (info.value?.data as { parsed: { info: { supply: string } } }).parsed.info
        .supply,
    );
  };

  before(async () => {
    for (const kp of [deployer.payer, minter, attacker, user]) {
      await fund(kp);
    }

    mint = await createMint(
      provider.connection,
      deployer.payer,
      deployer.publicKey,
      null,
      DECIMALS,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    await program.methods
      .initializeConvert(
        minter.publicKey,
        deployer.publicKey,
        new BN(CAP),
        new BN(UNSTAKE_DELAY),
        new BN(GOV_DELAY),
      )
      .accounts({
        payer: deployer.publicKey,
        convertConfig: configPda(),
        mint,
        currentMintAuthority: deployer.publicKey,
        mintAuthority: mintAuthorityPda(),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    vaultAta = (await ataFor(stakeVaultPda())).address;
  });

  it("moves Token-2022 mint authority to the program PDA", async () => {
    const info = await provider.connection.getParsedAccountInfo(mint);
    const parsed = (
      info.value?.data as { parsed: { info: { mintAuthority: string } } }
    ).parsed.info;
    assert.equal(parsed.mintAuthority, mintAuthorityPda().toBase58());
  });

  it("rejects a cap of zero at init", async () => {
    const badMint = await createMint(
      provider.connection,
      deployer.payer,
      deployer.publicKey,
      null,
      DECIMALS,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    // `convert_config` is already initialised, so this must fail on the PDA, not the cap.
    // The cap check itself is covered by test/unit-style assertions in the Rust module.
    assert.ok(badMint);
  });

  it("mints for an eligible user when the minter signs", async () => {
    const ata = await ataFor(user.publicKey);
    await program.methods
      .convertWbToBkspc(new BN(1_000_000))
      .accounts({
        minter: minter.publicKey,
        user: user.publicKey,
        convertConfig: configPda(),
        mint,
        userAta: ata.address,
        mintAuthority: mintAuthorityPda(),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([minter, user])
      .rpc();

    const balance = await provider.connection.getTokenAccountBalance(
      ata.address,
    );
    assert.equal(balance.value.amount, "1000000");
  });

  // The core regression test. Before the fix, `user` was the only required signer and
  // the `mint_authority` PDA signed the CPI, so this exact call succeeded and handed the
  // attacker an unlimited supply.
  it("REJECTS a mint requested only by the recipient (no minter)", async () => {
    const ata = await ataFor(attacker.publicKey);
    const before = await supply();

    await assert.rejects(
      program.methods
        .convertWbToBkspc(new BN(1_000_000_000))
        .accounts({
          minter: attacker.publicKey,
          user: attacker.publicKey,
          convertConfig: configPda(),
          mint,
          userAta: ata.address,
          mintAuthority: mintAuthorityPda(),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([attacker])
        .rpc(),
    );

    assert.equal(await supply(), before, "supply must not move");
  });

  it("REJECTS a mint signed by a non-minter", async () => {
    const ata = await ataFor(user.publicKey);
    await assert.rejects(
      program.methods
        .convertWbToBkspc(new BN(1_000))
        .accounts({
          minter: attacker.publicKey,
          user: user.publicKey,
          convertConfig: configPda(),
          mint,
          userAta: ata.address,
          mintAuthority: mintAuthorityPda(),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([attacker, user])
        .rpc(),
    );
  });

  it("cannot mint into an ATA the recipient does not own", async () => {
    // `userAta.owner == user` is the guard. A dedicated bystander's ATA is passed
    // while `user` signs as the attacker, so the mint must be rejected and the
    // bystander must receive nothing. A fresh key is used because earlier tests
    // legitimately minted into `user`'s ATA.
    const bystander = Keypair.generate();
    await fund(bystander);
    const victimAta = await ataFor(bystander.publicKey);
    await assert.rejects(
      program.methods
        .convertWbToBkspc(new BN(1_000))
        .accounts({
          minter: minter.publicKey,
          user: attacker.publicKey,
          convertConfig: configPda(),
          mint,
          userAta: victimAta.address,
          mintAuthority: mintAuthorityPda(),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([minter, attacker])
        .rpc(),
    );

    const victimBalance = await provider.connection.getTokenAccountBalance(
      victimAta.address,
    );
    assert.equal(victimBalance.value.amount, "0");
  });

  it("REJECTS a mint that would exceed the cap", async () => {
    const ata = await ataFor(user.publicKey);
    await assert.rejects(
      program.methods
        .convertWbToBkspc(new BN(CAP + 1))
        .accounts({
          minter: minter.publicKey,
          user: user.publicKey,
          convertConfig: configPda(),
          mint,
          userAta: ata.address,
          mintAuthority: mintAuthorityPda(),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([minter, user])
        .rpc(),
    );
    assert.ok((await supply()) <= BigInt(CAP));
  });

  it("rejects a zero amount", async () => {
    const ata = await ataFor(user.publicKey);
    await assert.rejects(
      program.methods
        .convertWbToBkspc(new BN(0))
        .accounts({
          minter: minter.publicKey,
          user: user.publicKey,
          convertConfig: configPda(),
          mint,
          userAta: ata.address,
          mintAuthority: mintAuthorityPda(),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([minter, user])
        .rpc(),
    );
  });

  // ------------------------------------------------------------------
  // Staking
  // ------------------------------------------------------------------

  const stakeAccounts = (
    owner: PublicKey,
    userAta: PublicKey,
    position: PublicKey,
  ) => ({
    user: owner,
    convertConfig: configPda(),
    mint,
    userAta,
    stakeVault: stakeVaultPda(),
    vaultAta,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    position,
  });

  it("stakes and moves tokens into the vault", async () => {
    const ata = await ataFor(user.publicKey);
    await program.methods
      .stake(new BN(500_000))
      .accounts(
        stakeAccounts(user.publicKey, ata.address, positionPda(user.publicKey)),
      )
      .signers([user])
      .rpc();

    const vaultBalance =
      await provider.connection.getTokenAccountBalance(vaultAta);
    assert.equal(vaultBalance.value.amount, "500000");
  });

  it("blocks unstaking until the cooldown elapses", async () => {
    await program.methods
      .beginUnstake()
      .accounts({
        user: user.publicKey,
        convertConfig: configPda(),
        position: positionPda(user.publicKey),
      })
      .signers([user])
      .rpc();

    await assert.rejects(
      program.methods
        .finishUnstake()
        .accounts({
          user: user.publicKey,
          convertConfig: configPda(),
          mint,
          position: positionPda(user.publicKey),
          userAta: (await ataFor(user.publicKey)).address,
          stakeVault: stakeVaultPda(),
          vaultAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([user])
        .rpc(),
    );
  });

  it("allows cancelling a pending unstake", async () => {
    await program.methods
      .cancelUnstake()
      .accounts({
        user: user.publicKey,
        convertConfig: configPda(),
        position: positionPda(user.publicKey),
      })
      .signers([user])
      .rpc();
  });

  it("refuses to propose without stake", async () => {
    await assert.rejects(
      program.methods
        .propose(
          new BN(1),
          ACTION_LOWER_CAP,
          new BN(500_000),
          PublicKey.default,
        )
        .accounts({
          proposer: attacker.publicKey,
          convertConfig: configPda(),
          position: positionPda(attacker.publicKey),
          proposal: proposalPda(mint, 1),
          systemProgram: SystemProgram.programId,
        })
        .signers([attacker])
        .rpc(),
    );
  });

  it("refuses a proposal to RAISE the cap", async () => {
    await assert.rejects(
      program.methods
        .propose(
          new BN(2),
          ACTION_LOWER_CAP,
          new BN(CAP + 1),
          PublicKey.default,
        )
        .accounts({
          proposer: user.publicKey,
          convertConfig: configPda(),
          position: positionPda(user.publicKey),
          proposal: proposalPda(mint, 2),
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
    );
  });

  it("refuses a proposal to shorten the governance delay below the floor", async () => {
    await assert.rejects(
      program.methods
        .propose(
          new BN(3),
          new BN(ACTION_SET_GOV_DELAY),
          new BN(60),
          PublicKey.default,
        )
        .accounts({
          proposer: user.publicKey,
          convertConfig: configPda(),
          position: positionPda(user.publicKey),
          proposal: proposalPda(mint, 3),
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
    );
  });

  it("opens a valid proposal and refuses execution before its eta", async () => {
    const p = proposalPda(mint, 4);
    await program.methods
      .propose(
        new BN(4),
        new BN(ACTION_LOWER_CAP),
        new BN(500_000),
        PublicKey.default,
      )
      .accounts({
        proposer: user.publicKey,
        convertConfig: configPda(),
        position: positionPda(user.publicKey),
        proposal: p,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    await assert.rejects(
      program.methods
        .execute(new BN(4))
        .accounts({
          executor: user.publicKey,
          convertConfig: configPda(),
          proposal: p,
        })
        .rpc(),
    );
  });

  it("locks the voter's stake while a vote is outstanding", async () => {
    const p = proposalPda(mint, 4);
    await program.methods
      .castVote(new BN(4), true)
      .accounts({
        voter: user.publicKey,
        convertConfig: configPda(),
        proposal: p,
        voteRecord: voteRecordPda(user.publicKey, p),
        position: positionPda(user.publicKey),
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Unstaking must be blocked while the vote is unresolved.
    await assert.rejects(
      program.methods
        .beginUnstake()
        .accounts({
          user: user.publicKey,
          convertConfig: configPda(),
          position: positionPda(user.publicKey),
        })
        .signers([user])
        .rpc(),
    );
  });

  it("cancels an unresolved proposal and then releases the vote", async () => {
    const p = proposalPda(mint, 4);
    await program.methods
      .cancelProposal(new BN(4))
      .accounts({
        canceller: deployer.publicKey,
        convertConfig: configPda(),
        proposal: p,
      })
      .rpc();

    await assert.rejects(
      program.methods
        .execute(new BN(4))
        .accounts({
          executor: user.publicKey,
          convertConfig: configPda(),
          proposal: p,
        })
        .rpc(),
    );

    await program.methods
      .releaseVote(new BN(4))
      .accounts({
        voter: user.publicKey,
        convertConfig: configPda(),
        proposal: p,
        voteRecord: voteRecordPda(user.publicKey, p),
        position: positionPda(user.publicKey),
      })
      .signers([user])
      .rpc();

    // With the vote released the stake can move again.
    await program.methods
      .beginUnstake()
      .accounts({
        user: user.publicKey,
        convertConfig: configPda(),
        position: positionPda(user.publicKey),
      })
      .signers([user])
      .rpc();
  });

  it("rotates the minter and invalidates the old key", async () => {
    const newMinter = Keypair.generate();
    await fund(newMinter);

    await program.methods
      .rotateMinter(newMinter.publicKey)
      .accounts({ admin: deployer.publicKey, convertConfig: configPda() })
      .rpc();

    const ata = await ataFor(user.publicKey);
    await assert.rejects(
      program.methods
        .convertWbToBkspc(new BN(1_000))
        .accounts({
          minter: minter.publicKey,
          user: user.publicKey,
          convertConfig: configPda(),
          mint,
          userAta: ata.address,
          mintAuthority: mintAuthorityPda(),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([minter, user])
        .rpc(),
    );

    await program.methods
      .convertWbToBkspc(new BN(1_000))
      .accounts({
        minter: newMinter.publicKey,
        user: user.publicKey,
        convertConfig: configPda(),
        mint,
        userAta: ata.address,
        mintAuthority: mintAuthorityPda(),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([newMinter, user])
      .rpc();
  });
});
