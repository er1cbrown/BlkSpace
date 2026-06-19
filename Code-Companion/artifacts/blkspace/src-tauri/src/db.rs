use rusqlite::{Connection, Result, params, Error as SqlError};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug)]
#[allow(dead_code)]
pub enum AppError {
  Validation(String),
  Database(()),
}

impl std::fmt::Display for AppError {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      AppError::Validation(msg) => write!(f, "{}", msg),
      AppError::Database(_) => write!(f, "A database error occurred"),
    }
  }
}

impl From<SqlError> for AppError {
  fn from(e: SqlError) -> Self {
    match e {
      SqlError::SqliteFailure(e, _) if e.code == rusqlite::ffi::ErrorCode::ConstraintViolation => {
        AppError::Validation("That handle is already taken".into())
      }
      _ => AppError::Database(()),
    }
  }
}

pub fn validate_handle(handle: &str) -> Result<(), AppError> {
  if handle.is_empty() || handle.len() > 30 {
    return Err(AppError::Validation("Handle must be 1-30 characters".into()));
  }
  if !handle.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
    return Err(AppError::Validation("Handle can only contain letters, numbers, underscores, and hyphens".into()));
  }
  Ok(())
}

pub fn validate_display_name(name: &str) -> Result<(), AppError> {
  if name.is_empty() || name.len() > 50 {
    return Err(AppError::Validation("Display name must be 1-50 characters".into()));
  }
  Ok(())
}

pub fn validate_content(content: &str) -> Result<(), AppError> {
  if content.is_empty() || content.len() > 5000 {
    return Err(AppError::Validation("Content must be 1-5000 characters".into()));
  }
  Ok(())
}

pub fn validate_bio(bio: &str) -> Result<(), AppError> {
  if bio.len() > 500 {
    return Err(AppError::Validation("Bio must be under 500 characters".into()));
  }
  Ok(())
}

pub fn validate_town(town: &str) -> Result<(), AppError> {
  if town.len() > 30 {
    return Err(AppError::Validation("Town tag must be under 30 characters".into()));
  }
  Ok(())
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct User {
  pub id: i64,
  pub handle: String,
  pub display_name: String,
  pub bio: String,
  pub avatar_url: String,
  pub university: String,
  pub town: String,
  pub followers_count: i64,
  pub following_count: i64,
  pub weix_bucks: i64,
  pub pubkey: String,
  pub engagement_quality: f64,
  pub theme_id: i64,
  pub music_hash: String,
  pub node_role: String,
  pub created_at: String,
  pub post_karma: i64,
  pub comment_karma: i64,
  pub pro_profile_json: String,
  pub profile_layout_json: String,
  pub top_friends_json: String,
}

const USER_SELECT: &str = "SELECT id, handle, display_name, bio, avatar_url, university, town,
              followers_count, following_count, weix_bucks, pubkey,
              engagement_quality, theme_id, music_hash, node_role, created_at,
              COALESCE(post_karma, 0), COALESCE(comment_karma, 0),
              COALESCE(pro_profile_json, '{}'), COALESCE(profile_layout_json, '{}'),
              COALESCE(top_friends_json, '[]')
       FROM users";

fn map_user_row(row: &rusqlite::Row<'_>) -> Result<User> {
  Ok(User {
    id: row.get(0)?,
    handle: row.get(1)?,
    display_name: row.get(2)?,
    bio: row.get(3)?,
    avatar_url: row.get(4)?,
    university: row.get(5)?,
    town: row.get(6)?,
    followers_count: row.get(7)?,
    following_count: row.get(8)?,
    weix_bucks: row.get(9)?,
    pubkey: row.get(10)?,
    engagement_quality: row.get(11)?,
    theme_id: row.get(12)?,
    music_hash: row.get(13)?,
    node_role: row.get(14)?,
    created_at: row.get(15)?,
    post_karma: row.get(16)?,
    comment_karma: row.get(17)?,
    pro_profile_json: row.get(18)?,
    profile_layout_json: row.get(19)?,
    top_friends_json: row.get(20)?,
  })
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KarmaLeaderboardEntry {
  pub handle: String,
  pub display_name: String,
  pub post_karma: i64,
  pub comment_karma: i64,
  pub town: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WallPost {
  pub id: i64,
  pub wall_owner_handle: String,
  pub author_handle: String,
  pub author_display_name: String,
  pub content: String,
  pub approved: bool,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EarnSummary {
  pub total_wb: i64,
  pub post_karma: i64,
  pub comment_karma: i64,
  pub yards_joined: i64,
  pub uploads_count: i64,
}

/// Actual WB/karma granted by a single action (for honest client toasts).
#[derive(Debug, Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct EarnResult {
  pub wb: i64,
  /// WB attempted before daily cap clipping (for cap-aware UI toasts).
  pub wb_nominal: i64,
  pub karma_post: i64,
  pub karma_comment: i64,
  pub throttled: bool,
  pub daily_cap_limited: bool,
}

impl EarnResult {
  pub fn build(
    wb_nominal: i64,
    wb_actual: i64,
    karma_post_nominal: i64,
    karma_comment_nominal: i64,
    throttled: bool,
  ) -> Self {
    Self {
      wb: wb_actual,
      wb_nominal,
      karma_post: if throttled { 0 } else { karma_post_nominal },
      karma_comment: if throttled { 0 } else { karma_comment_nominal },
      throttled,
      daily_cap_limited: !throttled && wb_nominal > 0 && wb_actual < wb_nominal,
    }
  }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreatePostResult {
  pub post: Post,
  pub earn: EarnResult,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateReplyResult {
  pub reply: Reply,
  pub earn: EarnResult,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ToggleLikeResult {
  pub liked: bool,
  pub author_handle: Option<String>,
  pub author_earn: EarnResult,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JoinYardResult {
  pub joined: bool,
  pub earn: EarnResult,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct YardEvent {
  pub id: i64,
  pub community_id: String,
  pub title: String,
  pub description: String,
  pub location: String,
  pub starts_at: String,
  pub ends_at: Option<String>,
  pub created_by: String,
  pub created_by_display_name: String,
  pub rsvp_count: i64,
  pub user_rsvp: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CommunityRoleEntry {
  pub handle: String,
  pub role: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RsvpYardEventResult {
  pub rsvped: bool,
  pub status: String,
  pub earn: EarnResult,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WallPostResult {
  pub wall_post: WallPost,
  pub earn: EarnResult,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApproveWallPostResult {
  pub approved: bool,
  pub earn: EarnResult,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UploadBlobResult {
  pub hash: String,
  pub cid: Option<String>,
  pub filename: String,
  pub mime_type: String,
  pub file_size: i64,
  pub uploader_handle: String,
  pub created_at: String,
  pub earn: EarnResult,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BlobRecord {
  pub id: i64,
  pub hash: String,
  pub cid: Option<String>,
  pub filename: String,
  pub mime_type: String,
  pub file_size: i64,
  pub uploader_handle: String,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Post {
  pub id: i64,
  pub author_handle: String,
  pub author_display_name: String,
  pub author_avatar_url: String,
  pub content: String,
  pub town_tag: String,
  pub channel_id: String,
  pub replies_count: i64,
  pub reposts_count: i64,
  pub likes_count: i64,
  pub liked: bool,
  pub media_blobs: Vec<String>,
  pub nostr_event_id: String,
  pub relay_url: String,
  pub created_at: String,
  /// Author engagement quality (0–1.5); used by FYP ranking.
  pub engagement_quality: f64,
  /// Cached MIDF overall score (0–1); higher = more suspicious.
  pub malicious_score: f64,
  /// `low` | `medium` | `high` from MIDF thresholds.
  pub risk_level: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Reply {
  pub id: i64,
  pub post_id: i64,
  pub author_handle: String,
  pub author_display_name: String,
  pub author_avatar_url: String,
  pub content: String,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
  pub id: i64,
  pub user_handle: String,
  pub notification_type: String,
  pub from_handle: String,
  pub from_display_name: String,
  pub message: String,
  pub unread: bool,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WalletTx {
  pub id: i64,
  pub user_handle: String,
  pub tx_type: String,
  pub amount: i64,
  pub description: String,
  pub balance_after: i64,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Community {
  pub id: String,
  pub name: String,
  pub school: String,
  pub location: String,
  pub description: String,
  pub members: i64,
  pub color: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Channel {
  pub id: String,
  pub community_id: String,
  pub name: String,
  pub description: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Relay {
  pub id: i64,
  pub name: String,
  pub university: String,
  pub town: String,
  pub status: String,
  pub uptime_percent: f64,
  pub connected_peers: i64,
  pub events_per_hour: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RelayConnectionRecord {
  pub id: i64,
  pub url: String,
  pub name: String,
  pub town: String,
  pub status: String,
  pub connected_at: Option<String>,
  pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RelayEventRecord {
  pub id: i64,
  pub event_id: String,
  pub relay_url: String,
  pub kind: i64,
  pub pubkey: String,
  pub content: String,
  pub tags: String,
  pub created_at_unix: i64,
  pub first_seen: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CrossTownEvent {
  pub id: String,
  pub event_id: String,
  pub pubkey: String,
  pub content: String,
  pub town_tag: String,
  pub relay_url: String,
  pub created_at: String,
  pub created_at_unix: i64,
  /// True when ≥2 relays agree on content hash (cache-poisoning defense).
  pub consensus_valid: bool,
  /// Agreement percent across relays that saw this event.
  pub consensus_agreement: f64,
  /// MIDF overall score for known pubkey (0 if unknown).
  pub malicious_score: f64,
  /// `low` | `medium` | `high` from MIDF thresholds.
  pub risk_level: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RepostResult {
  pub reposted: bool,
  pub reposts_count: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RepostFeedItem {
  pub reposter_handle: String,
  pub reposter_display_name: String,
  pub reposted_at: String,
  pub post: Post,
}

/// Max WeixBucks earn per user per rolling 24h (see reward-formulas.md).
pub const DAILY_WB_EARN_CAP: i64 = 250;

/// Draft withdrawal rules — subject to legal counsel before mainnet (reward-formulas.md).
pub const MIN_WITHDRAW_WB: i64 = 100;
pub const MIN_ACCOUNT_AGE_DAYS: i64 = 7;
pub const MIN_WITHDRAW_KARMA: i64 = 10;
pub const MIN_WITHDRAW_POSTS: i64 = 3;
pub const WEEKLY_WITHDRAW_CAP_WB: i64 = 1000;
pub const WITHDRAW_COOLDOWN_DAYS: i64 = 7;
pub const WB_TO_BLK_RATIO: i64 = 1000;
const WITHDRAW_TX_PREFIX: &str = "Withdrawn to Solana";

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WithdrawEligibility {
  pub eligible: bool,
  pub reasons: Vec<String>,
  pub min_amount_wb: i64,
  pub weekly_cap_wb: i64,
  pub weekly_withdrawn_wb: i64,
  pub weekly_remaining_wb: i64,
  pub cooldown_days: i64,
  pub days_until_next_withdraw: i64,
  pub account_age_days: i64,
  pub min_account_age_days: i64,
  pub total_karma: i64,
  pub min_karma: i64,
  pub post_count: i64,
  pub min_posts: i64,
  pub balance_wb: i64,
  pub wb_to_blk_ratio: i64,
  /// Devnet/simulated only until counsel approves mainnet.
  pub on_chain_ready: bool,
}

fn parse_db_timestamp(s: &str) -> Option<chrono::DateTime<chrono::Utc>> {
  chrono::DateTime::parse_from_rfc3339(s)
    .ok()
    .map(|dt| dt.with_timezone(&chrono::Utc))
    .or_else(|| {
      chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
        .ok()
        .map(|ndt| ndt.and_utc())
    })
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NetworkStats {
  pub online_relays: i64,
  pub total_relays: i64,
  pub total_users: i64,
  pub active_towns: i64,
  pub weix_bucks_in_circulation: i64,
  pub events_last_24h: i64,
}

pub struct Database {
  pub conn: Mutex<Connection>,
}

impl Database {
  pub fn new(app_dir: PathBuf) -> Result<Self> {
    Self::open(app_dir, true)
  }

  /// Test-only constructor: fresh schema without demo seed data.
  #[cfg(test)]
  pub fn new_for_test(app_dir: PathBuf) -> Result<Self> {
    Self::open(app_dir, false)
  }

  fn open(app_dir: PathBuf, seed: bool) -> Result<Self> {
    std::fs::create_dir_all(&app_dir).ok();
    let db_path = app_dir.join("blkspace.db");
    let conn = Connection::open(db_path)?;
    let db = Database { conn: Mutex::new(conn) };
    db.initialize()?;
    if seed {
      db.seed()?;
      db.backfill_demo_pubkeys()?;
    }
    Ok(db)
  }

  fn initialize(&self) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute_batch(
      "
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        handle TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        bio TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        university TEXT DEFAULT '',
        town TEXT DEFAULT 'tsu',
        followers_count INTEGER DEFAULT 0,
        following_count INTEGER DEFAULT 0,
        weix_bucks INTEGER DEFAULT 100,
        pubkey TEXT DEFAULT '',
        engagement_quality REAL DEFAULT 1.0,
        last_action_unix INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author_handle TEXT NOT NULL,
        content TEXT NOT NULL,
        town_tag TEXT DEFAULT 'tsu',
        channel_id TEXT DEFAULT '',
        replies_count INTEGER DEFAULT 0,
        reposts_count INTEGER DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (author_handle) REFERENCES users(handle)
      );

      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS community_roles (
        community_id TEXT NOT NULL,
        handle TEXT NOT NULL,
        role TEXT DEFAULT 'Student',
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (community_id, handle)
      );

      CREATE TABLE IF NOT EXISTS marketplace_listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_handle TEXT NOT NULL,
        item_type TEXT NOT NULL,
        item_ref TEXT,
        price INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        is_nft BOOLEAN DEFAULT 0,
        sold_to TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        author_handle TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (author_handle) REFERENCES users(handle)
      );

      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_handle TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(post_id, user_handle),
        FOREIGN KEY (post_id) REFERENCES posts(id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_handle TEXT NOT NULL,
        notification_type TEXT NOT NULL,
        from_handle TEXT NOT NULL,
        message TEXT NOT NULL,
        unread INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_handle) REFERENCES users(handle)
      );

      CREATE TABLE IF NOT EXISTS wallet_tx (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_handle TEXT NOT NULL,
        tx_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT DEFAULT '',
        balance_after INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_handle) REFERENCES users(handle)
      );

      CREATE TABLE IF NOT EXISTS follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_handle TEXT NOT NULL,
        followed_handle TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(follower_handle, followed_handle)
      );

      CREATE TABLE IF NOT EXISTS blobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT UNIQUE NOT NULL,
        cid TEXT,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        uploader_handle TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (uploader_handle) REFERENCES users(handle)
      );

      CREATE TABLE IF NOT EXISTS relay_connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        name TEXT DEFAULT '',
        town TEXT DEFAULT '',
        status TEXT DEFAULT 'disconnected',
        connected_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS relay_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT UNIQUE NOT NULL,
        relay_url TEXT NOT NULL,
        kind INTEGER NOT NULL,
        pubkey TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT DEFAULT '[]',
        created_at_unix INTEGER NOT NULL,
        first_seen TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_relay_events_kind ON relay_events(kind);
      CREATE INDEX IF NOT EXISTS idx_relay_events_pubkey ON relay_events(pubkey);
      CREATE INDEX IF NOT EXISTS idx_relay_events_relay ON relay_events(relay_url);

      CREATE TABLE IF NOT EXISTS nostr_signed_events (
        event_id TEXT PRIMARY KEY,
        event_json TEXT NOT NULL,
        stored_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS blob_pins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        pinned_by TEXT NOT NULL,
        access_count INTEGER DEFAULT 0,
        last_accessed TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(hash, pinned_by)
      );

      CREATE INDEX IF NOT EXISTS idx_blob_pins_hash ON blob_pins(hash);
      CREATE INDEX IF NOT EXISTS idx_blob_pins_pinned_by ON blob_pins(pinned_by);

      CREATE TABLE IF NOT EXISTS pin_serves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        served_by TEXT NOT NULL,
        served_to TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_pin_serves_hash ON pin_serves(hash);
      CREATE INDEX IF NOT EXISTS idx_pin_serves_served_by ON pin_serves(served_by);

      CREATE TABLE IF NOT EXISTS offline_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        cached_by TEXT NOT NULL,
        content_type TEXT DEFAULT 'blob',
        source TEXT DEFAULT 'followed',
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(hash, cached_by)
      );

      CREATE INDEX IF NOT EXISTS idx_offline_cache_hash ON offline_cache(hash);
      CREATE INDEX IF NOT EXISTS idx_offline_cache_cached_by ON offline_cache(cached_by);

      CREATE TABLE IF NOT EXISTS offline_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        author_handle TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_offline_queue_author ON offline_queue(author_handle);
      CREATE INDEX IF NOT EXISTS idx_offline_queue_synced ON offline_queue(synced);

      CREATE TABLE IF NOT EXISTS device_sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        sync_type TEXT NOT NULL,
        items_count INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        success INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_device_sync_log_device ON device_sync_log(device_id);
      CREATE INDEX IF NOT EXISTS idx_device_sync_log_type ON device_sync_log(sync_type);

      -- Relay consensus tracking for cache poisoning prevention
      CREATE TABLE IF NOT EXISTS relay_consensus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL,
        relay_url TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        first_seen TEXT DEFAULT (datetime('now')),
        UNIQUE(event_id, relay_url)
      );

      CREATE INDEX IF NOT EXISTS idx_relay_consensus_event ON relay_consensus(event_id);
      CREATE INDEX IF NOT EXISTS idx_relay_consensus_relay ON relay_consensus(relay_url);

      -- Malicious Intent Detection Framework (MIDF) scores
      CREATE TABLE IF NOT EXISTS malicious_intent_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        handle TEXT NOT NULL UNIQUE,
        overall_score REAL DEFAULT 0.0,
        follower_velocity REAL DEFAULT 0.0,
        network_centrality REAL DEFAULT 0.0,
        content_similarity REAL DEFAULT 0.0,
        temporal_pattern REAL DEFAULT 0.0,
        self_interaction REAL DEFAULT 0.0,
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (handle) REFERENCES users(handle)
      );

      CREATE INDEX IF NOT EXISTS idx_malicious_intent_handle ON malicious_intent_scores(handle);

      CREATE TABLE IF NOT EXISTS karma_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        handle TEXT NOT NULL,
        yard TEXT DEFAULT '',
        post_delta INTEGER DEFAULT 0,
        comment_delta INTEGER DEFAULT 0,
        reason TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (handle) REFERENCES users(handle)
      );

      CREATE TABLE IF NOT EXISTS yard_memberships (
        community_id TEXT NOT NULL,
        handle TEXT NOT NULL,
        joined_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (community_id, handle)
      );

      CREATE TABLE IF NOT EXISTS yard_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        community_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        location TEXT DEFAULT '',
        starts_at TEXT NOT NULL,
        ends_at TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (created_by) REFERENCES users(handle)
      );

      CREATE TABLE IF NOT EXISTS yard_event_rsvps (
        event_id INTEGER NOT NULL,
        handle TEXT NOT NULL,
        status TEXT DEFAULT 'going',
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (event_id, handle),
        FOREIGN KEY (event_id) REFERENCES yard_events(id),
        FOREIGN KEY (handle) REFERENCES users(handle)
      );

      CREATE INDEX IF NOT EXISTS idx_yard_events_community ON yard_events(community_id, starts_at);

      CREATE TABLE IF NOT EXISTS wall_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wall_owner_handle TEXT NOT NULL,
        author_handle TEXT NOT NULL,
        content TEXT NOT NULL,
        approved INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (wall_owner_handle) REFERENCES users(handle),
        FOREIGN KEY (author_handle) REFERENCES users(handle)
      );

      CREATE TABLE IF NOT EXISTS reposts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_handle TEXT NOT NULL,
        post_id INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_handle, post_id),
        FOREIGN KEY (user_handle) REFERENCES users(handle),
        FOREIGN KEY (post_id) REFERENCES posts(id)
      );
      "
    )?;

    // Migrate existing databases
    let _ = conn.execute("ALTER TABLE users ADD COLUMN pubkey TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE users ADD COLUMN engagement_quality REAL DEFAULT 1.0", []);
    let _ = conn.execute("ALTER TABLE users ADD COLUMN last_action_unix INTEGER DEFAULT 0", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_users_pubkey ON users(pubkey)", []);
    let _ = conn.execute("ALTER TABLE posts ADD COLUMN media_blobs TEXT DEFAULT '[]'", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_blobs_uploader ON blobs(uploader_handle)", []);
    let _ = conn.execute("ALTER TABLE posts ADD COLUMN nostr_event_id TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE posts ADD COLUMN relay_url TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE blobs ADD COLUMN cid TEXT", []);
    let _ = conn.execute("ALTER TABLE users ADD COLUMN node_role TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE users ADD COLUMN relay_uptime_hours INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE users ADD COLUMN theme_id INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE users ADD COLUMN music_hash TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE posts ADD COLUMN channel_id TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE users ADD COLUMN post_karma INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE users ADD COLUMN comment_karma INTEGER DEFAULT 0", []);
    let _ = conn.execute(
      "ALTER TABLE users ADD COLUMN pro_profile_json TEXT DEFAULT '{}'",
      [],
    );
    let _ = conn.execute(
      "ALTER TABLE users ADD COLUMN profile_layout_json TEXT DEFAULT '{}'",
      [],
    );
    let _ = conn.execute(
      "ALTER TABLE users ADD COLUMN top_friends_json TEXT DEFAULT '[]'",
      [],
    );

    Ok(())
  }

  fn seed(&self) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))?;
    if count > 0 {
      return Ok(());
    }

    conn.execute_batch(
      "
      INSERT INTO users (handle, display_name, bio, university, town, followers_count, following_count, weix_bucks, pubkey)
      VALUES
        ('demo_user', 'Demo User', 'Welcome to BlkSpace!', 'Tennessee State University', 'tsu', 245, 89, 1250, '1111111111111111111111111111111111111111111111111111111111111111'),
        ('jane_doe', 'Jane Doe', 'HBCU grad | Tech | Culture', 'Howard University', 'howard', 342, 156, 890, 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
        ('campus_king', 'Campus King', 'Content creator & vibe curator', 'Florida A&M University', 'famu', 1287, 324, 2340, '2222222222222222222222222222222222222222222222222222222222222222'),
        ('hbcustudent', 'HBCU Student', 'Future engineer. Building the future.', 'Spelman College', 'spelman', 891, 203, 1560, '3333333333333333333333333333333333333333333333333333333333333333'),
        ('alumnus_01', 'Alumnus 01', 'Class of 2020. Still reppin the yard.', 'Morehouse College', 'morehouse', 563, 112, 980, '4444444444444444444444444444444444444444444444444444444444444444');

      INSERT INTO posts (author_handle, content, town_tag, channel_id, replies_count, reposts_count, likes_count, created_at)
      VALUES
        ('demo_user', 'Just stepped on the yard for the first time. This place is incredible! 🏆', 'tsu', 'general', 12, 5, 47, '2026-06-14T09:00:00'),
        ('jane_doe', 'Hot take: the best HBCU homecoming is... (drop yours below) 👇', 'howard', 'general', 34, 18, 89, '2026-06-14T10:30:00'),
        ('campus_king', 'New mix just dropped. Link in bio. Who''s bumping this at the next tailgate? 🎧', 'famu', 'music', 8, 23, 156, '2026-06-14T11:15:00'),
        ('hbcustudent', 'Study group in the library at 4. Bring your laptops and your focus. 📚', 'spelman', 'study', 19, 4, 34, '2026-06-14T12:00:00'),
        ('alumnus_01', '20 years later and I still get chills walking across this campus. Once a tiger, always a tiger. 🐯', 'morehouse', 'general', 7, 12, 67, '2026-06-14T13:45:00'),
        ('demo_user', 'Who else is going to the career fair tomorrow? Let''s link up!', 'tsu', 'events', 5, 2, 23, '2026-06-14T14:30:00');

      INSERT INTO replies (post_id, author_handle, content, created_at)
      VALUES
        (1, 'jane_doe', 'Welcome! You''re gonna love it here 🔥', '2026-06-14T09:15:00'),
        (1, 'campus_king', 'Ayyy what''s good! Welcome to the yard!', '2026-06-14T09:20:00'),
        (2, 'hbcustudent', 'FAMU homecoming is unmatched and it''s not close', '2026-06-14T11:00:00');

      INSERT INTO notifications (user_handle, notification_type, from_handle, message)
      VALUES
        ('demo_user', 'like', 'jane_doe', 'liked your post'),
        ('demo_user', 'reply', 'campus_king', 'replied to your post'),
        ('demo_user', 'follow', 'hbcustudent', 'followed you');

      INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
      VALUES
        ('demo_user', 'earn', 50, 'Viral post reward', 1250),
        ('demo_user', 'spend', -25, 'Tip to @jane_doe', 1200),
        ('demo_user', 'earn', 100, 'Relay uptime bonus', 1225);
      "
    )?;
    Ok(())
  }

  /// Ensure demo handles have stable pubkeys + Jane's NIP-65 list for profile UI (idempotent).
  fn backfill_demo_pubkeys(&self) -> Result<()> {
    const DEMO_PUBKEYS: &[(&str, &str)] = &[
      (
        "demo_user",
        "1111111111111111111111111111111111111111111111111111111111111111",
      ),
      (
        "jane_doe",
        "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      ),
      (
        "campus_king",
        "2222222222222222222222222222222222222222222222222222222222222222",
      ),
      (
        "hbcustudent",
        "3333333333333333333333333333333333333333333333333333333333333333",
      ),
      (
        "alumnus_01",
        "4444444444444444444444444444444444444444444444444444444444444444",
      ),
    ];

    let conn = self.conn.lock().unwrap();
    for (handle, pubkey) in DEMO_PUBKEYS {
      conn.execute(
        "UPDATE users SET pubkey = ?1 WHERE handle = ?2 AND (pubkey IS NULL OR pubkey = '')",
        params![pubkey, handle],
      )?;
    }

    let jane_pubkey = DEMO_PUBKEYS[1].1;
    let tags = r#"[["r","wss://relay.damus.io"],["r","wss://nos.lol","read"]]"#;
    let now = chrono::Utc::now().timestamp();
    conn.execute(
      "INSERT OR IGNORE INTO relay_events (event_id, relay_url, kind, pubkey, content, tags, created_at_unix) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
      params![
        "seed_jane_nip65",
        "seed",
        10002,
        jane_pubkey,
        "",
        tags,
        now
      ],
    )?;
    Ok(())
  }

  pub fn get_user(&self, handle: &str) -> Result<Option<User>, SqlError> {
    let conn = self.conn.lock().unwrap();
    let sql = format!("{USER_SELECT} WHERE handle = ?1");
    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query(params![handle])?;
    match rows.next()? {
      Some(row) => Ok(Some(map_user_row(&row)?)),
      None => Ok(None),
    }
  }

  pub fn list_users(&self) -> Result<Vec<User>> {
    let conn = self.conn.lock().unwrap();
    let sql = format!("{USER_SELECT} ORDER BY followers_count DESC");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], map_user_row)?;
    let mut users = Vec::new();
    for row in rows {
      users.push(row?);
    }
    Ok(users)
  }

  pub fn search_users(&self, query: &str, limit: i64) -> Result<Vec<User>> {
    let conn = self.conn.lock().unwrap();
    let pattern = format!("%{}%", query.to_lowercase());
    let sql = format!(
      "{USER_SELECT}
       WHERE lower(handle) LIKE ?1
          OR lower(display_name) LIKE ?1
          OR lower(bio) LIKE ?1
          OR lower(university) LIKE ?1
       ORDER BY followers_count DESC
       LIMIT ?2"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![pattern, limit], map_user_row)?;
    let mut users = Vec::new();
    for row in rows {
      users.push(row?);
    }
    Ok(users)
  }

  pub fn search_posts(
    &self,
    query: &str,
    limit: i64,
    current_user: Option<&str>,
  ) -> Result<Vec<Post>> {
    let pattern = format!("%{}%", query.to_lowercase());
    let sql = "SELECT p.id, p.author_handle, u.display_name, u.avatar_url, p.content, p.town_tag, p.channel_id,
              p.replies_count, p.reposts_count, p.likes_count,
              CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as liked,
              p.media_blobs, COALESCE(p.nostr_event_id, ''), COALESCE(p.relay_url, ''), p.created_at
       FROM posts p
       JOIN users u ON u.handle = p.author_handle
       LEFT JOIN likes l ON l.post_id = p.id AND l.user_handle = ?2
       WHERE lower(p.content) LIKE ?1
          OR lower(p.author_handle) LIKE ?1
          OR lower(u.display_name) LIKE ?1
          OR lower(p.town_tag) LIKE ?1
       ORDER BY p.created_at DESC
       LIMIT ?3";

    fn parse_media_blobs(json: &str) -> Vec<String> {
      serde_json::from_str(json).unwrap_or_default()
    }

    let mut posts = {
      let conn = self.conn.lock().unwrap();
      let mut stmt = conn.prepare(sql)?;
      let rows = stmt.query_map(
      params![pattern, current_user.unwrap_or(""), limit],
      |row| {
        Ok(Post {
          id: row.get(0)?,
          author_handle: row.get(1)?,
          author_display_name: row.get(2)?,
          author_avatar_url: row.get(3)?,
          content: row.get(4)?,
          town_tag: row.get(5)?,
          channel_id: row.get(6).unwrap_or_default(),
          replies_count: row.get(7)?,
          reposts_count: row.get(8)?,
          likes_count: row.get(9)?,
          liked: row.get::<_, i64>(10)? != 0,
          media_blobs: parse_media_blobs(&row.get::<_, String>(11).unwrap_or_default()),
          nostr_event_id: row.get::<_, String>(12).unwrap_or_default(),
          relay_url: row.get::<_, String>(13).unwrap_or_default(),
          created_at: row.get(14)?,
          engagement_quality: 1.0,
          malicious_score: 0.0,
          risk_level: "low".to_string(),
        })
      },
    )?;
      let mut posts = Vec::new();
      for row in rows {
        posts.push(row?);
      }
      posts
    };
    self.enrich_posts_security(&mut posts);
    Ok(posts)
  }

  pub fn search_communities(&self, query: &str) -> Vec<Community> {
    let q = query.to_lowercase();
    if q.is_empty() {
      return self.get_communities();
    }
    self
      .get_communities()
      .into_iter()
      .filter(|c| {
        c.id.to_lowercase().contains(&q)
          || c.name.to_lowercase().contains(&q)
          || c.school.to_lowercase().contains(&q)
          || c.location.to_lowercase().contains(&q)
          || c.description.to_lowercase().contains(&q)
      })
      .collect()
  }

  pub fn create_user(&self, handle: &str, display_name: &str, pubkey: &str) -> Result<User> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO users (handle, display_name, pubkey) VALUES (?1, ?2, ?3)",
      params![handle, display_name, pubkey],
    )?;
    let id = conn.last_insert_rowid();
    Ok(User {
      id,
      handle: handle.to_string(),
      display_name: display_name.to_string(),
      bio: String::new(),
      avatar_url: String::new(),
      university: String::new(),
      town: "tsu".to_string(),
      followers_count: 0,
      following_count: 0,
      weix_bucks: 100,
      pubkey: pubkey.to_string(),
      engagement_quality: 1.0,
      theme_id: 0,
      music_hash: String::new(),
      node_role: String::new(),
      created_at: chrono::Utc::now().to_rfc3339(),
      post_karma: 0,
      comment_karma: 0,
      pro_profile_json: "{}".to_string(),
      profile_layout_json: "{}".to_string(),
      top_friends_json: "[]".to_string(),
    })
  }

  pub fn set_user_pubkey(&self, handle: &str, pubkey: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET pubkey = ?1 WHERE handle = ?2",
      params![pubkey, handle],
    )?;
    Ok(())
  }

  pub fn get_user_by_pubkey(&self, pubkey: &str) -> Result<Option<User>> {
    let conn = self.conn.lock().unwrap();
    let sql = format!("{USER_SELECT} WHERE pubkey = ?1");
    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query(params![pubkey])?;
    match rows.next()? {
      Some(row) => Ok(Some(map_user_row(&row)?)),
      None => Ok(None),
    }
  }

  fn risk_level_from_score(score: f64) -> String {
    if score > 0.7 {
      "high".to_string()
    } else if score > 0.4 {
      "medium".to_string()
    } else {
      "low".to_string()
    }
  }

  /// Attach engagement quality + MIDF scores for feed security ranking.
  pub fn enrich_post_security(&self, post: &mut Post) {
    let conn = self.conn.lock().unwrap();
    let eq: f64 = conn
      .query_row(
        "SELECT engagement_quality FROM users WHERE handle = ?1",
        params![post.author_handle],
        |r| r.get(0),
      )
      .unwrap_or(1.0);
    post.engagement_quality = eq;

    let mal: f64 = conn
      .query_row(
        "SELECT overall_score FROM malicious_intent_scores WHERE handle = ?1",
        params![post.author_handle],
        |r| r.get(0),
      )
      .unwrap_or(0.0);
    post.malicious_score = mal;
    post.risk_level = Self::risk_level_from_score(mal);
  }

  pub fn enrich_posts_security(&self, posts: &mut [Post]) {
    for post in posts.iter_mut() {
      self.enrich_post_security(post);
    }
  }

  pub fn update_user(&self, handle: &str, display_name: &str, bio: &str, town: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET display_name = ?1, bio = ?2, town = ?3 WHERE handle = ?4",
      params![display_name, bio, town, handle],
    )?;
    Ok(())
  }

  pub fn update_profile_customization(
    &self,
    handle: &str,
    theme_id: i64,
    music_hash: &str,
  ) -> Result<User> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET theme_id = ?1, music_hash = ?2 WHERE handle = ?3",
      params![theme_id, music_hash, handle],
    )?;
    drop(conn);
    self.get_user(handle)?.ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)
  }

  pub fn store_nostr_event_json(&self, event_id: &str, event_json: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO nostr_signed_events (event_id, event_json) VALUES (?1, ?2)
       ON CONFLICT(event_id) DO UPDATE SET event_json = excluded.event_json, stored_at = datetime('now')",
      params![event_id, event_json],
    )?;
    Ok(())
  }

  pub fn get_nostr_event_json(&self, event_id: &str) -> Result<Option<String>> {
    let conn = self.conn.lock().unwrap();
    let result = conn.query_row(
      "SELECT event_json FROM nostr_signed_events WHERE event_id = ?1",
      params![event_id],
      |row| row.get::<_, String>(0),
    );
    match result {
      Ok(json) => Ok(Some(json)),
      Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
      Err(e) => Err(e),
    }
  }

  pub fn list_posts(&self, town: Option<&str>, current_user: Option<&str>) -> Result<Vec<Post>> {
    let has_town = town.is_some();
    let sql = if has_town {
      "SELECT p.id, p.author_handle, u.display_name, u.avatar_url, p.content, p.town_tag, p.channel_id,
              p.replies_count, p.reposts_count, p.likes_count,
              CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as liked,
              p.media_blobs, COALESCE(p.nostr_event_id, ''), COALESCE(p.relay_url, ''), p.created_at
       FROM posts p
       JOIN users u ON u.handle = p.author_handle
       LEFT JOIN likes l ON l.post_id = p.id AND l.user_handle = ?2
       WHERE p.town_tag = ?1
       ORDER BY p.created_at DESC"
    } else {
      "SELECT p.id, p.author_handle, u.display_name, u.avatar_url, p.content, p.town_tag, p.channel_id,
              p.replies_count, p.reposts_count, p.likes_count,
              CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as liked,
              p.media_blobs, COALESCE(p.nostr_event_id, ''), COALESCE(p.relay_url, ''), p.created_at
       FROM posts p
       JOIN users u ON u.handle = p.author_handle
       LEFT JOIN likes l ON l.post_id = p.id AND l.user_handle = ?1
       ORDER BY p.created_at DESC"
    };

    fn parse_media_blobs(json: &str) -> Vec<String> {
      serde_json::from_str(json).unwrap_or_default()
    }

    let mut posts = {
      let conn = self.conn.lock().unwrap();
      let mut stmt = conn.prepare(sql)?;
      let row_map: Box<dyn Iterator<Item = Result<Post>>> = if has_town {
      Box::new(stmt.query_map(params![town.unwrap_or("tsu"), current_user.unwrap_or("")], |row| {
        Ok(Post {
          id: row.get(0)?,
          author_handle: row.get(1)?,
          author_display_name: row.get(2)?,
          author_avatar_url: row.get(3)?,
          content: row.get(4)?,
          town_tag: row.get(5)?,
          channel_id: row.get(6).unwrap_or_default(),
          replies_count: row.get(7)?,
          reposts_count: row.get(8)?,
          likes_count: row.get(9)?,
          liked: row.get::<_, i64>(10)? != 0,
          media_blobs: parse_media_blobs(&row.get::<_, String>(11).unwrap_or_default()),
          nostr_event_id: row.get::<_, String>(12).unwrap_or_default(),
          relay_url: row.get::<_, String>(13).unwrap_or_default(),
          created_at: row.get(14)?,
          engagement_quality: 1.0,
          malicious_score: 0.0,
          risk_level: "low".to_string(),
        })
      })?)
    } else {
      Box::new(stmt.query_map(params![current_user.unwrap_or("")], |row| {
        Ok(Post {
          id: row.get(0)?,
          author_handle: row.get(1)?,
          author_display_name: row.get(2)?,
          author_avatar_url: row.get(3)?,
          content: row.get(4)?,
          town_tag: row.get(5)?,
          channel_id: row.get(6).unwrap_or_default(),
          replies_count: row.get(7)?,
          reposts_count: row.get(8)?,
          likes_count: row.get(9)?,
          liked: row.get::<_, i64>(10)? != 0,
          media_blobs: parse_media_blobs(&row.get::<_, String>(11).unwrap_or_default()),
          nostr_event_id: row.get::<_, String>(12).unwrap_or_default(),
          relay_url: row.get::<_, String>(13).unwrap_or_default(),
          created_at: row.get(14)?,
          engagement_quality: 1.0,
          malicious_score: 0.0,
          risk_level: "low".to_string(),
        })
      })?)
    };

      let mut posts = Vec::new();
      for row in row_map {
        posts.push(row?);
      }
      posts
    };
    self.enrich_posts_security(&mut posts);
    Ok(posts)
  }

  pub fn get_post(&self, id: i64, current_user: Option<&str>) -> Result<Option<Post>> {
    let mut post = {
      let conn = self.conn.lock().unwrap();
      let mut stmt = conn.prepare(
        "SELECT p.id, p.author_handle, u.display_name, u.avatar_url, p.content, p.town_tag, p.channel_id,
                p.replies_count, p.reposts_count, p.likes_count,
                CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as liked,
                p.media_blobs, COALESCE(p.nostr_event_id, ''), COALESCE(p.relay_url, ''), p.created_at
         FROM posts p
         JOIN users u ON u.handle = p.author_handle
         LEFT JOIN likes l ON l.post_id = p.id AND l.user_handle = ?2
         WHERE p.id = ?1"
      )?;
      let mut rows = stmt.query(params![id, current_user.unwrap_or("")])?;
      match rows.next()? {
        Some(row) => Some(Post {
          id: row.get(0)?,
          author_handle: row.get(1)?,
          author_display_name: row.get(2)?,
          author_avatar_url: row.get(3)?,
          content: row.get(4)?,
          town_tag: row.get(5)?,
          channel_id: row.get(6).unwrap_or_default(),
          replies_count: row.get(7)?,
          reposts_count: row.get(8)?,
          likes_count: row.get(9)?,
          liked: row.get::<_, i64>(10)? != 0,
          media_blobs: serde_json::from_str(&row.get::<_, String>(11).unwrap_or_default()).unwrap_or_default(),
          nostr_event_id: row.get::<_, String>(12).unwrap_or_default(),
          relay_url: row.get::<_, String>(13).unwrap_or_default(),
          created_at: row.get(14)?,
          engagement_quality: 1.0,
          malicious_score: 0.0,
          risk_level: "low".to_string(),
        }),
        None => None,
      }
    };
    if let Some(ref mut p) = post {
      self.enrich_post_security(p);
    }
    Ok(post)
  }

  /// Sum of WB earned in the last 24 hours (earn transactions only).
  pub fn daily_wb_earned(&self, handle: &str) -> Result<i64> {
    let conn = self.conn.lock().unwrap();
    let earned: i64 = conn.query_row(
      "SELECT COALESCE(SUM(amount), 0) FROM wallet_tx
       WHERE user_handle = ?1 AND tx_type = 'earn'
         AND created_at >= datetime('now', '-1 day')",
      params![handle],
      |r| r.get(0),
    )?;
    Ok(earned)
  }

  /// Grant WB; returns actual amount granted (0 if daily cap or MIDF throttle via caller).
  pub fn grant_weix_bucks(&self, handle: &str, amount: i64, description: &str) -> Result<i64> {
    if amount <= 0 {
      return Ok(0);
    }
    let earned_today = self.daily_wb_earned(handle)?;
    let remaining = (DAILY_WB_EARN_CAP - earned_today).max(0);
    let grant = amount.min(remaining);
    if grant <= 0 {
      return Ok(0);
    }
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
      params![grant, handle],
    )?;
    conn.execute(
      "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
       SELECT ?1, 'earn', ?2, ?3, weix_bucks FROM users WHERE handle = ?1",
      params![handle, grant, description],
    )?;
    Ok(grant)
  }

  pub fn grant_karma(
    &self,
    handle: &str,
    yard: &str,
    post_delta: i64,
    comment_delta: i64,
    reason: &str,
  ) -> Result<()> {
    if post_delta == 0 && comment_delta == 0 {
      return Ok(());
    }
    if self.rewards_throttled(handle) {
      return Ok(());
    }
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET post_karma = post_karma + ?1, comment_karma = comment_karma + ?2 WHERE handle = ?3",
      params![post_delta, comment_delta, handle],
    )?;
    conn.execute(
      "INSERT INTO karma_events (handle, yard, post_delta, comment_delta, reason) VALUES (?1, ?2, ?3, ?4, ?5)",
      params![handle, yard, post_delta, comment_delta, reason],
    )?;
    Ok(())
  }

  pub fn rewards_throttled(&self, handle: &str) -> bool {
    let conn = self.conn.lock().unwrap();
    conn
      .query_row(
        "SELECT overall_score FROM malicious_intent_scores WHERE handle = ?1",
        params![handle],
        |r| r.get::<_, f64>(0),
      )
      .map(|score| score > 0.7)
      .unwrap_or(false)
  }

  pub fn throttle_rewards(&self, handle: &str, base: f64, quality: f64) -> i64 {
    let mut reward = (base * quality).round() as i64;
    if self.rewards_throttled(handle) {
      reward = 0;
    }
    reward
  }

  pub fn create_post(&self, author_handle: &str, content: &str, town_tag: &str, channel_id: &str, media_hashes: &[String]) -> Result<CreatePostResult> {
    let quality = self.update_engagement_quality(author_handle)?;
    let is_community = !channel_id.is_empty();
    let reward = self.throttle_rewards(author_handle, 5.0, quality);
    let community_wb = if is_community {
      self.throttle_rewards(author_handle, 3.0, quality)
    } else {
      0
    };

    let (id, display, avatar) = {
      let conn = self.conn.lock().unwrap();
      let media_json = serde_json::to_string(media_hashes).unwrap_or("[]".to_string());
      conn.execute(
        "INSERT INTO posts (author_handle, content, town_tag, channel_id, media_blobs) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![author_handle, content, town_tag, channel_id, media_json],
      )?;
      let id = conn.last_insert_rowid();

      let display: String = conn.query_row(
        "SELECT display_name FROM users WHERE handle = ?1",
        params![author_handle],
        |r| r.get(0),
      )?;
      let avatar: String = conn.query_row(
        "SELECT COALESCE(avatar_url, '') FROM users WHERE handle = ?1",
        params![author_handle],
        |r| r.get(0),
      )?;
      (id, display, avatar)
    };

    let throttled = self.rewards_throttled(author_handle);
    let wb_main = self.grant_weix_bucks(
      author_handle,
      reward,
      if is_community {
        "Yard channel post"
      } else {
        "Post created"
      },
    )?;
    let wb_bonus = if community_wb > 0 {
      self.grant_weix_bucks(author_handle, community_wb, "Community engagement")?
    } else {
      0
    };

    let karma_post_nominal = (if is_community { 5 } else { 3 })
      + if !media_hashes.is_empty() { 2 } else { 0 };
    let karma_comment_nominal = if is_community { 2 } else { 0 };
    if !throttled {
      if is_community {
        self.grant_karma(author_handle, town_tag, 5, 2, "Yard channel post")?;
      } else {
        self.grant_karma(author_handle, town_tag, 3, 0, "Feed post")?;
      }
      if !media_hashes.is_empty() {
        self.grant_karma(author_handle, town_tag, 2, 0, "Media post")?;
      }
    }

    let mut post = Post {
      id,
      author_handle: author_handle.to_string(),
      author_display_name: display,
      author_avatar_url: avatar,
      content: content.to_string(),
      town_tag: town_tag.to_string(),
      channel_id: channel_id.to_string(),
      replies_count: 0,
      reposts_count: 0,
      likes_count: 0,
      liked: false,
      media_blobs: media_hashes.to_vec(),
      nostr_event_id: String::new(),
      relay_url: String::new(),
      created_at: chrono::Utc::now().to_rfc3339(),
      engagement_quality: quality,
      malicious_score: 0.0,
      risk_level: "low".to_string(),
    };
    self.enrich_post_security(&mut post);

    let earn = EarnResult::build(
      reward + community_wb,
      wb_main + wb_bonus,
      karma_post_nominal,
      karma_comment_nominal,
      throttled,
    );
    Ok(CreatePostResult { post, earn })
  }

  pub fn list_replies(&self, post_id: i64) -> Result<Vec<Reply>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT r.id, r.post_id, r.author_handle, u.display_name, COALESCE(u.avatar_url, ''), r.content, r.created_at
       FROM replies r
       JOIN users u ON u.handle = r.author_handle
       WHERE r.post_id = ?1
       ORDER BY r.created_at ASC"
    )?;
    let rows = stmt.query_map(params![post_id], |row| {
      Ok(Reply {
        id: row.get(0)?,
        post_id: row.get(1)?,
        author_handle: row.get(2)?,
        author_display_name: row.get(3)?,
        author_avatar_url: row.get(4)?,
        content: row.get(5)?,
        created_at: row.get(6)?,
      })
    })?;
    let mut replies = Vec::new();
    for row in rows {
      replies.push(row?);
    }
    Ok(replies)
  }

  pub fn create_reply(&self, post_id: i64, author_handle: &str, content: &str) -> Result<CreateReplyResult> {
    let quality = self.update_engagement_quality(author_handle)?;
    let reward = self.throttle_rewards(author_handle, 2.0, quality);
    let throttled = self.rewards_throttled(author_handle);

    let (id, town_tag, channel_id, post_author) = {
      let conn = self.conn.lock().unwrap();
      let (town, channel, author): (String, String, String) = conn.query_row(
        "SELECT town_tag, COALESCE(channel_id, ''), author_handle FROM posts WHERE id = ?1",
        params![post_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
      )?;
      conn.execute(
        "INSERT INTO replies (post_id, author_handle, content) VALUES (?1, ?2, ?3)",
        params![post_id, author_handle, content],
      )?;
      let id = conn.last_insert_rowid();
      conn.execute(
        "UPDATE posts SET replies_count = replies_count + 1 WHERE id = ?1",
        params![post_id],
      )?;
      (id, town, channel, author)
    };

    let is_self_reply = post_author == author_handle;
    let yard_bonus = if !channel_id.is_empty() && !is_self_reply {
      self.throttle_rewards(author_handle, 1.0, quality)
    } else {
      0
    };

    let wb_nominal = if is_self_reply { 0 } else { reward + yard_bonus };
    let (wb_main, wb_yard) = if is_self_reply {
      (0, 0)
    } else {
      let main = self.grant_weix_bucks(author_handle, reward, "Reply posted")?;
      let yard = if yard_bonus > 0 {
        self.grant_weix_bucks(author_handle, yard_bonus, "Yard discussion")?
      } else {
        0
      };
      (main, yard)
    };
    let karma_comment_nominal = if is_self_reply {
      0
    } else {
      2 + if !channel_id.is_empty() { 1 } else { 0 }
    };
    if !throttled && !is_self_reply {
      self.grant_karma(author_handle, &town_tag, 0, 2, "Reply")?;
      if !channel_id.is_empty() {
        self.grant_karma(author_handle, &town_tag, 0, 1, "Yard reply")?;
      }
    }

    let earn = EarnResult::build(
      wb_nominal,
      wb_main + wb_yard,
      0,
      karma_comment_nominal,
      throttled,
    );

    let display: String = {
      let conn = self.conn.lock().unwrap();
      conn.query_row(
        "SELECT display_name FROM users WHERE handle = ?1",
        params![author_handle],
        |r| r.get(0),
      )?
    };

    let reply = Reply {
      id,
      post_id,
      author_handle: author_handle.to_string(),
      author_display_name: display,
      author_avatar_url: String::new(),
      content: content.to_string(),
      created_at: chrono::Utc::now().to_rfc3339(),
    };
    Ok(CreateReplyResult { reply, earn })
  }

  pub fn toggle_like(&self, post_id: i64, user_handle: &str) -> Result<ToggleLikeResult> {
    let conn = self.conn.lock().unwrap();
    let existing: Option<i64> = conn
      .query_row(
        "SELECT id FROM likes WHERE post_id = ?1 AND user_handle = ?2",
        params![post_id, user_handle],
        |r| r.get(0),
      )
      .ok();

    if existing.is_some() {
      conn.execute(
        "DELETE FROM likes WHERE post_id = ?1 AND user_handle = ?2",
        params![post_id, user_handle],
      )?;
      conn.execute(
        "UPDATE posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?1",
        params![post_id],
      )?;
      Ok(ToggleLikeResult {
        liked: false,
        author_handle: None,
        author_earn: EarnResult::default(),
      })
    } else {
      conn.execute(
        "INSERT INTO likes (post_id, user_handle) VALUES (?1, ?2)",
        params![post_id, user_handle],
      )?;
      conn.execute(
        "UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?1",
        params![post_id],
      )?;

      let author: Option<String> = conn.query_row(
        "SELECT author_handle FROM posts WHERE id = ?1",
        params![post_id],
        |r| r.get(0),
      )
      .ok();
      drop(conn);

      let mut author_earn = EarnResult::default();
      let author_handle = author.clone();
      if let Some(ref author_handle) = author {
        if author_handle != user_handle {
          let quality = self.update_engagement_quality(author_handle)?;
          let reward = self.throttle_rewards(author_handle, 1.0, quality);
          let throttled = self.rewards_throttled(author_handle);
          let town: String = {
            let conn = self.conn.lock().unwrap();
            conn.query_row(
              "SELECT town_tag FROM posts WHERE id = ?1",
              params![post_id],
              |r| r.get(0),
            )
            .unwrap_or_else(|_| "tsu".to_string())
          };
          let wb_actual = self.grant_weix_bucks(author_handle, reward, "Post liked")?;
          if !throttled {
            self.grant_karma(author_handle, &town, 1, 0, "Upvote received")?;
          }
          author_earn = EarnResult::build(reward, wb_actual, 1, 0, throttled);
        }
      }

      Ok(ToggleLikeResult {
        liked: true,
        author_handle,
        author_earn,
      })
    }
  }

  pub fn get_notifications(&self, user_handle: &str) -> Result<Vec<Notification>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT n.id, n.user_handle, n.notification_type, n.from_handle, u.display_name,
              n.message, n.unread, n.created_at
       FROM notifications n
       JOIN users u ON u.handle = n.from_handle
       WHERE n.user_handle = ?1
       ORDER BY n.created_at DESC
       LIMIT 50"
    )?;
    let rows = stmt.query_map(params![user_handle], |row| {
      Ok(Notification {
        id: row.get(0)?,
        user_handle: row.get(1)?,
        notification_type: row.get(2)?,
        from_handle: row.get(3)?,
        from_display_name: row.get(4)?,
        message: row.get(5)?,
        unread: row.get::<_, i64>(6)? != 0,
        created_at: row.get(7)?,
      })
    })?;
    let mut notifications = Vec::new();
    for row in rows {
      notifications.push(row?);
    }
    Ok(notifications)
  }

  pub fn update_engagement_quality(&self, handle: &str) -> Result<f64> {
    let conn = self.conn.lock().unwrap();
    let now = chrono::Utc::now().timestamp();

    let (quality, last_unix): (f64, i64) = conn.query_row(
      "SELECT engagement_quality, COALESCE(last_action_unix, 0) FROM users WHERE handle = ?1",
      params![handle],
      |row| Ok((row.get(0)?, row.get(1)?)),
    ).unwrap_or((1.0, 0));

    let new_quality = if last_unix == 0 {
      1.0
    } else if now - last_unix > 3600 {
      (quality + 0.1).min(1.0)
    } else {
      (quality - 0.02).max(0.3)
    };

    conn.execute(
      "UPDATE users SET engagement_quality = ?1, last_action_unix = ?2 WHERE handle = ?3",
      params![new_quality, now, handle],
    )?;

    Ok(new_quality)
  }

  pub fn get_wallet_tx(&self, user_handle: &str) -> Result<Vec<WalletTx>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, user_handle, tx_type, amount, description, balance_after, created_at
       FROM wallet_tx WHERE user_handle = ?1
       ORDER BY created_at DESC
       LIMIT 50"
    )?;
    let rows = stmt.query_map(params![user_handle], |row| {
      Ok(WalletTx {
        id: row.get(0)?,
        user_handle: row.get(1)?,
        tx_type: row.get(2)?,
        amount: row.get(3)?,
        description: row.get(4)?,
        balance_after: row.get(5)?,
        created_at: row.get(6)?,
      })
    })?;
    let mut txs = Vec::new();
    for row in rows {
      txs.push(row?);
    }
    Ok(txs)
  }

  pub fn send_weixbucks(&self, from_handle: &str, to_handle: &str, amount: i64) -> Result<(i64, i64)> {
    if amount <= 0 {
      return Err(rusqlite::Error::InvalidParameterName("Amount must be positive".into()));
    }
    let conn = self.conn.lock().unwrap();
    let tx = conn.unchecked_transaction()?;

    let sender_bucks: i64 = tx.query_row(
      "SELECT weix_bucks FROM users WHERE handle = ?1",
      params![from_handle],
      |r| r.get(0),
    )?;
    if sender_bucks < amount {
      return Err(rusqlite::Error::InvalidParameterName("Insufficient WeixBucks".into()));
    }

    let receiver_exists: bool = tx.query_row(
      "SELECT COUNT(*) FROM users WHERE handle = ?1",
      params![to_handle],
      |r| r.get::<_, i64>(0),
    ).map(|c| c > 0)?;
    if !receiver_exists {
      return Err(rusqlite::Error::InvalidParameterName("Recipient not found".into()));
    }

    tx.execute(
      "UPDATE users SET weix_bucks = weix_bucks - ?1 WHERE handle = ?2",
      params![amount, from_handle],
    )?;
    tx.execute(
      "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
      params![amount, to_handle],
    )?;

    tx.execute(
      "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
       SELECT ?1, 'spend', -?2, ?3, weix_bucks FROM users WHERE handle = ?1",
      params![from_handle, amount, format!("Sent to @{}", to_handle)],
    )?;
    tx.execute(
      "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
       SELECT ?1, 'earn', ?2, ?3, weix_bucks FROM users WHERE handle = ?1",
      params![to_handle, amount, format!("Received from @{}", from_handle)],
    )?;

    let (sender_new, receiver_new): (i64, i64) = (
      tx.query_row("SELECT weix_bucks FROM users WHERE handle = ?1", params![from_handle], |r| r.get(0))?,
      tx.query_row("SELECT weix_bucks FROM users WHERE handle = ?1", params![to_handle], |r| r.get(0))?,
    );

    tx.commit()?;
    Ok((sender_new, receiver_new))
  }

  pub fn evaluate_withdraw_eligibility(
    &self,
    handle: &str,
    amount_wb: Option<i64>,
  ) -> Result<WithdrawEligibility> {
    let conn = self.conn.lock().unwrap();
    let user = conn
      .query_row(
        &format!("{USER_SELECT} WHERE handle = ?1"),
        params![handle],
        map_user_row,
      )
      .map_err(|_| {
        rusqlite::Error::InvalidParameterName(format!("User not found: {handle}"))
      })?;

    let account_age_days = parse_db_timestamp(&user.created_at)
      .map(|created| {
        let elapsed = chrono::Utc::now().signed_duration_since(created);
        elapsed.num_days().max(0)
      })
      .unwrap_or(0);

    let total_karma = user.post_karma + user.comment_karma;

    let post_count: i64 = conn.query_row(
      "SELECT COUNT(*) FROM posts WHERE author_handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;

    let weekly_withdrawn_wb: i64 = conn.query_row(
      "SELECT COALESCE(SUM(ABS(amount)), 0) FROM wallet_tx
       WHERE user_handle = ?1
         AND description LIKE ?2
         AND datetime(created_at) >= datetime('now', '-7 days')",
      params![handle, format!("{WITHDRAW_TX_PREFIX}%")],
      |r| r.get(0),
    )?;

    let weekly_remaining_wb = (WEEKLY_WITHDRAW_CAP_WB - weekly_withdrawn_wb).max(0);

    let days_until_next_withdraw: i64 = conn
      .query_row(
        "SELECT created_at FROM wallet_tx
         WHERE user_handle = ?1 AND description LIKE ?2
         ORDER BY datetime(created_at) DESC LIMIT 1",
        params![handle, format!("{WITHDRAW_TX_PREFIX}%")],
        |r| r.get::<_, String>(0),
      )
      .ok()
      .and_then(|ts| parse_db_timestamp(&ts))
      .map(|last| {
        let elapsed = chrono::Utc::now().signed_duration_since(last);
        let days_since = elapsed.num_days().max(0);
        (WITHDRAW_COOLDOWN_DAYS - days_since).max(0)
      })
      .unwrap_or(0);

    let mut reasons = Vec::new();

    if account_age_days < MIN_ACCOUNT_AGE_DAYS {
      reasons.push(format!(
        "Account must be at least {MIN_ACCOUNT_AGE_DAYS} days old ({account_age_days} days so far)"
      ));
    }
    if total_karma < MIN_WITHDRAW_KARMA {
      reasons.push(format!(
        "Need at least {MIN_WITHDRAW_KARMA} total karma ({total_karma} now)"
      ));
    }
    if post_count < MIN_WITHDRAW_POSTS {
      reasons.push(format!(
        "Need at least {MIN_WITHDRAW_POSTS} posts ({post_count} now)"
      ));
    }
    if days_until_next_withdraw > 0 {
      reasons.push(format!(
        "Withdrawal cooldown: wait {days_until_next_withdraw} more day(s)"
      ));
    }
    if weekly_remaining_wb == 0 {
      reasons.push(format!(
        "Weekly withdrawal cap reached ({WEEKLY_WITHDRAW_CAP_WB} WB per 7 days)"
      ));
    }

    if let Some(amount) = amount_wb {
      if amount < MIN_WITHDRAW_WB {
        reasons.push(format!("Minimum withdrawal is {MIN_WITHDRAW_WB} WB"));
      }
      if amount > user.weix_bucks {
        reasons.push("Insufficient WeixBucks balance".into());
      }
      if amount > weekly_remaining_wb {
        reasons.push(format!(
          "Amount exceeds weekly remaining allowance ({weekly_remaining_wb} WB left)"
        ));
      }
    }

    let eligible = reasons.is_empty();

    Ok(WithdrawEligibility {
      eligible,
      reasons,
      min_amount_wb: MIN_WITHDRAW_WB,
      weekly_cap_wb: WEEKLY_WITHDRAW_CAP_WB,
      weekly_withdrawn_wb,
      weekly_remaining_wb,
      cooldown_days: WITHDRAW_COOLDOWN_DAYS,
      days_until_next_withdraw,
      account_age_days,
      min_account_age_days: MIN_ACCOUNT_AGE_DAYS,
      total_karma,
      min_karma: MIN_WITHDRAW_KARMA,
      post_count,
      min_posts: MIN_WITHDRAW_POSTS,
      balance_wb: user.weix_bucks,
      wb_to_blk_ratio: WB_TO_BLK_RATIO,
      on_chain_ready: false,
    })
  }

  #[cfg(test)]
  pub fn test_backdate_user_created_at(&self, handle: &str, days_ago: i64) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET created_at = datetime('now', ?1) WHERE handle = ?2",
      params![format!("-{days_ago} days"), handle],
    )?;
    Ok(())
  }

  #[cfg(test)]
  pub fn test_set_weix_bucks(&self, handle: &str, amount: i64) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET weix_bucks = ?1 WHERE handle = ?2",
      params![amount, handle],
    )?;
    Ok(())
  }

  pub fn deduct_weix_bucks(&self, handle: &str, amount: i64, description: &str) -> Result<i64> {
    if amount <= 0 {
      return Err(rusqlite::Error::InvalidParameterName("Amount must be positive".into()));
    }
    let conn = self.conn.lock().unwrap();
    let tx = conn.unchecked_transaction()?;

    let current_bucks: i64 = tx.query_row(
      "SELECT weix_bucks FROM users WHERE handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    if current_bucks < amount {
      return Err(rusqlite::Error::InvalidParameterName("Insufficient WeixBucks".into()));
    }

    tx.execute(
      "UPDATE users SET weix_bucks = weix_bucks - ?1 WHERE handle = ?2",
      params![amount, handle],
    )?;

    tx.execute(
      "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
       SELECT ?1, 'spend', -?2, ?3, weix_bucks FROM users WHERE handle = ?1",
      params![handle, amount, description],
    )?;

    let balance_new: i64 = tx.query_row(
      "SELECT weix_bucks FROM users WHERE handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;

    tx.commit()?;
    Ok(balance_new)
  }

  pub fn insert_blob(&self, hash: &str, cid: Option<&str>, filename: &str, mime_type: &str, file_size: i64, uploader_handle: &str) -> Result<(BlobRecord, bool)> {
    let conn = self.conn.lock().unwrap();
    let changed = conn.execute(
      "INSERT OR IGNORE INTO blobs (hash, cid, filename, mime_type, file_size, uploader_handle) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
      params![hash, cid, filename, mime_type, file_size, uploader_handle],
    )?;
    let is_new = changed > 0;
    let id = if is_new { conn.last_insert_rowid() } else {
      conn.query_row("SELECT id FROM blobs WHERE hash = ?1", params![hash], |r| r.get(0))?
    };
    let created_at: String = conn.query_row(
      "SELECT COALESCE(created_at, datetime('now')) FROM blobs WHERE id = ?1",
      params![id],
      |r| r.get(0),
    ).unwrap_or_else(|_| chrono::Utc::now().to_rfc3339());
    Ok((BlobRecord { id, hash: hash.to_string(), cid: cid.map(|c| c.to_string()), filename: filename.to_string(), mime_type: mime_type.to_string(), file_size, uploader_handle: uploader_handle.to_string(), created_at }, is_new))
  }

  pub fn get_blob_record(&self, hash: &str) -> Result<Option<BlobRecord>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, hash, cid, filename, mime_type, file_size, uploader_handle, created_at FROM blobs WHERE hash = ?1"
    )?;
    let mut rows = stmt.query(params![hash])?;
    match rows.next()? {
      Some(row) => Ok(Some(BlobRecord {
        id: row.get(0)?,
        hash: row.get(1)?,
        cid: row.get(2)?,
        filename: row.get(3)?,
        mime_type: row.get(4)?,
        file_size: row.get(5)?,
        uploader_handle: row.get(6)?,
        created_at: row.get(7)?,
      })),
      None => Ok(None),
    }
  }

  pub fn list_user_blobs(&self, uploader_handle: &str) -> Result<Vec<BlobRecord>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, hash, cid, filename, mime_type, file_size, uploader_handle, created_at FROM blobs WHERE uploader_handle = ?1 ORDER BY created_at DESC"
    )?;
    let rows = stmt.query_map(params![uploader_handle], |row| {
      Ok(BlobRecord {
        id: row.get(0)?,
        hash: row.get(1)?,
        cid: row.get(2)?,
        filename: row.get(3)?,
        mime_type: row.get(4)?,
        file_size: row.get(5)?,
        uploader_handle: row.get(6)?,
        created_at: row.get(7)?,
      })
    })?;
    let mut blobs = Vec::new();
    for row in rows {
      blobs.push(row?);
    }
    Ok(blobs)
  }

  pub fn delete_blob_record(&self, hash: &str, uploader_handle: &str) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    let affected = conn.execute(
      "DELETE FROM blobs WHERE hash = ?1 AND uploader_handle = ?2",
      params![hash, uploader_handle],
    )?;
    Ok(affected > 0)
  }

  pub fn blob_hash_exists(&self, hash: &str) -> bool {
    self.conn.lock().unwrap().query_row(
      "SELECT 1 FROM blobs WHERE hash = ?1",
      params![hash],
      |_| Ok(()),
    ).is_ok()
  }

  pub fn get_network_stats(&self) -> Result<NetworkStats> {
    let conn = self.conn.lock().unwrap();
    let total_users: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))?;
    let active_towns: i64 = conn.query_row(
      "SELECT COUNT(DISTINCT town) FROM users WHERE town != ''",
      [],
      |r| r.get(0),
    )?;
    let total_bucks: i64 = conn.query_row(
      "SELECT COALESCE(SUM(weix_bucks), 0) FROM users",
      [],
      |r| r.get(0),
    )?;
    let events: i64 = conn.query_row(
      "SELECT COUNT(*) FROM posts WHERE created_at >= datetime('now', '-1 day')",
      [],
      |r| r.get(0),
    )?;
    Ok(NetworkStats {
      online_relays: 5,
      total_relays: 7,
      total_users,
      active_towns,
      weix_bucks_in_circulation: total_bucks,
      events_last_24h: events + 50,
    })
  }

  pub fn list_relays(&self) -> Result<Vec<Relay>> {
    Ok(vec![
      Relay { id: 1, name: "TSU Main Relay".into(), university: "Tennessee State University".into(), town: "Nashville, TN".into(), status: "online".into(), uptime_percent: 99.8, connected_peers: 42, events_per_hour: 1234 },
      Relay { id: 2, name: "Howard Alpha".into(), university: "Howard University".into(), town: "Washington, DC".into(), status: "online".into(), uptime_percent: 99.2, connected_peers: 38, events_per_hour: 987 },
      Relay { id: 3, name: "Spelman Gateway".into(), university: "Spelman College".into(), town: "Atlanta, GA".into(), status: "online".into(), uptime_percent: 98.5, connected_peers: 31, events_per_hour: 876 },
      Relay { id: 4, name: "FAMU Hub".into(), university: "Florida A&M University".into(), town: "Tallahassee, FL".into(), status: "online".into(), uptime_percent: 97.1, connected_peers: 45, events_per_hour: 1567 },
      Relay { id: 5, name: "Morehouse Node".into(), university: "Morehouse College".into(), town: "Atlanta, GA".into(), status: "degraded".into(), uptime_percent: 89.3, connected_peers: 22, events_per_hour: 543 },
    ])
  }

  pub fn get_recent_activity(&self) -> Result<Vec<serde_json::Value>> {
    Ok(vec![
      serde_json::json!({"id": 1, "type": "post", "description": "New post in TSU Yard", "town": "TSU", "userHandle": "demo_user", "createdAt": "2026-06-15T12:00:00"}),
      serde_json::json!({"id": 2, "type": "like", "description": "Post liked in Howard Yard", "town": "Howard", "userHandle": "jane_doe", "createdAt": "2026-06-15T11:45:00"}),
      serde_json::json!({"id": 3, "type": "relay", "description": "FAMU Hub connected", "town": "FAMU", "userHandle": null, "createdAt": "2026-06-15T11:30:00"}),
      serde_json::json!({"id": 4, "type": "follow", "description": "New follower", "town": "Spelman", "userHandle": "hbcustudent", "createdAt": "2026-06-15T11:15:00"}),
    ])
  }

  pub fn get_communities(&self) -> Vec<Community> {
    vec![
      Community { id: "tsu".into(), name: "TSU Yard".into(), school: "Tennessee State University".into(), location: "Nashville, TN".into(), description: "The official TSU community. Home of the Tigers.".into(), members: 2847, color: "from-blue-600 to-blue-800".into() },
      Community { id: "howard".into(), name: "Howard Yard".into(), school: "Howard University".into(), location: "Washington, DC".into(), description: "Howard University's digital yard. The Mecca of HBCU culture.".into(), members: 4521, color: "from-red-600 to-red-800".into() },
      Community { id: "spelman".into(), name: "Spelman Yard".into(), school: "Spelman College".into(), location: "Atlanta, GA".into(), description: "Spelman College community. Where Black women lead.".into(), members: 3190, color: "from-green-600 to-green-800".into() },
      Community { id: "famu".into(), name: "FAMU Yard".into(), school: "Florida A&M University".into(), location: "Tallahassee, FL".into(), description: "Florida A&M — the largest HBCU by enrollment.".into(), members: 5632, color: "from-orange-500 to-orange-700".into() },
      Community { id: "morehouse".into(), name: "Morehouse Yard".into(), school: "Morehouse College".into(), location: "Atlanta, GA".into(), description: "Morehouse College. Building Black men who lead.".into(), members: 2904, color: "from-purple-600 to-purple-800".into() },
    ]
  }

  pub fn create_channel(&self, community_id: &str, id: &str, name: &str, description: &str) -> Result<Channel> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT OR IGNORE INTO channels (id, community_id, name, description) VALUES (?1, ?2, ?3, ?4)",
      params![id, community_id, name, description],
    )?;
    Ok(Channel {
      id: id.to_string(),
      community_id: community_id.to_string(),
      name: name.to_string(),
      description: description.to_string(),
    })
  }

  pub fn list_channels(&self, community_id: &str) -> Vec<Channel> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = match conn.prepare("SELECT id, community_id, name, description FROM channels WHERE community_id = ?1 ORDER BY created_at, id") {
      Ok(s) => s,
      Err(_) => return self.seed_channels_for_community(community_id),
    };
    let rows = match stmt.query_map(params![community_id], |row| {
      Ok(Channel {
        id: row.get(0)?,
        community_id: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
      })
    }) {
      Ok(r) => r,
      Err(_) => return self.seed_channels_for_community(community_id),
    };
    let mut chs: Vec<Channel> = rows.filter_map(|r| r.ok()).collect();
    if chs.is_empty() {
      chs = self.seed_channels_for_community(community_id);
      // seed into table for future
      for c in &chs {
        let _ = conn.execute(
          "INSERT OR IGNORE INTO channels (id, community_id, name, description) VALUES (?1, ?2, ?3, ?4)",
          params![c.id, c.community_id, c.name, c.description],
        );
      }
    }
    chs
  }

  fn seed_channels_for_community(&self, community_id: &str) -> Vec<Channel> {
    match community_id {
      "tsu" => vec![
        Channel { id: "general".into(), community_id: "tsu".into(), name: "#general".into(), description: "General discussion".into() },
        Channel { id: "events".into(), community_id: "tsu".into(), name: "#events".into(), description: "Campus events and parties".into() },
        Channel { id: "music".into(), community_id: "tsu".into(), name: "#music".into(), description: "DJ mixes and tunes".into() },
        Channel { id: "study".into(), community_id: "tsu".into(), name: "#study-hall".into(), description: "Study groups and academics".into() },
      ],
      "howard" => vec![
        Channel { id: "general".into(), community_id: "howard".into(), name: "#general".into(), description: "General discussion".into() },
        Channel { id: "events".into(), community_id: "howard".into(), name: "#events".into(), description: "Campus events".into() },
        Channel { id: "music".into(), community_id: "howard".into(), name: "#music".into(), description: "Music and mixes".into() },
      ],
      _ => vec![
        Channel { id: "general".into(), community_id: community_id.into(), name: "#general".into(), description: "General yard chat".into() },
        Channel { id: "events".into(), community_id: community_id.into(), name: "#events".into(), description: "Events".into() },
      ],
    }
  }

  // ─── Relay Event Methods ────────────────────────────────

  pub fn insert_relay_event(&self, event_id: &str, relay_url: &str, kind: i64, pubkey: &str, content: &str, tags: &str, created_at_unix: i64) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    let changed = conn.execute(
      "INSERT OR IGNORE INTO relay_events (event_id, relay_url, kind, pubkey, content, tags, created_at_unix) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
      params![event_id, relay_url, kind, pubkey, content, tags, created_at_unix],
    )?;
    Ok(changed > 0)
  }

  pub fn list_relay_events(&self, limit: i64, kind_filter: Option<i64>) -> Result<Vec<RelayEventRecord>> {
    let conn = self.conn.lock().unwrap();
    let (sql, has_kind) = if kind_filter.is_some() {
      ("SELECT id, event_id, relay_url, kind, pubkey, content, tags, created_at_unix, first_seen FROM relay_events WHERE kind = ?1 ORDER BY created_at_unix DESC LIMIT ?2", true)
    } else {
      ("SELECT id, event_id, relay_url, kind, pubkey, content, tags, created_at_unix, first_seen FROM relay_events ORDER BY created_at_unix DESC LIMIT ?1", false)
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = if has_kind {
      stmt.query_map(params![kind_filter.unwrap(), limit], Self::map_relay_event_row)?
    } else {
      stmt.query_map(params![limit], Self::map_relay_event_row)?
    };
    let mut events = Vec::new();
    for row in rows {
      events.push(row?);
    }
    Ok(events)
  }

  pub fn count_relay_events_since(&self, since_unix: i64) -> Result<i64> {
    let conn = self.conn.lock().unwrap();
    conn.query_row(
      "SELECT COUNT(*) FROM relay_events WHERE created_at_unix >= ?1",
      params![since_unix],
      |r| r.get(0),
    )
  }

  pub fn list_relay_events_by_pubkey(&self, pubkey: &str, limit: i64) -> Result<Vec<RelayEventRecord>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, event_id, relay_url, kind, pubkey, content, tags, created_at_unix, first_seen FROM relay_events WHERE pubkey = ?1 ORDER BY created_at_unix DESC LIMIT ?2"
    )?;
    let rows = stmt.query_map(params![pubkey, limit], Self::map_relay_event_row)?;
    let mut events = Vec::new();
    for row in rows {
      events.push(row?);
    }
    Ok(events)
  }

  /// List relay events with consensus validation status
  /// Returns events with additional consensus info: relay_count, consensus_valid
  pub fn list_relay_events_with_consensus(&self, limit: i64, kind_filter: Option<i64>, min_relays: usize) -> Result<Vec<serde_json::Value>> {
    let events = self.list_relay_events(limit, kind_filter)?;
    let mut results = Vec::new();
    for event in events {
      let (total, unique, agreement) = self.get_relay_consensus_stats(&event.event_id)?;
      let consensus_valid = self.validate_relay_consensus(&event.event_id, min_relays).unwrap_or(false);
      results.push(serde_json::json!({
        "id": event.id,
        "eventId": event.event_id,
        "relayUrl": event.relay_url,
        "kind": event.kind,
        "pubkey": event.pubkey,
        "content": event.content,
        "tags": event.tags,
        "createdAtUnix": event.created_at_unix,
        "firstSeen": event.first_seen,
        "consensus": {
          "totalSightings": total,
          "uniqueHashes": unique,
          "agreementPercent": agreement,
          "consensusValid": consensus_valid,
        }
      }));
    }
    Ok(results)
  }

  pub fn upsert_relay_connection(&self, url: &str, name: &str, town: &str, status: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO relay_connections (url, name, town, status, connected_at) VALUES (?1, ?2, ?3, ?4, datetime('now'))
       ON CONFLICT(url) DO UPDATE SET status = ?4, name = ?2, town = ?3, connected_at = datetime('now')",
      params![url, name, town, status],
    )?;
    Ok(())
  }

  pub fn list_relay_connections(&self) -> Result<Vec<RelayConnectionRecord>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, url, name, town, status, connected_at, created_at FROM relay_connections ORDER BY created_at DESC"
    )?;
    let rows = stmt.query_map([], |row| {
      Ok(RelayConnectionRecord {
        id: row.get(0)?,
        url: row.get(1)?,
        name: row.get(2)?,
        town: row.get(3)?,
        status: row.get(4)?,
        connected_at: row.get(5)?,
        created_at: row.get(6)?,
      })
    })?;
    let mut connections = Vec::new();
    for row in rows {
      connections.push(row?);
    }
    Ok(connections)
  }

  fn map_relay_event_row(row: &rusqlite::Row) -> rusqlite::Result<RelayEventRecord> {
    Ok(RelayEventRecord {
      id: row.get(0)?,
      event_id: row.get(1)?,
      relay_url: row.get(2)?,
      kind: row.get(3)?,
      pubkey: row.get(4)?,
      content: row.get(5)?,
      tags: row.get(6)?,
      created_at_unix: row.get(7)?,
      first_seen: row.get(8)?,
    })
  }

  pub fn update_post_nostr_meta(&self, post_id: i64, nostr_event_id: &str, relay_url: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE posts SET nostr_event_id = ?1, relay_url = ?2 WHERE id = ?3",
      params![nostr_event_id, relay_url, post_id],
    )?;
    Ok(())
  }

  pub fn list_combined_feed(&self, town: Option<&str>, _current_user: Option<&str>) -> Result<Vec<CrossTownEvent>> {
    const MIN_RELAYS: usize = 2;

    let town_filter = if let Some(t) = town {
      format!("%hbcu-town:{}%", t)
    } else {
      "%hbcu-town%".to_string()
    };

    let events: Vec<CrossTownEvent> = {
      let conn = self.conn.lock().unwrap();
      let mut stmt = conn.prepare(
        "SELECT 'relay_' || id as id, event_id, pubkey, content, tags, relay_url, created_at_unix
         FROM relay_events
         WHERE kind = 1
           AND tags LIKE ?1
         ORDER BY created_at_unix DESC
         LIMIT 100"
      )?;
      let rows = stmt.query_map(params![&town_filter], |row| {
        let tags_json: String = row.get::<_, String>(4).unwrap_or_default();
        let town_tag = Self::extract_town_tag(&tags_json);
        let created_at = chrono::DateTime::from_timestamp(row.get::<_, i64>(6).unwrap_or(0), 0)
          .map(|dt| dt.to_rfc3339())
          .unwrap_or_default();
        Ok(CrossTownEvent {
          id: row.get(0)?,
          event_id: row.get(1)?,
          pubkey: row.get(2)?,
          content: row.get(3)?,
          town_tag,
          relay_url: row.get(5)?,
          created_at_unix: row.get(6)?,
          created_at,
          consensus_valid: false,
          consensus_agreement: 0.0,
          malicious_score: 0.0,
          risk_level: "low".to_string(),
        })
      })?;
      let mut events = Vec::new();
      for row in rows {
        events.push(row?);
      }
      events
    };

    let mut filtered = Vec::new();
    for mut event in events {
      let consensus_valid = self
        .validate_relay_consensus(&event.event_id, MIN_RELAYS)
        .unwrap_or(false);
      if !consensus_valid {
        continue;
      }
      let (_, _, agreement) = self
        .get_relay_consensus_stats(&event.event_id)
        .unwrap_or((0, 0, 0.0));
      event.consensus_valid = true;
      event.consensus_agreement = agreement;
      if let Ok(Some(user)) = self.get_user_by_pubkey(&event.pubkey) {
        let mal: f64 = {
          let conn = self.conn.lock().unwrap();
          conn.query_row(
            "SELECT overall_score FROM malicious_intent_scores WHERE handle = ?1",
            params![user.handle],
            |r| r.get(0),
          )
          .unwrap_or(0.0)
        };
        event.malicious_score = mal;
        event.risk_level = Self::risk_level_from_score(mal);
      }
      filtered.push(event);
    }

    Ok(filtered)
  }

  pub fn list_relay_events_by_kind_and_pubkey(&self, kind: i64, pubkey: &str, limit: i64) -> Result<Vec<RelayEventRecord>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, event_id, relay_url, kind, pubkey, content, tags, created_at_unix, first_seen
       FROM relay_events WHERE kind = ?1 AND pubkey = ?2
       ORDER BY created_at_unix DESC LIMIT ?3"
    )?;
    let rows = stmt.query_map(params![kind, pubkey, limit], Self::map_relay_event_row)?;
    let mut events = Vec::new();
    for row in rows {
      events.push(row?);
    }
    Ok(events)
  }

  pub fn get_relay_list_from_tags(&self, pubkey: &str) -> Vec<String> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT tags FROM relay_events WHERE kind = 10002 AND pubkey = ?1 ORDER BY created_at_unix DESC LIMIT 1"
    ).unwrap();
    let mut rows = stmt.query(params![pubkey]).unwrap();
    if let Some(row) = rows.next().unwrap() {
      let tags_json: String = row.get::<_, String>(0).unwrap_or_default();
      let tags: Vec<Vec<String>> = serde_json::from_str(&tags_json).unwrap_or_default();
      tags.into_iter()
        .filter(|t| t.len() >= 2 && t[0] == "r")
        .map(|t| t[1].clone())
        .collect()
    } else {
      vec![]
    }
  }

  fn extract_town_tag(tags_json: &str) -> String {
    if let Ok(tags) = serde_json::from_str::<Vec<Vec<String>>>(tags_json) {
      for tag in &tags {
        if tag.len() >= 2 && tag[0] == "t" {
          let val = &tag[1];
          if val.starts_with("hbcu-town:") {
            return val["hbcu-town:".len()..].to_string();
          }
          return val.clone();
        }
      }
    }
    String::new()
  }

  fn hbcu_town_from_tags(tags_json: &str) -> Option<String> {
    if let Ok(tags) = serde_json::from_str::<Vec<Vec<String>>>(tags_json) {
      for tag in &tags {
        if tag.len() >= 2 && tag[0] == "t" {
          let val = &tag[1];
          if val.starts_with("hbcu-town:") && val.len() > "hbcu-town:".len() {
            return Some(val["hbcu-town:".len()..].to_string());
          }
        }
      }
    }
    None
  }

  /// Social kinds must carry `t:hbcu-town:<id>`; town relays may reject foreign towns.
  pub fn validate_relay_event_tags(&self, kind: i64, tags_json: &str, relay_town: Option<&str>) -> bool {
    const SOCIAL_KINDS: &[i64] = &[1, 6, 7];
    if !SOCIAL_KINDS.contains(&kind) {
      return true;
    }
    let town = match Self::hbcu_town_from_tags(tags_json) {
      Some(t) => t,
      None => return false,
    };
    if let Some(rt) = relay_town {
      if !rt.is_empty() && town != rt {
        return false;
      }
    }
    true
  }

  pub fn get_relay_town_by_url(&self, url: &str) -> Result<Option<String>> {
    let conn = self.conn.lock().unwrap();
    let town: Option<String> = conn
      .query_row(
        "SELECT town FROM relay_connections WHERE url = ?1",
        params![url],
        |r| r.get(0),
      )
      .ok();
    Ok(town.filter(|t| !t.is_empty()))
  }

  pub fn get_user_posts(&self, handle: &str, current_user: Option<&str>) -> Result<Vec<Post>> {
    let mut posts = {
      let conn = self.conn.lock().unwrap();
      let mut stmt = conn.prepare(
      "SELECT p.id, p.author_handle, u.display_name, u.avatar_url, p.content, p.town_tag, p.channel_id,
              p.replies_count, p.reposts_count, p.likes_count,
              CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as liked,
              p.media_blobs, COALESCE(p.nostr_event_id, ''), COALESCE(p.relay_url, ''), p.created_at
       FROM posts p
       JOIN users u ON u.handle = p.author_handle
       LEFT JOIN likes l ON l.post_id = p.id AND l.user_handle = ?2
       WHERE p.author_handle = ?1
       ORDER BY p.created_at DESC"
    )?;
    let rows = stmt.query_map(params![handle, current_user.unwrap_or("")], |row| {
      Ok(Post {
        id: row.get(0)?,
        author_handle: row.get(1)?,
        author_display_name: row.get(2)?,
        author_avatar_url: row.get(3)?,
        content: row.get(4)?,
        town_tag: row.get(5)?,
        channel_id: row.get(6).unwrap_or_default(),
        replies_count: row.get(7)?,
        reposts_count: row.get(8)?,
        likes_count: row.get(9)?,
        liked: row.get::<_, i64>(10)? != 0,
        media_blobs: serde_json::from_str(&row.get::<_, String>(11).unwrap_or_default()).unwrap_or_default(),
        nostr_event_id: row.get::<_, String>(12).unwrap_or_default(),
        relay_url: row.get::<_, String>(13).unwrap_or_default(),
        created_at: row.get(14)?,
        engagement_quality: 1.0,
        malicious_score: 0.0,
        risk_level: "low".to_string(),
      })
    })?;
      let mut posts = Vec::new();
      for row in rows {
        posts.push(row?);
      }
      posts
    };
    self.enrich_posts_security(&mut posts);
    Ok(posts)
  }

  pub fn get_trending_feed(&self, current_user: Option<&str>) -> Result<Vec<Post>> {
    self.list_posts(None, current_user)
  }

  pub fn list_posts_for_channel(&self, channel_id: &str, current_user: Option<&str>) -> Result<Vec<Post>> {
    let sql = "SELECT p.id, p.author_handle, u.display_name, u.avatar_url, p.content, p.town_tag, p.channel_id,
              p.replies_count, p.reposts_count, p.likes_count,
              CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as liked,
              p.media_blobs, COALESCE(p.nostr_event_id, ''), COALESCE(p.relay_url, ''), p.created_at
       FROM posts p
       JOIN users u ON u.handle = p.author_handle
       LEFT JOIN likes l ON l.post_id = p.id AND l.user_handle = ?2
       WHERE p.channel_id = ?1
       ORDER BY p.created_at DESC";

    fn parse_media_blobs(json: &str) -> Vec<String> {
      serde_json::from_str(json).unwrap_or_default()
    }

    let mut posts = {
      let conn = self.conn.lock().unwrap();
      let mut stmt = conn.prepare(sql)?;
      let rows = stmt.query_map(params![channel_id, current_user.unwrap_or("")], |row| {
        Ok(Post {
          id: row.get(0)?,
          author_handle: row.get(1)?,
          author_display_name: row.get(2)?,
          author_avatar_url: row.get(3)?,
          content: row.get(4)?,
          town_tag: row.get(5)?,
          channel_id: row.get(6).unwrap_or_default(),
          replies_count: row.get(7)?,
          reposts_count: row.get(8)?,
          likes_count: row.get(9)?,
          liked: row.get::<_, i64>(10)? != 0,
          media_blobs: parse_media_blobs(&row.get::<_, String>(11).unwrap_or_default()),
          nostr_event_id: row.get::<_, String>(12).unwrap_or_default(),
          relay_url: row.get::<_, String>(13).unwrap_or_default(),
          created_at: row.get(14)?,
          engagement_quality: 1.0,
          malicious_score: 0.0,
          risk_level: "low".to_string(),
        })
      })?;
      let mut posts = Vec::new();
      for row in rows {
        posts.push(row?);
      }
      posts
    };
    self.enrich_posts_security(&mut posts);
    Ok(posts)
  }

  // ─── Blob Pinning ─────────────────────────────────────

  pub fn increment_blob_access(&self, hash: &str) -> Result<i64> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO blob_pins (hash, pinned_by, access_count) VALUES (?1, 'system', 1)
       ON CONFLICT(hash, pinned_by) DO UPDATE SET
       access_count = access_count + 1,
       last_accessed = datetime('now')",
      params![hash],
    )?;
    let count: i64 = conn.query_row(
      "SELECT access_count FROM blob_pins WHERE hash = ?1 AND pinned_by = 'system'",
      params![hash],
      |r| r.get(0),
    )?;
    Ok(count)
  }

  pub fn should_pin(&self, hash: &str) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    let count: i64 = conn.query_row(
      "SELECT COALESCE(access_count, 0) FROM blob_pins WHERE hash = ?1 AND pinned_by = 'system'",
      params![hash],
      |r| r.get(0),
    ).unwrap_or(0);
    Ok(count > 10)
  }

  pub fn pin_blob(&self, hash: &str, pinned_by: &str) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    let changed = conn.execute(
      "INSERT INTO blob_pins (hash, pinned_by, access_count) VALUES (?1, ?2, 0)
       ON CONFLICT(hash, pinned_by) DO NOTHING",
      params![hash, pinned_by],
    )?;
    Ok(changed > 0)
  }

  pub fn is_pinned(&self, hash: &str, pinned_by: &str) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    let count: i64 = conn.query_row(
      "SELECT COUNT(*) FROM blob_pins WHERE hash = ?1 AND pinned_by = ?2",
      params![hash, pinned_by],
      |r| r.get(0),
    )?;
    Ok(count > 0)
  }

  pub fn list_pinned_blobs(&self, pinned_by: &str) -> Result<Vec<String>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT hash FROM blob_pins WHERE pinned_by = ?1 ORDER BY last_accessed DESC"
    )?;
    let rows = stmt.query_map(params![pinned_by], |row| {
      row.get::<_, String>(0)
    })?;
    let mut hashes = Vec::new();
    for row in rows {
      hashes.push(row?);
    }
    Ok(hashes)
  }

  // ─── Pin Serve Rewards ──────────────────────────────────

  pub fn record_pin_serve(&self, hash: &str, served_by: &str, served_to: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO pin_serves (hash, served_by, served_to) VALUES (?1, ?2, ?3)",
      params![hash, served_by, served_to],
    )?;
    Ok(())
  }

  pub fn count_serves_today(&self, served_by: &str) -> Result<i64> {
    let conn = self.conn.lock().unwrap();
    let count: i64 = conn.query_row(
      "SELECT COUNT(*) FROM pin_serves WHERE served_by = ?1 AND date(created_at) = date('now')",
      params![served_by],
      |r| r.get(0),
    )?;
    Ok(count)
  }

  pub fn count_serves_for_blob(&self, hash: &str) -> Result<i64> {
    let conn = self.conn.lock().unwrap();
    let count: i64 = conn.query_row(
      "SELECT COUNT(*) FROM pin_serves WHERE hash = ?1",
      params![hash],
      |r| r.get(0),
    )?;
    Ok(count)
  }

  // ─── Offline Cache ──────────────────────────────────────

  pub fn add_to_offline_cache(&self, hash: &str, cached_by: &str, content_type: &str, source: &str) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    let changed = conn.execute(
      "INSERT INTO offline_cache (hash, cached_by, content_type, source) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(hash, cached_by) DO NOTHING",
      params![hash, cached_by, content_type, source],
    )?;
    Ok(changed > 0)
  }

  pub fn remove_from_offline_cache(&self, hash: &str, cached_by: &str) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    let affected = conn.execute(
      "DELETE FROM offline_cache WHERE hash = ?1 AND cached_by = ?2",
      params![hash, cached_by],
    )?;
    Ok(affected > 0)
  }

  pub fn list_offline_cache(&self, cached_by: &str) -> Result<Vec<String>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT hash FROM offline_cache WHERE cached_by = ?1 ORDER BY created_at DESC"
    )?;
    let rows = stmt.query_map(params![cached_by], |row| {
      row.get::<_, String>(0)
    })?;
    let mut hashes = Vec::new();
    for row in rows {
      hashes.push(row?);
    }
    Ok(hashes)
  }

  pub fn is_cached_offline(&self, hash: &str, cached_by: &str) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    let count: i64 = conn.query_row(
      "SELECT COUNT(*) FROM offline_cache WHERE hash = ?1 AND cached_by = ?2",
      params![hash, cached_by],
      |r| r.get(0),
    )?;
    Ok(count > 0)
  }

  // ─── Cross-Device Sync ──────────────────────────────────

  pub fn get_user_media_hashes(&self, handle: &str) -> Result<Vec<String>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT DISTINCT b.hash FROM blobs b
       JOIN posts p ON p.author_handle = ?1
       WHERE b.uploader_handle = ?1
       UNION
       SELECT DISTINCT json_each.value FROM posts p, json_each(p.media_blobs)
       WHERE p.author_handle = ?1 AND json_each.value IS NOT NULL"
    )?;
    let rows = stmt.query_map(params![handle], |row| {
      row.get::<_, String>(0)
    })?;
    let mut hashes = Vec::new();
    for row in rows {
      hashes.push(row?);
    }
    Ok(hashes)
  }

  // ─── Node Role Management ───────────────────────────────

  pub fn set_node_role(&self, handle: &str, role: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET node_role = ?1 WHERE handle = ?2",
      params![role, handle],
    )?;
    Ok(())
  }

  pub fn get_node_role(&self, handle: &str) -> Result<String> {
    let conn = self.conn.lock().unwrap();
    let role: String = conn.query_row(
      "SELECT COALESCE(node_role, '') FROM users WHERE handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    Ok(role)
  }

  pub fn set_community_role(&self, community_id: &str, handle: &str, role: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT OR REPLACE INTO community_roles (community_id, handle, role) VALUES (?1, ?2, ?3)",
      params![community_id, handle, role],
    )?;
    Ok(())
  }

  pub fn get_community_role(&self, community_id: &str, handle: &str) -> Result<String> {
    let conn = self.conn.lock().unwrap();
    let role: String = conn.query_row(
      "SELECT COALESCE(role, 'Student') FROM community_roles WHERE community_id = ?1 AND handle = ?2",
      params![community_id, handle],
      |r| r.get(0),
    ).unwrap_or_else(|_| "Student".to_string());
    Ok(role)
  }

  pub fn list_community_roles(&self, community_id: &str) -> Result<Vec<CommunityRoleEntry>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT handle, role FROM community_roles WHERE community_id = ?1 ORDER BY role, handle"
    )?;
    let rows = stmt.query_map(params![community_id], |row| {
      Ok(CommunityRoleEntry {
        handle: row.get(0)?,
        role: row.get(1)?,
      })
    })?;
    let mut res = vec![];
    for r in rows {
      res.push(r?);
    }
    Ok(res)
  }

  pub fn toggle_follow(&self, follower: &str, followed: &str) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    // Check if already following
    let exists: i64 = conn.query_row(
      "SELECT COUNT(1) FROM follows WHERE follower_handle = ?1 AND followed_handle = ?2",
      params![follower, followed],
      |r| r.get(0),
    ).unwrap_or(0);
    if exists > 0 {
      // Unfollow
      conn.execute(
        "DELETE FROM follows WHERE follower_handle = ?1 AND followed_handle = ?2",
        params![follower, followed],
      )?;
      // Update counts (best effort)
      let _ = conn.execute("UPDATE users SET following_count = MAX(0, following_count - 1) WHERE handle = ?1", params![follower]);
      let _ = conn.execute("UPDATE users SET followers_count = MAX(0, followers_count - 1) WHERE handle = ?1", params![followed]);
      Ok(false)
    } else {
      // Follow
      conn.execute(
        "INSERT OR IGNORE INTO follows (follower_handle, followed_handle) VALUES (?1, ?2)",
        params![follower, followed],
      )?;
      let _ = conn.execute("UPDATE users SET following_count = following_count + 1 WHERE handle = ?1", params![follower]);
      let _ = conn.execute("UPDATE users SET followers_count = followers_count + 1 WHERE handle = ?1", params![followed]);
      Ok(true)
    }
  }

  pub fn get_following_for(&self, follower: &str) -> Result<Vec<String>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT followed_handle FROM follows WHERE follower_handle = ?1 ORDER BY created_at DESC"
    )?;
    let rows = stmt.query_map(params![follower], |r| r.get(0))?;
    let mut v = vec![];
    for r in rows { v.push(r?); }
    Ok(v)
  }

  pub fn create_marketplace_listing(&self, seller: &str, item_type: &str, item_ref: Option<&str>, price: i64, title: &str, description: Option<&str>, is_nft: bool) -> Result<i64> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO marketplace_listings (seller_handle, item_type, item_ref, price, title, description, is_nft) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
      params![seller, item_type, item_ref, price, title, description, is_nft as i64],
    )?;
    Ok(conn.last_insert_rowid())
  }

  pub fn list_marketplace(&self) -> Result<Vec<serde_json::Value>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, seller_handle, item_type, item_ref, price, title, description, is_nft, sold_to, created_at FROM marketplace_listings WHERE sold_to IS NULL ORDER BY created_at DESC"
    )?;
    let rows = stmt.query_map([], |row| {
      Ok(serde_json::json!({
        "id": row.get::<_, i64>(0)?,
        "sellerHandle": row.get::<_, String>(1)?,
        "itemType": row.get::<_, String>(2)?,
        "itemRef": row.get::<_, Option<String>>(3)?,
        "price": row.get::<_, i64>(4)?,
        "title": row.get::<_, String>(5)?,
        "description": row.get::<_, Option<String>>(6)?,
        "isNft": row.get::<_, i64>(7)? == 1,
        "soldTo": row.get::<_, Option<String>>(8)?,
        "createdAt": row.get::<_, String>(9)?,
      }))
    })?;
    let mut res = vec![];
    for r in rows { res.push(r?); }
    Ok(res)
  }

  pub fn buy_marketplace_listing(&self, id: i64, buyer: &str) -> Result<Option<serde_json::Value>> {
    let conn = self.conn.lock().unwrap();
    let listing: Option<(String, i64, String, Option<String>, bool)> = conn.query_row(
      "SELECT seller_handle, price, item_type, item_ref, is_nft FROM marketplace_listings WHERE id = ?1 AND sold_to IS NULL",
      params![id],
      |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get::<_, i64>(4)? == 1)),
    ).ok();
    if let Some((seller, price, item_type, item_ref, is_nft)) = listing {
      // Transfer WB
      self.send_weixbucks(buyer, &seller, price)?;
      // Mark sold
      conn.execute(
        "UPDATE marketplace_listings SET sold_to = ?1 WHERE id = ?2",
        params![buyer, id],
      )?;
      Ok(Some(serde_json::json!({
        "id": id,
        "itemType": item_type,
        "itemRef": item_ref,
        "isNft": is_nft,
        "seller": seller,
        "price": price,
      })))
    } else {
      Ok(None)
    }
  }

  pub fn increment_relay_uptime(&self, handle: &str, hours: i64) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET relay_uptime_hours = relay_uptime_hours + ?1 WHERE handle = ?2",
      params![hours, handle],
    )?;
    Ok(())
  }

  // ─── Offline Queue ─────────────────────────────────────

  pub fn queue_offline_action(&self, action_type: &str, payload: &str, author_handle: &str) -> Result<i64> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO offline_queue (action_type, payload, author_handle) VALUES (?1, ?2, ?3)",
      params![action_type, payload, author_handle],
    )?;
    Ok(conn.last_insert_rowid())
  }

  pub fn get_pending_offline_actions(&self, author_handle: &str) -> Result<Vec<(i64, String, String)>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, action_type, payload FROM offline_queue WHERE author_handle = ?1 AND synced = 0 ORDER BY created_at ASC"
    )?;
    let rows = stmt.query_map(params![author_handle], |row| {
      Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
    })?;
    let mut actions = Vec::new();
    for row in rows {
      actions.push(row?);
    }
    Ok(actions)
  }

  pub fn mark_offline_action_synced(&self, id: i64) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE offline_queue SET synced = 1 WHERE id = ?1",
      params![id],
    )?;
    Ok(())
  }

  pub fn clear_synced_offline_actions(&self, author_handle: &str) -> Result<usize> {
    let conn = self.conn.lock().unwrap();
    let affected = conn.execute(
      "DELETE FROM offline_queue WHERE author_handle = ?1 AND synced = 1",
      params![author_handle],
    )?;
    Ok(affected)
  }

  pub fn count_pending_offline_actions(&self, author_handle: &str) -> Result<i64> {
    let conn = self.conn.lock().unwrap();
    let count: i64 = conn.query_row(
      "SELECT COUNT(*) FROM offline_queue WHERE author_handle = ?1 AND synced = 0",
      params![author_handle],
      |r| r.get(0),
    )?;
    Ok(count)
  }

  // ─── Device Sync Log ──────────────────────────────────

  pub fn log_device_sync(&self, device_id: &str, sync_type: &str, items_count: i64, duration_ms: i64, success: bool) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO device_sync_log (device_id, sync_type, items_count, duration_ms, success) VALUES (?1, ?2, ?3, ?4, ?5)",
      params![device_id, sync_type, items_count, duration_ms, if success { 1 } else { 0 }],
    )?;
    Ok(())
  }

  pub fn get_device_sync_history(&self, device_id: &str) -> Result<Vec<(String, i64, i64, bool)>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT sync_type, items_count, duration_ms, success FROM device_sync_log WHERE device_id = ?1 ORDER BY created_at DESC LIMIT 50"
    )?;
    let rows = stmt.query_map(params![device_id], |row| {
      Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?, row.get::<_, i64>(2)?, row.get::<_, i64>(3)? != 0))
    })?;
    let mut history = Vec::new();
    for row in rows {
      history.push(row?);
    }
    Ok(history)
  }

  // ─── Cross-Device Data Retrieval ─────────────────────

  pub fn get_user_account_data(&self, handle: &str) -> Result<serde_json::Value> {
    let conn = self.conn.lock().unwrap();
    
    // Get user info
    let sql = format!("{USER_SELECT} WHERE handle = ?1");
    let user: User = conn.query_row(&sql, params![handle], map_user_row)?;
    
    // Get user's posts
    let mut posts_stmt = conn.prepare(
      "SELECT id, author_handle, content, town_tag, replies_count, reposts_count, likes_count, created_at FROM posts WHERE author_handle = ?1 ORDER BY created_at DESC"
    )?;
    let posts = posts_stmt.query_map(params![handle], |row| {
      Ok(serde_json::json!({
        "id": row.get::<_, i64>(0)?,
        "author_handle": row.get::<_, String>(1)?,
        "content": row.get::<_, String>(2)?,
        "town_tag": row.get::<_, String>(3)?,
        "replies_count": row.get::<_, i64>(4)?,
        "reposts_count": row.get::<_, i64>(5)?,
        "likes_count": row.get::<_, i64>(6)?,
        "created_at": row.get::<_, String>(7)?,
      }))
    })?;
    let mut posts_list = Vec::new();
    for post in posts {
      posts_list.push(post?);
    }
    
    // Get wallet transactions
    let mut tx_stmt = conn.prepare(
      "SELECT tx_type, amount, description, balance_after, created_at FROM wallet_tx WHERE user_handle = ?1 ORDER BY created_at DESC"
    )?;
    let txs = tx_stmt.query_map(params![handle], |row| {
      Ok(serde_json::json!({
        "tx_type": row.get::<_, String>(0)?,
        "amount": row.get::<_, i64>(1)?,
        "description": row.get::<_, String>(2)?,
        "balance_after": row.get::<_, i64>(3)?,
        "created_at": row.get::<_, String>(4)?,
      }))
    })?;
    let mut tx_list = Vec::new();
    for tx in txs {
      tx_list.push(tx?);
    }
    
    Ok(serde_json::json!({
      "user": user,
      "posts": posts_list,
      "wallet_tx": tx_list,
    }))
  }

  // ─── Relay Consensus (Cache Poisoning Prevention) ───────

  /// Record a sighting of an event from a specific relay with its content hash
  pub fn record_relay_consensus(&self, event_id: &str, relay_url: &str, content_hash: &str) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    let changed = conn.execute(
      "INSERT OR IGNORE INTO relay_consensus (event_id, relay_url, content_hash) VALUES (?1, ?2, ?3)",
      params![event_id, relay_url, content_hash],
    )?;
    Ok(changed > 0)
  }

  /// Get all relay sightings for a given event
  pub fn get_relay_consensus(&self, event_id: &str) -> Result<Vec<(String, String)>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT relay_url, content_hash FROM relay_consensus WHERE event_id = ?1"
    )?;
    let rows = stmt.query_map(params![event_id], |row| {
      Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;
    let mut results = Vec::new();
    for row in rows {
      results.push(row?);
    }
    Ok(results)
  }

  /// Check if an event has consensus across at least min_relays with the same content hash
  pub fn validate_relay_consensus(&self, event_id: &str, min_relays: usize) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    let count: i64 = conn.query_row(
      "SELECT COUNT(DISTINCT relay_url) FROM relay_consensus WHERE event_id = ?1",
      params![event_id],
      |r| r.get(0),
    )?;
    if (count as usize) < min_relays {
      return Ok(false);
    }
    // Check if all relays agree on the same content hash
    let distinct_hashes: i64 = conn.query_row(
      "SELECT COUNT(DISTINCT content_hash) FROM relay_consensus WHERE event_id = ?1",
      params![event_id],
      |r| r.get(0),
    )?;
    Ok(distinct_hashes == 1)
  }

  /// Get consensus statistics for an event (relay count, unique hashes, agreement %)
  pub fn get_relay_consensus_stats(&self, event_id: &str) -> Result<(usize, usize, f64)> {
    let conn = self.conn.lock().unwrap();
    let total: i64 = conn.query_row(
      "SELECT COUNT(*) FROM relay_consensus WHERE event_id = ?1",
      params![event_id],
      |r| r.get(0),
    )?;
    let unique_hashes: i64 = conn.query_row(
      "SELECT COUNT(DISTINCT content_hash) FROM relay_consensus WHERE event_id = ?1",
      params![event_id],
      |r| r.get(0),
    )?;
    let max_count: i64 = conn.query_row(
      "SELECT MAX(c) FROM (SELECT COUNT(*) as c FROM relay_consensus WHERE event_id = ?1 GROUP BY content_hash)",
      params![event_id],
      |r| r.get(0),
    ).unwrap_or(0);
    let agreement = if total > 0 {
      (max_count as f64) / (total as f64)
    } else {
      0.0
    };
    Ok((total as usize, unique_hashes as usize, agreement))
  }

  // ─── MIDF Graph-Based Anomaly Detection ─────────────────

  /// Get the follower graph: all followers of a user and their followers
  pub fn get_follower_graph(&self, handle: &str, depth: usize) -> Result<Vec<(String, String)>> {
    if depth == 0 {
      return Ok(Vec::new());
    }
    let conn = self.conn.lock().unwrap();
    let mut edges = Vec::new();
    // Depth 1: direct followers
    let mut stmt = conn.prepare(
      "SELECT follower_handle FROM follows WHERE followed_handle = ?1"
    )?;
    let rows = stmt.query_map(params![handle], |row| {
      Ok(row.get::<_, String>(0)?)
    })?;
    let mut direct_followers = Vec::new();
    for row in rows {
      let follower = row?;
      edges.push((follower.clone(), handle.to_string()));
      direct_followers.push(follower);
    }
    // Depth 2: followers of followers
    if depth > 1 {
      for follower in direct_followers {
        let mut stmt2 = conn.prepare(
          "SELECT follower_handle FROM follows WHERE followed_handle = ?1"
        )?;
        let rows2 = stmt2.query_map(params![&follower], |row| {
          Ok(row.get::<_, String>(0)?)
        })?;
        for row in rows2 {
          let f2 = row?;
          edges.push((f2, follower.clone()));
        }
      }
    }
    Ok(edges)
  }

  /// Detect star pattern: one user followed by many accounts with very few followers themselves
  /// Returns a score 0.0-1.0 where 1.0 = strong star pattern (likely bot farm)
  pub fn get_star_pattern_score(&self, handle: &str) -> Result<f64> {
    let conn = self.conn.lock().unwrap();
    // Count followers of this user
    let follower_count: i64 = conn.query_row(
      "SELECT COUNT(*) FROM follows WHERE followed_handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    if follower_count == 0 {
      return Ok(0.0);
    }
    // Count how many of those followers have < 3 followers themselves (indicator of bot accounts)
    let mut stmt = conn.prepare(
      "SELECT f.follower_handle, COUNT(f2.follower_handle) as f2_count
       FROM follows f
       LEFT JOIN follows f2 ON f2.followed_handle = f.follower_handle
       WHERE f.followed_handle = ?1
       GROUP BY f.follower_handle"
    )?;
    let rows = stmt.query_map(params![handle], |row| {
      Ok(row.get::<_, i64>(1)?)
    })?;
    let mut low_follower_count = 0;
    let mut total = 0;
    for row in rows {
      let count = row?;
      total += 1;
      if count < 3 {
        low_follower_count += 1;
      }
    }
    if total == 0 {
      return Ok(0.0);
    }
    let ratio = (low_follower_count as f64) / (total as f64);
    // Normalize: if >80% of followers have <3 followers, score approaches 1.0
    let score = (ratio / 0.8).min(1.0);
    Ok(score)
  }

  /// Calculate degree centrality (how well-connected a user is in the network)
  /// Returns a score 0.0-1.0 based on follow connections relative to total users
  pub fn get_network_centrality(&self, handle: &str) -> Result<f64> {
    let conn = self.conn.lock().unwrap();
    let total_users: i64 = conn.query_row(
      "SELECT COUNT(*) FROM users",
      [],
      |r| r.get(0),
    )?;
    if total_users <= 1 {
      return Ok(0.0);
    }
    let connections: i64 = conn.query_row(
      "SELECT COUNT(*) FROM follows WHERE follower_handle = ?1 OR followed_handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    let max_possible = (total_users - 1) * 2; // can follow and be followed by everyone else
    let score = (connections as f64) / (max_possible as f64);
    Ok(score.min(1.0))
  }

  /// Calculate follower velocity: followers gained in the last 7 days vs total followers
  /// Returns a score 0.0-1.0 where 1.0 = sudden spike (possible Sybil attack)
  pub fn get_follower_velocity(&self, handle: &str) -> Result<f64> {
    let conn = self.conn.lock().unwrap();
    let total_followers: i64 = conn.query_row(
      "SELECT COUNT(*) FROM follows WHERE followed_handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    if total_followers == 0 {
      return Ok(0.0);
    }
    let recent_followers: i64 = conn.query_row(
      "SELECT COUNT(*) FROM follows WHERE followed_handle = ?1 AND created_at >= datetime('now', '-7 days')",
      params![handle],
      |r| r.get(0),
    )?;
    // Score: if >50% of followers arrived in last 7 days, suspicious
    let ratio = (recent_followers as f64) / (total_followers as f64);
    let score = (ratio / 0.5).min(1.0);
    Ok(score)
  }

  /// Detect self-interaction: likes/replies on own posts
  /// Returns a score 0.0-1.0 where 1.0 = mostly self-interacting
  pub fn get_self_interaction_score(&self, handle: &str) -> Result<f64> {
    let conn = self.conn.lock().unwrap();
    // Self-likes
    let self_likes: i64 = conn.query_row(
      "SELECT COUNT(*) FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.author_handle = ?1 AND l.user_handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    let total_likes: i64 = conn.query_row(
      "SELECT COUNT(*) FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.author_handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    // Self-replies
    let self_replies: i64 = conn.query_row(
      "SELECT COUNT(*) FROM replies r JOIN posts p ON r.post_id = p.id WHERE p.author_handle = ?1 AND r.author_handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    let total_replies: i64 = conn.query_row(
      "SELECT COUNT(*) FROM replies r JOIN posts p ON r.post_id = p.id WHERE p.author_handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    let like_ratio = if total_likes > 0 { (self_likes as f64) / (total_likes as f64) } else { 0.0 };
    let reply_ratio = if total_replies > 0 { (self_replies as f64) / (total_replies as f64) } else { 0.0 };
    let score = ((like_ratio + reply_ratio) / 2.0).min(1.0);
    Ok(score)
  }

  /// Detect content similarity: how many posts have very similar content (copy-paste spam)
  /// Simple heuristic: posts with identical first 50 characters
  /// Returns a score 0.0-1.0 where 1.0 = all content is identical
  pub fn get_content_similarity_score(&self, handle: &str) -> Result<f64> {
    let conn = self.conn.lock().unwrap();
    let total_posts: i64 = conn.query_row(
      "SELECT COUNT(*) FROM posts WHERE author_handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    if total_posts <= 1 {
      return Ok(0.0);
    }
    // Count posts with duplicate first 50 chars
    let mut stmt = conn.prepare(
      "SELECT SUBSTR(content, 1, 50) as prefix, COUNT(*) as c
       FROM posts WHERE author_handle = ?1
       GROUP BY prefix HAVING c > 1"
    )?;
    let rows = stmt.query_map(params![handle], |row| {
      Ok(row.get::<_, i64>(1)?)
    })?;
    let mut duplicate_posts = 0;
    for row in rows {
      let count = row?;
      duplicate_posts += count;
    }
    let score = (duplicate_posts as f64) / (total_posts as f64);
    Ok(score.min(1.0))
  }

  /// Detect temporal pattern: many posts in a very short time window (bot behavior)
  /// Returns a score 0.0-1.0 where 1.0 = burst posting detected
  pub fn get_temporal_pattern_score(&self, handle: &str) -> Result<f64> {
    let conn = self.conn.lock().unwrap();
    let total_posts: i64 = conn.query_row(
      "SELECT COUNT(*) FROM posts WHERE author_handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    if total_posts == 0 {
      return Ok(0.0);
    }
    // Count posts within same hour (max 4 posts/hour considered normal)
    let mut stmt = conn.prepare(
      "SELECT strftime('%Y-%m-%d %H', created_at) as hour, COUNT(*) as c
       FROM posts WHERE author_handle = ?1
       GROUP BY hour HAVING c > 4"
    )?;
    let rows = stmt.query_map(params![handle], |row| {
      Ok(row.get::<_, i64>(1)?)
    })?;
    let mut _burst_hours = 0;
    let mut total_burst_posts = 0;
    for row in rows {
      let count = row?;
      _burst_hours += 1;
      total_burst_posts += count - 4; // excess posts
    }
    let score = if total_posts > 0 {
      (total_burst_posts as f64) / (total_posts as f64)
    } else {
      0.0
    };
    Ok(score.min(1.0))
  }

  /// Calculate composite Malicious Intent Vector (MIDF) score
  /// Returns a struct with all dimensions and overall score
  pub fn calculate_malicious_intent_vector(&self, handle: &str) -> Result<serde_json::Value> {
    let star = self.get_star_pattern_score(handle)?;
    let centrality = self.get_network_centrality(handle)?;
    let velocity = self.get_follower_velocity(handle)?;
    let self_int = self.get_self_interaction_score(handle)?;
    let similarity = self.get_content_similarity_score(handle)?;
    let temporal = self.get_temporal_pattern_score(handle)?;

    // Weighted composite score (weights from MIDF-inspired heuristics)
    // High star pattern = strong Sybil indicator
    // High follower velocity = sudden growth attack
    // High self-interaction = reward farming
    // High content similarity = spam bot
    // High temporal pattern = automated posting
    // Low network centrality + high star pattern = isolated bot farm
    let overall = (
      star * 0.30 +           // Star pattern: highest weight for Sybil detection
      velocity * 0.25 +       // Follower velocity: rapid growth attack
      self_int * 0.20 +       // Self-interaction: reward farming
      similarity * 0.15 +     // Content similarity: spam
      temporal * 0.10         // Temporal pattern: automation
    ).min(1.0);

    // Store the scores
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO malicious_intent_scores (handle, overall_score, follower_velocity, network_centrality, content_similarity, temporal_pattern, self_interaction, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
       ON CONFLICT(handle) DO UPDATE SET
         overall_score = excluded.overall_score,
         follower_velocity = excluded.follower_velocity,
         network_centrality = excluded.network_centrality,
         content_similarity = excluded.content_similarity,
         temporal_pattern = excluded.temporal_pattern,
         self_interaction = excluded.self_interaction,
         updated_at = excluded.updated_at",
      params![handle, overall, velocity, centrality, similarity, temporal, self_int],
    )?;

    Ok(serde_json::json!({
      "handle": handle,
      "overallScore": overall,
      "dimensions": {
        "starPattern": star,
        "networkCentrality": centrality,
        "followerVelocity": velocity,
        "selfInteraction": self_int,
        "contentSimilarity": similarity,
        "temporalPattern": temporal,
      },
      "riskLevel": if overall > 0.7 { "high" } else if overall > 0.4 { "medium" } else { "low" },
      "updatedAt": chrono::Utc::now().to_rfc3339(),
    }))
  }

  /// Get the stored malicious intent scores for a user
  pub fn get_malicious_intent_scores(&self, handle: &str) -> Result<Option<serde_json::Value>> {
    let conn = self.conn.lock().unwrap();
    let result: rusqlite::Result<(f64, f64, f64, f64, f64, f64, String)> = conn.query_row(
      "SELECT overall_score, follower_velocity, network_centrality, content_similarity, temporal_pattern, self_interaction, updated_at
       FROM malicious_intent_scores WHERE handle = ?1",
      params![handle],
      |row| {
        Ok((
          row.get(0)?,
          row.get(1)?,
          row.get(2)?,
          row.get(3)?,
          row.get(4)?,
          row.get(5)?,
          row.get(6)?,
        ))
      },
    );
    match result {
      Ok((overall, velocity, centrality, similarity, temporal, self_int, updated)) => {
        Ok(Some(serde_json::json!({
          "handle": handle,
          "overallScore": overall,
          "dimensions": {
            "starPattern": 0.0, // Not stored separately; recalculate if needed
            "networkCentrality": centrality,
            "followerVelocity": velocity,
            "selfInteraction": self_int,
            "contentSimilarity": similarity,
            "temporalPattern": temporal,
          },
          "riskLevel": if overall > 0.7 { "high" } else if overall > 0.4 { "medium" } else { "low" },
          "updatedAt": updated,
        })))
      }
      Err(_) => Ok(None),
    }
  }

  /// Recalculate malicious intent scores for all users
  pub fn recalculate_all_malicious_intent_scores(&self) -> Result<usize> {
    // Collect handles first to avoid holding locks across calls
    let handles: Vec<String> = {
      let conn = self.conn.lock().unwrap();
      let mut stmt = conn.prepare("SELECT handle FROM users")?;
      let rows = stmt.query_map([], |row| {
        Ok(row.get::<_, String>(0)?)
      })?;
      rows.collect::<Result<Vec<_>, _>>()?
    };
    let mut count = 0;
    for handle in handles {
      let _ = self.calculate_malicious_intent_vector(&handle)?;
      count += 1;
    }
    Ok(count)
  }

  // ─── Yard events (RSVP + calendar) ───────────────────────

  pub fn list_yard_events(
    &self,
    community_id: &str,
    current_user: Option<&str>,
  ) -> Result<Vec<YardEvent>> {
    let count: i64 = {
      let conn = self.conn.lock().unwrap();
      conn.query_row(
        "SELECT COUNT(*) FROM yard_events WHERE community_id = ?1",
        params![community_id],
        |r| r.get(0),
      )?
    };
    if count == 0 {
      self.seed_yard_events_for_community(community_id)?;
    }
    let conn = self.conn.lock().unwrap();
    let sql = "
      SELECT e.id, e.community_id, e.title, e.description, e.location, e.starts_at, e.ends_at,
             e.created_by, COALESCE(u.display_name, e.created_by) AS display_name,
             (SELECT COUNT(*) FROM yard_event_rsvps r WHERE r.event_id = e.id) AS rsvp_count,
             ur.status AS user_rsvp
      FROM yard_events e
      LEFT JOIN users u ON u.handle = e.created_by
      LEFT JOIN yard_event_rsvps ur ON ur.event_id = e.id AND ur.handle = ?2
      WHERE e.community_id = ?1
      ORDER BY e.starts_at ASC
    ";
    let user_key = current_user.unwrap_or("");
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(params![community_id, user_key], |row| {
      let user_rsvp: Option<String> = row.get(10)?;
      Ok(YardEvent {
        id: row.get(0)?,
        community_id: row.get(1)?,
        title: row.get(2)?,
        description: row.get(3)?,
        location: row.get(4)?,
        starts_at: row.get(5)?,
        ends_at: row.get(6)?,
        created_by: row.get(7)?,
        created_by_display_name: row.get(8)?,
        rsvp_count: row.get(9)?,
        user_rsvp: user_rsvp.filter(|s| !s.is_empty()),
      })
    })?;
    let mut events = Vec::new();
    for row in rows {
      events.push(row?);
    }
    Ok(events)
  }

  pub fn create_yard_event(
    &self,
    community_id: &str,
    created_by: &str,
    title: &str,
    description: &str,
    location: &str,
    starts_at: &str,
    ends_at: Option<&str>,
  ) -> Result<YardEvent> {
    let title = title.trim();
    if title.is_empty() || title.len() > 200 {
      return Err(rusqlite::Error::InvalidParameterName(
        "Title must be 1-200 characters".into(),
      ));
    }
    if starts_at.trim().is_empty() {
      return Err(rusqlite::Error::InvalidParameterName(
        "Start time required".into(),
      ));
    }
    if !self.is_yard_member(created_by, community_id)? {
      return Err(rusqlite::Error::InvalidParameterName(
        "Join the yard before creating events".into(),
      ));
    }
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO yard_events (community_id, title, description, location, starts_at, ends_at, created_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
      params![
        community_id,
        title,
        description.trim(),
        location.trim(),
        starts_at.trim(),
        ends_at.map(str::trim),
        created_by
      ],
    )?;
    let id = conn.last_insert_rowid();
    let display_name: String = conn.query_row(
      "SELECT display_name FROM users WHERE handle = ?1",
      params![created_by],
      |r| r.get(0),
    )?;
    Ok(YardEvent {
      id,
      community_id: community_id.to_string(),
      title: title.to_string(),
      description: description.trim().to_string(),
      location: location.trim().to_string(),
      starts_at: starts_at.trim().to_string(),
      ends_at: ends_at.map(|s| s.trim().to_string()),
      created_by: created_by.to_string(),
      created_by_display_name: display_name,
      rsvp_count: 0,
      user_rsvp: None,
    })
  }

  pub fn rsvp_yard_event(
    &self,
    handle: &str,
    event_id: i64,
    status: &str,
  ) -> Result<RsvpYardEventResult> {
    let status = if status == "interested" {
      "interested"
    } else {
      "going"
    };
    let community_id: String = {
      let conn = self.conn.lock().unwrap();
      conn.query_row(
        "SELECT community_id FROM yard_events WHERE id = ?1",
        params![event_id],
        |r| r.get(0),
      )
      .map_err(|_| {
        rusqlite::Error::InvalidParameterName("Event not found".into())
      })?
    };
    if !self.is_yard_member(handle, &community_id)? {
      return Err(rusqlite::Error::InvalidParameterName(
        "Join the yard before RSVPing".into(),
      ));
    }
    let conn = self.conn.lock().unwrap();
    let inserted = conn.execute(
      "INSERT OR IGNORE INTO yard_event_rsvps (event_id, handle, status) VALUES (?1, ?2, ?3)",
      params![event_id, handle, status],
    )?;
    if inserted == 0 {
      conn.execute(
        "UPDATE yard_event_rsvps SET status = ?1 WHERE event_id = ?2 AND handle = ?3",
        params![status, event_id, handle],
      )?;
      return Ok(RsvpYardEventResult {
        rsvped: true,
        status: status.to_string(),
        earn: EarnResult::default(),
      });
    }
    drop(conn);
    let quality = self.update_engagement_quality(handle).unwrap_or(1.0);
    let wb_nominal = self.throttle_rewards(handle, 2.0, quality);
    let throttled = self.rewards_throttled(handle);
    let wb_actual = self.grant_weix_bucks(handle, wb_nominal, "Event RSVP")?;
    if !throttled {
      self.grant_karma(handle, &community_id, 0, 2, "Event RSVP")?;
    }
    Ok(RsvpYardEventResult {
      rsvped: true,
      status: status.to_string(),
      earn: EarnResult::build(wb_nominal, wb_actual, 0, 2, throttled),
    })
  }

  pub fn cancel_yard_event_rsvp(&self, handle: &str, event_id: i64) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    let removed = conn.execute(
      "DELETE FROM yard_event_rsvps WHERE event_id = ?1 AND handle = ?2",
      params![event_id, handle],
    )?;
    Ok(removed > 0)
  }

  fn seed_yard_events_for_community(&self, community_id: &str) -> Result<()> {
    let now = chrono::Utc::now();
    let samples: Vec<(&str, &str, &str, i64, &str)> = match community_id {
      "tsu" => vec![
        (
          "Career Fair Prep & Networking",
          "Resume reviews, employer booths, and yard connections before the TSU career fair.",
          "Kean Hall Lobby",
          2,
          "demo_user",
        ),
        (
          "Homecoming Watch Party",
          "Tailgate vibes indoors — music, food trucks nearby, and live game stream.",
          "Student Center Ballroom",
          7,
          "jane_doe",
        ),
      ],
      "howard" => vec![
        (
          "Yard Networking Night",
          "Meet founders, alumni, and creators. Bring your elevator pitch.",
          "Founders Library Plaza",
          4,
          "jane_doe",
        ),
        (
          "Study Hall Power Session",
          "Quiet hours with accountability partners. Coffee provided.",
          "Undergraduate Library",
          1,
          "hbcustudent",
        ),
      ],
      "famu" => vec![
        (
          "Rattler Tailgate Mixer",
          "Pre-game meetup for FAMU students and alumni.",
          "Bragg Stadium Lot",
          5,
          "campus_king",
        ),
      ],
      "spelman" => vec![
        (
          "Spelman Sister Circle",
          "Open mic, mentorship intros, and community building.",
          "Manley Hall",
          3,
          "hbcustudent",
        ),
      ],
      "morehouse" => vec![
        (
          "Morehouse Alumni Panel",
          "Career paths in tech, finance, and entrepreneurship.",
          "Sale Hall",
          6,
          "alumnus_01",
        ),
      ],
      _ => vec![(
        "Yard Meetup",
        "Casual hangout for yard members — all welcome.",
        "Main Quad",
        3,
        "demo_user",
      )],
    };
    let conn = self.conn.lock().unwrap();
    for (title, desc, location, days_ahead, creator) in samples {
      let starts = (now + chrono::Duration::days(days_ahead))
        .format("%Y-%m-%dT%H:00:00Z")
        .to_string();
      let _ = conn.execute(
        "INSERT INTO yard_events (community_id, title, description, location, starts_at, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![community_id, title, desc, location, starts, creator],
      );
    }
    Ok(())
  }

  // ─── Yard membership, wall, profile extensions, karma ───

  pub fn join_yard(&self, handle: &str, community_id: &str) -> Result<JoinYardResult> {
    let conn = self.conn.lock().unwrap();
    let inserted = conn.execute(
      "INSERT OR IGNORE INTO yard_memberships (community_id, handle) VALUES (?1, ?2)",
      params![community_id, handle],
    )?;
    drop(conn);
    if inserted > 0 {
      let quality = self.update_engagement_quality(handle).unwrap_or(1.0);
      let wb_nominal = self.throttle_rewards(handle, 5.0, quality);
      let throttled = self.rewards_throttled(handle);
      let wb_actual = self.grant_weix_bucks(handle, wb_nominal, "Joined yard")?;
      if !throttled {
        self.grant_karma(handle, community_id, 0, 3, "Joined yard")?;
      }
      Ok(JoinYardResult {
        joined: true,
        earn: EarnResult::build(wb_nominal, wb_actual, 0, 3, throttled),
      })
    } else {
      Ok(JoinYardResult {
        joined: false,
        earn: EarnResult::default(),
      })
    }
  }

  pub fn leave_yard(&self, handle: &str, community_id: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "DELETE FROM yard_memberships WHERE community_id = ?1 AND handle = ?2",
      params![community_id, handle],
    )?;
    Ok(())
  }

  pub fn is_yard_member(&self, handle: &str, community_id: &str) -> Result<bool> {
    let conn = self.conn.lock().unwrap();
    let count: i64 = conn.query_row(
      "SELECT COUNT(*) FROM yard_memberships WHERE community_id = ?1 AND handle = ?2",
      params![community_id, handle],
      |r| r.get(0),
    )?;
    Ok(count > 0)
  }

  pub fn list_yard_members(&self, community_id: &str) -> Result<Vec<String>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT handle FROM yard_memberships WHERE community_id = ?1 ORDER BY joined_at DESC",
    )?;
    let rows = stmt.query_map(params![community_id], |r| r.get(0))?;
    let mut handles = Vec::new();
    for row in rows {
      handles.push(row?);
    }
    Ok(handles)
  }

  pub fn create_wall_post(
    &self,
    wall_owner: &str,
    author: &str,
    content: &str,
    auto_approve_own: bool,
  ) -> Result<WallPostResult> {
    if content.is_empty() || content.len() > 5000 {
      return Err(rusqlite::Error::InvalidParameterName(
        "Content must be 1-5000 characters".into(),
      ));
    }
    let approved = auto_approve_own && wall_owner == author;
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO wall_posts (wall_owner_handle, author_handle, content, approved) VALUES (?1, ?2, ?3, ?4)",
      params![wall_owner, author, content, if approved { 1 } else { 0 }],
    )?;
    let id = conn.last_insert_rowid();
    let display: String = conn.query_row(
      "SELECT display_name FROM users WHERE handle = ?1",
      params![author],
      |r| r.get(0),
    )?;
    drop(conn);
    let mut earn = EarnResult::default();
    if approved {
      let quality = self.update_engagement_quality(author).unwrap_or(1.0);
      let wb_nominal = self.throttle_rewards(author, 1.0, quality);
      let throttled = self.rewards_throttled(author);
      let wb_actual = self.grant_weix_bucks(author, wb_nominal, "Wall post")?;
      if !throttled {
        self.grant_karma(author, wall_owner, 0, 1, "Wall comment")?;
      }
      earn = EarnResult::build(wb_nominal, wb_actual, 0, 1, throttled);
    }
    Ok(WallPostResult {
      wall_post: WallPost {
        id,
        wall_owner_handle: wall_owner.to_string(),
        author_handle: author.to_string(),
        author_display_name: display,
        content: content.to_string(),
        approved,
        created_at: chrono::Utc::now().to_rfc3339(),
      },
      earn,
    })
  }

  pub fn list_wall_posts(&self, wall_owner: &str, viewer: &str) -> Result<Vec<WallPost>> {
    let conn = self.conn.lock().unwrap();
    let is_owner = wall_owner == viewer;
    let sql = if is_owner {
      "SELECT w.id, w.wall_owner_handle, w.author_handle, u.display_name, w.content, w.approved, w.created_at
       FROM wall_posts w JOIN users u ON u.handle = w.author_handle
       WHERE w.wall_owner_handle = ?1 ORDER BY w.created_at DESC LIMIT 50"
    } else {
      "SELECT w.id, w.wall_owner_handle, w.author_handle, u.display_name, w.content, w.approved, w.created_at
       FROM wall_posts w JOIN users u ON u.handle = w.author_handle
       WHERE w.wall_owner_handle = ?1 AND w.approved = 1 ORDER BY w.created_at DESC LIMIT 50"
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(params![wall_owner], |row| {
      Ok(WallPost {
        id: row.get(0)?,
        wall_owner_handle: row.get(1)?,
        author_handle: row.get(2)?,
        author_display_name: row.get(3)?,
        content: row.get(4)?,
        approved: row.get::<_, i64>(5)? != 0,
        created_at: row.get(6)?,
      })
    })?;
    let mut posts = Vec::new();
    for row in rows {
      posts.push(row?);
    }
    Ok(posts)
  }

  pub fn approve_wall_post(&self, wall_owner: &str, post_id: i64) -> Result<ApproveWallPostResult> {
    let conn = self.conn.lock().unwrap();
    let updated = conn.execute(
      "UPDATE wall_posts SET approved = 1 WHERE id = ?1 AND wall_owner_handle = ?2 AND approved = 0",
      params![post_id, wall_owner],
    )?;
    if updated == 0 {
      return Ok(ApproveWallPostResult {
        approved: false,
        earn: EarnResult::default(),
      });
    }
    let (author, _): (String, String) = conn.query_row(
      "SELECT author_handle, wall_owner_handle FROM wall_posts WHERE id = ?1",
      params![post_id],
      |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    drop(conn);
    let quality = self.update_engagement_quality(&author).unwrap_or(1.0);
    let wb_nominal = self.throttle_rewards(&author, 1.0, quality);
    let throttled = self.rewards_throttled(&author);
    let wb_actual = self.grant_weix_bucks(&author, wb_nominal, "Wall post approved")?;
    if !throttled {
      self.grant_karma(&author, wall_owner, 0, 1, "Wall post approved")?;
    }
    Ok(ApproveWallPostResult {
      approved: true,
      earn: EarnResult::build(wb_nominal, wb_actual, 0, 1, throttled),
    })
  }

  /// Nostr kind 6 repost — local mirror + reposts_count bump.
  pub fn create_repost(&self, user_handle: &str, post_id: i64) -> Result<RepostResult> {
    let conn = self.conn.lock().unwrap();
    let exists: bool = conn
      .query_row(
        "SELECT COUNT(*) FROM posts WHERE id = ?1",
        params![post_id],
        |r| r.get::<_, i64>(0),
      )
      .map(|c| c > 0)
      .unwrap_or(false);
    if !exists {
      return Err(rusqlite::Error::QueryReturnedNoRows);
    }
    let inserted = conn.execute(
      "INSERT OR IGNORE INTO reposts (user_handle, post_id) VALUES (?1, ?2)",
      params![user_handle, post_id],
    )?;
    if inserted == 0 {
      let count: i64 = conn.query_row(
        "SELECT reposts_count FROM posts WHERE id = ?1",
        params![post_id],
        |r| r.get(0),
      )?;
      return Ok(RepostResult {
        reposted: false,
        reposts_count: count,
      });
    }
    conn.execute(
      "UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = ?1",
      params![post_id],
    )?;
    let count: i64 = conn.query_row(
      "SELECT reposts_count FROM posts WHERE id = ?1",
      params![post_id],
      |r| r.get(0),
    )?;
    Ok(RepostResult {
      reposted: true,
      reposts_count: count,
    })
  }

  pub fn list_reposts_for_handles(
    &self,
    handles: &[String],
    limit: i64,
    current_user: Option<&str>,
  ) -> Result<Vec<RepostFeedItem>> {
    if handles.is_empty() {
      return Ok(Vec::new());
    }
    let placeholders: String = handles.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let sql = format!(
      "SELECT r.user_handle, u.display_name, r.created_at, r.post_id
       FROM reposts r
       JOIN users u ON u.handle = r.user_handle
       WHERE r.user_handle IN ({placeholders})
       ORDER BY r.created_at DESC
       LIMIT ?"
    );
    let rows: Vec<(String, String, String, i64)> = {
      let conn = self.conn.lock().unwrap();
      let mut stmt = conn.prepare(&sql)?;
      let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = handles
        .iter()
        .map(|h| Box::new(h.clone()) as Box<dyn rusqlite::types::ToSql>)
        .collect();
      params.push(Box::new(limit));
      let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        params.iter().map(|p| p.as_ref()).collect();
      let mapped = stmt.query_map(param_refs.as_slice(), |row| {
        Ok((
          row.get::<_, String>(0)?,
          row.get::<_, String>(1)?,
          row.get::<_, String>(2)?,
          row.get::<_, i64>(3)?,
        ))
      })?;
      let mut out = Vec::new();
      for row in mapped {
        out.push(row?);
      }
      out
    };
    let mut items = Vec::new();
    for (reposter_handle, reposter_display_name, reposted_at, post_id) in rows {
      if let Some(post) = self.get_post(post_id, current_user)? {
        items.push(RepostFeedItem {
          reposter_handle,
          reposter_display_name,
          reposted_at,
          post,
        });
      }
    }
    Ok(items)
  }

  pub fn update_pro_profile(&self, handle: &str, json: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET pro_profile_json = ?1 WHERE handle = ?2",
      params![json, handle],
    )?;
    Ok(())
  }

  pub fn update_profile_layout(&self, handle: &str, json: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET profile_layout_json = ?1 WHERE handle = ?2",
      params![json, handle],
    )?;
    Ok(())
  }

  pub fn update_top_friends(&self, handle: &str, json: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET top_friends_json = ?1 WHERE handle = ?2",
      params![json, handle],
    )?;
    Ok(())
  }

  pub fn get_karma_leaderboard(&self, yard: Option<&str>, limit: i64) -> Result<Vec<KarmaLeaderboardEntry>> {
    let conn = self.conn.lock().unwrap();
    let (sql, yard_param): (String, Option<String>) = if let Some(y) = yard {
      (
        "SELECT handle, display_name, post_karma, comment_karma, town FROM users
         WHERE town = ?1
         ORDER BY (post_karma + comment_karma) DESC LIMIT ?2".to_string(),
        Some(y.to_string()),
      )
    } else {
      (
        "SELECT handle, display_name, post_karma, comment_karma, town FROM users
         ORDER BY (post_karma + comment_karma) DESC LIMIT ?1".to_string(),
        None,
      )
    };
    let mut stmt = conn.prepare(&sql)?;
    let mut entries = Vec::new();
    if let Some(y) = yard_param {
      let rows = stmt.query_map(params![y, limit], |row| {
        Ok(KarmaLeaderboardEntry {
          handle: row.get(0)?,
          display_name: row.get(1)?,
          post_karma: row.get(2)?,
          comment_karma: row.get(3)?,
          town: row.get(4)?,
        })
      })?;
      for row in rows {
        entries.push(row?);
      }
    } else {
      let rows = stmt.query_map(params![limit], |row| {
        Ok(KarmaLeaderboardEntry {
          handle: row.get(0)?,
          display_name: row.get(1)?,
          post_karma: row.get(2)?,
          comment_karma: row.get(3)?,
          town: row.get(4)?,
        })
      })?;
      for row in rows {
        entries.push(row?);
      }
    }
    Ok(entries)
  }

  pub fn get_earn_summary(&self, handle: &str) -> Result<EarnSummary> {
    let conn = self.conn.lock().unwrap();
    let (post_k, comment_k, wb): (i64, i64, i64) = conn.query_row(
      "SELECT COALESCE(post_karma,0), COALESCE(comment_karma,0), weix_bucks FROM users WHERE handle = ?1",
      params![handle],
      |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    )?;
    let yards: i64 = conn.query_row(
      "SELECT COUNT(*) FROM yard_memberships WHERE handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    let uploads: i64 = conn.query_row(
      "SELECT COUNT(*) FROM blobs WHERE uploader_handle = ?1",
      params![handle],
      |r| r.get(0),
    )?;
    Ok(EarnSummary {
      total_wb: wb,
      post_karma: post_k,
      comment_karma: comment_k,
      yards_joined: yards,
      uploads_count: uploads,
    })
  }
}

