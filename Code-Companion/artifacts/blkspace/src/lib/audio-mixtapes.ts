/**
 * Audio mixtapes for the yard hub.
 *
 * Shape follows a self-hosted library (Funkwhale: a playlist is ordered
 * tracks, one player owns the queue) and a phone player (Otter, MIT: play
 * the list in order, do not mount a player per row). The code is ours.
 * BlkCore records the edition in Yard Sale. It is not a Solana NFT.
 * BLKSHI does not take the trade.
 */
import { isSafeHttpUrl } from "@/lib/amalgamation-meta";
import { getCurrentDisplayName, getCurrentHandle } from "@/lib/auth";
import { publishHubItem } from "@/lib/content-hub";
import { isWebBlobId } from "@/lib/media-web-store";
import { loadUiPrefs } from "@/lib/ui-prefs";

export const MIXTAPE_STORE = "blkspace_audio_mixtapes_v1";
/** Keep phone IndexedDB usable. Longer sets belong on an https host. */
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
export const MAX_TRACKS = 12;

const AUDIO_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
]);

export interface MixtapeTrack {
  id: string;
  title: string;
  /** `web_` blob id or an http(s) URL. Never a data URL. */
  src: string;
}

export interface AudioMixtape {
  id: string;
  title: string;
  body: string;
  tracks: MixtapeTrack[];
  authorHandle: string;
  authorDisplayName: string;
  yardId: string;
  createdAt: string;
  priceWb: number;
  /** How many copies the yard sale catalog offers. Not minted on a chain. */
  editionSize: number;
  listingId: number | null;
  hubItemId: string | null;
}

export function mixtapeRef(id: string): string {
  return `mixtape:${id}`;
}

export function parseMixtapeRef(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const match = /^mixtape:([a-z0-9_]+)$/i.exec(value.trim());
  return match?.[1] ?? null;
}

export function audioFileOk(file: {
  type: string;
  name: string;
  size: number;
}): string | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const mimeOk =
    AUDIO_MIME.has(type) || /\.(mp3|wav|ogg|oga|webm|m4a|aac|flac)$/.test(name);
  if (!mimeOk) return "Use an audio file (mp3, wav, ogg, m4a, webm, flac).";
  if (file.size > MAX_AUDIO_BYTES) {
    return "That file is over 8 MB. Host it at an https link and paste the URL.";
  }
  if (file.size <= 0) return "That file is empty.";
  return null;
}

export function trackSrcOk(src: string): boolean {
  const value = src.trim();
  if (isWebBlobId(value)) return true;
  return isSafeHttpUrl(value);
}

function load(): AudioMixtape[] {
  try {
    const raw = localStorage.getItem(MIXTAPE_STORE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AudioMixtape[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(items: AudioMixtape[]) {
  localStorage.setItem(MIXTAPE_STORE, JSON.stringify(items.slice(0, 100)));
}

export function listMixtapes(): AudioMixtape[] {
  return load().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getMixtape(id: string): AudioMixtape | null {
  return load().find((item) => item.id === id) ?? null;
}

export function publishMixtape(input: {
  title: string;
  body?: string;
  tracks: MixtapeTrack[];
  priceWb?: number;
  editionSize?: number;
}): AudioMixtape {
  const title = input.title.trim();
  if (!title) throw new Error("Title required");
  const tracks = input.tracks
    .map((track) => ({
      id: track.id,
      title: track.title.trim() || "Untitled track",
      src: track.src.trim(),
    }))
    .filter((track) => track.src);
  if (!tracks.length) throw new Error("Add at least one track");
  if (tracks.length > MAX_TRACKS) {
    throw new Error(`A mixtape holds up to ${MAX_TRACKS} tracks`);
  }
  if (tracks.some((track) => !trackSrcOk(track.src))) {
    throw new Error("Each track needs an uploaded file or an https link");
  }
  const priceWb = Math.max(0, Math.floor(input.priceWb ?? 0));
  const editionSize = Math.min(
    100,
    Math.max(1, Math.floor(input.editionSize ?? 1)),
  );
  const handle = getCurrentHandle() || "guest";
  const yardId = loadUiPrefs().homeYardId || "tsu";
  const mixtape: AudioMixtape = {
    id: `mix_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    body: (input.body || "").trim(),
    tracks,
    authorHandle: handle,
    authorDisplayName: getCurrentDisplayName() || handle,
    yardId,
    createdAt: new Date().toISOString(),
    priceWb,
    editionSize,
    listingId: null,
    hubItemId: null,
  };
  const hub = publishHubItem({
    topic: "music",
    kind: "audio",
    title,
    body:
      input.body || `${tracks.length} track${tracks.length === 1 ? "" : "s"}`,
    mediaUrl: mixtapeRef(mixtape.id),
    yardId,
    earnHint:
      priceWb > 0
        ? `BlkCore edition · ${priceWb} WB · ${editionSize} copies · not a chain NFT`
        : "Play on the hub · list a BlkCore edition later",
  });
  mixtape.hubItemId = hub.id;
  save([mixtape, ...load()]);
  return mixtape;
}

export function markMixtapeListed(
  id: string,
  listingId: number,
): AudioMixtape | null {
  const items = load();
  const row = items.find((item) => item.id === id);
  if (!row) return null;
  row.listingId = listingId;
  save(items);
  return row;
}

/** Yard Sale payload. isNft stays false until a real mint exists. */
export function mixtapeListingArgs(mixtape: AudioMixtape) {
  return {
    itemType: "mix" as const,
    itemRef: mixtape.id,
    price: Math.max(1, mixtape.priceWb),
    title: mixtape.title,
    description:
      mixtape.body ||
      `BlkCore audio edition (${mixtape.editionSize} copies). Not a chain NFT.`,
    isNft: false,
    townTag: mixtape.yardId,
    fulfillmentMode: "instant" as const,
    deliveryHint: mixtapeRef(mixtape.id),
  };
}
