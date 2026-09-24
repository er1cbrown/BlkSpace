import { createHash, createHmac, randomUUID } from "node:crypto";
import { HttpError } from "./http.mjs";

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/heic",
  "image/heif",
]);
const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "bmp",
  "heic",
  "heif",
]);
const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/x-aac",
  "audio/ogg",
  "application/ogg",
  "audio/opus",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
]);
const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "m4a",
  "aac",
  "ogg",
  "opus",
  "wav",
  "flac",
]);
const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/x-msvideo",
  "video/x-matroska",
]);
const VIDEO_EXTENSIONS = new Set(["mp4", "m4v", "webm", "mov", "avi", "mkv"]);
const PDF_MIME_TYPES = new Set(["application/pdf"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const DOCUMENT_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/rtf",
  "application/x-rtf",
  "application/json",
  "text/json",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/markdown",
  "text/csv",
]);
const DOCUMENT_EXTENSIONS = new Set([
  "doc",
  "docx",
  "rtf",
  "json",
  "zip",
  "txt",
  "md",
  "csv",
]);
const STREAM_HOSTS = new Set([
  "iframe.videodelivery.net",
  "cloudflarestream.com",
]);
const MEDIA_LIMITS = {
  image: 15 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  pdf: 20 * 1024 * 1024,
  document: 15 * 1024 * 1024,
};
const MIME_BY_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/mp4",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
  flac: "audio/flac",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  zip: "application/zip",
  rtf: "application/rtf",
};

function envOf(env) {
  const get = (key) => env[key] || "";
  return {
    accountId: get("CLOUDFLARE_ACCOUNT_ID").trim(),
    apiToken: get("CLOUDFLARE_API_TOKEN").trim(),
    accessKeyId: get("R2_ACCESS_KEY_ID").trim(),
    secretAccessKey: get("R2_SECRET_ACCESS_KEY").trim(),
    bucket: get("R2_BUCKET").trim(),
    publicBase: get("R2_PUBLIC_BASE_URL").trim().replace(/\/$/, ""),
  };
}

function isHttpsUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function extensionOf(filename) {
  const value = String(filename || "")
    .trim()
    .toLowerCase();
  const index = value.lastIndexOf(".");
  return index >= 0 ? value.slice(index + 1) : "";
}

function normalizedMime(mime, extension) {
  const value = String(mime || "")
    .trim()
    .toLowerCase()
    .split(";", 1)[0];
  if (!value || value === "application/octet-stream") {
    return Object.prototype.hasOwnProperty.call(MIME_BY_EXTENSION, extension)
      ? MIME_BY_EXTENSION[extension]
      : value;
  }
  return value;
}

function classifyMedia(mime, filename) {
  const extension = extensionOf(filename);
  if (!extension || extension === "svg") return null;
  const effectiveMime = normalizedMime(mime, extension);
  if (IMAGE_EXTENSIONS.has(extension)) {
    return IMAGE_MIME_TYPES.has(effectiveMime)
      ? { kind: "image", mime: effectiveMime, limit: MEDIA_LIMITS.image }
      : null;
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return VIDEO_MIME_TYPES.has(effectiveMime)
      ? { kind: "video", mime: effectiveMime, limit: MEDIA_LIMITS.video }
      : null;
  }
  if (AUDIO_EXTENSIONS.has(extension)) {
    return AUDIO_MIME_TYPES.has(effectiveMime)
      ? { kind: "audio", mime: effectiveMime, limit: MEDIA_LIMITS.audio }
      : null;
  }
  if (PDF_EXTENSIONS.has(extension)) {
    return PDF_MIME_TYPES.has(effectiveMime)
      ? { kind: "pdf", mime: effectiveMime, limit: MEDIA_LIMITS.pdf }
      : null;
  }
  if (DOCUMENT_EXTENSIONS.has(extension)) {
    return DOCUMENT_MIME_TYPES.has(effectiveMime)
      ? { kind: "document", mime: effectiveMime, limit: MEDIA_LIMITS.document }
      : null;
  }
  return null;
}

export function isAllowedHostedMediaUrl(value, env = {}) {
  if (!isHttpsUrl(value)) return false;
  const url = new URL(String(value));
  if (
    STREAM_HOSTS.has(url.hostname) ||
    url.hostname.endsWith(".cloudflarestream.com")
  )
    return true;
  const publicBase = String(env.R2_PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (!publicBase || !isHttpsUrl(publicBase)) return false;
  try {
    const base = new URL(publicBase);
    const basePath = base.pathname.replace(/\/$/, "");
    return (
      url.origin === base.origin &&
      (basePath === "" ||
        url.pathname === basePath ||
        url.pathname.startsWith(`${basePath}/`))
    );
  } catch {
    return false;
  }
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value).digest();
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

/** Presigned PUT. The phone uploads straight to R2; the secret stays here. */
function presignR2Put(cfg, key) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri =
    "/" + [cfg.bucket, ...key.split("/")].map(encodeURIComponent).join("/");
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const signedHeaders = "host";
  const params = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${cfg.accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", "3600"],
    ["X-Amz-SignedHeaders", signedHeaders],
  ].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const canonicalQuery = params
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  let signingKey = hmac(`AWS4${cfg.secretAccessKey}`, dateStamp);
  signingKey = hmac(signingKey, region);
  signingKey = hmac(signingKey, service);
  signingKey = hmac(signingKey, "aws4_request");
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function safeKey(filename) {
  const base = String(filename || "file")
    .split(/[/\\]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  const day = new Date().toISOString().slice(0, 10);
  return `portfolio/${day}/${randomUUID()}-${base}`;
}

function r2Ready(cfg) {
  return Boolean(
    cfg.accountId &&
    cfg.accessKeyId &&
    cfg.secretAccessKey &&
    cfg.bucket &&
    isHttpsUrl(cfg.publicBase),
  );
}

function streamReady(cfg) {
  return Boolean(cfg.accountId && cfg.apiToken);
}

async function streamUpload(cfg, filename) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${cfg.apiToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: 600,
        meta: { name: filename },
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    if (res.status === 401 || res.status === 403) {
      throw new HttpError(
        502,
        `Cloudflare Stream authorization failed (${res.status}). Check CLOUDFLARE_API_TOKEN has Account > Stream > Edit for CLOUDFLARE_ACCOUNT_ID.`,
      );
    }
    throw new HttpError(
      502,
      "Cloudflare Stream could not create an upload. Check Stream is enabled and has available storage.",
    );
  }
  const uid = body.result.uid;
  return {
    provider: "stream",
    method: "POST",
    uploadUrl: body.result.uploadURL,
    publicUrl: `https://iframe.videodelivery.net/${uid}`,
  };
}

/** Called only after the API has authenticated the request. */
export async function uploadTarget(env, body) {
  const cfg = envOf(env);
  const rawFilename = String(body.filename || "file").trim();
  const filename = rawFilename.slice(0, 200);
  const mime = String(body.mime || "");
  const media = classifyMedia(mime, rawFilename);
  if (!media) {
    throw new HttpError(
      400,
      "Unsupported media type. Use a raster image, MP4/MOV/WebM video, common audio, PDF, or document.",
    );
  }
  if (
    !Number.isSafeInteger(body.size) ||
    body.size < 1 ||
    body.size > media.limit
  ) {
    throw new HttpError(
      400,
      `${media.kind} file must be between 1 byte and ${media.limit / 1024 / 1024} MB.`,
    );
  }
  if (media.kind === "video") {
    if (!streamReady(cfg))
      throw new HttpError(503, "Cloud video uploads are not configured.");
    return streamUpload(cfg, filename);
  }
  if (!r2Ready(cfg))
    throw new HttpError(503, "Cloud file uploads are not configured.");
  const key = safeKey(filename);
  return {
    provider: "r2",
    method: "PUT",
    uploadUrl: presignR2Put(cfg, key),
    publicUrl: `${cfg.publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`,
    headers: { "content-type": media.mime },
  };
}
