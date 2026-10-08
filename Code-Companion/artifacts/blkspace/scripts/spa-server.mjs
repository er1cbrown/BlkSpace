import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HttpError, json, readJson } from "../server/http.mjs";
import { readYardFile, readYardManifest } from "../server/yard-photos.mjs";
import { listOutboxFiles, receiveTicket, shareOutboxFile, weixnetStatus } from "../server/weixnet.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/public",
);
const port = Number(process.env.PORT ?? 24442);
const host = process.env.HOST ?? "127.0.0.1";

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function handleApi(req, res, urlPath, url) {
  try {
    if (req.method === "GET" && urlPath === "/api/yard-photos/manifest") {
      return json(res, 200, readYardManifest());
    }
    if (req.method === "GET" && urlPath === "/api/yard-photos/file") {
      const file = readYardFile(url.searchParams.get("name"));
      if (!file) return json(res, 404, { ok: false, error: "Not found" });
      res.writeHead(200, {
        "content-type": file.mime,
        "content-length": file.size,
        "cache-control": "no-store",
      });
      res.end(file.body);
      return;
    }
    if (req.method === "GET" && urlPath === "/api/weixnet/status") {
      return json(res, 200, await weixnetStatus());
    }
    if (req.method === "GET" && urlPath === "/api/weixnet/outbox") {
      return json(res, 200, await listOutboxFiles());
    }
    if (req.method === "POST" && urlPath === "/api/weixnet/sendme") {
      const { body } = await readJson(req);
      return json(res, 200, await shareOutboxFile(body));
    }
    if (req.method === "POST" && urlPath === "/api/weixnet/receive") {
      const { body } = await readJson(req);
      return json(res, 200, await receiveTicket(body));
    }
    return json(res, 404, { ok: false, error: "Not found" });
  } catch (err) {
    if (err instanceof HttpError) return json(res, err.status, { ok: false, error: err.message });
    console.error(err);
    if (!res.headersSent) return json(res, 500, { ok: false, error: "Server could not serve the request." });
  }
}

http
  .createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url ?? "/", `http://${host}`);
    } catch {
      json(res, 400, { ok: false, error: "Invalid path." });
      return;
    }
    let urlPath;
    try {
      urlPath = decodeURIComponent(url.pathname);
    } catch {
      json(res, 400, { ok: false, error: "Invalid path." });
      return;
    }
    // Never answer /api with index.html. A 200 HTML body makes response.json() throw
    // and the boot overlay treats that as a crashed window.
    if (urlPath === "/api" || urlPath.startsWith("/api/")) {
      await handleApi(req, res, urlPath, url);
      return;
    }
    let filePath = path.join(root, urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(root, "index.html");
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mime[ext] ?? "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  })
  .listen(port, host, () => {
    console.log(`SPA server http://${host}:${port} -> ${root}`);
  });