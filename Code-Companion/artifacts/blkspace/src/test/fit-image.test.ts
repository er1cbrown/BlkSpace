import { describe, expect, it, vi } from "vitest";
import {
  PUBLISH_MAX_BYTES,
  fitImageForUpload,
  fittedJpegName,
  fittedSize,
  publishAttempt,
  type DecodedImage,
} from "@/lib/fit-image";

function photo(name: string, type: string, bytes = 32): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function decoded(width: number, height: number): DecodedImage {
  return {
    width,
    height,
    source: {} as CanvasImageSource,
    close: vi.fn(),
  };
}

describe("publish sizing", () => {
  it("uses the same three passes as the pyvips photo loop", () => {
    expect(publishAttempt(0)).toEqual({ edge: 1600, quality: 80 });
    expect(publishAttempt(1)).toEqual({ edge: 1280, quality: 70 });
    expect(publishAttempt(2)).toEqual({ edge: 960, quality: 60 });
    expect(publishAttempt(3)).toBeNull();
  });

  it("scales the long edge and leaves a small frame alone", () => {
    expect(fittedSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fittedSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fittedJpegName("IMG_2045.HEIC")).toBe("IMG_2045.jpg");
  });

  it("leaves audio and an already-small photo untouched", async () => {
    const mix = photo("set.mp3", "audio/mpeg", 1000);
    const encode = vi.fn();
    expect(await fitImageForUpload(mix, { encode })).toBe(mix);
    expect(encode).not.toHaveBeenCalled();

    const small = photo("ready.jpg", "image/jpeg", 1000);
    const decode = vi.fn(async () => decoded(1200, 800));
    expect(
      await fitImageForUpload(small, { decode, encode }),
    ).toBe(small);
    expect(encode).not.toHaveBeenCalled();
  });

  it("writes a 1600px jpeg and shrinks again when the first pass is over 8 MiB", async () => {
    const raw = photo("yard.png", "image/png", 4000);
    const decode = vi.fn(async () => decoded(4000, 3000));
    const encode = vi.fn(
      async (args: { width: number; height: number; quality: number }) => {
        if (args.quality === 80) {
          expect(args).toMatchObject({ width: 1600, height: 1200, quality: 80 });
          return new Blob([new Uint8Array(PUBLISH_MAX_BYTES + 1)], {
            type: "image/jpeg",
          });
        }
        expect(args).toMatchObject({ width: 1280, height: 960, quality: 70 });
        return new Blob([new Uint8Array(120)], { type: "image/jpeg" });
      },
    );

    const out = await fitImageForUpload(raw, { decode, encode });
    expect(out.name).toBe("yard.jpg");
    expect(out.type).toBe("image/jpeg");
    expect(out.size).toBe(120);
    expect(encode).toHaveBeenCalledTimes(2);
  });

  it("keeps the original when the browser cannot decode it", async () => {
    const heic = photo("scan.heic", "image/heic", 2000);
    const decode = vi.fn(async () => {
      throw new Error("decode failed");
    });
    expect(await fitImageForUpload(heic, { decode })).toBe(heic);
  });
});
