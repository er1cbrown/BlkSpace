import { HttpError } from "./http.mjs";
import { JOIN_GRANT_WB, YARD_CRED_GATE } from "./yard-desk.mjs";

export const TERMS_VERSION = "2026-10-07";
export const TIP_FEE_BPS = 200;
export const MARKET_FEE_BPS = 500;
export const DAILY_CAP_WB = 250;
export const GENESIS_WB = 0;
export const CRED_GATE = 15;
export const MAX_PAGES = 8;

const HANDLE_RE = /^[a-z0-9_-]{3,30}$/;
const SLUG_RE = /^[a-z0-9-]{1,40}$/;
const PAGE_KINDS = new Set(["home", "resume", "transfer", "work", "links", "board"]);
const HUB_KINDS = new Set(["resume", "transfer", "blkspace"]);

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
  if (typeof value !== "string" || !HANDLE_RE.test(value.trim().toLowerCase())) {
    throw new HttpError(400, `${label} must be a valid handle.`);
  }
  return value.trim().toLowerCase();
}

function text(value, label, max) {
  if (typeof value !== "string") throw new HttpError(400, `${label} is required.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) {
    throw new HttpError(400, `${label} must be 1 to ${max} characters.`);
  }
  return trimmed;
}

function httpsLink(value) {
  const link = typeof value === "string" ? value.trim() : "";
  if (!link) return "";
  let url;
  try {
    url = new URL(link);
  } catch {
    throw new HttpError(400, "Page links must be https URLs.");
  }
  if (url.protocol !== "https:" || link.length > 300) {
    throw new HttpError(400, "Page links must be https URLs.");
  }
  return url.toString();
}

export function termsDocument() {
  return {
    ok: true,
    version: TERMS_VERSION,
    tipFeeBps: TIP_FEE_BPS,
    marketplaceFeeBps: MARKET_FEE_BPS,
    dailyCapWb: DAILY_CAP_WB,
    genesisWb: GENESIS_WB,
    joinGrantWb: JOIN_GRANT_WB,
    yardCredGate: YARD_CRED_GATE,
    credGate: CRED_GATE,
    emptyPoolPays: 0,
    weixbucksAreCash: false,
    convertsTo: [],
    chainSocket: "not-connected",
    cashOut: false,
    blkshiTrades: false,
    rules: [
      "WeixBucks move from an account that already holds them.",
      "A tip pays the published fee into the yard pool.",
      "An empty pool pays 0.",
      "Joining a yard grants 50 WB once in that yard. It does not refill.",
      "Posting, refreshing, and referrals do not mint WeixBucks.",
      "Yard Cred is counted inside that yard. At 15, that university's mark is granted and no extra WeixBucks are minted.",
      "Yard Cred is not spendable and does not convert to WeixBucks.",
      "WeixBucks do not convert to SOL, HYPE, BI9, or dollars.",
      "BLKSHI does not take trades. The chain socket is not connected.",
    ],
  };
}

export function createHubs(env) {
  const base = (env.TURSO_DATABASE_URL || "")
    .trim()
    .replace(/^libsql:\/\//, "https://")
    .replace(/\/$/, "");
  const token = (env.TURSO_AUTH_TOKEN || "").trim();
  let ready;

  async function query(sql, args = []) {
    if (!base || !token) {
      throw new HttpError(503, "Shared post storage is not configured.");
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
    if (!ready) {
      ready = (async () => {
        await query(`CREATE TABLE IF NOT EXISTS portfolio_hubs (
          handle TEXT PRIMARY KEY,
          pubkey TEXT NOT NULL,
          headline TEXT NOT NULL DEFAULT '',
          kind TEXT NOT NULL DEFAULT 'blkspace',
          wallet_enabled INTEGER NOT NULL DEFAULT 0,
          terms_version TEXT NOT NULL DEFAULT '',
          terms_accepted_at TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        )`);
        await query(`CREATE TABLE IF NOT EXISTS portfolio_hub_pages (
          id INTEGER PRIMARY KEY,
          handle TEXT NOT NULL,
          slug TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          link_url TEXT NOT NULL DEFAULT '',
          kind TEXT NOT NULL,
          position INTEGER NOT NULL,
          UNIQUE(handle, slug)
        )`);
        await query(`CREATE TABLE IF NOT EXISTS ledger_accounts (
          handle TEXT NOT NULL,
          yard_id TEXT NOT NULL,
          balance INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (handle, yard_id)
        )`);
        await query(`CREATE TABLE IF NOT EXISTS ledger_pool (
          yard_id TEXT PRIMARY KEY,
          balance INTEGER NOT NULL DEFAULT 0
        )`);
      })();
    }
    await ready;
  }

  async function identity(pubkey) {
    const rows = await query(
      "SELECT handle, pubkey FROM portfolio_identities WHERE pubkey = ? LIMIT 1",
      [pubkey],
    );
    if (!rows[0]) throw new HttpError(404, "Register a handle first.");
    return String(rows[0].handle).toLowerCase();
  }

  function mapPage(row) {
    return {
      slug: String(row.slug),
      title: String(row.title),
      body: String(row.body),
      linkUrl: String(row.link_url || ""),
      kind: String(row.kind),
      position: num(row.position),
    };
  }

  async function pagesFor(handle) {
    const rows = await query(
      `SELECT slug, title, body, link_url, kind, position
         FROM portfolio_hub_pages WHERE handle = ? ORDER BY position, slug`,
      [handle],
    );
    return rows.map(mapPage);
  }

  async function list() {
    await ensure();
    const rows = await query(
      `SELECT handle, headline, kind FROM portfolio_hubs ORDER BY handle`,
    );
    return {
      ok: true,
      hubs: rows.map((row) => ({
        handle: String(row.handle),
        headline: String(row.headline || ""),
        kind: String(row.kind || "blkspace"),
      })),
    };
  }

  async function door(handleRaw) {
    await ensure();
    const handle = handleOf(handleRaw);
    const rows = await query(
      "SELECT handle, headline, kind FROM portfolio_hubs WHERE handle = ? LIMIT 1",
      [handle],
    );
    if (!rows[0]) throw new HttpError(404, "Hub not found.");
    return {
      ok: true,
      handle,
      headline: String(rows[0].headline || ""),
      kind: String(rows[0].kind || "blkspace"),
      pages: await pagesFor(handle),
    };
  }

  async function page(handleRaw, slugRaw) {
    const hub = await door(handleRaw);
    const slug = String(slugRaw || "").trim().toLowerCase();
    const found = hub.pages.find((item) => item.slug === slug);
    if (!found) throw new HttpError(404, "Page not found.");
    return { ok: true, handle: hub.handle, headline: hub.headline, page: found };
  }

  async function saveDoor(body, pubkey) {
    await ensure();
    const owner = await identity(pubkey);
    if (body.handle && handleOf(body.handle) !== owner) {
      throw new HttpError(403, "Only the hub owner can edit this hub.");
    }
    const headline = text(body.headline, "Headline", 120);
    const kind = HUB_KINDS.has(body.kind) ? body.kind : "blkspace";
    const existing = await query(
      "SELECT handle FROM portfolio_hubs WHERE handle = ? LIMIT 1",
      [owner],
    );
    if (existing[0]) {
      await query(
        "UPDATE portfolio_hubs SET headline = ?, kind = ? WHERE handle = ?",
        [headline, kind, owner],
      );
    } else {
      await query(
        `INSERT INTO portfolio_hubs
          (handle, pubkey, headline, kind, wallet_enabled, terms_version, terms_accepted_at, created_at)
         VALUES (?, ?, ?, ?, 0, '', '', ?)`,
        [owner, pubkey, headline, kind, new Date().toISOString()],
      );
    }
    return door(owner);
  }

  async function savePage(body, pubkey) {
    await ensure();
    const owner = await identity(pubkey);
    if (body.handle && handleOf(body.handle) !== owner) {
      throw new HttpError(403, "Only the hub owner can edit pages.");
    }
    const hub = await query(
      "SELECT pubkey FROM portfolio_hubs WHERE handle = ? LIMIT 1",
      [owner],
    );
    if (!hub[0]) throw new HttpError(404, "Create the hub door first.");
    if (String(hub[0].pubkey) !== pubkey) {
      throw new HttpError(403, "Only the hub owner can edit pages.");
    }
    const slug = String(body.slug || "").trim().toLowerCase();
    if (!SLUG_RE.test(slug)) throw new HttpError(400, "Slug must be a short name.");
    if (!PAGE_KINDS.has(body.kind)) throw new HttpError(400, "Unknown page kind.");
    const title = text(body.title, "Title", 80);
    const pageBody = text(body.body, "Body", 4000);
    const link = httpsLink(body.linkUrl || body.link || "");
    const position = Math.max(0, Math.min(100, num(body.position)));
    const existing = await query(
      "SELECT id FROM portfolio_hub_pages WHERE handle = ? AND slug = ? LIMIT 1",
      [owner, slug],
    );
    if (!existing[0]) {
      const count = await query(
        "SELECT COUNT(*) AS n FROM portfolio_hub_pages WHERE handle = ?",
        [owner],
      );
      if (num(count[0]?.n) >= MAX_PAGES) {
        throw new HttpError(400, "A hub holds at most 8 pages.");
      }
      const idRow = await query(
        "SELECT COALESCE(MAX(id), 0) + 1 AS n FROM portfolio_hub_pages",
      );
      await query(
        `INSERT INTO portfolio_hub_pages
          (id, handle, slug, title, body, link_url, kind, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [num(idRow[0]?.n) || 1, owner, slug, title, pageBody, link, body.kind, position],
      );
    } else {
      await query(
        `UPDATE portfolio_hub_pages
            SET title = ?, body = ?, link_url = ?, kind = ?, position = ?
          WHERE handle = ? AND slug = ?`,
        [title, pageBody, link, body.kind, position, owner, slug],
      );
    }
    return page(owner, slug);
  }

  async function deletePage(body, pubkey) {
    await ensure();
    const owner = await identity(pubkey);
    const slug = String(body.slug || "").trim().toLowerCase();
    const existing = await query(
      "SELECT id FROM portfolio_hub_pages WHERE handle = ? AND slug = ? LIMIT 1",
      [owner, slug],
    );
    if (!existing[0]) throw new HttpError(404, "Page not found.");
    await query(
      "DELETE FROM portfolio_hub_pages WHERE handle = ? AND slug = ?",
      [owner, slug],
    );
    return { ok: true, handle: owner, slug };
  }

  async function acceptTerms(body, pubkey) {
    await ensure();
    const owner = await identity(pubkey);
    if (body.version !== TERMS_VERSION) {
      throw new HttpError(400, "Accept the current terms version.");
    }
    const now = new Date().toISOString();
    const existing = await query(
      "SELECT handle FROM portfolio_hubs WHERE handle = ? LIMIT 1",
      [owner],
    );
    if (existing[0]) {
      await query(
        `UPDATE portfolio_hubs
            SET wallet_enabled = 1, terms_version = ?, terms_accepted_at = ?
          WHERE handle = ?`,
        [TERMS_VERSION, now, owner],
      );
    } else {
      await query(
        `INSERT INTO portfolio_hubs
          (handle, pubkey, headline, kind, wallet_enabled, terms_version, terms_accepted_at, created_at)
         VALUES (?, ?, '', 'blkspace', 1, ?, ?, ?)`,
        [owner, pubkey, TERMS_VERSION, now, now],
      );
    }
    return { ok: true, handle: owner, version: TERMS_VERSION, acceptedAt: now, walletEnabled: true };
  }

  async function gate(handleRaw) {
    await ensure();
    const handle = handleOf(handleRaw);
    const rows = await query(
      "SELECT wallet_enabled, terms_version FROM portfolio_hubs WHERE handle = ? LIMIT 1",
      [handle],
    );
    const walletEnabled = num(rows[0]?.wallet_enabled) === 1;
    return {
      ok: true,
      handle,
      walletEnabled,
      termsVersion: rows[0] ? String(rows[0].terms_version || "") : "",
      yardCred: 0,
      devTools: walletEnabled,
    };
  }

  async function balanceOf(yard, who) {
    const rows = await query(
      "SELECT balance FROM ledger_accounts WHERE handle = ? AND yard_id = ? LIMIT 1",
      [who, yard],
    );
    return num(rows[0]?.balance);
  }

  async function poolOf(yard) {
    const rows = await query(
      "SELECT balance FROM ledger_pool WHERE yard_id = ? LIMIT 1",
      [yard],
    );
    return num(rows[0]?.balance);
  }

  async function setBalance(yard, who, balance) {
    const existing = await query(
      "SELECT handle FROM ledger_accounts WHERE handle = ? AND yard_id = ? LIMIT 1",
      [who, yard],
    );
    if (existing[0]) {
      await query(
        "UPDATE ledger_accounts SET balance = ? WHERE handle = ? AND yard_id = ?",
        [balance, who, yard],
      );
    } else {
      await query(
        "INSERT INTO ledger_accounts (handle, yard_id, balance) VALUES (?, ?, ?)",
        [who, yard, balance],
      );
    }
  }

  async function setPool(yard, balance) {
    const existing = await query(
      "SELECT yard_id FROM ledger_pool WHERE yard_id = ? LIMIT 1",
      [yard],
    );
    if (existing[0]) {
      await query("UPDATE ledger_pool SET balance = ? WHERE yard_id = ?", [balance, yard]);
    } else {
      await query("INSERT INTO ledger_pool (yard_id, balance) VALUES (?, ?)", [yard, balance]);
    }
  }

  async function requireTerms(who) {
    const rows = await query(
      "SELECT terms_version FROM portfolio_hubs WHERE handle = ? LIMIT 1",
      [who],
    );
    if (String(rows[0]?.terms_version || "") !== TERMS_VERSION) {
      throw new HttpError(403, "Accept the current terms before sending WeixBucks.");
    }
  }

  async function tip(body, pubkey) {
    await ensure();
    const from = await identity(pubkey);
    await requireTerms(from);
    const to = handleOf(body.toHandle || body.to, "Recipient");
    if (to === from) throw new HttpError(400, "You cannot tip yourself.");
    const yard = handleOf(body.yardId || body.yard || "yard", "Yard");
    const amount = num(body.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > DAILY_CAP_WB) {
      throw new HttpError(400, "Tip amount must be a whole number of WeixBucks inside the daily cap.");
    }
    const recipient = await query(
      "SELECT handle FROM portfolio_identities WHERE handle = ? LIMIT 1",
      [to],
    );
    if (!recipient[0]) throw new HttpError(404, "Recipient handle is not registered.");
    const fee = Math.floor((amount * TIP_FEE_BPS) / 10000);
    const net = amount - fee;
    const fromBalance = await balanceOf(yard, from);
    if (fromBalance < amount) {
      throw new HttpError(400, "Not enough WeixBucks. Posting does not mint a balance.");
    }
    await setBalance(yard, from, fromBalance - amount);
    await setBalance(yard, to, (await balanceOf(yard, to)) + net);
    await setPool(yard, (await poolOf(yard)) + fee);
    return {
      ok: true,
      yardId: yard,
      from,
      to,
      amount,
      fee,
      fromBalance: fromBalance - amount,
      toBalance: await balanceOf(yard, to),
      pool: await poolOf(yard),
    };
  }

  async function earn() {
    throw new HttpError(400, "Posting does not mint WeixBucks.");
  }

  async function payout(body) {
    await ensure();
    const yard = handleOf(body.yardId || body.yard || "yard", "Yard");
    const pool = await poolOf(yard);
    return { ok: true, yardId: yard, pool, paid: 0, minted: 0 };
  }

  return { list, door, page, saveDoor, savePage, deletePage, acceptTerms, gate, tip, earn, payout };
}
