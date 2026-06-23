/**
 * Anchor integration tests for bkspc program (local validator).
 * Run: pnpm --filter @workspace/solana run test:anchor
 */
import { readFileSync } from "node:fs";
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { strict as assert } from "node:assert";
import idl from "../idl/bkspc.json" with { type: "json" };

const PROGRAM_ID = new PublicKey("7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs");

function configPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];
}

function mintAuthorityPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    PROGRAM_ID,
  )[0];
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

describe("bkspc", () => {
  const provider = loadProvider();
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider);

  const treasuryA = Keypair.generate();
  const treasuryB = Keypair.generate();
  const student = Keypair.generate();
  let mint: PublicKey;

  before(async () => {
    const fund = async (kp: Keypair) => {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        2 * LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction(sig);
    };
    const payer = provider.wallet.payer;
    await fund(payer);
    await fund(treasuryA);
    await fund(treasuryB);
    await fund(student);

    mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      9,
    );
  });

  it("initialize_config moves mint authority to program PDA", async () => {
    await program.methods
      .initializeConfig(treasuryA.publicKey, treasuryB.publicKey)
      .accounts({
        payer: provider.wallet.payer.publicKey,
        config: configPda(),
        mint,
        currentMintAuthority: provider.wallet.payer.publicKey,
        mintAuthority: mintAuthorityPda(),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const mintInfo = await provider.connection.getParsedAccountInfo(mint);
    const parsed = (mintInfo.value?.data as { parsed: { info: { mintAuthority: string } } })
      .parsed.info;
    assert.equal(parsed.mintAuthority, mintAuthorityPda().toBase58());
  });

  it("mint_rewards requires both treasury signers", async () => {
    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      student,
      mint,
      student.publicKey,
    );

    await program.methods
      .mintRewards(new anchor.BN(1_000_000_000))
      .accounts({
        treasurySignerA: treasuryA.publicKey,
        treasurySignerB: treasuryB.publicKey,
        config: configPda(),
        mint,
        recipientAta: ata.address,
        mintAuthority: mintAuthorityPda(),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([treasuryA, treasuryB])
      .rpc();

    const balance = await provider.connection.getTokenAccountBalance(ata.address);
    assert.equal(balance.value.amount, "1000000000");
  });

  it("rejects mint_rewards from unauthorized signer", async () => {
    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      student,
      mint,
      student.publicKey,
    );
    const impostor = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      impostor.publicKey,
      LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(sig);

    await assert.rejects(
      program.methods
        .mintRewards(new anchor.BN(1))
        .accounts({
          treasurySignerA: impostor.publicKey,
          treasurySignerB: treasuryB.publicKey,
          config: configPda(),
          mint,
          recipientAta: ata.address,
          mintAuthority: mintAuthorityPda(),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([impostor, treasuryB])
        .rpc(),
    );
  });

  it("burn_tokens burns from student ATA", async () => {
    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      student,
      mint,
      student.publicKey,
    );
    const before = BigInt(
      (await provider.connection.getTokenAccountBalance(ata.address)).value.amount,
    );

    await program.methods
      .mintRewards(new anchor.BN(500_000_000))
      .accounts({
        treasurySignerA: treasuryA.publicKey,
        treasurySignerB: treasuryB.publicKey,
        config: configPda(),
        mint,
        recipientAta: ata.address,
        mintAuthority: mintAuthorityPda(),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([treasuryA, treasuryB])
      .rpc();

    await program.methods
      .burnTokens(new anchor.BN(250_000_000))
      .accounts({
        studentAuthority: student.publicKey,
        config: configPda(),
        mint,
        studentAta: ata.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([student])
      .rpc();

    const balance = await provider.connection.getTokenAccountBalance(ata.address);
    assert.equal(balance.value.amount, String(before + 500_000_000n - 250_000_000n));
  });
});