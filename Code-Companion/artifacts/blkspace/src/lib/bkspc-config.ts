/**
 * BKSPC student micro-settlement (Solana). Power of 2 Tier 1.
 * Soft WB stays in-app; BKSPC is optional Token-2022 receipt after Cred gates.
 * HyperEVM / BI9 does not occupy this job. Mainnet mint is empty until launch + counsel.
 */

import { BRAND } from "@/lib/brand";
import { WB_TO_BKSPC_RATIO } from "@/lib/tokenomics";

export type SolanaCluster = "devnet" | "mainnet-beta";

const LS_CLUSTER = "blkspace_solana_cluster";
const LS_MINT = "blkspace_bkspc_mint";
const LS_PUMP = "blkspace_bkspc_pumpfun";

export interface BkspcConfig {
  cluster: SolanaCluster;
  /** Empty = not launched / not wired */
  mint: string;
  /** Optional pump.fun coin page */
  pumpfunUrl: string;
  ratio: number;
  symbol: string;
  coinName: string;
  isMainnet: boolean;
  isMintConfigured: boolean;
}

function envCluster(): SolanaCluster | null {
  const v = (import.meta.env.VITE_SOLANA_CLUSTER as string | undefined)?.trim();
  if (v === "mainnet-beta" || v === "mainnet") return "mainnet-beta";
  if (v === "devnet") return "devnet";
  return null;
}

function envMint(): string {
  return (import.meta.env.VITE_BKSPC_MINT as string | undefined)?.trim() || "";
}

function envPump(): string {
  return (
    (import.meta.env.VITE_BKSPC_PUMPFUN as string | undefined)?.trim() || ""
  );
}

export function getBkspcConfig(): BkspcConfig {
  let cluster: SolanaCluster = "devnet";
  try {
    const fromLs = localStorage.getItem(LS_CLUSTER) as SolanaCluster | null;
    if (fromLs === "mainnet-beta" || fromLs === "devnet") cluster = fromLs;
  } catch {
    /* ignore */
  }
  const fromEnv = envCluster();
  if (fromEnv) cluster = fromEnv;

  let mint = envMint();
  try {
    if (!mint) mint = localStorage.getItem(LS_MINT)?.trim() || "";
  } catch {
    /* ignore */
  }

  let pumpfunUrl = envPump();
  try {
    if (!pumpfunUrl) pumpfunUrl = localStorage.getItem(LS_PUMP)?.trim() || "";
  } catch {
    /* ignore */
  }

  if (!pumpfunUrl && mint) {
    pumpfunUrl = `https://pump.fun/coin/${mint}`;
  }

  return {
    cluster,
    mint,
    pumpfunUrl,
    ratio: WB_TO_BKSPC_RATIO,
    symbol: BRAND.symbol,
    coinName: BRAND.coinName,
    isMainnet: cluster === "mainnet-beta",
    isMintConfigured: mint.length >= 32,
  };
}

/** Ops UI: prefer env in prod; localStorage for beta operators. */
export function saveBkspcOperatorConfig(patch: {
  cluster?: SolanaCluster;
  mint?: string;
  pumpfunUrl?: string;
}): BkspcConfig {
  if (patch.cluster) {
    localStorage.setItem(LS_CLUSTER, patch.cluster);
  }
  if (patch.mint !== undefined) {
    if (patch.mint.trim()) localStorage.setItem(LS_MINT, patch.mint.trim());
    else localStorage.removeItem(LS_MINT);
  }
  if (patch.pumpfunUrl !== undefined) {
    if (patch.pumpfunUrl.trim())
      localStorage.setItem(LS_PUMP, patch.pumpfunUrl.trim());
    else localStorage.removeItem(LS_PUMP);
  }
  return getBkspcConfig();
}

export function solanaRpcUrl(cluster: SolanaCluster): string {
  return cluster === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";
}

export function explorerTokenUrl(mint: string, cluster: SolanaCluster): string {
  const c = cluster === "mainnet-beta" ? "" : `?cluster=devnet`;
  return `https://explorer.solana.com/address/${mint}${c}`;
}

export function explorerTxUrl(sig: string, cluster: SolanaCluster): string {
  const c = cluster === "mainnet-beta" ? "" : `?cluster=devnet`;
  return `https://explorer.solana.com/tx/${sig}${c}`;
}

export function formatWbToBkspc(wb: number, ratio = WB_TO_BKSPC_RATIO): string {
  if (wb <= 0) return "0";
  const n = wb / ratio;
  return n >= 1 ? n.toFixed(2) : n.toFixed(4);
}

export const BKSPC_GATES_COPY = [
  "Earn WeixBucks (WB) in-app — not sold for USD",
  "Yard Cred + account age + posts gate withdraw",
  "1,000 WB ≈ 1 BKSPC (published ratio) — Solana micro-settlement only",
  "BI9 on HyperEVM is governance and is not minted from WeixBucks",
  "Mainnet mint only after launch + counsel gates",
] as const;
