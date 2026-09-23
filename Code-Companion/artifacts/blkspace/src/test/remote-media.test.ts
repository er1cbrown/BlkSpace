import { describe, expect, it } from "vitest";
import { isRemoteMediaUrl, isStreamUrl } from "@/lib/remote-media";

describe("hosted media urls", () => {
  it("treats R2 and Stream links as phone-ready media", () => {
    expect(isRemoteMediaUrl("https://pub-abc.r2.dev/portfolio/a.jpg")).toBe(true);
    expect(isRemoteMediaUrl("web_abc")).toBe(false);
    expect(isStreamUrl("https://iframe.videodelivery.net/uid")).toBe(true);
    expect(isStreamUrl("https://pub-abc.r2.dev/a.jpg")).toBe(false);
  });
});
