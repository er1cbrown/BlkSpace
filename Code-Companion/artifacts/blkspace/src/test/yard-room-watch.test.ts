import { describe, expect, it } from "vitest";
import {
  encodeWatchTicket,
  parseWatchSource,
  type WatchTicket,
} from "@/lib/yard-room-watch";

describe("parseWatchSource", () => {
  it("accepts localhost Jellyfin", () => {
    const r = parseWatchSource(
      "http://127.0.0.1:8096/web/index.html#!/details?id=abc-123",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ticket.kind).toBe("jellyfin");
      expect(r.ticket.origin).toBe("http://127.0.0.1:8096");
      expect(r.ticket.itemId).toBe("abc-123");
    }
  });

  it("accepts an allowlisted HTTPS Jellyfin origin", () => {
    const r = parseWatchSource("https://media.campus.example/Items/deadbeef", {
      jellyfinOrigins: ["https://media.campus.example"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ticket.kind).toBe("jellyfin");
      expect(r.ticket.itemId).toBe("deadbeef");
    }
  });

  it("refuses HiAnime / Megaplay scrape hosts", () => {
    const a = parseWatchSource("https://hianime.at/watch/tokyo-ghoul-890");
    const b = parseWatchSource("https://megap.akirax.buzz/index-f1-v1-a1.m3u8");
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
    if (!a.ok) expect(a.reason).toMatch(/scrape/i);
  });

  it("refuses bare third-party HLS", () => {
    const r = parseWatchSource("https://cdn.example.com/ep3.m3u8");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/HLS/i);
  });

  it("refuses unknown HTTPS as Jellyfin", () => {
    const r = parseWatchSource(
      "https://random.example/web/index.html#!/details?id=1",
    );
    expect(r.ok).toBe(false);
  });

  it("round-trips an iroh media ticket", () => {
    const ticket: WatchTicket = {
      v: 1,
      kind: "iroh",
      title: "club short",
      ticket: "blkspace1.abc",
      mime: "video/mp4",
    };
    const encoded = encodeWatchTicket(ticket);
    const r = parseWatchSource(encoded);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ticket.kind).toBe("iroh");
      expect(r.ticket.mime).toBe("video/mp4");
      expect(r.ticket.ticket).toBe("blkspace1.abc");
    }
  });

  it("refuses iroh tickets that are not video/audio", () => {
    const encoded = encodeWatchTicket({
      v: 1,
      kind: "iroh",
      ticket: "blkspace1.abc",
      mime: "application/pdf",
    });
    const r = parseWatchSource(encoded);
    expect(r.ok).toBe(false);
  });

  it("accepts syncplay.pl", () => {
    const r = parseWatchSource("https://syncplay.pl:8999");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ticket.kind).toBe("syncplay");
  });
});
