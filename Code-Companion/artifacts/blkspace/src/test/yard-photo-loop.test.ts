import { describe, expect, it } from "vitest";
import { readyYardPhotos, type YardPhotoItem } from "@/lib/yard-photo-loop";

function item(patch: Partial<YardPhotoItem>): YardPhotoItem {
  return {
    id: 1,
    name: "a.jpg",
    album: "photos",
    rating: 3,
    tags: [],
    source: "/tmp/a.jpg",
    status: "ready",
    detail: "",
    file: "1.jpg",
    bytes: 1200,
    mime: "image/jpeg",
    width: 1600,
    height: 900,
    caption: "photos · a",
    ...patch,
  };
}

describe("yard photo picks", () => {
  it("posts only prepared files", () => {
    const ready = readyYardPhotos([
      item({ id: 1 }),
      item({ id: 2, status: "needs-darktable", file: "" }),
      item({ id: 3, status: "ready", file: "" }),
    ]);
    expect(ready.map((photo) => photo.id)).toEqual([1]);
  });
});
