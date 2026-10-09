/**
 * initialize_convert on Devnet.
 *
 * Moves the Token-2022 mint authority from the deployer to the program PDA and pins the
 * two values that make settlement safe:
 *   - `minter`: the only signer permitted to call `convert_wb_to_bkspc`
 *   - `cap`:    a hard supply ceiling that governance may only lower
 *
 * Requires the program to already be deployed.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getMint } from "@solana/spl-token";
import idl from "../idl/bkspc.json" with { type: "json" };
import {
  ROOT,
  assertDevnetRpc,
  devnetRpc,
  loadDeployerKeypair,
  loadKeypairFile,
} from "./lib/devnet-guards.js";

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

/** Raw (6-decimal) units of the whole-token supply ceiling. */
const CAP_WHOLE_TOKENS = 100_000_000;
const DECIMALS = 6;

async function main(): Promise<void> {
  const rpc = devnetRpc();
  assertDevnetRpc(rpc);

  const localManifestPath = join(ROOT, "devnet", "bkspc-token2022-mint.json");
  const publicPath = join(ROOT, "devnet", "bkspc-token2022.example.json");
  if (!existsSync(localManifestPath) && !existsSync(publicPath)) {
    throw new Error("Run init-bkspc-token2022-devnet first");
  }
  const publicRecord = existsSync(publicPath)
    ? (JSON.parse(readFileSync(publicPath, "utf8")) as {
        mint: string;
        mintAuthority?: string;
        mintAuthorityType?: string;
        minter?: string;
        supplyCap?: number;
      })
    : null;
  const local = existsSync(localManifestPath)
    ? (JSON.parse(readFileSync(localManifestPath, "utf8")) as {
        mint: string;
        mintAuthorityType?: string;
        [key: string]: unknown;
      })
    : null;
  const mintStr = local?.mint ?? publicRecord?.mint;
  if (!mintStr) throw new Error("Mint address missing from Token-2022 records");

  if (publicRecord?.mintAuthorityType === "program-pda") {
    console.log("Already wired to PDA:", publicRecord.mintAuthority);
    return;
  }

  const deployer = loadDeployerKeypair();
  const connection = new Connection(rpc, "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(deployer),
    { commitment: "confirmed" },
  );
  const program = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider);
  const mint = new PublicKey(mintStr);
  const pda = mintAuthorityPda();
  const cfg = convertConfigPda();

  const acc = await connection.getAccountInfo(PROGRAM_ID);
  if (!acc) {
    throw new Error(
      `Program ${PROGRAM_ID.toBase58()} not on this cluster. Deploy upgraded .so first.`,
    );
  }

  // The `minter` is the BlkSpace backend key allowed to sign `convert_wb_to_bkspc`.
  // Without it, nobody can mint. Keep it separate from the deployer so a leaked deployer
  // key cannot mint supply.
  const minterPath = process.env.BKSPC_MINTER_KEYPAIR
    ? resolve(process.env.BKSPC_MINTER_KEYPAIR)
    : join(ROOT, "devnet", "minter.json");
  if (!existsSync(minterPath)) {
    const kp = Keypair.generate();
    writeFileSync(minterPath, `${JSON.stringify(Array.from(kp.secretKey))}\n`, {
      mode: 0o600,
    });
    console.log(`  Created minter keypair: ${minterPath}`);
    console.log("  BACK THIS UP — losing it means settlement cannot mint.");
  }
  const minter = loadKeypairFile(minterPath);

  const capWhole = Number(process.env.BKSPC_SUPPLY_CAP ?? CAP_WHOLE_TOKENS);
  if (!Number.isSafeInteger(capWhole) || capWhole <= 0) {
    throw new Error("BKSPC_SUPPLY_CAP must be a positive whole-token count");
  }
  const capRaw = BigInt(capWhole) * 10n ** BigInt(DECIMALS);

  const unstakeDelay = Number(
    process.env.BKSPC_UNSTAKE_DELAY_SECONDS ?? 2 * 24 * 60 * 60,
  );
  const govDelay = Number(
    process.env.BKSPC_GOV_DELAY_SECONDS ?? 2 * 24 * 60 * 60,
  );

  console.log("initialize_convert — Token-2022 mint authority → PDA");
  console.log("  Mint:", mint.toBase58());
  console.log("  Current authority:", deployer.publicKey.toBase58());
  console.log("  PDA:", pda.toBase58());
  console.log("  Minter (settlement signer):", minter.publicKey.toBase58());
  console.log(`  Supply cap: ${capWhole} BKSPC (${capRaw} raw)`);
  console.log("  Governance may LOWER this cap. No instruction can raise it.");
  console.log(
    `  Unstake delay: ${unstakeDelay}s · Governance delay: ${govDelay}s`,
  );

  await program.methods
    .initializeConvert(
      minter.publicKey,
      deployer.publicKey,
      capRaw,
      new anchor.BN(unstakeDelay),
      new anchor.BN(govDelay),
    )
    .accounts({
      payer: deployer.publicKey,
      convertConfig: cfg,
      mint,
      currentMintAuthority: deployer.publicKey,
      mintAuthority: pda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const onChain = await getMint(
    connection,
    mint,
    "confirmed",
    TOKEN_2022_PROGRAM_ID,
  );
  if (!onChain.mintAuthority?.equals(pda)) {
    throw new Error(
      `Authority not PDA after wire (got ${onChain.mintAuthority?.toBase58()})`,
    );
  }

  if (publicRecord) {
    publicRecord.mintAuthority = pda.toBase58();
    publicRecord.mintAuthorityType = "program-pda";
    publicRecord.minter = minter.publicKey.toBase58();
    publicRecord.supplyCap = capWhole;
    writeFileSync(publicPath, `${JSON.stringify(publicRecord, null, 2)}\n`);
  }
  if (local) {
    const next = {
      ...local,
      mintAuthority: pda.toBase58(),
      mintAuthorityType: "program-pda",
      convertConfig: cfg.toBase58(),
      configInitialized: true,
      minter: minter.publicKey.toBase58(),
      supplyCap: capWhole,
      minterKeypairPath: minterPath,
    };
    writeFileSync(localManifestPath, `${JSON.stringify(next, null, 2)}\n`);
  }

  console.log("Mint authority is now the program PDA.");
  console.log("  Only the minter keypair can now mint BKSPC, up to the cap.");
  console.log(
    "  Explorer:",
    `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
