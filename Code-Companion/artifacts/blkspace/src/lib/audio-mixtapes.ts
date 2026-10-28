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
import { listHubItems, publishHubItem } from "@/lib/content-hub";
import { hostedPost } from "@/lib/hosted-api";
import { isWebBlobId } from "@/lib/media-web-store";
import {
  DEFAULT_MYYARD_LAYOUT,
  mergeMyYardLayout,
} from "@/lib/myyard-layout";
import { loadLocalMyYard, saveLocalMyYard } from "@/lib/myyard-storage";
import { loadUiPrefs } from "@/lib/ui-prefs";

export const MIXTAPE_STORE = "blkspace_audio_mixtapes_v1";
/** Keep phone IndexedDB usable. Longer sets belong on an https host. */
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
export const MAX_COVER_BYTES = 2 * 1024 * 1024;
export const MAX_TRACKS = 12;
export const MAX_CREDITS = 800;

export type MixSetKind = "songs" | "verses" | "logos";

const VERSE_SRC = /^verse:[A-Za-z0-9][A-Za-z0-9 .:'-]{1,78}$/;

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
  /** songs = owned or https audio. verses = scripture refs. logos = a Logos Deck. */
  setKind: MixSetKind;
  priceWb: number;
  /** How many copies the yard sale catalog offers. Not minted on a chain. */
  editionSize: number;
  /** Front of the sleeve. https link or a web_ image id. Empty shows a title plate. */
  cover: string;
  /** Back of the sleeve: who made it. The track list is printed under this. */
  credits: string;
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

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function coverFileOk(file: {
  type: string;
  name: string;
  size: number;
}): string | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const mimeOk = IMAGE_MIME.has(type) || /\.(jpe?g|png|webp|gif)$/.test(name);
  if (!mimeOk) return "Use a cover image (jpg, png, webp, or gif).";
  if (file.size > MAX_COVER_BYTES) return "That cover is over 2 MB.";
  if (file.size <= 0) return "That cover is empty.";
  return null;
}

/** Empty is allowed. A data URL is not shared. */
export function coverSrcOk(src: string): boolean {
  const value = src.trim();
  if (!value) return true;
  if (value.startsWith("data:") || value.startsWith("verse:")) return false;
  if (isWebBlobId(value)) return true;
  return isSafeHttpUrl(value);
}

export function mixSetKind(value: unknown): MixSetKind {
  return value === "verses" || value === "logos" ? value : "songs";
}

export function isVerseSrc(src: string): boolean {
  return VERSE_SRC.test(src.trim());
}

/** A verse row names the passage. It is not an audio file and not a download. */
export function verseTrackSrc(reference: string): string {
  const ref = reference.trim().replace(/\s+/g, " ");
  if (
    !/^[A-Za-z0-9][A-Za-z0-9 .:'-]{1,78}$/.test(ref) ||
    !/\d+:\d+$/.test(ref)
  ) {
    throw new Error("Use a verse like Isaiah 53:5.");
  }
  return `verse:${ref}`;
}

export function verseLabel(src: string): string {
  return isVerseSrc(src) ? src.trim().slice(6) : "";
}

export function trackSrcOk(src: string): boolean {
  const value = src.trim();
  if (isVerseSrc(value)) return true;
  if (isWebBlobId(value)) return true;
  return isSafeHttpUrl(value);
}

function kindLabel(kind: MixSetKind): string {
  if (kind === "logos") return "Logos Deck";
  if (kind === "verses") return "Verse mix";
  return "Song mix";
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

function withKind(row: AudioMixtape): AudioMixtape {
  return {
    ...row,
    setKind: mixSetKind(row.setKind),
    cover: typeof row.cover === "string" ? row.cover : "",
    credits: typeof row.credits === "string" ? row.credits : "",
  };
}

export function listMixtapes(): AudioMixtape[] {
  return load()
    .map(withKind)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function getMixtape(id: string): AudioMixtape | null {
  const row = load().find((item) => item.id === id);
  return row ? withKind(row) : null;
}

export function publishMixtape(input: {
  title: string;
  body?: string;
  tracks: MixtapeTrack[];
  priceWb?: number;
  editionSize?: number;
  setKind?: MixSetKind;
  cover?: string;
  credits?: string;
}): AudioMixtape {
  const title = input.title.trim();
  if (!title) throw new Error("Title required");
  const setKind = mixSetKind(input.setKind);
  const tracks = input.tracks
    .map((track) => ({
      id: track.id,
      title: track.title.trim() || "Untitled track",
      src: track.src.trim(),
    }))
    .filter((track) => track.src);
  if (setKind === "songs" && tracks.some((track) => isVerseSrc(track.src))) {
    throw new Error(
      "A song set needs an audio file or an https link on every row.",
    );
  }
  if (!tracks.length) throw new Error("Add at least one track");
  if (tracks.length > MAX_TRACKS) {
    throw new Error(`A mixtape holds up to ${MAX_TRACKS} tracks`);
  }
  if (tracks.some((track) => !trackSrcOk(track.src))) {
    throw new Error(
      "Each row needs an uploaded file, an https link, or a verse reference.",
    );
  }
  const cover = (input.cover || "").trim();
  if (!coverSrcOk(cover)) {
    throw new Error("Cover art needs an image file or an https link.");
  }
  const credits = (input.credits || "").trim().slice(0, MAX_CREDITS);
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
    setKind,
    priceWb,
    editionSize,
    cover,
    credits,
    listingId: null,
    hubItemId: null,
  };
  const hub = publishHubItem({
    topic: "music",
    kind: "audio",
    title,
    body:
      input.body ||
      `${kindLabel(setKind)} · ${tracks.length} track${tracks.length === 1 ? "" : "s"}`,
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

/** A bought Logos Deck turns the profile module on. It does not mint a token. */
export function holdLogosEdition(input: {
  handle: string;
  setKind?: string | null;
  title?: string | null;
  passages?: string[] | null;
}): boolean {
  if (input.setKind !== "logos") return false;
  const handle = input.handle.trim();
  if (!handle) return false;
  const passages = (input.passages || [])
    .map((row) => row.trim())
    .filter(Boolean)
    .slice(0, MAX_TRACKS);
  const current = loadLocalMyYard(handle) ?? structuredClone(DEFAULT_MYYARD_LAYOUT);
  saveLocalMyYard(
    handle,
    mergeMyYardLayout(current, {
      modules: { logosDeck: true, bibleNlp: current.modules?.bibleNlp },
      logosDeck: {
        setTitle:
          (input.title || "").trim() ||
          current.logosDeck?.setTitle ||
          "Logos Deck",
        audioHash: current.logosDeck?.audioHash ?? null,
        trackIds: passages.length
          ? passages
          : (current.logosDeck?.trackIds ?? []),
      },
    }),
  );
  return true;
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
      `BlkCore ${kindLabel(mixSetKind(mixtape.setKind)).toLowerCase()} edition (${mixtape.editionSize} copies). Not a chain NFT.`,
    isNft: false,
    townTag: mixtape.yardId,
    fulfillmentMode: "instant" as const,
    deliveryHint: mixtapeRef(mixtape.id),
  };
}

function rememberMixtape(mixtape: AudioMixtape) {
  const ref = mixtapeRef(mixtape.id);
  const known = listHubItems("music").some(
    (item) => item.kind === "audio" && item.mediaUrl === ref,
  );
  if (known) return;
  publishHubItem({
    topic: "music",
    kind: "audio",
    title: mixtape.title,
    body:
      mixtape.body ||
      `${kindLabel(mixSetKind(mixtape.setKind))} · ${mixtape.tracks.length} track${mixtape.tracks.length === 1 ? "" : "s"}`,
    mediaUrl: ref,
    yardId: mixtape.yardId,
    authorHandle: mixtape.authorHandle,
    authorDisplayName: mixtape.authorDisplayName,
    earnHint:
      mixtape.priceWb > 0
        ? `BlkCore edition · ${mixtape.priceWb} WB · ${mixtape.editionSize} copies · not a chain NFT`
        : "Play on the hub · list a BlkCore edition later",
  });
}

/** Pull shared mixtapes, then send sets that only exist in this browser. */
export async function syncMixtapes(yardId?: string): Promise<void> {
  const yard = (yardId || "").trim();
  let remote: AudioMixtape[] = [];
  try {
    const query = yard ? `?yard=${encodeURIComponent(yard)}` : "";
    const res = await fetch(`/api/yards/mixtapes${query}`);
    if (!res.ok) return;
    const body = await res.json();
    if (!Array.isArray(body.mixtapes)) return;
    remote = body.mixtapes.map((item: AudioMixtape) => withKind(item));
  } catch {
    return;
  }
  const local = load();
  const ids = new Set(local.map((item) => item.id));
  const extra = remote.filter((item) => !ids.has(item.id));
  for (const mixtape of extra) rememberMixtape(mixtape);
  if (extra.length) save([...extra, ...local]);
  const seen = new Set(remote.map((item) => item.id));
  for (const mixtape of load()) {
    if (seen.has(mixtape.id)) continue;
    if (yard && mixtape.yardId !== yard) continue;
    try {
      await hostedPost("/api/yards/mixtapes", mixtape);
    } catch {
      /* this browser keeps the mixtape when the desk is closed */
    }
  }
}
