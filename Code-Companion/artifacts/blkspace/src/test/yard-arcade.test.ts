import { describe, expect, it } from "vitest";
import {
  arcadeScopeLine,
  isArcadeItem,
  parseArcadeSize,
  sizeMeta,
  YARD_ARCADE_NAME,
} from "@/lib/yard-arcade";
import type { HubItem } from "@/lib/content-hub";

function item(partial: Partial<HubItem>): HubItem {
  return {
    id: "t1",
    topic: "gaming",
    kind: "playable",
    title: "Test",
    body: "",
    mediaUrl: "https://example.com/game/",
    authorHandle: "dev",
    authorDisplayName: "Dev",
    yardId: "tsu",
    createdAt: new Date().toISOString(),
    earnHint: "",
    ...partial,
  };
}

describe("yard-arcade", () => {
  it("names the vertical Yard Arcade", () => {
    expect(YARD_ARCADE_NAME).toBe("Yard Arcade");
  });

  it("treats playable as arcade", () => {
    expect(isArcadeItem(item({ kind: "playable" }))).toBe(true);
  });

  it("rejects non-play posts without media", () => {
    expect(
      isArcadeItem(
        item({ kind: "post", topic: "culture", mediaUrl: "" }),
      ),
    ).toBe(false);
  });

  it("parses size tags", () => {
    expect(parseArcadeSize(item({ body: "hi [[size:micro]]" }))).toBe("micro");
    expect(parseArcadeSize(item({ body: "[[size:full]]" }))).toBe("full");
    expect(parseArcadeSize(item({ body: "plain" }))).toBe("tier0");
  });

  it("scope line rejects Steam claim", () => {
    const line = arcadeScopeLine().toLowerCase();
    expect(line).toContain("not steam");
    expect(line).toContain("not roblox");
  });

  it("size meta has tier0", () => {
    expect(sizeMeta("tier0").softMaxMb).toBeGreaterThan(0);
  });
});
