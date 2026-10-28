/**
 * LogosDecks showcase math. A track and a book are both a deck.
 * The flow judge decides the set. Filter and echo apply only to a file
 * stored on this device (data: or blob:), so an https track stays audible.
 */
import {
  isVerseSrc,
  verseLabel,
  type AudioMixtape,
  type MixtapeTrack,
} from "@/lib/audio-mixtapes";
import {
  LOGOS_DECK_DEMO_CRATE,
  UNLISTED_PASSAGE,
} from "@/lib/logos-deck-library";

export const HOT_CUE_COUNT = 8;

export const BOOK_TRADITIONS = [
  "Bible",
  "Quran",
  "Buddhist",
  "Esoteric",
  "Other",
] as const;

export type BookTradition = (typeof BOOK_TRADITIONS)[number];

export type ShowcaseLane = "track" | "book";

/** A named reading with no hosted words yet. The deck does not write them. */
export const HOSTED_READING =
  "This deck is holding the reading by name. Add the words you host, or a hosted audio file, and it streams with the record.";

const ROUND_STORE = "blkspace_logos_rounds_v1";

export const LENS_NAMES = ["flat", "law", "grace", "echo"] as const;

export type LensName = (typeof LENS_NAMES)[number];

export interface LensEffect {
  name: LensName;
  /** Null leaves the filter open. */
  lowpassHz: number | null;
  delaySec: number;
  feedback: number;
  wet: number;
  caption: string;
}

export interface DeckLoad {
  id: string;
  title: string;
  /** Record title, or the tradition shelf. */
  source: string;
  /** Member handle for a record. Empty for a reading. */
  authorHandle: string;
  /** Playable URL or blob id. Empty until the reading has hosted audio. */
  src: string;
  passage: string;
  text: string;
  playable: boolean;
  /** Track streams a record. Book streams a reading. */
  lane: ShowcaseLane;
  /** Bible, Quran, Buddhist, Esoteric, or the name the member typed. */
  tradition: string;
}

export interface RoundScore {
  a: number;
  b: number;
}

const LENSES: Record<LensName, LensEffect> = {
  flat: {
    name: "flat",
    lowpassHz: null,
    delaySec: 0,
    feedback: 0,
    wet: 0,
    caption: "Flat. Volume, cue, loop, and hot cues only.",
  },
  law: {
    name: "law",
    lowpassHz: 900,
    delaySec: 0,
    feedback: 0,
    wet: 0,
    caption: "Law lens lowers the highs on a file stored on this device.",
  },
  grace: {
    name: "grace",
    lowpassHz: 6400,
    delaySec: 0,
    feedback: 0,
    wet: 0,
    caption: "Grace lens opens the highs on a file stored on this device.",
  },
  echo: {
    name: "echo",
    lowpassHz: null,
    delaySec: 0.28,
    feedback: 0.32,
    wet: 0.35,
    caption: "Echo repeats a file stored on this device.",
  },
};

export function lensEffect(name: string): LensEffect {
  if (name === "law" || name === "grace" || name === "echo")
    return LENSES[name];
  return LENSES.flat;
}

/** Web Audio is safe for a file this page owns. An https URL is not. */
export function canShapeAudio(src: string | null | undefined): boolean {
  const value = (src || "").trim();
  return value.startsWith("data:") || value.startsWith("blob:");
}

/**
 * 0 is Deck A only. 100 is Deck B only. 50 is equal power.
 * Volumes are linear gains from 0 to 1.
 */
export function crossfaderVolumes(position: number): { a: number; b: number } {
  const raw = Number(position);
  const clamped = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 50;
  const t = clamped / 100;
  return {
    a: Math.cos((t * Math.PI) / 2),
    b: Math.sin((t * Math.PI) / 2),
  };
}

/** Hot cue 0 is the start. Cue 7 is seven eighths through the file. */
export function hotCueSeconds(duration: number, index: number): number {
  const length = Number(duration);
  if (!Number.isFinite(length) || length <= 0) return 0;
  const slot = Math.min(
    HOT_CUE_COUNT - 1,
    Math.max(0, Math.floor(Number(index) || 0)),
  );
  return (length * slot) / HOT_CUE_COUNT;
}

export function logosDeckBattlePath(battleId: string): string {
  return `/logosdecks?battle=${encodeURIComponent(battleId)}`;
}

export function logosDeckMixPath(mixId: string): string {
  return `/logosdecks?mix=${encodeURIComponent(mixId)}`;
}

export function emptyRound(): RoundScore {
  return { a: 0, b: 0 };
}

/** A stored room tally. The flow judge on the board decides the set. */
export function callRound(score: RoundScore, side: "a" | "b"): RoundScore {
  const a = Math.max(0, Math.floor(Number(score?.a) || 0));
  const b = Math.max(0, Math.floor(Number(score?.b) || 0));
  return side === "a" ? { a: a + 1, b } : { a, b: b + 1 };
}

export function roundLead(score: RoundScore): "a" | "b" | "even" {
  if (score.a === score.b) return "even";
  return score.a > score.b ? "a" : "b";
}

export function readRound(id: string): RoundScore {
  const key = id.trim() || "showcase";
  try {
    const raw = localStorage.getItem(ROUND_STORE);
    if (!raw) return emptyRound();
    const parsed = JSON.parse(raw) as Record<string, RoundScore>;
    const row = parsed?.[key];
    return {
      a: Math.max(0, Math.floor(Number(row?.a) || 0)),
      b: Math.max(0, Math.floor(Number(row?.b) || 0)),
    };
  } catch {
    return emptyRound();
  }
}

export function writeRound(id: string, score: RoundScore): RoundScore {
  const key = id.trim() || "showcase";
  const next = {
    a: Math.max(0, Math.floor(Number(score?.a) || 0)),
    b: Math.max(0, Math.floor(Number(score?.b) || 0)),
  };
  let all: Record<string, RoundScore> = {};
  try {
    const raw = localStorage.getItem(ROUND_STORE);
    const parsed = raw ? (JSON.parse(raw) as Record<string, RoundScore>) : {};
    if (parsed && typeof parsed === "object") all = parsed;
  } catch {
    all = {};
  }
  all[key] = next;
  localStorage.setItem(ROUND_STORE, JSON.stringify(all));
  return next;
}

/** A reading the member hosts. Empty words stay a name. No generated scripture. */
export function bookLoad(input: {
  tradition: string;
  title: string;
  text?: string;
  src?: string;
}): DeckLoad {
  const tradition = input.tradition.trim().slice(0, 40) || "Other";
  const title = input.title.trim().slice(0, 80);
  if (!title) throw new Error("Name the reading.");
  const text = (input.text || "").trim().slice(0, 4000);
  const src = (input.src || "").trim();
  const playable = src.length > 0 && !isVerseSrc(src);
  return {
    id: `book_${Date.now().toString(36)}_${
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 24) || "reading"
    }`,
    title,
    source: tradition,
    authorHandle: "",
    src: playable ? src : "",
    passage: title,
    text: text || HOSTED_READING,
    playable,
    lane: "book",
    tradition,
  };
}

function passageText(reference: string): string {
  const found = LOGOS_DECK_DEMO_CRATE.find(
    (row) => row.reference === reference,
  );
  return found?.text || UNLISTED_PASSAGE;
}

function cueFromTrack(
  mixtape: AudioMixtape,
  track: MixtapeTrack,
  index: number,
): DeckLoad {
  const id = `${mixtape.id}:${track.id || index}`;
  if (isVerseSrc(track.src)) {
    const passage = verseLabel(track.src);
    const known = LOGOS_DECK_DEMO_CRATE.some(
      (row) => row.reference === passage,
    );
    return {
      id,
      title: track.title || passage,
      source: mixtape.title,
      authorHandle: mixtape.authorHandle,
      src: "",
      passage,
      text: passageText(passage),
      playable: false,
      lane: "book",
      tradition: known ? "Bible" : "Reading",
    };
  }
  return {
    id,
    title: track.title || `Track ${index + 1}`,
    source: mixtape.title,
    authorHandle: mixtape.authorHandle,
    src: track.src,
    passage: "",
    text: "",
    playable: true,
    lane: "track",
    tradition: "",
  };
}

export function cuesFromMixtape(mixtape: AudioMixtape): DeckLoad[] {
  return mixtape.tracks.map((track, index) =>
    cueFromTrack(mixtape, track, index),
  );
}

export function scriptureLoads(): DeckLoad[] {
  return LOGOS_DECK_DEMO_CRATE.map((track) => ({
    id: `scripture:${track.id}`,
    title: track.reference,
    source: "Bible",
    authorHandle: "",
    src: "",
    passage: track.reference,
    text: track.text,
    playable: false,
    lane: "book",
    tradition: "Bible",
  }));
}
