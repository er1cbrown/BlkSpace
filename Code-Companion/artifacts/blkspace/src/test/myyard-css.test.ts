import { describe, expect, it } from "vitest";
import {
  normalizeTape,
  parseMyYardLayout,
  sanitizeCustomCss,
  scopeCustomCss,
  tapeIsPlaylist,
} from "@/lib/myyard-layout";
import { MYYARD_PAGE_TEMPLATES } from "@/lib/myyard-page-templates";
import {
  cssForLazyVimOpen,
  MYYARD_LAZYVIM_STARTER_CSS,
} from "@/lib/myyard-lazyvim-lesson";
import {
  MYYARD_CSS_SNIPPETS,
  MYYARD_PIMP_PACKS,
  appendSnippet,
  applyPimpPack,
} from "@/lib/myyard-pimp";
import { DEFAULT_AESTHETIC } from "@/lib/myyard-layout";

describe("MyYard CSS + templates", () => {
  it("strips script and import", () => {
    const dirty =
      "@import url(https://evil); color: red; expression(alert(1));";
    const out = sanitizeCustomCss(dirty);
    expect(out).not.toMatch(/@import/i);
    expect(out).toMatch(/color:\s*red/);
  });

  it("scopes selectors to the profile root", () => {
    const scoped = scopeCustomCss("h1 { font-size: 2rem; }");
    expect(scoped).toContain(".myyard-root[data-myyard] h1");
  });

  it("wraps declaration-only CSS", () => {
    const scoped = scopeCustomCss("color: #fafafa;");
    expect(scoped).toContain(".myyard-root[data-myyard]");
    expect(scoped).toContain("color: #fafafa;");
  });

  it("ships page templates including pimp packs", () => {
    expect(MYYARD_PAGE_TEMPLATES.map((t) => t.id)).toEqual([
      "campus-wall",
      "myspace-night",
      "threads-clean",
      "portal-neon",
      "tribute-gold",
      "y2k-glitter",
      "cyber-yard",
    ]);
  });

  it("does not scope keyframe percentages onto the profile root", () => {
    const scoped = scopeCustomCss(
      "@keyframes pulse { 0% { opacity: 1; } 100% { opacity: 0.4; } } .myyard-name { animation: pulse 2s infinite; }",
    );
    expect(scoped).toContain("@keyframes pulse");
    expect(scoped).not.toMatch(/myyard-root\[data-myyard\] 0%/);
    expect(scoped).toContain(".myyard-root[data-myyard] .myyard-name");
  });

  it("blocks remote url and svg data urls", () => {
    const out = sanitizeCustomCss(
      "background: url(https://evil.example/track.gif); cursor: url(data:image/svg+xml;utf8,<svg></svg>); color: red;",
    );
    expect(out).not.toMatch(/https:\/\/evil/i);
    expect(out).not.toMatch(/image\/svg/i);
    expect(out).toMatch(/color:\s*red/);
  });

  it("pimp packs and snippets stay look-only and script-free", () => {
    for (const pack of MYYARD_PIMP_PACKS) {
      expect(pack.css).not.toMatch(/javascript:|@import|https?:\/\//i);
      const next = applyPimpPack(DEFAULT_AESTHETIC, pack);
      expect(next.fx).not.toBeUndefined();
      expect(next.pimpPackId).toBe(pack.id);
    }
    let css = "";
    for (const snip of MYYARD_CSS_SNIPPETS) {
      expect(snip.css).not.toMatch(/javascript:|@import|https?:\/\//i);
      css = appendSnippet(css, snip);
    }
    expect(appendSnippet(css, MYYARD_CSS_SNIPPETS[0])).toBe(css);
  });

  it("parses missing pimp fields to safe defaults", () => {
    const layout = parseMyYardLayout(JSON.stringify({ aesthetic: { mood: "hi" } }));
    expect(layout.aesthetic?.fx).toBe("none");
    expect(layout.aesthetic?.cursorPack).toBe("default");
    expect(layout.aesthetic?.marqueeMood).toBe(false);
  });

  it("opens LazyVim with a lesson header when CSS is empty", () => {
    expect(cssForLazyVimOpen("")).toContain("i     type");
    expect(cssForLazyVimOpen("")).toBe(MYYARD_LAZYVIM_STARTER_CSS);
    expect(cssForLazyVimOpen("color: red;")).toBe("color: red;");
  });

  it("only treats 2+ hashes as a playlist", () => {
    expect(normalizeTape(undefined, "lead")).toEqual(["lead"]);
    expect(tapeIsPlaylist(normalizeTape(undefined, "lead"))).toBe(false);
    expect(tapeIsPlaylist(normalizeTape(["a"]))).toBe(false);
    expect(tapeIsPlaylist(normalizeTape(["a", "b"]))).toBe(true);
    expect(normalizeTape(["a", "a", "b"], "z")).toEqual(["a", "b"]);
  });
});
