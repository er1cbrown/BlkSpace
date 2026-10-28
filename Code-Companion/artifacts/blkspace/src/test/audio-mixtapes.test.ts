import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  audioFileOk,
  coverFileOk,
  coverSrcOk,
  listMixtapes,
  mixtapeListingArgs,
  mixtapeRef,
  parseMixtapeRef,
  holdLogosEdition,
  publishMixtape,
  syncMixtapes,
  trackSrcOk,
  verseTrackSrc,
} from "@/lib/audio-mixtapes";
import { listHubItems } from "@/lib/content-hub";
import { tracksByIds } from "@/lib/logos-deck-library";
import { mergeMarketplaceBoards } from "@/lib/marketplace-escrow";
import { loadLocalMyYard } from "@/lib/myyard-storage";

vi.mock("@/lib/auth", () => ({
  getCurrentHandle: () => "dj_yard",
  getCurrentDisplayName: () => "DJ Yard",
}));

describe("audio mixtapes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("rejects a non-audio file and an oversized upload", () => {
    expect(
      audioFileOk({ type: "text/plain", name: "notes.txt", size: 20 }),
    ).toMatch(/audio file/);
    expect(
      audioFileOk({
        type: "audio/mpeg",
        name: "set.mp3",
        size: 9 * 1024 * 1024,
      }),
    ).toMatch(/8 MB/);
    expect(
      audioFileOk({ type: "audio/mpeg", name: "set.mp3", size: 1000 }),
    ).toBe(null);
    expect(
      coverFileOk({ type: "image/png", name: "front.png", size: 1000 }),
    ).toBe(null);
    expect(coverSrcOk("https://media.example.test/front.jpg")).toBe(true);
    expect(coverSrcOk("data:image/png;base64,aaaa")).toBe(false);
  });

  it("accepts a blob id or https link and refuses a data url", () => {
    expect(trackSrcOk("web_abc123")).toBe(true);
    expect(trackSrcOk("https://media.example.test/set.mp3")).toBe(true);
    expect(trackSrcOk("data:audio/mpeg;base64,AAA")).toBe(false);
    expect(trackSrcOk(verseTrackSrc("Isaiah 53:5"))).toBe(true);
  });

  it("publishes a Logos Deck as an off-chain edition", () => {
    const deck = publishMixtape({
      title: "Servant set",
      setKind: "logos",
      tracks: [
        { id: "v1", title: "Isaiah 53:5", src: verseTrackSrc("Isaiah 53:5") },
      ],
    });
    expect(deck.setKind).toBe("logos");
    expect(mixtapeListingArgs(deck).isNft).toBe(false);
    expect(
      holdLogosEdition({
        handle: "dj_yard",
        setKind: "logos",
        title: deck.title,
        passages: ["Isaiah 53:5", "John 1:1"],
      }),
    ).toBe(true);
    const layout = loadLocalMyYard("dj_yard");
    expect(layout?.modules?.logosDeck).toBe(true);
    expect(layout?.logosDeck?.setTitle).toBe("Servant set");
    expect(
      tracksByIds(layout?.logosDeck?.trackIds ?? []).map(
        (row) => row.reference,
      ),
    ).toEqual(["Isaiah 53:5", "John 1:1"]);
    expect(tracksByIds(["John 1:1"])[0].crossRefs).toEqual([]);
    expect(holdLogosEdition({ handle: "dj_yard", setKind: "songs" })).toBe(
      false,
    );
    expect(() =>
      publishMixtape({
        title: "Songs only",
        setKind: "songs",
        tracks: [
          { id: "v1", title: "Isaiah 53:5", src: verseTrackSrc("Isaiah 53:5") },
        ],
      }),
    ).toThrow(/audio file or an https link/);
  });

  it("publishes onto the music hub and keeps the edition off-chain", () => {
    const mixtape = publishMixtape({
      title: "Friday lawn",
      body: "Recorded in the yard.",
      priceWb: 25,
      editionSize: 40,
      tracks: [
        {
          id: "t1",
          title: "Intro",
          src: "https://media.example.test/a.mp3",
          stems: [
            {
              id: "vox",
              lane: "vocals",
              src: "https://media.example.test/vox.mp3",
            },
          ],
        },
        { id: "t2", title: "Outro", src: "web_track2" },
      ],
      cover: "https://media.example.test/front.jpg",
      credits: "Produced in the yard.",
    });
    expect(mixtape.cover).toBe("https://media.example.test/front.jpg");
    expect(mixtape.credits).toBe("Produced in the yard.");
    expect(() =>
      publishMixtape({
        title: "Bad sleeve",
        cover: "data:image/png;base64,aaaa",
        tracks: [
          { id: "t1", title: "Intro", src: "https://media.example.test/a.mp3" },
        ],
      }),
    ).toThrow(/Cover art/);
    expect(parseMixtapeRef(mixtapeRef(mixtape.id))).toBe(mixtape.id);
    expect(listMixtapes()).toHaveLength(1);
    const hub = listHubItems("music").find((item) => item.kind === "audio");
    expect(hub?.mediaUrl).toBe(mixtapeRef(mixtape.id));
    expect(mixtapeListingArgs(mixtape)).toMatchObject({
      itemType: "mix",
      itemRef: mixtape.id,
      price: 25,
      isNft: false,
      fulfillmentMode: "instant",
    });
    expect(mixtape.format).toBe("ep");
    expect(mixtape.visibility).toBe("yard");
    expect(mixtape.writeReceipt).toBe(true);
    expect(mixtape.tracks[0].stems).toEqual([
      { id: "vox", lane: "vocals", src: "https://media.example.test/vox.mp3" },
    ]);
    expect(mixtape.label).toBe("Bermuda Boyz Records");
    const single = publishMixtape({
      title: "Lawn single",
      format: "single",
      visibility: "public",
      rightsAttested: true,
      writeReceipt: true,
      storeUrl: "https://tidal.com/browse/track/1",
      tracks: [
        { id: "t1", title: "Intro", src: "https://media.example.test/a.mp3" },
      ],
    });
    expect(single.format).toBe("single");
    expect(single.writeReceipt).toBe(true);
    expect(single.storeUrl).toContain("tidal.com");
    expect(() =>
      publishMixtape({
        title: "Public blob",
        format: "single",
        visibility: "public",
        rightsAttested: true,
        tracks: [{ id: "t1", title: "Intro", src: "web_onlyhere" }],
      }),
    ).toThrow(/https audio file/);
  });

  it("keeps a device-only mix on the yard sale board", () => {
    const board = mergeMarketplaceBoards(
      [
        {
          id: 9,
          sellerHandle: "other",
          itemType: "notes",
          price: 5,
          title: "Notes",
        },
        {
          id: 8,
          sellerHandle: "dj_yard",
          itemType: "mix",
          itemRef: "mix_shared",
          price: 10,
          title: "Shared",
        },
      ],
      [
        {
          id: 3,
          sellerHandle: "dj_yard",
          itemType: "mix",
          itemRef: "mix_friday",
          price: 25,
          title: "Friday lawn",
        },
        {
          id: 4,
          sellerHandle: "dj_yard",
          itemType: "mix",
          itemRef: "mix_shared",
          price: 25,
          title: "already shared",
        },
        {
          id: 1,
          sellerHandle: "campus_king",
          itemType: "mockup",
          itemRef: "fashion:mockup",
          price: 45,
          title: "Tee",
        },
      ],
    );
    expect(board.map((row) => row.title)).toEqual([
      "Friday lawn",
      "Notes",
      "Shared",
    ]);
  });

  it("copies a shared mixtape into this browser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            mixtapes: [
              {
                id: "mix_remote_1",
                yardId: "tsu",
                title: "Friday lawn",
                body: "From the other phone.",
                tracks: [
                  {
                    id: "t1",
                    title: "Intro",
                    src: "https://media.example.test/a.mp3",
                  },
                ],
                authorHandle: "ada",
                authorDisplayName: "Ada",
                createdAt: "2026-10-20T00:00:00.000Z",
                priceWb: 25,
                editionSize: 10,
                listingId: null,
                hubItemId: null,
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );
    await syncMixtapes();
    expect(listMixtapes().map((row) => row.title)).toEqual(["Friday lawn"]);
    expect(
      listHubItems("music").some(
        (item) => item.mediaUrl === "mixtape:mix_remote_1",
      ),
    ).toBe(true);
  });
});
