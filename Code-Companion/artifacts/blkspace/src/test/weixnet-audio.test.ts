import { describe, expect, it } from "vitest";
import { WEIXSOUND_LABEL } from "@/lib/weixsound";
import { weixnetAudioLine, weixnetAudioPlan } from "@/lib/weixnet-audio";

const disc = {
  id: "mix_lawn",
  title: "Friday lawn",
  authorHandle: "ada",
  priceWb: 25,
  editionSize: 10,
  tracks: [{ src: "https://cdn.example/lawn.mp3" }],
};

describe("WeixNet audio distribution", () => {
  it("puts an https master on the note and prices the copy in WB", () => {
    const plan = weixnetAudioPlan(disc, "release");
    expect(plan.fileLane).toBe("https");
    expect(plan.symbol).toBe("WB");
    expect(plan.content.startsWith(WEIXSOUND_LABEL)).toBe(true);
    expect(plan.content).toContain("https://cdn.example/lawn.mp3");
    expect(plan.content).toContain("25 WB");
    expect(plan.content).toContain("10 numbered copies");
    expect(plan.tags).toContainEqual(["price", "WB", "25"]);
  });

  it("names a yard-hosted file and keeps the bytes off the note", () => {
    const yard = {
      ...disc,
      tracks: [
        {
          src: "http://127.0.0.1:24442/api/yards/audio/aud_0123456789abcdef.mp3",
        },
      ],
    };
    const plan = weixnetAudioPlan(yard, "release");
    expect(plan.fileLane).toBe("yard");
    expect(plan.content).toContain("/api/yards/audio/aud_0123456789abcdef.mp3");
    expect(plan.content).not.toContain("data:");
    expect(weixnetAudioLine(yard)).toContain("The yard hosts this file.");
  });

  it("keeps a device file off the relay note", () => {
    const plan = weixnetAudioPlan(
      { ...disc, tracks: [{ src: "web_secret_blob" }] },
      "release",
    );
    expect(plan.fileLane).toBe("device");
    expect(plan.content).toContain("releasing device");
    expect(plan.content).not.toContain("web_secret_blob");
    expect(plan.content).not.toContain("data:");
  });

  it("offers a pass on the same market without paying the holder", () => {
    const plan = weixnetAudioPlan(disc, "pass", 12);
    expect(plan.priceWb).toBe(12);
    expect(plan.content).toContain("12 WB");
    expect(plan.content).toContain("The sleeve is paid again.");
    expect(plan.content).toContain("The holder is not paid.");
    expect(plan.content).not.toMatch(/profit|worth more/i);
    expect(weixnetAudioLine(disc)).toContain("25 WB");
  });
});
