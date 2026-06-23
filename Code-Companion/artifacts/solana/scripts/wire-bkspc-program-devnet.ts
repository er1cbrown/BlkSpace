/**
 * Deploy bkspc Anchor program (if needed) and call initialize_config.
 * Moves SPL mint authority from deployer → program PDA; records programId in manifest.
 *
 * Usage:
 *   pnpm --filter @workspace/solana run wire-bkspc-program-devnet
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import idl from "../idl/bkspc.json" with { type: "json" };
import {
  ROOT,
  assertDevnetRpc,
  devnetRpc,
  loadDeployerKeypair,
  requireTreasuryManifest,
} from "./lib/devnet-guards.js";

const PROGRAM_ID = new PublicKey("7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs");

function findConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];
}

function findMintAuthorityPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    PROGRAM_ID,
  )[0];
}

async function maybeDeployProgram(rpc: string): Promise<void> {
  const soPath = join(ROOT, "target/deploy/bkspc.so");
  const keyPath = join(ROOT, "target/deploy/bkspc-keypair.json");
  const fixtureKey = join(ROOT, "tests/fixtures/bkspc-program-keypair.json");
  if (!existsSync(keyPath) && existsSync(fixtureKey)) {
    mkdirSync(join(ROOT, "target/deploy"), { recursive: true });
    writeFileSync(keyPath, readFileSync(fixtureKey));
  }
  if (!existsSync(soPath)) {
    console.log("Building bkspc program...");
    execSync("cargo build-sbf --manifest-path programs/bkspc/Cargo.toml", {
      cwd: ROOT,
      stdio: "inherit",
    });
  }
  const connection = new Connection(rpc, "confirmed");
  const acc = await connection.getAccountInfo(PROGRAM_ID);
  if (acc) {
    console.log("Program already deployed:", PROGRAM_ID.toBase58());
    return;
  }
  console.log("Deploying bkspc program to devnet...");
  execSync(
    `solana program deploy "${soPath}" --program-id "${keyPath}" --url ${rpc}`,
    { stdio: "inherit" },
  );
}

async function main(): Promise<void> {
  const rpc = devnetRpc();
  assertDevnetRpc(rpc);

  const manifestPath = join(ROOT, "devnet", "bkspc-mint.json");
  if (!existsSync(manifestPath)) {
    throw new Error("Run init-bkspc-devnet first (bkspc-mint.json missing)");
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    mint: string;
    mintAuthority: string;
    configInitialized?: boolean;
    programId?: string;
    treasurySignerPaths?: string[];
  };

  if (manifest.configInitialized) {
    console.log("Program already wired:", manifestPath);
    return;
  }

  await maybeDeployProgram(rpc);

  const treasury = requireTreasuryManifest();
  const deployer = loadDeployerKeypair();
  const signerA = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        readFileSync(treasury.signerKeypairPaths[0], "utf8"),
      ) as number[],
    ),
  );
  const signerB = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        readFileSync(treasury.signerKeypairPaths[1], "utf8"),
      ) as number[],
    ),
  );

  const connection = new Connection(rpc, "confirmed");
  const wallet = new anchor.Wallet(deployer);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const program = new anchor.Program(
    idl as anchor.Idl,
    PROGRAM_ID,
    provider,
  );

  const mint = new PublicKey(manifest.mint);
  const mintInfo = await getMint(connection, mint);
  const currentAuthority = mintInfo.mintAuthority;
  if (!currentAuthority?.equals(deployer.publicKey)) {
    throw new Error(
      `Mint authority must be deployer before wire (got ${currentAuthority?.toBase58() ?? "none"})`,
    );
  }

  const configPda = findConfigPda();
  const mintAuthorityPda = findMintAuthorityPda();

  console.log("Calling initialize_config...");
  const sig = await program.methods
    .initializeConfig(signerA.publicKey, signerB.publicKey)
    .accounts({
      payer: deployer.publicKey,
      config: configPda,
      mint,
      currentMintAuthority: deployer.publicKey,
      mintAuthority: mintAuthorityPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const mintAfter = await getMint(connection, mint);
  if (!mintAfter.mintAuthority?.equals(mintAuthorityPda)) {
    throw new Error("Mint authority was not transferred to program PDA");
  }

  const updated = {
    ...manifest,
    programId: PROGRAM_ID.toBase58(),
    mintAuthority: mintAuthorityPda.toBase58(),
    mintAuthorityType: "program-pda",
    configInitialized: true,
    initializeConfigSignature: sig,
  };
  writeFileSync(manifestPath, `${JSON.stringify(updated, null, 2)}\n`);

  console.log("\nBKSPC program wired");
  console.log("  Program:", PROGRAM_ID.toBase58());
  console.log("  Config PDA:", configPda.toBase58());
  console.log("  Mint authority PDA:", mintAuthorityPda.toBase58());
  console.log("  Tx:", sig);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});