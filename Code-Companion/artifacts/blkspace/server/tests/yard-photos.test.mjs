import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readYardFile, readYardManifest, safeYardFile } from "../yard-photos.mjs";

describe("yard photo files", () => {
  it("serves only numbered jpegs inside the prepare directory", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yard-photos-"));
    fs.writeFileSync(path.join(dir, "4.jpg"), "jpeg");
    fs.writeFileSync(path.join(dir, "notes.txt"), "nope");
    expect(safeYardFile(dir, "4.jpg")).toBe(fs.realpathSync(path.join(dir, "4.jpg")));
    expect(safeYardFile(dir, "../4.jpg")).toBeNull();
    expect(safeYardFile(dir, "notes.txt")).toBeNull();
    expect(readYardFile("4.jpg", dir)?.size).toBe(4);
    expect(readYardFile("notes.txt", dir)).toBeNull();
    fs.writeFileSync(
      path.join(dir, "manifest.json"),
      JSON.stringify({ items: [{ id: 4, status: "ready", file: "4.jpg" }] }),
    );
    expect(readYardManifest(dir).items).toHaveLength(1);
  });
});
