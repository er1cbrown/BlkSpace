import { HttpError } from "./http.mjs";
import { getHbcu } from "../src/lib/hbcu-catalog.ts";

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
        await query(`CREATE TABLE IF NOT EXISTS yard_edition_claims (
          listing_id INTEGER NOT NULL, buyer_handle TEXT NOT NULL, created_at TEXT NOT NULL,
          PRIMARY KEY (listing_id, buyer_handle))`);
        await query(`CREATE TABLE IF NOT EXISTS yard_dj_battles (
          id TEXT PRIMARY KEY, yard_id TEXT NOT NULL, title TEXT NOT NULL,
          mix_id TEXT NOT NULL, mix_title TEXT NOT NULL, set_kind TEXT NOT NULL DEFAULT 'songs',
          call_url TEXT NOT NULL DEFAULT '', jitsi_slug TEXT NOT NULL,
          host_handle TEXT NOT NULL, created_at TEXT NOT NULL)`);
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
    const kind = ["stage", "voice", "external"].includes(body.kind) ? body.kind : "stage";
    const link = kind === "external" ? externalUrl(body.externalUrl || body.external_url) : "";
    if (kind === "external" && !link) {
      throw new HttpError(400, "Paste the Discord, Zoom, or YouTube link.");
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
      threads.set(peerHandle, {
        threadId: [yard, who, peerHandle].sort().join(":"),
        peerHandle,
        lastBody: String(row.body).slice(0, 120),
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
    const message = text(body.body, "Message", 2000);
    if (looksLikePhi(message)) {
      throw new HttpError(400, "Message blocked: looks like clinical or patient information. Use the hospital system.");
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
    return { ok: true, listings };
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
        "SELECT edition_size, set_kind, tracks, title FROM yard_mixtapes WHERE id = ? LIMIT 1",
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
    return {
      editionSize: Math.max(1, Math.min(100, num(row.edition_size) || 1)),
      setKind: setKindOf(row.set_kind),
      title: String(row.title || listing.title || ""),
      passages,
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

  async function sellEditionCopy(listing, who, price, fee, sellerNet, edition) {
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
      await credit(
        String(listing.yard_id),
        String(listing.seller_handle),
        sellerNet,
        `Yard Sale release: ${listing.title}`,
        `sale-net:${listingId}:${who}`,
      );
    } catch (err) {
      await query(
        "DELETE FROM yard_edition_claims WHERE listing_id = ? AND buyer_handle = ?",
        [listingId, who],
      );
      throw err;
    }
    if (rank >= edition.editionSize) {
      await query(
        "UPDATE yard_listings SET sold_to = ? WHERE id = ? AND sold_to IS NULL",
        ["edition-closed", listingId],
      );
    }
    await maybeGrantMark(String(listing.yard_id), who);
    const copiesLeft = edition.editionSize - rank;
    return {
      ok: true,
      listingId,
      status: "released",
      fulfillmentMode: "instant",
      amount: price,
      platformFee: fee,
      sellerNet,
      title: String(listing.title),
      deliveryHint: listing.delivery_hint ? String(listing.delivery_hint) : "",
      editionSize: edition.editionSize,
      copiesLeft,
      setKind: edition.setKind,
      passages: edition.setKind === "logos" ? edition.passages : [],
      applied: edition.setKind === "logos" ? { logosDeck: true } : undefined,
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
      if (edition) return sellEditionCopy(listing, who, price, fee, sellerNet, edition);
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
    return {
      id: String(row.id),
      yardId: String(row.yard_id),
      title: String(row.title),
      body: String(row.body || ""),
      tracks,
      authorHandle: String(row.author_handle),
      authorDisplayName: String(row.author_display || row.author_handle),
      createdAt: String(row.created_at),
      priceWb: num(row.price_wb),
      editionSize: num(row.edition_size) || 1,
      setKind: setKindOf(row.set_kind),
      cover: String(row.cover_url || ""),
      credits: String(row.credits || ""),
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
          "SELECT id, yard_id, title, body, tracks, author_handle, author_display, price_wb, edition_size, set_kind, cover_url, credits, created_at FROM yard_mixtapes WHERE yard_id = ? ORDER BY created_at DESC",
          [id],
        )
      : await query(
          "SELECT id, yard_id, title, body, tracks, author_handle, author_display, price_wb, edition_size, set_kind, cover_url, credits, created_at FROM yard_mixtapes ORDER BY created_at DESC",
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
      return {
        id,
        title: text(track?.title, "Track", 80),
        src: trackSrc(track?.src),
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
    const existing = (
      await query("SELECT id FROM yard_mixtapes WHERE id = ? LIMIT 1", [id])
    )[0];
    if (!existing) {
      await query(
        `INSERT INTO yard_mixtapes (
           id, yard_id, title, body, tracks, author_handle, author_display,
           price_wb, edition_size, set_kind, cover_url, credits, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        ],
      );
    }
    const row = (
      await query(
        "SELECT id, yard_id, title, body, tracks, author_handle, author_display, price_wb, edition_size, set_kind, cover_url, credits, created_at FROM yard_mixtapes WHERE id = ? LIMIT 1",
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

  return {
    rooms,
    createRoom,
    closeRoom,
    messages,
    sendMessage,
    wb,
    grantJoin,
    listings,
    createListing,
    buy,
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
  };
}
