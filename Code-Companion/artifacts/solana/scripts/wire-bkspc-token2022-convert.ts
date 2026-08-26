/**
 * Ticket 0.2 — initialize_convert on Devnet.
 * Moves Token-2022 mint authority from deployer → program PDA.
 *
 * Requires the upgraded program (convert_wb_to_bkspc) to already be deployed.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getMint } from "@solana/spl-token";
import idl from "../idl/bkspc.json" with { type: "json" };
import {
  ROOT,
  assertDevnetRpc,
  devnetRpc,
  loadDeployerKeypair,
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
      })
    : null;
  const local = existsSync(localManifestPath)
    ? (JSON.parse(readFileSync(localManifestPath, "utf8")) as {
        mint: string;
        mintAuthorityType?: string;
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

  console.log("initialize_convert — Token-2022 mint authority → PDA");
  console.log("  Mint:", mint.toBase58());
  console.log("  Current authority:", deployer.publicKey.toBase58());
  console.log("  PDA:", pda.toBase58());

  await program.methods
    .initializeConvert()
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
    writeFileSync(publicPath, `${JSON.stringify(publicRecord, null, 2)}\n`);
  }
  if (local) {
    const next = {
      ...local,
      mintAuthority: pda.toBase58(),
      mintAuthorityType: "program-pda",
      convertConfig: cfg.toBase58(),
      configInitialized: true,
    };
    writeFileSync(localManifestPath, `${JSON.stringify(next, null, 2)}\n`);
  }

  console.log("Mint authority is now the program PDA.");
  console.log(
    "  Explorer:",
    `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
