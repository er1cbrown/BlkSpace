import { createHash } from "node:crypto";
import { verifyEvent } from "nostr-tools/pure";
import { HttpError } from "./http.mjs";

/** NIP-98 proof binds a signed-in key to this exact URL, method and JSON payload. */
export function authenticate(req, raw, origins) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Nostr ") || header.length > 8192) throw new Error();
    const event = JSON.parse(
      Buffer.from(header.slice(6), "base64").toString("utf8"),
    );
    if (
      event.kind !== 27235 ||
      event.content !== "" ||
      !Number.isInteger(event.created_at) ||
      Math.abs(Date.now() / 1000 - event.created_at) > 60 ||
      !verifyEvent(event)
    )
      throw new Error();
    const tag = (name) => {
      const found = event.tags.filter((t) => t[0] === name);
      if (found.length !== 1 || found[0].length !== 2) throw new Error();
      return found[0][1];
    };
    const expectedHash = createHash("sha256").update(raw).digest("hex");
    if (tag("method") !== req.method || tag("payload") !== expectedHash)
      throw new Error();
    const url = new URL(tag("u"));
    if (
      !origins.includes(url.origin) ||
      url.pathname + url.search !== req.url ||
      url.hash ||
      url.username ||
      url.password
    )
      throw new Error();
    return event.pubkey;
  } catch {
    throw new HttpError(401, "Sign in again to save posts or upload media.");
  }
}

/** Process-local burst protection; ownership/idempotency is enforced in the database. */
export function createWriteLimiter(limit = 60) {
  const buckets = new Map();
  return (key) => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
    const bucket = buckets.get(key) || { count: 0, until: now + 60_000 };
    if (
      ++bucket.count > limit ||
      (!buckets.has(key) && buckets.size >= 10_000)
    ) {
      throw new HttpError(429, "Too many requests. Try again in a minute.");
    }
    buckets.set(key, bucket);
  };
}
