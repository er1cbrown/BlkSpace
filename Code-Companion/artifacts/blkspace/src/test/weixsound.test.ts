import { describe, expect, it } from "vitest";
import {
  chainVerifiedSale,
  discAnchorPlan,
  discFormatOf,
  holdsVerifiedCopy,
  releaseFields,
  rememberVerifiedCopy,
  SOLANA_MEMO_PROGRAM,
  stemsOf,
  streamMetadata,
  trackListHash,
} from "@/lib/weixsound";

describe("WeixSound label switches", () => {
  it("sizes a single, an EP, and an album", () => {
    expect(discFormatOf("single", 1)).toBe("single");
    expect(discFormatOf("ep", 4)).toBe("ep");
    expect(discFormatOf("album", 10)).toBe("album");
    expect(discFormatOf("cd", 10)).toBe("cd");
    expect(() => discFormatOf("single", 2)).toThrow(/one track/);
    expect(() => discFormatOf("ep", 1)).toThrow(/2 to 6/);
  });

  it("keeps a verse set and a blob off the public shelf", () => {
    expect(() =>
      releaseFields(
        {
          visibility: "public",
          rightsAttested: true,
          setKind: "logos",
          tracks: [{ id: "v1", src: "verse:Isaiah 53:5" }],
        },
        "dj_yard",
      ),
    ).toThrow(/stays on the yard/);
    expect(() =>
      releaseFields(
        {
          visibility: "public",
          rightsAttested: true,
          format: "single",
          setKind: "songs",
          tracks: [{ id: "t1", src: "web_localtrack" }],
        },
        "dj_yard",
      ),
    ).toThrow(/https audio file/);
    expect(() =>
      releaseFields(
        {
          storeUrl: "https://open.spotify.com/track/abc",
          format: "single",
          setKind: "songs",
          tracks: [{ id: "t1", src: "https://media.example.test/a.mp3" }],
        },
        "dj_yard",
      ),
    ).toThrow(/Audius, SoundCloud, Bandcamp, or Tidal/);
  });

  it("accepts a public single and a memo that does not mint", () => {
    const release = releaseFields(
      {
        format: "single",
        visibility: "public",
        writeReceipt: true,
        rightsAttested: true,
        storeUrl: "https://soundcloud.com/bermuda-boyz/friday",
        splitsText: "dj_yard 70\nengineer 25",
        setKind: "songs",
        tracks: [{ id: "t1", src: "https://media.example.test/a.mp3" }],
      },
      "dj_yard",
    );
    expect(release.visibility).toBe("public");
    expect(release.writeReceipt).toBe(true);
    expect(release.splits).toEqual([
      { handle: "dj_yard", percent: 70 },
      { handle: "engineer", percent: 25 },
    ]);
    expect(release.label).toBe("Bermuda Boyz");
    const plan = discAnchorPlan({
      trackHash: trackListHash([{ id: "t1", src: "https://media.example.test/a.mp3" }]),
      copyNumber: 1,
      priceWb: 25,
      anchorStatus: "pending",
    });
    expect(plan?.programId).toBe(SOLANA_MEMO_PROGRAM);
    expect(plan?.payer).toBe("label");
    expect(plan?.callsConvertWbToBkspc).toBe(false);
    expect(plan?.memo).toContain("weixsound|");
    expect(
      discAnchorPlan({
        trackHash: "abc",
        copyNumber: 1,
        priceWb: 25,
        anchorStatus: "off",
      }),
    ).toBeNull();
  });

  it("treats a vinyl and a paid song as the verified sale", () => {
    expect(chainVerifiedSale({ setKind: "songs", format: "vinyl", priceWb: 0 })).toBe(true);
    expect(chainVerifiedSale({ setKind: "songs", format: "album", priceWb: 25 })).toBe(true);
    expect(chainVerifiedSale({ setKind: "songs", format: "album", priceWb: 0 })).toBe(false);
    expect(chainVerifiedSale({ setKind: "logos", format: "vinyl", priceWb: 20 })).toBe(false);
    expect(discFormatOf("vinyl", 1)).toBe("vinyl");
    expect(() => discFormatOf("vinyl", 2)).toThrow(/one track/);

    const vinyl = releaseFields(
      {
        format: "vinyl",
        setKind: "songs",
        priceWb: 0,
        visibility: "yard",
        tracks: [{ id: "t1", src: "web_sidea" }],
      },
      "dj_yard",
    );
    expect(vinyl.writeReceipt).toBe(true);
    expect(vinyl.visibility).toBe("yard");

    const paid = releaseFields(
      {
        format: "ep",
        setKind: "songs",
        priceWb: 25,
        writeReceipt: false,
        visibility: "yard",
        tracks: [
          { id: "t1", src: "web_a" },
          { id: "t2", src: "web_b" },
        ],
      },
      "dj_yard",
    );
    expect(paid.writeReceipt).toBe(true);

    const free = releaseFields(
      {
        format: "album",
        setKind: "songs",
        priceWb: 0,
        tracks: [{ id: "t1", src: "web_free" }],
      },
      "dj_yard",
    );
    expect(free.writeReceipt).toBe(false);

    const logos = releaseFields(
      {
        format: "single",
        setKind: "logos",
        priceWb: 20,
        tracks: [{ id: "v1", src: "verse:Isaiah 53:5" }],
      },
      "dj_yard",
    );
    expect(logos.writeReceipt).toBe(false);
  });

  it("puts stems in the receipt hash and names the stream", () => {
    expect(() =>
      stemsOf([
        { lane: "vocals", src: "https://media.example.test/v.mp3" },
        { lane: "drums", src: "https://media.example.test/d.mp3" },
        { lane: "bass", src: "https://media.example.test/b.mp3" },
        { lane: "music", src: "https://media.example.test/m.mp3" },
        { lane: "vocals", src: "https://media.example.test/x.mp3" },
      ]),
    ).toThrow(/at most 4/);
    expect(() =>
      stemsOf([{ lane: "guitar", src: "https://media.example.test/g.mp3" }]),
    ).toThrow(/vocals, drums, bass, or music/);

    const bare = trackListHash([{ id: "t1", src: "https://media.example.test/a.mp3" }]);
    const withStem = trackListHash([
      {
        id: "t1",
        src: "https://media.example.test/a.mp3",
        stems: [{ lane: "vocals", src: "https://media.example.test/v.mp3" }],
      },
    ]);
    expect(withStem).not.toBe(bare);
    expect(withStem).toHaveLength(16);

    expect(
      streamMetadata({
        title: "Friday",
        authorHandle: "dj_yard",
        format: "vinyl",
        credits: "Produced in the yard.",
        label: "Bermuda Boyz",
        tracks: [{ title: "A side" }],
        index: 0,
      }),
    ).toMatchObject({
      title: "A side",
      artist: "dj_yard",
      release: "Friday",
      format: "Vinyl",
      label: "Bermuda Boyz",
      credits: "Produced in the yard.",
      trackNumber: 1,
      trackCount: 1,
    });

    rememberVerifiedCopy("mix_vinyl_1");
    expect(holdsVerifiedCopy("mix_vinyl_1")).toBe(true);
    expect(holdsVerifiedCopy("mix_other")).toBe(false);
  });
});
