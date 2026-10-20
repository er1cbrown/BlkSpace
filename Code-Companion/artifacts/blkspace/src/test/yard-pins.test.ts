import { beforeEach, describe, expect, it, vi } from "vitest";
import { listHubItems } from "@/lib/content-hub";
import {
  addPin,
  createBoard,
  listPins,
  pinFileOk,
  pinImageOk,
  savePinToBoard,
} from "@/lib/yard-pins";

vi.mock("@/lib/auth", () => ({
  getCurrentHandle: () => "dj_yard",
  getCurrentDisplayName: () => "DJ Yard",
}));

describe("yard pins", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("rejects a non-image and an oversized photo", () => {
    expect(
      pinFileOk({ type: "text/plain", name: "notes.txt", size: 20 }),
    ).toMatch(/photo/);
    expect(
      pinFileOk({
        type: "image/jpeg",
        name: "fit.jpg",
        size: 5 * 1024 * 1024,
      }),
    ).toMatch(/4 MB/);
    expect(
      pinFileOk({ type: "image/png", name: "flyer.png", size: 1000 }),
    ).toBe(null);
  });

  it("accepts a blob id or https image and refuses a data url", () => {
    expect(pinImageOk("web_abc123")).toBe(true);
    expect(pinImageOk("https://media.example.test/fit.jpg")).toBe(true);
    expect(pinImageOk("data:image/png;base64,AAA")).toBe(false);
  });

  it("pins onto a yard board and saves a copy onto another board", () => {
    const fits = createBoard("tsu", "Fits");
    const flyers = createBoard("tsu", "Flyers");
    const pin = addPin({
      yardId: "tsu",
      boardId: fits.id,
      title: "Gold jacket",
      note: "Homecoming.",
      image: "https://media.example.test/jacket.jpg",
    });
    expect(listPins("tsu", fits.id).map((row) => row.title)).toEqual([
      "Gold jacket",
    ]);
    expect(listHubItems("culture").some((item) => item.kind === "pin")).toBe(
      true,
    );
    const saved = savePinToBoard(pin.id, flyers.id);
    expect(saved.boardId).toBe(flyers.id);
    expect(saved.image).toBe(pin.image);
    expect(listPins("tsu")).toHaveLength(2);
    expect(
      listHubItems("culture").filter((item) => item.kind === "pin"),
    ).toHaveLength(1);
  });
});
