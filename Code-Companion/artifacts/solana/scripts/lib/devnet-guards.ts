import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Keypair } from "@solana/web3.js";

const LIB_DIR = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(LIB_DIR, "../..");

export function assertDevnetRpc(rpc: string): void {
  if (process.env.BKSPC_ALLOW_NON_DEVNET === "1") return;
  if (!rpc.includes("devnet")) {
    throw new Error(
      `Refusing non-devnet RPC (${rpc}). Set BKSPC_ALLOW_NON_DEVNET=1 to override.`,
    );
  }
}

export function devnetRpc(): string {
  return process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
}

export function loadDeployerKeypair(): Keypair {
  const walletPath =
    process.env.ANCHOR_WALLET ?? join(homedir(), ".config/solana/id.json");
  const secret = JSON.parse(readFileSync(walletPath, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export function loadKeypairFile(path: string): Keypair {
  const secret = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export function writeKeypairFile(path: string, keypair: Keypair): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(Array.from(keypair.secretKey))}\n`, {
    mode: 0o600,
  });
}

export interface TreasuryManifest {
  cluster: "devnet";
  createdAt: string;
  multisig: string;
  threshold: number;
  signers: string[];
  signerKeypairPaths: string[];
  notice: string;
}

export function treasuryManifestPath(): string {
  return join(ROOT, "devnet", "treasury-manifest.json");
}

export function loadTreasuryManifest(): TreasuryManifest | null {
  const path = treasuryManifestPath();
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as TreasuryManifest;
}

export function requireTreasuryManifest(): TreasuryManifest {
  const manifest = loadTreasuryManifest();
  if (!manifest) {
    throw new Error(
      "Treasury manifest missing. Run: pnpm --filter @workspace/solana run init-treasury-devnet",
    );
  }
  return manifest;
}