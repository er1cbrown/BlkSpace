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
    host.includes("discord") ||
    host.includes("zoom.") ||
    host.includes("youtube.com") ||
    host.includes("youtu.be") ||
    host.includes("twitch.tv") ||
    host.includes("meet.google") ||
    host.includes("meet.jit.si") ||
    host.includes("teams.microsoft") ||
    host.endsWith(".edu");
  if (!allowed) {
    throw new HttpError(400, "Use a Discord, Zoom, YouTube, Meet, or .edu link.");
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

  async function query(sql, args = []) {
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
      throw new HttpError(502, "Shared yard storage could not complete the request. Please retry.");
    }
    const result = entry.response.result;
    return (result.rows || []).map((row) =>
      Object.fromEntries(result.cols.map((col, i) => [col.name, row[i]?.value ?? null])),
    );
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
          item_type TEXT NOT NULL DEFAULT 'item', sold_to TEXT, created_at TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS yard_escrow (
          id INTEGER PRIMARY KEY, listing_id INTEGER NOT NULL, yard_id TEXT NOT NULL,
          buyer_handle TEXT NOT NULL, seller_handle TEXT NOT NULL, amount INTEGER NOT NULL,
          seller_net INTEGER NOT NULL, platform_fee INTEGER NOT NULL, status TEXT NOT NULL,
          delivery_ref TEXT, title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS yard_marks (
          yard_id TEXT NOT NULL, handle TEXT NOT NULL, school TEXT NOT NULL DEFAULT '',
          short_name TEXT NOT NULL, created_at TEXT NOT NULL,
          PRIMARY KEY (yard_id, handle))`);
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
    const id = await nextId("yard_wb");
    await query(
      `INSERT INTO yard_wb (id, yard_id, handle, amount, reason, ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, yard, handle, amount, reason, ref, new Date().toISOString()],
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
    const id = await nextId("yard_rooms");
    const slug = `BkspcYard${yard.replace(/-/g, "")}${title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24)}${id}`;
    await query(
      `INSERT INTO yard_rooms
        (id, yard_id, title, kind, external_url, jitsi_slug, created_by, created_at, closed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, yard, title, kind, link || null, slug, who, new Date().toISOString()],
    );
    const row = (
      await query("SELECT * FROM yard_rooms WHERE id = ?", [id])
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
    const id = await nextId("yard_messages");
    const createdAt = new Date().toISOString();
    await query(
      `INSERT INTO yard_messages (id, yard_id, from_handle, to_handle, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, yard, who, to, message, createdAt],
    );
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
      price: num(row.price),
      title: String(row.title),
      description: String(row.description || ""),
      townTag: String(row.yard_id),
      fulfillmentMode: "escrow",
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
    return { ok: true, listings: rows.map(mapListing) };
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
    const id = await nextId("yard_listings");
    await query(
      `INSERT INTO yard_listings
        (id, yard_id, seller_handle, title, description, price, item_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        yard,
        who,
        title,
        description,
        price,
        String(body.itemType || body.item_type || "item").slice(0, 40),
        new Date().toISOString(),
      ],
    );
    await maybeGrantMark(yard, who);
    return { ok: true, id };
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
    const escrowId = await nextId("yard_escrow");
    const now = new Date().toISOString();
    await query("UPDATE yard_listings SET sold_to = ? WHERE id = ?", [who, num(listing.id)]);
    await query(
      `INSERT INTO yard_escrow
        (id, listing_id, yard_id, buyer_handle, seller_handle, amount, seller_net, platform_fee,
         status, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'funds_locked', ?, ?, ?)`,
      [
        escrowId,
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
    );
    const debitId = await nextId("yard_wb");
    await query(
      `INSERT INTO yard_wb (id, yard_id, handle, amount, reason, ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [debitId, yard, who, -price, `Yard Sale: ${listing.title}`, `escrow:${escrowId}`, now],
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
  };
}
