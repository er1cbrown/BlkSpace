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
  const out: LogosDeckTrack[] = [];
  for (const id of ids) {
    const found = LOGOS_DECK_DEMO_CRATE.find(
      (track) => track.id === id || track.reference === id,
    );
    if (found) {
      out.push(found);
      continue;
    }
    const reference = id.trim();
    if (
      /^[A-Za-z0-9][A-Za-z0-9 .:'-]{1,78}$/.test(reference) &&
      /\d+:\d+$/.test(reference)
    ) {
      out.push({
        id: reference,
        reference,
        text: "This row names the passage. The deck does not invent the verse text.",
        genre: "Set",
        author: "",
        spm: 0,
        theologicalKey: "",
        crossRefs: [],
      });
    }
  }
  return out;
}

export function crossRefsFor(track: LogosDeckTrack): LogosDeckTrack[] {
  return track.crossRefs
    .map((ref) => LOGOS_DECK_DEMO_CRATE.find((t) => t.reference === ref))
    .filter(Boolean) as LogosDeckTrack[];
}
