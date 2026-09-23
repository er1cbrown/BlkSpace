import { loadEnv } from "vite";

function httpBase(url) {
  return url.trim().replace(/^libsql:\/\//, "https://").replace(/\/$/, "");
}

function arg(value) {
  if (value === null || value === undefined) return { type: "null" };
  if (typeof value === "number") return { type: "integer", value: String(value) };
  return { type: "text", value: String(value) };
}

async function pipeline(base, token, sql, args = []) {
  const res = await fetch(`${base}/v2/pipeline`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: args.map(arg) } },
        { type: "close" },
      ],
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`turso ${res.status} ${text.slice(0, 180)}`);
  }
  return JSON.parse(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function rowsOf(payload) {
  const result = payload?.results?.[0]?.response?.result;
  const cols = result?.cols?.map((col) => col.name) ?? [];
  const rows = result?.rows ?? [];
  return rows.map((row) => {
    const out = {};
    cols.forEach((name, i) => {
      const cell = row[i];
      out[name] = cell && typeof cell === "object" ? cell.value ?? null : cell;
    });
    return out;
  });
}

/** Dev-server bridge. The browser never sees the Turso token. */
export function portfolioTursoPlugin() {
  return {
    name: "portfolio-turso",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, "");
      const url = env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || "";
      const token = env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || "";
      const base = url ? httpBase(url) : "";
      let ready = null;

      async function ensure() {
        if (!base || !token) return false;
        if (!ready) {
          ready = (async () => {
            await pipeline(
              base,
              token,
              `CREATE TABLE IF NOT EXISTS portfolio_posts (
                id INTEGER PRIMARY KEY,
                author_handle TEXT,
                content TEXT,
                town_tag TEXT,
                media_blobs TEXT,
                created_at TEXT
              )`,
            );
            await pipeline(
              base,
              token,
              `CREATE TABLE IF NOT EXISTS portfolio_blobs (
                id TEXT PRIMARY KEY,
                filename TEXT,
                mime TEXT,
                size INTEGER,
                data_url TEXT
              )`,
            );
          })().catch((err) => {
            ready = null;
            throw err;
          });
        }
        await ready;
        return true;
      }

      server.middlewares.use("/api/portfolio", async (req, res) => {
        if (!base || !token) {
          res.statusCode = 503;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "turso not configured" }));
          return;
        }
        try {
          await ensure();
          const path = (req.url || "").split("?")[0];
          if (req.method === "GET" && path === "/posts") {
            const payload = await pipeline(
              base,
              token,
              "SELECT id, author_handle, content, town_tag, media_blobs, created_at FROM portfolio_posts ORDER BY id DESC LIMIT 100",
            );
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: true, rows: rowsOf(payload) }));
            return;
          }
          if (req.method === "GET" && path === "/blob") {
            const id = new URL(req.url, "http://blkspace.local").searchParams.get("id");
            const payload = await pipeline(
              base,
              token,
              "SELECT id, filename, mime, size, data_url FROM portfolio_blobs WHERE id = ?",
              [id],
            );
            const row = rowsOf(payload)[0] ?? null;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: true, row }));
            return;
          }
          if (req.method === "POST" && (path === "/post" || path === "/blob")) {
            const body = JSON.parse((await readBody(req)) || "{}");
            if (path === "/post") {
              await pipeline(
                base,
                token,
                `INSERT INTO portfolio_posts (id, author_handle, content, town_tag, media_blobs, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                   content = excluded.content,
                   media_blobs = excluded.media_blobs`,
                [
                  body.id,
                  body.authorHandle ?? "",
                  body.content ?? "",
                  body.townTag ?? "",
                  JSON.stringify(body.mediaBlobs ?? []),
                  body.createdAt ?? "",
                ],
              );
            } else if (body.dataUrl && String(body.dataUrl).length < 400_000) {
              await pipeline(
                base,
                token,
                `INSERT INTO portfolio_blobs (id, filename, mime, size, data_url)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET data_url = excluded.data_url`,
                [body.id, body.filename, body.mime, body.size ?? 0, body.dataUrl],
              );
            } else {
              await pipeline(
                base,
                token,
                `INSERT INTO portfolio_blobs (id, filename, mime, size, data_url)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO NOTHING`,
                [body.id, body.filename, body.mime, body.size ?? 0, ""],
              );
            }
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: true }));
            return;
          }
          res.statusCode = 404;
          res.end();
        } catch (err) {
          res.statusCode = 502;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
        }
      });
    },
  };
}
