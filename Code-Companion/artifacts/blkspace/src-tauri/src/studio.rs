//! Photography / videography studio:
//! - Public portfolio collections
//! - Client shoot deliveries (all-in-one access)
//! - Free distribute (grant) or sell (WB unlock)

use crate::db::{calc_platform_fee, AppError, MARKETPLACE_PLATFORM_FEE_BPS};
use crate::sqlite::{params, Connection, OptionalExtension, Result};
use serde::Serialize;
use serde_json::json;

pub fn ensure_schema(conn: &Connection) -> Result<()> {
  conn.execute_batch(
    "
    CREATE TABLE IF NOT EXISTS studio_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_handle TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_ref TEXT DEFAULT '',
      visibility TEXT DEFAULT 'public',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS studio_collection_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL,
      media_ref TEXT NOT NULL,
      caption TEXT DEFAULT '',
      kind TEXT DEFAULT 'photo',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (collection_id) REFERENCES studio_collections(id)
    );
    CREATE TABLE IF NOT EXISTS studio_shoots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_handle TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      client_handle TEXT DEFAULT '',
      client_label TEXT DEFAULT '',
      access_mode TEXT DEFAULT 'free',
      price_wb INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      pin_code TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS studio_shoot_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shoot_id INTEGER NOT NULL,
      media_ref TEXT NOT NULL,
      filename TEXT DEFAULT '',
      caption TEXT DEFAULT '',
      kind TEXT DEFAULT 'photo',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (shoot_id) REFERENCES studio_shoots(id)
    );
    CREATE TABLE IF NOT EXISTS studio_shoot_access (
      shoot_id INTEGER NOT NULL,
      handle TEXT NOT NULL,
      granted_via TEXT DEFAULT 'grant',
      paid_wb INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (shoot_id, handle)
    );
    CREATE INDEX IF NOT EXISTS idx_studio_coll_owner ON studio_collections(owner_handle);
    CREATE INDEX IF NOT EXISTS idx_studio_shoot_owner ON studio_shoots(owner_handle);
    CREATE INDEX IF NOT EXISTS idx_studio_access_handle ON studio_shoot_access(handle);
    ",
  )?;
  Ok(())
}

// ─── Types ───────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StudioCollection {
  pub id: i64,
  pub owner_handle: String,
  pub title: String,
  pub description: String,
  pub cover_ref: String,
  pub visibility: String,
  pub item_count: i64,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StudioCollectionItem {
  pub id: i64,
  pub collection_id: i64,
  pub media_ref: String,
  pub caption: String,
  pub kind: String,
  pub sort_order: i64,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StudioShoot {
  pub id: i64,
  pub owner_handle: String,
  pub title: String,
  pub description: String,
  pub client_handle: String,
  pub client_label: String,
  pub access_mode: String,
  pub price_wb: i64,
  pub status: String,
  pub has_pin: bool,
  pub asset_count: i64,
  pub access_count: i64,
  pub created_at: String,
  /// Present when caller has access or is owner
  pub viewer_has_access: bool,
  pub viewer_can_export: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StudioAsset {
  pub id: i64,
  pub shoot_id: i64,
  pub media_ref: String,
  pub filename: String,
  pub caption: String,
  pub kind: String,
  pub created_at: String,
}

// ─── Portfolio ───────────────────────────────────────────

pub fn create_collection(
  conn: &Connection,
  owner: &str,
  title: &str,
  description: &str,
  cover_ref: &str,
  visibility: &str,
) -> Result<StudioCollection> {
  let title = title.trim();
  if title.is_empty() {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Collection title required".into(),
    ));
  }
  let vis = if visibility == "unlisted" {
    "unlisted"
  } else {
    "public"
  };
  conn.execute(
    "INSERT INTO studio_collections (owner_handle, title, description, cover_ref, visibility)
     VALUES (?1, ?2, ?3, ?4, ?5)",
    params![owner, title, description.trim(), cover_ref.trim(), vis],
  )?;
  let id = conn.last_insert_rowid();
  Ok(StudioCollection {
    id,
    owner_handle: owner.into(),
    title: title.into(),
    description: description.trim().into(),
    cover_ref: cover_ref.trim().into(),
    visibility: vis.into(),
    item_count: 0,
    created_at: chrono::Utc::now().to_rfc3339(),
  })
}

pub fn list_collections(conn: &Connection, owner: &str, public_only: bool) -> Result<Vec<StudioCollection>> {
  let sql = if public_only {
    "SELECT c.id, c.owner_handle, c.title, c.description, c.cover_ref, c.visibility, c.created_at,
            (SELECT COUNT(*) FROM studio_collection_items i WHERE i.collection_id = c.id)
     FROM studio_collections c
     WHERE c.owner_handle = ?1 AND c.visibility = 'public'
     ORDER BY datetime(c.created_at) DESC"
  } else {
    "SELECT c.id, c.owner_handle, c.title, c.description, c.cover_ref, c.visibility, c.created_at,
            (SELECT COUNT(*) FROM studio_collection_items i WHERE i.collection_id = c.id)
     FROM studio_collections c
     WHERE c.owner_handle = ?1
     ORDER BY datetime(c.created_at) DESC"
  };
  let mut stmt = conn.prepare(sql)?;
  let rows = stmt.query_map(params![owner], |r| {
    Ok(StudioCollection {
      id: r.get(0)?,
      owner_handle: r.get(1)?,
      title: r.get(2)?,
      description: r.get(3)?,
      cover_ref: r.get(4)?,
      visibility: r.get(5)?,
      created_at: r.get(6)?,
      item_count: r.get(7)?,
    })
  })?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row?);
  }
  Ok(out)
}

pub fn add_collection_item(
  conn: &Connection,
  collection_id: i64,
  owner: &str,
  media_ref: &str,
  caption: &str,
  kind: &str,
) -> Result<StudioCollectionItem> {
  let own: String = conn.query_row(
    "SELECT owner_handle FROM studio_collections WHERE id = ?1",
    params![collection_id],
    |r| r.get(0),
  )?;
  if own != owner {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Not your collection".into(),
    ));
  }
  let media_ref = media_ref.trim();
  if media_ref.is_empty() {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Media ref required".into(),
    ));
  }
  let k = if kind == "video" { "video" } else { "photo" };
  let order: i64 = conn
    .query_row(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM studio_collection_items WHERE collection_id = ?1",
      params![collection_id],
      |r| r.get(0),
    )
    .unwrap_or(1);
  conn.execute(
    "INSERT INTO studio_collection_items (collection_id, media_ref, caption, kind, sort_order)
     VALUES (?1, ?2, ?3, ?4, ?5)",
    params![collection_id, media_ref, caption.trim(), k, order],
  )?;
  let id = conn.last_insert_rowid();
  // set cover if empty
  let _ = conn.execute(
    "UPDATE studio_collections SET cover_ref = ?1
     WHERE id = ?2 AND (cover_ref IS NULL OR cover_ref = '')",
    params![media_ref, collection_id],
  );
  Ok(StudioCollectionItem {
    id,
    collection_id,
    media_ref: media_ref.into(),
    caption: caption.trim().into(),
    kind: k.into(),
    sort_order: order,
    created_at: chrono::Utc::now().to_rfc3339(),
  })
}

pub fn list_collection_items(conn: &Connection, collection_id: i64) -> Result<Vec<StudioCollectionItem>> {
  let mut stmt = conn.prepare(
    "SELECT id, collection_id, media_ref, caption, kind, sort_order, created_at
     FROM studio_collection_items WHERE collection_id = ?1 ORDER BY sort_order ASC, id ASC",
  )?;
  let rows = stmt.query_map(params![collection_id], |r| {
    Ok(StudioCollectionItem {
      id: r.get(0)?,
      collection_id: r.get(1)?,
      media_ref: r.get(2)?,
      caption: r.get(3)?,
      kind: r.get(4)?,
      sort_order: r.get(5)?,
      created_at: r.get(6)?,
    })
  })?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row?);
  }
  Ok(out)
}

// ─── Shoots / client delivery ────────────────────────────

pub fn create_shoot(
  conn: &Connection,
  owner: &str,
  title: &str,
  description: &str,
  client_handle: &str,
  client_label: &str,
  access_mode: &str,
  price_wb: i64,
  pin_code: &str,
) -> Result<StudioShoot> {
  let title = title.trim();
  if title.is_empty() {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Shoot title required".into(),
    ));
  }
  let mode = if access_mode == "paid" { "paid" } else { "free" };
  let price = if mode == "paid" { price_wb.max(1) } else { 0 };
  conn.execute(
    "INSERT INTO studio_shoots
      (owner_handle, title, description, client_handle, client_label, access_mode, price_wb, pin_code, status)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'draft')",
    params![
      owner,
      title,
      description.trim(),
      client_handle.trim(),
      client_label.trim(),
      mode,
      price,
      pin_code.trim()
    ],
  )?;
  let id = conn.last_insert_rowid();
  // Owner always has access
  conn.execute(
    "INSERT OR IGNORE INTO studio_shoot_access (shoot_id, handle, granted_via, paid_wb)
     VALUES (?1, ?2, 'owner', 0)",
    params![id, owner],
  )?;
  // Pre-grant named client on free mode
  let ch = client_handle.trim();
  if !ch.is_empty() && mode == "free" {
    conn.execute(
      "INSERT OR IGNORE INTO studio_shoot_access (shoot_id, handle, granted_via, paid_wb)
       VALUES (?1, ?2, 'grant', 0)",
      params![id, ch],
    )?;
  }
  Ok(StudioShoot {
    id,
    owner_handle: owner.into(),
    title: title.into(),
    description: description.trim().into(),
    client_handle: ch.into(),
    client_label: client_label.trim().into(),
    access_mode: mode.into(),
    price_wb: price,
    status: "draft".into(),
    has_pin: !pin_code.trim().is_empty(),
    asset_count: 0,
    access_count: 1,
    created_at: chrono::Utc::now().to_rfc3339(),
    viewer_has_access: true,
    viewer_can_export: true,
  })
}

fn has_access(conn: &Connection, shoot_id: i64, handle: &str) -> Result<bool> {
  let n: i64 = conn.query_row(
    "SELECT COUNT(*) FROM studio_shoot_access WHERE shoot_id = ?1 AND handle = ?2",
    params![shoot_id, handle],
    |r| r.get(0),
  )?;
  if n > 0 {
    return Ok(true);
  }
  // Owner check
  let own: Option<String> = conn
    .query_row(
      "SELECT owner_handle FROM studio_shoots WHERE id = ?1",
      params![shoot_id],
      |r| r.get(0),
    )
    .optional()?;
  Ok(own.as_deref() == Some(handle))
}

pub fn list_shoots_for_owner(conn: &Connection, owner: &str) -> Result<Vec<StudioShoot>> {
  list_shoots_query(
    conn,
    "SELECT s.id, s.owner_handle, s.title, s.description, s.client_handle, s.client_label,
            s.access_mode, s.price_wb, s.status, s.pin_code, s.created_at,
            (SELECT COUNT(*) FROM studio_shoot_assets a WHERE a.shoot_id = s.id),
            (SELECT COUNT(*) FROM studio_shoot_access x WHERE x.shoot_id = s.id)
     FROM studio_shoots s WHERE s.owner_handle = ?1
     ORDER BY datetime(s.created_at) DESC",
    owner,
    owner,
  )
}

pub fn list_shoots_for_client(conn: &Connection, handle: &str) -> Result<Vec<StudioShoot>> {
  list_shoots_query(
    conn,
    "SELECT s.id, s.owner_handle, s.title, s.description, s.client_handle, s.client_label,
            s.access_mode, s.price_wb, s.status, s.pin_code, s.created_at,
            (SELECT COUNT(*) FROM studio_shoot_assets a WHERE a.shoot_id = s.id),
            (SELECT COUNT(*) FROM studio_shoot_access x WHERE x.shoot_id = s.id)
     FROM studio_shoots s
     WHERE s.status = 'delivered' AND (
       EXISTS (SELECT 1 FROM studio_shoot_access x WHERE x.shoot_id = s.id AND x.handle = ?1)
       OR s.client_handle = ?1
     )
     ORDER BY datetime(s.created_at) DESC",
    handle,
    handle,
  )
}

fn list_shoots_query(
  conn: &Connection,
  sql: &str,
  bind: &str,
  viewer: &str,
) -> Result<Vec<StudioShoot>> {
  let mut stmt = conn.prepare(sql)?;
  let rows = stmt.query_map(params![bind], |r| {
    let pin: String = r.get(9)?;
    let id: i64 = r.get(0)?;
    Ok((
      StudioShoot {
        id,
        owner_handle: r.get(1)?,
        title: r.get(2)?,
        description: r.get(3)?,
        client_handle: r.get(4)?,
        client_label: r.get(5)?,
        access_mode: r.get(6)?,
        price_wb: r.get(7)?,
        status: r.get(8)?,
        has_pin: !pin.is_empty(),
        created_at: r.get(10)?,
        asset_count: r.get(11)?,
        access_count: r.get(12)?,
        viewer_has_access: false,
        viewer_can_export: false,
      },
      id,
    ))
  })?;
  let mut out = Vec::new();
  for row in rows {
    let (mut s, id) = row?;
    let access = has_access(conn, id, viewer).unwrap_or(false) || s.owner_handle == viewer;
    s.viewer_has_access = access;
    s.viewer_can_export =
      s.owner_handle == viewer || (access && s.status == "delivered");
    out.push(s);
  }
  Ok(out)
}

pub fn get_shoot(conn: &Connection, shoot_id: i64, viewer: &str) -> Result<Option<StudioShoot>> {
  let row = conn
    .query_row(
      "SELECT s.id, s.owner_handle, s.title, s.description, s.client_handle, s.client_label,
              s.access_mode, s.price_wb, s.status, s.pin_code, s.created_at,
              (SELECT COUNT(*) FROM studio_shoot_assets a WHERE a.shoot_id = s.id),
              (SELECT COUNT(*) FROM studio_shoot_access x WHERE x.shoot_id = s.id)
       FROM studio_shoots s WHERE s.id = ?1",
      params![shoot_id],
      |r| {
        let pin: String = r.get(9)?;
        Ok(StudioShoot {
          id: r.get(0)?,
          owner_handle: r.get(1)?,
          title: r.get(2)?,
          description: r.get(3)?,
          client_handle: r.get(4)?,
          client_label: r.get(5)?,
          access_mode: r.get(6)?,
          price_wb: r.get(7)?,
          status: r.get(8)?,
          has_pin: !pin.is_empty(),
          created_at: r.get(10)?,
          asset_count: r.get(11)?,
          access_count: r.get(12)?,
          viewer_has_access: false,
          viewer_can_export: false,
        })
      },
    )
    .optional()?;
  let Some(mut s) = row else {
    return Ok(None);
  };
  let access = has_access(conn, shoot_id, viewer).unwrap_or(false) || s.owner_handle == viewer;
  s.viewer_has_access = access;
  s.viewer_can_export = access;
  Ok(Some(s))
}

pub fn add_shoot_asset(
  conn: &Connection,
  shoot_id: i64,
  owner: &str,
  media_ref: &str,
  filename: &str,
  caption: &str,
  kind: &str,
) -> Result<StudioAsset> {
  let own: String = conn.query_row(
    "SELECT owner_handle FROM studio_shoots WHERE id = ?1",
    params![shoot_id],
    |r| r.get(0),
  )?;
  if own != owner {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Not your shoot".into(),
    ));
  }
  let media_ref = media_ref.trim();
  if media_ref.is_empty() {
    return Err(crate::sqlite::Error::InvalidParameterName(
      "Media ref required (blob hash / CID / URL)".into(),
    ));
  }
  let k = if kind == "video" { "video" } else { "photo" };
  conn.execute(
    "INSERT INTO studio_shoot_assets (shoot_id, media_ref, filename, caption, kind)
     VALUES (?1, ?2, ?3, ?4, ?5)",
    params![
      shoot_id,
      media_ref,
      filename.trim(),
      caption.trim(),
      k
    ],
  )?;
  let id = conn.last_insert_rowid();
  Ok(StudioAsset {
    id,
    shoot_id,
    media_ref: media_ref.into(),
    filename: filename.trim().into(),
    caption: caption.trim().into(),
    kind: k.into(),
    created_at: chrono::Utc::now().to_rfc3339(),
  })
}

pub fn list_shoot_assets(
  conn: &Connection,
  shoot_id: i64,
  viewer: &str,
) -> Result<Vec<StudioAsset>, AppError> {
  let shoot = get_shoot(conn, shoot_id, viewer)
    .map_err(AppError::from)?
    .ok_or_else(|| AppError::Validation("Shoot not found".into()))?;

  let is_owner = shoot.owner_handle == viewer;
  if !is_owner && !shoot.viewer_has_access {
    // Paid shoots: show empty / locked unless purchased
    if shoot.access_mode == "paid" && shoot.status == "delivered" {
      return Err(AppError::Validation(
        "Purchase or request access to view delivery".into(),
      ));
    }
    if shoot.status != "delivered" {
      return Err(AppError::Validation("Shoot not published yet".into()));
    }
    return Err(AppError::Validation("No access to this delivery".into()));
  }

  let mut stmt = conn
    .prepare(
      "SELECT id, shoot_id, media_ref, filename, caption, kind, created_at
       FROM studio_shoot_assets WHERE shoot_id = ?1 ORDER BY id ASC",
    )
    .map_err(AppError::from)?;
  let rows = stmt
    .query_map(params![shoot_id], |r| {
      Ok(StudioAsset {
        id: r.get(0)?,
        shoot_id: r.get(1)?,
        media_ref: r.get(2)?,
        filename: r.get(3)?,
        caption: r.get(4)?,
        kind: r.get(5)?,
        created_at: r.get(6)?,
      })
    })
    .map_err(AppError::from)?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row.map_err(AppError::from)?);
  }
  Ok(out)
}

pub fn publish_shoot(conn: &Connection, shoot_id: i64, owner: &str) -> Result<StudioShoot, AppError> {
  let own: String = conn
    .query_row(
      "SELECT owner_handle FROM studio_shoots WHERE id = ?1",
      params![shoot_id],
      |r| r.get(0),
    )
    .map_err(AppError::from)?;
  if own != owner {
    return Err(AppError::Validation("Not your shoot".into()));
  }
  let assets: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM studio_shoot_assets WHERE shoot_id = ?1",
      params![shoot_id],
      |r| r.get(0),
    )
    .map_err(AppError::from)?;
  if assets == 0 {
    return Err(AppError::Validation(
      "Add at least one photo/video before publishing".into(),
    ));
  }
  conn
    .execute(
      "UPDATE studio_shoots SET status = 'delivered' WHERE id = ?1",
      params![shoot_id],
    )
    .map_err(AppError::from)?;
  get_shoot(conn, shoot_id, owner)
    .map_err(AppError::from)?
    .ok_or_else(|| AppError::Validation("Shoot not found".into()))
}

pub fn grant_access(
  conn: &Connection,
  shoot_id: i64,
  owner: &str,
  client_handle: &str,
) -> Result<serde_json::Value, AppError> {
  let own: String = conn
    .query_row(
      "SELECT owner_handle FROM studio_shoots WHERE id = ?1",
      params![shoot_id],
      |r| r.get(0),
    )
    .map_err(AppError::from)?;
  if own != owner {
    return Err(AppError::Validation("Not your shoot".into()));
  }
  let h = client_handle.trim();
  if h.is_empty() {
    return Err(AppError::Validation("Client handle required".into()));
  }
  conn
    .execute(
      "INSERT OR IGNORE INTO studio_shoot_access (shoot_id, handle, granted_via, paid_wb)
       VALUES (?1, ?2, 'grant', 0)",
      params![shoot_id, h],
    )
    .map_err(AppError::from)?;
  // Also set client_handle if empty
  let _ = conn.execute(
    "UPDATE studio_shoots SET client_handle = ?1
     WHERE id = ?2 AND (client_handle IS NULL OR client_handle = '')",
    params![h, shoot_id],
  );
  Ok(json!({ "granted": true, "handle": h, "shootId": shoot_id }))
}

/// Client purchases all-in-one access with WB.
pub fn purchase_access(
  conn: &Connection,
  shoot_id: i64,
  buyer: &str,
) -> Result<serde_json::Value, AppError> {
  if has_access(conn, shoot_id, buyer).map_err(AppError::from)? {
    return Ok(json!({ "alreadyHadAccess": true, "shootId": shoot_id }));
  }
  let (owner, mode, price, status): (String, String, i64, String) = conn
    .query_row(
      "SELECT owner_handle, access_mode, price_wb, status FROM studio_shoots WHERE id = ?1",
      params![shoot_id],
      |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
    )
    .map_err(AppError::from)?;
  if status != "delivered" {
    return Err(AppError::Validation("Shoot not available yet".into()));
  }
  if owner == buyer {
    return Err(AppError::Validation("You own this shoot".into()));
  }
  if mode != "paid" {
    return Err(AppError::Validation(
      "This delivery is free — ask the studio for a grant".into(),
    ));
  }
  if price <= 0 {
    return Err(AppError::Validation("Invalid price".into()));
  }
  let fee = calc_platform_fee(price, MARKETPLACE_PLATFORM_FEE_BPS);
  let net = price - fee;
  let bal: i64 = conn
    .query_row(
      "SELECT weix_bucks FROM users WHERE handle = ?1",
      params![buyer],
      |r| r.get(0),
    )
    .map_err(AppError::from)?;
  if bal < price {
    return Err(AppError::Validation(format!(
      "Need {price} WB for full delivery access (you have {bal})"
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
      params![net, owner],
    )
    .map_err(AppError::from)?;
  conn
    .execute(
      "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
       SELECT ?1, 'spend', -?2, ?3, weix_bucks FROM users WHERE handle = ?1",
      params![
        buyer,
        price,
        format!("Studio delivery unlock · shoot #{shoot_id}")
      ],
    )
    .map_err(AppError::from)?;
  conn
    .execute(
      "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
       SELECT ?1, 'earn', ?2, ?3, weix_bucks FROM users WHERE handle = ?1",
      params![
        owner,
        net,
        format!("Studio sale · shoot #{shoot_id}")
      ],
    )
    .map_err(AppError::from)?;
  conn
    .execute(
      "INSERT OR REPLACE INTO studio_shoot_access (shoot_id, handle, granted_via, paid_wb)
       VALUES (?1, ?2, 'purchase', ?3)",
      params![shoot_id, buyer, price],
    )
    .map_err(AppError::from)?;
  Ok(json!({
    "purchased": true,
    "shootId": shoot_id,
    "paidWb": price,
    "sellerNet": net,
    "allInOneAccess": true,
  }))
}

/// Export manifest for client (all-in-one access package).
pub fn export_manifest(
  conn: &Connection,
  shoot_id: i64,
  viewer: &str,
) -> Result<serde_json::Value, AppError> {
  let shoot = get_shoot(conn, shoot_id, viewer)
    .map_err(AppError::from)?
    .ok_or_else(|| AppError::Validation("Shoot not found".into()))?;
  if !shoot.viewer_has_access && shoot.owner_handle != viewer {
    return Err(AppError::Validation("No access to export".into()));
  }
  let assets = list_shoot_assets(conn, shoot_id, viewer)?;
  Ok(json!({
    "type": "blkspace_studio_export_v1",
    "shootId": shoot.id,
    "title": shoot.title,
    "studio": shoot.owner_handle,
    "client": shoot.client_handle,
    "clientLabel": shoot.client_label,
    "exportedAt": chrono::Utc::now().to_rfc3339(),
    "assetCount": assets.len(),
    "assets": assets.iter().map(|a| json!({
      "id": a.id,
      "mediaRef": a.media_ref,
      "filename": a.filename,
      "caption": a.caption,
      "kind": a.kind,
    })).collect::<Vec<_>>(),
    "note": "Use mediaRef with Media/Blob APIs or external URL to download. All-in-one access package.",
  }))
}

pub fn seed_demo(conn: &Connection) -> Result<()> {
  let n: i64 = conn
    .query_row("SELECT COUNT(*) FROM studio_collections", (), |r| r.get(0))
    .unwrap_or(0);
  if n > 0 {
    return Ok(());
  }
  let user_ok: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM users WHERE handle = 'demo_user'",
      (),
      |r| r.get(0),
    )
    .unwrap_or(0);
  if user_ok == 0 {
    return Ok(());
  }
  if let Ok(c) = create_collection(
    conn,
    "demo_user",
    "Campus Portraits 2026",
    "Senior + event photography samples. Book via Yard Sale or DM.",
    "portfolio:cover:portraits",
    "public",
  ) {
    let _ = add_collection_item(
      conn,
      c.id,
      "demo_user",
      "portfolio:shot:01-golden-hour",
      "Golden hour senior — TSU yard",
      "photo",
    );
    let _ = add_collection_item(
      conn,
      c.id,
      "demo_user",
      "portfolio:shot:02-homecoming",
      "Homecoming night reel still",
      "photo",
    );
    let _ = add_collection_item(
      conn,
      c.id,
      "demo_user",
      "portfolio:shot:03-studio",
      "Studio headshot package sample",
      "photo",
    );
  }
  if let Ok(s) = create_shoot(
    conn,
    "demo_user",
    "Senior Session · Jane",
    "Full delivery: selects + reel cuts. Free grant to client or paid unlock for others.",
    "jane_doe",
    "Jane D. · Class of 2027",
    "free",
    0,
    "",
  ) {
    let _ = add_shoot_asset(
      conn,
      s.id,
      "demo_user",
      "delivery:jane:select-01",
      "select_01.jpg",
      "Hero portrait",
      "photo",
    );
    let _ = add_shoot_asset(
      conn,
      s.id,
      "demo_user",
      "delivery:jane:select-02",
      "select_02.jpg",
      "Campus walk",
      "photo",
    );
    let _ = add_shoot_asset(
      conn,
      s.id,
      "demo_user",
      "delivery:jane:reel.mp4",
      "highlight_reel.mp4",
      "15s highlight",
      "video",
    );
    let _ = publish_shoot(conn, s.id, "demo_user");
  }
  if let Ok(s) = create_shoot(
    conn,
    "demo_user",
    "Org Event Coverage Pack",
    "All-in-one paid unlock for org media team — 25 WB full access.",
    "",
    "NSBE media team",
    "paid",
    25,
    "",
  ) {
    let _ = add_shoot_asset(
      conn,
      s.id,
      "demo_user",
      "delivery:nsbe:wide-01",
      "event_wide_01.jpg",
      "Keynote wide",
      "photo",
    );
    let _ = add_shoot_asset(
      conn,
      s.id,
      "demo_user",
      "delivery:nsbe:crowd.mp4",
      "crowd_cut.mp4",
      "Crowd b-roll",
      "video",
    );
    let _ = publish_shoot(conn, s.id, "demo_user");
  }
  Ok(())
}
