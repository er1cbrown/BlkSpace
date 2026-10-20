/**
 * typeverse — verse typer inside BKSPC.
 * Corpora are public-domain texts shipped as gzipped TSV under /typeverse.
 * Greek SBLGNT and Reina Valera Gómez stay off this page (their licenses
 * do not allow redistributing the text with the web app).
 */

export const TYPEVERSE_MODULES = [
  {
    id: "kjv",
    label: "KJV",
    lang: "en",
    file: "kjv.tsv.gz",
    notice: "King James Version (1769). Public domain.",
  },
  {
    id: "sparv",
    label: "SpaRV",
    lang: "es",
    file: "sparv.tsv.gz",
    notice: "Reina-Valera 1909. Public domain.",
  },
] as const;

export type TypeverseModuleId = (typeof TYPEVERSE_MODULES)[number]["id"];
export type TypeverseMode = "random" | "daily";

export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface Streak {
  count: number;
  last: string;
}

export const TYPEVERSE_STREAK_KEY = "blkspace_typeverse_streak_v1";
export const TYPEVERSE_MODULE_KEY = "blkspace_typeverse_module_v1";
export const TYPEVERSE_MODE_KEY = "blkspace_typeverse_mode_v1";

const FOLD: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201a": "'",
  "\u201b": "'",
  "\u2032": "'",
  "\u00b4": "'",
  "`": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u201e": '"',
  "\u201f": '"',
  "\u00ab": '"',
  "\u00bb": '"',
  "\u2033": '"',
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2015": "-",
  "\u2212": "-",
  "¿": "?",
  "¡": "!",
};

export function moduleSpec(id: string) {
  return TYPEVERSE_MODULES.find((m) => m.id === id) ?? TYPEVERSE_MODULES[0];
}

export function readModule(raw: string | null): TypeverseModuleId {
  if (raw && TYPEVERSE_MODULES.some((m) => m.id === raw)) {
    return raw as TypeverseModuleId;
  }
  return "kjv";
}

export function readMode(raw: string | null): TypeverseMode {
  return raw === "daily" ? "daily" : "random";
}

export function verseRef(v: Verse): string {
  return `${v.book} ${v.chapter}:${v.verse}`;
}

/** Fold curly quotes and dashes to the keys a US/Intl keyboard types. */
export function foldKeys(s: string): string {
  let out = "";
  for (const ch of s) out += FOLD[ch] ?? ch;
  return out;
}

export function parseCorpus(raw: string): Verse[] {
  const out: Verse[] = [];
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const tab = line.split("\t");
    if (tab.length < 4) continue;
    const book = tab[0].trim();
    const chapter = Number(tab[1]);
    const verse = Number(tab[2]);
    const text = tab.slice(3).join("\t").trim();
    if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse) || !text)
      continue;
    out.push({ book, chapter, verse, text });
  }
  return out;
}

export function corpusUrl(file: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${base}/typeverse/${file}`;
}

export async function ungzipText(buf: ArrayBuffer): Promise<string> {
  const stream = new Blob([buf])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

/** Gzip magic stays compressed. A server that already decoded it returns text. */
export async function corpusText(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  const gzipped = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!gzipped) return new TextDecoder().decode(bytes);
  return ungzipText(buf);
}

const corpusCache = new Map<TypeverseModuleId, Promise<Verse[]>>();

export function loadCorpus(id: TypeverseModuleId): Promise<Verse[]> {
  const hit = corpusCache.get(id);
  if (hit) return hit;
  const spec = moduleSpec(id);
  const pending = fetch(corpusUrl(spec.file))
    .then(async (res) => {
      if (!res.ok) throw new Error(`could not load ${spec.label}`);
      const verses = parseCorpus(await corpusText(await res.arrayBuffer()));
      if (!verses.length) throw new Error(`no verses in ${spec.label}`);
      return verses;
    })
    .catch((err: unknown) => {
      corpusCache.delete(id);
      throw err;
    });
  corpusCache.set(id, pending);
  return pending;
}

export function pickIndex(length: number, rng: () => number = Math.random): number {
  if (length <= 0) throw new Error("empty corpus");
  return Math.floor(rng() * length) % length;
}

export function dailySeed(day: string, moduleLabel: string): string {
  return `${day}:${moduleLabel}`;
}

/** Date-seeded index. Same day and module always land on the same verse. */
export async function dailyIndex(
  day: string,
  moduleLabel: string,
  length: number,
): Promise<number> {
  if (length <= 0) throw new Error("empty corpus");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(dailySeed(day, moduleLabel)),
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return Number(BigInt(`0x${hex}`) % BigInt(length));
}

export function correctCount(typed: string, target: string): number {
  const n = Math.min(typed.length, target.length);
  let hit = 0;
  for (let i = 0; i < n; i++) if (typed[i] === target[i]) hit++;
  return hit;
}

/** Monkeytype-style WPM: correct characters / 5 / minutes. */
export function wordsPerMinute(correctChars: number, elapsedMs: number): number {
  if (!elapsedMs || elapsedMs <= 0 || correctChars <= 0) return 0;
  const mins = Math.max(elapsedMs / 60_000, 1 / 60_000);
  return Math.round(correctChars / 5 / mins);
}

export function accuracyPct(correct: number, typedLen: number): number {
  if (!typedLen) return 100;
  return Math.round((100 * correct) / typedLen);
}

export function localYmd(d = new Date()): string {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function previousYmd(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() - 1);
  return localYmd(dt);
}

export function readStreak(raw: string | null): Streak {
  if (!raw) return { count: 0, last: "" };
  try {
    const s = JSON.parse(raw) as { count?: unknown; last?: unknown };
    return {
      count: typeof s.count === "number" && s.count > 0 ? Math.floor(s.count) : 0,
      last: typeof s.last === "string" ? s.last : "",
    };
  } catch {
    return { count: 0, last: "" };
  }
}

/** One streak step per local day, only when the caller already checked accuracy. */
export function bumpStreak(prev: Streak, today: string, yesterday: string): Streak {
  if (prev.last === today) return prev;
  const count = (prev.last === yesterday ? prev.count : 0) + 1;
  return { count, last: today };
}
