import { beforeEach, describe, expect, it } from "vitest";
import {
  clearWebProfileMusic,
  loadWebProfileMusic,
  saveWebProfileMusic,
} from "@/lib/profile-music-web";

describe("profile-music-web", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads a data-url track", () => {
    const rec = saveWebProfileMusic("jimmy", {
      trackName: "Yard Anthem",
      dataUrl: "data:audio/mpeg;base64,AAA",
    });
    expect(rec.id.startsWith("webmusic_")).toBe(true);
    const loaded = loadWebProfileMusic("jimmy");
    expect(loaded?.trackName).toBe("Yard Anthem");
    expect(loaded?.dataUrl).toContain("audio/mpeg");
  });

  it("clears music for a handle", () => {
    saveWebProfileMusic("jimmy", {
      trackName: "x",
      dataUrl: "data:audio/mpeg;base64,AAA",
    });
    clearWebProfileMusic("jimmy");
    expect(loadWebProfileMusic("jimmy")).toBeNull();
  });
});
