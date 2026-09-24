import { createHash, randomUUID } from "node:crypto";
import { HttpError } from "./http.mjs";
import { isAllowedHostedMediaUrl } from "./media.mjs";

const MAX_POSTS_PAGE = 100;
const DEFAULT_POSTS_PAGE = 100;
const MAX_NOTIFICATIONS_PAGE = 100;
const DEFAULT_NOTIFICATIONS_PAGE = 50;
const MAX_ACTION_UID_LENGTH = 128;
const MAX_REPLY_LENGTH = 10_000;
const POST_UID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const SOCIAL_UID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HANDLE_RE = /^[a-z0-9_-]{3,30}$/i;
const PUBKEY_RE = /^[0-9a-f]{64}$/i;

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
    throw new HttpError(
      400,
      "postUid must be a stable 8-128 character identifier.",
    );
  }
  return value;
}

function normalizeSocialUid(value, label) {
  if (typeof value !== "string") {
    throw new HttpError(400, `${label} must be a stable identifier.`);
  }
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > MAX_ACTION_UID_LENGTH ||
    !SOCIAL_UID_RE.test(normalized)
  ) {
    throw new HttpError(
      400,
      `${label} must be a stable 1-128 character identifier.`,
    );
  }
  return normalized;
}

function normalizeActionUid(value) {
  return normalizeSocialUid(value, "actionUid");
}

function normalizeReplyUid(value) {
  return normalizeSocialUid(value, "replyUid");
}

/**
 * Native posts use a canonical postUid. A numeric string is accepted as a
 * compatibility alias for old numeric-id posts, but it is always resolved to
 * the canonical `legacy:<id>` key before it is stored.
 */
function normalizeInteractionPostUid(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return `legacy:${value}`;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "postUid must be a stable identifier.");
  }
  const normalized = value.trim();
  if (SOCIAL_UID_RE.test(normalized)) return normalized;
  if (/^[1-9]\d{0,15}$/.test(normalized)) {
    const id = Number(normalized);
    if (Number.isSafeInteger(id) && id > 0) return `legacy:${id}`;
  }
  throw new HttpError(400, "postUid must be a stable identifier.");
}

function normalizeHandle(value, label = "handle") {
  if (typeof value !== "string") {
    throw new HttpError(400, `${label} must be a valid handle.`);
  }
  const normalized = value.trim().toLowerCase();
  if (!HANDLE_RE.test(normalized)) {
    throw new HttpError(400, `${label} must be a valid handle.`);
  }
  return normalized;
}

function normalizePubkey(value, label = "pubkey") {
  if (typeof value !== "string" || !PUBKEY_RE.test(value.trim())) {
    throw new HttpError(400, `${label} must be a canonical Nostr pubkey.`);
  }
  return value.trim().toLowerCase();
}

function normalizeContent(value) {
  if (typeof value !== "string" || value.length > MAX_REPLY_LENGTH) {
    throw new HttpError(400, "Reply content must be a non-empty string.");
  }
  if (!value.trim()) {
    throw new HttpError(400, "Reply content must be a non-empty string.");
  }
  return value;
}

function valueFrom(body, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(body, name)) return body[name];
  }
  return undefined;
}

function desiredStateFrom(body, aliases) {
  let found = false;
  let value;
  for (const name of aliases) {
    if (!Object.prototype.hasOwnProperty.call(body, name)) continue;
    const candidate = body[name];
    if (found && candidate !== value) {
      throw new HttpError(400, "Conflicting desired-state fields.");
    }
    found = true;
    value = candidate;
  }
  if (!found || typeof value !== "boolean") {
    throw new HttpError(400, "desiredState must be true or false.");
  }
  return value;
}

function assertActorFields(body, pubkey, extraFields = []) {
  const fields = new Set([
    "actor",
    "actorPubkey",
    "actor_pubkey",
    "fromPubkey",
    "from_pubkey",
    "senderPubkey",
    "sender_pubkey",
    "userPubkey",
    "user_pubkey",
    "recipientPubkey",
    "recipient_pubkey",
    "followerPubkey",
    "follower_pubkey",
    ...extraFields,
  ]);
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
    let supplied = body[field];
    if (supplied && typeof supplied === "object" && !Array.isArray(supplied)) {
      supplied =
        supplied.pubkey ?? supplied.actorPubkey ?? supplied.actor_pubkey;
    }
    if (supplied === undefined || supplied === null) continue;
    if (
      typeof supplied !== "string" ||
      supplied.trim().toLowerCase() !== pubkey
    ) {
      throw new HttpError(403, "The authenticated Nostr pubkey is the actor.");
    }
  }
}

function normalizedForHash(value) {
  if (Array.isArray(value)) return value.map(normalizedForHash);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalizedForHash(value[key])]),
    );
  }
  return value;
}

function requestHash(value) {
  return createHash("sha256")
    .update(JSON.stringify(normalizedForHash(value)))
    .digest("hex");
}

function numberValue(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function booleanValue(value) {
  return (
    value === true ||
    value === 1 ||
    value === 1n ||
    value === "1" ||
    value === "true"
  );
}

function parseMedia(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

function canonicalPostUid(row) {
  return row.post_uid || `legacy:${row.id}`;
}

function boundedPage(value, fallback, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(1, Math.floor(number)));
}

function publicPost(row, viewerPubkey = "") {
  const remoteId = String(row.id);
  const postUid = row.post_uid || `legacy:${remoteId}`;
  const media = parseMedia(row.media_blobs);
  const likesCount = numberValue(row.likes_count);
  const repostsCount = numberValue(row.reposts_count);
  const repliesCount = numberValue(row.replies_count);
  const result = {
    // Legacy fields remain for the deployed browser client.
    id: remoteId,
    postUid,
    post_uid: postUid,
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
    mediaBlobs: media,
    media_blobs: media,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    updated_at: row.updated_at || row.created_at,
    revision: Number(row.revision || 1),
    likes: likesCount,
    likesCount,
    likes_count: likesCount,
    reposts: repostsCount,
    repostsCount,
    reposts_count: repostsCount,
    replies: repliesCount,
    repliesCount,
    replies_count: repliesCount,
    liked: viewerPubkey ? booleanValue(row.liked) : false,
    reposted: viewerPubkey ? booleanValue(row.reposted) : false,
  };
  if (viewerPubkey) {
    result.viewerState = {
      liked: result.liked,
      reposted: result.reposted,
    };
  }
  return result;
}

function publicReply(row) {
  const replyUid = row.reply_uid;
  return {
    id: replyUid,
    replyUid,
    reply_uid: replyUid,
    postUid: row.post_uid,
    post_uid: row.post_uid,
    parentPostUid: row.post_uid,
    parent_post_uid: row.post_uid,
    authorHandle: row.author_handle || "",
    author_handle: row.author_handle || "",
    authorPubkey: row.author_pubkey,
    author_pubkey: row.author_pubkey,
    parentAuthorPubkey: row.parent_author_pubkey || "",
    parent_author_pubkey: row.parent_author_pubkey || "",
    content: row.content,
    townTag: row.town_tag || "",
    town_tag: row.town_tag || "",
    channelId: row.channel_id || "",
    channel_id: row.channel_id || "",
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    updated_at: row.updated_at || row.created_at,
  };
}

function publicNotification(row) {
  const id = row.notification_id;
  const read = Boolean(row.read_at);
  return {
    id,
    notificationId: id,
    notification_id: id,
    rowId: String(row.id),
    type: row.notification_type,
    notificationType: row.notification_type,
    notification_type: row.notification_type,
    recipientPubkey: row.recipient_pubkey,
    recipient_pubkey: row.recipient_pubkey,
    actorPubkey: row.actor_pubkey,
    actor_pubkey: row.actor_pubkey,
    fromPubkey: row.actor_pubkey,
    from_pubkey: row.actor_pubkey,
    fromHandle: row.actor_handle || "",
    from_handle: row.actor_handle || "",
    actionUid: row.action_uid,
    action_uid: row.action_uid,
    postUid: row.post_uid || null,
    post_uid: row.post_uid || null,
    replyUid: row.reply_uid || null,
    reply_uid: row.reply_uid || null,
    targetPubkey: row.target_pubkey || null,
    target_pubkey: row.target_pubkey || null,
    message: row.message || "",
    createdAt: row.created_at,
    created_at: row.created_at,
    readAt: row.read_at || null,
    read_at: row.read_at || null,
    read,
    unread: !read,
  };
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

        // Social state is deliberately hosted and durable. The action ledger
        // is scoped to the authenticated pubkey, while each desired-state
        // table has a primary key that makes retries and replays harmless.
        await query(`CREATE TABLE IF NOT EXISTS portfolio_social_actions (
          actor_pubkey TEXT NOT NULL,
          action_uid TEXT NOT NULL,
          action_type TEXT NOT NULL,
          request_hash TEXT NOT NULL,
          result_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (actor_pubkey, action_uid)
        )`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_social_mutations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          actor_pubkey TEXT NOT NULL,
          action_uid TEXT NOT NULL,
          mutation_type TEXT NOT NULL,
          entity_key TEXT NOT NULL,
          desired_state INTEGER NOT NULL DEFAULT 0 CHECK (desired_state IN (0, 1)),
          result_json TEXT,
          created_at TEXT NOT NULL,
          UNIQUE (actor_pubkey, action_uid)
        )`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_likes (
          post_uid TEXT NOT NULL,
          post_id INTEGER,
          actor_pubkey TEXT NOT NULL,
          desired_state INTEGER NOT NULL DEFAULT 0 CHECK (desired_state IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (post_uid, actor_pubkey)
        )`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_reposts (
          post_uid TEXT NOT NULL,
          post_id INTEGER,
          actor_pubkey TEXT NOT NULL,
          desired_state INTEGER NOT NULL DEFAULT 0 CHECK (desired_state IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (post_uid, actor_pubkey)
        )`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_replies (
          reply_uid TEXT PRIMARY KEY,
          post_uid TEXT NOT NULL,
          post_id INTEGER,
          author_pubkey TEXT NOT NULL,
          author_handle TEXT NOT NULL DEFAULT '',
          content TEXT NOT NULL,
          town_tag TEXT NOT NULL DEFAULT '',
          channel_id TEXT NOT NULL DEFAULT '',
          parent_author_pubkey TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_follows (
          follower_pubkey TEXT NOT NULL,
          target_pubkey TEXT NOT NULL,
          desired_state INTEGER NOT NULL DEFAULT 0 CHECK (desired_state IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (follower_pubkey, target_pubkey)
        )`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          notification_id TEXT NOT NULL UNIQUE,
          recipient_pubkey TEXT NOT NULL,
          actor_pubkey TEXT NOT NULL,
          notification_type TEXT NOT NULL,
          action_uid TEXT NOT NULL,
          post_uid TEXT,
          reply_uid TEXT,
          target_pubkey TEXT,
          message TEXT NOT NULL,
          created_at TEXT NOT NULL,
          read_at TEXT,
          UNIQUE (recipient_pubkey, actor_pubkey, action_uid)
        )`);

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
        await optionalQuery(
          "ALTER TABLE portfolio_posts ADD COLUMN updated_at TEXT",
        );
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
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_social_actions_created ON portfolio_social_actions(actor_pubkey, created_at DESC)",
        );
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_social_mutations_entity ON portfolio_social_mutations(actor_pubkey, entity_key, created_at DESC)",
        );
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_likes_post_state ON portfolio_likes(post_uid, desired_state)",
        );
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_likes_actor ON portfolio_likes(actor_pubkey, updated_at DESC)",
        );
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_reposts_post_state ON portfolio_reposts(post_uid, desired_state)",
        );
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_reposts_actor ON portfolio_reposts(actor_pubkey, updated_at DESC)",
        );
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_replies_post ON portfolio_replies(post_uid, created_at DESC, reply_uid)",
        );
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_replies_author ON portfolio_replies(author_pubkey, created_at DESC)",
        );
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_follows_target_state ON portfolio_follows(target_pubkey, desired_state)",
        );
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_follows_actor ON portfolio_follows(follower_pubkey, updated_at DESC)",
        );
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_notifications_recipient_time ON portfolio_notifications(recipient_pubkey, created_at DESC, id DESC)",
        );
        await optionalQuery(
          "CREATE INDEX IF NOT EXISTS idx_portfolio_notifications_unread ON portfolio_notifications(recipient_pubkey, read_at, created_at DESC)",
        );
      })().catch((error) => {
        ready = undefined;
        throw error;
      });
    await ready;
  }

  function publicPostRow(row, viewerPubkey = "") {
    return publicPost(row, viewerPubkey);
  }

  async function actionFor(actorPubkey, actionUid) {
    return (
      (
        await query(
          `SELECT actor_pubkey, action_uid, action_type, request_hash, result_json
             FROM portfolio_social_actions
            WHERE actor_pubkey = ? AND action_uid = ? LIMIT 1`,
          [actorPubkey, actionUid],
        )
      )[0] || null
    );
  }

  function actionResult(row) {
    try {
      const parsed = JSON.parse(row.result_json);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("invalid action result");
      }
      return parsed;
    } catch {
      throw new HttpError(502, "Stored social action could not be read.");
    }
  }

  async function recordMutation({
    actorPubkey,
    actionUid,
    mutationType,
    entityKey,
    desiredState,
    result,
  }) {
    await query(
      `INSERT OR IGNORE INTO portfolio_social_mutations
       (actor_pubkey, action_uid, mutation_type, entity_key, desired_state,
        result_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        actorPubkey,
        actionUid,
        mutationType,
        entityKey,
        desiredState ? 1 : 0,
        JSON.stringify(result),
        new Date().toISOString(),
      ],
    );
  }

  async function runAction({
    actorPubkey,
    actionUid,
    actionType,
    fingerprint,
    operation,
  }) {
    const existing = await actionFor(actorPubkey, actionUid);
    if (existing) {
      if (
        existing.action_type !== actionType ||
        existing.request_hash !== fingerprint
      ) {
        throw new HttpError(
          409,
          "actionUid was already used for a different social action.",
        );
      }
      return actionResult(existing);
    }

    const result = await operation();
    const encoded = JSON.stringify(result);
    try {
      await query(
        `INSERT INTO portfolio_social_actions
         (actor_pubkey, action_uid, action_type, request_hash, result_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          actorPubkey,
          actionUid,
          actionType,
          fingerprint,
          encoded,
          new Date().toISOString(),
        ],
      );
    } catch (error) {
      // A concurrent request may have committed the same action first. Return
      // its durable result if it is the same request; never overwrite it.
      const raced = await actionFor(actorPubkey, actionUid).catch(() => null);
      if (raced) {
        if (
          raced.action_type === actionType &&
          raced.request_hash === fingerprint
        ) {
          return actionResult(raced);
        }
        throw new HttpError(
          409,
          "actionUid was already used for a different social action.",
        );
      }
      throw error;
    }
    return result;
  }

  async function identityForHandle(handle) {
    return (
      (
        await query(
          "SELECT handle, pubkey FROM portfolio_identities WHERE handle = ? LIMIT 1",
          [handle],
        )
      )[0] || null
    );
  }

  async function identityForPubkey(pubkey) {
    return (
      (
        await query(
          "SELECT handle, pubkey FROM portfolio_identities WHERE pubkey = ? LIMIT 1",
          [pubkey],
        )
      )[0] || null
    );
  }

  async function postForInteraction(postUid) {
    let row = (
      await query(
        `SELECT id, post_uid, author_pubkey, author_handle, content, town_tag,
                channel_id, media_blobs, created_at, updated_at, revision
           FROM portfolio_posts WHERE post_uid = ? LIMIT 1`,
        [postUid],
      )
    )[0];
    if (!row && /^legacy:(\d+)$/.test(postUid)) {
      const id = Number(postUid.slice("legacy:".length));
      if (Number.isSafeInteger(id) && id > 0) {
        row = (
          await query(
            `SELECT id, post_uid, author_pubkey, author_handle, content, town_tag,
                    channel_id, media_blobs, created_at, updated_at, revision
               FROM portfolio_posts WHERE id = ? LIMIT 1`,
            [id],
          )
        )[0];
      }
    }
    if (!row) throw new HttpError(404, "The parent post does not exist.");
    return { ...row, canonicalPostUid: canonicalPostUid(row) };
  }

  async function parentAuthor(post) {
    if (post.author_pubkey && PUBKEY_RE.test(post.author_pubkey)) {
      return post.author_pubkey.toLowerCase();
    }
    if (post.author_handle) {
      const identity = await identityForHandle(
        String(post.author_handle).toLowerCase(),
      );
      if (identity?.pubkey && PUBKEY_RE.test(identity.pubkey)) {
        return String(identity.pubkey).toLowerCase();
      }
    }
    return "";
  }

  async function postSnapshot(postUid, viewerPubkey = "") {
    let sql = `SELECT
          (SELECT COUNT(*) FROM portfolio_likes
            WHERE post_uid = ? AND desired_state = 1) AS likes_count,
          (SELECT COUNT(*) FROM portfolio_reposts
            WHERE post_uid = ? AND desired_state = 1) AS reposts_count,
          (SELECT COUNT(*) FROM portfolio_replies
            WHERE post_uid = ?) AS replies_count`;
    const args = [postUid, postUid, postUid];
    if (viewerPubkey) {
      sql += `,
          (SELECT COUNT(*) FROM portfolio_likes
            WHERE post_uid = ? AND actor_pubkey = ? AND desired_state = 1) AS liked,
          (SELECT COUNT(*) FROM portfolio_reposts
            WHERE post_uid = ? AND actor_pubkey = ? AND desired_state = 1) AS reposted`;
      args.push(postUid, viewerPubkey, postUid, viewerPubkey);
    }
    const row = (await query(sql, args))[0] || {};
    const counts = {
      likes: numberValue(row.likes_count),
      reposts: numberValue(row.reposts_count),
      replies: numberValue(row.replies_count),
    };
    return {
      counts,
      likes: counts.likes,
      reposts: counts.reposts,
      replies: counts.replies,
      likesCount: counts.likes,
      repostsCount: counts.reposts,
      repliesCount: counts.replies,
      viewerState: viewerPubkey
        ? {
            liked: booleanValue(row.liked),
            reposted: booleanValue(row.reposted),
          }
        : undefined,
    };
  }

  function notificationId(type, recipient, actor, actionUid) {
    const digest = requestHash({
      type,
      recipient,
      actor,
      actionUid,
    });
    return `n_${digest.slice(0, 32)}`;
  }

  async function createNotification({
    type,
    recipient,
    actor,
    actionUid,
    postUid = "",
    replyUid = "",
    targetPubkey = "",
  }) {
    if (!recipient || recipient === actor) return;
    const messages = {
      like: "liked your post",
      repost: "reposted your post",
      reply: "replied to your post",
      follow: "followed you",
    };
    const id = notificationId(type, recipient, actor, actionUid);
    await query(
      `INSERT OR IGNORE INTO portfolio_notifications
       (notification_id, recipient_pubkey, actor_pubkey, notification_type,
        action_uid, post_uid, reply_uid, target_pubkey, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        recipient,
        actor,
        type,
        actionUid,
        postUid || null,
        replyUid || null,
        targetPubkey || null,
        messages[type] || "interacted with your account",
        new Date().toISOString(),
      ],
    );
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
    const handle =
      typeof rawHandle === "string" ? rawHandle.trim().toLowerCase() : "";
    const media = requestedMedia ?? requestedUrls ?? [];
    const legacyId = Number.isSafeInteger(id) && id > 0 ? id : undefined;
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
          !isAllowedHostedMediaUrl(value, env),
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
      await query("SELECT pubkey FROM portfolio_identities WHERE handle = ?", [
        handle,
      ])
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
      throw new HttpError(
        409,
        "This Nostr key is already bound to another handle.",
      );
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
        throw new HttpError(
          409,
          "postUid already belongs to different content.",
        );
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

  async function registerIdentity(body, pubkey) {
    const actorPubkey = normalizePubkey(pubkey);
    assertActorFields(body, actorPubkey);
    const handle = normalizeHandle(
      valueFrom(body, ["handle", "userHandle", "user_handle"]),
      "handle",
    );
    await ensure();
    const byHandle = await identityForHandle(handle);
    if (byHandle && String(byHandle.pubkey).toLowerCase() !== actorPubkey) {
      throw new HttpError(409, "That handle is already linked to another key.");
    }
    const byPubkey = await identityForPubkey(actorPubkey);
    if (byPubkey && String(byPubkey.handle).toLowerCase() !== handle) {
      throw new HttpError(409, "That key is already linked to another handle.");
    }
    await query(
      `INSERT INTO portfolio_identities (handle, pubkey)
       VALUES (?, ?)
       ON CONFLICT(handle) DO UPDATE SET pubkey = excluded.pubkey`,
      [handle, actorPubkey],
    );
    return {
      ok: true,
      handle,
      pubkey: actorPubkey,
      actorPubkey,
    };
  }

  async function setReaction(type, body, pubkey) {
    const actorPubkey = normalizePubkey(pubkey);
    assertActorFields(body, actorPubkey);
    const postUid = normalizeInteractionPostUid(
      valueFrom(body, ["postUid", "post_uid"]),
    );
    const desiredState = desiredStateFrom(body, [
      "desiredState",
      "desired_state",
      type === "like" ? "liked" : "reposted",
      "state",
    ]);
    const actionUid = normalizeActionUid(
      valueFrom(body, [
        "actionUid",
        "action_uid",
        "mutationUid",
        "mutation_uid",
      ]),
    );
    const fingerprint = requestHash({ type, postUid, desiredState });

    return runAction({
      actorPubkey,
      actionUid,
      actionType: type,
      fingerprint,
      operation: async () => {
        const post = await postForInteraction(postUid);
        const table = type === "like" ? "portfolio_likes" : "portfolio_reposts";
        const previous = (
          await query(
            `SELECT desired_state FROM ${table}
              WHERE post_uid = ? AND actor_pubkey = ? LIMIT 1`,
            [post.canonicalPostUid, actorPubkey],
          )
        )[0];
        const now = new Date().toISOString();
        await query(
          `INSERT INTO ${table}
             (post_uid, post_id, actor_pubkey, desired_state, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(post_uid, actor_pubkey) DO UPDATE SET
             desired_state = excluded.desired_state,
             updated_at = excluded.updated_at`,
          [
            post.canonicalPostUid,
            post.id,
            actorPubkey,
            desiredState ? 1 : 0,
            now,
            now,
          ],
        );

        const result = {
          ok: true,
          actionUid,
          type,
          postUid: post.canonicalPostUid,
          actorPubkey,
          desiredState,
          state: desiredState,
          [type === "like" ? "liked" : "reposted"]: desiredState,
          ...(await postSnapshot(post.canonicalPostUid, actorPubkey)),
        };
        await recordMutation({
          actorPubkey,
          actionUid,
          mutationType: type,
          entityKey: post.canonicalPostUid,
          desiredState,
          result,
        });
        if (desiredState && !booleanValue(previous?.desired_state)) {
          await createNotification({
            type,
            recipient: await parentAuthor(post),
            actor: actorPubkey,
            actionUid,
            postUid: post.canonicalPostUid,
          });
        }
        return result;
      },
    });
  }

  async function createReply(body, pubkey) {
    const actorPubkey = normalizePubkey(pubkey);
    assertActorFields(body, actorPubkey, ["authorPubkey", "author_pubkey"]);
    const postUid = normalizeInteractionPostUid(
      valueFrom(body, [
        "postUid",
        "post_uid",
        "parentPostUid",
        "parent_post_uid",
      ]),
    );
    const replyUid = normalizeReplyUid(
      valueFrom(body, ["replyUid", "reply_uid", "id"]),
    );
    const content = normalizeContent(valueFrom(body, ["content", "text"]));
    const actionUid = normalizeActionUid(
      valueFrom(body, [
        "actionUid",
        "action_uid",
        "mutationUid",
        "mutation_uid",
      ]),
    );
    const fingerprint = requestHash({
      type: "reply",
      postUid,
      replyUid,
      content,
    });

    return runAction({
      actorPubkey,
      actionUid,
      actionType: "reply",
      fingerprint,
      operation: async () => {
        const post = await postForInteraction(postUid);
        const existing = (
          await query(
            `SELECT reply_uid, post_uid, post_id, author_pubkey, author_handle,
                    content, town_tag, channel_id, parent_author_pubkey,
                    created_at, updated_at
               FROM portfolio_replies WHERE reply_uid = ? LIMIT 1`,
            [replyUid],
          )
        )[0];
        if (
          existing &&
          (existing.author_pubkey !== actorPubkey ||
            existing.post_uid !== post.canonicalPostUid ||
            existing.content !== content)
        ) {
          throw new HttpError(
            409,
            "replyUid already belongs to different reply content.",
          );
        }

        const created = !existing;
        let reply = existing;
        if (created) {
          const identity = await identityForPubkey(actorPubkey);
          const author = await parentAuthor(post);
          const now = new Date().toISOString();
          await query(
            `INSERT OR IGNORE INTO portfolio_replies
             (reply_uid, post_uid, post_id, author_pubkey, author_handle,
              content, town_tag, channel_id, parent_author_pubkey,
              created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              replyUid,
              post.canonicalPostUid,
              post.id,
              actorPubkey,
              identity?.handle || "",
              content,
              post.town_tag || "",
              post.channel_id || "",
              author,
              now,
              now,
            ],
          );
          reply = (
            await query(
              `SELECT reply_uid, post_uid, post_id, author_pubkey, author_handle,
                      content, town_tag, channel_id, parent_author_pubkey,
                      created_at, updated_at
                 FROM portfolio_replies WHERE reply_uid = ? LIMIT 1`,
              [replyUid],
            )
          )[0];
          if (
            !reply ||
            reply.author_pubkey !== actorPubkey ||
            reply.post_uid !== post.canonicalPostUid ||
            reply.content !== content
          ) {
            throw new HttpError(
              409,
              "replyUid already belongs to different reply content.",
            );
          }
          await createNotification({
            type: "reply",
            recipient: author,
            actor: actorPubkey,
            actionUid,
            postUid: post.canonicalPostUid,
            replyUid,
          });
        }

        const snapshot = await postSnapshot(post.canonicalPostUid, actorPubkey);
        const result = {
          ok: true,
          actionUid,
          type: "reply",
          postUid: post.canonicalPostUid,
          replyUid,
          actorPubkey,
          content,
          authorPubkey: actorPubkey,
          authorHandle: reply.author_handle || "",
          townTag: post.town_tag || "",
          channelId: post.channel_id || "",
          parentAuthorPubkey: reply.parent_author_pubkey || "",
          reply: publicReply(reply),
          ...snapshot,
          viewerState: {
            ...(snapshot.viewerState || {}),
            replied: true,
          },
        };
        await recordMutation({
          actorPubkey,
          actionUid,
          mutationType: "reply",
          entityKey: replyUid,
          desiredState: true,
          result,
        });
        return result;
      },
    });
  }

  function followSpecFrom(body) {
    const target = body.target;
    const objectTarget =
      target && typeof target === "object" && !Array.isArray(target)
        ? target
        : {};
    const handleValue = valueFrom(body, [
      "targetHandle",
      "target_handle",
      "handle",
    ]);
    const pubkeyValue = valueFrom(body, [
      "targetPubkey",
      "target_pubkey",
      "pubkey",
    ]);
    const nestedHandle = objectTarget.handle;
    const nestedPubkey = objectTarget.pubkey || objectTarget.actorPubkey;
    const selectedHandle = handleValue ?? nestedHandle;
    const selectedPubkey = pubkeyValue ?? nestedPubkey;
    if (selectedHandle === undefined && selectedPubkey === undefined) {
      if (typeof target === "string") {
        if (PUBKEY_RE.test(target.trim())) {
          return {
            handle: null,
            pubkey: normalizePubkey(target, "targetPubkey"),
          };
        }
        return {
          handle: normalizeHandle(target, "targetHandle"),
          pubkey: null,
        };
      }
      throw new HttpError(400, "targetHandle or targetPubkey is required.");
    }
    return {
      handle:
        selectedHandle === undefined || selectedHandle === null
          ? null
          : normalizeHandle(selectedHandle, "targetHandle"),
      pubkey:
        selectedPubkey === undefined || selectedPubkey === null
          ? null
          : normalizePubkey(selectedPubkey, "targetPubkey"),
    };
  }

  async function resolveFollowTarget(spec, actorPubkey) {
    if (spec.pubkey === actorPubkey) {
      throw new HttpError(400, "An account cannot follow itself.");
    }
    let identity = null;
    if (spec.pubkey) {
      identity = await identityForPubkey(spec.pubkey);
      if (!identity) {
        const post = (
          await query(
            `SELECT author_pubkey, author_handle FROM portfolio_posts
              WHERE author_pubkey = ? LIMIT 1`,
            [spec.pubkey],
          )
        )[0];
        if (post?.author_pubkey) {
          identity = {
            pubkey: String(post.author_pubkey).toLowerCase(),
            handle: post.author_handle || "",
          };
        }
      }
    } else {
      identity = await identityForHandle(spec.handle);
    }
    if (!identity?.pubkey) {
      throw new HttpError(404, "The follow target does not exist.");
    }
    const targetPubkey = String(identity.pubkey).toLowerCase();
    if (!PUBKEY_RE.test(targetPubkey)) {
      throw new HttpError(404, "The follow target does not exist.");
    }
    const targetHandle = identity.handle
      ? String(identity.handle).toLowerCase()
      : "";
    if (spec.handle && targetHandle && spec.handle !== targetHandle) {
      throw new HttpError(400, "targetHandle and targetPubkey do not match.");
    }
    if (targetPubkey === actorPubkey) {
      throw new HttpError(400, "An account cannot follow itself.");
    }
    return { pubkey: targetPubkey, handle: targetHandle };
  }

  async function setFollow(body, pubkey) {
    const actorPubkey = normalizePubkey(pubkey);
    assertActorFields(body, actorPubkey);
    const desiredState = desiredStateFrom(body, [
      "desiredState",
      "desired_state",
      "following",
      "isFollowing",
      "state",
    ]);
    const actionUid = normalizeActionUid(
      valueFrom(body, [
        "actionUid",
        "action_uid",
        "mutationUid",
        "mutation_uid",
      ]),
    );
    const spec = followSpecFrom(body);
    const fingerprint = requestHash({
      type: "follow",
      targetHandle: spec.handle,
      targetPubkey: spec.pubkey,
      desiredState,
    });

    return runAction({
      actorPubkey,
      actionUid,
      actionType: "follow",
      fingerprint,
      operation: async () => {
        const target = await resolveFollowTarget(spec, actorPubkey);
        const previous = (
          await query(
            `SELECT desired_state FROM portfolio_follows
              WHERE follower_pubkey = ? AND target_pubkey = ? LIMIT 1`,
            [actorPubkey, target.pubkey],
          )
        )[0];
        const now = new Date().toISOString();
        await query(
          `INSERT INTO portfolio_follows
             (follower_pubkey, target_pubkey, desired_state, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(follower_pubkey, target_pubkey) DO UPDATE SET
             desired_state = excluded.desired_state,
             updated_at = excluded.updated_at`,
          [actorPubkey, target.pubkey, desiredState ? 1 : 0, now, now],
        );
        const followerCount = numberValue(
          (
            await query(
              `SELECT COUNT(*) AS followers_count FROM portfolio_follows
                WHERE target_pubkey = ? AND desired_state = 1`,
              [target.pubkey],
            )
          )[0]?.followers_count,
        );
        const followingCount = numberValue(
          (
            await query(
              `SELECT COUNT(*) AS following_count FROM portfolio_follows
                WHERE follower_pubkey = ? AND desired_state = 1`,
              [actorPubkey],
            )
          )[0]?.following_count,
        );
        const result = {
          ok: true,
          actionUid,
          type: "follow",
          targetHandle: target.handle || null,
          targetPubkey: target.pubkey,
          target: {
            handle: target.handle || null,
            pubkey: target.pubkey,
          },
          actorPubkey,
          desiredState,
          following: desiredState,
          counts: {
            followers: followerCount,
            following: followingCount,
          },
          followersCount: followerCount,
          followingCount,
          viewerState: { following: desiredState },
        };
        await recordMutation({
          actorPubkey,
          actionUid,
          mutationType: "follow",
          entityKey: target.pubkey,
          desiredState,
          result,
        });
        if (desiredState && !booleanValue(previous?.desired_state)) {
          await createNotification({
            type: "follow",
            recipient: target.pubkey,
            actor: actorPubkey,
            actionUid,
            targetPubkey: target.pubkey,
          });
        }
        return result;
      },
    });
  }

  async function listFollowing(pubkey) {
    const followerPubkey = normalizePubkey(pubkey);
    await ensure();
    const rows = await query(
      `SELECT f.target_pubkey, COALESCE(i.handle, '') AS handle
         FROM portfolio_follows f
         LEFT JOIN portfolio_identities i ON i.pubkey = f.target_pubkey
        WHERE f.follower_pubkey = ? AND f.desired_state = 1
        ORDER BY COALESCE(i.handle, f.target_pubkey), f.target_pubkey`,
      [followerPubkey],
    );
    const following = rows.map((row) => ({
      pubkey: String(row.target_pubkey).toLowerCase(),
      targetPubkey: String(row.target_pubkey).toLowerCase(),
      handle: row.handle || "",
      following: true,
    }));
    return {
      ok: true,
      rows: following,
      following,
      items: following,
    };
  }

  async function listReplies(
    postUid,
    { limit = DEFAULT_POSTS_PAGE, cursor = "" } = {},
  ) {
    const canonicalPostUid = normalizeInteractionPostUid(postUid);
    await ensure();
    const parent = await postForInteraction(canonicalPostUid);
    const boundedLimit = boundedPage(limit, DEFAULT_POSTS_PAGE, MAX_POSTS_PAGE);
    const decoded = decodeCursor(cursor);
    const where = ["post_uid = ?"];
    const args = [parent.canonicalPostUid];
    if (decoded) {
      where.push("(created_at > ? OR (created_at = ? AND rowid > ?))");
      args.push(decoded.updatedAt, decoded.updatedAt, decoded.id);
    }
    const rows = await query(
      `SELECT rowid AS cursor_id, reply_uid, post_uid, author_pubkey, author_handle, content,
              town_tag, channel_id, parent_author_pubkey, created_at, updated_at
         FROM portfolio_replies
        WHERE ${where.join(" AND ")}
        ORDER BY created_at ASC, rowid ASC
        LIMIT ?`,
      [...args, boundedLimit + 1],
    );
    const hasMore = rows.length > boundedLimit;
    const pageRows = rows.slice(0, boundedLimit);
    const page = pageRows.map(publicReply);
    return {
      ok: true,
      rows: page,
      replies: page,
      items: page,
      nextCursor:
        hasMore && pageRows.length
          ? encodeCursor({
              updated_at: pageRows[pageRows.length - 1].updated_at,
              id: pageRows[pageRows.length - 1].cursor_id,
            })
          : null,
    };
  }

  async function listNotifications(
    pubkey,
    {
      limit = DEFAULT_NOTIFICATIONS_PAGE,
      cursor = "",
      unreadOnly = false,
    } = {},
  ) {
    const recipientPubkey = normalizePubkey(pubkey);
    await ensure();
    const boundedLimit = boundedPage(
      limit,
      DEFAULT_NOTIFICATIONS_PAGE,
      MAX_NOTIFICATIONS_PAGE,
    );
    const decoded = decodeCursor(cursor);
    const where = ["recipient_pubkey = ?"];
    const args = [recipientPubkey];
    if (unreadOnly === true || unreadOnly === "true" || unreadOnly === "1") {
      where.push("read_at IS NULL");
    }
    if (decoded) {
      where.push("(created_at < ? OR (created_at = ? AND id < ?))");
      args.push(decoded.updatedAt, decoded.updatedAt, decoded.id);
    }
    const rows = await query(
      `SELECT n.id, n.notification_id, n.recipient_pubkey, n.actor_pubkey,
              i.handle AS actor_handle, n.notification_type, n.action_uid,
              n.post_uid, n.reply_uid, n.target_pubkey, n.message,
              n.created_at, n.read_at
         FROM portfolio_notifications n
         LEFT JOIN portfolio_identities i ON i.pubkey = n.actor_pubkey
        WHERE ${where.join(" AND ")}
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT ?`,
      [...args, boundedLimit + 1],
    );
    const hasMore = rows.length > boundedLimit;
    const page = rows.slice(0, boundedLimit).map(publicNotification);
    const unread = (
      await query(
        `SELECT COUNT(*) AS unread_count FROM portfolio_notifications
          WHERE recipient_pubkey = ? AND read_at IS NULL`,
        [recipientPubkey],
      )
    )[0];
    return {
      ok: true,
      rows: page,
      notifications: page,
      items: page,
      unreadCount: numberValue(unread?.unread_count),
      nextCursor:
        hasMore && rows.length ? encodeCursor(rows[boundedLimit - 1]) : null,
      serverTime: new Date().toISOString(),
    };
  }

  async function markNotificationsRead(body, pubkey) {
    const recipientPubkey = normalizePubkey(pubkey);
    assertActorFields(body, recipientPubkey);
    await ensure();
    const all =
      body.all === true ||
      body.readAll === true ||
      body.all === "true" ||
      body.readAll === "true";
    let ids = valueFrom(body, ["notificationIds", "notification_ids", "ids"]);
    if (ids === undefined) {
      const single = valueFrom(body, [
        "notificationId",
        "notification_id",
        "id",
      ]);
      if (single !== undefined) ids = [single];
    }
    if (!all) {
      if (!Array.isArray(ids)) {
        throw new HttpError(400, "notificationIds or all is required.");
      }
      if (!ids.length || ids.length > 100) {
        throw new HttpError(400, "Provide between 1 and 100 notification IDs.");
      }
      ids = [
        ...new Set(
          ids.map((value) => {
            if (typeof value !== "string" && typeof value !== "number") {
              throw new HttpError(400, "Notification IDs are invalid.");
            }
            if (
              typeof value === "number" &&
              (!Number.isSafeInteger(value) || value <= 0)
            ) {
              throw new HttpError(400, "Notification IDs are invalid.");
            }
            return String(value);
          }),
        ),
      ];
      if (
        ids.some(
          (value) =>
            !value ||
            value.length > 160 ||
            (typeof value === "string" && value.includes("\0")),
        )
      ) {
        throw new HttpError(400, "Notification IDs are invalid.");
      }
    }

    const now = new Date().toISOString();
    let updatedCount = 0;
    let selected = [];
    if (all) {
      const before = numberValue(
        (
          await query(
            `SELECT COUNT(*) AS unread_count FROM portfolio_notifications
              WHERE recipient_pubkey = ? AND read_at IS NULL`,
            [recipientPubkey],
          )
        )[0]?.unread_count,
      );
      await query(
        `UPDATE portfolio_notifications SET read_at = COALESCE(read_at, ?)
          WHERE recipient_pubkey = ? AND read_at IS NULL`,
        [now, recipientPubkey],
      );
      updatedCount = before;
      selected = (
        await query(
          `SELECT n.id, n.notification_id, n.recipient_pubkey, n.actor_pubkey,
                  i.handle AS actor_handle, n.notification_type, n.action_uid,
                  n.post_uid, n.reply_uid, n.target_pubkey, n.message,
                  n.created_at, n.read_at
             FROM portfolio_notifications n
             LEFT JOIN portfolio_identities i ON i.pubkey = n.actor_pubkey
            WHERE n.recipient_pubkey = ?
            ORDER BY n.created_at DESC, n.id DESC
            LIMIT ?`,
          [recipientPubkey, MAX_NOTIFICATIONS_PAGE],
        )
      ).map(publicNotification);
    } else {
      for (const id of ids) {
        const row = (
          await query(
            `SELECT n.id, n.notification_id, n.recipient_pubkey, n.actor_pubkey,
                    i.handle AS actor_handle, n.notification_type, n.action_uid,
                    n.post_uid, n.reply_uid, n.target_pubkey, n.message,
                    n.created_at, n.read_at
               FROM portfolio_notifications n
               LEFT JOIN portfolio_identities i ON i.pubkey = n.actor_pubkey
              WHERE n.recipient_pubkey = ?
                AND (n.notification_id = ? OR CAST(n.id AS TEXT) = ?)
              LIMIT 1`,
            [recipientPubkey, id, id],
          )
        )[0];
        if (!row) continue;
        if (!row.read_at) updatedCount += 1;
        await query(
          `UPDATE portfolio_notifications SET read_at = COALESCE(read_at, ?)
            WHERE id = ? AND recipient_pubkey = ?`,
          [now, row.id, recipientPubkey],
        );
        const updated = (
          await query(
            `SELECT n.id, n.notification_id, n.recipient_pubkey, n.actor_pubkey,
                    i.handle AS actor_handle, n.notification_type, n.action_uid,
                    n.post_uid, n.reply_uid, n.target_pubkey, n.message,
                    n.created_at, n.read_at
               FROM portfolio_notifications n
               LEFT JOIN portfolio_identities i ON i.pubkey = n.actor_pubkey
              WHERE n.id = ? AND n.recipient_pubkey = ? LIMIT 1`,
            [row.id, recipientPubkey],
          )
        )[0];
        if (updated) selected.push(publicNotification(updated));
      }
    }
    return {
      ok: true,
      updatedCount,
      markedRead: updatedCount,
      count: selected.length,
      rows: selected,
      notifications: selected,
      items: selected,
      serverTime: new Date().toISOString(),
    };
  }

  return {
    savePost,
    async registerIdentity(body, pubkey) {
      return registerIdentity(body, pubkey);
    },
    async setLike(body, pubkey) {
      await ensure();
      return setReaction("like", body, pubkey);
    },
    async setRepost(body, pubkey) {
      await ensure();
      return setReaction("repost", body, pubkey);
    },
    async createReply(body, pubkey) {
      await ensure();
      return createReply(body, pubkey);
    },
    async setFollow(body, pubkey) {
      await ensure();
      return setFollow(body, pubkey);
    },
    async following(pubkey) {
      return listFollowing(pubkey);
    },
    async replies(postUid, options = {}) {
      return listReplies(postUid, options);
    },
    async notifications(pubkey, options = {}) {
      return listNotifications(pubkey, options);
    },
    async markNotificationsRead(body, pubkey) {
      return markNotificationsRead(body, pubkey);
    },
    async posts({
      town = "",
      limit = DEFAULT_POSTS_PAGE,
      cursor = "",
      viewerPubkey = "",
    } = {}) {
      await ensure();
      const boundedLimit = Math.min(
        MAX_POSTS_PAGE,
        Math.max(
          1,
          Number.isSafeInteger(Number(limit))
            ? Number(limit)
            : DEFAULT_POSTS_PAGE,
        ),
      );
      const viewer = viewerPubkey ? normalizePubkey(viewerPubkey) : "";
      const decoded = decodeCursor(cursor);
      const where = [];
      const args = [];
      let select = `SELECT p.id, p.post_uid, p.author_pubkey, p.author_handle,
                             p.content, p.town_tag, p.channel_id, p.media_blobs,
                             p.created_at, p.updated_at, p.revision,
                             (SELECT COUNT(*) FROM portfolio_likes l
                               WHERE l.post_uid = COALESCE(NULLIF(p.post_uid, ''), 'legacy:' || p.id)
                                 AND l.desired_state = 1) AS likes_count,
                             (SELECT COUNT(*) FROM portfolio_reposts r
                               WHERE r.post_uid = COALESCE(NULLIF(p.post_uid, ''), 'legacy:' || p.id)
                                 AND r.desired_state = 1) AS reposts_count,
                             (SELECT COUNT(*) FROM portfolio_replies q
                               WHERE q.post_uid = COALESCE(NULLIF(p.post_uid, ''), 'legacy:' || p.id)) AS replies_count`;
      if (viewer) {
        select += `,
                             (SELECT COUNT(*) FROM portfolio_likes l
                               WHERE l.post_uid = COALESCE(NULLIF(p.post_uid, ''), 'legacy:' || p.id)
                                 AND l.actor_pubkey = ? AND l.desired_state = 1) AS liked,
                             (SELECT COUNT(*) FROM portfolio_reposts r
                               WHERE r.post_uid = COALESCE(NULLIF(p.post_uid, ''), 'legacy:' || p.id)
                                 AND r.actor_pubkey = ? AND r.desired_state = 1) AS reposted`;
        args.push(viewer, viewer);
      }
      if (town) {
        where.push("p.town_tag = ?");
        args.push(String(town));
      }
      if (decoded) {
        where.push(
          "(COALESCE(p.updated_at, p.created_at) < ? OR (COALESCE(p.updated_at, p.created_at) = ? AND p.id < ?))",
        );
        args.push(decoded.updatedAt, decoded.updatedAt, decoded.id);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const rows = await query(
        `${select}
           FROM portfolio_posts p
           ${whereSql}
          ORDER BY COALESCE(p.updated_at, p.created_at) DESC, p.id DESC
          LIMIT ?`,
        [...args, boundedLimit + 1],
      );
      const hasMore = rows.length > boundedLimit;
      const page = rows
        .slice(0, boundedLimit)
        .map((row) => publicPostRow(row, viewer));
      return {
        ok: true,
        rows: page,
        nextCursor:
          hasMore && page.length ? encodeCursor(rows[boundedLimit - 1]) : null,
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
