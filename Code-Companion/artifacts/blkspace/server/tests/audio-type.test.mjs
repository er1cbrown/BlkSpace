import { describe, expect, test } from "bun:test";
import { uploadTarget } from "../media.mjs";

describe("audio upload types", () => {
  test("a Windows m4a is audio and a picture named mp3 is not", async () => {
    await expect(
      uploadTarget(
        {},
        { filename: "song.m4a", mime: "video/mp4", size: 5 },
      ),
    ).rejects.toMatchObject({
      status: 503,
      message: "Cloud file uploads are not configured.",
    });
    await expect(
      uploadTarget({}, { filename: "song.wav", mime: "audio/wave", size: 5 }),
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      uploadTarget({}, { filename: "song.mp3", mime: "", size: 5 }),
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      uploadTarget(
        {},
        { filename: "song.mp3", mime: "image/jpeg", size: 5 },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
