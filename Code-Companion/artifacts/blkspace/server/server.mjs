import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApiHandler } from "./api.mjs";
import { json } from "./http.mjs";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".webmanifest": "application/manifest+json",
};

export function createApp({ env = process.env, publicDir, origins } = {}) {
  const root = path.resolve(
    publicDir ||
      env.PUBLIC_DIR ||
      fileURLToPath(new URL("../dist/public/", import.meta.url)),
  );
  const allowed =
    origins ||
    String(env.PUBLIC_ORIGINS || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => new URL(v).origin);
  if (!allowed.length)
    throw new Error("Set PUBLIC_ORIGINS to the HTTPS URLs serving BlkSpace.");
  const api = createApiHandler(env, { origins: allowed });
  const server = createServer(async (req, res) => {
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
    try {
      const url = new URL(req.url || "/", "http://internal");
      if (url.pathname === "/api" || url.pathname.startsWith("/api/"))
        return await api(req, res);
      if (req.method !== "GET" && req.method !== "HEAD")
        return json(res, 405, { ok: false, error: "Method not allowed." });
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        return json(res, 400, { ok: false, error: "Invalid path." });
      }
      if (
        pathname.includes("\0") ||
        pathname.includes("\\") ||
        pathname.split("/").some((v) => v.startsWith("."))
      ) {
        return json(res, 404, { ok: false, error: "Not found." });
      }
      let filename = path.resolve(root, `.${pathname}`);
      let info = await stat(filename).catch(() => null);
      if (!info?.isFile()) {
        if (path.extname(pathname) || pathname.startsWith("/assets/"))
          return json(res, 404, { ok: false, error: "Not found." });
        filename = path.join(root, "index.html");
        info = await stat(filename);
      }
      const actualRoot = await realpath(root);
      const actual = await realpath(filename);
      if (!actual.startsWith(actualRoot + path.sep))
        return json(res, 404, { ok: false, error: "Not found." });
      res.writeHead(200, {
        "content-type":
          types[path.extname(filename)] || "application/octet-stream",
        "content-length": info.size,
        "cache-control": pathname.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      });
      if (req.method === "HEAD") return res.end();
      const stream = createReadStream(filename);
      stream.on("error", () => res.destroy());
      res.on("close", () => stream.destroy());
      stream.pipe(res);
    } catch {
      if (!res.headersSent)
        json(res, 500, {
          ok: false,
          error: "Server could not serve the request.",
        });
      else res.destroy();
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  return server;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid PORT.");
  const server = createApp();
  server.listen(port, process.env.HOST || "0.0.0.0", () =>
    console.log(`BlkSpace cloud server listening on port ${port}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10_000).unref();
    });
}
