/**
 * Social media-style file attach rules for BlkSpace posts.
 * Storage path: Tauri upload_blob → SQLite blobs + local blob_store (+ Iroh CID when enabled).
 */

export type MediaKind = "image" | "video" | "audio" | "pdf" | "doc" | "other";

/** Max bytes by kind — Tier 0 friendly defaults. */
export const MEDIA_SIZE_LIMITS: Record<MediaKind, number> = {
  image: 15 * 1024 * 1024, // 15 MB
  video: 50 * 1024 * 1024, // 50 MB
  audio: 25 * 1024 * 1024, // 25 MB
  pdf: 20 * 1024 * 1024, // 20 MB
  doc: 15 * 1024 * 1024,
  other: 10 * 1024 * 1024,
};

/** Absolute ceiling (must match or stay under Rust MAX_UPLOAD_SIZE). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** HTML accept attribute for composer + create page. */
export const MEDIA_ACCEPT =
  "image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.md,.csv,.json,.zip";

/** X/Twitter-style: one video clip on a wall post (library picker, not Reels). */
export const MEDIA_ACCEPT_VIDEO =
  "video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.m4v,.webm,.mov";

export const MAX_VIDEOS_PER_POST = 1;

const EXT_KIND: Record<string, MediaKind> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  heic: "image",
  heif: "image",
  avif: "image",
  bmp: "image",
  mp4: "video",
  webm: "video",
  mov: "video",
  m4v: "video",
  avi: "video",
  mkv: "video",
  mp3: "audio",
  m4a: "audio",
  aac: "audio",
  ogg: "audio",
  opus: "audio",
  wav: "audio",
  flac: "audio",
  pdf: "pdf",
  doc: "doc",
  docx: "doc",
  txt: "doc",
  md: "doc",
  csv: "doc",
  json: "doc",
  zip: "doc",
  rtf: "doc",
};

const MIME_KIND_PREFIX: [string, MediaKind][] = [
  ["image/", "image"],
  ["video/", "video"],
  ["audio/", "audio"],
  ["application/pdf", "pdf"],
];

export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  if (i < 0) return "";
  return filename.slice(i + 1).toLowerCase();
}

export function mediaKindFromFile(file: {
  name: string;
  type?: string;
}): MediaKind {
  const mime = (file.type || "").toLowerCase();
  for (const [prefix, kind] of MIME_KIND_PREFIX) {
    if (mime === prefix || mime.startsWith(prefix)) return kind;
  }
  const ext = extensionOf(file.name);
  return EXT_KIND[ext] ?? "other";
}

export function mediaKindFromMime(mime: string, filename?: string): MediaKind {
  return mediaKindFromFile({ name: filename || "file", type: mime });
}

export function isAllowedUpload(
  file: File,
): { ok: true } | { ok: false; reason: string } {
  if (!file.name.includes(".")) {
    return { ok: false, reason: "File needs an extension (e.g. .png, .mp4)" };
  }
  const kind = mediaKindFromFile(file);
  if (kind === "other") {
    return {
      ok: false,
      reason: "Unsupported type. Use image, video, audio, PDF, or common docs.",
    };
  }
  const limit = MEDIA_SIZE_LIMITS[kind];
  if (file.size > limit) {
    return {
      ok: false,
      reason: `${kind} max is ${Math.round(limit / (1024 * 1024))}MB (file is ${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: "File exceeds 50MB absolute limit" };
  }
  if (file.size === 0) {
    return { ok: false, reason: "Empty file" };
  }
  return { ok: true };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function kindLabel(kind: MediaKind): string {
  switch (kind) {
    case "image":
      return "Photo";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "pdf":
      return "PDF";
    case "doc":
      return "File";
    default:
      return "File";
  }
}

/** Read file as raw base64 (no data: prefix) for tauriUploadBlob. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const b64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(b64 || "");
    };
    reader.onerror = () => reject(reader.error || new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

export interface PendingAttach {
  /** Local preview URL (object URL) — revoke when removed */
  previewUrl: string;
  /** Blob hash after upload; empty while uploading */
  hash: string;
  filename: string;
  kind: MediaKind;
  mime: string;
  size: number;
  status: "uploading" | "ready" | "error";
  error?: string;
}
