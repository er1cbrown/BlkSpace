import { describe, it, expect, beforeEach } from "vitest";
import {
  applyUiPrefsToDocument,
  normalizeUiPrefs,
  DEFAULT_UI_PREFS,
  isTauriRuntime,
} from "@/lib/ui-prefs";

describe("terminal chrome skin", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-chrome");
    document.documentElement.classList.remove("dark");
    delete (window as Window & { __TAURI_INTERNALS__?: unknown })
      .__TAURI_INTERNALS__;
  });

  it("defaults to social chrome", () => {
    expect(normalizeUiPrefs({}).chromeSkin).toBe("default");
    expect(DEFAULT_UI_PREFS.chromeSkin).toBe("default");
  });

  it("does not paint terminal chrome on web", () => {
    expect(isTauriRuntime()).toBe(false);
    applyUiPrefsToDocument(normalizeUiPrefs({ chromeSkin: "terminal" }));
    expect(document.documentElement.dataset.chrome).toBe("default");
  });

  it("applies terminal chrome when Tauri internals exist", () => {
    (window as Window & { __TAURI_INTERNALS__: object }).__TAURI_INTERNALS__ =
      {};
    applyUiPrefsToDocument(normalizeUiPrefs({ chromeSkin: "terminal" }));
    expect(document.documentElement.dataset.chrome).toBe("terminal");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
