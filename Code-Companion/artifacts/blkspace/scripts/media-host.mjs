import { createHash, createHmac, randomUUID } from "node:crypto";
import { loadEnv } from "vite";

function envOf(server) {
  const file = loadEnv(server.config.mode, server.config.root, "");
  const get = (key) => file[key] || process.env[key] || "";
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
    "/" +
    [cfg.bucket, ...key.split("/")].map(encodeURIComponent).join("/");
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
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
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body?.errors?.[0]?.message || `stream ${res.status}`);
  }
  const uid = body.result.uid;
  return {
    provider: "stream",
    method: "POST",
    uploadUrl: body.result.uploadURL,
    publicUrl: `https://iframe.videodelivery.net/${uid}`,
  };
}

/** Browser upload targets for R2 (photos, audio, docs) and Stream (video). */
export function mediaHostPlugin() {
  return {
    name: "blkspace-media-host",
    configureServer(server) {
      server.middlewares.use("/api/media/upload-target", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 404;
          res.end();
          return;
        }
        const cfg = envOf(server);
        try {
          const body = JSON.parse((await readBody(req)) || "{}");
          const filename = String(body.filename || "file");
          const mime = String(body.mime || "");
          const video = mime.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(filename);
          if (video) {
            if (!streamReady(cfg)) {
              res.statusCode = 503;
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ ok: false, error: "stream not configured" }));
              return;
            }
            const target = await streamUpload(cfg, filename);
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: true, ...target }));
            return;
          }
          if (!r2Ready(cfg)) {
            res.statusCode = 503;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: false, error: "r2 not configured" }));
            return;
          }
          const key = safeKey(filename);
          const uploadUrl = presignR2Put(cfg, key);
          const publicUrl = `${cfg.publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`;
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              ok: true,
              provider: "r2",
              method: "PUT",
              uploadUrl,
              publicUrl,
            }),
          );
        } catch (err) {
          res.statusCode = 502;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
        }
      });
    },
  };
}
