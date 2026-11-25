import { describe, expect, it, vi } from "vitest";
import { fetchReceiverFix, parseReceiverFix } from "@/lib/deck-gps";

describe("receiver fix", () => {
  it("accepts a gpsd 3D fix and refuses a receiver with no lock", () => {
    expect(
      parseReceiverFix({ class: "TPV", mode: 3, lat: 33.75, lon: -84.39 }),
    ).toEqual({ ok: true, point: { lat: 33.75, lon: -84.39 } });
    expect(parseReceiverFix({ class: "TPV", mode: 1 })).toEqual({
      ok: false,
      error: "Receiver has no fix yet.",
    });
    expect(parseReceiverFix({ class: "SKY", mode: 3, lat: 1, lon: 2 })).toEqual({
      ok: false,
      error: "Receiver has no fix yet.",
    });
    expect(parseReceiverFix({ lat: 33.75, lon: -84.39 })).toEqual({
      ok: true,
      point: { lat: 33.75, lon: -84.39 },
    });
  });

  it("says the bridge is down without inventing a coordinate", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(
      await fetchReceiverFix("http://127.0.0.1:2948/fix", fetchImpl),
    ).toEqual({
      ok: false,
      error:
        "Receiver did not answer. Run the gpsd bridge on the Pi, then follow again.",
    });
    expect(
      await fetchReceiverFix("notaurl", fetchImpl),
    ).toEqual({
      ok: false,
      error: "Receiver address must start with http:// or https://.",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
