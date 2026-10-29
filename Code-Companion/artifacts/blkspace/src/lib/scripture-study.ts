/**
 * Opt-in scripture study. The shelf is the six verses already in the deck
 * crate. Shared words are the overlap between those lines. A hosted note
 * stays on this browser. Tradition is a label. Nothing here is a model,
 * a feed rank, a MIDF input, or a WeixBucks earn.
 */
import {
  crossRefsFor,
  LOGOS_DECK_DEMO_CRATE,
  UNLISTED_PASSAGE,
} from "@/lib/logos-deck-library";

export const SCRIPTURE_TAGS = ["#scripture", "#study", "#cross-ref"] as const;

export const SCRIPTURE_STORE = "blkspace_scripture_study_v1";

const STOPS = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "thou",
  "thee",
  "thy",
  "was",
  "were",
  "his",
  "her",
  "our",
  "but",
  "not",
  "you",
  "your",
  "from",
  "have",
  "this",
  "into",
  "unto",
  "shall",
  "will",
  "them",
  "they",
  "their",
  "who",
  "whom",
  "which",
  "what",
  "when",
  "where",
  "been",
  "are",
  "had",
  "has",
]);

export type ShelfLink = {
  reference: string;
  text: string;
  shared: string[];
};

export type ShelfStudy = {
  reference: string;
  onShelf: boolean;
  text: string;
  links: ShelfLink[];
  tags: readonly string[];
};

export type ScriptureNote = {
  passage: string;
  tradition: string;
  text: string;
};

export function wordsOf(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOPS.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
}

/** Words that appear in both lines. Order follows the first line. */
export function sharedWords(left: string, right: string): string[] {
  const other = new Set(wordsOf(right));
  return wordsOf(left).filter((word) => other.has(word));
}

export function studyPassage(reference: string): ShelfStudy {
  const name = reference.trim();
  const track = LOGOS_DECK_DEMO_CRATE.find(
    (row) => row.reference.toLowerCase() === name.toLowerCase(),
  );
  if (!track) {
    return {
      reference: name,
      onShelf: false,
      text: UNLISTED_PASSAGE,
      links: [],
      tags: SCRIPTURE_TAGS,
    };
  }
  return {
    reference: track.reference,
    onShelf: true,
    text: track.text,
    links: crossRefsFor(track).map((row) => ({
      reference: row.reference,
      text: row.text,
      shared: sharedWords(track.text, row.text),
    })),
    tags: SCRIPTURE_TAGS,
  };
}

/**
 * Overlap between a note the member hosts and a shelf line.
 * The tradition string is returned as a label and does not change `shared`.
 */
export function noteOverlap(
  tradition: string,
  hosted: string,
  shelf: ShelfStudy,
): { tradition: string; shared: string[] } {
  const label = tradition.trim().slice(0, 40) || "Reading";
  return {
    tradition: label,
    shared: shelf.onShelf ? sharedWords(hosted, shelf.text) : [],
  };
}

function handleKey(handle: string): string {
  const name = handle.trim();
  return /^[A-Za-z0-9_]{1,32}$/.test(name) ? name : "";
}

function emptyNote(): ScriptureNote {
  return { passage: "", tradition: "Reading", text: "" };
}

export function readScriptureNote(handle: string): ScriptureNote | null {
  const key = handleKey(handle);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(SCRIPTURE_STORE);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, ScriptureNote>)
      : {};
    const note = parsed?.[key];
    if (!note || typeof note !== "object") return null;
    const passage = String(note.passage || "")
      .trim()
      .slice(0, 80);
    if (!passage) return null;
    return {
      passage,
      tradition:
        String(note.tradition || "Reading")
          .trim()
          .slice(0, 40) || "Reading",
      text: String(note.text || "").slice(0, 4000),
    };
  } catch {
    return null;
  }
}

export function writeScriptureNote(
  handle: string,
  note: ScriptureNote,
): ScriptureNote {
  const key = handleKey(handle);
  const passage = note.passage.trim().slice(0, 80);
  if (!key || !passage) return emptyNote();
  const next: ScriptureNote = {
    passage,
    tradition: note.tradition.trim().slice(0, 40) || "Reading",
    text: note.text.slice(0, 4000),
  };
  let all: Record<string, ScriptureNote> = {};
  try {
    const raw = localStorage.getItem(SCRIPTURE_STORE);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, ScriptureNote>)
      : {};
    if (parsed && typeof parsed === "object") all = parsed;
  } catch {
    all = {};
  }
  all[key] = next;
  localStorage.setItem(SCRIPTURE_STORE, JSON.stringify(all));
  return next;
}
