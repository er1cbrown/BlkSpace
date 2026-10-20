import { describe, expect, it } from "vitest";
import {
  LOGOS_DECK_DEMO_CRATE,
  crossRefsFor,
  tracksByIds,
} from "@/lib/logos-deck-library";
import { DEFAULT_MYYARD_LAYOUT } from "@/lib/myyard-layout";

/**
 * DevOps gate for LogosDecks while the feature is unimplemented.
 * See docs/implementation/LOGOS_DECKS.md.
 * Update this file in the same change that replaces the demo crate.
 */
describe("logos decks (unfinished)", () => {
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
});
