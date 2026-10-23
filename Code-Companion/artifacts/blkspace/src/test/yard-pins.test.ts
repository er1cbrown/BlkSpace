import { beforeEach, describe, expect, it, vi } from "vitest";
import { listHubItems } from "@/lib/content-hub";
import {
  addPin,
  createBoard,
  listBoards,
  listPins,
  pinFileOk,
  pinImageOk,
  savePinToBoard,
  syncYardBoard,
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
  });

  it("copies a shared board into this browser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const path = String(url);
        if (path.includes("/api/yards/boards")) {
          return new Response(
            JSON.stringify({
              boards: [
                {
                  id: "board_remote_1",
                  yardId: "tsu",
                  title: "Fits",
                  authorHandle: "ada",
                  createdAt: "2026-10-20T00:00:00.000Z",
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (path.includes("/api/yards/pins")) {
          return new Response(
            JSON.stringify({
              pins: [
                {
                  id: "pin_remote_1",
                  yardId: "tsu",
                  boardId: "board_remote_1",
                  title: "Gold jacket",
                  note: "Homecoming.",
                  image: "https://media.example.test/jacket.jpg",
                  authorHandle: "ada",
                  createdAt: "2026-10-20T00:00:00.000Z",
                  hubItemId: null,
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response("{}", { status: 404 });
      }),
    );
    await syncYardBoard("tsu");
    expect(listBoards("tsu").map((board) => board.title)).toEqual(["Fits"]);
    expect(listPins("tsu").map((pin) => pin.title)).toEqual(["Gold jacket"]);
    expect(listHubItems("culture").some((item) => item.kind === "pin")).toBe(
      true,
    );
    expect(
      listHubItems("culture").filter((item) => item.kind === "pin"),
    ).toHaveLength(1);
  });
});
