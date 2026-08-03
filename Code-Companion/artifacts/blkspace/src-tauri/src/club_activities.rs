//! Club activities beyond streaming:
//! - Club templates (anime / gaming / study / faculty) → default channels
//! - Reading circles (book groups, manga chapters, shared reads)
//! - Tournaments (brackets, 1v1 matches, scores, prizes) — no live stream
//! - Faculty opportunity broadcast → yard feed post

use crate::sqlite::{Connection, OptionalExtension, Result};
use serde::Serialize;
use serde_json::json;

// ─── Schema ──────────────────────────────────────────────

pub fn ensure_schema(conn: &Connection) -> Result<()> {
  conn.execute_batch(
    "
    CREATE TABLE IF NOT EXISTS club_templates_applied (
      community_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      applied_by TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (community_id, template_id)
    );

    CREATE TABLE IF NOT EXISTS reading_circles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      community_id TEXT NOT NULL,
      org_id TEXT,
      title TEXT NOT NULL,
      media_type TEXT DEFAULT 'manga',
      description TEXT DEFAULT '',
      current_work TEXT DEFAULT '',
      current_chapter TEXT DEFAULT '',
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reading_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      circle_id INTEGER NOT NULL,
      handle TEXT NOT NULL,
      entry_type TEXT DEFAULT 'note',
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      media_ref TEXT DEFAULT '',
      chapter_label TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (circle_id) REFERENCES reading_circles(id)
    );

    CREATE TABLE IF NOT EXISTS reading_members (
      circle_id INTEGER NOT NULL,
      handle TEXT NOT NULL,
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (circle_id, handle)
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      community_id TEXT NOT NULL,
      event_id INTEGER,
      title TEXT NOT NULL,
      game_title TEXT DEFAULT '',
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      max_players INTEGER DEFAULT 16,
      prize_text TEXT DEFAULT '',
      prize_wb INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournament_entrants (
      tournament_id INTEGER NOT NULL,
      handle TEXT NOT NULL,
      seed INTEGER DEFAULT 0,
      status TEXT DEFAULT 'registered',
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (tournament_id, handle)
    );

    CREATE TABLE IF NOT EXISTS tournament_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      round INTEGER NOT NULL DEFAULT 1,
      match_index INTEGER NOT NULL DEFAULT 0,
      player_a TEXT,
      player_b TEXT,
      score_a INTEGER DEFAULT 0,
      score_b INTEGER DEFAULT 0,
      winner TEXT,
      status TEXT DEFAULT 'pending',
      channel_note TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_circles_community ON reading_circles(community_id);
    CREATE INDEX IF NOT EXISTS idx_entries_circle ON reading_entries(circle_id);
    CREATE INDEX IF NOT EXISTS idx_tournaments_community ON tournaments(community_id);
    CREATE INDEX IF NOT EXISTS idx_matches_tournament ON tournament_matches(tournament_id);
    ",
  )?;
  Ok(())
}

// ─── Templates ───────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClubTemplate {
  pub id: String,
  pub name: String,
  pub description: String,
  pub channels: Vec<String>,
  pub suggested_event_kind: String,
}

pub fn templates() -> Vec<ClubTemplate> {
  vec![
    ClubTemplate {
      id: "anime".into(),
      name: "Anime / Manga Club".into(),
      description:
        "Book groups, weekly reads, share & publish fan works / manga pages.".into(),
      channels: vec![
        "general".into(),
        "this-week-read".into(),
        "manga-publish".into(),
        "watch-party".into(),
        "recs".into(),
      ],
      suggested_event_kind: "club".into(),
    },
    ClubTemplate {
      id: "gaming".into(),
      name: "Gaming / Esports".into(),
      description:
        "Tournaments, brackets, 1v1 match chat notes, prizes & merch hooks.".into(),
      channels: vec![
        "general".into(),
        "lfg".into(),
        "tournament".into(),
        "match-reports".into(),
        "merch-drops".into(),
      ],
      suggested_event_kind: "social".into(),
    },
    ClubTemplate {
      id: "chess".into(),
      name: "Chess / Strategy Club".into(),
      description:
        "Campus chess: Hub lessons, Lichess/OTB play links, brackets + prize WB, coach portfolios.".into(),
      channels: vec![
        "general".into(),
        "lessons".into(),
        "lfg-otb".into(),
        "tournament".into(),
        "analysis".into(),
        "coach-board".into(),
      ],
      suggested_event_kind: "social".into(),
    },
    ClubTemplate {
      id: "creators".into(),
      name: "Creators / Media Collective".into(),
      description:
        "Amalgamation media kit — drops, live link-outs, portfolio shares, collabs.".into(),
      channels: vec![
        "general".into(),
        "drops".into(),
        "live-links".into(),
        "collabs".into(),
        "feedback".into(),
        "monetize".into(),
      ],
      suggested_event_kind: "social".into(),
    },
    ClubTemplate {
      id: "study".into(),
      name: "Study / Wellness".into(),
      description:
        "Midterm decompression, focus hours, peer accountability.".into(),
      channels: vec![
        "general".into(),
        "focus-hours".into(),
        "resources".into(),
        "debrief".into(),
      ],
      suggested_event_kind: "study".into(),
    },
    ClubTemplate {
      id: "faculty".into(),
      name: "Faculty / Department".into(),
      description:
        "Scholarships, research, internships relayed to the yard.".into(),
      channels: vec![
        "announcements".into(),
        "scholarships".into(),
        "research".into(),
        "internships".into(),
        "office-hours".into(),
      ],
      suggested_event_kind: "career".into(),
    },
    ClubTemplate {
      id: "med".into(),
      name: "Med / Meharry Focus".into(),
      description:
        "Rotations-aware: async study refresh, low-bandwidth research, wellness, pipeline — not a second LMS.".into(),
      channels: vec![
        "general".into(),
        "study-refresh".into(),
        "research-async".into(),
        "wellness".into(),
        "pipeline".into(),
        "finance-lite".into(),
      ],
      suggested_event_kind: "study".into(),
    },
  ]
}

pub fn apply_template(
  conn: &Connection,
  community_id: &str,
  template_id: &str,
  applied_by: &str,
) -> Result<serde_json::Value> {
  let tpl = templates()
    .into_iter()
    .find(|t| t.id == template_id)
    .ok_or_else(|| {
      crate::sqlite::Error::InvalidParameterName(format!("Unknown template: {template_id}"))
    })?;

  let mut created = Vec::new();
  for ch in &tpl.channels {
    let id = format!("{community_id}-{ch}");
    let n = conn.execute(
      "INSERT OR IGNORE INTO channels (id, community_id, name, description)
       VALUES (?1, ?2, ?3, ?4)",
      params![
        id,
        community_id,
        ch,
        format!("{} · {}", tpl.name, ch)
      ],
    )?;
    if n > 0 {
      created.push(ch.clone());
    }
  }
  conn.execute(
    "INSERT OR REPLACE INTO club_templates_applied (community_id, template_id, applied_by)
     VALUES (?1, ?2, ?3)",
    params![community_id, template_id, applied_by],
  )?;

  Ok(json!({
    "templateId": template_id,
    "name": tpl.name,
    "channelsCreated": created,
    "suggestedEventKind": tpl.suggested_event_kind,
  }))
}

pub fn list_applied_templates(conn: &Connection, community_id: &str) -> Result<Vec<String>> {
  let mut stmt = conn.prepare(
    "SELECT template_id FROM club_templates_applied WHERE community_id = ?1",
  )?;
  let rows = stmt.query_map(params![community_id], |r| r.get::<_, String>(0))?;
  let mut out = Vec::new();
  for r in rows {
    out.push(r?);
  }
  Ok(out)
}

// ─── Reading circles ─────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReadingCircle {
  pub id: i64,
  pub community_id: String,
  pub org_id: Option<String>,
  pub title: String,
  pub media_type: String,
  pub description: String,
  pub current_work: String,
  pub current_chapter: String,
  pub created_by: String,
  pub member_count: i64,
  pub entry_count: i64,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReadingEntry {
  pub id: i64,
  pub circle_id: i64,
  pub handle: String,
  pub display_name: String,
  pub entry_type: String,
  pub title: String,
  pub body: String,
  pub media_ref: String,
  pub chapter_label: String,
  pub created_at: String,
}

pub fn create_circle(
  conn: &Connection,
  community_id: &str,
  created_by: &str,
  title: &str,
  media_type: &str,
  description: &str,
  current_work: &str,
  org_id: Option<&str>,
) -> Result<ReadingCircle> {
  let title = title.trim();
  if title.is_empty() {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Circle title required".into(),
    ));
  }
  let mt = match media_type {
    "anime" | "manga" | "book" | "webtoon" | "other" => media_type,
    _ => "manga",
  };
  conn.execute(
    "INSERT INTO reading_circles
      (community_id, org_id, title, media_type, description, current_work, created_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    params![
      community_id,
      org_id,
      title,
      mt,
      description.trim(),
      current_work.trim(),
      created_by
    ],
  )?;
  let id = conn.last_insert_rowid();
  conn.execute(
    "INSERT OR IGNORE INTO reading_members (circle_id, handle) VALUES (?1, ?2)",
    params![id, created_by],
  )?;
  Ok(ReadingCircle {
    id,
    community_id: community_id.into(),
    org_id: org_id.map(|s| s.into()),
    title: title.into(),
    media_type: mt.into(),
    description: description.trim().into(),
    current_work: current_work.trim().into(),
    current_chapter: String::new(),
    created_by: created_by.into(),
    member_count: 1,
    entry_count: 0,
    created_at: chrono::Utc::now().to_rfc3339(),
  })
}

pub fn list_circles(conn: &Connection, community_id: &str) -> Result<Vec<ReadingCircle>> {
  let mut stmt = conn.prepare(
    "SELECT c.id, c.community_id, c.org_id, c.title, c.media_type, c.description,
            c.current_work, COALESCE(c.current_chapter, ''), c.created_by, c.created_at,
            (SELECT COUNT(*) FROM reading_members m WHERE m.circle_id = c.id),
            (SELECT COUNT(*) FROM reading_entries e WHERE e.circle_id = c.id)
     FROM reading_circles c
     WHERE c.community_id = ?1
     ORDER BY datetime(c.created_at) DESC",
  )?;
  let rows = stmt.query_map(params![community_id], |r| {
    Ok(ReadingCircle {
      id: r.get(0)?,
      community_id: r.get(1)?,
      org_id: r.get(2)?,
      title: r.get(3)?,
      media_type: r.get(4)?,
      description: r.get(5)?,
      current_work: r.get(6)?,
      current_chapter: r.get(7)?,
      created_by: r.get(8)?,
      created_at: r.get(9)?,
      member_count: r.get(10)?,
      entry_count: r.get(11)?,
    })
  })?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row?);
  }
  Ok(out)
}

pub fn join_circle(conn: &Connection, circle_id: i64, handle: &str) -> Result<()> {
  conn.execute(
    "INSERT OR IGNORE INTO reading_members (circle_id, handle) VALUES (?1, ?2)",
    params![circle_id, handle],
  )?;
  Ok(())
}

pub fn set_current_read(
  conn: &Connection,
  circle_id: i64,
  work: &str,
  chapter: &str,
) -> Result<()> {
  conn.execute(
    "UPDATE reading_circles SET current_work = ?1, current_chapter = ?2 WHERE id = ?3",
    params![work.trim(), chapter.trim(), circle_id],
  )?;
  Ok(())
}

pub fn add_entry(
  conn: &Connection,
  circle_id: i64,
  handle: &str,
  entry_type: &str,
  title: &str,
  body: &str,
  media_ref: &str,
  chapter_label: &str,
) -> Result<ReadingEntry> {
  let et = match entry_type {
    "chapter" | "publish" | "note" | "rec" => entry_type,
    _ => "note",
  };
  let title = title.trim();
  if title.is_empty() {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Entry title required".into(),
    ));
  }
  conn.execute(
    "INSERT OR IGNORE INTO reading_members (circle_id, handle) VALUES (?1, ?2)",
    params![circle_id, handle],
  )?;
  conn.execute(
    "INSERT INTO reading_entries
      (circle_id, handle, entry_type, title, body, media_ref, chapter_label)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    params![
      circle_id,
      handle,
      et,
      title,
      body.trim(),
      media_ref.trim(),
      chapter_label.trim()
    ],
  )?;
  let id = conn.last_insert_rowid();
  let display: String = conn
    .query_row(
      "SELECT display_name FROM users WHERE handle = ?1",
      params![handle],
      |r| r.get(0),
    )
    .unwrap_or_else(|_| handle.into());
  Ok(ReadingEntry {
    id,
    circle_id,
    handle: handle.into(),
    display_name: display,
    entry_type: et.into(),
    title: title.into(),
    body: body.trim().into(),
    media_ref: media_ref.trim().into(),
    chapter_label: chapter_label.trim().into(),
    created_at: chrono::Utc::now().to_rfc3339(),
  })
}

pub fn list_entries(conn: &Connection, circle_id: i64) -> Result<Vec<ReadingEntry>> {
  let mut stmt = conn.prepare(
    "SELECT e.id, e.circle_id, e.handle, COALESCE(u.display_name, e.handle),
            e.entry_type, e.title, e.body, e.media_ref, e.chapter_label, e.created_at
     FROM reading_entries e
     LEFT JOIN users u ON u.handle = e.handle
     WHERE e.circle_id = ?1
     ORDER BY datetime(e.created_at) DESC",
  )?;
  let rows = stmt.query_map(params![circle_id], |r| {
    Ok(ReadingEntry {
      id: r.get(0)?,
      circle_id: r.get(1)?,
      handle: r.get(2)?,
      display_name: r.get(3)?,
      entry_type: r.get(4)?,
      title: r.get(5)?,
      body: r.get(6)?,
      media_ref: r.get(7)?,
      chapter_label: r.get(8)?,
      created_at: r.get(9)?,
    })
  })?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row?);
  }
  Ok(out)
}

// ─── Tournaments ─────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Tournament {
  pub id: i64,
  pub community_id: String,
  pub event_id: Option<i64>,
  pub title: String,
  pub game_title: String,
  pub description: String,
  pub status: String,
  pub max_players: i64,
  pub prize_text: String,
  pub prize_wb: i64,
  pub created_by: String,
  pub entrant_count: i64,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TournamentMatch {
  pub id: i64,
  pub tournament_id: i64,
  pub round: i64,
  pub match_index: i64,
  pub player_a: Option<String>,
  pub player_b: Option<String>,
  pub score_a: i64,
  pub score_b: i64,
  pub winner: Option<String>,
  pub status: String,
  pub channel_note: String,
  pub updated_at: String,
}

pub fn create_tournament(
  conn: &Connection,
  community_id: &str,
  created_by: &str,
  title: &str,
  game_title: &str,
  description: &str,
  max_players: i64,
  prize_text: &str,
  prize_wb: i64,
  event_id: Option<i64>,
) -> Result<Tournament> {
  let title = title.trim();
  if title.is_empty() {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Tournament title required".into(),
    ));
  }
  let max_p = max_players.clamp(2, 64);
  conn.execute(
    "INSERT INTO tournaments
      (community_id, event_id, title, game_title, description, max_players, prize_text, prize_wb, created_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
    params![
      community_id,
      event_id,
      title,
      game_title.trim(),
      description.trim(),
      max_p,
      prize_text.trim(),
      prize_wb.max(0),
      created_by
    ],
  )?;
  let id = conn.last_insert_rowid();
  // Host auto-registers
  conn.execute(
    "INSERT OR IGNORE INTO tournament_entrants (tournament_id, handle, seed)
     VALUES (?1, ?2, 1)",
    params![id, created_by],
  )?;
  Ok(Tournament {
    id,
    community_id: community_id.into(),
    event_id,
    title: title.into(),
    game_title: game_title.trim().into(),
    description: description.trim().into(),
    status: "open".into(),
    max_players: max_p,
    prize_text: prize_text.trim().into(),
    prize_wb: prize_wb.max(0),
    created_by: created_by.into(),
    entrant_count: 1,
    created_at: chrono::Utc::now().to_rfc3339(),
  })
}

pub fn list_tournaments(conn: &Connection, community_id: &str) -> Result<Vec<Tournament>> {
  let mut stmt = conn.prepare(
    "SELECT t.id, t.community_id, t.event_id, t.title, t.game_title, t.description,
            t.status, t.max_players, t.prize_text, t.prize_wb, t.created_by, t.created_at,
            (SELECT COUNT(*) FROM tournament_entrants e WHERE e.tournament_id = t.id)
     FROM tournaments t
     WHERE t.community_id = ?1
     ORDER BY datetime(t.created_at) DESC",
  )?;
  let rows = stmt.query_map(params![community_id], |r| {
    Ok(Tournament {
      id: r.get(0)?,
      community_id: r.get(1)?,
      event_id: r.get(2)?,
      title: r.get(3)?,
      game_title: r.get(4)?,
      description: r.get(5)?,
      status: r.get(6)?,
      max_players: r.get(7)?,
      prize_text: r.get(8)?,
      prize_wb: r.get(9)?,
      created_by: r.get(10)?,
      created_at: r.get(11)?,
      entrant_count: r.get(12)?,
    })
  })?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row?);
  }
  Ok(out)
}

pub fn register_entrant(conn: &Connection, tournament_id: i64, handle: &str) -> Result<serde_json::Value> {
  let (status, max_p, count): (String, i64, i64) = conn.query_row(
    "SELECT status, max_players,
            (SELECT COUNT(*) FROM tournament_entrants WHERE tournament_id = ?1)
     FROM tournaments WHERE id = ?1",
    params![tournament_id],
    |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
  )?;
  if status != "open" {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Registration closed".into(),
    ));
  }
  if count >= max_p {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Tournament is full".into(),
    ));
  }
  conn.execute(
    "INSERT OR IGNORE INTO tournament_entrants (tournament_id, handle, seed)
     VALUES (?1, ?2, ?3)",
    params![tournament_id, handle, count + 1],
  )?;
  Ok(json!({ "registered": true, "tournamentId": tournament_id, "handle": handle }))
}

pub fn list_entrants(conn: &Connection, tournament_id: i64) -> Result<Vec<serde_json::Value>> {
  let mut stmt = conn.prepare(
    "SELECT e.handle, COALESCE(u.display_name, e.handle), e.seed, e.status, e.joined_at
     FROM tournament_entrants e
     LEFT JOIN users u ON u.handle = e.handle
     WHERE e.tournament_id = ?1
     ORDER BY e.seed ASC",
  )?;
  let rows = stmt.query_map(params![tournament_id], |r| {
    Ok(json!({
      "handle": r.get::<_, String>(0)?,
      "displayName": r.get::<_, String>(1)?,
      "seed": r.get::<_, i64>(2)?,
      "status": r.get::<_, String>(3)?,
      "joinedAt": r.get::<_, String>(4)?,
    }))
  })?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row?);
  }
  Ok(out)
}

/// Generate single-elim R1 pairings from entrants.
pub fn generate_bracket(conn: &Connection, tournament_id: i64, host: &str) -> Result<Vec<TournamentMatch>> {
  let created_by: String = conn.query_row(
    "SELECT created_by FROM tournaments WHERE id = ?1",
    params![tournament_id],
    |r| r.get(0),
  )?;
  if created_by != host {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Only tournament host can generate bracket".into(),
    ));
  }
  let mut entrants: Vec<String> = {
    let mut stmt = conn.prepare(
      "SELECT handle FROM tournament_entrants WHERE tournament_id = ?1 ORDER BY seed ASC",
    )?;
    let rows = stmt.query_map(params![tournament_id], |r| r.get::<_, String>(0))?;
    let mut v = Vec::new();
    for r in rows {
      v.push(r?);
    }
    v
  };
  if entrants.len() < 2 {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Need at least 2 entrants".into(),
    ));
  }
  // Clear old matches
  conn.execute(
    "DELETE FROM tournament_matches WHERE tournament_id = ?1",
    params![tournament_id],
  )?;
  // Pad to power of 2 with byes
  let mut n = 2;
  while n < entrants.len() {
    n *= 2;
  }
  while entrants.len() < n {
    entrants.push(String::new()); // bye
  }
  let mut matches = Vec::new();
  let mut idx = 0i64;
  for pair in entrants.chunks(2) {
    let a = if pair[0].is_empty() {
      None
    } else {
      Some(pair[0].clone())
    };
    let b = if pair.len() > 1 && !pair[1].is_empty() {
      Some(pair[1].clone())
    } else {
      None
    };
    let (winner, status) = match (&a, &b) {
      (Some(x), None) => (Some(x.clone()), "bye"),
      (None, Some(y)) => (Some(y.clone()), "bye"),
      (Some(_), Some(_)) => (None, "pending"),
      _ => (None, "pending"),
    };
    let note = match (&a, &b) {
      (Some(x), Some(y)) => format!("1v1: @{x} vs @{y} — report score in #match-reports"),
      (Some(x), None) => format!("Bye → @{x} advances"),
      _ => String::new(),
    };
    conn.execute(
      "INSERT INTO tournament_matches
        (tournament_id, round, match_index, player_a, player_b, winner, status, channel_note)
       VALUES (?1, 1, ?2, ?3, ?4, ?5, ?6, ?7)",
      params![tournament_id, idx, a, b, winner, status, note],
    )?;
    let id = conn.last_insert_rowid();
    matches.push(TournamentMatch {
      id,
      tournament_id,
      round: 1,
      match_index: idx,
      player_a: a,
      player_b: b,
      score_a: 0,
      score_b: 0,
      winner: winner.clone(),
      status: status.into(),
      channel_note: note,
      updated_at: chrono::Utc::now().to_rfc3339(),
    });
    idx += 1;
  }
  conn.execute(
    "UPDATE tournaments SET status = 'active' WHERE id = ?1",
    params![tournament_id],
  )?;
  Ok(matches)
}

pub fn list_matches(conn: &Connection, tournament_id: i64) -> Result<Vec<TournamentMatch>> {
  let mut stmt = conn.prepare(
    "SELECT id, tournament_id, round, match_index, player_a, player_b,
            score_a, score_b, winner, status, COALESCE(channel_note, ''), updated_at
     FROM tournament_matches
     WHERE tournament_id = ?1
     ORDER BY round ASC, match_index ASC",
  )?;
  let rows = stmt.query_map(params![tournament_id], |r| {
    Ok(TournamentMatch {
      id: r.get(0)?,
      tournament_id: r.get(1)?,
      round: r.get(2)?,
      match_index: r.get(3)?,
      player_a: r.get(4)?,
      player_b: r.get(5)?,
      score_a: r.get(6)?,
      score_b: r.get(7)?,
      winner: r.get(8)?,
      status: r.get(9)?,
      channel_note: r.get(10)?,
      updated_at: r.get(11)?,
    })
  })?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row?);
  }
  Ok(out)
}

pub fn report_match_result(
  conn: &Connection,
  match_id: i64,
  reporter: &str,
  score_a: i64,
  score_b: i64,
) -> Result<TournamentMatch> {
  let (tournament_id, player_a, player_b, status): (i64, Option<String>, Option<String>, String) =
    conn.query_row(
      "SELECT tournament_id, player_a, player_b, status FROM tournament_matches WHERE id = ?1",
      params![match_id],
      |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
    )?;
  if status == "complete" {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Match already complete".into(),
    ));
  }
  let host: String = conn.query_row(
    "SELECT created_by FROM tournaments WHERE id = ?1",
    params![tournament_id],
    |r| r.get(0),
  )?;
  let is_player = player_a.as_deref() == Some(reporter) || player_b.as_deref() == Some(reporter);
  if reporter != host && !is_player {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Only players or host can report scores".into(),
    ));
  }
  if score_a == score_b {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Scores cannot be tied — play a decider".into(),
    ));
  }
  let winner = if score_a > score_b {
    player_a.clone()
  } else {
    player_b.clone()
  };
  let note = format!(
    "Final {}-{} · winner @{}",
    score_a,
    score_b,
    winner.as_deref().unwrap_or("?")
  );
  conn.execute(
    "UPDATE tournament_matches
     SET score_a = ?1, score_b = ?2, winner = ?3, status = 'complete',
         channel_note = ?4, updated_at = datetime('now')
     WHERE id = ?5",
    params![score_a, score_b, winner, note, match_id],
  )?;

  // Prize: if only one remaining matchable winner path — award prize_wb when all R1 done and unique champ
  // Simple: if host and prize_wb > 0 and this was the last incomplete match, grant WB to winner
  let remaining: i64 = conn.query_row(
    "SELECT COUNT(*) FROM tournament_matches
     WHERE tournament_id = ?1 AND status NOT IN ('complete', 'bye')",
    params![tournament_id],
    |r| r.get(0),
  )?;
  if remaining == 0 {
    conn.execute(
      "UPDATE tournaments SET status = 'completed' WHERE id = ?1",
      params![tournament_id],
    )?;
  }

  conn
    .query_row(
      "SELECT id, tournament_id, round, match_index, player_a, player_b,
              score_a, score_b, winner, status, COALESCE(channel_note, ''), updated_at
       FROM tournament_matches WHERE id = ?1",
      params![match_id],
      |r| {
        Ok(TournamentMatch {
          id: r.get(0)?,
          tournament_id: r.get(1)?,
          round: r.get(2)?,
          match_index: r.get(3)?,
          player_a: r.get(4)?,
          player_b: r.get(5)?,
          score_a: r.get(6)?,
          score_b: r.get(7)?,
          winner: r.get(8)?,
          status: r.get(9)?,
          channel_note: r.get(10)?,
          updated_at: r.get(11)?,
        })
      },
    )
    .map_err(Into::into)
}

// ─── Seed ────────────────────────────────────────────────

pub fn seed_demo(conn: &Connection) -> Result<()> {
  // Apply anime + gaming templates on tsu if not applied
  let n: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM club_templates_applied WHERE community_id = 'tsu'",
      (),
      |r| r.get(0),
    )
    .unwrap_or(0);
  if n == 0 {
    let _ = apply_template(conn, "tsu", "anime", "demo_user");
    let _ = apply_template(conn, "tsu", "gaming", "demo_user");
    let _ = apply_template(conn, "tsu", "study", "demo_user");
    let _ = apply_template(conn, "howard", "anime", "hbcustudent");
  }

  let circles: i64 = conn
    .query_row("SELECT COUNT(*) FROM reading_circles", (), |r| r.get(0))
    .unwrap_or(0);
  if circles == 0 {
    let user_ok: i64 = conn
      .query_row(
        "SELECT COUNT(*) FROM users WHERE handle = 'campus_king'",
        (),
        |r| r.get(0),
      )
      .unwrap_or(0);
    if user_ok > 0 {
      if let Ok(c) = create_circle(
        conn,
        "tsu",
        "campus_king",
        "Tiger Anime Club · Weekly Read",
        "manga",
        "Share chapter thoughts, publish fan pages, drop recs.",
        "One Piece (re-read arcs)",
        Some("org_club"),
      ) {
        let _ = add_entry(
          conn,
          c.id,
          "campus_king",
          "rec",
          "Why we're starting with Marineford",
          "Peak stakes arc — discuss character writing this week.",
          "",
          "Ch. 550+",
        );
        let _ = add_entry(
          conn,
          c.id,
          "demo_user",
          "publish",
          "Fan panel: Luffy gear sketch",
          "Original panel practice — feedback welcome.",
          "fashion:art:luffy-sketch",
          "OC page 1",
        );
      }
    }
  }

  let tours: i64 = conn
    .query_row("SELECT COUNT(*) FROM tournaments", (), |r| r.get(0))
    .unwrap_or(0);
  if tours == 0 {
    let user_ok: i64 = conn
      .query_row(
        "SELECT COUNT(*) FROM users WHERE handle = 'demo_user'",
        (),
        |r| r.get(0),
      )
      .unwrap_or(0);
    if user_ok > 0 {
      if let Ok(t) = create_tournament(
        conn,
        "tsu",
        "demo_user",
        "TSU Friday Night Fighters",
        "Street Fighter 6",
        "Single-elim campus cup. Report scores in #match-reports. Prizes + merch on Yard Sale.",
        8,
        "1st: 50 WB + sticker pack listing · 2nd: 20 WB",
        50,
        None,
      ) {
        let _ = register_entrant(conn, t.id, "campus_king");
        let _ = register_entrant(conn, t.id, "jane_doe");
        let _ = register_entrant(conn, t.id, "hbcustudent");
      }
    }
  }

  Ok(())
}
