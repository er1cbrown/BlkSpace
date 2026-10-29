import { describe, expect, it } from "vitest";
import { liveSdpOk, LIVE_SDP_MAX } from "@/lib/yard-live-ingest";

describe("yard camera live notes", () => {
  it("accepts a session description and rejects a page link", () => {
    expect(liveSdpOk("v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n")).toBe(true);
    expect(liveSdpOk("https://twitch.tv/nasa")).toBe(false);
    expect(liveSdpOk(`v=0${"x".repeat(LIVE_SDP_MAX)}`)).toBe(false);
  });
});
