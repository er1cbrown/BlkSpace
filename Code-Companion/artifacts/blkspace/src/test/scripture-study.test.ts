import { describe, expect, it } from "vitest";
import {
  LOGOS_DECK_DEMO_CRATE,
  UNLISTED_PASSAGE,
} from "@/lib/logos-deck-library";
import {
  noteOverlap,
  readScriptureNote,
  SCRIPTURE_TAGS,
  studyPassage,
  writeScriptureNote,
} from "@/lib/scripture-study";

describe("scripture study", () => {
  it("opens a shelf verse and only the cross-refs that are on the shelf", () => {
    const john = studyPassage("john 3:16");
    expect(john.onShelf).toBe(true);
    expect(john.reference).toBe("John 3:16");
    expect(john.text).toMatch(/God so loved the world/);
    expect(john.links.map((link) => link.reference)).toEqual(["Romans 5:8"]);
    expect(john.links[0].shared).toEqual(["god"]);
    expect(john.tags).toEqual(SCRIPTURE_TAGS);
    expect(john.text).not.toMatch(/bismillah|dhammapada/i);

    const lament = studyPassage("Psalm 22:1");
    const matthew = lament.links.find(
      (link) => link.reference === "Matthew 27:46",
    );
    expect(matthew?.shared).toEqual(["god", "why", "hast", "forsaken"]);
  });

  it("names an unlisted passage and does not write the verse", () => {
    const row = studyPassage("Surah 1:1");
    expect(row.onShelf).toBe(false);
    expect(row.text).toBe(UNLISTED_PASSAGE);
    expect(row.links).toEqual([]);
    expect(row.text).not.toMatch(/bismillah|fatiha|allah/i);
  });

  it("keeps tradition as a label so the same words share the same overlap", () => {
    const shelf = studyPassage("John 3:16");
    const hosted = "God loved the world in this line.";
    const bible = noteOverlap("Bible", hosted, shelf);
    const quran = noteOverlap("Quran", hosted, shelf);
    expect(bible.shared).toEqual(quran.shared);
    expect(bible.shared).toContain("god");
    expect(quran.tradition).toBe("Quran");
    expect(noteOverlap("Buddhist", "", shelf).shared).toEqual([]);
    expect(
      noteOverlap("Esoteric", hosted, studyPassage("Dhammapada 1")).shared,
    ).toEqual([]);
  });

  it("keeps one note per handle on this browser", () => {
    localStorage.clear();
    const long = "word ".repeat(5000);
    const saved = writeScriptureNote("nova", {
      passage: "John 3:16",
      tradition: "Bible",
      text: long,
    });
    expect(saved.text.length).toBe(4000);
    expect(readScriptureNote("nova")?.passage).toBe("John 3:16");
    expect(readScriptureNote("other")).toBeNull();
    expect(LOGOS_DECK_DEMO_CRATE).toHaveLength(6);
  });
});
