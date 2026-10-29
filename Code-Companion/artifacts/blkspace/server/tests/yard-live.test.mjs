import { describe, expect, test } from "bun:test";
import { createYardLive } from "../yard-live.mjs";

const offer = "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n";
const answer = "v=0\r\no=- 2 1 IN IP4 127.0.0.1\r\n";
const candidate = JSON.stringify({
  candidate: "candidate:1 1 udp 1 127.0.0.1 9 typ host",
  sdpMid: "0",
});

describe("yard camera live", () => {
  test("a second member can join the host camera", () => {
    const live = createYardLive();
    const session = live.start(
      { yardId: "tsu", title: "Homecoming camera", handle: "host" },
      "pubkey-host",
    );
    const viewer = live.join(
      { sessionId: session.id, handle: "guest" },
      "pubkey-guest",
    );
    live.offer(
      { sessionId: session.id, viewerId: viewer.id, sdp: offer },
      "pubkey-host",
    );
    live.answer(
      { sessionId: session.id, viewerId: viewer.id, sdp: answer },
      "pubkey-guest",
    );
    live.candidate(
      {
        sessionId: session.id,
        viewerId: viewer.id,
        from: "host",
        candidate,
      },
      "pubkey-host",
    );

    const seen = live.read(session.id);
    expect(seen.hostHandle).toBe("host");
    expect(seen.viewers).toHaveLength(1);
    expect(seen.viewers[0].offer).toBe(offer.trim());
    expect(seen.viewers[0].answer).toBe(answer.trim());
    expect(seen.viewers[0].hostCandidates).toEqual([candidate]);
    expect(live.list("tsu").map((row) => row.id)).toContain(session.id);
  });

  test("a guest cannot offer or end the camera", () => {
    const live = createYardLive();
    const session = live.start({ yardId: "tsu", title: "Lab", handle: "host" }, "host");
    const viewer = live.join({ sessionId: session.id, handle: "guest" }, "guest");
    expect(() =>
      live.offer(
        { sessionId: session.id, viewerId: viewer.id, sdp: offer },
        "guest",
      ),
    ).toThrow(/Only the camera host/);
    expect(() => live.end({ sessionId: session.id }, "guest")).toThrow(
      /Only the camera host/,
    );
    live.end({ sessionId: session.id }, "host");
    expect(() => live.read(session.id)).toThrow(/ended/);
  });

  test("rejects a note that is not a session description", () => {
    const live = createYardLive();
    const session = live.start({ yardId: "tsu", title: "Lab", handle: "host" }, "host");
    const viewer = live.join({ sessionId: session.id, handle: "guest" }, "guest");
    expect(() =>
      live.offer(
        { sessionId: session.id, viewerId: viewer.id, sdp: "not-sdp" },
        "host",
      ),
    ).toThrow(/session description/);
  });
});
