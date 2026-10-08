/**
 * Live reachability for the lanes the web app can actually open.
 * Cash-out and trades stay closed. A reachable RPC is not a mint.
 */
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { probeWeixnetRelays } from "../src/lib/weixnet-relays.ts";
import { HttpError } from "./http.mjs";

export const BI9_RPC_URL = "https://rpc.hyperliquid.xyz/evm";
export const BI9_CHAIN_ID = 999;
export const BKSPC_RPC_URL = "https://api.devnet.solana.com";
export const IROH_RELAY_HTTP = "https://use1-1.relay.n0.iroh.link/";

const CACHE_MS = 20_000;
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const TICKET = /^[A-Za-z0-9._:-]{16,8000}$/;
let cache = null;

function homePath(...parts) {
  return path.join(os.homedir(), ...parts);
}

export function weixnetOutbox() {
  return process.env.WEIXNET_OUTBOX || homePath(".local/share/blkspace/weixnet-outbox");
}

export function weixnetInbox() {
  return process.env.WEIXNET_INBOX || homePath(".local/share/blkspace/weixnet-inbox");
}

function plainFileName(name) {
  const file = String(name || "");
  if (!FILE_NAME.test(file) || file.includes("..")) {
    throw new HttpError(400, "Use a plain file name in the WeixNet outbox.");
  }
  return file;
}

function insideDir(root, name) {
  const base = path.resolve(root);
  const file = path.resolve(base, name);
  if (file !== base && !file.startsWith(base + path.sep)) {
    throw new HttpError(400, "That file is outside the WeixNet folder.");
  }
  return file;
}

export function ticketFromSendmeOutput(output) {
  const match = String(output || "").match(/sendme receive (\S+)/);
  return match ? match[1] : "";
}

export function parseRnsStatus(output) {
  const text = String(output || "");
  const up = /Status\s*:\s*Up/.test(text);
  const clients = Number(text.match(/Clients\s*:\s*(\d+)/)?.[1] ?? 0);
  const listen = text.match(/127\.0\.0\.1:\d+/)?.[0] || "";
  return { up, clients, listen };
}

function chooseLane(relays, sendme) {
  const social = relays.some((row) => row.ok) ? "nostr" : "queued";
  return {
    social,
    file: sendme ? "sendme" : "unavailable",
    detail:
      social === "nostr"
        ? "Text goes to the first Nostr relay that accepts it. A file goes through sendme."
        : "No relay answered. Text stays queued. A file still goes through sendme when that program is installed.",
  };
}

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
  const localRns = deps.localRns ?? readLocalReticulum;
  const [relays, bi9rpc, bkspcRpc, irohHttp, sendme, rns, rnsd, irohBin, rnsdEnv, local] =
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
      localRns(),
    ]);
  const chainId =
    bi9rpc.ok && typeof bi9rpc.result === "string"
      ? Number.parseInt(bi9rpc.result, 16)
      : null;
  const value = {
    ok: true,
    at: new Date(now()).toISOString(),
    chainSocket: "not-connected",
    lane: chooseLane(relays, sendme),
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
        ? "sendme is on PATH. POST /api/weixnet/sendme shares a file from the outbox."
        : "sendme is not installed. A file drop still needs that CLI.",
    },
    rns: {
      installed: rns || rnsd || rnsdEnv,
      pythonSidecar: false,
      localTcp: local.up === true,
      clients: local.clients || 0,
      listen: local.listen || "",
      detail: local.up
        ? `A local TCP node is up${local.listen ? ` on ${local.listen}` : ""} with ${local.clients || 0} client(s). The app did not launch it.`
        : rns || rnsd || rnsdEnv
          ? "A native rns binary is visible. Live receive is still unwired."
          : "No local Reticulum node answered. Route B stays queued. No Python sidecar.",
    },
  };
  cache = { at: now(), value };
  return value;
}

export function resetWeixnetStatusCache() {
  cache = null;
}

async function readLocalReticulum() {
  const bin =
    process.env.RNS_STATUS_BIN ||
    homePath(".local/opt/reticulum/bin/rnstatus");
  const config =
    process.env.RNS_CONFIG ||
    homePath(".local/share/reticulum/yard-a");
  if (!(await fileExists(bin)) || !(await fileExists(path.join(config, "config")))) {
    return { up: false, clients: 0, listen: "" };
  }
  const output = await collectCommand(bin, ["--config", config], {
    timeoutMs: 4000,
    cwd: config,
  });
  return parseRnsStatus(output);
}

function collectCommand(bin, args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve(out);
    }, opts.timeoutMs);
    child.stdout.on("data", (buf) => {
      out += buf.toString();
    });
    child.stderr.on("data", (buf) => {
      out += buf.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", () => {
      clearTimeout(timer);
      resolve(out);
    });
  });
}

async function runSendme(args, opts, deps) {
  if (deps.run) return deps.run(args, opts);
  const bin = deps.sendmeBin || "sendme";
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: opts.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let settled = false;
    const finish = (value, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve({ ...value, child });
    };
    const timer = setTimeout(() => finish({ pid: child.pid, output: out }), opts.timeoutMs);
    child.stdout.on("data", (buf) => {
      out += buf.toString();
      if (!opts.waitForExit && ticketFromSendmeOutput(out)) {
        finish({ pid: child.pid, output: out });
      }
    });
    child.stderr.on("data", (buf) => {
      out += buf.toString();
    });
    child.on("error", (error) => finish(null, error));
    child.on("exit", (code) => {
      if (opts.waitForExit || !ticketFromSendmeOutput(out)) {
        if (code && code !== 0) finish(null, new Error(out || `sendme exited ${code}`));
        else finish({ pid: child.pid, output: out, code });
      }
    });
  });
}

export async function shareOutboxFile(input, deps = {}) {
  const name = plainFileName(input?.file);
  const outbox = deps.outbox ?? weixnetOutbox();
  const file = insideDir(outbox, name);
  if (!(await fileExists(file))) {
    throw new HttpError(404, "That file is not in the WeixNet outbox.");
  }
  const run = await runSendme(
    ["send", "--jobs", "1", "--no-progress", name],
    { cwd: outbox, timeoutMs: deps.timeoutMs ?? 15000, waitForExit: false },
    deps,
  );
  const ticket = ticketFromSendmeOutput(run.output);
  if (!ticket) throw new HttpError(502, "sendme did not print a ticket.");
  return { ok: true, lane: "sendme", file: name, ticket, pid: run.pid ?? null };
}

export async function receiveTicket(input, deps = {}) {
  const ticket = String(input?.ticket || "");
  if (!TICKET.test(ticket)) throw new HttpError(400, "That ticket is not a sendme ticket.");
  const inbox = deps.inbox ?? weixnetInbox();
  const run = await runSendme(
    ["receive", "--jobs", "1", "--no-progress", ticket],
    { cwd: inbox, timeoutMs: deps.timeoutMs ?? 20000, waitForExit: true },
    deps,
  );
  return {
    ok: true,
    lane: "sendme",
    inbox,
    detail: String(run.output || "").trim().slice(0, 500),
  };
}
