import { createHash, createHmac, randomUUID } from "node:crypto";
import { HttpError } from "./http.mjs";

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
    cfg.publicBase,
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
  const filename = String(body.filename || "file").slice(0, 200);
  const mime = String(body.mime || "");
  const video =
    mime.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(filename);
  const limit = video ? 200 * 1024 * 1024 : 25 * 1024 * 1024;
  if (!Number.isSafeInteger(body.size) || body.size < 1 || body.size > limit) {
    throw new HttpError(
      400,
      `File must be between 1 byte and ${limit / 1024 / 1024} MB.`,
    );
  }
  if (video) {
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
  };
}
