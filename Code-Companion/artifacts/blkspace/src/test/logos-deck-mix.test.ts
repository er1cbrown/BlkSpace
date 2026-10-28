import { describe, expect, it } from "vitest";
import { verseTrackSrc, type AudioMixtape } from "@/lib/audio-mixtapes";
import { LOGOS_DECK_DEMO_CRATE } from "@/lib/logos-deck-library";
import {
  bookLoad,
  callRound,
  canShapeAudio,
  crossfaderVolumes,
  cuesFromMixtape,
  HOSTED_READING,
  hotCueSeconds,
  lensEffect,
  logosDeckBattlePath,
  logosDeckMixPath,
  readRound,
  roundLead,
  scriptureLoads,
  writeRound,
} from "@/lib/logos-deck-mix";

function tape(
  tracks: AudioMixtape["tracks"],
  setKind: AudioMixtape["setKind"] = "songs",
): AudioMixtape {
  return {
    id: "mix_room",
    title: "Room",
    body: "",
    tracks,
    authorHandle: "nova",
    authorDisplayName: "Nova",
    yardId: "tsu",
    createdAt: "2026-10-28T00:00:00.000Z",
    setKind,
    priceWb: 0,
    editionSize: 1,
    cover: "",
    credits: "",
    format: "mixtape",
    visibility: "yard",
    storeUrl: "",
    writeReceipt: false,
    rightsAttested: false,
    splits: [{ handle: "nova", percent: 95 }],
    masterId: "",
    label: "Bermuda Boyz Records",
    listingId: null,
    hubItemId: null,
  };
}

describe("logos deck mix", () => {
  it("equal-powers the crossfader", () => {
    expect(crossfaderVolumes(0)).toEqual({ a: 1, b: 0 });
    expect(crossfaderVolumes(100).a).toBeCloseTo(0, 8);
    expect(crossfaderVolumes(100).b).toBeCloseTo(1, 8);
    const mid = crossfaderVolumes(50);
    expect(mid.a).toBeCloseTo(mid.b, 8);
    expect(mid.a).toBeCloseTo(Math.SQRT1_2, 8);
    expect(crossfaderVolumes(200)).toEqual(crossfaderVolumes(100));
    expect(crossfaderVolumes(Number.NaN)).toEqual(crossfaderVolumes(50));
  });

  it("places eight hot cues across the file", () => {
    expect(hotCueSeconds(80, 0)).toBe(0);
    expect(hotCueSeconds(80, 1)).toBe(10);
    expect(hotCueSeconds(80, 7)).toBe(70);
    expect(hotCueSeconds(80, 9)).toBe(70);
    expect(hotCueSeconds(80, 1.9)).toBe(10);
    expect(hotCueSeconds(0, 3)).toBe(0);
    expect(hotCueSeconds(Number.NaN, 3)).toBe(0);
  });

  it("keeps filter numbers for a device file only", () => {
    expect(lensEffect("nope").name).toBe("flat");
    expect(lensEffect("law").lowpassHz).toBe(900);
    expect(lensEffect("echo")).toMatchObject({ delaySec: 0.28, wet: 0.35 });
    expect(canShapeAudio("data:audio/mpeg;base64,AA")).toBe(true);
    expect(canShapeAudio("blob:http://localhost/1")).toBe(true);
    expect(canShapeAudio("https://cdn.example/a.mp3")).toBe(false);
    expect(canShapeAudio("")).toBe(false);
  });

  it("loads a record as audio and a passage as text", () => {
    const cues = cuesFromMixtape(
      tape([
        {
          id: "t1",
          title: "Lawn cut",
          src: "https://cdn.example/lawn.mp3",
        },
        {
          id: "t2",
          title: "Isaiah 53:5",
          src: verseTrackSrc("Isaiah 53:5"),
        },
        {
          id: "t3",
          title: "Obadiah 1:1",
          src: "verse:Obadiah 1:1",
        },
      ]),
    );
    expect(cues[0]).toMatchObject({
      title: "Lawn cut",
      playable: true,
      src: "https://cdn.example/lawn.mp3",
      authorHandle: "nova",
    });
    expect(cues[0].lane).toBe("track");
    expect(cues[1]).toMatchObject({
      playable: false,
      src: "",
      passage: "Isaiah 53:5",
      text: LOGOS_DECK_DEMO_CRATE[0].text,
      lane: "book",
      tradition: "Bible",
    });
    expect(cues[2].text).toMatch(/does not invent/);
    expect(cues[2].playable).toBe(false);
  });

  it("ships the six-verse crate and the channel paths", () => {
    const scripture = scriptureLoads();
    expect(scripture).toHaveLength(6);
    expect(scripture.every((row) => !row.playable && row.text.length > 0)).toBe(
      true,
    );
    expect(
      scripture.every(
        (row) => row.lane === "book" && row.tradition === "Bible",
      ),
    ).toBe(true);
    expect(scripture.map((row) => row.passage)).toContain("John 3:16");
    expect(logosDeckBattlePath("battle a")).toBe(
      "/logosdecks?battle=battle%20a",
    );
    expect(logosDeckMixPath("mix_room")).toBe("/logosdecks?mix=mix_room");
  });

  it("holds a named reading and calls the round", () => {
    localStorage.clear();
    const named = bookLoad({ tradition: "Quran", title: "Opening" });
    expect(named.lane).toBe("book");
    expect(named.tradition).toBe("Quran");
    expect(named.text).toBe(HOSTED_READING);
    expect(named.text).not.toMatch(/bismillah|fatiha/i);
    const hosted = bookLoad({
      tradition: "Other",
      title: "Night watch",
      text: "The line the member hosted.",
    });
    expect(hosted.text).toBe("The line the member hosted.");
    expect(() => bookLoad({ tradition: "Bible", title: "  " })).toThrow(
      /Name the reading/,
    );

    expect(roundLead(callRound({ a: 0, b: 0 }, "b"))).toBe("b");
    writeRound("battle_1", callRound({ a: 1, b: 0 }, "a"));
    expect(readRound("battle_1")).toEqual({ a: 2, b: 0 });
    expect(roundLead(readRound("battle_1"))).toBe("a");
  });
});
