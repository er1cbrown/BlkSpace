import { describe, expect, it } from "vitest";
import { buildShareText, playShellPath } from "@/lib/share-card";

describe("share-card", () => {
  it("builds post share text with author and path", () => {
    const text = buildShareText({
      kind: "post",
      body: "Booted the shell in 40ms on a 4GB laptop.",
      authorHandle: "rustkid",
      yardId: "tsu",
      path: "/posts/42",
    });
    expect(text).toContain("Booted the shell");
    expect(text).toContain("@rustkid");
    expect(text).toContain("tsu");
    expect(text).toContain("/posts/42");
  });

  it("builds playable share without claiming git host", () => {
    const text = buildShareText({
      kind: "playable",
      title: "WASM demo",
      body: "Try it in the Play shell",
      path: playShellPath("https://example.com/demo/"),
    });
    expect(text).toContain("WASM demo");
    expect(text.toLowerCase()).toContain("not a git forge");
    expect(text).toContain("/play?");
  });

  it("playShellPath encodes url query", () => {
    const p = playShellPath("https://example.com/a b");
    expect(p.startsWith("/play?")).toBe(true);
    expect(p).toContain("url=");
  });
});
