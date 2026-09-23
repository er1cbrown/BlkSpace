import { HttpError } from "./http.mjs";

function arg(value) {
  return typeof value === "number"
    ? { type: "integer", value: String(value) }
    : { type: "text", value: String(value) };
}

export function createPortfolio(env) {
  const base = (env.TURSO_DATABASE_URL || "")
    .trim()
    .replace(/^libsql:\/\//, "https://")
    .replace(/\/$/, "");
  const token = (env.TURSO_AUTH_TOKEN || "").trim();
  let ready;

  async function query(sql, args = []) {
    if (!base || !token)
      throw new HttpError(503, "Shared post storage is not configured.");
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
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await res.json().catch(() => null);
    const entry = payload?.results?.[0];
    // Hrana returns SQL errors inside a successful HTTP response.
    if (!res.ok || entry?.type !== "ok" || entry.response?.type !== "execute") {
      throw new HttpError(
        502,
        "Shared post storage could not complete the request. Please retry.",
      );
    }
    const result = entry.response.result;
    return (result.rows || []).map((row) =>
      Object.fromEntries(
        result.cols.map((col, i) => [col.name, row[i]?.value ?? null]),
      ),
    );
  }

  async function ensure() {
    if (!ready)
      ready = (async () => {
        // Additive schema: retain existing portfolio posts and their IDs.
        await query(`CREATE TABLE IF NOT EXISTS portfolio_posts (
        id INTEGER PRIMARY KEY, author_handle TEXT, content TEXT,
        town_tag TEXT, media_blobs TEXT, created_at TEXT)`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_identities (
        handle TEXT PRIMARY KEY COLLATE NOCASE, pubkey TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_post_owners (
        post_id INTEGER PRIMARY KEY, pubkey TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_blobs (
        id TEXT PRIMARY KEY, filename TEXT, mime TEXT, size INTEGER, data_url TEXT)`);
      })().catch((err) => {
        ready = undefined;
        throw err;
      });
    await ready;
  }

  async function savePost(body, pubkey) {
    const {
      id,
      authorHandle: handle,
      content,
      townTag,
      mediaBlobs = [],
    } = body;
    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      typeof handle !== "string" ||
      !/^[a-z0-9_]{3,30}$/.test(handle) ||
      typeof content !== "string" ||
      content.length > 10_000 ||
      typeof townTag !== "string" ||
      townTag.length > 100 ||
      !Array.isArray(mediaBlobs) ||
      mediaBlobs.length > 10 ||
      mediaBlobs.some(
        (v) =>
          typeof v !== "string" || v.length > 2048 || !v.startsWith("https://"),
      ) ||
      (!content.trim() && !mediaBlobs.length)
    ) {
      throw new HttpError(
        400,
        "Use a valid handle, post text and hosted HTTPS attachments.",
      );
    }
    await ensure();
    await query(
      "INSERT INTO portfolio_identities (handle, pubkey) VALUES (?, ?) ON CONFLICT(handle) DO NOTHING",
      [handle, pubkey],
    );
    const identity = (
      await query("SELECT pubkey FROM portfolio_identities WHERE handle = ?", [
        handle,
      ])
    )[0];
    if (identity?.pubkey !== pubkey)
      throw new HttpError(
        409,
        "This handle belongs to another account. Restore its backup or choose another handle.",
      );
    // Never take ownership of legacy rows; retries are allowed only for the same key.
    await query(
      `INSERT INTO portfolio_post_owners (post_id, pubkey)
      SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM portfolio_posts WHERE id = ?)
      ON CONFLICT(post_id) DO NOTHING`,
      [id, pubkey, id],
    );
    const owner = (
      await query(
        "SELECT pubkey FROM portfolio_post_owners WHERE post_id = ?",
        [id],
      )
    )[0];
    if (owner?.pubkey !== pubkey)
      throw new HttpError(409, "Post ID already exists. Please retry.");
    await query(
      `INSERT INTO portfolio_posts (id, author_handle, content, town_tag, media_blobs, created_at)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      content = excluded.content, media_blobs = excluded.media_blobs`,
      [
        id,
        handle,
        content,
        townTag,
        JSON.stringify(mediaBlobs),
        new Date().toISOString(),
      ],
    );
    return { ok: true, storage: "cloud" };
  }

  return {
    savePost,
    async posts() {
      await ensure();
      return {
        ok: true,
        rows: await query(
          "SELECT id, author_handle, content, town_tag, media_blobs, created_at FROM portfolio_posts ORDER BY id DESC LIMIT 100",
        ),
      };
    },
    async blob(id) {
      await ensure();
      return {
        ok: true,
        row:
          (
            await query(
              "SELECT id, filename, mime, size, data_url FROM portfolio_blobs WHERE id = ?",
              [id || ""],
            )
          )[0] || null,
      };
    },
  };
}
