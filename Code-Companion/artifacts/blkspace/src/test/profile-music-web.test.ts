import { beforeEach, describe, expect, it } from "vitest";
import {
  appendWebProfileTrack,
  clearWebProfileMusic,
  loadWebProfileMusic,
  loadWebProfileTape,
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

  it("appends a tape only after a second track", () => {
    saveWebProfileMusic("jimmy", {
      trackName: "A",
      dataUrl: "data:audio/mpeg;base64,AAA",
    });
    expect(loadWebProfileTape("jimmy")).toHaveLength(1);
    const tape = appendWebProfileTrack("jimmy", {
      trackName: "B",
      dataUrl: "data:audio/mpeg;base64,BBB",
    });
    expect(tape).toHaveLength(2);
    expect(loadWebProfileTape("jimmy").map((t) => t.trackName)).toEqual([
      "A",
      "B",
    ]);
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
