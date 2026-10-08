import { mkdir, writeFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { HYPEREVM_MAINNET } from "../../src/lib/hyperevm.ts";
import { solanaRpcUrl } from "../../src/lib/bkspc-config.ts";
import {
  probeRelay,
  publishToRelays,
  resetRelayProbeCache,
} from "../../src/lib/weixnet-relays.ts";
import {
  BI9_CHAIN_ID,
  BI9_RPC_URL,
  BKSPC_RPC_URL,
  resetWeixnetStatusCache,
  parseRnsStatus,
  listOutboxFiles,
  receiveTicket,
  shareOutboxFile,
  ticketFromSendmeOutput,
  weixnetStatus,
} from "../weixnet.mjs";

function socketFactory(modes) {
  return (url) => {
    const mode = modes[url] || "silent";
    const socket = {
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send(data) {
        const msg = JSON.parse(data);
        queueMicrotask(() => {
          if (mode === "down") {
            socket.onerror?.();
            return;
          }
          if (msg[0] === "REQ") {
            socket.onmessage?.({
              data: JSON.stringify(["EVENT", msg[1], { id: "abc" }]),
            });
          }
          if (msg[0] === "EVENT") {
            const accepted = mode === "ok";
            socket.onmessage?.({
              data: JSON.stringify([
                "OK",
                msg[1].id,
                accepted,
                accepted ? "" : "blocked",
              ]),
            });
          }
        });
      },
      close() {},
    };
    queueMicrotask(() => socket.onopen?.());
    return socket;
  };
}

describe("weixnet lanes", () => {
  test("published chain URLs stay the read sockets", () => {
    expect(BI9_RPC_URL).toBe(HYPEREVM_MAINNET.rpcUrl);
    expect(BI9_CHAIN_ID).toBe(HYPEREVM_MAINNET.chainId);
    expect(BKSPC_RPC_URL).toBe(solanaRpcUrl("devnet"));
  });

  test("a dead first relay does not hide one that answers", async () => {
    resetRelayProbeCache();
    const down = await probeRelay(
      "wss://relay.damus.io",
      1000,
      socketFactory({ "wss://relay.damus.io": "down" }),
    );
    expect(down.ok).toBe(false);
    const up = await probeRelay(
      "wss://nos.lol",
      1000,
      socketFactory({ "wss://nos.lol": "ok" }),
    );
    expect(up.ok).toBe(true);
  });

  test("an accepting relay returns before a silent one", async () => {
    const started = Date.now();
    const published = await publishToRelays(
      { id: "abc123" },
      {
        timeoutMs: 1500,
        relays: ["wss://silent.example", "wss://nos.lol"],
        factory(url) {
          if (url.includes("silent")) {
            return {
              onopen: null,
              onmessage: null,
              onerror: null,
              onclose: null,
              send() {},
              close() {},
            };
          }
          return socketFactory({ "wss://nos.lol": "ok" })(url);
        },
      },
    );
    expect(published.ok).toBe(true);
    expect(published.relayUrl).toBe("wss://nos.lol");
    expect(Date.now() - started).toBeLessThan(800);
  });

  test("publish keeps the relay that accepts the note", async () => {
    const published = await publishToRelays(
      { id: "abc123" },
      {
        timeoutMs: 1000,
        relays: ["wss://relay.damus.io", "wss://nos.lol"],
        factory: socketFactory({
          "wss://relay.damus.io": "down",
          "wss://nos.lol": "ok",
        }),
      },
    );
    expect(published.ok).toBe(true);
    expect(published.relayUrl).toBe("wss://nos.lol");
  });

  test("status reports read sockets and keeps cash-out closed", async () => {
    resetWeixnetStatusCache();
    const status = await weixnetStatus({
      force: true,
      now: () => Date.parse("2026-10-07T12:00:00.000Z"),
      probeRelays: async () => [
        { url: "wss://relay.damus.io", ok: false, ms: 10, error: "socket error" },
        { url: "wss://nos.lol", ok: true, ms: 20 },
      ],
      localRns: async () => ({ up: true, clients: 1, listen: "127.0.0.1:4242" }),
      fetchFn: async (url, init) => {
        if (String(url).includes("hyperliquid")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ result: "0x3e7" }),
          };
        }
        if (String(url).includes("solana")) {
          return { ok: true, status: 200, json: async () => ({ result: "ok" }) };
        }
        expect(init?.method).toBe("GET");
        return { ok: true, status: 200, json: async () => ({}) };
      },
    });
    expect(status.chainSocket).toBe("not-connected");
    expect(status.nostr.reachable).toBe(true);
    expect(status.bi9.reachable).toBe(true);
    expect(status.bi9.chainId).toBe(999);
    expect(status.bi9.trades).toBe(false);
    expect(status.bi9.cashOut).toBe(false);
    expect(status.bkspc.reachable).toBe(true);
    expect(status.bkspc.cashOut).toBe(false);
    expect(status.iroh.relayHttp).toBe(true);
    expect(status.iroh.localNode).toBe(false);
    expect(status.lane.social).toBe("nostr");
    expect(status.rns.localTcp).toBe(true);
    expect(status.rns.pythonSidecar).toBe(false);
    expect(status.rns.listen).toBe("127.0.0.1:4242");
  });

  test("a local reticulum status line is not treated as delivery", () => {
    const parsed = parseRnsStatus(`
 TCPServerInterface[TCP Server/127.0.0.1:4242]
    Status    : Up
    Clients   : 1
`);
    expect(parsed).toEqual({ up: true, clients: 1, listen: "127.0.0.1:4242" });
  });

  test("sendme output yields the ticket and a bad name is refused", async () => {
    expect(ticketFromSendmeOutput("to get this data, use\nsendme receive blobabc")).toBe(
      "blobabc",
    );
    await expect(shareOutboxFile({ file: "../note.txt" })).rejects.toThrow(
      /plain file name/,
    );
    await expect(receiveTicket({ ticket: "ticket with spaces" })).rejects.toThrow(
      /not a sendme ticket/,
    );
  });

  test("outbox list keeps plain files and skips hidden names", async () => {
    await mkdir("/tmp/weixnet-outbox", { recursive: true });
    await writeFile("/tmp/weixnet-outbox/note.txt", "yard\n");
    await writeFile("/tmp/weixnet-outbox/.hidden", "no\n");
    const listed = await listOutboxFiles({ outbox: "/tmp/weixnet-outbox" });
    const names = listed.files.map((file) => file.name);
    expect(names).toContain("note.txt");
    expect(names.some((name) => name.startsWith("."))).toBe(false);
    const note = listed.files.find((file) => file.name === "note.txt");
    expect(note.bytes).toBe(5);
  });

  test("sharing an outbox file returns the sendme ticket", async () => {
    await mkdir("/tmp/weixnet-outbox", { recursive: true });
    await writeFile("/tmp/weixnet-outbox/note.txt", "yard\n");
    const shared = await shareOutboxFile(
      { file: "note.txt" },
      {
        outbox: "/tmp/weixnet-outbox",
        timeoutMs: 1000,
        async run() {
          return { pid: 42, output: "sendme receive blobticketvalueok" };
        },
      },
    );
    expect(shared).toEqual({
      ok: true,
      lane: "sendme",
      file: "note.txt",
      ticket: "blobticketvalueok",
      pid: 42,
    });
  });
});
