/**
 * WeixSound label switches. They change the disc. They do not add leverage.
 * A Solana receipt is a memo the label pays after the sale. It never calls
 * convert_wb_to_bkspc and it never prices the copy.
 */

export const WEIXSOUND_LABEL = "Bermuda Boyz";
export const YARD_KEEP_PERCENT = 5;
export const ARTIST_POOL_PERCENT = 95;
export const SOLANA_MEMO_PROGRAM =
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export const DISC_FORMATS = ["single", "vinyl", "ep", "mixtape", "album", "cd"] as const;
export const STEM_LANES = ["vocals", "drums", "bass", "music"] as const;
export type StemLane = (typeof STEM_LANES)[number];
export type DiscFormat = (typeof DISC_FORMATS)[number];
export type ReleaseVisibility = "yard" | "public";

const STORE_HOSTS = ["audius.co", "soundcloud.com", "bandcamp.com", "tidal.com"];
const HANDLE_RE = /^[a-z0-9_-]{3,30}$/i;
const MASTER_RE = /^[a-z][a-z0-9_]{3,64}$/i;

export interface ReleaseSplit {
  handle: string;
  percent: number;
}

export interface ReleaseTrack {
  id: string;
  src: string;
}

export function formatLabel(format: DiscFormat): string {
  if (format === "ep") return "EP";
  if (format === "cd") return "CD";
  return format.slice(0, 1).toUpperCase() + format.slice(1);
}

/** Vinyl, and any paid song copy, is the chain-verified sale. A free stream is not. */
export function chainVerifiedSale(input: {
  setKind: string;
  format: string;
  priceWb: number;
}): boolean {
  if (input.setKind !== "songs") return false;
  return input.format === "vinyl" || input.priceWb > 0;
}

export interface TrackStem {
  id: string;
  lane: StemLane;
  src: string;
}

export function stemsOf(value: unknown): TrackStem[] {
  if (!Array.isArray(value) || !value.length) return [];
  if (value.length > 4) throw new Error("A track holds at most 4 stems.");
  return value.map((row, index) => {
    const lane = STEM_LANES.find((name) => name === row?.lane);
    const src = String(row?.src || "").trim();
    if (!lane) throw new Error("A stem is vocals, drums, bass, or music.");
    if (!src.startsWith("https://") && !/^web_[a-z0-9]+$/i.test(src)) {
      throw new Error("A stem needs an https file or an uploaded audio file.");
    }
    const id = String(row?.id || "").trim();
    return { id: id || `${lane}_${index}`, lane, src };
  });
}

export function streamMetadata(input: {
  title: string;
  authorHandle: string;
  format: DiscFormat;
  credits: string;
  label: string;
  tracks: { title: string }[];
  index: number;
}) {
  const track = input.tracks[input.index];
  return {
    title: track?.title || input.title,
    artist: input.authorHandle,
    release: input.title,
    label: input.label,
    format: formatLabel(input.format),
    credits: input.credits,
    trackNumber: input.index + 1,
    trackCount: input.tracks.length,
  };
}

export function discFormatOf(value: unknown, trackCount: number): DiscFormat {
  if (trackCount < 1 || trackCount > 12) {
    throw new Error("A release holds 1 to 12 tracks.");
  }
  const named = DISC_FORMATS.find((format) => format === value);
  const format: DiscFormat =
    named || (trackCount <= 1 ? "single" : trackCount <= 6 ? "ep" : "mixtape");
  if ((format === "single" || format === "vinyl") && trackCount !== 1) {
    throw new Error(
      format === "vinyl" ? "A vinyl holds one track." : "A single holds one track.",
    );
  }
  if (format === "ep" && (trackCount < 2 || trackCount > 6)) {
    throw new Error("An EP holds 2 to 6 tracks.");
  }
  return format;
}

export function storeUrlOf(value: unknown): string {
  const out = String(value || "").trim();
  if (!out) return "";
  let url: URL;
  try {
    url = new URL(out);
  } catch {
    throw new Error(
      "Store link must be https on Audius, SoundCloud, Bandcamp, or Tidal.",
    );
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const allowed = STORE_HOSTS.some(
    (name) => host === name || host.endsWith(`.${name}`),
  );
  if (url.protocol !== "https:" || !allowed) {
    throw new Error(
      "Store link must be https on Audius, SoundCloud, Bandcamp, or Tidal.",
    );
  }
  return url.toString();
}

export function splitsOf(value: unknown, author: string): ReleaseSplit[] {
  const handle = author.trim();
  if (!HANDLE_RE.test(handle)) {
    throw new Error("The sleeve needs the artist's handle.");
  }
  const rows = Array.isArray(value) ? value : [];
  if (!rows.length) return [{ handle, percent: ARTIST_POOL_PERCENT }];
  if (rows.length > 8) throw new Error("A sleeve lists at most 8 splits.");
  const clean = rows.map((row) => {
    const name = String(row?.handle || "").trim();
    const percent = Math.floor(Number(row?.percent));
    if (!HANDLE_RE.test(name) || percent < 1 || percent > ARTIST_POOL_PERCENT) {
      throw new Error("Each split needs a handle and a percent from 1 to 95.");
    }
    return { handle: name, percent };
  });
  const sum = clean.reduce((total, row) => total + row.percent, 0);
  if (sum !== ARTIST_POOL_PERCENT) {
    throw new Error("Splits must sum to 95. The yard keeps 5.");
  }
  return clean;
}

export function parseSplitLines(text: string, author: string): ReleaseSplit[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return splitsOf([], author);
  const rows = lines.map((line) => {
    const match = /^([a-z0-9_-]{3,30})\s+(\d{1,2})$/i.exec(line);
    if (!match) {
      throw new Error("Write each split as a handle and a percent, like dj_yard 95.");
    }
    return { handle: match[1], percent: Number(match[2]) };
  });
  return splitsOf(rows, author);
}

export function assertPublicDisc(input: {
  visibility: ReleaseVisibility;
  setKind: string;
  rightsAttested: boolean;
  tracks: ReleaseTrack[];
}): void {
  if (input.visibility !== "public") return;
  if (input.setKind !== "songs") {
    throw new Error("A verse set or Logos deck stays on the yard.");
  }
  if (!input.rightsAttested) {
    throw new Error("Attest that you hold the rights before a public disc.");
  }
  if (input.tracks.some((track) => !track.src.startsWith("https://"))) {
    throw new Error("A public disc needs an https audio file on every row.");
  }
}

export function releaseFields(
  input: {
    format?: unknown;
    visibility?: unknown;
    storeUrl?: unknown;
    writeReceipt?: unknown;
    rightsAttested?: unknown;
    splits?: unknown;
    splitsText?: string;
    masterId?: unknown;
    priceWb?: number;
    setKind: string;
    tracks: ReleaseTrack[];
  },
  author: string,
) {
  const format = discFormatOf(input.format, input.tracks.length);
  const visibility: ReleaseVisibility =
    input.visibility === "public" ? "public" : "yard";
  const priceWb = Math.max(0, Math.floor(Number(input.priceWb) || 0));
  const writeReceipt =
    input.writeReceipt === true ||
    chainVerifiedSale({ setKind: input.setKind, format, priceWb });
  const rightsAttested = input.rightsAttested === true;
  const storeUrl = storeUrlOf(input.storeUrl);
  const splits =
    typeof input.splitsText === "string"
      ? parseSplitLines(input.splitsText, author)
      : splitsOf(input.splits, author);
  const masterId = String(input.masterId || "").trim();
  if (masterId && !MASTER_RE.test(masterId)) {
    throw new Error("Master id is not valid.");
  }
  assertPublicDisc({
    visibility,
    setKind: input.setKind,
    rightsAttested,
    tracks: input.tracks,
  });
  return {
    format,
    visibility,
    writeReceipt,
    rightsAttested,
    storeUrl,
    splits,
    masterId,
    label: WEIXSOUND_LABEL,
  };
}

/** Stable track-list fingerprint. Same string on the yard desk and in the browser. */
export function trackListHash(
  tracks: (ReleaseTrack & { stems?: { lane: string; src: string }[] })[],
): string {
  const payload = tracks
    .map((track) => {
      const stems = (track.stems || [])
        .map((stem) => `${stem.lane}|${stem.src}`)
        .join(",");
      return `${track.id}|${track.src}|${stems}`;
    })
    .join("\n");
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code;
    h2 = Math.imul(h2, 0x811c9dc5);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return `${hex(h1)}${hex(h2)}`;
}

/**
 * The chain step after a sale. Official Solana memo program, paid by the label.
 * Null when the label left the receipt switch off. Never a mint.
 */
const VERIFIED_HOLDS = "blkspace_weixsound_holds_v1";

/** This browser remembers a copy the signed-in student bought. The yard receipt is the book. */
export function rememberVerifiedCopy(id: string): void {
  const key = id.trim();
  if (!key) return;
  try {
    const raw = JSON.parse(localStorage.getItem(VERIFIED_HOLDS) || "[]") as unknown;
    const ids = Array.isArray(raw) ? raw.map(String) : [];
    if (ids.includes(key)) return;
    localStorage.setItem(VERIFIED_HOLDS, JSON.stringify([key, ...ids].slice(0, 200)));
  } catch {
    localStorage.setItem(VERIFIED_HOLDS, JSON.stringify([key]));
  }
}

export function holdsVerifiedCopy(id: string): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem(VERIFIED_HOLDS) || "[]") as unknown;
    return Array.isArray(raw) && raw.map(String).includes(id);
  } catch {
    return false;
  }
}

export function discAnchorPlan(input: {
  trackHash: string;
  copyNumber: number;
  priceWb: number;
  anchorStatus: string;
}) {
  if (input.anchorStatus !== "pending") return null;
  return {
    programId: SOLANA_MEMO_PROGRAM,
    payer: "label" as const,
    callsConvertWbToBkspc: false,
    memo: `weixsound|${input.trackHash}|copy:${input.copyNumber}|wb:${input.priceWb}`,
  };
}
