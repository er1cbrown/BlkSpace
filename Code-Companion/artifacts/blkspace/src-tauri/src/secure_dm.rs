//! Handle-based secure DMs — ethical, med-school aware.
//! Not a HIPAA covered entity. No PHI. Identity = BlkSpace handle.

use crate::sqlite::{Connection, OptionalExtension, Result};
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SecureDmMessage {
  pub id: i64,
  pub thread_id: String,
  pub from_handle: String,
  pub to_handle: String,
  pub body: String,
  pub phi_ack: bool,
  pub ethical_ack: bool,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SecureDmThread {
  pub thread_id: String,
  pub peer_handle: String,
  pub last_body: String,
  pub last_at: String,
  pub unread: i64,
}

pub fn ensure_schema(conn: &Connection) -> Result<()> {
  conn.execute_batch(
    r#"
    CREATE TABLE IF NOT EXISTS secure_dms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      from_handle TEXT NOT NULL,
      to_handle TEXT NOT NULL,
      body TEXT NOT NULL,
      phi_ack INTEGER DEFAULT 0,
      ethical_ack INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_secure_dms_thread ON secure_dms(thread_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_secure_dms_peer ON secure_dms(from_handle, to_handle);
    CREATE TABLE IF NOT EXISTS dm_blocks (
      blocker TEXT NOT NULL,
      blocked TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (blocker, blocked)
    );
    CREATE TABLE IF NOT EXISTS institutional_claims (
      handle TEXT PRIMARY KEY,
      institution TEXT NOT NULL,
      role TEXT NOT NULL,
      email_domain TEXT DEFAULT '',
      claim_level TEXT DEFAULT 'self_attested',
      no_phi_ack INTEGER DEFAULT 0,
      ethical_ack INTEGER DEFAULT 0,
      contact_email TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );
    "#,
  )?;
  Ok(())
}

pub fn thread_id_for(a: &str, b: &str) -> String {
  let mut pair = [a.to_lowercase(), b.to_lowercase()];
  pair.sort();
  format!("{}::{}", pair[0], pair[1])
}

pub fn is_blocked(conn: &Connection, a: &str, b: &str) -> Result<bool> {
  let n: i64 = conn.query_row(
    "SELECT COUNT(*) FROM dm_blocks
     WHERE (blocker = ?1 AND blocked = ?2) OR (blocker = ?2 AND blocked = ?1)",
    params![a, b],
    |r| r.get(0),
  )?;
  Ok(n > 0)
}

pub fn block_user(conn: &Connection, blocker: &str, blocked: &str) -> Result<()> {
  conn.execute(
    "INSERT OR IGNORE INTO dm_blocks (blocker, blocked) VALUES (?1, ?2)",
    params![blocker, blocked],
  )?;
  Ok(())
}

fn looks_like_phi(text: &str) -> bool {
  let t = text.to_ascii_lowercase();
  [
    "mrn",
    "patient name",
    "date of birth",
    "dob:",
    "ssn",
    "social security",
    "diagnosed with",
    "prescription",
    "medical record",
    "room number",
  ]
  .iter()
  .any(|h| t.contains(h))
}

pub fn send_dm(
  conn: &Connection,
  from: &str,
  to: &str,
  body: &str,
  phi_ack: bool,
  ethical_ack: bool,
) -> Result<SecureDmMessage> {
  if !phi_ack || !ethical_ack {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "No-PHI and ethical acknowledgement required".into(),
    ));
  }
  let to = to.trim().trim_start_matches('@');
  let body = body.trim();
  if to.is_empty() || to == from {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Invalid recipient".into(),
    ));
  }
  if body.is_empty() || body.len() > 2000 {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Message empty or too long".into(),
    ));
  }
  if is_blocked(conn, from, to)? {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Conversation blocked".into(),
    ));
  }
  if looks_like_phi(body) {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Blocked: looks like clinical/PHI-sensitive content. Use hospital systems.".into(),
    ));
  }
  let tid = thread_id_for(from, to);
  conn.execute(
    "INSERT INTO secure_dms (thread_id, from_handle, to_handle, body, phi_ack, ethical_ack)
     VALUES (?1, ?2, ?3, ?4, 1, 1)",
    params![tid, from, to, body],
  )?;
  let id = conn.last_insert_rowid();
  // Notify recipient
  let _ = conn.execute(
    "INSERT INTO notifications (user_handle, notification_type, from_handle, message)
     VALUES (?1, 'secure_dm', ?2, ?3)",
    params![
      to,
      from,
      format!("@{from} sent a secure handle message (no PHI)")
    ],
  );
  get_message(conn, id)?.ok_or(crate::sqlite::Error::QueryReturnedNoRows)
}

fn get_message(conn: &Connection, id: i64) -> Result<Option<SecureDmMessage>> {
  conn
    .query_row(
      "SELECT id, thread_id, from_handle, to_handle, body, phi_ack, ethical_ack, created_at
       FROM secure_dms WHERE id = ?1",
      params![id],
      |r| {
        Ok(SecureDmMessage {
          id: r.get(0)?,
          thread_id: r.get(1)?,
          from_handle: r.get(2)?,
          to_handle: r.get(3)?,
          body: r.get(4)?,
          phi_ack: r.get::<_, i64>(5)? != 0,
          ethical_ack: r.get::<_, i64>(6)? != 0,
          created_at: r.get(7)?,
        })
      },
    )
    .optional()
}

pub fn list_messages(
  conn: &Connection,
  me: &str,
  peer: &str,
) -> Result<Vec<SecureDmMessage>> {
  if is_blocked(conn, me, peer)? {
    return Ok(vec![]);
  }
  let tid = thread_id_for(me, peer);
  let mut stmt = conn.prepare(
    "SELECT id, thread_id, from_handle, to_handle, body, phi_ack, ethical_ack, created_at
     FROM secure_dms WHERE thread_id = ?1 ORDER BY created_at ASC LIMIT 200",
  )?;
  let rows = stmt.query_map(params![tid], |r| {
    Ok(SecureDmMessage {
      id: r.get(0)?,
      thread_id: r.get(1)?,
      from_handle: r.get(2)?,
      to_handle: r.get(3)?,
      body: r.get(4)?,
      phi_ack: r.get::<_, i64>(5)? != 0,
      ethical_ack: r.get::<_, i64>(6)? != 0,
      created_at: r.get(7)?,
    })
  })?;
  let mut out = Vec::new();
  for r in rows {
    out.push(r?);
  }
  Ok(out)
}

pub fn list_threads(conn: &Connection, me: &str) -> Result<Vec<SecureDmThread>> {
  let sql = "
    SELECT d.thread_id, d.from_handle, d.to_handle, d.body, d.created_at
    FROM secure_dms d
    INNER JOIN (
      SELECT thread_id, MAX(id) AS mid FROM secure_dms
      WHERE from_handle = ?1 OR to_handle = ?1
      GROUP BY thread_id
    ) t ON d.id = t.mid
    ORDER BY d.created_at DESC
    LIMIT 50
  ";
  let mut stmt = conn.prepare(sql)?;
  let rows = stmt.query_map(params![me], |r| {
    let tid: String = r.get(0)?;
    let from: String = r.get(1)?;
    let to: String = r.get(2)?;
    let body: String = r.get(3)?;
    let at: String = r.get(4)?;
    let peer = if from == me { to } else { from };
    Ok((tid, peer, body, at))
  })?;
  let mut out = Vec::new();
  for r in rows {
    let (tid, peer, body, at) = r?;
    if is_blocked(conn, me, &peer)? {
      continue;
    }
    out.push(SecureDmThread {
      thread_id: tid,
      peer_handle: peer,
      last_body: body.chars().take(120).collect(),
      last_at: at,
      unread: 0,
    });
  }
  Ok(out)
}

pub fn upsert_institutional_claim(
  conn: &Connection,
  handle: &str,
  institution: &str,
  role: &str,
  email_domain: &str,
  claim_level: &str,
  no_phi: bool,
  ethical: bool,
  contact_email: &str,
) -> Result<()> {
  if !no_phi || !ethical {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "No-PHI and ethical acknowledgement required".into(),
    ));
  }
  conn.execute(
    "INSERT INTO institutional_claims
      (handle, institution, role, email_domain, claim_level, no_phi_ack, ethical_ack, contact_email, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 1, 1, ?6, datetime('now'))
     ON CONFLICT(handle) DO UPDATE SET
       institution = excluded.institution,
       role = excluded.role,
       email_domain = excluded.email_domain,
       claim_level = excluded.claim_level,
       no_phi_ack = 1,
       ethical_ack = 1,
       contact_email = excluded.contact_email,
       updated_at = datetime('now')",
    params![
      handle,
      institution.trim(),
      role,
      email_domain.trim().trim_start_matches('@'),
      claim_level,
      contact_email.trim()
    ],
  )?;
  Ok(())
}

