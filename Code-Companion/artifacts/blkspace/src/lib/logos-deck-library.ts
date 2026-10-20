/** Demo scripture crate for Logos Deck player (Phase 5 seed data). */

export interface LogosDeckTrack {
  id: string;
  reference: string;
  text: string;
  genre: string;
  author: string;
  spm: number;
  theologicalKey: string;
  crossRefs: string[];
}

export const LOGOS_DECK_DEMO_CRATE: LogosDeckTrack[] = [
  {
    id: "isa53-5",
    reference: "Isaiah 53:5",
    text: "But he was wounded for our transgressions, he was bruised for our iniquities…",
    genre: "Prophecy",
    author: "Isaiah",
    spm: 118,
    theologicalKey: "Suffering Servant",
    crossRefs: ["Psalm 22:1", "1 Peter 2:24", "Matthew 27:46"],
  },
  {
    id: "ps22-1",
    reference: "Psalm 22:1",
    text: "My God, my God, why hast thou forsaken me?",
    genre: "Poetry",
    author: "David",
    spm: 92,
    theologicalKey: "Lament → Victory",
    crossRefs: ["Isaiah 53:5", "Matthew 27:46", "Hebrews 12:2"],
  },
  {
    id: "jn3-16",
    reference: "John 3:16",
    text: "For God so loved the world, that he gave his only begotten Son…",
    genre: "Gospel",
    author: "John",
    spm: 105,
    theologicalKey: "Evangelion",
    crossRefs: ["Romans 5:8", "1 John 4:9", "Genesis 22:2"],
  },
  {
    id: "rom5-8",
    reference: "Romans 5:8",
    text: "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.",
    genre: "Epistle",
    author: "Paul",
    spm: 112,
    theologicalKey: "Grace",
    crossRefs: ["John 3:16", "Ephesians 2:8", "Isaiah 53:5"],
  },
  {
    id: "ps23-1",
    reference: "Psalm 23:1",
    text: "The LORD is my shepherd; I shall not want.",
    genre: "Poetry",
    author: "David",
    spm: 88,
    theologicalKey: "Comfort",
    crossRefs: ["John 10:11", "Revelation 7:17"],
  },
  {
    id: "mt27-46",
    reference: "Matthew 27:46",
    text: "My God, my God, why hast thou forsaken me?",
    genre: "Gospel",
    author: "Matthew",
    spm: 98,
    theologicalKey: "Fulfillment",
    crossRefs: ["Psalm 22:1", "Isaiah 53:5"],
  },
];

export function tracksByIds(ids: string[]): LogosDeckTrack[] {
  const map = new Map(LOGOS_DECK_DEMO_CRATE.map((t) => [t.id, t]));
  return ids.map((id) => map.get(id)).filter(Boolean) as LogosDeckTrack[];
}

export function crossRefsFor(track: LogosDeckTrack): LogosDeckTrack[] {
  return track.crossRefs
    .map((ref) => LOGOS_DECK_DEMO_CRATE.find((t) => t.reference === ref))
    .filter(Boolean) as LogosDeckTrack[];
}

/** Same four modules as ~/Desktop/typeverse/typeverse.py. */
export const TYPEVERSE_SWORD_MODULES = ["KJV", "GNT", "RVG", "SpaRV"] as const;

export type SwordModuleId = (typeof TYPEVERSE_SWORD_MODULES)[number];

export interface SwordVerse {
  reference: string;
  text: string;
}

const BOOKS = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "I Samuel",
  "II Samuel",
  "I Kings",
  "II Kings",
  "I Chronicles",
  "II Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "I Corinthians",
  "II Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "I Thessalonians",
  "II Thessalonians",
  "I Timothy",
  "II Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "I Peter",
  "II Peter",
  "I John",
  "II John",
  "III John",
  "Jude",
  "Revelation of John",
] as const;

const BOOK_ALIAS: Record<string, (typeof BOOKS)[number]> = {
  ps: "Psalms",
  psalm: "Psalms",
  psalms: "Psalms",
  revelation: "Revelation of John",
  rev: "Revelation of John",
  "revelation of john": "Revelation of John",
  "song of songs": "Song of Solomon",
  canticles: "Song of Solomon",
  "song of solomon": "Song of Solomon",
};

for (const name of BOOKS) {
  const parts = name.split(" ");
  const roman = parts[0];
  const digit =
    roman === "I" ? "1" : roman === "II" ? "2" : roman === "III" ? "3" : "";
  if (!digit) continue;
  const rest = parts.slice(1).join(" ");
  BOOK_ALIAS[`${digit} ${rest.toLowerCase()}`] = name;
  BOOK_ALIAS[`${roman.toLowerCase()} ${rest.toLowerCase()}`] = name;
}

/** Authored pairs. A hit is shown only when that verse was actually loaded. */
export const HERMENEUTICAL_LINKS: Record<string, readonly string[]> = {
  "Isaiah 53:5": ["Psalms 22:1", "I Peter 2:24", "Matthew 27:46"],
  "Psalms 22:1": ["Isaiah 53:5", "Matthew 27:46", "Hebrews 12:2"],
  "John 3:16": ["Romans 5:8", "I John 4:9", "Genesis 22:2"],
  "Romans 5:8": ["John 3:16", "Ephesians 2:8", "Isaiah 53:5"],
  "Psalms 23:1": ["John 10:11", "Revelation of John 7:17"],
  "Matthew 27:46": ["Psalms 22:1", "Isaiah 53:5"],
};

export function canonicalBook(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  if (BOOK_ALIAS[key]) return BOOK_ALIAS[key];
  return BOOKS.find((book) => book.toLowerCase() === key) ?? null;
}

/** Structure names from the typeverse KJV module, or null when it does not parse. */
export function canonicalReference(input: string): string | null {
  const match = input.trim().match(/^(.+?)\s+(\d+)\s*:\s*(\d+)$/);
  if (!match) return null;
  const chapter = Number(match[2]);
  const verse = Number(match[3]);
  if (!Number.isInteger(chapter) || !Number.isInteger(verse)) return null;
  if (chapter < 1 || verse < 1) return null;
  const book = canonicalBook(match[1]);
  if (!book) return null;
  return `${book} ${chapter}:${verse}`;
}

export function linksFor(reference: string): string[] {
  const key = canonicalReference(reference);
  if (!key) return [];
  return [...(HERMENEUTICAL_LINKS[key] ?? [])];
}

/** Keep a linked verse only when the SWORD read returned its text. */
export function hermeneuticalSync(
  reference: string,
  loaded: readonly SwordVerse[],
): SwordVerse[] {
  const wanted = linksFor(reference);
  if (!wanted.length) return [];
  const byRef = new Map<string, SwordVerse>();
  for (const row of loaded) {
    const key = canonicalReference(row.reference);
    if (!key || !row.text.trim()) continue;
    byRef.set(key, { reference: key, text: row.text.trim() });
  }
  return wanted.flatMap((target) => {
    const hit = byRef.get(target);
    return hit ? [hit] : [];
  });
}

export function trackFromSword(
  reference: string,
  text: string,
  module: SwordModuleId,
): LogosDeckTrack {
  const canonical = canonicalReference(reference) ?? reference;
  return {
    id: `sword-${module.toLowerCase()}-${canonical.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    reference: canonical,
    text: text.trim(),
    genre: module,
    author: module,
    spm: 0,
    theologicalKey: module,
    crossRefs: linksFor(canonical),
  };
}
