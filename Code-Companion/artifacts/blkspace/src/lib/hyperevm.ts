/**
 * Canonical on-chain home of BI9: Hyperliquid HyperEVM (chain id 999).
 * WeixBucks never appear here. Solana BKSPC is optional wallet-reach only.
 */

export const HYPEREVM_MAINNET = {
  chainId: 999,
  chainIdHex: "0x3e7",
  name: "HyperEVM",
  rpcUrl: "https://rpc.hyperliquid.xyz/evm",
  explorer: "https://hyperevmscan.io",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
} as const;

export const HYPEREVM_TESTNET = {
  chainId: 998,
  chainIdHex: "0x3e6",
  name: "HyperEVM Testnet",
  rpcUrl: "https://rpc.hyperliquid-testnet.xyz/evm",
  explorer: "https://testnet.hyperevmscan.io",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
} as const;

/** Official HyperCore ↔ HyperEVM HYPE system address (not a BlkSpace contract). */
export const HYPE_CORE_SYSTEM_ADDRESS =
  "0x2222222222222222222222222222222222222222";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Assets BlkBridge v1 may mention. WB is intentionally absent. */
export const HYPEREVM_ASSETS = ["HYPE", "BI9"] as const;
export const BRIDGE_EXCLUDED_ASSETS = ["WB", "WeixBucks"] as const;

export type HyperevmNetwork = "mainnet" | "testnet";

const LS_NETWORK = "blkspace_hyperevm_network";
const LS_BI9 = "blkspace_bi9_address";
const LS_VAULT = "blkspace_stake_vault";
const LS_TIMELOCK = "blkspace_timelock";
const LS_ACCOUNT = "blkspace_hyperevm_account";

export interface HyperevmConfig {
  network: HyperevmNetwork;
  chainId: number;
  rpcUrl: string;
  explorer: string;
  bi9: string;
  stakeVault: string;
  timelock: string;
  account: string;
  isMainnet: boolean;
  isBi9Deployed: boolean;
}

export function isHexAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function isConfiguredAddress(value: string | undefined | null): boolean {
  if (!value) return false;
  const v = value.trim();
  return isHexAddress(v) && v.toLowerCase() !== ZERO_ADDRESS;
}

export function explorerAddressUrl(address: string, explorer: string): string {
  return `${explorer.replace(/\/$/, "")}/address/${address}`;
}

export function encodeBalanceOf(account: string): string {
  const addr = account.replace(/^0x/, "").toLowerCase().padStart(64, "0");
  return `0x70a08231${addr}`;
}

export function formatWei(wei: bigint, decimals = 18, maxFrac = 6): string {
  if (wei === 0n) return "0";
  const neg = wei < 0n;
  const abs = neg ? -wei : wei;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  if (frac === 0n) return `${neg ? "-" : ""}${whole}`;
  let fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  if (fracStr.length > maxFrac) fracStr = fracStr.slice(0, maxFrac).replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}.${fracStr}`;
}

function envAddress(
  key: "VITE_BI9_ADDRESS" | "VITE_STAKE_VAULT" | "VITE_TIMELOCK",
): string {
  const raw = {
    VITE_BI9_ADDRESS: import.meta.env.VITE_BI9_ADDRESS,
    VITE_STAKE_VAULT: import.meta.env.VITE_STAKE_VAULT,
    VITE_TIMELOCK: import.meta.env.VITE_TIMELOCK,
  }[key];
  const v = (typeof raw === "string" ? raw : "").trim();
  return isConfiguredAddress(v) ? v : "";
}

function lsGet(key: string): string {
  try {
    return localStorage.getItem(key)?.trim() || "";
  } catch {
    return "";
  }
}

export function getHyperevmConfig(): HyperevmConfig {
  let network: HyperevmNetwork = "mainnet";
  const fromLs = lsGet(LS_NETWORK);
  if (fromLs === "testnet" || fromLs === "mainnet") network = fromLs;
  const fromEnv = (import.meta.env.VITE_HYPEREVM_NETWORK as string | undefined)?.trim();
  if (fromEnv === "testnet" || fromEnv === "mainnet") network = fromEnv;

  const chain = network === "testnet" ? HYPEREVM_TESTNET : HYPEREVM_MAINNET;
  const bi9 = envAddress("VITE_BI9_ADDRESS") || lsGet(LS_BI9);
  const stakeVault = envAddress("VITE_STAKE_VAULT") || lsGet(LS_VAULT);
  const timelock = envAddress("VITE_TIMELOCK") || lsGet(LS_TIMELOCK);
  const account = lsGet(LS_ACCOUNT);

  return {
    network,
    chainId: chain.chainId,
    rpcUrl: chain.rpcUrl,
    explorer: chain.explorer,
    bi9: isConfiguredAddress(bi9) ? bi9 : "",
    stakeVault: isConfiguredAddress(stakeVault) ? stakeVault : "",
    timelock: isConfiguredAddress(timelock) ? timelock : "",
    account: isConfiguredAddress(account) ? account : "",
    isMainnet: network === "mainnet",
    isBi9Deployed: isConfiguredAddress(bi9),
  };
}

export function saveHyperevmOperatorConfig(patch: {
  network?: HyperevmNetwork;
  bi9?: string;
  stakeVault?: string;
  timelock?: string;
  account?: string;
}): HyperevmConfig {
  if (patch.network) localStorage.setItem(LS_NETWORK, patch.network);
  const write = (key: string, value: string | undefined) => {
    if (value === undefined) return;
    const t = value.trim();
    if (t) localStorage.setItem(key, t);
    else localStorage.removeItem(key);
  };
  write(LS_BI9, patch.bi9);
  write(LS_VAULT, patch.stakeVault);
  write(LS_TIMELOCK, patch.timelock);
  write(LS_ACCOUNT, patch.account);
  return getHyperevmConfig();
}

export function walletAddHyperEvmParams(network: HyperevmNetwork = "mainnet") {
  const chain = network === "testnet" ? HYPEREVM_TESTNET : HYPEREVM_MAINNET;
  return {
    chainId: chain.chainIdHex,
    chainName: chain.name,
    nativeCurrency: { ...chain.nativeCurrency },
    rpcUrls: [chain.rpcUrl],
    blockExplorerUrls: [chain.explorer],
  };
}

export function isWeixBucksListedAsHyperevmAsset(): boolean {
  return (HYPEREVM_ASSETS as readonly string[]).some(
    (a) => a === "WB" || a.toLowerCase() === "weixbucks",
  );
}

type FetchLike = typeof fetch;

async function rpc<T>(
  rpcUrl: string,
  method: string,
  params: unknown[],
  fetchFn: FetchLike = fetch,
): Promise<T> {
  const res = await fetchFn(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`HyperEVM RPC HTTP ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message?: string } };
  if (body.error?.message) throw new Error(body.error.message);
  return body.result as T;
}

export async function fetchNativeBalance(
  rpcUrl: string,
  account: string,
  fetchFn: FetchLike = fetch,
): Promise<bigint> {
  const hex = await rpc<string>(rpcUrl, "eth_getBalance", [account, "latest"], fetchFn);
  return BigInt(hex || "0x0");
}

export async function fetchErc20Balance(
  rpcUrl: string,
  token: string,
  account: string,
  fetchFn: FetchLike = fetch,
): Promise<bigint> {
  const hex = await rpc<string>(
    rpcUrl,
    "eth_call",
    [{ to: token, data: encodeBalanceOf(account) }, "latest"],
    fetchFn,
  );
  return BigInt(hex || "0x0");
}

export async function fetchHyperevmBalances(
  cfg: HyperevmConfig,
  account = cfg.account,
  fetchFn: FetchLike = fetch,
): Promise<{ hypeWei: bigint; bi9Wei: bigint | null }> {
  if (!isConfiguredAddress(account)) {
    return { hypeWei: 0n, bi9Wei: cfg.isBi9Deployed ? 0n : null };
  }
  const hypeWei = await fetchNativeBalance(cfg.rpcUrl, account, fetchFn);
  if (!cfg.isBi9Deployed) return { hypeWei, bi9Wei: null };
  const bi9Wei = await fetchErc20Balance(cfg.rpcUrl, cfg.bi9, account, fetchFn);
  return { hypeWei, bi9Wei };
}

export const HYPEREVM_GATES_COPY = [
  "WeixBucks stay in the app. They do not convert to BI9.",
  "BI9 lives on HyperEVM (chain 999). Mint is off until a timelocked cap is set.",
  "HYPE is gas. Staking HYPE is a sleeve, not yield.",
  "BlkFinance is advanced mode — not the student home screen.",
] as const;
