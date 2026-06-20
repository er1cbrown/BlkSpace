/**
 * Create a 2-of-2 SPL token multisig treasury (devnet).
 * Signers are separate from the deployer hot wallet — not a solo mint authority.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Connection, Keypair } from "@solana/web3.js";
import { createMultisig, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  ROOT,
  assertDevnetRpc,
  devnetRpc,
  loadDeployerKeypair,
  loadKeypairFile,
  writeKeypairFile,
  treasuryManifestPath,
  type TreasuryManifest,
} from "./lib/devnet-guards.js";

const SIGNER_A = join(ROOT, "devnet", "treasury-signer-a.json");
const SIGNER_B = join(ROOT, "devnet", "treasury-signer-b.json");

async function main(): Promise<void> {
  const rpc = devnetRpc();
  assertDevnetRpc(rpc);

  const manifestPath = treasuryManifestPath();
  if (existsSync(manifestPath) && process.env.BKSP_FORCE_INIT !== "1") {
    const existing = JSON.parse(readFileSync(manifestPath, "utf8")) as TreasuryManifest;
    console.log("Treasury manifest already exists:", manifestPath);
    console.log("  Multisig:", existing.multisig);
    console.log("Set BKSP_FORCE_INIT=1 to recreate.");
    return;
  }

  const payer = loadDeployerKeypair();
  const signerA = existsSync(SIGNER_A)
    ? loadKeypairFile(SIGNER_A)
    : Keypair.generate();
  const signerB = existsSync(SIGNER_B)
    ? loadKeypairFile(SIGNER_B)
    : Keypair.generate();

  if (!existsSync(SIGNER_A)) writeKeypairFile(SIGNER_A, signerA);
  if (!existsSync(SIGNER_B)) writeKeypairFile(SIGNER_B, signerB);

  const connection = new Connection(rpc, "confirmed");

  console.log("Creating 2-of-2 SPL multisig treasury on devnet...");
  console.log("  Payer:", payer.publicKey.toBase58());
  console.log("  Signer A:", signerA.publicKey.toBase58());
  console.log("  Signer B:", signerB.publicKey.toBase58());

  const multisig = await createMultisig(
    connection,
    payer,
    [signerA.publicKey, signerB.publicKey],
    2,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID,
  );

  const manifest: TreasuryManifest = {
    cluster: "devnet",
    createdAt: new Date().toISOString(),
    multisig: multisig.toBase58(),
    threshold: 2,
    signers: [
      signerA.publicKey.toBase58(),
      signerB.publicKey.toBase58(),
    ],
    signerKeypairPaths: [SIGNER_A, SIGNER_B],
    notice:
      "Devnet 2-of-2 treasury. Mainnet: replace with Squads multisig + timelock before real value.",
  };

  mkdirSync(join(ROOT, "devnet"), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
  });

  console.log("\nTreasury multisig ready");
  console.log("  Multisig:", multisig.toBase58());
  console.log("  Manifest:", manifestPath);
  console.log("  Signer keypairs (chmod 600, never commit):");
  console.log("   ", SIGNER_A);
  console.log("   ", SIGNER_B);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});