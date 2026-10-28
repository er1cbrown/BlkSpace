import { describe, expect, it } from "vitest";
import {
  setInlineSound,
  shouldInlinePlay,
  streamPlayerSrc,
  inlineSoundOn,
} from "@/lib/inline-video";

describe("inline video playback", () => {
  it("plays a timeline card on screen and a snapped watch card", () => {
    expect(shouldInlinePlay({ mode: "inline", visible: true, active: false })).toBe(true);
    expect(shouldInlinePlay({ mode: "inline", visible: false, active: true })).toBe(false);
    expect(shouldInlinePlay({ mode: "poster", visible: true, active: true })).toBe(false);
    expect(shouldInlinePlay({ mode: "stage", visible: false, active: true })).toBe(true);
    expect(shouldInlinePlay({ mode: "stage", visible: true, active: false })).toBe(false);
  });

  it("keeps a hosted clip muted until sound is turned on", () => {
    setInlineSound(false);
    const quiet = streamPlayerSrc("https://iframe.videodelivery.net/clip1", inlineSoundOn());
    expect(quiet).toContain("autoplay=true");
    expect(quiet).toContain("muted=true");
    setInlineSound(true);
    const loud = streamPlayerSrc("https://iframe.videodelivery.net/clip1", inlineSoundOn());
    expect(loud).toContain("muted=false");
    setInlineSound(false);
  });
});
