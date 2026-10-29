/**
 * Yard video files. The bytes live on this host so another member can play
 * them. Cloudflare Stream is used when it is configured. This store is the
 * path when it is not.
 */
import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { HttpError } from "./http.mjs";

export const YARD_VIDEO_MAX_BYTES = 150 * 1024 * 1024;

const EXT_MIME = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
};

const STORED_NAME =
  /^vid_[a-f0-9]{16}\.(mp4|m4v|webm|mov|avi|mkv)$/;

export function yardVideoDir(env = process.env) {
  return (
    env.YARD_VIDEO_DIR ||
    path.join(os.homedir(), ".local", "share", "blkspace", "yard-video")
  );
}

function extensionOf(name) {
  const base = String(name || "")
    .split(/[/\\]/)
    .pop()
    .toLowerCase();
  const index = base.lastIndexOf(".");
  return index >= 0 ? base.slice(index + 1) : "";
}

export function videoExtension(name, mime) {
  const ext = extensionOf(name);
  if (!Object.prototype.hasOwnProperty.call(EXT_MIME, ext)) return "";
  const type = String(mime || "")
    .toLowerCase()
    .split(";", 1)[0]
    .trim();
  if (type && type !== "application/octet-stream" && !type.startsWith("video/")) {
    return "";
  }
  return ext;
}

export async function saveYardVideo(env, { name, mime, bytes }) {
  const ext = videoExtension(name, mime);
  if (!ext) {
    throw new HttpError(400, "Use a video file (mp4, webm, or mov).");
  }
  if (!bytes?.length) throw new HttpError(400, "That file is empty.");
  if (bytes.length > YARD_VIDEO_MAX_BYTES) {
    throw new HttpError(413, "That video is over 150 MB.");
  }
  const filename = `vid_${randomBytes(8).toString("hex")}.${ext}`;
  const dir = path.resolve(yardVideoDir(env));
  await mkdir(dir, { recursive: true });
  const full = path.resolve(dir, filename);
  if (path.dirname(full) !== dir) throw new HttpError(400, "Bad video name.");
  await writeFile(full, bytes);
  return {
    ok: true,
    id: filename.slice(0, filename.lastIndexOf(".")),
    url: `/api/yards/video/${filename}`,
    mime: EXT_MIME[ext],
    size: bytes.length,
  };
}

function parseRange(header, total) {
  const raw = String(header || "");
  if (!raw) return { status: 200, start: 0, end: total - 1, length: total };
  const match = /^bytes=(\d*)-(\d*)$/.exec(raw);
  if (!match || total < 1) return { status: 416 };
  let start = match[1] === "" ? NaN : Number(match[1]);
  let end = match[2] === "" ? total - 1 : Number(match[2]);
  if (match[1] === "" && match[2] !== "") {
    const suffix = Number(match[2]);
    if (!Number.isInteger(suffix) || suffix < 1) return { status: 416 };
    start = Math.max(0, total - suffix);
    end = total - 1;
  }
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start >= total ||
    end < start
  ) {
    return { status: 416 };
  }
  end = Math.min(end, total - 1);
  return { status: 206, start, end, length: end - start + 1 };
}

async function locate(env, filename) {
  if (!STORED_NAME.test(filename)) throw new HttpError(404, "Not found.");
  const dir = path.resolve(yardVideoDir(env));
  const full = path.resolve(dir, filename);
  if (!full.startsWith(dir + path.sep)) throw new HttpError(404, "Not found.");
  const info = await stat(full).catch(() => null);
  if (!info?.isFile()) throw new HttpError(404, "Not found.");
  const ext = filename.slice(filename.lastIndexOf(".") + 1);
  return { full, size: info.size, mime: EXT_MIME[ext] || "application/octet-stream" };
}

/** Stream one stored video. Supports a single range so the player can seek. */
export async function serveYardVideo(req, res, env, filename) {
  const file = await locate(env, filename);
  const range = parseRange(req.headers.range, file.size);
  if (range.status === 416) {
    res.writeHead(416, { "content-range": `bytes */${file.size}` });
    res.end();
    return;
  }
  const headers = {
    "content-type": file.mime,
    "content-length": range.length,
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=86400",
  };
  if (range.status === 206) {
    headers["content-range"] = `bytes ${range.start}-${range.end}/${file.size}`;
  }
  res.writeHead(range.status, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  const stream = createReadStream(file.full, {
    start: range.start,
    end: range.end,
  });
  stream.on("error", () => res.destroy());
  res.on("close", () => stream.destroy());
  stream.pipe(res);
}
