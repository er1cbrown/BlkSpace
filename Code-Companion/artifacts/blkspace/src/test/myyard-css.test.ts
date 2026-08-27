import { describe, expect, it } from "vitest";
import { sanitizeCustomCss, scopeCustomCss } from "@/lib/myyard-layout";
import { MYYARD_PAGE_TEMPLATES } from "@/lib/myyard-page-templates";
import {
  cssForLazyVimOpen,
  MYYARD_LAZYVIM_STARTER_CSS,
} from "@/lib/myyard-lazyvim-lesson";

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

  it("ships four page templates", () => {
    expect(MYYARD_PAGE_TEMPLATES.map((t) => t.id)).toEqual([
      "campus-wall",
      "myspace-night",
      "threads-clean",
      "portal-neon",
      "tribute-gold",
    ]);
  });

  it("opens LazyVim with a lesson header when CSS is empty", () => {
    expect(cssForLazyVimOpen("")).toContain("i     type");
    expect(cssForLazyVimOpen("")).toBe(MYYARD_LAZYVIM_STARTER_CSS);
    expect(cssForLazyVimOpen("color: red;")).toBe("color: red;");
  });
});
