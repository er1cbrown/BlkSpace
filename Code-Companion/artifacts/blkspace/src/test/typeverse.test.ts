import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  accuracyPct,
  bumpStreak,
  correctCount,
  dailyIndex,
  foldKeys,
  parseCorpus,
  pickIndex,
  previousYmd,
  readMode,
  readModule,
  readStreak,
  verseRef,
  wordsPerMinute,
} from "@/lib/typeverse";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../public/typeverse",
);

describe("typeverse", () => {
  it("folds curly quotes and dashes to keyboard characters", () => {
    expect(foldKeys("\u201cGod\u2019s\u201d word\u2014now")).toBe(
      '"God\'s" word-now',
    );
    expect(foldKeys("¿listo? ¡sí!")).toBe("?listo? !sí!");
  });

  it("parses a corpus and skips comments", () => {
    const verses = parseCorpus(
      "# note\n\nJohn\t3\t16\tFor God so loved the world.\nbad line\n",
    );
    expect(verses).toEqual([
      {
        book: "John",
        chapter: 3,
        verse: 16,
        text: "For God so loved the world.",
      },
    ]);
    expect(verseRef(verses[0])).toBe("John 3:16");
  });

  it("scores wpm and accuracy the monkeytype way", () => {
    expect(wordsPerMinute(0, 0)).toBe(0);
    expect(wordsPerMinute(5, 60_000)).toBe(1);
    expect(wordsPerMinute(50, 60_000)).toBe(10);
    expect(accuracyPct(0, 0)).toBe(100);
    expect(accuracyPct(9, 10)).toBe(90);
    expect(correctCount("For", "Far")).toBe(2);
  });

  it("keeps a daily streak only across consecutive days", () => {
    expect(previousYmd("2026-10-20")).toBe("2026-10-19");
    expect(previousYmd("2026-03-01")).toBe("2026-02-28");
    const first = bumpStreak(
      { count: 0, last: "" },
      "2026-10-20",
      "2026-10-19",
    );
    expect(first).toEqual({ count: 1, last: "2026-10-20" });
    expect(bumpStreak(first, "2026-10-20", "2026-10-19")).toBe(first);
    expect(bumpStreak(first, "2026-10-21", "2026-10-20")).toEqual({
      count: 2,
      last: "2026-10-21",
    });
    expect(bumpStreak(first, "2026-10-25", "2026-10-24")).toEqual({
      count: 1,
      last: "2026-10-25",
    });
    expect(readStreak("nope")).toEqual({ count: 0, last: "" });
    expect(readStreak('{"count":4,"last":"2026-10-20"}').count).toBe(4);
  });

  it("seeds the verse of the day from the date and module", async () => {
    expect(await dailyIndex("2026-10-20", "KJV", 1000)).toBe(618);
    expect(await dailyIndex("2026-10-20", "KJV", 1000)).toBe(618);
    expect(await dailyIndex("2026-10-21", "KJV", 1000)).not.toBe(618);
    expect(pickIndex(10, () => 0)).toBe(0);
    expect(pickIndex(10, () => 0.99)).toBe(9);
  });

  it("reads saved module and mode", () => {
    expect(readModule("sparv")).toBe("sparv");
    expect(readModule("GNT")).toBe("kjv");
    expect(readMode("daily")).toBe("daily");
    expect(readMode("random")).toBe("random");
  });

  it("ships typeable KJV and Reina-Valera 1909 verses", () => {
    const kjv = parseCorpus(
      gunzipSync(readFileSync(path.join(root, "kjv.tsv.gz"))).toString("utf8"),
    );
    const sparv = parseCorpus(
      gunzipSync(readFileSync(path.join(root, "sparv.tsv.gz"))).toString(
        "utf8",
      ),
    );
    expect(kjv.length).toBeGreaterThan(20_000);
    expect(sparv.length).toBeGreaterThan(20_000);
    const john = kjv.find(
      (v) => v.book === "John" && v.chapter === 3 && v.verse === 16,
    );
    expect(john?.text.startsWith("For God so loved")).toBe(true);
    const juan = sparv.find(
      (v) => v.book === "John" && v.chapter === 3 && v.verse === 16,
    );
    expect(juan?.text.toLowerCase().includes("dios")).toBe(true);
    expect(kjv.every((v) => v.text.length >= 24)).toBe(true);
    expect(sparv.every((v) => !v.text.includes("\t"))).toBe(true);
  });
});
