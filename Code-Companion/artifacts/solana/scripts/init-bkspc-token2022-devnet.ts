/**
 * Ticket 0.1 — Token-2022 BKSPC mint on Solana Devnet.
 * Mint authority stays on a local deployer keypair until Ticket 0.2 (convert PDA).
 * Key material is gitignored; public addresses are written to docs + example json.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ExtensionType,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  getMint,
  getMintLen,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  pack,
  type TokenMetadata,
} from "@solana/spl-token-metadata";
import {
  ROOT,
  assertDevnetRpc,
  devnetRpc,
  loadKeypairFile,
  writeKeypairFile,
} from "./lib/devnet-guards.js";

const DECIMALS = 6;
const NAME = "BKSPC Coin";
const SYMBOL = "BKSPC";
const WB_TO_BKSPC_RATIO = 1000;
const PROGRAM_ID = "7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs";

const DEPLOYER_PATH = join(ROOT, "devnet", "deployer.json");
const MANIFEST_PATH = join(ROOT, "devnet", "bkspc-token2022-mint.json");
const PUBLIC_EXAMPLE_PATH = join(ROOT, "devnet", "bkspc-token2022.example.json");

function metadataUri(): string {
  return (
    process.env.BKSPC_METADATA_URI ??
    "https://raw.githubusercontent.com/er1cbrown/BlkSpace/main/Code-Companion/artifacts/solana/metadata/bkspc-token.json"
  );
}

function ensureDeployer(): Keypair {
  if (existsSync(DEPLOYER_PATH)) {
    return loadKeypairFile(DEPLOYER_PATH);
  }
  const kp = Keypair.generate();
  writeKeypairFile(DEPLOYER_PATH, kp);
  console.log("Created gitignored deployer keypair:", DEPLOYER_PATH);
  console.log("  Public key:", kp.publicKey.toBase58());
  return kp;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function tryAirdrop(
  connection: Connection,
  payer: Keypair,
  lamports: number,
): Promise<boolean> {
  try {
    const sig = await connection.requestAirdrop(payer.publicKey, lamports);
    await connection.confirmTransaction(sig, "confirmed");
    return true;
  } catch (e) {
    console.log(
      "  Airdrop rejected:",
      e instanceof Error ? e.message : String(e),
    );
    return false;
  }
}

async function ensureDevnetSol(
  connection: Connection,
  payer: Keypair,
): Promise<void> {
  const minLamports = 0.25 * 1e9;
  let balance = await connection.getBalance(payer.publicKey);
  console.log("  Deployer balance:", (balance / 1e9).toFixed(4), "SOL");
  if (balance >= minLamports) return;

  const amounts = [500_000_000, 250_000_000, 100_000_000, 500_000_000];
  for (let i = 0; i < amounts.length && balance < minLamports; i++) {
    console.log(
      `  Requesting airdrop ${i + 1}/${amounts.length} (${amounts[i] / 1e9} SOL)…`,
    );
    await tryAirdrop(connection, payer, amounts[i]);
    await sleep(2500);
    balance = await connection.getBalance(payer.publicKey);
    console.log("  Balance now:", (balance / 1e9).toFixed(4), "SOL");
  }
  if (balance < minLamports) {
    throw new Error(
      `Need ~0.25 SOL on ${payer.publicKey.toBase58()} for rent. Public Devnet airdrop is rate-limited. Fund that address at https://faucet.solana.com then re-run bun run init-bkspc-token2022-devnet`,
    );
  }
}

function publicRecord(manifest: Record<string, unknown>) {
  return {
    cluster: "devnet",
    tokenProgram: "Token-2022",
    name: NAME,
    symbol: SYMBOL,
    decimals: DECIMALS,
    mint: manifest.mint,
    mintAuthority: manifest.mintAuthority,
    mintAuthorityType: "deployer-pending-convert-pda",
    programId: PROGRAM_ID,
    metadataUri: manifest.metadataUri,
    initSignature: manifest.initSignature,
    explorerMint: `https://explorer.solana.com/address/${manifest.mint}?cluster=devnet`,
    explorerTx: `https://explorer.solana.com/tx/${manifest.initSignature}?cluster=devnet`,
    notice:
      "Public Token-2022 mint record. No secrets. Devnet only. Not for sale.",
    wbToBkspcRatio: WB_TO_BKSPC_RATIO,
    policy: "docs/bkspc-tokenomics-policy.md",
  };
}

async function main(): Promise<void> {
  const rpc = devnetRpc();
  assertDevnetRpc(rpc);

  if (existsSync(MANIFEST_PATH) && process.env.BKSPC_FORCE_INIT !== "1") {
    const existing = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
      mint?: string;
    };
    console.log("Token-2022 mint already recorded:", MANIFEST_PATH);
    if (existing.mint) {
      console.log("  Mint:", existing.mint);
      console.log(
        "  Explorer:",
        `https://explorer.solana.com/address/${existing.mint}?cluster=devnet`,
      );
    }
    console.log("Set BKSPC_FORCE_INIT=1 to create another mint.");
    return;
  }

  const connection = new Connection(rpc, "confirmed");
  const payer = ensureDeployer();
  const mintKeypair = Keypair.generate();
  const uri = metadataUri();

  console.log("Creating Token-2022 BKSPC mint on Devnet…");
  console.log("  Name:", NAME);
  console.log("  Symbol:", SYMBOL);
  console.log("  Decimals:", DECIMALS);
  console.log("  Deployer / mint authority:", payer.publicKey.toBase58());
  console.log("  Mint:", mintKeypair.publicKey.toBase58());
  console.log("  RPC:", rpc);

  await ensureDevnetSol(connection, payer);

  const metadata: TokenMetadata = {
    mint: mintKeypair.publicKey,
    name: NAME,
    symbol: SYMBOL,
    uri,
    additionalMetadata: [],
  };
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
  const lamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataLen,
  );

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(
      mintKeypair.publicKey,
      payer.publicKey,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      DECIMALS,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mintKeypair.publicKey,
      metadata: mintKeypair.publicKey,
      name: NAME,
      symbol: SYMBOL,
      uri,
      mintAuthority: payer.publicKey,
      updateAuthority: payer.publicKey,
    }),
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [
    payer,
    mintKeypair,
  ]);

  const onChain = await getMint(
    connection,
    mintKeypair.publicKey,
    "confirmed",
    TOKEN_2022_PROGRAM_ID,
  );
  if (onChain.decimals !== DECIMALS) {
    throw new Error(`Unexpected decimals ${onChain.decimals}`);
  }
  if (!onChain.mintAuthority?.equals(payer.publicKey)) {
    throw new Error("Mint authority mismatch");
  }

  const manifest = {
    cluster: "devnet" as const,
    rpcUrl: rpc,
    createdAt: new Date().toISOString(),
    tokenProgram: "Token-2022",
    tokenProgramId: TOKEN_2022_PROGRAM_ID.toBase58(),
    name: NAME,
    symbol: SYMBOL,
    decimals: DECIMALS,
    mint: mintKeypair.publicKey.toBase58(),
    mintAuthority: payer.publicKey.toBase58(),
    mintAuthorityType: "deployer-pending-convert-pda",
    freezeAuthority: null,
    programId: PROGRAM_ID,
    metadataUri: uri,
    initSignature: signature,
    deployerKeypairPath: DEPLOYER_PATH,
    notice:
      "Devnet Token-2022 settlement mint. Not for sale. Mainnet requires counsel.",
    wbToBkspcRatio: WB_TO_BKSPC_RATIO,
    onChainReady: true,
  };

  mkdirSync(join(ROOT, "devnet"), { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    PUBLIC_EXAMPLE_PATH,
    `${JSON.stringify(publicRecord(manifest), null, 2)}\n`,
  );

  console.log("\nToken-2022 mint live on Devnet");
  console.log("  Mint:", manifest.mint);
  console.log("  Authority:", manifest.mintAuthority);
  console.log("  Tx:", signature);
  console.log(
    "  Explorer:",
    `https://explorer.solana.com/address/${manifest.mint}?cluster=devnet`,
  );
  console.log("  Local manifest (gitignored):", MANIFEST_PATH);
  console.log("  Public record:", PUBLIC_EXAMPLE_PATH);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
