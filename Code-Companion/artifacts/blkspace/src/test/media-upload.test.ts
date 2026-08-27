import { describe, expect, it } from "vitest";
import {
  MEDIA_ACCEPT_VIDEO,
  MAX_VIDEOS_PER_POST,
  mediaKindFromFile,
  isAllowedUpload,
} from "@/lib/media-upload";

describe("twitter-style video attach", () => {
  it("treats mp4/mov/webm as video", () => {
    expect(mediaKindFromFile({ name: "clip.mp4", type: "video/mp4" })).toBe(
      "video",
    );
    expect(mediaKindFromFile({ name: "clip.MOV", type: "" })).toBe("video");
    expect(mediaKindFromFile({ name: "x.webm", type: "video/webm" })).toBe(
      "video",
    );
  });

  it("one video per wall post (X-style)", () => {
    expect(MAX_VIDEOS_PER_POST).toBe(1);
    expect(MEDIA_ACCEPT_VIDEO).toMatch(/video\/mp4/);
  });

  it("rejects oversized video over 50MB", () => {
    const file = new File(["x"], "big.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 51 * 1024 * 1024 });
    const check = isAllowedUpload(file);
    expect(check.ok).toBe(false);
  });
});
