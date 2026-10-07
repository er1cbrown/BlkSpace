import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Prepared digiKam publishes. The browser posts these through the normal pic path. */
export const YARD_PHOTO_MAX_BYTES = 8 * 1024 * 1024;

export function yardPhotoDir() {
  return (
    process.env.YARD_PHOTO_DIR ||
    path.join(os.homedir(), ".local", "share", "blkspace", "yard-photos")
  );
}

/** Reject anything that is not a publish file written by yard_photo_loop.py. */
export function safeYardFile(dir, name) {
  if (typeof name !== "string" || !/^[0-9]+\.jpg$/i.test(name)) return null;
  const root = fs.realpathSync(dir);
  const full = path.resolve(root, name);
  if (path.dirname(full) !== root) return null;
  return full;
}

export function readYardManifest(dir = yardPhotoDir()) {
  const file = path.join(dir, "manifest.json");
  if (!fs.existsSync(file)) {
    return { ok: true, missing: true, items: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return { ...parsed, ok: true, missing: false, items };
  } catch {
    return { ok: false, missing: true, items: [], error: "Manifest could not be read." };
  }
}

export function readYardFile(name, dir = yardPhotoDir()) {
  if (!fs.existsSync(dir)) return null;
  const full = safeYardFile(dir, name);
  if (!full || !fs.existsSync(full)) return null;
  const stat = fs.statSync(full);
  if (!stat.isFile() || stat.size <= 0 || stat.size > YARD_PHOTO_MAX_BYTES) return null;
  return {
    mime: "image/jpeg",
    size: stat.size,
    body: fs.readFileSync(full),
  };
}
