//! ProjectConnectBKSPC — credibility layer (orgs, opportunities, interests).
//! Demo-ready for promo; gates finance later via Yard Cred.

use crate::sqlite::{Connection, Result};
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectOrg {
  pub id: String,
  pub slug: String,
  pub name: String,
  pub org_type: String,
  pub yard_id: String,
  pub description: String,
  pub created_by: String,
  pub member_count: i64,
  pub opportunity_count: i64,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectOpportunity {
  pub id: i64,
  pub org_id: String,
  pub org_name: String,
  pub org_type: String,
  pub title: String,
  pub description: String,
  pub duration_text: String,
  pub tags_json: String,
  pub status: String,
  pub created_by: String,
  pub interest_count: i64,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectInterest {
  pub id: i64,
  pub opportunity_id: i64,
  pub opportunity_title: String,
  pub org_name: String,
  pub handle: String,
  pub display_name: String,
  pub message: String,
  pub skills_snapshot: String,
  pub classification: String,
  /// Only populated when applicant opted to share with org leads.
  pub gpa: String,
  pub gpa_shared: bool,
  pub status: String,
  pub created_at: String,
  pub yard_cred: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct YardCred {
  pub handle: String,
  pub score: i64,
  pub karma: i64,
  pub completions: i64,
  pub endorsements: i64,
  pub orgs_joined: i64,
  pub interests: i64,
}

pub fn ensure_schema(conn: &Connection) -> Result<()> {
  conn.execute_batch(
    "
    CREATE TABLE IF NOT EXISTS connect_orgs (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      org_type TEXT NOT NULL,
      yard_id TEXT DEFAULT '',
      description TEXT DEFAULT '',
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS connect_org_members (
      org_id TEXT NOT NULL,
      handle TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (org_id, handle)
    );
    CREATE TABLE IF NOT EXISTS connect_opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      duration_text TEXT DEFAULT '',
      tags_json TEXT DEFAULT '[]',
      status TEXT DEFAULT 'open',
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS connect_interests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL,
      handle TEXT NOT NULL,
      message TEXT DEFAULT '',
      skills_snapshot TEXT DEFAULT '',
      classification TEXT DEFAULT '',
      gpa TEXT DEFAULT '',
      gpa_shared INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(opportunity_id, handle)
    );
    CREATE TABLE IF NOT EXISTS connect_endorsements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_handle TEXT NOT NULL,
      to_handle TEXT NOT NULL,
      opportunity_id INTEGER NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(from_handle, to_handle, opportunity_id)
    );
    CREATE INDEX IF NOT EXISTS idx_connect_opp_org ON connect_opportunities(org_id, status);
    CREATE INDEX IF NOT EXISTS idx_connect_interest_opp ON connect_interests(opportunity_id);
    CREATE INDEX IF NOT EXISTS idx_connect_interest_handle ON connect_interests(handle);
    ",
  )?;
  // Additive columns for DBs created before GPA privacy
  let _ = conn.execute("ALTER TABLE connect_interests ADD COLUMN gpa TEXT DEFAULT ''", ());
  let _ = conn.execute(
    "ALTER TABLE connect_interests ADD COLUMN gpa_shared INTEGER DEFAULT 0",
    (),
  );
  Ok(())
}

/// True if handle is org owner/lead (or created the org row).
pub fn is_org_lead(conn: &Connection, org_id: &str, handle: &str) -> Result<bool> {
  let n: i64 = conn.query_row(
    "SELECT COUNT(*) FROM connect_org_members
     WHERE org_id = ?1 AND handle = ?2 AND role IN ('owner','lead')",
    params![org_id, handle],
    |r| r.get(0),
  )?;
  if n > 0 {
    return Ok(true);
  }
  let owner: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM connect_orgs WHERE id = ?1 AND created_by = ?2",
      params![org_id, handle],
      |r| r.get(0),
    )
    .unwrap_or(0);
  Ok(owner > 0)
}

fn notify_user(
  conn: &Connection,
  user_handle: &str,
  notification_type: &str,
  from_handle: &str,
  message: &str,
) {
  let _ = conn.execute(
    "INSERT INTO notifications (user_handle, notification_type, from_handle, message)
     VALUES (?1, ?2, ?3, ?4)",
    params![user_handle, notification_type, from_handle, message],
  );
}

/// Additive faculty / private-uni pipeline seeds (safe when core seed already ran).
pub fn seed_faculty_pipeline(conn: &Connection) -> Result<()> {
  conn.execute_batch(
    r#"
    INSERT OR IGNORE INTO connect_orgs (id, slug, name, org_type, yard_id, description, created_by) VALUES
      ('org_private_uni_bridge', 'private-uni-hbcu-bridge', 'Private University · HBCU Research Bridge', 'research', 'meharry',
       'Faculty from a private university (Nashville region) meeting Meharry & HBCU students on BlkSpace ProjectConnect — RA roles, summer research, pipeline mentorship.',
       'demo_user'),
      ('org_vandy_public_health', 'partner-public-health-lab', 'Partner Public Health Lab (private uni)', 'research', 'meharry',
       'Cross-town public health lab seeking underrepresented med/undergrad talent. Posts live where Meharry students already refresh and connect.',
       'demo_user'),
      ('org_meharry_research', 'meharry-med-research', 'Meharry Medical Research Network', 'research', 'meharry',
       'Faculty + student research for Meharry and HBCU med scholars. Micro-hours and async options for people on rotations.',
       'demo_user'),
      ('org_meharry_peers', 'meharry-peer-circle', 'Meharry Peer Circle', 'peer', 'meharry',
       'Underrepresented med students supporting each other — Step refresh, wellness, low-bandwidth mentorship.',
       'jane_doe'),
      ('org_snma_meharry', 'snma-meharry', 'SNMA @ Meharry', 'professional', 'meharry',
       'Student National Medical Association chapter energy — advocacy, pipeline, professional network without LinkedIn grind.',
       'campus_king');

    INSERT OR IGNORE INTO connect_org_members (org_id, handle, role) VALUES
      ('org_private_uni_bridge', 'demo_user', 'owner'),
      ('org_vandy_public_health', 'demo_user', 'lead'),
      ('org_meharry_research', 'demo_user', 'owner'),
      ('org_meharry_peers', 'jane_doe', 'owner'),
      ('org_snma_meharry', 'campus_king', 'owner');
    "#,
  )?;

  // Opportunities: only insert if this title/org pair is missing
  let faculty_opps: &[(&str, &str, &str, &str, &str, &str)] = &[
    (
      "org_private_uni_bridge",
      "Summer RA · health equity (Meharry + HBCU students)",
      "Private-university faculty lab recruiting underrepresented students. 8–10 week summer RA with optional async prep. Apply via ProjectConnect.",
      "Summer · ~10 hr/week",
      r#"["faculty","pipeline","meharry","hbcu","underrepresented","research","RA"]"#,
      "demo_user",
    ),
    (
      "org_private_uni_bridge",
      "Semester RA · clinical informatics (async-friendly)",
      "Part-time research assistant for de-identified / synthetic clinical data projects. Flexible for Meharry rotations.",
      "1 semester · 4–6 hr/week · flex",
      r#"["faculty","pipeline","async","med","underrepresented","RA"]"#,
      "demo_user",
    ),
    (
      "org_private_uni_bridge",
      "Faculty office hours on the yard (monthly)",
      "Open office-hours thread for underrepresented students exploring research careers. Hosted as Connect opp + yard presence.",
      "1 hr/month · open",
      r#"["faculty","pipeline","office-hours","underrepresented"]"#,
      "demo_user",
    ),
    (
      "org_vandy_public_health",
      "Community health disparities analysis (micro-project)",
      "Short collaborative analysis with Meharry peers. Private uni faculty co-mentor. Low-bandwidth check-ins.",
      "6 weeks · 3 hr/week",
      r#"["faculty","public-health","meharry","underrepresented","pipeline"]"#,
      "demo_user",
    ),
    (
      "org_meharry_research",
      "Health Disparities Micro-Lab (async · 2–4 hr/week)",
      "Low-bandwidth research for students on rotations. Async lit review + short write-ups. No mandatory live meetings.",
      "2–4 hr/week · flexible",
      r#"["research","meharry","async","low-bandwidth","health-disparities","med"]"#,
      "demo_user",
    ),
  ];

  for (org_id, title, desc, duration, tags, by) in faculty_opps {
    let exists: i64 = conn
      .query_row(
        "SELECT COUNT(*) FROM connect_opportunities WHERE org_id = ?1 AND title = ?2",
        params![org_id, title],
        |r| r.get(0),
      )
      .unwrap_or(0);
    if exists == 0 {
      let _ = conn.execute(
        "INSERT INTO connect_opportunities (org_id, title, description, duration_text, tags_json, status, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, 'open', ?6)",
        params![org_id, title, desc, duration, tags, by],
      );
    }
  }
  Ok(())
}

pub fn seed_demo(conn: &Connection) -> Result<()> {
  let n: i64 = conn
    .query_row("SELECT COUNT(*) FROM connect_orgs", (), |r| r.get(0))
    .unwrap_or(0);
  if n == 0 {
  conn.execute_batch(
    r#"
    INSERT INTO connect_orgs (id, slug, name, org_type, yard_id, description, created_by) VALUES
      ('org_nsbe_tsu', 'nsbe-tsu', 'NSBE @ TSU', 'professional', 'tsu',
       'National Society of Black Engineers — TSU chapter. Career prep, hackathons, peer mentorship.',
       'demo_user'),
      ('org_lab_ai', 'tsu-ai-lab', 'TSU AI Research Lab', 'research', 'tsu',
       'Faculty-led research on ML, privacy, and secure systems. Open to motivated students.',
       'demo_user'),
      ('org_bmds', 'bmds-medtech', 'Biomedical Data Sciences & MedTech', 'research', 'tsu',
       'Master''s-track research: clinical data, health AI, medtech pipelines for HBCU scholars entering biomedical data sciences.',
       'demo_user'),
      ('org_weixnet', 'weixnet-portfolio', 'WeixNet Portfolio Lab', 'professional', 'tsu',
       'Bleeding-edge social + economy experiments for underrepresented campuses. Portfolio-visible product work on BlkSpace / ProjectConnect.',
       'demo_user'),
      ('org_service', 'tiger-service', 'Tiger Community Service Hub', 'service', 'tsu',
       'Volunteer projects with Nashville partners — tutoring, food drives, campus clean-ups.',
       'jane_doe'),
      ('org_club', 'yard-creatives', 'Yard Creatives Club', 'club', 'tsu',
       'DJ mixes, design collabs, content nights. For-fun creator energy on the yard.',
       'campus_king'),
      ('org_peer', 'study-cohort', 'Peer Study Cohort', 'peer', 'howard',
       'Cross-major study groups and project squads. Peer-led, open enrollment.',
       'hbcustudent');

    INSERT INTO connect_org_members (org_id, handle, role) VALUES
      ('org_nsbe_tsu', 'demo_user', 'owner'),
      ('org_nsbe_tsu', 'campus_king', 'member'),
      ('org_lab_ai', 'demo_user', 'lead'),
      ('org_lab_ai', 'jane_doe', 'member'),
      ('org_bmds', 'demo_user', 'lead'),
      ('org_weixnet', 'demo_user', 'owner'),
      ('org_service', 'jane_doe', 'owner'),
      ('org_club', 'campus_king', 'owner'),
      ('org_peer', 'hbcustudent', 'owner');

    INSERT INTO connect_opportunities (org_id, title, description, duration_text, tags_json, status, created_by) VALUES
      ('org_lab_ai', 'Privacy-Preserving Financial Transactions',
       'Develop secure methods for private financial transactions using multi-party computation (MPC). Great for students interested in crypto-security research.',
       '6 months', '["research","security","MPC"]', 'open', 'demo_user'),
      ('org_lab_ai', 'Fraud Detection with ML',
       'Build machine learning solutions to detect and prevent fraud. Python + data pipelines. Join to shape safer digital payments.',
       '9 months', '["ML","python","research"]', 'open', 'demo_user'),
      ('org_bmds', 'Clinical NLP for Care Notes (MedTech)',
       'Pipeline for de-identified clinical notes: preprocessing, entity extraction, evaluation. Synthetic/demo data only — no PHI on Tier 0 devices.',
       '1 semester', '["research","medtech","NLP","biomedical"]', 'open', 'demo_user'),
      ('org_bmds', 'Wearable Signal ML — Risk Stratification Prototype',
       'Time-series features from wearable-like synthetic signals for early risk flags. Python/pandas/sklearn. Portfolio-ready figures for medtech interviews.',
       '6 months', '["research","medtech","ML","wearables"]', 'open', 'demo_user'),
      ('org_bmds', 'Fairness Audit: Health Prediction Models',
       'Audit a baseline clinical risk model for subgroup performance. Document bias metrics and mitigation notes.',
       '4 months', '["research","fairness","health-AI"]', 'open', 'demo_user'),
      ('org_weixnet', 'BlkSpace Campus Ambassador · Product Demo Squad',
       'Ship promo demos of BlkSpace + ProjectConnect for HBCU yards: stories, Tier 0 smoke tests, WeixNet portfolio showcases.',
       'ongoing', '["professional","product","HBCU"]', 'open', 'demo_user'),
      ('org_nsbe_tsu', 'NSBE Region Conference Crew',
       'Help organize workshops and logistics for the regional conference. Leadership + ops experience.',
       '3 months', '["professional","leadership"]', 'open', 'demo_user'),
      ('org_service', 'Saturday STEM Tutoring',
       'Tutor middle-school STEM in Nashville. Flexible 2-hour Saturday shifts. Community service hours available.',
       'ongoing', '["service","tutoring"]', 'open', 'jane_doe'),
      ('org_club', 'Homecoming Mix Collab',
       'Co-produce a yard mix for homecoming week. Need producers, vocalists, and cover art designers.',
       '6 weeks', '["club","music","creative"]', 'open', 'campus_king'),
      ('org_peer', 'Algorithms Study Sprint',
       'Weekly peer sessions for interviews + class. Bring a laptop and one problem to share.',
       '8 weeks', '["peer","study"]', 'open', 'hbcustudent');
    "#,
  )?;
  }
  // Always ensure faculty / Meharry pipeline orgs exist (new installs + upgrades).
  seed_faculty_pipeline(conn)?;
  Ok(())
}

fn map_org(row: &crate::sqlite::Row) -> Result<ConnectOrg> {
  Ok(ConnectOrg {
    id: row.get(0)?,
    slug: row.get(1)?,
    name: row.get(2)?,
    org_type: row.get(3)?,
    yard_id: row.get(4)?,
    description: row.get(5)?,
    created_by: row.get(6)?,
    member_count: row.get(7)?,
    opportunity_count: row.get(8)?,
    created_at: row.get(9)?,
  })
}

pub fn list_orgs(conn: &Connection, org_type: Option<&str>) -> Result<Vec<ConnectOrg>> {
  let sql = "
    SELECT o.id, o.slug, o.name, o.org_type, o.yard_id, o.description, o.created_by,
           (SELECT COUNT(*) FROM connect_org_members m WHERE m.org_id = o.id),
           (SELECT COUNT(*) FROM connect_opportunities p WHERE p.org_id = o.id AND p.status = 'open'),
           o.created_at
    FROM connect_orgs o
    WHERE (?1 = '' OR o.org_type = ?1)
    ORDER BY o.name
  ";
  let filter = org_type.unwrap_or("");
  let mut stmt = conn.prepare(sql)?;
  let rows = stmt.query_map(params![filter, filter], map_org)?;
  let mut out = Vec::new();
  for r in rows {
    out.push(r?);
  }
  Ok(out)
}

pub fn get_org(conn: &Connection, id: &str) -> Result<Option<ConnectOrg>> {
  let sql = "
    SELECT o.id, o.slug, o.name, o.org_type, o.yard_id, o.description, o.created_by,
           (SELECT COUNT(*) FROM connect_org_members m WHERE m.org_id = o.id),
           (SELECT COUNT(*) FROM connect_opportunities p WHERE p.org_id = o.id AND p.status = 'open'),
           o.created_at
    FROM connect_orgs o WHERE o.id = ?1 OR o.slug = ?1
  ";
  let mut stmt = conn.prepare(sql)?;
  let mut rows = stmt.query(params![id])?;
  match rows.next()? {
    Some(row) => Ok(Some(map_org(&row)?)),
    None => Ok(None),
  }
}

pub fn create_org(
  conn: &Connection,
  id: &str,
  slug: &str,
  name: &str,
  org_type: &str,
  yard_id: &str,
  description: &str,
  created_by: &str,
) -> Result<ConnectOrg> {
  conn.execute(
    "INSERT INTO connect_orgs (id, slug, name, org_type, yard_id, description, created_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    params![id, slug, name, org_type, yard_id, description, created_by],
  )?;
  conn.execute(
    "INSERT INTO connect_org_members (org_id, handle, role) VALUES (?1, ?2, 'owner')",
    params![id, created_by],
  )?;
  get_org(conn, id)?.ok_or_else(|| crate::sqlite::Error::QueryReturnedNoRows)
}

pub fn list_opportunities(
  conn: &Connection,
  org_id: Option<&str>,
  org_type: Option<&str>,
) -> Result<Vec<ConnectOpportunity>> {
  let sql = "
    SELECT p.id, p.org_id, o.name, o.org_type, p.title, p.description, p.duration_text,
           p.tags_json, p.status, p.created_by,
           (SELECT COUNT(*) FROM connect_interests i WHERE i.opportunity_id = p.id),
           p.created_at
    FROM connect_opportunities p
    JOIN connect_orgs o ON o.id = p.org_id
    WHERE (?1 = '' OR p.org_id = ?1)
      AND (?2 = '' OR o.org_type = ?2)
      AND p.status = 'open'
    ORDER BY p.created_at DESC
  ";
  let oid = org_id.unwrap_or("");
  let otype = org_type.unwrap_or("");
  let mut stmt = conn.prepare(sql)?;
  let rows = stmt.query_map(params![oid, oid, otype, otype], |row| {
    Ok(ConnectOpportunity {
      id: row.get(0)?,
      org_id: row.get(1)?,
      org_name: row.get(2)?,
      org_type: row.get(3)?,
      title: row.get(4)?,
      description: row.get(5)?,
      duration_text: row.get(6)?,
      tags_json: row.get(7)?,
      status: row.get(8)?,
      created_by: row.get(9)?,
      interest_count: row.get(10)?,
      created_at: row.get(11)?,
    })
  })?;
  let mut out = Vec::new();
  for r in rows {
    out.push(r?);
  }
  Ok(out)
}

pub fn get_opportunity(conn: &Connection, id: i64) -> Result<Option<ConnectOpportunity>> {
  let sql = "
    SELECT p.id, p.org_id, o.name, o.org_type, p.title, p.description, p.duration_text,
           p.tags_json, p.status, p.created_by,
           (SELECT COUNT(*) FROM connect_interests i WHERE i.opportunity_id = p.id),
           p.created_at
    FROM connect_opportunities p
    JOIN connect_orgs o ON o.id = p.org_id
    WHERE p.id = ?1
  ";
  let mut stmt = conn.prepare(sql)?;
  let mut rows = stmt.query(params![id])?;
  match rows.next()? {
    Some(row) => Ok(Some(ConnectOpportunity {
      id: row.get(0)?,
      org_id: row.get(1)?,
      org_name: row.get(2)?,
      org_type: row.get(3)?,
      title: row.get(4)?,
      description: row.get(5)?,
      duration_text: row.get(6)?,
      tags_json: row.get(7)?,
      status: row.get(8)?,
      created_by: row.get(9)?,
      interest_count: row.get(10)?,
      created_at: row.get(11)?,
    })),
    None => Ok(None),
  }
}

pub fn create_opportunity(
  conn: &Connection,
  org_id: &str,
  title: &str,
  description: &str,
  duration_text: &str,
  tags_json: &str,
  created_by: &str,
) -> Result<ConnectOpportunity> {
  if !is_org_lead(conn, org_id, created_by)? {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Only org owners/leads can post opportunities for this lab".into(),
    ));
  }
  conn.execute(
    "INSERT INTO connect_opportunities (org_id, title, description, duration_text, tags_json, created_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    params![org_id, title, description, duration_text, tags_json, created_by],
  )?;
  let id = conn.last_insert_rowid();
  get_opportunity(conn, id)?.ok_or_else(|| crate::sqlite::Error::QueryReturnedNoRows)
}

pub fn express_interest(
  conn: &Connection,
  opportunity_id: i64,
  handle: &str,
  message: &str,
  skills_snapshot: &str,
  classification: &str,
  gpa: &str,
  gpa_shared: bool,
) -> Result<ConnectInterest> {
  // Privacy: only store GPA when applicant explicitly shares with org leads.
  let (store_gpa, shared) = if gpa_shared && !gpa.trim().is_empty() {
    (gpa.trim(), 1i64)
  } else {
    ("", 0i64)
  };
  conn.execute(
    "INSERT INTO connect_interests (opportunity_id, handle, message, skills_snapshot, classification, gpa, gpa_shared)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
     ON CONFLICT(opportunity_id, handle) DO UPDATE SET
       message = excluded.message,
       skills_snapshot = excluded.skills_snapshot,
       classification = excluded.classification,
       gpa = excluded.gpa,
       gpa_shared = excluded.gpa_shared,
       status = 'pending'",
    params![
      opportunity_id,
      handle,
      message,
      skills_snapshot,
      classification,
      store_gpa,
      shared
    ],
  )?;

  // Notify opportunity creator + org owners/leads (faculty inbox companion).
  if let Ok(Some(opp)) = get_opportunity(conn, opportunity_id) {
    let msg = format!(
      "@{} expressed interest in \"{}\" — open Lead inbox on ProjectConnect",
      handle, opp.title
    );
    notify_user(conn, &opp.created_by, "connect_interest", handle, &msg);
    if let Ok(mut stmt) = conn.prepare(
      "SELECT handle FROM connect_org_members
       WHERE org_id = ?1 AND role IN ('owner','lead') AND handle != ?2",
    ) {
      if let Ok(rows) = stmt.query_map(params![opp.org_id, handle], |r| r.get::<_, String>(0)) {
        for row in rows.flatten() {
          if row != opp.created_by {
            notify_user(conn, &row, "connect_interest", handle, &msg);
          }
        }
      }
    }
  }

  list_interests_for_opportunity(conn, opportunity_id)?
    .into_iter()
    .find(|i| i.handle == handle)
    .ok_or_else(|| crate::sqlite::Error::QueryReturnedNoRows)
}

fn map_interest_row(row: &crate::sqlite::Row) -> Result<ConnectInterest> {
  let gpa_shared_i: i64 = row.get(11).unwrap_or(0);
  let gpa_raw: String = row.get(10).unwrap_or_default();
  let gpa_shared = gpa_shared_i != 0;
  Ok(ConnectInterest {
    id: row.get(0)?,
    opportunity_id: row.get(1)?,
    opportunity_title: row.get(2)?,
    org_name: row.get(3)?,
    handle: row.get(4)?,
    display_name: row.get(5)?,
    message: row.get(6)?,
    skills_snapshot: row.get(7)?,
    classification: row.get(8)?,
    status: row.get(9)?,
    gpa: if gpa_shared { gpa_raw } else { String::new() },
    gpa_shared,
    created_at: row.get(12)?,
    yard_cred: {
      let karma: i64 = row.get(13).unwrap_or(0);
      compute_cred_from_parts(karma, 0, 0, 0, 1)
    },
  })
}

pub fn list_interests_for_opportunity(
  conn: &Connection,
  opportunity_id: i64,
) -> Result<Vec<ConnectInterest>> {
  // Column order must match map_interest_row:
  // 0 id, 1 opp_id, 2 title, 3 org, 4 handle, 5 display, 6 message, 7 skills,
  // 8 class, 9 status, 10 gpa, 11 gpa_shared, 12 created_at, 13 karma
  let sql = "
    SELECT i.id, i.opportunity_id, p.title, o.name, i.handle,
           COALESCE(u.display_name, i.handle),
           i.message, i.skills_snapshot, i.classification, i.status,
           COALESCE(i.gpa, ''), COALESCE(i.gpa_shared, 0),
           i.created_at,
           COALESCE(u.post_karma,0) + COALESCE(u.comment_karma,0)
    FROM connect_interests i
    JOIN connect_opportunities p ON p.id = i.opportunity_id
    JOIN connect_orgs o ON o.id = p.org_id
    LEFT JOIN users u ON u.handle = i.handle
    WHERE i.opportunity_id = ?1
    ORDER BY i.created_at DESC
  ";
  let mut stmt = conn.prepare(sql)?;
  let rows = stmt.query_map(params![opportunity_id], map_interest_row)?;
  let mut out = Vec::new();
  for r in rows {
    out.push(r?);
  }
  Ok(out)
}

pub fn list_inbox_for_lead(conn: &Connection, lead_handle: &str) -> Result<Vec<ConnectInterest>> {
  let sql = "
    SELECT i.id, i.opportunity_id, p.title, o.name, i.handle,
           COALESCE(u.display_name, i.handle),
           i.message, i.skills_snapshot, i.classification, i.status,
           COALESCE(i.gpa, ''), COALESCE(i.gpa_shared, 0),
           i.created_at,
           COALESCE(u.post_karma,0) + COALESCE(u.comment_karma,0)
    FROM connect_interests i
    JOIN connect_opportunities p ON p.id = i.opportunity_id
    JOIN connect_orgs o ON o.id = p.org_id
    LEFT JOIN users u ON u.handle = i.handle
    WHERE p.created_by = ?1 OR EXISTS (
      SELECT 1 FROM connect_org_members m
      WHERE m.org_id = o.id AND m.handle = ?1 AND m.role IN ('owner','lead')
    )
    ORDER BY i.created_at DESC
  ";
  let mut stmt = conn.prepare(sql)?;
  let rows = stmt.query_map(params![lead_handle, lead_handle], map_interest_row)?;
  let mut out = Vec::new();
  for r in rows {
    out.push(r?);
  }
  Ok(out)
}

pub fn list_interests_for_handle(
  conn: &Connection,
  applicant_handle: &str,
) -> Result<Vec<ConnectInterest>> {
  let sql = "
    SELECT i.id, i.opportunity_id, p.title, o.name, i.handle,
           COALESCE(u.display_name, i.handle),
           i.message, i.skills_snapshot, i.classification, i.status,
           COALESCE(i.gpa, ''), COALESCE(i.gpa_shared, 0),
           i.created_at,
           COALESCE(u.post_karma,0) + COALESCE(u.comment_karma,0)
    FROM connect_interests i
    JOIN connect_opportunities p ON p.id = i.opportunity_id
    JOIN connect_orgs o ON o.id = p.org_id
    LEFT JOIN users u ON u.handle = i.handle
    WHERE i.handle = ?1
    ORDER BY i.created_at DESC
  ";
  let mut stmt = conn.prepare(sql)?;
  let rows = stmt.query_map(params![applicant_handle], map_interest_row)?;
  let mut out = Vec::new();
  for r in rows {
    out.push(r?);
  }
  Ok(out)
}

pub fn set_interest_status(
  conn: &Connection,
  interest_id: i64,
  actor_handle: &str,
  status: &str,
) -> Result<()> {
  let org_id: String = conn.query_row(
    "SELECT p.org_id
     FROM connect_interests i
     JOIN connect_opportunities p ON p.id = i.opportunity_id
     WHERE i.id = ?1",
    params![interest_id],
    |r| r.get(0),
  )?;
  if !is_org_lead(conn, &org_id, actor_handle)? {
    return Err(crate::sqlite::Error::QueryReturnedNoRows);
  }
  let normalized = if status == "rejected" { "declined" } else { status };
  if !matches!(normalized, "pending" | "contacted" | "accepted" | "declined") {
    return Err(crate::sqlite::Error::QueryReturnedNoRows);
  }
  conn.execute(
    "UPDATE connect_interests SET status = ?1 WHERE id = ?2",
    params![normalized, interest_id],
  )?;
  Ok(())
}

pub fn complete_interest(
  conn: &Connection,
  interest_id: i64,
  from_handle: &str,
  note: &str,
) -> Result<()> {
  let (opp_id, org_id, to_handle): (i64, String, String) = conn.query_row(
    "SELECT i.opportunity_id, p.org_id, i.handle
     FROM connect_interests i
     JOIN connect_opportunities p ON p.id = i.opportunity_id
     WHERE i.id = ?1",
    params![interest_id],
    |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
  )?;
  if !is_org_lead(conn, &org_id, from_handle)? {
    return Err(crate::sqlite::Error::QueryReturnedNoRows);
  }
  conn.execute(
    "UPDATE connect_interests SET status = 'completed' WHERE id = ?1",
    params![interest_id],
  )?;
  let _ = conn.execute(
    "INSERT OR IGNORE INTO connect_endorsements (from_handle, to_handle, opportunity_id, note)
     VALUES (?1, ?2, ?3, ?4)",
    params![from_handle, to_handle, opp_id, note],
  );
  Ok(())
}

/// Simple 0–100 Yard Cred composite for promo (see credibility-layer doc).
pub fn compute_cred_from_parts(
  karma: i64,
  completions: i64,
  endorsements: i64,
  orgs: i64,
  interests: i64,
) -> i64 {
  let k = (karma.min(500) as f64 / 500.0) * 25.0;
  let c = (completions.min(10) as f64 / 10.0) * 30.0;
  let e = (endorsements.min(10) as f64 / 10.0) * 20.0;
  let o = (orgs.min(5) as f64 / 5.0) * 15.0;
  let i = (interests.min(10) as f64 / 10.0) * 10.0;
  (k + c + e + o + i).round() as i64
}

pub fn get_yard_cred(conn: &Connection, handle: &str) -> Result<YardCred> {
  let karma: i64 = conn
    .query_row(
      "SELECT COALESCE(post_karma,0) + COALESCE(comment_karma,0) FROM users WHERE handle = ?1",
      params![handle],
      |r| r.get(0),
    )
    .unwrap_or(0);
  let completions: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM connect_interests WHERE handle = ?1 AND status = 'completed'",
      params![handle],
      |r| r.get(0),
    )
    .unwrap_or(0);
  let endorsements: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM connect_endorsements WHERE to_handle = ?1",
      params![handle],
      |r| r.get(0),
    )
    .unwrap_or(0);
  let orgs: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM connect_org_members WHERE handle = ?1",
      params![handle],
      |r| r.get(0),
    )
    .unwrap_or(0);
  let interests: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM connect_interests WHERE handle = ?1",
      params![handle],
      |r| r.get(0),
    )
    .unwrap_or(0);
  Ok(YardCred {
    handle: handle.to_string(),
    score: compute_cred_from_parts(karma, completions, endorsements, orgs, interests),
    karma,
    completions,
    endorsements,
    orgs_joined: orgs,
    interests,
  })
}
