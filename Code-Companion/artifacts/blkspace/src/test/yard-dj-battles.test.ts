import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishMixtape, verseTrackSrc } from "@/lib/audio-mixtapes";
import {
  battleCallUrl,
  hostBattle,
  listBattles,
  syncBattles,
} from "@/lib/yard-dj-battles";

vi.mock("@/lib/auth", () => ({
  getCurrentHandle: () => "dj_yard",
  getCurrentDisplayName: () => "DJ Yard",
  createHttpAuthHeader: () => {
    throw new Error("Sign in again");
  },
}));

describe("yard dj battles", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens a lobby around a published Logos Deck", () => {
    const deck = publishMixtape({
      title: "Servant set",
      setKind: "logos",
      tracks: [
        { id: "v1", title: "Isaiah 53:5", src: verseTrackSrc("Isaiah 53:5") },
      ],
    });
    const battle = hostBattle({
      title: "Chapel battle",
      mixtape: deck,
      callUrl: "https://discord.gg/yard",
    });
    expect(listBattles("tsu").map((row) => row.title)).toEqual([
      "Chapel battle",
    ]);
    expect(battle.setKind).toBe("logos");
    expect(battleCallUrl(battle)).toBe("https://discord.gg/yard");
    expect(() =>
      hostBattle({
        title: "Nope",
        mixtape: deck,
        callUrl: "https://evil.example/steal",
      }),
    ).toThrow(/Discord, Slack/);
  });

  it("copies a shared lobby into this browser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            battles: [
              {
                id: "battle_remote_1",
                yardId: "tsu",
                title: "Lawn battle",
                mixId: "mix_friday_1",
                mixTitle: "Friday lawn",
                setKind: "songs",
                callUrl: "",
                jitsiSlug: "BkspcBattleremote1",
                hostHandle: "ada",
                createdAt: "2026-10-20T00:00:00.000Z",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );
    await syncBattles("tsu");
    expect(listBattles("tsu")[0]?.title).toBe("Lawn battle");
    expect(battleCallUrl(listBattles("tsu")[0]!)).toContain("meet.jit.si");
  });
});
