//! 2-party marketplace escrow for fashion / digital goods.
//! Flow: fund (buyer hold) → deliver (seller) → release (buyer confirm) | dispute | refund.
//! Org revenue split applies on release when listing is club-branded.

use crate::db::{calc_platform_fee, AppError, MARKETPLACE_PLATFORM_FEE_BPS};
use crate::sqlite::{params, Connection, OptionalExtension, Result};
use serde::Serialize;
use serde_json::json;

/// Item types that default to escrow (multi-campus fashion / digital goods path).
pub const ESCROW_DEFAULT_TYPES: &[&str] = &[
  "art",
  "mockup",
  "blueprint",
  "merch-digital",
  "fashion",
];

pub fn default_fulfillment_mode(item_type: &str) -> &'static str {
  if ESCROW_DEFAULT_TYPES.contains(&item_type) {
    "escrow"
  } else {
    "instant"
  }
}

pub fn is_valid_item_type(item_type: &str) -> bool {
  matches!(
    item_type,
    "media"
      | "mix"
      | "theme"
      | "logos-deck"
      | "service"
      | "ticket"
      | "art"
      | "mockup"
      | "blueprint"
      | "merch-digital"
      | "fashion"
  )
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EscrowTrade {
  pub id: i64,
  pub listing_id: i64,
  pub buyer_handle: String,
  pub seller_handle: String,
  pub amount: i64,
  pub platform_fee: i64,
  pub org_fee: i64,
  pub seller_net: i64,
  pub org_id: Option<String>,
  pub org_name: Option<String>,
  pub status: String,
  pub delivery_ref: Option<String>,
  pub delivery_note: Option<String>,
  pub receipt_json: Option<String>,
  pub listing_title: String,
  pub item_type: String,
  pub town_tag: String,
  pub created_at: String,
  pub updated_at: String,
}

pub fn ensure_schema(conn: &Connection) -> Result<()> {
  conn.execute_batch(
    "
    CREATE TABLE IF NOT EXISTS marketplace_escrow (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      buyer_handle TEXT NOT NULL,
      seller_handle TEXT NOT NULL,
      amount INTEGER NOT NULL,
      platform_fee INTEGER NOT NULL DEFAULT 0,
      org_fee INTEGER NOT NULL DEFAULT 0,
      seller_net INTEGER NOT NULL DEFAULT 0,
      org_id TEXT,
      status TEXT NOT NULL DEFAULT 'funded',
      delivery_ref TEXT,
      delivery_note TEXT,
      receipt_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(listing_id)
    );
    CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON marketplace_escrow(buyer_handle, status);
    CREATE INDEX IF NOT EXISTS idx_escrow_seller ON marketplace_escrow(seller_handle, status);
    ",
  )?;

  // Listing columns for org-branded + fulfillment mode
  let _ = conn.execute(
    "ALTER TABLE marketplace_listings ADD COLUMN fulfillment_mode TEXT DEFAULT 'instant'",
    (),
  );
  let _ = conn.execute(
    "ALTER TABLE marketplace_listings ADD COLUMN org_id TEXT",
    (),
  );
  let _ = conn.execute(
    "ALTER TABLE marketplace_listings ADD COLUMN org_split_bps INTEGER DEFAULT 0",
    (),
  );
  let _ = conn.execute(
    "ALTER TABLE marketplace_listings ADD COLUMN delivery_hint TEXT DEFAULT ''",
    (),
  );

  Ok(())
}

fn org_owner(conn: &Connection, org_id: &str) -> Result<Option<String>> {
  conn
    .query_row(
      "SELECT handle FROM connect_org_members
       WHERE org_id = ?1 AND role IN ('owner', 'lead')
       ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END
       LIMIT 1",
      params![org_id],
      |r| r.get::<_, String>(0),
    )
    .optional()
    .map_err(Into::into)
}

fn org_name(conn: &Connection, org_id: &str) -> Result<Option<String>> {
  conn
    .query_row(
      "SELECT name FROM connect_orgs WHERE id = ?1",
      params![org_id],
      |r| r.get::<_, String>(0),
    )
    .optional()
    .map_err(Into::into)
}

fn map_escrow_row(
  id: i64,
  listing_id: i64,
  buyer: String,
  seller: String,
  amount: i64,
  platform_fee: i64,
  org_fee: i64,
  seller_net: i64,
  org_id: Option<String>,
  org_name: Option<String>,
  status: String,
  delivery_ref: Option<String>,
  delivery_note: Option<String>,
  receipt_json: Option<String>,
  listing_title: String,
  item_type: String,
  town_tag: String,
  created_at: String,
  updated_at: String,
) -> EscrowTrade {
  EscrowTrade {
    id,
    listing_id,
    buyer_handle: buyer,
    seller_handle: seller,
    amount,
    platform_fee,
    org_fee,
    seller_net,
    org_id,
    org_name,
    status,
    delivery_ref,
    delivery_note,
    receipt_json,
    listing_title,
    item_type,
    town_tag,
    created_at,
    updated_at,
  }
}

/// Fund escrow: debit buyer, mark listing sold (held), create escrow row.
pub fn fund_escrow(conn: &Connection, listing_id: i64, buyer: &str) -> Result<serde_json::Value, AppError> {
  let listing = conn
    .query_row(
      "SELECT seller_handle, price, item_type, item_ref, is_nft, sold_to, nft_mint,
              COALESCE(fulfillment_mode, 'instant'), org_id, COALESCE(org_split_bps, 0),
              title, COALESCE(town_tag, 'tsu')
       FROM marketplace_listings WHERE id = ?1",
      params![listing_id],
      |r| {
        Ok((
          r.get::<_, String>(0)?,
          r.get::<_, i64>(1)?,
          r.get::<_, String>(2)?,
          r.get::<_, Option<String>>(3)?,
          r.get::<_, i64>(4)? == 1,
          r.get::<_, Option<String>>(5)?,
          r.get::<_, Option<String>>(6)?,
          r.get::<_, String>(7)?,
          r.get::<_, Option<String>>(8)?,
          r.get::<_, i64>(9)?,
          r.get::<_, String>(10)?,
          r.get::<_, String>(11)?,
        ))
      },
    )
    .optional()
    .map_err(AppError::from)?;

  let Some((
    seller,
    price,
    item_type,
    item_ref,
    is_nft,
    sold_to,
    _nft_mint,
    fulfillment_mode,
    org_id,
    org_split_bps,
    title,
    town_tag,
  )) = listing
  else {
    return Err(AppError::Validation("Listing not found".into()));
  };

  if sold_to.is_some() {
    return Err(AppError::Validation("Listing already sold".into()));
  }
  if seller == buyer {
    return Err(AppError::Validation("Cannot buy your own listing".into()));
  }
  if fulfillment_mode != "escrow" {
    return Err(AppError::Validation(
      "Listing is instant-fulfillment; use standard buy".into(),
    ));
  }
  if price <= 0 {
    return Err(AppError::Validation("Invalid price".into()));
  }

  let platform_fee = calc_platform_fee(price, MARKETPLACE_PLATFORM_FEE_BPS);
  let after_platform = price - platform_fee;
  let org_fee = if org_id.is_some() && org_split_bps > 0 {
    calc_platform_fee(after_platform, org_split_bps.min(5000))
  } else {
    0
  };
  let seller_net = after_platform - org_fee;
  if seller_net <= 0 {
    return Err(AppError::Validation(
      "Amount too small after fees/split".into(),
    ));
  }

  // Validate org if set
  if let Some(ref oid) = org_id {
    let exists: i64 = conn
      .query_row(
        "SELECT COUNT(*) FROM connect_orgs WHERE id = ?1",
        params![oid],
        |r| r.get(0),
      )
      .map_err(AppError::from)?;
    if exists == 0 {
      return Err(AppError::Validation("Org not found for listing".into()));
    }
  }

  let tx = conn.unchecked_transaction().map_err(AppError::from)?;

  let buyer_balance: i64 = tx
    .query_row(
      "SELECT weix_bucks FROM users WHERE handle = ?1",
      params![buyer],
      |r| r.get(0),
    )
    .map_err(AppError::from)?;
  if buyer_balance < price {
    return Err(AppError::Validation("Insufficient WeixBucks".into()));
  }

  tx.execute(
    "UPDATE users SET weix_bucks = weix_bucks - ?1 WHERE handle = ?2",
    params![price, buyer],
  )
  .map_err(AppError::from)?;

  tx.execute(
    "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
     SELECT ?1, 'spend', -?2, ?3, weix_bucks FROM users WHERE handle = ?1",
    params![
      buyer,
      price,
      format!("Escrow hold · listing #{listing_id} · {title}")
    ],
  )
  .map_err(AppError::from)?;

  let updated = tx
    .execute(
      "UPDATE marketplace_listings SET sold_to = ?1 WHERE id = ?2 AND sold_to IS NULL",
      params![buyer, listing_id],
    )
    .map_err(AppError::from)?;
  if updated == 0 {
    return Err(AppError::Validation("Listing already sold".into()));
  }

  tx.execute(
    "INSERT INTO marketplace_escrow
      (listing_id, buyer_handle, seller_handle, amount, platform_fee, org_fee, seller_net, org_id, status)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'funded')",
    params![
      listing_id,
      buyer,
      seller,
      price,
      platform_fee,
      org_fee,
      seller_net,
      org_id
    ],
  )
  .map_err(AppError::from)?;

  let escrow_id = tx.last_insert_rowid();
  tx.commit().map_err(AppError::from)?;

  let o_name = org_id
    .as_deref()
    .and_then(|id| org_name(conn, id).ok().flatten());

  Ok(json!({
    "escrowId": escrow_id,
    "listingId": listing_id,
    "status": "funded",
    "buyer": buyer,
    "seller": seller,
    "amount": price,
    "platformFee": platform_fee,
    "orgFee": org_fee,
    "sellerNet": seller_net,
    "orgId": org_id,
    "orgName": o_name,
    "itemType": item_type,
    "itemRef": item_ref,
    "isNft": is_nft,
    "title": title,
    "townTag": town_tag,
    "fulfillmentMode": "escrow",
    "nextStep": "Seller marks delivered with delivery ref (CID / file / shipping note)",
  }))
}

pub fn mark_delivered(
  conn: &Connection,
  escrow_id: i64,
  seller: &str,
  delivery_ref: &str,
  delivery_note: Option<&str>,
) -> Result<serde_json::Value, AppError> {
  let row = conn
    .query_row(
      "SELECT status, seller_handle FROM marketplace_escrow WHERE id = ?1",
      params![escrow_id],
      |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
    )
    .optional()
    .map_err(AppError::from)?;

  let Some((status, owner)) = row else {
    return Err(AppError::Validation("Escrow not found".into()));
  };
  if owner != seller {
    return Err(AppError::Validation("Only seller can mark delivered".into()));
  }
  if status != "funded" && status != "disputed" {
    return Err(AppError::Validation(format!(
      "Cannot deliver from status '{status}'"
    )));
  }
  let dref = delivery_ref.trim();
  if dref.is_empty() {
    return Err(AppError::Validation(
      "Delivery ref required (CID, link, or tracking note)".into(),
    ));
  }

  conn
    .execute(
      "UPDATE marketplace_escrow
       SET status = 'delivered', delivery_ref = ?1, delivery_note = ?2,
           updated_at = datetime('now')
       WHERE id = ?3",
      params![dref, delivery_note.unwrap_or(""), escrow_id],
    )
    .map_err(AppError::from)?;

  Ok(json!({
    "escrowId": escrow_id,
    "status": "delivered",
    "deliveryRef": dref,
    "deliveryNote": delivery_note.unwrap_or(""),
    "nextStep": "Buyer confirms receipt to release WeixBucks",
  }))
}

/// Buyer confirms → pay seller + org treasury; platform fee stays burned (never credited).
pub fn confirm_release(
  conn: &Connection,
  escrow_id: i64,
  buyer: &str,
) -> Result<serde_json::Value, AppError> {
  let row = conn
    .query_row(
      "SELECT e.status, e.buyer_handle, e.seller_handle, e.amount, e.platform_fee,
              e.org_fee, e.seller_net, e.org_id, e.delivery_ref, e.listing_id,
              l.title, l.item_type, COALESCE(l.town_tag, 'tsu')
       FROM marketplace_escrow e
       JOIN marketplace_listings l ON l.id = e.listing_id
       WHERE e.id = ?1",
      params![escrow_id],
      |r| {
        Ok((
          r.get::<_, String>(0)?,
          r.get::<_, String>(1)?,
          r.get::<_, String>(2)?,
          r.get::<_, i64>(3)?,
          r.get::<_, i64>(4)?,
          r.get::<_, i64>(5)?,
          r.get::<_, i64>(6)?,
          r.get::<_, Option<String>>(7)?,
          r.get::<_, Option<String>>(8)?,
          r.get::<_, i64>(9)?,
          r.get::<_, String>(10)?,
          r.get::<_, String>(11)?,
          r.get::<_, String>(12)?,
        ))
      },
    )
    .optional()
    .map_err(AppError::from)?;

  let Some((
    status,
    buyer_h,
    seller,
    amount,
    platform_fee,
    org_fee,
    seller_net,
    org_id,
    delivery_ref,
    listing_id,
    title,
    item_type,
    town_tag,
  )) = row
  else {
    return Err(AppError::Validation("Escrow not found".into()));
  };

  if buyer_h != buyer {
    return Err(AppError::Validation("Only buyer can confirm release".into()));
  }
  if status != "delivered" && status != "funded" {
    // Allow release from funded for digital goods when buyer is ready (demo flexibility)
    return Err(AppError::Validation(format!(
      "Cannot release from status '{status}'"
    )));
  }

  let treasury = org_id
    .as_deref()
    .and_then(|id| org_owner(conn, id).ok().flatten());

  let tx = conn.unchecked_transaction().map_err(AppError::from)?;

  tx.execute(
    "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
    params![seller_net, seller],
  )
  .map_err(AppError::from)?;
  tx.execute(
    "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
     SELECT ?1, 'earn', ?2, ?3, weix_bucks FROM users WHERE handle = ?1",
    params![
      seller,
      seller_net,
      format!("Escrow release · sale #{listing_id} · {title}")
    ],
  )
  .map_err(AppError::from)?;

  if org_fee > 0 {
    if let Some(ref th) = treasury {
      tx.execute(
        "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
        params![org_fee, th],
      )
      .map_err(AppError::from)?;
      tx.execute(
        "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
         SELECT ?1, 'earn', ?2, ?3, weix_bucks FROM users WHERE handle = ?1",
        params![
          th,
          org_fee,
          format!(
            "Org split · club listing #{listing_id} · {}",
            org_id.as_deref().unwrap_or("org")
          )
        ],
      )
      .map_err(AppError::from)?;
    }
  }

  let receipt = json!({
    "type": "blkspace_escrow_receipt_v1",
    "escrowId": escrow_id,
    "listingId": listing_id,
    "title": title,
    "itemType": item_type,
    "townTag": town_tag,
    "buyer": buyer,
    "seller": seller,
    "amountWb": amount,
    "platformFeeWb": platform_fee,
    "orgFeeWb": org_fee,
    "sellerNetWb": seller_net,
    "orgId": org_id,
    "orgTreasury": treasury,
    "deliveryRef": delivery_ref,
    "releasedAt": chrono::Utc::now().to_rfc3339(),
  });
  let receipt_str = receipt.to_string();

  tx.execute(
    "UPDATE marketplace_escrow
     SET status = 'released', receipt_json = ?1, updated_at = datetime('now')
     WHERE id = ?2 AND status IN ('delivered', 'funded')",
    params![receipt_str, escrow_id],
  )
  .map_err(AppError::from)?;

  tx.commit().map_err(AppError::from)?;

  Ok(json!({
    "escrowId": escrow_id,
    "status": "released",
    "sellerNet": seller_net,
    "orgFee": org_fee,
    "platformFee": platform_fee,
    "orgTreasury": treasury,
    "receipt": receipt,
    "applied": {},
  }))
}

pub fn open_dispute(
  conn: &Connection,
  escrow_id: i64,
  actor: &str,
  reason: Option<&str>,
) -> Result<serde_json::Value, AppError> {
  let row = conn
    .query_row(
      "SELECT status, buyer_handle, seller_handle FROM marketplace_escrow WHERE id = ?1",
      params![escrow_id],
      |r| {
        Ok((
          r.get::<_, String>(0)?,
          r.get::<_, String>(1)?,
          r.get::<_, String>(2)?,
        ))
      },
    )
    .optional()
    .map_err(AppError::from)?;

  let Some((status, buyer, seller)) = row else {
    return Err(AppError::Validation("Escrow not found".into()));
  };
  if actor != buyer && actor != seller {
    return Err(AppError::Validation("Not a party to this escrow".into()));
  }
  if status != "funded" && status != "delivered" {
    return Err(AppError::Validation(format!(
      "Cannot dispute from status '{status}'"
    )));
  }

  let note = reason.unwrap_or("Dispute opened").trim();
  conn
    .execute(
      "UPDATE marketplace_escrow
       SET status = 'disputed',
           delivery_note = CASE
             WHEN delivery_note IS NULL OR delivery_note = '' THEN ?1
             ELSE delivery_note || ' | dispute: ' || ?1
           END,
           updated_at = datetime('now')
       WHERE id = ?2",
      params![note, escrow_id],
    )
    .map_err(AppError::from)?;

  Ok(json!({
    "escrowId": escrow_id,
    "status": "disputed",
    "openedBy": actor,
    "reason": note,
    "nextStep": "Seller may re-deliver, or parties refund; promo mediation is off-chain",
  }))
}

/// Refund held funds to buyer (seller, buyer after dispute, or demo admin path).
pub fn refund_escrow(
  conn: &Connection,
  escrow_id: i64,
  actor: &str,
) -> Result<serde_json::Value, AppError> {
  let row = conn
    .query_row(
      "SELECT status, buyer_handle, seller_handle, amount, listing_id
       FROM marketplace_escrow WHERE id = ?1",
      params![escrow_id],
      |r| {
        Ok((
          r.get::<_, String>(0)?,
          r.get::<_, String>(1)?,
          r.get::<_, String>(2)?,
          r.get::<_, i64>(3)?,
          r.get::<_, i64>(4)?,
        ))
      },
    )
    .optional()
    .map_err(AppError::from)?;

  let Some((status, buyer, seller, amount, listing_id)) = row else {
    return Err(AppError::Validation("Escrow not found".into()));
  };
  if actor != buyer && actor != seller {
    return Err(AppError::Validation("Not a party to this escrow".into()));
  }
  if status == "released" || status == "refunded" {
    return Err(AppError::Validation(format!(
      "Cannot refund from status '{status}'"
    )));
  }

  let tx = conn.unchecked_transaction().map_err(AppError::from)?;

  tx.execute(
    "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
    params![amount, buyer],
  )
  .map_err(AppError::from)?;
  tx.execute(
    "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
     SELECT ?1, 'earn', ?2, ?3, weix_bucks FROM users WHERE handle = ?1",
    params![
      buyer,
      amount,
      format!("Escrow refund · listing #{listing_id}")
    ],
  )
  .map_err(AppError::from)?;

  // Re-open listing for resale
  tx.execute(
    "UPDATE marketplace_listings SET sold_to = NULL WHERE id = ?1",
    params![listing_id],
  )
  .map_err(AppError::from)?;

  tx.execute(
    "UPDATE marketplace_escrow
     SET status = 'refunded', updated_at = datetime('now')
     WHERE id = ?1",
    params![escrow_id],
  )
  .map_err(AppError::from)?;

  tx.commit().map_err(AppError::from)?;

  Ok(json!({
    "escrowId": escrow_id,
    "status": "refunded",
    "refundedTo": buyer,
    "amount": amount,
    "listingId": listing_id,
    "listingReopened": true,
  }))
}

pub fn list_for_user(conn: &Connection, handle: &str) -> Result<Vec<EscrowTrade>> {
  let mut stmt = conn.prepare(
    "SELECT e.id, e.listing_id, e.buyer_handle, e.seller_handle, e.amount, e.platform_fee,
            e.org_fee, e.seller_net, e.org_id, o.name, e.status, e.delivery_ref, e.delivery_note,
            e.receipt_json, l.title, l.item_type, COALESCE(l.town_tag, 'tsu'),
            e.created_at, e.updated_at
     FROM marketplace_escrow e
     JOIN marketplace_listings l ON l.id = e.listing_id
     LEFT JOIN connect_orgs o ON o.id = e.org_id
     WHERE e.buyer_handle = ?1 OR e.seller_handle = ?1
     ORDER BY datetime(e.updated_at) DESC",
  )?;
  let rows = stmt.query_map(params![handle], |r| {
    Ok(map_escrow_row(
      r.get(0)?,
      r.get(1)?,
      r.get(2)?,
      r.get(3)?,
      r.get(4)?,
      r.get(5)?,
      r.get(6)?,
      r.get(7)?,
      r.get(8)?,
      r.get(9)?,
      r.get(10)?,
      r.get(11)?,
      r.get(12)?,
      r.get(13)?,
      r.get(14)?,
      r.get(15)?,
      r.get(16)?,
      r.get(17)?,
      r.get(18)?,
    ))
  })?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row?);
  }
  Ok(out)
}

pub fn get_escrow(conn: &Connection, escrow_id: i64) -> Result<Option<EscrowTrade>> {
  conn
    .query_row(
      "SELECT e.id, e.listing_id, e.buyer_handle, e.seller_handle, e.amount, e.platform_fee,
              e.org_fee, e.seller_net, e.org_id, o.name, e.status, e.delivery_ref, e.delivery_note,
              e.receipt_json, l.title, l.item_type, COALESCE(l.town_tag, 'tsu'),
              e.created_at, e.updated_at
       FROM marketplace_escrow e
       JOIN marketplace_listings l ON l.id = e.listing_id
       LEFT JOIN connect_orgs o ON o.id = e.org_id
       WHERE e.id = ?1",
      params![escrow_id],
      |r| {
        Ok(map_escrow_row(
          r.get(0)?,
          r.get(1)?,
          r.get(2)?,
          r.get(3)?,
          r.get(4)?,
          r.get(5)?,
          r.get(6)?,
          r.get(7)?,
          r.get(8)?,
          r.get(9)?,
          r.get(10)?,
          r.get(11)?,
          r.get(12)?,
          r.get(13)?,
          r.get(14)?,
          r.get(15)?,
          r.get(16)?,
          r.get(17)?,
          r.get(18)?,
        ))
      },
    )
    .optional()
    .map_err(Into::into)
}

/// Seed multi-campus fashion club + sample escrow listings (idempotent).
pub fn seed_fashion_demo(conn: &Connection) -> Result<()> {
  // Fashion club orgs across campuses
  let n: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM connect_orgs WHERE id = 'org_fashion_tsu'",
      (),
      |r| r.get(0),
    )
    .unwrap_or(0);
  if n == 0 {
    conn.execute_batch(
      r#"
      INSERT OR IGNORE INTO connect_orgs (id, slug, name, org_type, yard_id, description, created_by) VALUES
        ('org_fashion_tsu', 'fashion-collective-tsu', 'TSU Fashion Collective', 'club', 'tsu',
         'Private for-profit design club. Sell mockups, blueprints, and merch digital drops. Club takes a small split for runway nights.',
         'campus_king'),
        ('org_fashion_howard', 'fashion-howard', 'Howard Style Lab', 'club', 'howard',
         'Cross-campus fashion majors. Authenticated P2P trades with escrow — art, tech packs, digital merch.',
         'hbcustudent'),
        ('org_fashion_spelman', 'fashion-spelman', 'Spelman Atelier', 'club', 'spelman',
         'Atelier + collab drops. Club-branded listings with revenue split for gallery events.',
         'jane_doe');

      INSERT OR IGNORE INTO connect_org_members (org_id, handle, role) VALUES
        ('org_fashion_tsu', 'campus_king', 'owner'),
        ('org_fashion_tsu', 'demo_user', 'member'),
        ('org_fashion_howard', 'hbcustudent', 'owner'),
        ('org_fashion_howard', 'demo_user', 'member'),
        ('org_fashion_spelman', 'jane_doe', 'owner'),
        ('org_fashion_spelman', 'demo_user', 'member');

      INSERT INTO connect_opportunities (org_id, title, description, duration_text, tags_json, status, created_by) VALUES
        ('org_fashion_tsu', 'Homecoming Lookbook Collab',
         'Design one digital look for TSU homecoming lookbook. Escrow-protected delivery of mockups + tech pack.',
         '3 weeks', '["fashion","design","collab"]', 'open', 'campus_king'),
        ('org_fashion_howard', 'Multi-Campus Drop Night',
         'Coordinate a synchronized digital merch drop across TSU / Howard / Spelman. Auth via BlkSpace identity + escrow settlement.',
         '1 month', '["fashion","merch","multi-campus"]', 'open', 'hbcustudent');
      "#,
    )?;
  }

  // Sample fashion listings (only if none of these item types exist yet)
  let fashion_n: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM marketplace_listings WHERE item_type IN ('art','mockup','blueprint','merch-digital','fashion')",
      (),
      |r| r.get(0),
    )
    .unwrap_or(0);
  if fashion_n == 0 {
    let _ = conn.execute(
      "INSERT INTO marketplace_listings
        (seller_handle, item_type, item_ref, price, title, description, is_nft, town_tag,
         fulfillment_mode, org_id, org_split_bps, delivery_hint)
       VALUES
        ('campus_king', 'mockup', 'fashion:mockup:homecoming-tee', 45,
         'Homecoming Tee Mockup (front/back)',
         'Print-ready mockup pack for TSU homecoming. Escrow: deliver PSD/PNG via CID after pay.',
         0, 'tsu', 'escrow', 'org_fashion_tsu', 1000, 'CID or Google Drive link to PSD'),
        ('campus_king', 'blueprint', 'fashion:techpack:hoodie-v1', 80,
         'Street Hoodie Tech Pack v1',
         'Full tech pack: measurements, BOM, stitch notes. Club-branded · 10% to Fashion Collective.',
         0, 'tsu', 'escrow', 'org_fashion_tsu', 1000, 'PDF tech pack CID'),
        ('hbcustudent', 'art', 'fashion:art:lookbook-01', 35,
         'Lookbook Illustration — Night Market',
         'Original digital art for collab lookbooks. Instant list, escrow delivery.',
         0, 'howard', 'escrow', 'org_fashion_howard', 800, 'PNG/SVG CID'),
        ('hbcustudent', 'merch-digital', 'fashion:merch:sticker-pack', 15,
         'Yard Sticker Pack (digital)',
         '6 PNG stickers for campus brands. Fast escrow digital drop.',
         0, 'howard', 'escrow', 'org_fashion_howard', 500, 'ZIP of PNGs'),
        ('jane_doe', 'fashion', 'fashion:drop:atelier-ss', 60,
         'Atelier SS Capsule Concept',
         'Capsule concept board + fabric notes. Spelman Atelier branded · 12% club split.',
         0, 'spelman', 'escrow', 'org_fashion_spelman', 1200, 'Concept board CID');
      ",
      (),
    );
  }

  Ok(())
}
