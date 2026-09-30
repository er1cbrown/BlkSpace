import { HttpError } from "./http.mjs";

const YARD_RE = /^[a-z0-9-]{2,40}$/;
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
    throw new HttpError(400, "Save your handle before joining a yard.");
  }
  return value.trim().toLowerCase();
}

function required(value, label, max) {
  const text = String(value || "").trim();
  if (!text) throw new HttpError(400, `${label} is required.`);
  if (text.length > max) throw new HttpError(400, `${label} is too long.`);
  return text;
}

export function createYards(env) {
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
          yard_id TEXT NOT NULL,
          handle TEXT NOT NULL,
          joined_at TEXT NOT NULL,
          PRIMARY KEY (yard_id, handle)
        )`);
        await query(`CREATE TABLE IF NOT EXISTS yard_events (
          id INTEGER PRIMARY KEY,
          yard_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          location TEXT NOT NULL DEFAULT '',
          starts_at TEXT NOT NULL,
          ends_at TEXT,
          capacity INTEGER,
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`);
        await query(`CREATE TABLE IF NOT EXISTS yard_rsvps (
          event_id INTEGER NOT NULL,
          handle TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (event_id, handle)
        )`);
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
    if (!row?.handle) throw new HttpError(400, "Save your handle before joining a yard.");
    return handleOf(String(row.handle));
  }

  async function counts() {
    await ensure();
    const rows = await query(
      `SELECT yard_id, COUNT(*) AS n FROM yard_members GROUP BY yard_id`,
    );
    const counts = {};
    for (const row of rows) counts[String(row.yard_id)] = num(row.n);
    return { ok: true, counts };
  }

  async function members(id) {
    await ensure();
    const yard = yardId(id);
    const rows = await query(
      `SELECT handle, joined_at FROM yard_members WHERE yard_id = ? ORDER BY joined_at, handle`,
      [yard],
    );
    return {
      ok: true,
      yardId: yard,
      count: rows.length,
      members: rows.map((row) => ({
        handle: String(row.handle),
        joinedAt: String(row.joined_at || ""),
      })),
    };
  }

  async function mine(pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const rows = await query(
      `SELECT yard_id FROM yard_members WHERE handle = ? ORDER BY yard_id`,
      [who],
    );
    return { ok: true, yards: rows.map((row) => String(row.yard_id)) };
  }

  async function join(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const yard = yardId(body.yardId || body.yard_id || body.communityId);
    await query(
      `INSERT OR IGNORE INTO yard_members (yard_id, handle, joined_at) VALUES (?, ?, ?)`,
      [yard, who, new Date().toISOString()],
    );
    const count = num(
      (await query(`SELECT COUNT(*) AS n FROM yard_members WHERE yard_id = ?`, [yard]))[0]?.n,
    );
    return { ok: true, joined: true, yardId: yard, handle: who, memberCount: count };
  }

  function mapEvent(row, me) {
    const going = num(row.going_count);
    const capacity = row.capacity == null || row.capacity === "" ? null : num(row.capacity);
    return {
      id: num(row.id),
      communityId: String(row.yard_id),
      title: String(row.title || ""),
      description: String(row.description || ""),
      location: String(row.location || ""),
      startsAt: String(row.starts_at || ""),
      endsAt: row.ends_at || null,
      createdBy: String(row.created_by || ""),
      createdByDisplayName: String(row.created_by || ""),
      rsvpCount: num(row.rsvp_count),
      goingCount: going,
      waitlistCount: num(row.waitlist_count),
      capacity,
      spotsRemaining: capacity == null ? null : Math.max(0, capacity - going),
      userRsvp: me ? row.user_status || null : null,
      userWaitlisted: me ? row.user_status === "waitlist" : false,
      ticketPriceWb: 0,
      eventKind: "general",
    };
  }

  const eventSelect = `
    SELECT e.id, e.yard_id, e.title, e.description, e.location, e.starts_at, e.ends_at,
           e.capacity, e.created_by, e.created_at,
           (SELECT COUNT(*) FROM yard_rsvps r WHERE r.event_id = e.id) AS rsvp_count,
           (SELECT COUNT(*) FROM yard_rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS going_count,
           (SELECT COUNT(*) FROM yard_rsvps r WHERE r.event_id = e.id AND r.status = 'waitlist') AS waitlist_count,
           (SELECT status FROM yard_rsvps r WHERE r.event_id = e.id AND r.handle = ? LIMIT 1) AS user_status
      FROM yard_events e`;

  async function events(id, pubkey) {
    await ensure();
    const yard = yardId(id);
    let me = "";
    if (pubkey) {
      try {
        me = await actor(pubkey);
      } catch {
        me = "";
      }
    }
    const rows = await query(
      `${eventSelect} WHERE e.yard_id = ? ORDER BY e.starts_at`,
      [me, yard],
    );
    return { ok: true, events: rows.map((row) => mapEvent(row, me)) };
  }

  async function createEvent(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const yard = yardId(body.communityId || body.yardId);
    const member = (
      await query(
        `SELECT handle FROM yard_members WHERE yard_id = ? AND handle = ? LIMIT 1`,
        [yard, who],
      )
    )[0];
    if (!member) throw new HttpError(403, "Join the yard before posting an event.");
    const title = required(body.title, "Title", 140);
    const description = String(body.description || "").trim().slice(0, 4000);
    const location = String(body.location || "").trim().slice(0, 140);
    const startsAt = required(body.startsAt || body.starts_at, "Start time", 40);
    const capacityRaw = body.capacity;
    const capacity =
      capacityRaw == null || capacityRaw === "" ? null : Math.max(1, num(capacityRaw));
    const id = num(
      (await query(`SELECT COALESCE(MAX(id), 0) + 1 AS id FROM yard_events`))[0]?.id,
    );
    await query(
      `INSERT INTO yard_events
       (id, yard_id, title, description, location, starts_at, ends_at, capacity, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        yard,
        title,
        description,
        location,
        startsAt,
        body.endsAt || null,
        capacity,
        who,
        new Date().toISOString(),
      ],
    );
    const row = (await query(`${eventSelect} WHERE e.id = ? LIMIT 1`, [who, id]))[0];
    return { ok: true, event: mapEvent(row, who) };
  }

  async function rsvp(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const eventId = num(body.eventId || body.event_id);
    const event = (
      await query(`SELECT id, yard_id, capacity FROM yard_events WHERE id = ? LIMIT 1`, [eventId])
    )[0];
    if (!event) throw new HttpError(404, "Event not found.");
    const member = (
      await query(
        `SELECT handle FROM yard_members WHERE yard_id = ? AND handle = ? LIMIT 1`,
        [event.yard_id, who],
      )
    )[0];
    if (!member) throw new HttpError(403, "Join the yard before RSVPing.");
    let status = body.status === "interested" ? "interested" : "going";
    const going = num(
      (
        await query(
          `SELECT COUNT(*) AS n FROM yard_rsvps
            WHERE event_id = ? AND status = 'going' AND handle <> ?`,
          [eventId, who],
        )
      )[0]?.n,
    );
    const capacity = event.capacity == null || event.capacity === "" ? null : num(event.capacity);
    let waitlisted = false;
    if (status === "going" && capacity != null && going >= capacity) {
      status = "waitlist";
      waitlisted = true;
    }
    await query(
      `INSERT INTO yard_rsvps (event_id, handle, status, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(event_id, handle) DO UPDATE SET status = excluded.status`,
      [eventId, who, status, new Date().toISOString()],
    );
    return { ok: true, rsvped: true, status, waitlisted, eventId, handle: who };
  }

  async function cancelRsvp(body, pubkey) {
    await ensure();
    const who = await actor(pubkey);
    const eventId = num(body.eventId || body.event_id);
    await query(`DELETE FROM yard_rsvps WHERE event_id = ? AND handle = ?`, [eventId, who]);
    return { ok: true, rsvped: false, eventId };
  }

  async function guests(eventId) {
    await ensure();
    const rows = await query(
      `SELECT handle, status, created_at FROM yard_rsvps WHERE event_id = ? ORDER BY created_at`,
      [num(eventId)],
    );
    return {
      ok: true,
      guests: rows.map((row) => ({
        handle: String(row.handle),
        displayName: String(row.handle),
        status: String(row.status),
        paidWb: 0,
        checkedIn: false,
        waitlisted: row.status === "waitlist",
        createdAt: String(row.created_at || ""),
        yardCred: 0,
      })),
    };
  }

  return { counts, members, mine, join, events, createEvent, rsvp, cancelRsvp, guests };
}
