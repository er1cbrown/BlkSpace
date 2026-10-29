/**
 * Yard images. The bytes live on this host so another member can see them.
 * Cloudflare R2 is used when it is configured. This store is the path when
 * it is not.
 */
import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { HttpError } from "./http.mjs";
import { readLimited } from "./yard-audio.mjs";

export const YARD_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

const EXT_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

const STORED_NAME = /^img_[a-f0-9]{16}\.(jpe?g|png|gif|webp)$/;

export function yardImageDir(env = process.env) {
  return (
    env.YARD_IMAGE_DIR ||
    path.join(os.homedir(), ".local", "share", "blkspace", "yard-image")
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

export function imageExtension(name, mime) {
  const ext = extensionOf(name);
  if (!Object.prototype.hasOwnProperty.call(EXT_MIME, ext)) return "";
  const type = String(mime || "")
    .toLowerCase()
    .split(";", 1)[0]
    .trim();
  if (type && type !== "application/octet-stream" && !type.startsWith("image/")) {
    return "";
  }
  if (type === "image/svg+xml") return "";
  return ext;
}

export async function saveYardImage(env, { name, mime, bytes }) {
  const ext = imageExtension(name, mime);
  if (!ext) {
    throw new HttpError(400, "Use an image (jpg, png, webp, or gif).");
  }
  if (!bytes?.length) throw new HttpError(400, "That image is empty.");
  if (bytes.length > YARD_IMAGE_MAX_BYTES) {
    throw new HttpError(413, "That image is over 15 MB.");
  }
  const filename = `img_${randomBytes(8).toString("hex")}.${ext === "jpeg" ? "jpg" : ext}`;
  const dir = path.resolve(yardImageDir(env));
  await mkdir(dir, { recursive: true });
  const full = path.resolve(dir, filename);
  if (path.dirname(full) !== dir) throw new HttpError(400, "Bad image name.");
  await writeFile(full, bytes);
  const storedExt = filename.slice(filename.lastIndexOf(".") + 1);
  return {
    ok: true,
    id: filename.slice(0, filename.lastIndexOf(".")),
    url: `/api/yards/image/${filename}`,
    mime: EXT_MIME[storedExt],
    size: bytes.length,
  };
}

async function locate(env, filename) {
  if (!STORED_NAME.test(filename)) throw new HttpError(404, "Not found.");
  const dir = path.resolve(yardImageDir(env));
  const full = path.resolve(dir, filename);
  if (!full.startsWith(dir + path.sep)) throw new HttpError(404, "Not found.");
  const info = await stat(full).catch(() => null);
  if (!info?.isFile()) throw new HttpError(404, "Not found.");
  const ext = filename.slice(filename.lastIndexOf(".") + 1);
  return {
    full,
    size: info.size,
    mime: EXT_MIME[ext] || "application/octet-stream",
  };
}

export async function serveYardImage(req, res, env, filename) {
  const file = await locate(env, filename);
  res.writeHead(200, {
    "content-type": file.mime,
    "content-length": file.size,
    "cache-control": "public, max-age=86400",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  const stream = createReadStream(file.full);
  stream.on("error", () => res.destroy());
  res.on("close", () => stream.destroy());
  stream.pipe(res);
}

export { readLimited };
