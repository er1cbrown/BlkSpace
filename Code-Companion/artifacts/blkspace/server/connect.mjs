import { HttpError } from "./http.mjs";

const HANDLE_RE = /^[a-z0-9_-]{3,30}$/i;
const ORG_TYPES = new Set([
  "research",
  "professional",
  "club",
  "service",
  "peer",
]);
const INTEREST_STATUSES = new Set([
  "pending",
  "contacted",
  "accepted",
  "declined",
  "completed",
  "withdrawn",
]);
const MAX_OPEN_INTERESTS = 8;
const MAX_INTERESTS_PER_DAY = 12;

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

function handleOf(value, label = "handle") {
  if (typeof value !== "string" || !HANDLE_RE.test(value.trim())) {
    throw new HttpError(400, `${label} must be a valid handle.`);
  }
  return value.trim().toLowerCase();
}

function text(value, label, max) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${label} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new HttpError(400, `${label} is too long.`);
  }
  return trimmed;
}

function slugOf(name, id) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug || id.slice(0, 40);
}

export function createConnect(env) {
  const base = (env.TURSO_DATABASE_URL || "")
    .trim()
    .replace(/^libsql:\/\//, "https://")
    .replace(/\/$/, "");
  const token = (env.TURSO_AUTH_TOKEN || "").trim();
  let ready;

  async function query(sql, args = []) {
    if (!base || !token) {
      throw new HttpError(503, "Shared Connect storage is not configured.");
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
      throw new HttpError(
        502,
        "Shared Connect storage could not complete the request. Please retry.",
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
    if (!ready) {
      ready = (async () => {
        await query(`CREATE TABLE IF NOT EXISTS portfolio_identities (
          handle TEXT PRIMARY KEY COLLATE NOCASE, pubkey TEXT NOT NULL)`);
        await query(`CREATE TABLE IF NOT EXISTS connect_orgs (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          org_type TEXT NOT NULL,
          yard_id TEXT DEFAULT '',
          description TEXT DEFAULT '',
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`);
        await query(`CREATE TABLE IF NOT EXISTS connect_org_members (
          org_id TEXT NOT NULL,
          handle TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'member',
          PRIMARY KEY (org_id, handle)
        )`);
        await query(`CREATE TABLE IF NOT EXISTS connect_opportunities (
          id INTEGER PRIMARY KEY,
          org_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          duration_text TEXT DEFAULT '',
          tags_json TEXT DEFAULT '[]',
          status TEXT DEFAULT 'open',
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`);
        await query(`CREATE TABLE IF NOT EXISTS connect_interests (
          id INTEGER PRIMARY KEY,
          opportunity_id INTEGER NOT NULL,
          handle TEXT NOT NULL,
          message TEXT DEFAULT '',
          skills_snapshot TEXT DEFAULT '',
          classification TEXT DEFAULT '',
          gpa TEXT DEFAULT '',
          gpa_shared INTEGER DEFAULT 0,
          status TEXT DEFAULT 'pending',
          created_at TEXT NOT NULL,
          UNIQUE (opportunity_id, handle)
        )`);
        await seed();
      })();
    }
    await ready;
  }

  async function seed() {
    const now = "2026-08-01T12:00:00.000Z";
    const orgs = [
      ["org_nsbe_tsu", "nsbe-tsu", "NSBE @ TSU", "professional", "tsu", "Career prep, hackathons, and peer mentorship.", "demo_user"],
      ["org_meharry_research", "meharry-med-research", "Meharry Medical Research Network", "research", "meharry", "Faculty and student research for Meharry scholars. Async hours for people on rotations.", "demo_user"],
      ["org_ieee_tsu", "ieee-tsu", "IEEE Student Branch @ TSU", "professional", "tsu", "Device and computing projects for students who build the yard.", "demo_user"],
    ];
    for (const row of orgs) {
      await query(
        `INSERT OR IGNORE INTO connect_orgs
         (id, slug, name, org_type, yard_id, description, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [...row, now],
      );
      await query(
        `INSERT OR IGNORE INTO connect_org_members (org_id, handle, role) VALUES (?, ?, 'owner')`,
        [row[0], row[6]],
      );
    }
    const opps = [
      [11, "org_nsbe_tsu", "NSBE project night", "Bring a campus project and find a teammate.", "one evening", "demo_user"],
      [12, "org_meharry_research", "Health disparities micro-lab", "Short async reading and a write-up. No patient records.", "2–4 hr/week", "demo_user"],
      [13, "org_ieee_tsu", "Device B yard check", "Walk the student path on a Tier 0 laptop and write down what broke.", "one session", "demo_user"],
    ];
    for (const row of opps) {
      await query(
        `INSERT OR IGNORE INTO connect_opportunities
         (id, org_id, title, description, duration_text, tags_json, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, '[]', 'open', ?, ?)`,
        [row[0], row[1], row[2], row[3], row[4], row[5], now],
      );
    }
  }

  async function identity(pubkey) {
    const row = (
      await query(
        "SELECT handle, pubkey FROM portfolio_identities WHERE pubkey = ? LIMIT 1",
        [pubkey],
      )
    )[0];
    if (!row?.handle) {
      throw new HttpError(400, "Save your handle before using ProjectConnect.");
    }
    return handleOf(String(row.handle));
  }

  function mapOrg(row) {
    return {
      id: String(row.id),
      slug: String(row.slug || ""),
      name: String(row.name || ""),
      orgType: String(row.org_type || ""),
      yardId: String(row.yard_id || ""),
      description: String(row.description || ""),
      createdBy: String(row.created_by || ""),
      memberCount: num(row.member_count),
      opportunityCount: num(row.opportunity_count),
      createdAt: String(row.created_at || ""),
    };
  }

  function mapOpp(row) {
    return {
      id: num(row.id),
      orgId: String(row.org_id || ""),
      orgName: String(row.org_name || ""),
      orgType: String(row.org_type || ""),
      title: String(row.title || ""),
      description: String(row.description || ""),
      durationText: String(row.duration_text || ""),
      tagsJson: String(row.tags_json || "[]"),
      status: String(row.status || "open"),
      createdBy: String(row.created_by || ""),
      interestCount: num(row.interest_count),
      createdAt: String(row.created_at || ""),
    };
  }

  function mapInterest(row, viewer) {
    const shared = num(row.gpa_shared) === 1;
    const showGpa = shared && (!viewer || viewer === row.handle || viewer === row.lead_handle);
    return {
      id: num(row.id),
      opportunityId: num(row.opportunity_id),
      opportunityTitle: String(row.opportunity_title || ""),
      orgName: String(row.org_name || ""),
      handle: String(row.handle || ""),
      displayName: String(row.handle || ""),
      message: String(row.message || ""),
      skillsSnapshot: String(row.skills_snapshot || ""),
      classification: String(row.classification || ""),
      gpa: showGpa ? String(row.gpa || "") : "",
      gpaShared: shared,
      status: String(row.status || "pending"),
      createdAt: String(row.created_at || ""),
      yardCred: num(row.yard_cred),
    };
  }

  const orgSelect = `
    SELECT o.id, o.slug, o.name, o.org_type, o.yard_id, o.description, o.created_by, o.created_at,
           (SELECT COUNT(*) FROM connect_org_members m WHERE m.org_id = o.id) AS member_count,
           (SELECT COUNT(*) FROM connect_opportunities p WHERE p.org_id = o.id) AS opportunity_count
      FROM connect_orgs o`;

  const oppSelect = `
    SELECT p.id, p.org_id, o.name AS org_name, o.org_type, p.title, p.description,
           p.duration_text, p.tags_json, p.status, p.created_by, p.created_at,
           (SELECT COUNT(*) FROM connect_interests i WHERE i.opportunity_id = p.id) AS interest_count
      FROM connect_opportunities p
      JOIN connect_orgs o ON o.id = p.org_id`;

  async function orgs(orgType) {
    await ensure();
    const rows =
      orgType && orgType !== "all"
        ? await query(`${orgSelect} WHERE o.org_type = ? ORDER BY o.name`, [orgType])
        : await query(`${orgSelect} ORDER BY o.name`);
    return { ok: true, orgs: rows.map(mapOrg) };
  }

  async function org(id) {
    await ensure();
    const row = (await query(`${orgSelect} WHERE o.id = ? OR o.slug = ? LIMIT 1`, [id, id]))[0];
    if (!row) throw new HttpError(404, "Organization not found.");
    return { ok: true, org: mapOrg(row) };
  }

  async function opportunities(filters) {
    await ensure();
    const where = ["p.status = 'open'"];
    const args = [];
    if (filters.orgId) {
      where.push("p.org_id = ?");
      args.push(filters.orgId);
    }
    if (filters.orgType && filters.orgType !== "all") {
      where.push("o.org_type = ?");
      args.push(filters.orgType);
    }
    const rows = await query(
      `${oppSelect} WHERE ${where.join(" AND ")} ORDER BY p.created_at DESC`,
      args,
    );
    return { ok: true, opportunities: rows.map(mapOpp) };
  }

  async function opportunity(id) {
    await ensure();
    const row = (await query(`${oppSelect} WHERE p.id = ? LIMIT 1`, [num(id)]))[0];
    if (!row) throw new HttpError(404, "Opportunity not found.");
    return { ok: true, opportunity: mapOpp(row) };
  }

  async function isLead(orgId, handle) {
    const member = (
      await query(
        `SELECT role FROM connect_org_members WHERE org_id = ? AND handle = ? LIMIT 1`,
        [orgId, handle],
      )
    )[0];
    if (member && ["owner", "lead"].includes(String(member.role))) return true;
    const owned = (
      await query(
        `SELECT id FROM connect_orgs WHERE id = ? AND created_by = ? LIMIT 1`,
        [orgId, handle],
      )
    )[0];
    return Boolean(owned);
  }

  async function createOrg(body, pubkey) {
    await ensure();
    const actor = await identity(pubkey);
    const name = text(body.name, "Name", 80);
    const orgType = String(body.orgType || body.org_type || "");
    if (!ORG_TYPES.has(orgType)) throw new HttpError(400, "Organization type is not recognized.");
    const yardId = String(body.yardId || body.yard_id || "").trim().toLowerCase().slice(0, 40);
    const description =
      String(body.description || "").trim().slice(0, 2000) ||
      "Campus organization.";
    const existing = (
      await query(
        `SELECT id FROM connect_orgs WHERE created_by = ? AND lower(name) = lower(?) LIMIT 1`,
        [actor, name],
      )
    )[0];
    if (existing) return org(existing.id);
    const id = `org_${actor}_${Date.now()}`;
    const now = new Date().toISOString();
    await query(
      `INSERT INTO connect_orgs
       (id, slug, name, org_type, yard_id, description, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, slugOf(name, id), name, orgType, yardId, description, actor, now],
    );
    await query(
      `INSERT OR IGNORE INTO connect_org_members (org_id, handle, role) VALUES (?, ?, 'owner')`,
      [id, actor],
    );
    return org(id);
  }

  async function createOpportunity(body, pubkey) {
    await ensure();
    const actor = await identity(pubkey);
    const orgId = text(String(body.orgId || body.org_id || ""), "Organization", 80);
    if (!(await isLead(orgId, actor))) {
      throw new HttpError(403, "Only organization leads can post an opening.");
    }
    const title = text(body.title, "Title", 140);
    const description = text(body.description, "Description", 4000);
    const duration = String(body.durationText || body.duration_text || "").slice(0, 80);
    const tags = String(body.tagsJson || body.tags_json || "[]").slice(0, 500);
    const next = num((await query(`SELECT COALESCE(MAX(id), 100) + 1 AS id FROM connect_opportunities`))[0]?.id) || Date.now();
    const now = new Date().toISOString();
    await query(
      `INSERT INTO connect_opportunities
       (id, org_id, title, description, duration_text, tags_json, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      [next, orgId, title, description, duration, tags, actor, now],
    );
    return opportunity(next);
  }

  async function credFor(handle) {
    const who = handleOf(handle);
    const interests = num((await query(`SELECT COUNT(*) AS n FROM connect_interests WHERE handle = ?`, [who]))[0]?.n);
    const completions = num((await query(`SELECT COUNT(*) AS n FROM connect_interests WHERE handle = ? AND status = 'completed'`, [who]))[0]?.n);
    const orgs = num((await query(`SELECT COUNT(*) AS n FROM connect_orgs WHERE created_by = ?`, [who]))[0]?.n);
    const score = Math.min(100, Math.round(12 + completions * 18 + orgs * 10 + interests * 4));
    return {
      handle: who,
      score,
      karma: 40,
      completions,
      endorsements: completions,
      orgsJoined: orgs,
      interests,
    };
  }

  async function cred(handle) {
    await ensure();
    return { ok: true, cred: await credFor(handle) };
  }

  async function expressInterest(body, pubkey) {
    await ensure();
    const actor = await identity(pubkey);
    const opportunityId = num(body.opportunityId || body.opportunity_id);
    const opp = (await query(`SELECT id, title, org_id, created_by FROM connect_opportunities WHERE id = ? LIMIT 1`, [opportunityId]))[0];
    if (!opp) throw new HttpError(404, "Opportunity not found.");
    const existing = (await query(`SELECT id FROM connect_interests WHERE opportunity_id = ? AND handle = ? LIMIT 1`, [opportunityId, actor]))[0];
    if (!existing) {
      const open = num((await query(`SELECT COUNT(*) AS n FROM connect_interests WHERE handle = ? AND status IN ('pending','contacted','accepted')`, [actor]))[0]?.n);
      if (open >= MAX_OPEN_INTERESTS) {
        throw new HttpError(429, `Interest limit: at most ${MAX_OPEN_INTERESTS} open applications.`);
      }
      const today = new Date().toISOString().slice(0, 10);
      const day = num((await query(`SELECT COUNT(*) AS n FROM connect_interests WHERE handle = ? AND created_at LIKE ?`, [actor, `${today}%`]))[0]?.n);
      if (day >= MAX_INTERESTS_PER_DAY) {
        throw new HttpError(429, `Daily interest limit (${MAX_INTERESTS_PER_DAY}/day) reached.`);
      }
    }
    const share = Boolean(body.gpaShared || body.gpa_shared) && String(body.gpa || "").trim();
    const gpa = share ? String(body.gpa).trim().slice(0, 8) : "";
    const message = String(body.message || "").slice(0, 2000);
    const skills = String(body.skillsSnapshot || body.skills_snapshot || "").slice(0, 500);
    const classification = String(body.classification || "").slice(0, 40);
    const now = new Date().toISOString();
    if (existing) {
      await query(
        `UPDATE connect_interests
            SET message = ?, skills_snapshot = ?, classification = ?, gpa = ?, gpa_shared = ?, status = 'pending'
          WHERE id = ?`,
        [message, skills, classification, gpa, share ? 1 : 0, num(existing.id)],
      );
    } else {
      const id = num((await query(`SELECT COALESCE(MAX(id), 0) + 1 AS id FROM connect_interests`))[0]?.id);
      await query(
        `INSERT INTO connect_interests
         (id, opportunity_id, handle, message, skills_snapshot, classification, gpa, gpa_shared, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [id, opportunityId, actor, message, skills, classification, gpa, share ? 1 : 0, now],
      );
    }
    const credRow = await credFor(actor);
    const row = (await query(
      `SELECT i.*, p.title AS opportunity_title, o.name AS org_name, ? AS yard_cred, '' AS lead_handle
         FROM connect_interests i
         JOIN connect_opportunities p ON p.id = i.opportunity_id
         JOIN connect_orgs o ON o.id = p.org_id
        WHERE i.opportunity_id = ? AND i.handle = ? LIMIT 1`,
      [credRow.score, opportunityId, actor],
    ))[0];
    return { ok: true, interest: mapInterest(row, actor) };
  }

  async function interests(opportunityId) {
    await ensure();
    const rows = await query(
      `SELECT i.*, p.title AS opportunity_title, o.name AS org_name, o.created_by AS lead_handle, 0 AS yard_cred
         FROM connect_interests i
         JOIN connect_opportunities p ON p.id = i.opportunity_id
         JOIN connect_orgs o ON o.id = p.org_id
        WHERE i.opportunity_id = ?
        ORDER BY i.created_at DESC`,
      [num(opportunityId)],
    );
    return { ok: true, interests: rows.map((row) => mapInterest(row, "")) };
  }

  async function inbox(pubkey) {
    await ensure();
    const actor = await identity(pubkey);
    const rows = await query(
      `SELECT i.*, p.title AS opportunity_title, o.name AS org_name, o.created_by AS lead_handle, 0 AS yard_cred
         FROM connect_interests i
         JOIN connect_opportunities p ON p.id = i.opportunity_id
         JOIN connect_orgs o ON o.id = p.org_id
        WHERE p.created_by = ? OR o.created_by = ? OR EXISTS (
          SELECT 1 FROM connect_org_members m
           WHERE m.org_id = o.id AND m.handle = ? AND m.role IN ('owner','lead')
        )
        ORDER BY i.created_at DESC`,
      [actor, actor, actor],
    );
    return { ok: true, interests: rows.map((row) => mapInterest(row, actor)) };
  }

  async function mine(pubkey) {
    await ensure();
    const actor = await identity(pubkey);
    const rows = await query(
      `SELECT i.*, p.title AS opportunity_title, o.name AS org_name, '' AS lead_handle, 0 AS yard_cred
         FROM connect_interests i
         JOIN connect_opportunities p ON p.id = i.opportunity_id
         JOIN connect_orgs o ON o.id = p.org_id
        WHERE i.handle = ?
        ORDER BY i.created_at DESC`,
      [actor],
    );
    return { ok: true, interests: rows.map((row) => mapInterest(row, actor)) };
  }

  async function setStatus(body, pubkey) {
    await ensure();
    const actor = await identity(pubkey);
    const id = num(body.interestId || body.interest_id);
    const status = String(body.status || "");
    const normalized = status === "rejected" ? "declined" : status;
    if (!INTEREST_STATUSES.has(normalized)) throw new HttpError(400, "Status is not recognized.");
    const row = (await query(
      `SELECT i.id, p.org_id FROM connect_interests i
         JOIN connect_opportunities p ON p.id = i.opportunity_id
        WHERE i.id = ? LIMIT 1`,
      [id],
    ))[0];
    if (!row) throw new HttpError(404, "Application not found.");
    if (!(await isLead(String(row.org_id), actor))) {
      throw new HttpError(403, "Only organization leads can update an application.");
    }
    await query(`UPDATE connect_interests SET status = ? WHERE id = ?`, [normalized, id]);
    return { ok: true, status: normalized };
  }

  return {
    orgs,
    org,
    opportunities,
    opportunity,
    cred,
    createOrg,
    createOpportunity,
    expressInterest,
    interests,
    inbox,
    mine,
    setStatus,
  };
}
