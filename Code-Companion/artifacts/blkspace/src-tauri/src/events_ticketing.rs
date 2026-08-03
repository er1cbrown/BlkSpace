//! Yard event ticketing: capacity, club exclusivity, free/paid passes, guest list, check-in.
//! Complements ProjectConnect clubs + yard community pages (Billy / Club XYZ use case).

use crate::db::{calc_platform_fee, AppError, MARKETPLACE_PLATFORM_FEE_BPS};
use crate::sqlite::{Connection, OptionalExtension, Result};
use serde::Serialize;
use serde_json::json;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EventGuest {
  pub handle: String,
  pub display_name: String,
  pub status: String,
  pub ticket_code: Option<String>,
  pub paid_wb: i64,
  pub checked_in: bool,
  pub waitlisted: bool,
  pub created_at: String,
  pub yard_cred: i64,
}

pub fn ensure_schema(conn: &Connection) -> Result<()> {
  // Additive columns on yard_events
  let _ = conn.execute(
    "ALTER TABLE yard_events ADD COLUMN capacity INTEGER",
    (),
  );
  let _ = conn.execute(
    "ALTER TABLE yard_events ADD COLUMN org_id TEXT",
    (),
  );
  let _ = conn.execute(
    "ALTER TABLE yard_events ADD COLUMN requires_org_member INTEGER DEFAULT 0",
    (),
  );
  let _ = conn.execute(
    "ALTER TABLE yard_events ADD COLUMN ticket_price_wb INTEGER DEFAULT 0",
    (),
  );
  let _ = conn.execute(
    "ALTER TABLE yard_events ADD COLUMN event_kind TEXT DEFAULT 'general'",
    (),
  );
  // Additive columns on RSVPs (ticket pass)
  let _ = conn.execute(
    "ALTER TABLE yard_event_rsvps ADD COLUMN ticket_code TEXT",
    (),
  );
  let _ = conn.execute(
    "ALTER TABLE yard_event_rsvps ADD COLUMN paid_wb INTEGER DEFAULT 0",
    (),
  );
  let _ = conn.execute(
    "ALTER TABLE yard_event_rsvps ADD COLUMN checked_in INTEGER DEFAULT 0",
    (),
  );
  let _ = conn.execute(
    "ALTER TABLE yard_event_rsvps ADD COLUMN waitlisted INTEGER DEFAULT 0",
    (),
  );
  let _ = conn.execute(
    "ALTER TABLE yard_event_rsvps ADD COLUMN pass_json TEXT",
    (),
  );
  let _ = conn.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_event_ticket_code
     ON yard_event_rsvps(ticket_code)
     WHERE ticket_code IS NOT NULL AND ticket_code != ''",
    (),
  );
  Ok(())
}

pub fn is_org_member(conn: &Connection, org_id: &str, handle: &str) -> Result<bool> {
  let n: i64 = conn.query_row(
    "SELECT COUNT(*) FROM connect_org_members WHERE org_id = ?1 AND handle = ?2",
    params![org_id, handle],
    |r| r.get(0),
  )?;
  Ok(n > 0)
}

pub fn org_name(conn: &Connection, org_id: &str) -> Result<Option<String>> {
  conn
    .query_row(
      "SELECT name FROM connect_orgs WHERE id = ?1",
      params![org_id],
      |r| r.get::<_, String>(0),
    )
    .optional()
    .map_err(Into::into)
}

pub fn going_count(conn: &Connection, event_id: i64) -> Result<i64> {
  conn.query_row(
    "SELECT COUNT(*) FROM yard_event_rsvps
     WHERE event_id = ?1 AND status = 'going' AND COALESCE(waitlisted, 0) = 0",
    params![event_id],
    |r| r.get(0),
  )
  .map_err(Into::into)
}

pub fn make_ticket_code(event_id: i64, handle: &str) -> String {
  // Deterministic, short, scannable pass id (not cryptographic — local promo)
  let mut h: u32 = 2166136261;
  for b in handle.bytes() {
    h ^= b as u32;
    h = h.wrapping_mul(16777619);
  }
  format!("BK-E{event_id}-{:05X}", h % 0xFFFFF)
}

pub fn build_pass_json(
  event_id: i64,
  title: &str,
  community_id: &str,
  handle: &str,
  status: &str,
  ticket_code: &str,
  paid_wb: i64,
  waitlisted: bool,
) -> String {
  json!({
    "type": "blkspace_event_pass_v1",
    "eventId": event_id,
    "title": title,
    "communityId": community_id,
    "handle": handle,
    "status": status,
    "ticketCode": ticket_code,
    "paidWb": paid_wb,
    "waitlisted": waitlisted,
    "issuedAt": chrono::Utc::now().to_rfc3339(),
  })
  .to_string()
}

/// Charge ticket price to attendee; credit host net after platform fee.
pub fn charge_ticket(
  conn: &Connection,
  buyer: &str,
  host: &str,
  price: i64,
  event_id: i64,
  title: &str,
) -> Result<i64, AppError> {
  if price <= 0 {
    return Ok(0);
  }
  let fee = calc_platform_fee(price, MARKETPLACE_PLATFORM_FEE_BPS);
  let net = price - fee;
  if net <= 0 {
    return Err(AppError::Validation("Ticket price too small after fee".into()));
  }
  let bal: i64 = conn
    .query_row(
      "SELECT weix_bucks FROM users WHERE handle = ?1",
      params![buyer],
      |r| r.get(0),
    )
    .map_err(AppError::from)?;
  if bal < price {
    return Err(AppError::Validation(format!(
      "Need {price} WB for this ticket (you have {bal})"
    )));
  }
  conn
    .execute(
      "UPDATE users SET weix_bucks = weix_bucks - ?1 WHERE handle = ?2",
      params![price, buyer],
    )
    .map_err(AppError::from)?;
  conn
    .execute(
      "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
      params![net, host],
    )
    .map_err(AppError::from)?;
  conn
    .execute(
      "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
       SELECT ?1, 'spend', -?2, ?3, weix_bucks FROM users WHERE handle = ?1",
      params![
        buyer,
        price,
        format!("Event ticket · #{event_id} · {title}")
      ],
    )
    .map_err(AppError::from)?;
  conn
    .execute(
      "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
       SELECT ?1, 'earn', ?2, ?3, weix_bucks FROM users WHERE handle = ?1",
      params![
        host,
        net,
        format!("Event ticket sale · #{event_id} · {title}")
      ],
    )
    .map_err(AppError::from)?;
  Ok(price)
}

pub fn refund_ticket(
  conn: &Connection,
  buyer: &str,
  host: &str,
  paid: i64,
  event_id: i64,
) -> Result<(), AppError> {
  if paid <= 0 {
    return Ok(());
  }
  let fee = calc_platform_fee(paid, MARKETPLACE_PLATFORM_FEE_BPS);
  let net = paid - fee;
  // Best-effort: credit buyer full paid; debit host net (if they still have it)
  conn
    .execute(
      "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
      params![paid, buyer],
    )
    .map_err(AppError::from)?;
  let host_bal: i64 = conn
    .query_row(
      "SELECT weix_bucks FROM users WHERE handle = ?1",
      params![host],
      |r| r.get(0),
    )
    .unwrap_or(0);
  let debit = net.min(host_bal.max(0));
  if debit > 0 {
    conn
      .execute(
        "UPDATE users SET weix_bucks = weix_bucks - ?1 WHERE handle = ?2",
        params![debit, host],
      )
      .map_err(AppError::from)?;
  }
  conn
    .execute(
      "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
       SELECT ?1, 'earn', ?2, ?3, weix_bucks FROM users WHERE handle = ?1",
      params![
        buyer,
        paid,
        format!("Event ticket refund · #{event_id}")
      ],
    )
    .map_err(AppError::from)?;
  if debit > 0 {
    conn
      .execute(
        "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
         SELECT ?1, 'spend', -?2, ?3, weix_bucks FROM users WHERE handle = ?1",
        params![
          host,
          debit,
          format!("Event ticket refund clawback · #{event_id}")
        ],
      )
      .map_err(AppError::from)?;
  }
  Ok(())
}

pub fn list_guests(conn: &Connection, event_id: i64) -> Result<Vec<EventGuest>> {
  let mut stmt = conn.prepare(
    "SELECT r.handle, COALESCE(u.display_name, r.handle), r.status,
            r.ticket_code, COALESCE(r.paid_wb, 0), COALESCE(r.checked_in, 0),
            COALESCE(r.waitlisted, 0), r.created_at,
            COALESCE(u.post_karma, 0) + COALESCE(u.comment_karma, 0)
     FROM yard_event_rsvps r
     LEFT JOIN users u ON u.handle = r.handle
     WHERE r.event_id = ?1
     ORDER BY
       CASE r.status WHEN 'going' THEN 0 WHEN 'waitlist' THEN 1 WHEN 'interested' THEN 2 ELSE 3 END,
       r.created_at ASC",
  )?;
  let rows = stmt.query_map(params![event_id], |row| {
    let karma: i64 = row.get(8)?;
    // lightweight cred proxy for guest list (full Yard Cred is heavier)
    let yard_cred = (karma.min(40) + 10).min(100);
    Ok(EventGuest {
      handle: row.get(0)?,
      display_name: row.get(1)?,
      status: row.get(2)?,
      ticket_code: row.get(3)?,
      paid_wb: row.get(4)?,
      checked_in: row.get::<_, i64>(5)? == 1,
      waitlisted: row.get::<_, i64>(6)? == 1,
      created_at: row.get(7)?,
      yard_cred,
    })
  })?;
  let mut out = Vec::new();
  for r in rows {
    out.push(r?);
  }
  Ok(out)
}

pub fn check_in(
  conn: &Connection,
  event_id: i64,
  ticket_or_handle: &str,
) -> Result<serde_json::Value, AppError> {
  let key = ticket_or_handle.trim();
  if key.is_empty() {
    return Err(AppError::Validation("Ticket code or handle required".into()));
  }
  let row = conn
    .query_row(
      "SELECT handle, status, COALESCE(waitlisted, 0), COALESCE(checked_in, 0), ticket_code
       FROM yard_event_rsvps
       WHERE event_id = ?1 AND (ticket_code = ?2 OR handle = ?2)",
      params![event_id, key],
      |r| {
        Ok((
          r.get::<_, String>(0)?,
          r.get::<_, String>(1)?,
          r.get::<_, i64>(2)?,
          r.get::<_, i64>(3)?,
          r.get::<_, Option<String>>(4)?,
        ))
      },
    )
    .optional()
    .map_err(AppError::from)?;

  let Some((handle, status, waitlisted, already, code)) = row else {
    return Err(AppError::Validation("Guest not found for this event".into()));
  };
  if waitlisted == 1 || status == "waitlist" {
    return Err(AppError::Validation("Guest is waitlisted — cannot check in".into()));
  }
  if status != "going" {
    return Err(AppError::Validation(format!(
      "Guest status is '{status}', not going"
    )));
  }
  if already == 1 {
    return Ok(json!({
      "checkedIn": true,
      "alreadyCheckedIn": true,
      "handle": handle,
      "ticketCode": code,
    }));
  }
  conn
    .execute(
      "UPDATE yard_event_rsvps SET checked_in = 1 WHERE event_id = ?1 AND handle = ?2",
      params![event_id, handle],
    )
    .map_err(AppError::from)?;
  Ok(json!({
    "checkedIn": true,
    "alreadyCheckedIn": false,
    "handle": handle,
    "ticketCode": code,
  }))
}

/// Seed Club XYZ–style service event when community is empty of club events.
pub fn seed_service_events(conn: &Connection) -> Result<()> {
  // Ensure a club org exists for exclusive RSVP demos
  let n: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM connect_orgs WHERE id = 'org_service'",
      (),
      |r| r.get(0),
    )
    .unwrap_or(0);
  if n == 0 {
    return Ok(()); // connect seed not ready
  }

  let has_service: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM yard_events WHERE event_kind = 'service' OR title LIKE '%Community Service%'",
      (),
      |r| r.get(0),
    )
    .unwrap_or(0);
  if has_service > 0 {
    return Ok(());
  }

  let starts = (chrono::Utc::now() + chrono::Duration::days(5))
    .format("%Y-%m-%dT10:00:00")
    .to_string();

  // Only if demo_user exists
  let user_ok: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM users WHERE handle = 'jane_doe'",
      (),
      |r| r.get(0),
    )
    .unwrap_or(0);
  if user_ok == 0 {
    return Ok(());
  }

  let _ = conn.execute(
    "INSERT INTO yard_events
      (community_id, title, description, location, starts_at, ends_at, created_by,
       capacity, org_id, requires_org_member, ticket_price_wb, event_kind)
     VALUES
      ('tsu',
       'Tiger Service Day · First Campus Cleanup',
       'Club exclusive first community service of the semester. Sign up here — free pass with check-in code. Limited to 40 volunteers. Join Tiger Community Service Hub on ProjectConnect if required.',
       'Student Center Plaza → campus routes',
       ?1, NULL, 'jane_doe',
       40, 'org_service', 1, 0, 'service')
    ",
    params![starts.clone()],
  );
  let _ = conn.execute(
    "INSERT INTO yard_events
      (community_id, title, description, location, starts_at, ends_at, created_by,
       capacity, org_id, requires_org_member, ticket_price_wb, event_kind)
     VALUES
      ('tsu',
       'Yard Networking Mixer (Open RSVP)',
       'Open to all yard members. Free ticket pass for door tracking.',
       'Kean Hall Lobby',
       ?1, NULL, 'demo_user',
       100, NULL, 0, 0, 'career')
    ",
    params![starts.clone()],
  );
  let _ = conn.execute(
    "INSERT INTO yard_events
      (community_id, title, description, location, starts_at, ends_at, created_by,
       capacity, org_id, requires_org_member, ticket_price_wb, event_kind)
     VALUES
      ('howard',
       'Style Lab Volunteer Fair',
       'Howard Style Lab members preferred. Free signup + guest list for organizers.',
       'Founders Library Plaza',
       ?1, NULL, 'hbcustudent',
       30, 'org_fashion_howard', 0, 0, 'service')
    ",
    params![starts],
  );

  Ok(())
}
