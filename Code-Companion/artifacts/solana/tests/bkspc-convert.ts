/**
 * Token-2022 convert_wb_to_bkspc tests (local validator).
 * Run with tests/bkspc.ts via bun run test:anchor when solana-test-validator is available.
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
  TOKEN_2022_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { strict as assert } from "node:assert";
import idl from "../idl/bkspc.json" with { type: "json" };

const PROGRAM_ID = new PublicKey(
  "7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs",
);

function convertConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("convert_config")],
    PROGRAM_ID,
  )[0];
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

describe("bkspc Token-2022 convert", () => {
  const provider = loadProvider();
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider);
  const user = Keypair.generate();
  let mint: PublicKey;

  before(async () => {
    const fund = async (kp: Keypair) => {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        2 * LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction(sig);
    };
    await fund(provider.wallet.payer);
    await fund(user);

    mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.payer.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
  });

  it("initialize_convert moves Token-2022 mint authority to PDA", async () => {
    await program.methods
      .initializeConvert()
      .accounts({
        payer: provider.wallet.payer.publicKey,
        convertConfig: convertConfigPda(),
        mint,
        currentMintAuthority: provider.wallet.payer.publicKey,
        mintAuthority: mintAuthorityPda(),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const mintInfo = await provider.connection.getParsedAccountInfo(mint);
    const parsed = (
      mintInfo.value?.data as { parsed: { info: { mintAuthority: string } } }
    ).parsed.info;
    assert.equal(parsed.mintAuthority, mintAuthorityPda().toBase58());
  });

  it("convert_wb_to_bkspc mints to the signing user's ATA", async () => {
    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      mint,
      user.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    await program.methods
      .convertWbToBkspc(new anchor.BN(1_000_000))
      .accounts({
        user: user.publicKey,
        convertConfig: convertConfigPda(),
        mint,
        userAta: ata.address,
        mintAuthority: mintAuthorityPda(),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const balance = await provider.connection.getTokenAccountBalance(
      ata.address,
    );
    assert.equal(balance.value.amount, "1000000");
  });

  it("rejects convert with amount 0", async () => {
    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      mint,
      user.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    await assert.rejects(
      program.methods
        .convertWbToBkspc(new anchor.BN(0))
        .accounts({
          user: user.publicKey,
          convertConfig: convertConfigPda(),
          mint,
          userAta: ata.address,
          mintAuthority: mintAuthorityPda(),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([user])
        .rpc(),
    );
  });
});
