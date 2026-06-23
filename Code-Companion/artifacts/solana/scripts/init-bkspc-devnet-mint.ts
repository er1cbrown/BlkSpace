/**
 * Initialize BKSPC on devnet (Metaplex mint). Mint authority stays on deployer until wire.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

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
import { toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";

import {
  ROOT,
  assertDevnetRpc,
  devnetRpc,
  loadDeployerKeypair,
  requireTreasuryManifest,
} from "./lib/devnet-guards.js";

const BKSPC = {
  name: "BKSPC",
  symbol: "BKSPC",
  decimals: 9,
} as const;

const WB_TO_BKSPC_RATIO = 1000;

function signatureToBase58(signature: Uint8Array | string): string {
  if (typeof signature === "string") return signature;
  const alphabet =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let zeros = 0;
  while (zeros < signature.length && signature[zeros] === 0) zeros++;
  const digits: number[] = [];
  for (let i = zeros; i < signature.length; i++) {
    let carry = signature[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  return (
    alphabet[0].repeat(zeros) +
    digits
      .reverse()
      .map((d) => alphabet[d])
      .join("")
  );
}

function resolveMetadataUri(): string {
  if (process.env.BKSPC_METADATA_URI) {
    return process.env.BKSPC_METADATA_URI;
  }
  // Short off-chain URI — data: URIs bloat Metaplex txs past Solana size limits.
  return "https://raw.githubusercontent.com/er1cbrown/BlkSpace/main/Code-Companion/artifacts/solana/metadata/bkspc-token.json";
}

async function main(): Promise<void> {
  const rpc = devnetRpc();
  assertDevnetRpc(rpc);
  const treasury = requireTreasuryManifest();

  const manifestPath = join(ROOT, "devnet", "bkspc-mint.json");
  if (existsSync(manifestPath) && process.env.BKSPC_FORCE_INIT !== "1") {
    const existing = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      mint?: string;
      mintAuthority?: string;
      configInitialized?: boolean;
      mintAuthorityType?: string;
    };
    console.log("BKSPC devnet manifest already exists:", manifestPath);
    if (existing.mint) console.log("  Mint:", existing.mint);
    if (existing.configInitialized) {
      console.log("  Program wired (configInitialized=true).");
    } else if (existing.mintAuthorityType === "spl-multisig-2of2") {
      console.log(
        "  Legacy multisig mint authority — recreate with BKSPC_FORCE_INIT=1,",
      );
      console.log(
        "  or manually transfer mint authority back to deployer before wire-bkspc-program-devnet.",
      );
    } else {
      console.log("  Next: pnpm --filter @workspace/solana run wire-bkspc-program-devnet");
    }
    console.log("Set BKSPC_FORCE_INIT=1 to create another mint.");
    return;
  }

  const web3Keypair = loadDeployerKeypair();
  const metadataUri = resolveMetadataUri();

  const umi = createUmi(rpc).use(mplTokenMetadata());
  const umiKeypair = fromWeb3JsKeypair(web3Keypair);
  umi.use(keypairIdentity(createSignerFromKeypair(umi, umiKeypair)));

  const mint = generateSigner(umi);

  console.log("Creating BKSPC fungible mint on devnet...");
  console.log("  Name:", BKSPC.name);
  console.log("  Symbol:", BKSPC.symbol);
  console.log("  Deployer:", web3Keypair.publicKey.toBase58());
  console.log("  Treasury multisig:", treasury.multisig);
  console.log("  RPC:", rpc);

  const result = await createFungible(umi, {
    mint,
    name: BKSPC.name,
    symbol: BKSPC.symbol,
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: BKSPC.decimals,
  }).sendAndConfirm(umi);

  const mintPubkey = toWeb3JsPublicKey(mint.publicKey).toBase58();
  // Mint authority stays on deployer until `wire-bkspc-program-devnet` moves it to program PDA.
  const authoritySig = "pending-program-wire";

  const cluster =
    rpc.includes("127.0.0.1") || rpc.includes("localhost")
      ? ("localnet" as const)
      : ("devnet" as const);

  const manifest = {
    cluster,
    rpcUrl: rpc,
    createdAt: new Date().toISOString(),
    name: BKSPC.name,
    symbol: BKSPC.symbol,
    decimals: BKSPC.decimals,
    mint: mintPubkey,
    mintAuthority: web3Keypair.publicKey.toBase58(),
    mintAuthorityType: "deployer-pending-program-wire" as const,
    programId: "7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs",
    configInitialized: false,
    treasuryMultisig: treasury.multisig,
    treasurySignerPaths: treasury.signerKeypairPaths,
    metadataUri,
    initSignature: signatureToBase58(result.signature),
    authorityTransferSignature: authoritySig,

    notice:
      "Devnet settlement token only. Not for sale. Mainnet requires counsel + audit.",
    wbToBkspcRatio: WB_TO_BKSPC_RATIO,
    onChainReady: true,
  };

  mkdirSync(join(ROOT, "devnet"), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log("\nBKSPC devnet mint initialized");
  console.log("  Mint:", mintPubkey);
  console.log("  Mint authority (pre-wire):", web3Keypair.publicKey.toBase58());
  console.log("  Next: pnpm --filter @workspace/solana run wire-bkspc-program-devnet");
  console.log("  Manifest:", manifestPath);
  console.log("  Init tx:", result.signature);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});