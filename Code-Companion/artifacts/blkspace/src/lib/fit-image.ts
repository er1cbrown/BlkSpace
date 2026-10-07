/**
 * In-app photo sizing for every upload, including Windows and Mac.
 *
 * Same publish target as tools/yard_photo_loop.py: longest edge 1600px,
 * JPEG quality 80, then two smaller passes, until the file is under the
 * 8 MiB browser cap. The browser decoder does the work, so no Python or
 * libvips install is required. Audio, PDF, and documents are unchanged.
 */

import { WEB_LOCAL_MAX_BYTES, extensionOf, mediaKindFromFile } from "@/lib/media-upload";

export const PUBLISH_EDGE = 1600;
export const PUBLISH_QUALITY = 80;
export const PUBLISH_MAX_BYTES = WEB_LOCAL_MAX_BYTES;

const MIN_EDGE = 800;
const MIN_QUALITY = 60;
const EDGE_STEP = 320;
const QUALITY_STEP = 10;
const ATTEMPTS = 3;

export function publishAttempt(
  attempt: number,
): { edge: number; quality: number } | null {
  if (attempt < 0 || attempt >= ATTEMPTS) return null;
  return {
    edge: Math.max(MIN_EDGE, PUBLISH_EDGE - attempt * EDGE_STEP),
    quality: Math.max(MIN_QUALITY, PUBLISH_QUALITY - attempt * QUALITY_STEP),
  };
}

export function fittedSize(
  width: number,
  height: number,
  edge: number,
): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= edge || long <= 0) {
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }
  const scale = edge / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function fittedJpegName(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const stem = (dot > 0 ? filename.slice(0, dot) : filename).trim() || "photo";
  return `${stem}.jpg`;
}

export type DecodedImage = {
  width: number;
  height: number;
  source: CanvasImageSource;
  close: () => void;
};

export type ImageFitHooks = {
  decode?: (file: File) => Promise<DecodedImage>;
  encode?: (args: {
    source: CanvasImageSource;
    width: number;
    height: number;
    quality: number;
  }) => Promise<Blob | null>;
};

async function decodeImage(file: File): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file);
  return {
    width: bitmap.width,
    height: bitmap.height,
    source: bitmap,
    close: () => bitmap.close(),
  };
}

async function encodeJpeg(args: {
  source: CanvasImageSource;
  width: number;
  height: number;
  quality: number;
}): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = args.width;
  canvas.height = args.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, args.width, args.height);
  ctx.drawImage(args.source, 0, 0, args.width, args.height);
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", args.quality / 100);
  });
}

function alreadyPublishSize(file: File, decoded: DecodedImage): boolean {
  return (
    file.size > 0 &&
    file.size <= PUBLISH_MAX_BYTES &&
    Math.max(decoded.width, decoded.height) <= PUBLISH_EDGE
  );
}

/** Return a publish-sized JPEG, or the original when it already fits or cannot be decoded. */
export async function fitImageForUpload(
  file: File,
  hooks?: ImageFitHooks,
): Promise<File> {
  if (mediaKindFromFile(file) !== "image") return file;
  const ext = extensionOf(file.name);
  if (ext === "svg" || file.type.toLowerCase() === "image/svg+xml") return file;

  const decode = hooks?.decode ?? decodeImage;
  const encode = hooks?.encode ?? encodeJpeg;
  let decoded: DecodedImage;
  try {
    decoded = await decode(file);
  } catch {
    return file;
  }

  try {
    if (alreadyPublishSize(file, decoded)) return file;

    let last: File | null = null;
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const plan = publishAttempt(attempt);
      if (!plan) break;
      const size = fittedSize(decoded.width, decoded.height, plan.edge);
      const blob = await encode({
        source: decoded.source,
        width: size.width,
        height: size.height,
        quality: plan.quality,
      });
      if (!blob || blob.size === 0) continue;
      last = new File([blob], fittedJpegName(file.name), {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
      if (last.size <= PUBLISH_MAX_BYTES) return last;
    }
    return last ?? file;
  } finally {
    decoded.close();
  }
}
