/**
 * CLI: Metaplex NFT mint for BlkSpace mixes/media on devnet.
 * In-app minting uses Tauri `mint_mix_nft` (Rust). This script is for manual/CI runs.
 *
 * Usage:
 *   RECIPIENT=<pubkey> CID=<iroh-cid> TITLE="My Mix" pnpm --filter @workspace/solana run mint-media-nft-devnet
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  percentAmount,
} from "@metaplex-foundation/umi";
import {
  createProgrammableNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import {
  ROOT,
  assertDevnetRpc,
  devnetRpc,
  loadDeployerKeypair,
} from "./lib/devnet-guards.js";

async function main(): Promise<void> {
  const rpc = devnetRpc();
  assertDevnetRpc(rpc);

  const recipient = process.env.RECIPIENT;
  const cid = process.env.CID;
  const title = process.env.TITLE ?? "BlkSpace Mix";
  const itemType = process.env.ITEM_TYPE ?? "mix";

  if (!recipient || !cid) {
    throw new Error("Set RECIPIENT and CID env vars");
  }

  const deployer = loadDeployerKeypair();
  const umi = createUmi(rpc).use(mplTokenMetadata());
  const payer = createSignerFromKeypair(
    umi,
    fromWeb3JsKeypair(deployer),
  );
  umi.use(keypairIdentity(payer));

  const manifestPath = join(ROOT, "devnet", "bkspc-mint.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    cluster?: string;
  };
  if (manifest.cluster !== "devnet") {
    throw new Error("bkspc-mint.json must be devnet");
  }

  const mint = generateSigner(umi);
  const uri = `blkspace://nft/${itemType}/${cid}`;

  const result = await createProgrammableNft(umi, {
    mint,
    name: title,
    symbol: itemType === "mix" ? "MIX" : "MEDIA",
    uri,
    sellerFeeBasisPoints: percentAmount(0),
    creators: [
      {
        address: payer.publicKey,
        verified: true,
        share: 100,
      },
    ],
  }).sendAndConfirm(umi);

  console.log(
    JSON.stringify(
      {
        mint: mint.publicKey,
        recipient,
        cid,
        title,
        itemType,
        uri,
        signature: result.signature,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});