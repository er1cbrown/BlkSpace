import { describe, expect, it } from "vitest";
import {
  LOGOS_DECK_DEMO_CRATE,
  TYPEVERSE_SWORD_MODULES,
  canonicalReference,
  crossRefsFor,
  hermeneuticalSync,
  tracksByIds,
} from "@/lib/logos-deck-library";
import { DEFAULT_MYYARD_LAYOUT } from "@/lib/myyard-layout";

/**
 * Slice 1 gate. The demo crate is not a Bible. Sync may only return a verse
 * whose text the typeverse SWORD read actually returned.
 * See docs/implementation/LOGOS_DECKS.md.
 */
describe("logos decks", () => {
  it("ships only the six-verse demo crate", () => {
    expect(LOGOS_DECK_DEMO_CRATE.map((track) => track.id)).toEqual([
      "isa53-5",
      "ps22-1",
      "jn3-16",
      "rom5-8",
      "ps23-1",
      "mt27-46",
    ]);
  });

  it("resolves cross-references only when the other verse is in the crate", () => {
    const isaiah = LOGOS_DECK_DEMO_CRATE.find(
      (track) => track.id === "isa53-5",
    );
    expect(isaiah).toBeTruthy();
    expect(
      crossRefsFor(isaiah!)
        .map((track) => track.reference)
        .sort(),
    ).toEqual(["Matthew 27:46", "Psalm 22:1"]);
  });

  it("drops track ids the crate does not contain", () => {
    expect(
      tracksByIds(["jn3-16", "not-a-verse"]).map((track) => track.id),
    ).toEqual(["jn3-16"]);
  });

  it("keeps the profile module off with no audio and no set", () => {
    expect(DEFAULT_MYYARD_LAYOUT.modules.logosDeck).toBe(false);
    expect(DEFAULT_MYYARD_LAYOUT.logosDeck).toEqual({
      setTitle: "Sermon set",
      audioHash: null,
      trackIds: [],
    });
  });

  it("reads the four typeverse SWORD modules", () => {
    expect([...TYPEVERSE_SWORD_MODULES]).toEqual([
      "KJV",
      "GNT",
      "RVG",
      "SpaRV",
    ]);
  });

  it("names a verse the way the SWORD library does", () => {
    expect(canonicalReference("Psalm 22:1")).toBe("Psalms 22:1");
    expect(canonicalReference("1 Peter 2:24")).toBe("I Peter 2:24");
    expect(canonicalReference("Revelation 7:17")).toBe(
      "Revelation of John 7:17",
    );
    expect(canonicalReference("not a verse")).toBeNull();
  });

  it("returns a cross-reference only when that verse was loaded", () => {
    const loaded = [
      {
        reference: "Psalms 22:1",
        text: "My God, my God, why hast thou forsaken me?",
      },
      {
        reference: "Matthew 27:46",
        text: "And about the ninth hour Jesus cried with a loud voice",
      },
      { reference: "I Peter 2:24", text: "   " },
    ];
    expect(
      hermeneuticalSync("Isaiah 53:5", loaded).map((row) => row.reference),
    ).toEqual(["Psalms 22:1", "Matthew 27:46"]);
    expect(
      hermeneuticalSync("Isaiah 53:5", [
        { reference: "John 3:16", text: "For God so loved the world" },
      ]),
    ).toEqual([]);
  });
});
