import { HttpError } from "./http.mjs";
import { getHbcu } from "../src/lib/hbcu-catalog.ts";
import {
  chainVerifiedSale,
  discAnchorPlan,
  discFormatOf,
  releaseFields,
  sleevePayout,
  stemsOf,
  trackListHash,
  WEIXSOUND_LABEL,
} from "../src/lib/weixsound.ts";
import { encodeWatchTicket, parseWatchSource } from "../src/lib/yard-room-watch.ts";
import { assertSealedEnvelope, DM_PREFIX } from "../src/lib/dm-seal.ts";

export const JOIN_GRANT_WB = 50;
export const YARD_CRED_GATE = 15;

const YARD_RE = /^[a-z0-9-]{2,40}$/;
const HANDLE_RE = /^[a-z0-9_-]{3,30}$/i;
const PHI = [
  "mrn",
  "patient name",
  "date of birth",
  "dob:",
  "ssn",
  "social security",
  "diagnosed with",
  "prescription",
  "hipaa",
  "medical record",
  "room number",
];

function arg(value) {
  if (value === null || value === undefined) return { type: "null" };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { type: "integer", value: String(value) }
      : { type: "float", value: String(value) };
  }
  return { type: "text", value: String(value) };
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function yardId(value) {
  const id = String(value || "").trim().toLowerCase();
  if (!YARD_RE.test(id)) throw new HttpError(400, "Yard id is not recognized.");
  return id;
}

function handleOf(value) {
  if (typeof value !== "string" || !HANDLE_RE.test(value.trim())) {
    throw new HttpError(400, "Save your handle before using this yard.");
  }
  return value.trim().toLowerCase();
}

function text(value, label, max) {
  const out = String(value || "").trim();
  if (!out) throw new HttpError(400, `${label} is required.`);
  if (out.length > max) throw new HttpError(400, `${label} is too long.`);
  return out;
}

function optionalRef(value) {
  const out = String(value || "").trim();
  if (!out) return "";
  if (out.length > 200) throw new HttpError(400, "That reference is too long.");
  if (/[\u0000-\u001f]/.test(out)) throw new HttpError(400, "That reference is not valid.");
  return out;
}

function looksLikePhi(body) {
  const lower = body.toLowerCase();
  return PHI.some((hit) => lower.includes(hit));
}

function externalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, "Live room link must be a normal web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new HttpError(400, "Live room link must be a normal web address.");
  }
  const host = url.hostname.toLowerCase();
  const allowed =
    host === "discord.com" ||
    host.endsWith(".discord.com") ||
    host === "discord.gg" ||
    host.endsWith(".discord.gg") ||
    host === "zoom.us" ||
    host.endsWith(".zoom.us") ||
    host.startsWith("zoom.") ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be" ||
    host.endsWith(".youtu.be") ||
    host === "twitch.tv" ||
    host.endsWith(".twitch.tv") ||
    host === "meet.google.com" ||
    host.endsWith(".meet.google.com") ||
    host === "meet.jit.si" ||
    host.endsWith(".meet.jit.si") ||
    host === "teams.microsoft.com" ||
    host.endsWith(".teams.microsoft.com") ||
    host === "slack.com" ||
    host.endsWith(".slack.com") ||
    host.endsWith(".edu");
  if (!allowed) {
    throw new HttpError(400, "Use a Discord, Slack, Zoom, YouTube, Meet, or .edu link.");
  }
  return url.href;
}

export function createYardDesk(env) {
  const base = (env.TURSO_DATABASE_URL || "")
    .trim()
    .replace(/^libsql:\/\//, "https://")
    .replace(/\/$/, "");
  const token = (env.TURSO_AUTH_TOKEN || "").trim();
  const jellyfinOrigins = String(env.JELLYFIN_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  let ready;

  async function pipeline(sql, args = []) {
    if (!base || !token) {
      throw new HttpError(503, "Shared yard storage is not configured.");
    }
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
    if (!res.ok || entry?.type !== "ok" || entry.response?.type !== "execute") {
      return { rows: [], error: String(entry?.error?.message || "storage") };
    }
    const result = entry.response.result;
    return {
      rows: (result.rows || []).map((row) =>
        Object.fromEntries(result.cols.map((col, i) => [col.name, row[i]?.value ?? null])),
      ),
      error: "",
    };
  }

  async function query(sql, args = []) {
    const result = await pipeline(sql, args);
    if (result.error) {
      throw new HttpError(502, "Shared yard storage could not complete the request. Please retry.");
    }
    return result.rows;
  }

  async function ensureColumn(sql) {
    try {
      const result = await pipeline(sql);
      if (!result.error || /duplicate column/i.test(result.error)) return;
      throw new HttpError(502, "Shared yard storage could not complete the request. Please retry.");
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (/duplicate column/i.test(String(err?.message || err))) return;
      throw err;
    }
  }

  async function ensure() {
    if (!ready) {
      ready = (async () => {
        await query(`CREATE TABLE IF NOT EXISTS portfolio_identities (
          handle TEXT PRIMARY KEY COLLATE NOCASE, pubkey TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS yard_members (
          yard_id TEXT NOT NULL, handle TEXT NOT NULL, joined_at TEXT NOT NULL,
          PRIMARY KEY (yard_id, handle))`);
        await query(`CREATE TABLE IF NOT EXISTS yard_rooms (
          id INTEGER PRIMARY KEY, yard_id TEXT NOT NULL, title TEXT NOT NULL,
          kind TEXT NOT NULL, external_url TEXT, jitsi_slug TEXT NOT NULL,
          created_by TEXT NOT NULL, created_at TEXT NOT NULL, closed INTEGER NOT NULL DEFAULT 0)`);
        await query(`CREATE TABLE IF NOT EXISTS yard_messages (
          id INTEGER PRIMARY KEY, yard_id TEXT NOT NULL, from_handle TEXT NOT NULL,
          to_handle TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS yard_dm_keys (
          handle TEXT PRIMARY KEY, public_jwk TEXT NOT NULL, updated_at TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS yard_watch_clock (
          room_id INTEGER PRIMARY KEY, host_handle TEXT NOT NULL,
          position_ms INTEGER NOT NULL, playing INTEGER NOT NULL, updated_at TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS yard_wb (
          id INTEGER PRIMARY KEY, yard_id TEXT NOT NULL, handle TEXT NOT NULL,
          amount INTEGER NOT NULL, reason TEXT NOT NULL, ref TEXT NOT NULL,
          created_at TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS yard_listings (
          id INTEGER PRIMARY KEY, yard_id TEXT NOT NULL, seller_handle TEXT NOT NULL,
          title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL,
          item_type TEXT NOT NULL DEFAULT 'item', sold_to TEXT, created_at TEXT NOT NULL,
          item_ref TEXT, delivery_hint TEXT, is_nft INTEGER NOT NULL DEFAULT 0,
          fulfillment_mode TEXT NOT NULL DEFAULT 'escrow')`);
        await ensureColumn("ALTER TABLE yard_listings ADD COLUMN item_ref TEXT");
        await ensureColumn("ALTER TABLE yard_listings ADD COLUMN delivery_hint TEXT");
        await ensureColumn(
          "ALTER TABLE yard_listings ADD COLUMN is_nft INTEGER NOT NULL DEFAULT 0",
        );
        await ensureColumn(
          "ALTER TABLE yard_listings ADD COLUMN fulfillment_mode TEXT NOT NULL DEFAULT 'escrow'",
        );
        await query(`CREATE TABLE IF NOT EXISTS yard_escrow (
          id INTEGER PRIMARY KEY, listing_id INTEGER NOT NULL, yard_id TEXT NOT NULL,
          buyer_handle TEXT NOT NULL, seller_handle TEXT NOT NULL, amount INTEGER NOT NULL,
          seller_net INTEGER NOT NULL, platform_fee INTEGER NOT NULL, status TEXT NOT NULL,
          delivery_ref TEXT, title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS yard_marks (
          yard_id TEXT NOT NULL, handle TEXT NOT NULL, school TEXT NOT NULL DEFAULT '',
          short_name TEXT NOT NULL, created_at TEXT NOT NULL,
          PRIMARY KEY (yard_id, handle))`);
        await query(`CREATE TABLE IF NOT EXISTS yard_boards (
          id TEXT PRIMARY KEY, yard_id TEXT NOT NULL, title TEXT NOT NULL,
          author_handle TEXT NOT NULL, created_at TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS yard_pins (
          id TEXT PRIMARY KEY, yard_id TEXT NOT NULL, board_id TEXT NOT NULL,
          title TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', image TEXT NOT NULL,
          author_handle TEXT NOT NULL, created_at TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS yard_mixtapes (
          id TEXT PRIMARY KEY, yard_id TEXT NOT NULL, title TEXT NOT NULL,
          body TEXT NOT NULL DEFAULT '', tracks TEXT NOT NULL, author_handle TEXT NOT NULL,
          author_display TEXT NOT NULL DEFAULT '', price_wb INTEGER NOT NULL DEFAULT 0,
          edition_size INTEGER NOT NULL DEFAULT 1, set_kind TEXT NOT NULL DEFAULT 'songs',
          cover_url TEXT NOT NULL DEFAULT '', credits TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL)`);
        await ensureColumn(
          "ALTER TABLE yard_mixtapes ADD COLUMN set_kind TEXT NOT NULL DEFAULT 'songs'",
        );
        await ensureColumn(
          "ALTER TABLE yard_mixtapes ADD COLUMN cover_url TEXT NOT NULL DEFAULT ''",
        );
        await ensureColumn(
          "ALTER TABLE yard_mixtapes ADD COLUMN credits TEXT NOT NULL DEFAULT ''",
        );
        await ensureColumn(
          "ALTER TABLE yard_mixtapes ADD COLUMN disc_format TEXT NOT NULL DEFAULT ''",
        );
        await ensureColumn(
          "ALTER TABLE yard_mixtapes ADD COLUMN visibility TEXT NOT NULL DEFAULT 'yard'",
        );
        await ensureColumn(
          "ALTER TABLE yard_mixtapes ADD COLUMN store_url TEXT NOT NULL DEFAULT ''",
        );
        await ensureColumn(
          "ALTER TABLE yard_mixtapes ADD COLUMN write_receipt INTEGER NOT NULL DEFAULT 0",
        );
        await ensureColumn(
          "ALTER TABLE yard_mixtapes ADD COLUMN rights_attested INTEGER NOT NULL DEFAULT 0",
        );
        await ensureColumn(
          "ALTER TABLE yard_mixtapes ADD COLUMN splits TEXT NOT NULL DEFAULT ''",
        );
        await ensureColumn(
          "ALTER TABLE yard_mixtapes ADD COLUMN master_id TEXT NOT NULL DEFAULT ''",
        );
        await ensureColumn(
          "ALTER TABLE yard_mixtapes ADD COLUMN label_name TEXT NOT NULL DEFAULT ''",
        );
        await query(`CREATE TABLE IF NOT EXISTS yard_sale_receipts (
          listing_id INTEGER NOT NULL, buyer_handle TEXT NOT NULL, seller_handle TEXT NOT NULL,
          yard_id TEXT NOT NULL, copy_number INTEGER NOT NULL, price_wb INTEGER NOT NULL,
          platform_fee INTEGER NOT NULL, seller_net INTEGER NOT NULL, disc_format TEXT NOT NULL,
          track_hash TEXT NOT NULL, anchor_status TEXT NOT NULL, created_at TEXT NOT NULL,
          PRIMARY KEY (listing_id, buyer_handle))`);
        await query(`CREATE TABLE IF NOT EXISTS yard_edition_claims (
          listing_id INTEGER NOT NULL, buyer_handle TEXT NOT NULL, created_at TEXT NOT NULL,
          copy_number INTEGER NOT NULL DEFAULT 0, ask_wb INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (listing_id, buyer_handle))`);
        await ensureColumn(
          "ALTER TABLE yard_edition_claims ADD COLUMN copy_number INTEGER NOT NULL DEFAULT 0",
        );
        await ensureColumn(
          "ALTER TABLE yard_edition_claims ADD COLUMN ask_wb INTEGER NOT NULL DEFAULT 0",
        );
        await query(`CREATE TABLE IF NOT EXISTS yard_dj_battles (
          id TEXT PRIMARY KEY, yard_id TEXT NOT NULL, title TEXT NOT NULL,
          mix_id TEXT NOT NULL, mix_title TEXT NOT NULL, set_kind TEXT NOT NULL DEFAULT 'songs',
          call_url TEXT NOT NULL DEFAULT '', jitsi_slug TEXT NOT NULL,
          host_handle TEXT NOT NULL, created_at TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS yard_typeverse_races (
          id TEXT PRIMARY KEY, yard_id TEXT NOT NULL, host_handle TEXT NOT NULL,
          mode TEXT NOT NULL, difficulty TEXT NOT NULL, verse_ref TEXT NOT NULL,
          verse_text TEXT NOT NULL, status TEXT NOT NULL, winner_handle TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL, started_at TEXT NOT NULL DEFAULT '')`);
        await query(`CREATE TABLE IF NOT EXISTS yard_typeverse_entries (
          race_id TEXT NOT NULL, handle TEXT NOT NULL, vehicle TEXT NOT NULL DEFAULT '',
          accuracy INTEGER NOT NULL DEFAULT 0, progress INTEGER NOT NULL DEFAULT 0,
          finished_at TEXT NOT NULL DEFAULT '',
          PRIMARY KEY (race_id, handle))`);
      })();
    }
    await ready;
  }

  async function actor(pubkey) {
    const row = (
      await query(
        "SELECT handle FROM portfolio_identities WHERE pubkey = ? LIMIT 1",
        [pubkey],
      )
    )[0];
    if (!row?.handle) throw new HttpError(400, "Save your handle before using this yard.");
    return handleOf(String(row.handle));
  }

  async function requireMember(yard, handle) {
    const row = (
      await query(
        "SELECT 1 AS ok FROM yard_members WHERE yard_id = ? AND handle = ? LIMIT 1",
        [yard, handle],
      )
    )[0];
    if (!row) throw new HttpError(403, "Join the yard first.");
  }

  async function nextId(table) {
    const row = (
      await query(`SELECT COALESCE(MAX(id), 0) + 1 AS n FROM ${table}`)
    )[0];
    return num(row?.n) || 1;
  }

  async function balanceOf(yard, handle) {
    const row = (
      await query(
        "SELECT COALESCE(SUM(amount), 0) AS n FROM yard_wb WHERE yard_id = ? AND handle = ?",
        [yard, handle],
      )
    )[0];
    return num(row?.n);
  }

  async function credit(yard, handle, amount, reason, ref) {
    const existing = (
      await query(
        "SELECT 1 AS ok FROM yard_wb WHERE yard_id = ? AND handle = ? AND ref = ? LIMIT 1",
        [yard, handle, ref],
      )
    )[0];
    if (existing) return balanceOf(yard, handle);
    await query(
      `INSERT INTO yard_wb (id, yard_id, handle, amount, reason, ref, created_at)
       VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
      [yard, handle, amount, reason, ref, new Date().toISOString()],
    );
    return balanceOf(yard, handle);
  }

  function universityFor(yard) {
    const hit = getHbcu(yard);
    if (!hit) return { school: "", shortName: yard, yardLabel: `${yard} yard` };
    return { school: hit.school, shortName: hit.shortName, yardLabel: hit.yardLabel };
  }

  async function yardCred(yard, handle) {
    const count = async (sql) =>
      num((await query(sql, [yard, handle]))[0]?.n);
    const messages = await count(
      "SELECT COUNT(*) AS n FROM yard_messages WHERE yard_id = ? AND from_handle = ?",
    );
    const rooms = await count(
      "SELECT COUNT(*) AS n FROM yard_rooms WHERE yard_id = ? AND created_by = ?",
    );
    const listings = await count(
      "SELECT COUNT(*) AS n FROM yard_listings WHERE yard_id = ? AND seller_handle = ?",
    );
    const sales = num(
      (
        await query(
          `SELECT COUNT(*) AS n FROM yard_escrow
            WHERE yard_id = ? AND status = 'released'
              AND (buyer_handle = ? OR seller_handle = ?)`,
          [yard, handle, handle],
        )
      )[0]?.n,
    );
    return Math.min(100, messages * 4 + rooms * 6 + listings * 6 + sales * 8);
  }

  async function markFor(yard, handle) {
    const row = (
      await query(
        "SELECT school, short_name, created_at FROM yard_marks WHERE yard_id = ? AND handle = ? LIMIT 1",
        [yard, handle],
      )
    )[0];
    if (!row) return null;
    const uni = universityFor(yard);
    return {
      yardId: yard,
      school: String(row.school || ""),
      shortName: String(row.short_name || uni.shortName),
      yardLabel: uni.yardLabel,
      createdAt: String(row.created_at),
    };
  }

  async function maybeGrantMark(yard, handle) {
    if ((await yardCred(yard, handle)) < YARD_CRED_GATE) return null;
    const existing = await markFor(yard, handle);
    if (existing) return existing;
    const uni = universityFor(yard);
    await query(
      `INSERT INTO yard_marks (yard_id, handle, school, short_name, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [yard, handle, uni.school, uni.shortName, new Date().toISOString()],
    );
    return markFor(yard, handle);
  }

  async function openBalance(yard, handle) {
    // One disclosed grant for joining this yard. It does not refill, and it
    // is not the university mark. That mark waits for cred inside this yard.
    return credit(yard, handle, JOIN_GRANT_WB, "Joining this yard", "join");
  }

  function mapRoom(row) {
    return {
      id: `live_${row.id}`,
      yardId: String(row.yard_id),
      title: String(row.title),
      kind: String(row.kind),
      externalUrl: row.external_url ? String(row.external_url) : undefined,
      jitsiSlug: String(row.jitsi_slug),
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      present: [],
    };
  }

  async function rooms(id) {
    await ensure();
    const yard = yardId(id);
    const rows = await query(
      `SELECT id, yard_id, title, kind, external_url, jitsi_slug, created_by, created_at
         FROM yard_rooms WHERE yard_id = ? AND closed = 0 ORDER BY created_at DESC`,
      [yard],
    );
    return { ok: true, yardId: yard, rooms: rows.map(mapRoom) };
  }

  async function createRoom(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const yard = yardId(body.yardId || body.yard_id || body.communityId);
    await requireMember(yard, who);
    const title = text(body.title, "Room name", 80);
    const kind = ["stage", "voice", "external", "watch"].includes(body.kind)
      ? body.kind
      : "stage";
    let link = "";
    if (kind === "external") {
      link = externalUrl(body.externalUrl || body.external_url);
      if (!link) throw new HttpError(400, "Paste the Discord, Zoom, or YouTube link.");
    }
    if (kind === "watch") {
      const parsed = parseWatchSource(
        String(body.watchTicket || body.externalUrl || body.external_url || ""),
        { jellyfinOrigins },
      );
      if (!parsed.ok) throw new HttpError(400, parsed.reason);
      link = encodeWatchTicket(parsed.ticket);
    }
    const slug = `BkspcYard${yard.replace(/-/g, "")}${title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24)}${Date.now().toString(36)}`;
    const createdAt = new Date().toISOString();
    const row = (
      await query(
        `INSERT INTO yard_rooms
          (id, yard_id, title, kind, external_url, jitsi_slug, created_by, created_at, closed)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 0)
         RETURNING *`,
        [yard, title, kind, link || null, slug, who, createdAt],
      )
    )[0];
    await maybeGrantMark(yard, who);
    return { ok: true, room: mapRoom(row) };
  }

  async function closeRoom(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const id = num(String(body.roomId || body.id || "").replace(/^live_/, ""));
    const row = (await query("SELECT * FROM yard_rooms WHERE id = ?", [id]))[0];
    if (!row) throw new HttpError(404, "Room not found.");
    if (String(row.created_by) !== who) throw new HttpError(403, "Only the person who opened the room can close it.");
    await query("UPDATE yard_rooms SET closed = 1 WHERE id = ?", [id]);
    return { ok: true, closed: true };
  }

  async function messages(pubkey, yardRaw, peerRaw) {
    await ensure();
    const who = await actor(pubkey);
    const yard = yardId(yardRaw);
    await requireMember(yard, who);
    const peer = peerRaw ? handleOf(peerRaw) : "";
    const rows = peer
      ? await query(
          `SELECT id, yard_id, from_handle, to_handle, body, created_at FROM yard_messages
            WHERE yard_id = ? AND (
              (from_handle = ? AND to_handle = ?) OR (from_handle = ? AND to_handle = ?)
            ) ORDER BY created_at`,
          [yard, who, peer, peer, who],
        )
      : await query(
          `SELECT id, yard_id, from_handle, to_handle, body, created_at FROM yard_messages
            WHERE yard_id = ? AND (from_handle = ? OR to_handle = ?)
            ORDER BY created_at DESC`,
          [yard, who, who],
        );
    if (peer) {
      return {
        ok: true,
        messages: rows.map((row) => ({
          id: `dm_${row.id}`,
          threadId: [yard, who, peer].sort().join(":"),
          fromHandle: String(row.from_handle),
          toHandle: String(row.to_handle),
          body: String(row.body),
          phiAck: true,
          ethicalAck: true,
          createdAt: String(row.created_at),
        })),
      };
    }
    const threads = new Map();
    for (const row of rows) {
      const peerHandle = row.from_handle === who ? String(row.to_handle) : String(row.from_handle);
      if (threads.has(peerHandle)) continue;
      const rawBody = String(row.body);
      threads.set(peerHandle, {
        threadId: [yard, who, peerHandle].sort().join(":"),
        peerHandle,
        lastBody: rawBody.startsWith(DM_PREFIX) ? "Encrypted message" : rawBody.slice(0, 120),
        lastAt: String(row.created_at),
        unread: 0,
        yardId: yard,
      });
    }
    return { ok: true, threads: [...threads.values()] };
  }

  async function sendMessage(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const yard = yardId(body.yardId || body.yard_id);
    await requireMember(yard, who);
    const to = handleOf(body.toHandle || body.to);
    if (to === who) throw new HttpError(400, "Choose someone else in this yard.");
    await requireMember(yard, to);
    const rawBody = String(body.body || "").trim();
    let message;
    if (rawBody.startsWith(DM_PREFIX)) {
      try {
        message = assertSealedEnvelope(rawBody);
      } catch (err) {
        throw new HttpError(
          400,
          err instanceof Error ? err.message : "That sealed message is not valid.",
        );
      }
    } else {
      message = text(body.body, "Message", 2000);
      if (looksLikePhi(message)) {
        throw new HttpError(400, "Message blocked: looks like clinical or patient information. Use the hospital system.");
      }
    }
    const createdAt = new Date().toISOString();
    const inserted = (
      await query(
        `INSERT INTO yard_messages (id, yard_id, from_handle, to_handle, body, created_at)
         VALUES (NULL, ?, ?, ?, ?, ?)
         RETURNING id`,
        [yard, who, to, message, createdAt],
      )
    )[0];
    const id = num(inserted?.id);
    const sent = {
      ok: true,
      message: {
        id: `dm_${id}`,
        threadId: [yard, who, to].sort().join(":"),
        fromHandle: who,
        toHandle: to,
        body: message,
        phiAck: true,
        ethicalAck: true,
        createdAt,
      },
    };
    await maybeGrantMark(yard, who);
    return sent;
  }

  function roomNumber(value) {
    const id = num(String(value || "").replace(/^live_/, ""));
    if (!id) throw new HttpError(400, "Room not found.");
    return id;
  }

  async function pushWatch(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const id = roomNumber(body.roomId || body.id);
    const row = (
      await query("SELECT * FROM yard_rooms WHERE id = ? AND closed = 0", [id])
    )[0];
    if (!row) throw new HttpError(404, "Room not found.");
    if (String(row.kind) !== "watch") throw new HttpError(400, "That room is not a watch room.");
    await requireMember(String(row.yard_id), who);
    if (String(row.created_by) !== who) throw new HttpError(403, "Only the host sets the picture.");
    const position = Math.max(0, Math.min(12 * 60 * 60 * 1000, Math.floor(num(body.positionMs))));
    const playing = body.playing === true || body.playing === 1 ? 1 : 0;
    const now = new Date().toISOString();
    const existing = (
      await query("SELECT room_id FROM yard_watch_clock WHERE room_id = ?", [id])
    )[0];
    if (existing) {
      await query(
        "UPDATE yard_watch_clock SET position_ms = ?, playing = ?, updated_at = ? WHERE room_id = ?",
        [position, playing, now, id],
      );
    } else {
      await query(
        `INSERT INTO yard_watch_clock (room_id, host_handle, position_ms, playing, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, who, position, playing, now],
      );
    }
    return {
      ok: true,
      clock: { positionMs: position, playing: playing === 1, updatedAt: now, hostHandle: who },
    };
  }

  async function readWatch(pubkey, roomRaw) {
    await ensure();
    const who = await actor(pubkey);
    const id = roomNumber(roomRaw);
    const row = (
      await query("SELECT * FROM yard_rooms WHERE id = ? AND closed = 0", [id])
    )[0];
    if (!row) throw new HttpError(404, "Room not found.");
    await requireMember(String(row.yard_id), who);
    const clock = (
      await query("SELECT * FROM yard_watch_clock WHERE room_id = ?", [id])
    )[0];
    if (!clock) return { ok: true, clock: null };
    return {
      ok: true,
      clock: {
        positionMs: num(clock.position_ms),
        playing: num(clock.playing) === 1,
        updatedAt: String(clock.updated_at),
        hostHandle: String(clock.host_handle),
      },
    };
  }

  function messageKey(value) {
    if (!value || typeof value !== "object") return "";
    if (value.kty !== "EC" || value.crv !== "P-256") return "";
    if (typeof value.x !== "string" || typeof value.y !== "string" || value.d) return "";
    if (value.x.length < 8 || value.x.length > 200 || value.y.length < 8 || value.y.length > 200) {
      return "";
    }
    return JSON.stringify({ kty: "EC", crv: "P-256", x: value.x, y: value.y });
  }

  async function saveDmKey(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const stored = messageKey(body.publicJwk);
    if (!stored) throw new HttpError(400, "That message key is not valid.");
    const now = new Date().toISOString();
    const existing = (
      await query("SELECT handle FROM yard_dm_keys WHERE handle = ? LIMIT 1", [who])
    )[0];
    if (existing) {
      await query("UPDATE yard_dm_keys SET public_jwk = ?, updated_at = ? WHERE handle = ?", [
        stored,
        now,
        who,
      ]);
    } else {
      await query(
        "INSERT INTO yard_dm_keys (handle, public_jwk, updated_at) VALUES (?, ?, ?)",
        [who, stored, now],
      );
    }
    return { ok: true };
  }

  async function dmKey(pubkey, yardRaw, handleRaw) {
    await ensure();
    const who = await actor(pubkey);
    const yard = yardId(yardRaw);
    await requireMember(yard, who);
    const peer = handleOf(handleRaw);
    await requireMember(yard, peer);
    const row = (
      await query("SELECT public_jwk FROM yard_dm_keys WHERE handle = ? LIMIT 1", [peer])
    )[0];
    return {
      ok: true,
      handle: peer,
      publicJwk: row ? JSON.parse(String(row.public_jwk)) : null,
    };
  }

  async function wb(pubkey, yardRaw) {
    await ensure();
    const who = await actor(pubkey);
    const yard = yardId(yardRaw);
    const cred = await yardCred(yard, who);
    return {
      ok: true,
      yardId: yard,
      handle: who,
      balance: await balanceOf(yard, who),
      cred,
      credGate: YARD_CRED_GATE,
      mark: await markFor(yard, who),
    };
  }

  async function grantJoin(yardRaw, handleRaw) {
    await ensure();
    const yard = yardId(yardRaw);
    const handle = handleOf(handleRaw);
    const balance = await openBalance(yard, handle);
    return { ok: true, yardId: yard, handle, balance };
  }

  function mapListing(row) {
    return {
      id: num(row.id),
      sellerHandle: String(row.seller_handle),
      itemType: String(row.item_type || "item"),
      itemRef: row.item_ref ? String(row.item_ref) : null,
      price: num(row.price),
      title: String(row.title),
      description: String(row.description || ""),
      isNft: num(row.is_nft) === 1,
      townTag: String(row.yard_id),
      fulfillmentMode: String(row.fulfillment_mode || "escrow"),
      deliveryHint: row.delivery_hint ? String(row.delivery_hint) : null,
      soldTo: row.sold_to ? String(row.sold_to) : null,
      createdAt: String(row.created_at || ""),
    };
  }

  async function listings(id) {
    await ensure();
    const yard = id ? yardId(id) : "";
    const rows = yard
      ? await query(
          `SELECT * FROM yard_listings WHERE yard_id = ? AND sold_to IS NULL ORDER BY created_at DESC`,
          [yard],
        )
      : await query(`SELECT * FROM yard_listings WHERE sold_to IS NULL ORDER BY created_at DESC`);
    const listings = [];
    for (const row of rows) listings.push(await withEdition(mapListing(row)));
    return { ok: true, listings, passes: await openPasses(yard) };
  }

  async function openPasses(yard) {
    const rows = yard
      ? await query(
          `SELECT c.listing_id AS listing_id, c.buyer_handle AS holder,
                  c.copy_number AS copy_number, c.ask_wb AS ask_wb,
                  l.item_ref AS item_ref, l.title AS title, l.yard_id AS yard_id
             FROM yard_edition_claims c
             JOIN yard_listings l ON l.id = c.listing_id
            WHERE c.ask_wb > 0 AND l.yard_id = ?
            ORDER BY c.created_at DESC`,
          [yard],
        )
      : await query(
          `SELECT c.listing_id AS listing_id, c.buyer_handle AS holder,
                  c.copy_number AS copy_number, c.ask_wb AS ask_wb,
                  l.item_ref AS item_ref, l.title AS title, l.yard_id AS yard_id
             FROM yard_edition_claims c
             JOIN yard_listings l ON l.id = c.listing_id
            WHERE c.ask_wb > 0
            ORDER BY c.created_at DESC`,
        );
    return rows.map(mapPass);
  }

  function mapPass(row) {
    return {
      listingId: num(row.listing_id),
      holder: String(row.holder),
      copyNumber: num(row.copy_number),
      askWb: num(row.ask_wb),
      itemRef: row.item_ref ? String(row.item_ref) : "",
      title: String(row.title || ""),
      yardId: String(row.yard_id || ""),
    };
  }

  async function createListing(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const yard = yardId(body.yardId || body.townTag || body.town_tag);
    await requireMember(yard, who);
    const title = text(body.title, "Title", 120);
    const description = String(body.description || "").trim().slice(0, 2000);
    const price = num(body.price);
    if (!Number.isInteger(price) || price < 1 || price > 100000) {
      throw new HttpError(400, "Price must be a whole WeixBucks amount from 1 to 100000.");
    }
    const itemType = String(body.itemType || body.item_type || "item").slice(0, 40);
    const itemRef = optionalRef(body.itemRef || body.item_ref);
    const deliveryHint = optionalRef(body.deliveryHint || body.delivery_hint);
    const requested = String(body.fulfillmentMode || body.fulfillment_mode || "");
    const fulfillment =
      itemType === "mix" && requested === "instant" ? "instant" : "escrow";
    const isNft = body.isNft === true && itemType !== "mix" ? 1 : 0;
    const createdAt = new Date().toISOString();
    const inserted = (
      await query(
        `INSERT INTO yard_listings
          (id, yard_id, seller_handle, title, description, price, item_type, created_at,
           item_ref, delivery_hint, is_nft, fulfillment_mode)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
        [
          yard,
          who,
          title,
          description,
          price,
          itemType,
          createdAt,
          itemRef || null,
          deliveryHint || null,
          isNft,
          fulfillment,
        ],
      )
    )[0];
    const id = num(inserted?.id);
    await maybeGrantMark(yard, who);
    return { ok: true, id };
  }

  async function editionFor(listing) {
    if (String(listing.item_type) !== "mix" || !listing.item_ref) return null;
    const row = (
      await query(
        "SELECT edition_size, set_kind, tracks, title, disc_format, write_receipt, splits, author_handle FROM yard_mixtapes WHERE id = ? LIMIT 1",
        [String(listing.item_ref)],
      )
    )[0];
    if (!row) return null;
    let tracks = [];
    try {
      const parsed = JSON.parse(String(row.tracks || "[]"));
      if (Array.isArray(parsed)) tracks = parsed;
    } catch {
      tracks = [];
    }
    const passages = tracks
      .map((track) => String(track?.src || ""))
      .filter((src) => src.startsWith("verse:"))
      .map((src) => src.slice(6))
      .slice(0, 12);
    let format = "mixtape";
    try {
      format = discFormatOf(row.disc_format, Math.max(1, tracks.length));
    } catch {
      format = tracks.length <= 1 ? "single" : tracks.length <= 6 ? "ep" : "mixtape";
    }
    let splits = [];
    try {
      const parsed = JSON.parse(String(row.splits || "[]"));
      if (Array.isArray(parsed)) splits = parsed;
    } catch {
      splits = [];
    }
    const author = String(row.author_handle || listing.seller_handle || "");
    return {
      editionSize: Math.max(1, Math.min(100, num(row.edition_size) || 1)),
      setKind: setKindOf(row.set_kind),
      title: String(row.title || listing.title || ""),
      passages,
      tracks,
      format,
      writeReceipt: num(row.write_receipt) === 1,
      splits: splits.length
        ? splits.map((item) => ({
            handle: String(item?.handle || author),
            percent: num(item?.percent),
          }))
        : [{ handle: author, percent: 95 }],
    };
  }

  async function withEdition(listing) {
    const edition = await editionFor({
      item_type: listing.itemType,
      item_ref: listing.itemRef,
    });
    if (!edition) return listing;
    const taken = num(
      (
        await query(
          "SELECT COUNT(*) AS n FROM yard_edition_claims WHERE listing_id = ?",
          [listing.id],
        )
      )[0]?.n,
    );
    return {
      ...listing,
      editionSize: edition.editionSize,
      copiesLeft: Math.max(0, edition.editionSize - taken),
      setKind: edition.setKind,
    };
  }

  async function claimRank(listingId, buyer, createdAt) {
    return num(
      (
        await query(
          `SELECT COUNT(*) AS n FROM yard_edition_claims
           WHERE listing_id = ? AND (created_at < ? OR (created_at = ? AND buyer_handle <= ?))`,
          [listingId, createdAt, createdAt, buyer],
        )
      )[0]?.n,
    );
  }

  async function paySleeve(yard, title, refPrefix, price, splits) {
    const paid = sleevePayout(price, splits);
    for (const row of paid.payouts) {
      if (row.amount < 1) continue;
      await credit(
        yard,
        row.handle,
        row.amount,
        `Yard Sale release: ${title}`,
        `${refPrefix}:${row.handle}`,
      );
    }
    return paid;
  }

  async function sellEditionCopy(listing, who, price, edition) {
    const now = new Date().toISOString();
    const listingId = num(listing.id);
    const already = (
      await query(
        "SELECT buyer_handle FROM yard_edition_claims WHERE listing_id = ? AND buyer_handle = ?",
        [listingId, who],
      )
    )[0];
    if (already) throw new HttpError(400, "You already hold a copy of this edition.");
    await query(
      "INSERT OR IGNORE INTO yard_edition_claims (listing_id, buyer_handle, created_at) VALUES (?, ?, ?)",
      [listingId, who, now],
    );
    const mine = (
      await query(
        "SELECT created_at FROM yard_edition_claims WHERE listing_id = ? AND buyer_handle = ?",
        [listingId, who],
      )
    )[0];
    if (String(mine?.created_at || "") !== now) {
      throw new HttpError(400, "You already hold a copy of this edition.");
    }
    const rank = await claimRank(listingId, who, now);
    if (rank > edition.editionSize) {
      await query(
        "DELETE FROM yard_edition_claims WHERE listing_id = ? AND buyer_handle = ?",
        [listingId, who],
      );
      await query(
        "UPDATE yard_listings SET sold_to = ? WHERE id = ? AND sold_to IS NULL",
        ["edition-closed", listingId],
      );
      throw new HttpError(400, "That edition is sold out.");
    }
    try {
      await query(
        `INSERT INTO yard_wb (id, yard_id, handle, amount, reason, ref, created_at)
         VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
        [
          String(listing.yard_id),
          who,
          -price,
          `Yard Sale: ${listing.title}`,
          `sale:${listingId}:${who}`,
          now,
        ],
      );
      await paySleeve(
        String(listing.yard_id),
        String(listing.title),
        `sale-net:${listingId}:${who}`,
        price,
        edition.splits,
      );
    } catch (err) {
      await query(
        "DELETE FROM yard_edition_claims WHERE listing_id = ? AND buyer_handle = ?",
        [listingId, who],
      );
      throw err;
    }
    const paid = sleevePayout(price, edition.splits);
    await query(
      "UPDATE yard_edition_claims SET copy_number = ? WHERE listing_id = ? AND buyer_handle = ?",
      [rank, listingId, who],
    );
    if (rank >= edition.editionSize) {
      await query(
        "UPDATE yard_listings SET sold_to = ? WHERE id = ? AND sold_to IS NULL",
        ["edition-closed", listingId],
      );
    }
    await maybeGrantMark(String(listing.yard_id), who);
    const copiesLeft = edition.editionSize - rank;
    const anchorStatus = chainVerifiedSale({
      setKind: edition.setKind,
      format: edition.format,
      priceWb: price,
    })
      ? "pending"
      : "off";
    const trackHash = trackListHash(
      (edition.tracks || []).map((track) => ({
        id: String(track.id || ""),
        src: String(track.src || ""),
        stems: Array.isArray(track.stems) ? track.stems : [],
      })),
    );
    const receipt = {
      copyNumber: rank,
      priceWb: price,
      platformFee: paid.fee,
      sellerNet: paid.sellerNet,
      format: edition.format,
      trackHash,
      anchorStatus,
    };
    try {
      await query(
        `INSERT INTO yard_sale_receipts (
           listing_id, buyer_handle, seller_handle, yard_id, copy_number, price_wb,
           platform_fee, seller_net, disc_format, track_hash, anchor_status, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          listingId,
          who,
          String(listing.seller_handle),
          String(listing.yard_id),
          rank,
          price,
          paid.fee,
          paid.sellerNet,
          edition.format,
          trackHash,
          anchorStatus,
          now,
        ],
      );
    } catch {
      /* The copy and the WeixBucks move already stand. */
    }
    return {
      ok: true,
      listingId,
      status: "released",
      fulfillmentMode: "instant",
      amount: price,
      platformFee: paid.fee,
      sellerNet: paid.sellerNet,
      payouts: paid.payouts,
      title: String(listing.title),
      deliveryHint: listing.delivery_hint ? String(listing.delivery_hint) : "",
      editionSize: edition.editionSize,
      copiesLeft,
      setKind: edition.setKind,
      passages: edition.setKind === "logos" ? edition.passages : [],
      applied: edition.setKind === "logos" ? { logosDeck: true } : undefined,
      receipt,
      discAnchor: discAnchorPlan({
        trackHash,
        copyNumber: rank,
        priceWb: price,
        anchorStatus,
      }),
    };
  }

  async function buy(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const listing = (
      await query("SELECT * FROM yard_listings WHERE id = ?", [num(body.listingId || body.id)])
    )[0];
    if (!listing || listing.sold_to) throw new HttpError(404, "Listing not found.");
    if (String(listing.seller_handle) === who) throw new HttpError(400, "You cannot buy your own listing.");
    const yard = String(listing.yard_id);
    await requireMember(yard, who);
    const price = num(listing.price);
    const fee = Math.floor((price * 5) / 100);
    const sellerNet = price - fee;
    if ((await balanceOf(yard, who)) < price) {
      throw new HttpError(400, "Not enough WeixBucks in this yard.");
    }
    if (String(listing.fulfillment_mode || "escrow") === "instant") {
      const edition = await editionFor(listing);
      if (edition) return sellEditionCopy(listing, who, price, edition);
      const now = new Date().toISOString();
      await query(
        "UPDATE yard_listings SET sold_to = ? WHERE id = ? AND sold_to IS NULL",
        [who, num(listing.id)],
      );
      const claimed = (
        await query("SELECT sold_to FROM yard_listings WHERE id = ?", [num(listing.id)])
      )[0];
      if (String(claimed?.sold_to || "") !== who) {
        throw new HttpError(404, "Listing not found.");
      }
      await query(
        `INSERT INTO yard_wb (id, yard_id, handle, amount, reason, ref, created_at)
         VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
        [yard, who, -price, `Yard Sale: ${listing.title}`, `sale:${listing.id}`, now],
      );
      await credit(
        yard,
        String(listing.seller_handle),
        sellerNet,
        `Yard Sale release: ${listing.title}`,
        `sale-net:${listing.id}`,
      );
      await maybeGrantMark(yard, who);
      return {
        ok: true,
        listingId: num(listing.id),
        status: "released",
        fulfillmentMode: "instant",
        amount: price,
        platformFee: fee,
        sellerNet,
        title: String(listing.title),
        deliveryHint: listing.delivery_hint ? String(listing.delivery_hint) : "",
      };
    }
    const now = new Date().toISOString();
    await query("UPDATE yard_listings SET sold_to = ? WHERE id = ? AND sold_to IS NULL", [who, num(listing.id)]);
    const inserted = (
      await query(
        `INSERT INTO yard_escrow
          (id, listing_id, yard_id, buyer_handle, seller_handle, amount, seller_net, platform_fee,
           status, title, created_at, updated_at)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'funds_locked', ?, ?, ?)
         RETURNING id`,
        [
          num(listing.id),
          yard,
          who,
          String(listing.seller_handle),
          price,
          sellerNet,
          fee,
          String(listing.title),
          now,
          now,
        ],
      )
    )[0];
    const escrowId = num(inserted?.id);
    await query(
      `INSERT INTO yard_wb (id, yard_id, handle, amount, reason, ref, created_at)
       VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
      [yard, who, -price, `Yard Sale: ${listing.title}`, `escrow:${escrowId}`, now],
    );
    const bought = {
      ok: true,
      escrowId,
      listingId: num(listing.id),
      status: "funds_locked",
      fulfillmentMode: "escrow",
      amount: price,
      platformFee: fee,
      sellerNet,
      title: String(listing.title),
    };
    await maybeGrantMark(yard, who);
    return bought;
  }

  async function offerPass(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const listingId = num(body.listingId || body.id);
    const price = num(body.price);
    if (!Number.isInteger(price) || price < 1 || price > 100000) {
      throw new HttpError(400, "Price must be a whole WeixBucks amount from 1 to 100000.");
    }
    const claim = (
      await query(
        "SELECT copy_number FROM yard_edition_claims WHERE listing_id = ? AND buyer_handle = ?",
        [listingId, who],
      )
    )[0];
    if (!claim) throw new HttpError(404, "You do not hold a copy to pass.");
    await query(
      "UPDATE yard_edition_claims SET ask_wb = ? WHERE listing_id = ? AND buyer_handle = ?",
      [price, listingId, who],
    );
    return {
      ok: true,
      listingId,
      askWb: price,
      copyNumber: num(claim.copy_number),
      holderPaid: false,
    };
  }

  async function buyPass(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const holder = handleOf(body.holder);
    const listingId = num(body.listingId || body.id);
    if (holder === who) throw new HttpError(400, "You already hold this copy.");
    const listing = (
      await query("SELECT * FROM yard_listings WHERE id = ?", [listingId])
    )[0];
    if (!listing) throw new HttpError(404, "Listing not found.");
    const yard = String(listing.yard_id);
    await requireMember(yard, who);
    const claim = (
      await query(
        `SELECT buyer_handle, copy_number, ask_wb, created_at
           FROM yard_edition_claims WHERE listing_id = ? AND buyer_handle = ?`,
        [listingId, holder],
      )
    )[0];
    const price = num(claim?.ask_wb);
    if (!claim || price < 1) throw new HttpError(404, "That copy is not being passed.");
    const already = (
      await query(
        "SELECT 1 AS ok FROM yard_edition_claims WHERE listing_id = ? AND buyer_handle = ?",
        [listingId, who],
      )
    )[0];
    if (already) throw new HttpError(400, "You already hold a copy of this edition.");
    if ((await balanceOf(yard, who)) < price) {
      throw new HttpError(400, "Not enough WeixBucks in this yard.");
    }
    const edition = await editionFor(listing);
    if (!edition) throw new HttpError(404, "That copy is not being passed.");
    await query(
      `UPDATE yard_edition_claims SET buyer_handle = ?, ask_wb = 0
        WHERE listing_id = ? AND buyer_handle = ? AND ask_wb = ?`,
      [who, listingId, holder, price],
    );
    const moved = (
      await query(
        "SELECT copy_number FROM yard_edition_claims WHERE listing_id = ? AND buyer_handle = ?",
        [listingId, who],
      )
    )[0];
    if (!moved) throw new HttpError(404, "That copy is not being passed.");
    const now = new Date().toISOString();
    try {
      await query(
        `INSERT INTO yard_wb (id, yard_id, handle, amount, reason, ref, created_at)
         VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
        [
          yard,
          who,
          -price,
          `Yard Sale pass: ${listing.title}`,
          `pass:${listingId}:${who}`,
          now,
        ],
      );
      await paySleeve(
        yard,
        String(listing.title),
        `pass-net:${listingId}:${who}`,
        price,
        edition.splits,
      );
    } catch (err) {
      await query(
        "DELETE FROM yard_wb WHERE yard_id = ? AND (ref = ? OR ref LIKE ?)",
        [yard, `pass:${listingId}:${who}`, `pass-net:${listingId}:${who}:%`],
      );
      await query(
        `UPDATE yard_edition_claims SET buyer_handle = ?, ask_wb = ?
          WHERE listing_id = ? AND buyer_handle = ?`,
        [holder, price, listingId, who],
      );
      throw err;
    }
    const paid = sleevePayout(price, edition.splits);
    const copyNumber = num(moved.copy_number) || num(claim.copy_number);
    return {
      ok: true,
      listingId,
      status: "released",
      fulfillmentMode: "instant",
      passed: true,
      holderPaid: false,
      amount: price,
      platformFee: paid.fee,
      sellerNet: paid.sellerNet,
      payouts: paid.payouts,
      copyNumber,
      title: String(listing.title),
      setKind: edition.setKind,
    };
  }

  async function myCopies(pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const rows = await query(
      `SELECT c.listing_id AS listing_id, c.buyer_handle AS holder,
              c.copy_number AS copy_number, c.ask_wb AS ask_wb,
              l.item_ref AS item_ref, l.title AS title, l.yard_id AS yard_id
         FROM yard_edition_claims c
         JOIN yard_listings l ON l.id = c.listing_id
        WHERE c.buyer_handle = ?
        ORDER BY c.created_at DESC`,
      [who],
    );
    return { ok: true, copies: rows.map(mapPass) };
  }

  async function escrowRow(id) {
    const row = (await query("SELECT * FROM yard_escrow WHERE id = ?", [id]))[0];
    if (!row) throw new HttpError(404, "Escrow not found.");
    return row;
  }

  async function deliver(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const row = await escrowRow(num(body.escrowId || body.id));
    if (String(row.seller_handle) !== who) throw new HttpError(403, "Only the seller can mark this delivered.");
    if (String(row.status) !== "funds_locked") throw new HttpError(400, "This sale is not waiting on delivery.");
    const deliveryRef = text(body.deliveryRef || body.delivery_ref, "Delivery reference", 200);
    await query(
      "UPDATE yard_escrow SET status = 'delivered', delivery_ref = ?, updated_at = ? WHERE id = ?",
      [deliveryRef, new Date().toISOString(), num(row.id)],
    );
    return { ok: true, escrowId: num(row.id), status: "delivered", deliveryRef };
  }

  async function release(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const row = await escrowRow(num(body.escrowId || body.id));
    if (String(row.buyer_handle) !== who) throw new HttpError(403, "Only the buyer can release payment.");
    if (String(row.status) !== "delivered") throw new HttpError(400, "Wait until the seller marks it delivered.");
    const yard = String(row.yard_id);
    const seller = String(row.seller_handle);
    const net = num(row.seller_net);
    await credit(yard, seller, net, `Yard Sale release: ${row.title}`, `release:${row.id}`);
    await query(
      "UPDATE yard_escrow SET status = 'released', updated_at = ? WHERE id = ?",
      [new Date().toISOString(), num(row.id)],
    );
    await maybeGrantMark(yard, seller);
    await maybeGrantMark(yard, who);
    return { ok: true, escrowId: num(row.id), status: "released", sellerNet: net };
  }

  async function myEscrows(pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const rows = await query(
      `SELECT * FROM yard_escrow WHERE buyer_handle = ? OR seller_handle = ? ORDER BY updated_at DESC`,
      [who, who],
    );
    return {
      ok: true,
      escrows: rows.map((row) => ({
        id: num(row.id),
        listingId: num(row.listing_id),
        buyerHandle: String(row.buyer_handle),
        sellerHandle: String(row.seller_handle),
        amount: num(row.amount),
        platformFee: num(row.platform_fee),
        orgFee: 0,
        sellerNet: num(row.seller_net),
        status: String(row.status),
        deliveryRef: row.delivery_ref ? String(row.delivery_ref) : "",
        listingTitle: String(row.title),
        itemType: "item",
        townTag: String(row.yard_id),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      })),
    };
  }

  function stamp(value) {
    const raw = String(value || "").trim();
    const time = Date.parse(raw);
    if (!raw || Number.isNaN(time)) return new Date().toISOString();
    return new Date(time).toISOString();
  }

  function rowId(value, label) {
    const id = String(value || "").trim();
    if (!/^[a-z][a-z0-9_]{3,64}$/i.test(id)) {
      throw new HttpError(400, `${label} id is not valid.`);
    }
    return id;
  }

  function coverRef(value) {
    const out = String(value || "").trim();
    if (!out) return "";
    if (out.startsWith("data:") || out.startsWith("verse:")) {
      throw new HttpError(400, "Cover art needs an image file or an https link.");
    }
    return mediaRef(out);
  }

  function trackSrc(value) {
    const out = String(value || "").trim();
    if (/^verse:[A-Za-z0-9][A-Za-z0-9 .:'-]{1,78}$/.test(out)) return out;
    return mediaRef(out);
  }

  function setKindOf(value) {
    return value === "verses" || value === "logos" ? value : "songs";
  }

  const MIXTAPE_COLUMNS =
    "id, yard_id, title, body, tracks, author_handle, author_display, price_wb, edition_size, set_kind, cover_url, credits, created_at, disc_format, visibility, store_url, write_receipt, rights_attested, splits, master_id, label_name";

  function asRelease(body, setKind, tracks, author, priceWb) {
    try {
      return releaseFields(
        {
          format: body.format,
          visibility: body.visibility,
          storeUrl: body.storeUrl,
          writeReceipt: body.writeReceipt,
          rightsAttested: body.rightsAttested,
          splits: body.splits,
          masterId: body.masterId,
          label: body.label,
          priceWb,
          setKind,
          tracks,
        },
        author,
      );
    } catch (err) {
      throw new HttpError(400, err instanceof Error ? err.message : "That release is not valid.");
    }
  }

  function mediaRef(value) {
    const out = String(value || "").trim();
    if (!out) throw new HttpError(400, "Add a photo, a track, or an https link.");
    if (out.length > 500) throw new HttpError(400, "That media link is too long.");
    if (/^web_[a-z0-9]+$/i.test(out)) return out;
    let url;
    try {
      url = new URL(out);
    } catch {
      throw new HttpError(400, "Add a photo, a track, or an https link.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new HttpError(400, "Add a photo, a track, or an https link.");
    }
    return out;
  }

  function optionalText(value, max) {
    const out = String(value || "").trim();
    if (out.length > max) throw new HttpError(400, "That note is too long.");
    return out;
  }

  function mapBoard(row) {
    return {
      id: String(row.id),
      yardId: String(row.yard_id),
      title: String(row.title),
      authorHandle: String(row.author_handle),
      createdAt: String(row.created_at),
    };
  }

  function mapPin(row) {
    return {
      id: String(row.id),
      yardId: String(row.yard_id),
      boardId: String(row.board_id),
      title: String(row.title),
      note: String(row.note || ""),
      image: String(row.image),
      authorHandle: String(row.author_handle),
      createdAt: String(row.created_at),
      hubItemId: null,
    };
  }

  function mapMixtape(row) {
    let tracks = [];
    try {
      const parsed = JSON.parse(String(row.tracks || "[]"));
      if (Array.isArray(parsed)) tracks = parsed;
    } catch {
      tracks = [];
    }
    const author = String(row.author_handle);
    let splits = [];
    try {
      const parsed = JSON.parse(String(row.splits || "[]"));
      if (Array.isArray(parsed)) splits = parsed;
    } catch {
      splits = [];
    }
    let format = "mixtape";
    try {
      format = discFormatOf(row.disc_format, Math.max(1, tracks.length));
    } catch {
      format = tracks.length <= 1 ? "single" : tracks.length <= 6 ? "ep" : "mixtape";
    }
    return {
      id: String(row.id),
      yardId: String(row.yard_id),
      title: String(row.title),
      body: String(row.body || ""),
      tracks,
      authorHandle: author,
      authorDisplayName: String(row.author_display || author),
      createdAt: String(row.created_at),
      priceWb: num(row.price_wb),
      editionSize: num(row.edition_size) || 1,
      setKind: setKindOf(row.set_kind),
      cover: String(row.cover_url || ""),
      credits: String(row.credits || ""),
      format,
      visibility: row.visibility === "public" ? "public" : "yard",
      storeUrl: String(row.store_url || ""),
      writeReceipt: num(row.write_receipt) === 1,
      rightsAttested: num(row.rights_attested) === 1,
      splits: splits.length ? splits : [{ handle: author, percent: 95 }],
      masterId: String(row.master_id || ""),
      label: WEIXSOUND_LABEL,
      listingId: null,
      hubItemId: null,
    };
  }

  function mapBattle(row) {
    return {
      id: String(row.id),
      yardId: String(row.yard_id),
      title: String(row.title),
      mixId: String(row.mix_id),
      mixTitle: String(row.mix_title),
      setKind: setKindOf(row.set_kind),
      callUrl: String(row.call_url || ""),
      jitsiSlug: String(row.jitsi_slug),
      hostHandle: String(row.host_handle),
      createdAt: String(row.created_at),
    };
  }

  async function boards(yard) {
    const id = yardId(yard);
    await ensure();
    const rows = await query(
      "SELECT id, yard_id, title, author_handle, created_at FROM yard_boards WHERE yard_id = ? ORDER BY created_at ASC",
      [id],
    );
    return { ok: true, boards: rows.map(mapBoard) };
  }

  async function saveBoard(body, pubkey) {
    const yard = yardId(body.yardId);
    const who = await actor(pubkey);
    await requireMember(yard, who);
    const id = rowId(body.id, "Board");
    const title = text(body.title, "Board name", 40);
    const existing = (
      await query("SELECT id FROM yard_boards WHERE id = ? LIMIT 1", [id])
    )[0];
    if (!existing) {
      const count = (
        await query(
          "SELECT COUNT(*) AS n FROM yard_boards WHERE yard_id = ?",
          [yard],
        )
      )[0];
      if (num(count?.n) >= 24) throw new HttpError(400, "This yard already has 24 boards");
      const dup = (
        await query(
          "SELECT id FROM yard_boards WHERE yard_id = ? AND lower(title) = lower(?) LIMIT 1",
          [yard, title],
        )
      )[0];
      if (dup) throw new HttpError(400, "That board already exists");
      await query(
        `INSERT INTO yard_boards (id, yard_id, title, author_handle, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, yard, title, who, stamp(body.createdAt)],
      );
    }
    const row = (
      await query(
        "SELECT id, yard_id, title, author_handle, created_at FROM yard_boards WHERE id = ? LIMIT 1",
        [id],
      )
    )[0];
    return { ok: true, board: mapBoard(row) };
  }

  async function pins(yard) {
    const id = yardId(yard);
    await ensure();
    const rows = await query(
      "SELECT id, yard_id, board_id, title, note, image, author_handle, created_at FROM yard_pins WHERE yard_id = ? ORDER BY created_at DESC",
      [id],
    );
    return { ok: true, pins: rows.map(mapPin) };
  }

  async function savePin(body, pubkey) {
    const yard = yardId(body.yardId);
    const who = await actor(pubkey);
    await requireMember(yard, who);
    const id = rowId(body.id, "Pin");
    const boardId = rowId(body.boardId, "Board");
    const title = text(body.title, "Title", 80);
    const note = optionalText(body.note, 280);
    const image = mediaRef(body.image);
    const board = (
      await query(
        "SELECT id FROM yard_boards WHERE id = ? AND yard_id = ? LIMIT 1",
        [boardId, yard],
      )
    )[0];
    if (!board) throw new HttpError(400, "Pick a board on this yard");
    const existing = (
      await query("SELECT id FROM yard_pins WHERE id = ? LIMIT 1", [id])
    )[0];
    if (!existing) {
      const count = (
        await query(
          "SELECT COUNT(*) AS n FROM yard_pins WHERE yard_id = ?",
          [yard],
        )
      )[0];
      if (num(count?.n) >= 200) throw new HttpError(400, "This yard board is full");
      await query(
        `INSERT INTO yard_pins (id, yard_id, board_id, title, note, image, author_handle, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, yard, boardId, title, note, image, who, stamp(body.createdAt)],
      );
    }
    const row = (
      await query(
        "SELECT id, yard_id, board_id, title, note, image, author_handle, created_at FROM yard_pins WHERE id = ? LIMIT 1",
        [id],
      )
    )[0];
    return { ok: true, pin: mapPin(row) };
  }

  async function mixtapes(yard) {
    const id = yard ? yardId(yard) : "";
    await ensure();
    const rows = id
      ? await query(
          `SELECT ${MIXTAPE_COLUMNS} FROM yard_mixtapes WHERE yard_id = ? ORDER BY created_at DESC`,
          [id],
        )
      : await query(
          `SELECT ${MIXTAPE_COLUMNS} FROM yard_mixtapes ORDER BY created_at DESC`,
        );
    return { ok: true, mixtapes: rows.map(mapMixtape) };
  }

  async function saveMixtape(body, pubkey) {
    const yard = yardId(body.yardId);
    const who = await actor(pubkey);
    await requireMember(yard, who);
    const id = rowId(body.id, "Mixtape");
    const title = text(body.title, "Title", 80);
    const blurb = optionalText(body.body, 500);
    const tracks = Array.isArray(body.tracks) ? body.tracks : [];
    if (!tracks.length) throw new HttpError(400, "Add at least one track");
    if (tracks.length > 12) throw new HttpError(400, "A mixtape holds up to 12 tracks");
    const clean = tracks.map((track, index) => {
      const raw = String(track?.id || "").trim();
      const id = /^[a-z0-9_.:-]{1,64}$/i.test(raw) ? raw : `track_${index}`;
      let stems = [];
      try {
        stems = stemsOf(track?.stems).map((stem) => ({
          ...stem,
          src: trackSrc(stem.src),
        }));
      } catch (err) {
        throw new HttpError(400, err instanceof Error ? err.message : "That stem is not valid.");
      }
      return {
        id,
        title: text(track?.title, "Track", 80),
        src: trackSrc(track?.src),
        stems,
      };
    });
    const packed = JSON.stringify(clean);
    if (packed.length > 8000) throw new HttpError(400, "That mixtape is too large to share.");
    const setKind = setKindOf(body.setKind);
    if (setKind === "songs" && clean.some((track) => String(track.src).startsWith("verse:"))) {
      throw new HttpError(400, "A song set needs an audio file or an https link on every row.");
    }
    const priceWb = Math.max(0, Math.min(100000, Math.floor(num(body.priceWb))));
    const editionSize = Math.max(1, Math.min(100, Math.floor(num(body.editionSize) || 1)));
    const display = optionalText(body.authorDisplayName, 40) || who;
    const cover = coverRef(body.cover);
    const credits = optionalText(body.credits, 800);
    const release = asRelease(body, setKind, clean, who, priceWb);
    const existing = (
      await query("SELECT id FROM yard_mixtapes WHERE id = ? LIMIT 1", [id])
    )[0];
    if (!existing) {
      await query(
        `INSERT INTO yard_mixtapes (
           id, yard_id, title, body, tracks, author_handle, author_display,
           price_wb, edition_size, set_kind, cover_url, credits, created_at,
           disc_format, visibility, store_url, write_receipt, rights_attested,
           splits, master_id, label_name
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          yard,
          title,
          blurb,
          packed,
          who,
          display,
          priceWb,
          editionSize,
          setKind,
          cover,
          credits,
          stamp(body.createdAt),
          release.format,
          release.visibility,
          release.storeUrl,
          release.writeReceipt ? 1 : 0,
          release.rightsAttested ? 1 : 0,
          JSON.stringify(release.splits),
          release.masterId,
          release.label,
        ],
      );
    }
    const row = (
      await query(
        `SELECT ${MIXTAPE_COLUMNS} FROM yard_mixtapes WHERE id = ? LIMIT 1`,
        [id],
      )
    )[0];
    return { ok: true, mixtape: mapMixtape(row) };
  }

  async function battles(yard) {
    const id = yard ? yardId(yard) : "";
    await ensure();
    const rows = id
      ? await query(
          "SELECT id, yard_id, title, mix_id, mix_title, set_kind, call_url, jitsi_slug, host_handle, created_at FROM yard_dj_battles WHERE yard_id = ? ORDER BY created_at DESC",
          [id],
        )
      : await query(
          "SELECT id, yard_id, title, mix_id, mix_title, set_kind, call_url, jitsi_slug, host_handle, created_at FROM yard_dj_battles ORDER BY created_at DESC",
        );
    return { ok: true, battles: rows.map(mapBattle) };
  }

  async function saveBattle(body, pubkey) {
    const yard = yardId(body.yardId);
    const who = await actor(pubkey);
    await requireMember(yard, who);
    const id = rowId(body.id, "Battle");
    const title = text(body.title, "Battle name", 80);
    const mixId = rowId(body.mixId, "Mix");
    const mixTitle = text(body.mixTitle, "Mix", 80);
    const setKind = setKindOf(body.setKind);
    const call = body.callUrl ? externalUrl(body.callUrl) : "";
    const slugRaw = String(body.jitsiSlug || "").trim();
    const slug = /^BkspcBattle[A-Za-z0-9]{4,48}$/.test(slugRaw)
      ? slugRaw
      : `BkspcBattle${yard.replace(/[^a-z0-9]/gi, "").slice(0, 12)}${Date.now().toString(36)}`;
    const existing = (
      await query("SELECT id FROM yard_dj_battles WHERE id = ? LIMIT 1", [id])
    )[0];
    if (!existing) {
      const count = (
        await query("SELECT COUNT(*) AS n FROM yard_dj_battles WHERE yard_id = ?", [yard])
      )[0];
      if (num(count?.n) >= 24) throw new HttpError(400, "This yard battle list is full.");
      await query(
        `INSERT INTO yard_dj_battles (
           id, yard_id, title, mix_id, mix_title, set_kind, call_url, jitsi_slug, host_handle, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, yard, title, mixId, mixTitle, setKind, call, slug, who, stamp(body.createdAt)],
      );
    }
    const row = (
      await query(
        "SELECT id, yard_id, title, mix_id, mix_title, set_kind, call_url, jitsi_slug, host_handle, created_at FROM yard_dj_battles WHERE id = ? LIMIT 1",
        [id],
      )
    )[0];
    return { ok: true, battle: mapBattle(row) };
  }

  const RACE_BODIES = new Set(["coupe", "lowrider", "bus", "bike"]);
  const RACE_PAINTS = new Set(["gold", "yard", "night", "cream", "cardinal", "royal"]);
  const RACE_PACE = { cruise: 20, campus: 40, yard: 60, record: 90 };
  const RACE_PRIZE = { cruise: 4, campus: 8, yard: 12, record: 16, match: 12 };
  const RACE_CAP = 40;
  const RACE_MS = 15 * 60 * 1000;

  function raceVehicle(raw) {
    const v = raw && typeof raw === "object" ? raw : {};
    const name = String(v.name || "Racer").replace(/\s+/g, " ").trim().slice(0, 16) || "Racer";
    const number = Math.max(0, Math.min(99, Math.floor(Number(v.number) || 0)));
    return {
      name,
      body: RACE_BODIES.has(v.body) ? v.body : "coupe",
      paint: RACE_PAINTS.has(v.paint) ? v.paint : "gold",
      accent: RACE_PAINTS.has(v.accent) ? v.accent : "night",
      number,
    };
  }

  function raceAccuracy(typed, target) {
    const text = String(typed || "");
    const verse = String(target || "");
    if (!verse.length || !text.length) return 0;
    const n = Math.min(text.length, verse.length);
    let hit = 0;
    for (let i = 0; i < n; i++) if (text[i] === verse[i]) hit++;
    return Math.round((100 * hit) / text.length);
  }

  function racePaceMs(length, wpm) {
    return (length * 60_000) / (wpm * 5);
  }

  async function raceEntries(id) {
    const rows = await query(
      `SELECT handle, vehicle, accuracy, progress, finished_at
         FROM yard_typeverse_entries WHERE race_id = ? ORDER BY handle`,
      [id],
    );
    return rows.map((row) => {
      let vehicle = null;
      try {
        vehicle = row.vehicle ? JSON.parse(String(row.vehicle)) : null;
      } catch {
        vehicle = null;
      }
      return {
        handle: String(row.handle),
        accuracy: num(row.accuracy),
        progress: num(row.progress),
        finishedAt: String(row.finished_at || ""),
        vehicle,
      };
    });
  }

  async function mapRace(row) {
    return {
      id: String(row.id),
      yardId: String(row.yard_id),
      hostHandle: String(row.host_handle),
      mode: String(row.mode),
      difficulty: String(row.difficulty),
      verseRef: String(row.verse_ref),
      verseText: String(row.verse_text),
      status: String(row.status),
      winnerHandle: String(row.winner_handle || ""),
      createdAt: String(row.created_at),
      startedAt: String(row.started_at || ""),
      entries: await raceEntries(String(row.id)),
    };
  }

  async function raceRow(id) {
    return (
      await query(
        `SELECT id, yard_id, host_handle, mode, difficulty, verse_ref, verse_text,
                status, winner_handle, created_at, started_at
           FROM yard_typeverse_races WHERE id = ? LIMIT 1`,
        [id],
      )
    )[0];
  }

  async function payRace(yard, handle, id, prize) {
    const day = new Date().toISOString().slice(0, 10);
    const used = num(
      (
        await query(
          `SELECT COALESCE(SUM(amount), 0) AS n FROM yard_wb
            WHERE yard_id = ? AND handle = ? AND ref LIKE 'typeverse:%'
              AND substr(created_at, 1, 10) = ?`,
          [yard, handle, day],
        )
      )[0]?.n,
    );
    const paid = Math.max(0, Math.min(prize, RACE_CAP - used));
    if (paid > 0) {
      await credit(yard, handle, paid, "Typeverse race", `typeverse:${id}`);
    }
    return { paid, balance: await balanceOf(yard, handle) };
  }

  async function typeverseRaces(yardRaw, idRaw) {
    await ensure();
    if (idRaw) {
      const id = rowId(idRaw, "Race");
      const row = await raceRow(id);
      if (!row) throw new HttpError(404, "That race is not on this yard.");
      return { ok: true, race: await mapRace(row) };
    }
    const yard = yardId(yardRaw);
    const rows = await query(
      `SELECT id, yard_id, host_handle, mode, difficulty, verse_ref, verse_text,
              status, winner_handle, created_at, started_at
         FROM yard_typeverse_races
        WHERE yard_id = ? AND mode = 'yard' AND status = 'open'
        ORDER BY created_at DESC LIMIT 20`,
      [yard],
    );
    const races = [];
    for (const row of rows) {
      const race = await mapRace(row);
      races.push({ ...race, verseText: "" });
    }
    return { ok: true, races };
  }

  async function createTypeverseRace(body, pubkey) {
    await ensure();
    const yard = yardId(body.yardId);
    const who = await actor(pubkey);
    await requireMember(yard, who);
    const id = rowId(body.id, "Race");
    const mode = body.mode === "yard" ? "yard" : body.mode === "cpu" ? "cpu" : "";
    if (!mode) throw new HttpError(400, "Race the CPU or the yard.");
    const difficulty = mode === "yard" ? "match" : String(body.difficulty || "");
    if (mode === "cpu" && !RACE_PACE[difficulty]) {
      throw new HttpError(400, "Pick a CPU difficulty.");
    }
    const verseText = text(body.verseText, "Verse", 280);
    if (verseText.length < 40) throw new HttpError(400, "That verse is too short to race.");
    if (/[\u0000-\u001f]/.test(verseText)) throw new HttpError(400, "That verse is not valid.");
    const verseRefText = text(body.verseRef, "Verse reference", 40);
    const existing = await raceRow(id);
    if (existing) return { ok: true, race: await mapRace(existing) };
    const open = num(
      (
        await query(
          "SELECT COUNT(*) AS n FROM yard_typeverse_races WHERE yard_id = ? AND status = 'open'",
          [yard],
        )
      )[0]?.n,
    );
    if (open >= 20) throw new HttpError(400, "This yard already has a full race list.");
    const now = new Date().toISOString();
    const started = mode === "cpu" ? now : "";
    await query(
      `INSERT INTO yard_typeverse_races (
         id, yard_id, host_handle, mode, difficulty, verse_ref, verse_text,
         status, winner_handle, created_at, started_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', '', ?, ?)`,
      [id, yard, who, mode, difficulty, verseRefText, verseText, now, started],
    );
    await query(
      `INSERT INTO yard_typeverse_entries (race_id, handle, vehicle, accuracy, progress, finished_at)
       VALUES (?, ?, ?, 0, 0, '')`,
      [id, who, JSON.stringify(raceVehicle(body.vehicle))],
    );
    return { ok: true, race: await mapRace(await raceRow(id)) };
  }

  async function joinTypeverseRace(body, pubkey) {
    await ensure();
    const yard = yardId(body.yardId);
    const who = await actor(pubkey);
    await requireMember(yard, who);
    const row = await raceRow(rowId(body.raceId || body.id, "Race"));
    if (!row || String(row.yard_id) !== yard) throw new HttpError(404, "That race is not on this yard.");
    if (String(row.mode) !== "yard" || String(row.status) !== "open") {
      throw new HttpError(400, "That race is not open.");
    }
    if (Date.now() - Date.parse(String(row.created_at)) > RACE_MS) {
      throw new HttpError(400, "That race closed.");
    }
    if (String(row.host_handle) === who) return { ok: true, race: await mapRace(row) };
    const entries = await raceEntries(String(row.id));
    if (entries.some((entry) => entry.handle === who)) return { ok: true, race: await mapRace(row) };
    if (entries.length >= 2) throw new HttpError(400, "That race already has two racers.");
    const now = new Date().toISOString();
    await query(
      `INSERT INTO yard_typeverse_entries (race_id, handle, vehicle, accuracy, progress, finished_at)
       VALUES (?, ?, ?, 0, 0, '')`,
      [String(row.id), who, JSON.stringify(raceVehicle(body.vehicle))],
    );
    await query(
      "UPDATE yard_typeverse_races SET started_at = ? WHERE id = ? AND started_at = ''",
      [now, String(row.id)],
    );
    return { ok: true, race: await mapRace(await raceRow(String(row.id))) };
  }

  async function typeverseProgress(body, pubkey) {
    await ensure();
    const yard = yardId(body.yardId);
    const who = await actor(pubkey);
    const row = await raceRow(rowId(body.raceId || body.id, "Race"));
    if (!row || String(row.yard_id) !== yard || String(row.status) !== "open") {
      return { ok: true };
    }
    const verseLen = String(row.verse_text || "").length;
    const correct = Math.max(0, Math.min(verseLen, Math.floor(Number(body.correct) || 0)));
    await query(
      `UPDATE yard_typeverse_entries
          SET progress = ?
        WHERE race_id = ? AND handle = ? AND finished_at = '' AND progress < ?`,
      [correct, String(row.id), who, correct],
    );
    return { ok: true };
  }

  async function finishTypeverseRace(body, pubkey) {
    await ensure();
    const yard = yardId(body.yardId);
    const who = await actor(pubkey);
    await requireMember(yard, who);
    const row = await raceRow(rowId(body.raceId || body.id, "Race"));
    if (!row || String(row.yard_id) !== yard) throw new HttpError(404, "That race is not on this yard.");
    const started = String(row.started_at || "");
    if (!started) throw new HttpError(400, "Wait for another racer.");
    if (Date.now() - Date.parse(String(row.created_at)) > RACE_MS) {
      throw new HttpError(400, "That race closed.");
    }
    const entries = await raceEntries(String(row.id));
    const mine = entries.find((entry) => entry.handle === who);
    if (!mine) throw new HttpError(403, "Join the race first.");
    if (mine.finishedAt || String(row.status) === "done") {
      return {
        ok: true,
        won: String(row.winner_handle) === who,
        paid: 0,
        balance: await balanceOf(yard, who),
        accuracy: mine.accuracy,
        reason: String(row.winner_handle) === who ? "You already finished this race." : "That race is already decided.",
        race: await mapRace(await raceRow(String(row.id))),
      };
    }
    const verse = String(row.verse_text);
    const typed = String(body.typed || "");
    const elapsed = Date.now() - Date.parse(started);
    const accuracy = raceAccuracy(typed, verse);
    const complete = typed.length === verse.length;
    const pace = RACE_PACE[String(row.difficulty)] || 40;
    const cpuDone = String(row.mode) === "cpu" && elapsed >= racePaceMs(verse.length, pace);
    const tooFast =
      String(row.mode) === "cpu" &&
      complete &&
      accuracy >= 90 &&
      elapsed < racePaceMs(verse.length, 250);
    if (!complete && !cpuDone) throw new HttpError(400, "Finish the verse.");
    if (tooFast) throw new HttpError(400, "That finish is faster than the race allows.");
    const now = new Date().toISOString();
    await query(
      `UPDATE yard_typeverse_entries
          SET accuracy = ?, progress = ?, finished_at = ?
        WHERE race_id = ? AND handle = ? AND finished_at = ''`,
      [accuracy, complete ? verse.length : Math.min(typed.length, verse.length), now, String(row.id), who],
    );
    let won = false;
    let reason = "Finish the verse.";
    if (cpuDone) reason = "The CPU finished first.";
    else if (accuracy < 90) reason = "Accuracy under 90%.";
    else if (String(row.winner_handle)) reason = "That race is already decided.";
    else {
      won = true;
      reason = String(row.mode) === "cpu" ? "You beat the CPU." : "You finished first.";
    }
    if (won || cpuDone || accuracy < 90) {
      await query(
        `UPDATE yard_typeverse_races
            SET status = 'done', winner_handle = ?
          WHERE id = ? AND status = 'open' AND winner_handle = ''`,
        [won ? who : "", String(row.id)],
      );
      const fresh = await raceRow(String(row.id));
      if (won && String(fresh?.winner_handle || "") !== who) {
        won = false;
        reason = "That race is already decided.";
      }
    }
    const prize = won ? RACE_PRIZE[String(row.difficulty)] || 0 : 0;
    const purse = won
      ? await payRace(yard, who, String(row.id), prize)
      : { paid: 0, balance: await balanceOf(yard, who) };
    if (won && purse.paid === 0) {
      reason = "You won. The daily Typeverse purse is already used.";
    }
    return {
      ok: true,
      won,
      paid: purse.paid,
      balance: purse.balance,
      accuracy,
      reason,
      race: await mapRace(await raceRow(String(row.id))),
    };
  }

  return {
    rooms,
    createRoom,
    closeRoom,
    pushWatch,
    readWatch,
    messages,
    sendMessage,
    saveDmKey,
    dmKey,
    wb,
    grantJoin,
    listings,
    createListing,
    buy,
    offerPass,
    buyPass,
    myCopies,
    deliver,
    release,
    myEscrows,
    boards,
    saveBoard,
    pins,
    savePin,
    mixtapes,
    saveMixtape,
    battles,
    saveBattle,
    typeverseRaces,
    createTypeverseRace,
    joinTypeverseRace,
    typeverseProgress,
    finishTypeverseRace,
  };
}
