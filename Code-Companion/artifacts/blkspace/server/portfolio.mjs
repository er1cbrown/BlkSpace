import { randomUUID } from "node:crypto";
import { HttpError } from "./http.mjs";

const MAX_POSTS_PAGE = 100;
const DEFAULT_POSTS_PAGE = 100;
const POST_UID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const HANDLE_RE = /^[a-z0-9_-]{3,30}$/i;

function arg(value) {
  if (value === null || value === undefined) return { type: "null" };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { type: "integer", value: String(value) }
      : { type: "float", value: String(value) };
  }
  return { type: "text", value: String(value) };
}

function normalizePostUid(value, legacyId) {
  if (value === undefined || value === null || value === "") {
    if (legacyId) return `legacy:${legacyId}`;
    return null;
  }
  if (typeof value !== "string" || !POST_UID_RE.test(value)) {
    throw new HttpError(400, "postUid must be a stable 8-128 character identifier.");
  }
  return value;
}

function randomRemoteId() {
  // 53 bits keeps the value safe for JavaScript clients while avoiding the
  // small per-device autoincrement ranges used by the native app.
  const hex = randomUUID().replaceAll("-", "").slice(0, 14);
  const value = BigInt(`0x${hex}`) & ((1n << 53n) - 1n);
  return Number(value || 1n);
}

function encodeCursor(row) {
  return Buffer.from(
    JSON.stringify({
      updatedAt: row.updated_at || row.created_at,
      id: String(row.id),
    }),
    "utf8",
  ).toString("base64url");
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const id = String(parsed.id);
    if (
      typeof parsed.updatedAt !== "string" ||
      !/^\d+$/.test(id) ||
      !Number.isSafeInteger(Number(id))
    ) {
      throw new Error("invalid cursor");
    }
    return { updatedAt: parsed.updatedAt, id: Number(id) };
  } catch {
    throw new HttpError(400, "Invalid portfolio cursor.");
  }
}

function sameMedia(left, right) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
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

  async function optionalQuery(sql, args = []) {
    // Migrations are additive. The table creation above is authoritative;
    // older deployments may already have some columns/indexes, and the
    // user-facing query wrapper intentionally hides SQL error text.
    try {
      await query(sql, args);
    } catch {
      // Best effort only; a later schema-dependent statement will surface a
      // real storage error if the database is actually unavailable.
    }
  }

  async function ensure() {
    if (!ready)
      ready = (async () => {
        await query(`CREATE TABLE IF NOT EXISTS portfolio_posts (
          id INTEGER PRIMARY KEY,
          post_uid TEXT,
          author_pubkey TEXT,
          author_handle TEXT,
          content TEXT,
          town_tag TEXT,
          channel_id TEXT DEFAULT '',
          media_blobs TEXT,
          created_at TEXT,
          updated_at TEXT,
          revision INTEGER DEFAULT 1
        )`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_identities (
          handle TEXT PRIMARY KEY COLLATE NOCASE, pubkey TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_post_owners (
          post_id INTEGER PRIMARY KEY, pubkey TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_blobs (
          id TEXT PRIMARY KEY, filename TEXT, mime TEXT, size INTEGER, data_url TEXT)`);

        // These statements are deliberately best-effort for databases created
        // by the first hosted-web release.
        await optionalQuery(
          "ALTER TABLE portfolio_posts ADD COLUMN post_uid TEXT",
        );
        await optionalQuery(
          "ALTER TABLE portfolio_posts ADD COLUMN author_pubkey TEXT",
        );
        await optionalQuery(
          "ALTER TABLE portfolio_posts ADD COLUMN channel_id TEXT DEFAULT ''",
        );
        await optionalQuery("ALTER TABLE portfolio_posts ADD COLUMN updated_at TEXT");
        await optionalQuery(
          "ALTER TABLE portfolio_posts ADD COLUMN revision INTEGER DEFAULT 1",
        );
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_posts_town_time ON portfolio_posts(town_tag, updated_at DESC, id DESC)",
        );
        await optionalQuery(
          "CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_posts_uid ON portfolio_posts(post_uid) WHERE post_uid IS NOT NULL AND post_uid != ''",
        );
        await optionalQuery(
          "CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_identity_pubkey ON portfolio_identities(pubkey)",
        );
      })().catch((error) => {
        ready = undefined;
        throw error;
      });
    await ready;
  }

  function publicPost(row) {
    const remoteId = String(row.id);
    return {
      // Legacy fields remain for the deployed browser client.
      id: remoteId,
      postUid: row.post_uid || `legacy:${remoteId}`,
      post_uid: row.post_uid || `legacy:${remoteId}`,
      remoteId,
      authorHandle: row.author_handle,
      authorPubkey: row.author_pubkey || "",
      // Legacy aliases keep the already-deployed browser client compatible
      // while native clients consume the camelCase contract above.
      author_handle: row.author_handle,
      content: row.content,
      townTag: row.town_tag,
      town_tag: row.town_tag,
      channelId: row.channel_id || "",
      channel_id: row.channel_id || "",
      mediaBlobs: (() => {
        try {
          const parsed = JSON.parse(row.media_blobs || "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
      media_blobs: (() => {
        try {
          const parsed = JSON.parse(row.media_blobs || "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at || row.created_at,
      updated_at: row.updated_at || row.created_at,
      revision: Number(row.revision || 1),
    };
  }

  async function savePost(body, pubkey) {
    const {
      id,
      postUid: requestedPostUid,
      authorHandle: rawHandle,
      content,
      townTag,
      channelId = "",
      mediaBlobs: requestedMedia,
      mediaUrls: requestedUrls,
    } = body;
    const handle = typeof rawHandle === "string" ? rawHandle.trim().toLowerCase() : "";
    const media = requestedMedia ?? requestedUrls ?? [];
    const legacyId =
      Number.isSafeInteger(id) && id > 0 ? id : undefined;
    const postUid = normalizePostUid(requestedPostUid, legacyId);

    if (
      !HANDLE_RE.test(handle) ||
      typeof content !== "string" ||
      content.length > 10_000 ||
      typeof townTag !== "string" ||
      townTag.length > 100 ||
      typeof channelId !== "string" ||
      channelId.length > 100 ||
      !Array.isArray(media) ||
      media.length > 10 ||
      media.some(
        (value) =>
          typeof value !== "string" ||
          value.length > 2048 ||
          !value.startsWith("https://"),
      ) ||
      (!content.trim() && !media.length) ||
      !postUid
    ) {
      throw new HttpError(
        400,
        "Use a valid handle, postUid, post text, and hosted HTTPS attachments.",
      );
    }
    if (!legacyId && !requestedPostUid) {
      throw new HttpError(400, "postUid is required for native posts.");
    }

    await ensure();

    await query(
      "INSERT INTO portfolio_identities (handle, pubkey) VALUES (?, ?) ON CONFLICT(handle) DO NOTHING",
      [handle, pubkey],
    );
    const identity = (
      await query("SELECT pubkey FROM portfolio_identities WHERE handle = ?", [handle])
    )[0];
    if (identity?.pubkey !== pubkey) {
      throw new HttpError(
        409,
        "This handle belongs to another account. Restore its backup or choose another handle.",
      );
    }
    const otherIdentity = (
      await query(
        "SELECT handle FROM portfolio_identities WHERE pubkey = ? AND handle <> ? LIMIT 1",
        [pubkey, handle],
      )
    )[0];
    if (otherIdentity) {
      throw new HttpError(409, "This Nostr key is already bound to another handle.");
    }

    const existing = requestedPostUid
      ? (
          await query(
            `SELECT id, post_uid, author_pubkey, author_handle, content, town_tag,
                    channel_id, media_blobs, created_at, updated_at, revision
               FROM portfolio_posts WHERE post_uid = ? LIMIT 1`,
            [postUid],
          )
        )[0]
      : (
          await query(
            `SELECT id, post_uid, author_pubkey, author_handle, content, town_tag,
                    channel_id, media_blobs, created_at, updated_at, revision
               FROM portfolio_posts WHERE id = ? LIMIT 1`,
            [legacyId],
          )
        )[0];
    if (existing) {
      let existingMedia = [];
      try {
        const parsed = JSON.parse(existing.media_blobs || "[]");
        if (Array.isArray(parsed)) existingMedia = parsed;
      } catch {
        existingMedia = [];
      }
      if (
        (existing.author_pubkey || pubkey) !== pubkey ||
        existing.author_handle !== handle ||
        existing.content !== content ||
        existing.town_tag !== townTag ||
        (existing.channel_id || "") !== channelId ||
        !sameMedia(existingMedia, media)
      ) {
        throw new HttpError(409, "postUid already belongs to different content.");
      }
      return {
        ok: true,
        storage: "cloud",
        id: String(existing.id),
        postUid,
        remoteId: String(existing.id),
        revision: Number(existing.revision || 1),
      };
    }

    // Legacy clients keep their numeric id. Native clients provide a
    // compatibility id for the old deployment, but the new contract assigns
    // the canonical remote id server-side.
    let remoteId = requestedPostUid ? undefined : legacyId;
    if (!remoteId) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = randomRemoteId();
        const collision = (
          await query("SELECT id FROM portfolio_posts WHERE id = ? LIMIT 1", [
            candidate,
          ])
        )[0];
        if (!collision) {
          remoteId = candidate;
          break;
        }
      }
      if (!remoteId) throw new HttpError(503, "Could not allocate a post id.");
    }

    const now = new Date().toISOString();
    await query(
      `INSERT INTO portfolio_posts
       (id, post_uid, author_pubkey, author_handle, content, town_tag,
        channel_id, media_blobs, created_at, updated_at, revision)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        remoteId,
        postUid,
        pubkey,
        handle,
        content,
        townTag,
        channelId,
        JSON.stringify(media),
        now,
        now,
      ],
    );
    await query(
      "INSERT OR IGNORE INTO portfolio_post_owners (post_id, pubkey) VALUES (?, ?)",
      [remoteId, pubkey],
    );

    return {
      ok: true,
      storage: "cloud",
      id: String(remoteId),
      postUid,
      remoteId: String(remoteId),
      revision: 1,
    };
  }

  return {
    savePost,
    async posts({ town = "", limit = DEFAULT_POSTS_PAGE, cursor = "" } = {}) {
      await ensure();
      const boundedLimit = Math.min(
        MAX_POSTS_PAGE,
        Math.max(1, Number.isSafeInteger(Number(limit)) ? Number(limit) : DEFAULT_POSTS_PAGE),
      );
      const decoded = decodeCursor(cursor);
      const where = [];
      const args = [];
      if (town) {
        where.push("town_tag = ?");
        args.push(String(town));
      }
      if (decoded) {
        where.push(
          "(COALESCE(updated_at, created_at) < ? OR (COALESCE(updated_at, created_at) = ? AND id < ?))",
        );
        args.push(decoded.updatedAt, decoded.updatedAt, decoded.id);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const rows = await query(
        `SELECT id, post_uid, author_pubkey, author_handle, content, town_tag,
                channel_id, media_blobs, created_at, updated_at, revision
           FROM portfolio_posts
           ${whereSql}
          ORDER BY COALESCE(updated_at, created_at) DESC, id DESC
          LIMIT ?`,
        [...args, boundedLimit + 1],
      );
      const hasMore = rows.length > boundedLimit;
      const page = rows.slice(0, boundedLimit).map(publicPost);
      return {
        ok: true,
        rows: page,
        nextCursor: hasMore && page.length ? encodeCursor(rows[boundedLimit - 1]) : null,
        serverTime: new Date().toISOString(),
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
