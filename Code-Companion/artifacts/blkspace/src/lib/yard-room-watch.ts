/**
 * Watch-ticket parser for Yard rooms.
 * Allow Jellyfin HTTPS, Iroh media tickets, Syncplay.
 * Refuse scrape CDNs and bare third-party HLS.
 */

export const WATCH_TICKET_PREFIX = "blkspace-watch.v1.";

export type WatchSourceKind = "jellyfin" | "iroh" | "syncplay";

export interface WatchTicket {
  v: 1;
  kind: WatchSourceKind;
  title?: string;
  origin?: string;
  itemId?: string;
  /** Direct media file on the Jellyfin origin. The room can play this together. */
  playUrl?: string;
  ticket?: string;
  cid?: string;
  mime?: string;
  syncplayUrl?: string;
}

export type WatchParseOk = { ok: true; ticket: WatchTicket };
export type WatchParseErr = { ok: false; reason: string };
export type WatchParseResult = WatchParseOk | WatchParseErr;

export interface WatchParseOptions {
  /** Extra Jellyfin HTTPS origins, e.g. https://media.example.com */
  jellyfinOrigins?: string[];
  /** A ticket the yard already saved. HTTPS origins that are not scrape hosts may play. */
  stored?: boolean;
}

const SCRAPE_HOST_RE =
  /(hianime|megaplay|megacdn|akirax|gogoanime|gogoplay|9anime|aniwatch|animix|consumet|zoro\.to|anix|kickassanime|allmanga)/i;

const IROH_PREFIX = "blkspace1.";

function b64urlEncode(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeWatchTicket(ticket: WatchTicket): string {
  return WATCH_TICKET_PREFIX + b64urlEncode(JSON.stringify(ticket));
}

function isLoopback(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
}

function originOf(url: URL): string {
  return `${url.protocol}//${url.host}`;
}

function isMediaMime(mime: string | undefined): boolean {
  if (!mime) return false;
  return mime.startsWith("video/") || mime.startsWith("audio/");
}

export function isScrapeWatchHost(host: string): boolean {
  return SCRAPE_HOST_RE.test(host);
}

function hostLooksLikeScrape(host: string): boolean {
  return isScrapeWatchHost(host);
}

function isDirectMediaPath(pathname: string): boolean {
  return /\.(mp4|webm|ogg|m4v)$/i.test(pathname);
}

function isAllowedJellyfinOrigin(
  origin: string,
  extra: string[],
  stored = false,
): boolean {
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  if (isLoopback(u.hostname)) {
    return u.protocol === "http:" || u.protocol === "https:";
  }
  if (stored && u.protocol === "https:" && !hostLooksLikeScrape(u.hostname)) {
    return true;
  }
  if (u.protocol !== "https:") return false;
  const allowed = extra.map((o) => o.replace(/\/$/, "").toLowerCase());
  return allowed.includes(origin.replace(/\/$/, "").toLowerCase());
}

function jellyfinFromUrl(
  url: URL,
  extra: string[],
  stored = false,
): WatchParseResult {
  if (hostLooksLikeScrape(url.hostname)) {
    return { ok: false, reason: "scrape CDN hosts are not watch sources" };
  }
  const origin = originOf(url);
  if (!isAllowedJellyfinOrigin(origin, extra, stored)) {
    return {
      ok: false,
      reason:
        "Jellyfin origin is not on the allowlist (HTTPS + configured host, or localhost)",
    };
  }
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashQuery = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const hashParams = new URLSearchParams(hashQuery);
  const itemId =
    url.searchParams.get("id") ||
    url.searchParams.get("itemId") ||
    hashParams.get("id") ||
    hashParams.get("itemId") ||
    url.pathname.match(/\/Items\/([0-9a-fA-F-]+)/)?.[1] ||
    undefined;
  if (/\.m3u8($|\?)/i.test(url.pathname) && !itemId) {
    return { ok: false, reason: "bare HLS is not a watch source" };
  }
  return {
    ok: true,
    ticket: {
      v: 1,
      kind: "jellyfin",
      origin,
      itemId,
      playUrl: isDirectMediaPath(url.pathname) ? url.toString() : undefined,
    },
  };
}

function syncplayFromUrl(url: URL): WatchParseResult {
  const host = url.hostname.toLowerCase();
  const okHost =
    host === "syncplay.pl" || host.endsWith(".syncplay.pl") || isLoopback(host);
  if (!okHost) {
    return { ok: false, reason: "Syncplay host is not allowlisted" };
  }
  if (
    url.protocol !== "https:" &&
    url.protocol !== "syncplay:" &&
    !isLoopback(host)
  ) {
    return { ok: false, reason: "Syncplay must be https (or loopback)" };
  }
  return {
    ok: true,
    ticket: { v: 1, kind: "syncplay", syncplayUrl: url.toString() },
  };
}

function parseObject(
  raw: unknown,
  extra: string[],
  stored = false,
): WatchParseResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "watch ticket is not an object" };
  }
  const o = raw as Record<string, unknown>;
  if (o.v !== 1)
    return { ok: false, reason: "unsupported watch ticket version" };
  const kind = o.kind;
  if (kind !== "jellyfin" && kind !== "iroh" && kind !== "syncplay") {
    return {
      ok: false,
      reason: "watch kind must be jellyfin, iroh, or syncplay",
    };
  }
  const ticket: WatchTicket = {
    v: 1,
    kind,
    title: typeof o.title === "string" ? o.title : undefined,
    origin: typeof o.origin === "string" ? o.origin : undefined,
    itemId: typeof o.itemId === "string" ? o.itemId : undefined,
    ticket: typeof o.ticket === "string" ? o.ticket : undefined,
    cid: typeof o.cid === "string" ? o.cid : undefined,
    mime: typeof o.mime === "string" ? o.mime : undefined,
    syncplayUrl: typeof o.syncplayUrl === "string" ? o.syncplayUrl : undefined,
  };
  if (kind === "jellyfin") {
    if (!ticket.origin)
      return { ok: false, reason: "jellyfin ticket missing origin" };
    if (!isAllowedJellyfinOrigin(ticket.origin, extra, stored)) {
      return { ok: false, reason: "Jellyfin origin is not on the allowlist" };
    }
    if (typeof o.playUrl === "string") {
      try {
        const play = new URL(o.playUrl);
        if (
          isAllowedJellyfinOrigin(originOf(play), extra, stored) &&
          originOf(play).replace(/\/$/, "").toLowerCase() ===
            ticket.origin.replace(/\/$/, "").toLowerCase() &&
          isDirectMediaPath(play.pathname)
        ) {
          ticket.playUrl = play.toString();
        }
      } catch {
        /* a bad play url is dropped; the ticket can still name the item */
      }
    }
  }
  if (kind === "iroh") {
    if (!ticket.ticket && !ticket.cid) {
      return {
        ok: false,
        reason: "iroh ticket missing cid or blkspace1 ticket",
      };
    }
    if (ticket.ticket && !ticket.ticket.startsWith(IROH_PREFIX)) {
      return { ok: false, reason: "iroh share must be a blkspace1 ticket" };
    }
    if (!isMediaMime(ticket.mime)) {
      return {
        ok: false,
        reason: "iroh watch mime must be video/* or audio/*",
      };
    }
  }
  if (kind === "syncplay") {
    if (!ticket.syncplayUrl)
      return { ok: false, reason: "syncplay ticket missing url" };
    try {
      return syncplayFromUrl(new URL(ticket.syncplayUrl));
    } catch {
      return { ok: false, reason: "syncplay url is invalid" };
    }
  }
  return { ok: true, ticket };
}

/**
 * Parse a pasted URL, blkspace-watch ticket, or blkspace1 Iroh ticket.
 */
export function parseWatchSource(
  raw: string,
  opts: WatchParseOptions = {},
): WatchParseResult {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "empty watch source" };
  const extra = opts.jellyfinOrigins ?? [];
  const stored = opts.stored === true;

  if (text.startsWith(WATCH_TICKET_PREFIX)) {
    try {
      const json = b64urlDecode(text.slice(WATCH_TICKET_PREFIX.length));
      return parseObject(JSON.parse(json), extra, stored);
    } catch {
      return { ok: false, reason: "watch ticket is not valid base64 json" };
    }
  }

  if (text.startsWith(IROH_PREFIX)) {
    return {
      ok: false,
      reason:
        "bare blkspace1 ticket needs a video/audio mime; wrap as blkspace-watch.v1",
    };
  }

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, reason: "not a URL or watch ticket" };
  }

  if (hostLooksLikeScrape(url.hostname)) {
    return { ok: false, reason: "scrape CDN hosts are not watch sources" };
  }

  if (url.protocol === "syncplay:") return syncplayFromUrl(url);

  if (url.protocol !== "https:" && !isLoopback(url.hostname)) {
    return {
      ok: false,
      reason: "only https (or localhost) watch URLs are allowed",
    };
  }

  if (
    url.hostname.toLowerCase() === "syncplay.pl" ||
    url.hostname.toLowerCase().endsWith(".syncplay.pl")
  ) {
    return syncplayFromUrl(url);
  }

  const path = url.pathname.toLowerCase();
  if (path.endsWith(".m3u8") || path.endsWith(".mpd")) {
    if (!isAllowedJellyfinOrigin(originOf(url), extra, stored)) {
      return { ok: false, reason: "bare HLS/DASH is not a watch source" };
    }
  }

  return jellyfinFromUrl(url, extra, stored);
}
