/**
 * WeixNet route A from the browser and the Bun server.
 * Same five relays as src-tauri/src/relay_manager.rs DEFAULT_RELAYS.
 * A dead first hop must not hide a later relay that answers.
 */

export const WEIXNET_RELAYS = [
  "wss://nos.lol",
  "wss://relay.snort.social",
  "wss://relay.damus.io",
  "wss://nostr.wine",
  "wss://relay.nostr.band",
] as const;

export interface RelayProbe {
  url: string;
  ok: boolean;
  ms: number;
  error?: string;
}

export interface PublishResult {
  ok: boolean;
  relayUrl: string;
  reason: string;
}

type SocketLike = {
  send: (data: string) => void;
  close: () => void;
  onopen: ((event?: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event?: unknown) => void) | null;
  onclose: ((event?: unknown) => void) | null;
};

export type SocketFactory = (url: string) => SocketLike;

const RELAY_CACHE_MS = 20_000;
let relayCache: { at: number; relays: RelayProbe[] } | null = null;

function openSocket(url: string, factory?: SocketFactory): SocketLike {
  if (factory) return factory(url);
  return new WebSocket(url) as unknown as SocketLike;
}

export function probeRelay(
  url: string,
  timeoutMs = 4000,
  factory?: SocketFactory,
): Promise<RelayProbe> {
  const started = Date.now();
  return new Promise((resolve) => {
    let socket: SocketLike | null = null;
    let done = false;
    const finish = (row: RelayProbe) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        socket?.close();
      } catch {
        /* already closed */
      }
      resolve(row);
    };
    const timer = setTimeout(() => {
      finish({
        url,
        ok: false,
        ms: Date.now() - started,
        error: "timeout",
      });
    }, timeoutMs);
    try {
      socket = openSocket(url, factory);
    } catch (error) {
      finish({
        url,
        ok: false,
        ms: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    socket.onopen = () => {
      socket?.send(
        JSON.stringify(["REQ", "bkspc-probe", { kinds: [1], limit: 1 }]),
      );
    };
    socket.onmessage = (event) => {
      let kind = "";
      try {
        kind = JSON.parse(String(event.data))[0];
      } catch {
        kind = "";
      }
      if (
        kind === "EVENT" ||
        kind === "EOSE" ||
        kind === "NOTICE" ||
        kind === "AUTH"
      ) {
        finish({ url, ok: true, ms: Date.now() - started });
      }
    };
    socket.onerror = () => {
      finish({
        url,
        ok: false,
        ms: Date.now() - started,
        error: "socket error",
      });
    };
  });
}

export async function probeWeixnetRelays(
  timeoutMs = 4000,
  factory?: SocketFactory,
): Promise<RelayProbe[]> {
  if (!factory && relayCache && Date.now() - relayCache.at < RELAY_CACHE_MS) {
    return relayCache.relays;
  }
  const relays = await Promise.all(
    WEIXNET_RELAYS.map((url) => probeRelay(url, timeoutMs, factory)),
  );
  if (!factory) relayCache = { at: Date.now(), relays };
  return relays;
}

export function resetRelayProbeCache() {
  relayCache = null;
}

function publishOne(
  url: string,
  event: { id: string },
  timeoutMs: number,
  factory?: SocketFactory,
): Promise<PublishResult> {
  const started = Date.now();
  return new Promise((resolve) => {
    let socket: SocketLike | null = null;
    let done = false;
    const finish = (row: PublishResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        socket?.close();
      } catch {
        /* already closed */
      }
      resolve(row);
    };
    const timer = setTimeout(() => {
      finish({
        ok: false,
        relayUrl: url,
        reason: `timeout after ${Date.now() - started}ms`,
      });
    }, timeoutMs);
    try {
      socket = openSocket(url, factory);
    } catch (error) {
      finish({
        ok: false,
        relayUrl: url,
        reason: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    socket.onopen = () => {
      socket?.send(JSON.stringify(["EVENT", event]));
    };
    socket.onmessage = (message) => {
      let frame: unknown;
      try {
        frame = JSON.parse(String(message.data));
      } catch {
        return;
      }
      if (!Array.isArray(frame) || frame[0] !== "OK" || frame[1] !== event.id) {
        return;
      }
      const accepted = frame[2] === true;
      finish({
        ok: accepted,
        relayUrl: url,
        reason: accepted ? "" : String(frame[3] || "rejected"),
      });
    };
    socket.onerror = () => {
      finish({ ok: false, relayUrl: url, reason: "socket error" });
    };
  });
}

/** Send one signed kind-1 note. Returns as soon as one relay accepts it. */
export function publishToRelays(
  event: { id: string },
  options?: {
    timeoutMs?: number;
    factory?: SocketFactory;
    relays?: readonly string[];
  },
): Promise<PublishResult> {
  const relays = options?.relays ?? WEIXNET_RELAYS;
  const timeoutMs = options?.timeoutMs ?? 4000;
  if (relays.length === 0) {
    return Promise.resolve({
      ok: false,
      relayUrl: "",
      reason: "no relay accepted the note",
    });
  }
  return new Promise((resolve) => {
    const failed: PublishResult[] = [];
    let pending = relays.length;
    let settled = false;
    const finish = (row: PublishResult) => {
      if (settled) return;
      settled = true;
      resolve(row);
    };
    for (const url of relays) {
      publishOne(url, event, timeoutMs, options?.factory).then((row) => {
        if (row.ok) {
          finish(row);
          return;
        }
        failed.push(row);
        pending -= 1;
        if (pending === 0) {
          finish({
            ok: false,
            relayUrl: "",
            reason:
              failed
                .map((item) => `${item.relayUrl}: ${item.reason}`)
                .join("; ") || "no relay accepted the note",
          });
        }
      });
    }
  });
}
