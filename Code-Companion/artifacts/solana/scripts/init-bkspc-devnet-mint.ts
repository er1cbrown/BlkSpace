/**
 * Initialize BKSPC on devnet + transfer mint authority to 2-of-2 treasury multisig.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Connection, PublicKey } from "@solana/web3.js";
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
  setAuthority,
  AuthorityType,
  getMint,
} from "@solana/spl-token";
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

async function transferMintAuthority(
  rpc: string,
  mintAddress: string,
  treasuryMultisig: string,
): Promise<string> {
  const deployer = loadDeployerKeypair();
  const connection = new Connection(rpc, "confirmed");
  const mint = new PublicKey(mintAddress);
  const multisig = new PublicKey(treasuryMultisig);

  const mintInfo = await getMint(connection, mint);
  const currentAuthority = mintInfo.mintAuthority;
  if (!currentAuthority) {
    throw new Error("Mint authority already revoked");
  }
  if (currentAuthority.equals(multisig)) {
    console.log("Mint authority already set to treasury multisig.");
    return "already-transferred";
  }

  console.log("Transferring mint authority to treasury multisig...");
  const sig = await setAuthority(
    connection,
    deployer,
    mint,
    deployer,
    AuthorityType.MintTokens,
    multisig,
  );
  console.log("  Authority transfer tx:", sig);
  return sig;
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
    };
    console.log("BKSPC devnet manifest already exists:", manifestPath);
    if (existing.mint) console.log("  Mint:", existing.mint);
    if (existing.mint && existing.mintAuthority !== treasury.multisig) {
      await transferMintAuthority(rpc, existing.mint, treasury.multisig);
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
  const authoritySig = await transferMintAuthority(
    rpc,
    mintPubkey,
    treasury.multisig,
  );

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
    mintAuthority: treasury.multisig,
    mintAuthorityType: "spl-multisig-2of2" as const,
    treasuryMultisig: treasury.multisig,
    treasurySignerPaths: treasury.signerKeypairPaths,
    metadataUri,
    initSignature: signatureToBase58(result.signature),
    authorityTransferSignature: authoritySig,
    programIdPlaceholder: "BkSpC111111111111111111111111111111111111",
    notice:
      "Devnet settlement token only. Not for sale. Mainnet requires counsel + audit.",
    wbToBkspcRatio: WB_TO_BKSPC_RATIO,
    onChainReady: true,
  };

  mkdirSync(join(ROOT, "devnet"), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log("\nBKSPC devnet mint initialized");
  console.log("  Mint:", mintPubkey);
  console.log("  Mint authority:", treasury.multisig);
  console.log("  Manifest:", manifestPath);
  console.log("  Init tx:", result.signature);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});