import { describe, expect, it } from "vitest";
import { livePlayerFor } from "@/lib/live-stream";

describe("live stream player", () => {
  it("embeds a YouTube watch link and a Twitch channel", () => {
    const youtube = livePlayerFor("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "bkspc.app");
    expect(youtube.mode).toBe("youtube");
    if (youtube.mode === "youtube") {
      expect(youtube.embedUrl).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    }
    const twitch = livePlayerFor("https://www.twitch.tv/nasa", "bkspc.app");
    expect(twitch.mode).toBe("twitch");
    if (twitch.mode === "twitch") {
      expect(twitch.embedUrl).toContain("channel=nasa");
      expect(twitch.embedUrl).toContain("parent=bkspc.app");
    }
  });

  it("plays a direct campus file and refuses a scrape host", () => {
    const file = livePlayerFor("https://media.example.edu/night.mp4");
    expect(file.mode).toBe("file");
    const scrape = livePlayerFor("https://hianime.at/watch/show");
    expect(scrape.mode).toBe("refuse");
    const zoom = livePlayerFor("https://us02web.zoom.us/j/123");
    expect(zoom.mode).toBe("link");
  });
});
