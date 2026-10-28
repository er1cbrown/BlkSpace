import { describe, expect, it } from "vitest";
import { followPosition } from "@/lib/watch-together";
import { parseWatchSource } from "@/lib/yard-room-watch";

describe("watch together", () => {
  it("follows a playing host and holds a paused playhead", () => {
    const playing = followPosition(
      { positionMs: 1000, playing: true, updatedAt: "2026-10-28T12:00:00.000Z" },
      Date.parse("2026-10-28T12:00:02.500Z"),
    );
    expect(playing).toBe(3500);
    expect(
      followPosition(
        { positionMs: 1000, playing: false, updatedAt: "2026-10-28T12:00:00.000Z" },
        Date.parse("2026-10-28T12:00:09.000Z"),
      ),
    ).toBe(1000);
  });

  it("keeps a direct library file as the shared play url", () => {
    const parsed = parseWatchSource("http://127.0.0.1:8096/Videos/clip.mp4");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.ticket.playUrl).toContain("clip.mp4");
  });
});
