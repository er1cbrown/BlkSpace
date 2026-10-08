/**
 * Live reachability for the lanes the web app can actually open.
 * Cash-out and trades stay closed. A reachable RPC is not a mint.
 */
import { access } from "node:fs/promises";
import path from "node:path";
import { probeWeixnetRelays } from "../src/lib/weixnet-relays.ts";

export const BI9_RPC_URL = "https://rpc.hyperliquid.xyz/evm";
export const BI9_CHAIN_ID = 999;
export const BKSPC_RPC_URL = "https://api.devnet.solana.com";
export const IROH_RELAY_HTTP = "https://use1-1.relay.n0.iroh.link/";

const CACHE_MS = 20_000;
let cache = null;

async function commandOnPath(name) {
  if (!/^[a-z0-9._-]+$/i.test(name)) return false;
  const dirs = (process.env.PATH || "").split(path.delimiter);
  for (const dir of dirs) {
    if (!dir) continue;
    try {
      await access(path.join(dir, name));
      return true;
    } catch {
      /* next dir */
    }
  }
  return false;
}

async function fileExists(file) {
  if (!file) return false;
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function jsonRpc(url, method, params, fetchFn, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    const body = await res.json();
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    if (body?.error?.message) return { ok: false, error: body.error.message };
    return { ok: true, result: body?.result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function httpReachable(url, fetchFn, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { method: "GET", signal: controller.signal });
    return { ok: res.ok, status: res.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function weixnetStatus(deps = {}) {
  const now = deps.now ?? Date.now;
  if (!deps.force && cache && now() - cache.at < CACHE_MS) return cache.value;
  const fetchFn = deps.fetchFn ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 4000;
  const probeRelays =
    deps.probeRelays ?? (() => probeWeixnetRelays(timeoutMs));
  const [relays, bi9rpc, bkspcRpc, irohHttp, sendme, rns, rnsd, irohBin, rnsdEnv] =
    await Promise.all([
      probeRelays(),
      jsonRpc(BI9_RPC_URL, "eth_chainId", [], fetchFn, timeoutMs),
      jsonRpc(BKSPC_RPC_URL, "getHealth", [], fetchFn, timeoutMs),
      httpReachable(IROH_RELAY_HTTP, fetchFn, timeoutMs),
      commandOnPath("sendme"),
      commandOnPath("rns"),
      commandOnPath("rnsd"),
      commandOnPath("iroh"),
      fileExists(process.env.BLKSPACE_RNSD),
    ]);
  const chainId =
    bi9rpc.ok && typeof bi9rpc.result === "string"
      ? Number.parseInt(bi9rpc.result, 16)
      : null;
  const value = {
    ok: true,
    at: new Date(now()).toISOString(),
    chainSocket: "not-connected",
    nostr: {
      reachable: relays.some((row) => row.ok),
      relays,
    },
    bi9: {
      reachable: chainId === BI9_CHAIN_ID,
      chainId,
      rpcUrl: BI9_RPC_URL,
      contract: "",
      trades: false,
      cashOut: false,
      detail: bi9rpc.ok
        ? ""
        : bi9rpc.error || "HyperEVM did not answer",
    },
    bkspc: {
      reachable: bkspcRpc.ok && bkspcRpc.result === "ok",
      cluster: "devnet",
      health: bkspcRpc.ok ? String(bkspcRpc.result ?? "") : "",
      rpcUrl: BKSPC_RPC_URL,
      mint: "",
      trades: false,
      cashOut: false,
      detail: bkspcRpc.ok ? "" : bkspcRpc.error || "Solana devnet did not answer",
    },
    iroh: {
      relayHttp: irohHttp.ok === true,
      localNode: false,
      binary: irohBin,
      detail: irohHttp.ok
        ? "The n0 relay answered HTTPS. No local Iroh node is running on this machine."
        : irohHttp.error || "The n0 relay did not answer.",
    },
    sendme: {
      installed: sendme,
      detail: sendme
        ? "sendme is on PATH."
        : "sendme is not installed. A file drop still needs that CLI on a Full build.",
    },
    rns: {
      installed: rns || rnsd || rnsdEnv,
      pythonSidecar: false,
      detail:
        rns || rnsd || rnsdEnv
          ? "A native rns binary is visible. Live receive is still unwired."
          : "Native rns/rnsd is not installed. Route B stays off. No Python sidecar.",
    },
  };
  cache = { at: now(), value };
  return value;
}

export function resetWeixnetStatusCache() {
  cache = null;
}
