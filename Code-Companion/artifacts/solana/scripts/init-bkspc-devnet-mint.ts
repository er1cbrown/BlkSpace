/**
 * Initialize BKSPC (BlkSpace Settlement) on Solana devnet with Metaplex fungible metadata.
 *
 * Devnet-only by default. Does not list, sell, or airdrop to users.
 *
 * Usage (from Code-Companion/):
 *   pnpm --filter @workspace/solana run init-bkspc-devnet
 *
 * Prerequisites:
 *   solana config set --url devnet
 *   solana airdrop 2   # fund ~/.config/solana/id.json
 *
 * Env:
 *   ANCHOR_WALLET          — keypair path (default ~/.config/solana/id.json)
 *   SOLANA_RPC_URL         — RPC (default devnet; must contain "devnet" unless overridden)
 *   BKSPC_METADATA_URI     — hosted metadata JSON URL (optional; else embedded data URI)
 *   BKSPC_FORCE_INIT=1     — create a new mint even if manifest exists
 *   BKSPC_ALLOW_NON_DEVNET — set to 1 to allow non-devnet RPC (blocked by default)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  keypairIdentity,
  percentAmount,
  generateSigner,
} from "@metaplex-foundation/umi";
import {
  createFungible,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const BKSPC = {
  name: "BlkSpace Settlement",
  symbol: "BKSPC",
  decimals: 9,
} as const;

const WB_TO_BKSPC_RATIO = 1000;

function loadKeypair(): Keypair {
  const walletPath =
    process.env.ANCHOR_WALLET ?? join(homedir(), ".config/solana/id.json");
  const secret = JSON.parse(readFileSync(walletPath, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function resolveMetadataUri(): string {
  if (process.env.BKSPC_METADATA_URI) {
    return process.env.BKSPC_METADATA_URI;
  }
  const metaPath = join(ROOT, "metadata", "bkspc-token.json");
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const b64 = Buffer.from(JSON.stringify(meta)).toString("base64");
  return `data:application/json;base64,${b64}`;
}

function assertDevnetRpc(rpc: string): void {
  if (process.env.BKSPC_ALLOW_NON_DEVNET === "1") return;
  if (!rpc.includes("devnet")) {
    throw new Error(
      `Refusing non-devnet RPC (${rpc}). Set BKSPC_ALLOW_NON_DEVNET=1 to override.`,
    );
  }
}

async function main(): Promise<void> {
  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  assertDevnetRpc(rpc);

  const manifestPath = join(ROOT, "devnet", "bkspc-mint.json");
  if (existsSync(manifestPath) && process.env.BKSPC_FORCE_INIT !== "1") {
    const existing = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      mint?: string;
    };
    console.log("BKSPC devnet manifest already exists:", manifestPath);
    if (existing.mint) console.log("  Mint:", existing.mint);
    console.log("Set BKSPC_FORCE_INIT=1 to create another mint.");
    return;
  }

  const web3Keypair = loadKeypair();
  const metadataUri = resolveMetadataUri();

  const umi = createUmi(rpc).use(mplTokenMetadata());
  const umiKeypair = fromWeb3JsKeypair(web3Keypair);
  umi.use(keypairIdentity(createSignerFromKeypair(umi, umiKeypair)));

  const mint = generateSigner(umi);

  console.log("Creating BKSPC fungible mint on devnet...");
  console.log("  Name:", BKSPC.name);
  console.log("  Symbol:", BKSPC.symbol);
  console.log("  Authority:", web3Keypair.publicKey.toBase58());
  console.log("  RPC:", rpc);

  const result = await createFungible(umi, {
    mint,
    name: BKSPC.name,
    symbol: BKSPC.symbol,
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: BKSPC.decimals,
  }).sendAndConfirm(umi);

  const manifest = {
    cluster: "devnet" as const,
    rpcUrl: rpc,
    createdAt: new Date().toISOString(),
    name: BKSPC.name,
    symbol: BKSPC.symbol,
    decimals: BKSPC.decimals,
    mint: mint.publicKey,
    mintAuthority: web3Keypair.publicKey.toBase58(),
    metadataUri,
    initSignature: result.signature,
    programIdPlaceholder: "BkSpC111111111111111111111111111111111111",
    notice:
      "Devnet settlement token only. Not for sale. Mainnet requires counsel approval.",
    wbToBkspcRatio: WB_TO_BKSPC_RATIO,
  };

  mkdirSync(join(ROOT, "devnet"), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log("\nBKSPC devnet mint initialized");
  console.log("  Mint:", mint.publicKey);
  console.log("  Manifest:", manifestPath);
  console.log("  Tx:", result.signature);
  console.log(
    "\nNext: anchor deploy (devnet) when program id is finalized; wire mint into withdraw flow.",
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});