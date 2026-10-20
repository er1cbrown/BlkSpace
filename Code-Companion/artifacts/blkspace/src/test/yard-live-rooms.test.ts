import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLiveRoom, listLiveRooms } from "@/lib/yard-live-rooms";

vi.mock("@/lib/auth", () => ({
  getCurrentHandle: () => "deviceb",
  createHttpAuthHeader: () => "Nostr test",
}));

describe("yard live rooms", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps the room in this browser when the desk says join first", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          return new Response(
            JSON.stringify({ ok: false, error: "Join the yard first." }),
            { status: 403, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ ok: true, rooms: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const room = await createLiveRoom({
      yardId: "tsu",
      title: "Device B smoke stage",
      kind: "stage",
    });
    const rooms = await listLiveRooms("tsu");
    expect(room.title).toBe("Device B smoke stage");
    expect(rooms.map((r) => r.title)).toContain("Device B smoke stage");
  });

  it("refuses a bad external link instead of saving a local room", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Paste the Discord, Zoom, or YouTube link.",
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }),
    );

    await expect(
      createLiveRoom({
        yardId: "tsu",
        title: "Outside",
        kind: "external",
        externalUrl: "https://example.com/nope",
      }),
    ).rejects.toThrow(/Paste the Discord/);
    expect(await listLiveRooms("tsu")).toEqual([]);
  });
});
