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
  pub created_at: String,
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
  pub replies_count: i64,
  pub reposts_count: i64,
  pub likes_count: i64,
  pub liked: bool,
  pub media_blobs: Vec<String>,
  pub nostr_event_id: String,
  pub relay_url: String,
  pub created_at: String,
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
    std::fs::create_dir_all(&app_dir).ok();
    let db_path = app_dir.join("blkspace.db");
    let conn = Connection::open(db_path)?;
    let db = Database { conn: Mutex::new(conn) };
    db.initialize()?;
    db.seed()?;
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
        replies_count INTEGER DEFAULT 0,
        reposts_count INTEGER DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (author_handle) REFERENCES users(handle)
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
        ('demo_user', 'Demo User', 'Welcome to BlkSpace!', 'Tennessee State University', 'tsu', 245, 89, 1250, ''),
        ('jane_doe', 'Jane Doe', 'HBCU grad | Tech | Culture', 'Howard University', 'howard', 342, 156, 890, ''),
        ('campus_king', 'Campus King', 'Content creator & vibe curator', 'Florida A&M University', 'famu', 1287, 324, 2340, ''),
        ('hbcustudent', 'HBCU Student', 'Future engineer. Building the future.', 'Spelman College', 'spelman', 891, 203, 1560, ''),
        ('alumnus_01', 'Alumnus 01', 'Class of 2020. Still reppin the yard.', 'Morehouse College', 'morehouse', 563, 112, 980, '');

      INSERT INTO posts (author_handle, content, town_tag, replies_count, reposts_count, likes_count, created_at)
      VALUES
        ('demo_user', 'Just stepped on the yard for the first time. This place is incredible! 🏆', 'tsu', 12, 5, 47, '2026-06-14T09:00:00'),
        ('jane_doe', 'Hot take: the best HBCU homecoming is... (drop yours below) 👇', 'howard', 34, 18, 89, '2026-06-14T10:30:00'),
        ('campus_king', 'New mix just dropped. Link in bio. Who''s bumping this at the next tailgate? 🎧', 'famu', 8, 23, 156, '2026-06-14T11:15:00'),
        ('hbcustudent', 'Study group in the library at 4. Bring your laptops and your focus. 📚', 'spelman', 19, 4, 34, '2026-06-14T12:00:00'),
        ('alumnus_01', '20 years later and I still get chills walking across this campus. Once a tiger, always a tiger. 🐯', 'morehouse', 7, 12, 67, '2026-06-14T13:45:00'),
        ('demo_user', 'Who else is going to the career fair tomorrow? Let''s link up!', 'tsu', 5, 2, 23, '2026-06-14T14:30:00');

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

  pub fn get_user(&self, handle: &str) -> Result<Option<User>, SqlError> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, handle, display_name, bio, avatar_url, university, town,
              followers_count, following_count, weix_bucks, pubkey,
              engagement_quality, created_at
       FROM users WHERE handle = ?1"
    )?;
    let mut rows = stmt.query(params![handle])?;
    match rows.next()? {
      Some(row) => Ok(Some(User {
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
        created_at: row.get(12)?,
      })),
      None => Ok(None),
    }
  }

  pub fn list_users(&self) -> Result<Vec<User>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, handle, display_name, bio, avatar_url, university, town,
              followers_count, following_count, weix_bucks, pubkey,
              engagement_quality, created_at
       FROM users ORDER BY followers_count DESC"
    )?;
    let rows = stmt.query_map([], |row| {
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
        created_at: row.get(12)?,
      })
    })?;
    let mut users = Vec::new();
    for row in rows {
      users.push(row?);
    }
    Ok(users)
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
      created_at: chrono::Utc::now().to_rfc3339(),
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
    let mut stmt = conn.prepare(
      "SELECT id, handle, display_name, bio, avatar_url, university, town,
              followers_count, following_count, weix_bucks, pubkey,
              engagement_quality, created_at
       FROM users WHERE pubkey = ?1"
    )?;
    let mut rows = stmt.query(params![pubkey])?;
    match rows.next()? {
      Some(row) => Ok(Some(User {
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
        created_at: row.get(12)?,
      })),
      None => Ok(None),
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

  pub fn list_posts(&self, town: Option<&str>, current_user: Option<&str>) -> Result<Vec<Post>> {
    let conn = self.conn.lock().unwrap();
    let has_town = town.is_some();
    let sql = if has_town {
      "SELECT p.id, p.author_handle, u.display_name, u.avatar_url, p.content, p.town_tag,
              p.replies_count, p.reposts_count, p.likes_count,
              CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as liked,
              p.media_blobs, COALESCE(p.nostr_event_id, ''), COALESCE(p.relay_url, ''), p.created_at
       FROM posts p
       JOIN users u ON u.handle = p.author_handle
       LEFT JOIN likes l ON l.post_id = p.id AND l.user_handle = ?2
       WHERE p.town_tag = ?1
       ORDER BY p.created_at DESC"
    } else {
      "SELECT p.id, p.author_handle, u.display_name, u.avatar_url, p.content, p.town_tag,
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
          replies_count: row.get(6)?,
          reposts_count: row.get(7)?,
          likes_count: row.get(8)?,
          liked: row.get::<_, i64>(9)? != 0,
          media_blobs: parse_media_blobs(&row.get::<_, String>(10).unwrap_or_default()),
          nostr_event_id: row.get::<_, String>(11).unwrap_or_default(),
          relay_url: row.get::<_, String>(12).unwrap_or_default(),
          created_at: row.get(13)?,
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
          replies_count: row.get(6)?,
          reposts_count: row.get(7)?,
          likes_count: row.get(8)?,
          liked: row.get::<_, i64>(9)? != 0,
          media_blobs: parse_media_blobs(&row.get::<_, String>(10).unwrap_or_default()),
          nostr_event_id: row.get::<_, String>(11).unwrap_or_default(),
          relay_url: row.get::<_, String>(12).unwrap_or_default(),
          created_at: row.get(13)?,
        })
      })?)
    };

    let mut posts = Vec::new();
    for row in row_map {
      posts.push(row?);
    }
    Ok(posts)
  }

  pub fn get_post(&self, id: i64, current_user: Option<&str>) -> Result<Option<Post>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT p.id, p.author_handle, u.display_name, u.avatar_url, p.content, p.town_tag,
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
      Some(row) => Ok(Some(Post {
        id: row.get(0)?,
        author_handle: row.get(1)?,
        author_display_name: row.get(2)?,
        author_avatar_url: row.get(3)?,
        content: row.get(4)?,
        town_tag: row.get(5)?,
        replies_count: row.get(6)?,
        reposts_count: row.get(7)?,
        likes_count: row.get(8)?,
        liked: row.get::<_, i64>(9)? != 0,
        media_blobs: serde_json::from_str(&row.get::<_, String>(10).unwrap_or_default()).unwrap_or_default(),
        nostr_event_id: row.get::<_, String>(11).unwrap_or_default(),
        relay_url: row.get::<_, String>(12).unwrap_or_default(),
        created_at: row.get(13)?,
      })),
      None => Ok(None),
    }
  }

  pub fn create_post(&self, author_handle: &str, content: &str, town_tag: &str, media_hashes: &[String]) -> Result<Post> {
    let conn = self.conn.lock().unwrap();
    let media_json = serde_json::to_string(media_hashes).unwrap_or("[]".to_string());
    conn.execute(
      "INSERT INTO posts (author_handle, content, town_tag, media_blobs) VALUES (?1, ?2, ?3, ?4)",
      params![author_handle, content, town_tag, media_json],
    )?;
    let id = conn.last_insert_rowid();

    let quality = self.update_engagement_quality(author_handle)?;
    let reward = (5.0_f64 * quality).round() as i64;

    conn.execute(
      "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
      params![reward, author_handle],
    )?;

    conn.execute(
      "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
       SELECT ?1, 'earn', ?2, 'Post created', weix_bucks FROM users WHERE handle = ?1",
      params![author_handle, reward],
    )?;

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

    Ok(Post {
      id,
      author_handle: author_handle.to_string(),
      author_display_name: display,
      author_avatar_url: avatar,
      content: content.to_string(),
      town_tag: town_tag.to_string(),
      replies_count: 0,
      reposts_count: 0,
      likes_count: 0,
      liked: false,
      media_blobs: media_hashes.to_vec(),
      nostr_event_id: String::new(),
      relay_url: String::new(),
      created_at: chrono::Utc::now().to_rfc3339(),
    })
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

  pub fn create_reply(&self, post_id: i64, author_handle: &str, content: &str) -> Result<Reply> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO replies (post_id, author_handle, content) VALUES (?1, ?2, ?3)",
      params![post_id, author_handle, content],
    )?;
    let id = conn.last_insert_rowid();
    conn.execute(
      "UPDATE posts SET replies_count = replies_count + 1 WHERE id = ?1",
      params![post_id],
    )?;

    let quality = self.update_engagement_quality(author_handle)?;
    let reward = (2.0_f64 * quality).round() as i64;

    conn.execute(
      "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
      params![reward, author_handle],
    )?;

    conn.execute(
      "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
       SELECT ?1, 'earn', ?2, 'Reply posted', weix_bucks FROM users WHERE handle = ?1",
      params![author_handle, reward],
    )?;

    let display: String = conn.query_row(
      "SELECT display_name FROM users WHERE handle = ?1",
      params![author_handle],
      |r| r.get(0),
    )?;

    Ok(Reply {
      id,
      post_id,
      author_handle: author_handle.to_string(),
      author_display_name: display,
      author_avatar_url: String::new(),
      content: content.to_string(),
      created_at: chrono::Utc::now().to_rfc3339(),
    })
  }

  pub fn toggle_like(&self, post_id: i64, user_handle: &str) -> Result<bool> {
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
      Ok(false)
    } else {
      conn.execute(
        "INSERT INTO likes (post_id, user_handle) VALUES (?1, ?2)",
        params![post_id, user_handle],
      )?;
      conn.execute(
        "UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?1",
        params![post_id],
      )?;

      // Reward post author +1 WeixBucks
      let author: Option<String> = conn.query_row(
        "SELECT author_handle FROM posts WHERE id = ?1",
        params![post_id],
        |r| r.get(0),
      ).ok();
      if let Some(ref author_handle) = author {
        if author_handle != user_handle {
          let quality = self.update_engagement_quality(author_handle)?;
          let reward = (1.0_f64 * quality).round() as i64;
          conn.execute(
            "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
            params![reward, author_handle],
          )?;
          conn.execute(
            "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
             SELECT ?1, 'earn', ?2, 'Post liked', weix_bucks FROM users WHERE handle = ?1",
            params![author_handle, reward],
          )?;
        }
      }

      Ok(true)
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

  pub fn list_combined_feed(&self, town: Option<&str>, current_user: Option<&str>) -> Result<Vec<CrossTownEvent>> {
    let conn = self.conn.lock().unwrap();

    let town_filter = if let Some(t) = town {
      format!("%\"t\":\"{}\"%", t)
    } else {
      "%\"hbcu-town%".to_string()
    };

    let events: Vec<CrossTownEvent> = {
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
        })
      })?;
      let mut events = Vec::new();
      for row in rows {
        events.push(row?);
      }
      events
    };

    Ok(events)
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

  pub fn get_user_posts(&self, handle: &str, current_user: Option<&str>) -> Result<Vec<Post>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT p.id, p.author_handle, u.display_name, u.avatar_url, p.content, p.town_tag,
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
        replies_count: row.get(6)?,
        reposts_count: row.get(7)?,
        likes_count: row.get(8)?,
        liked: row.get::<_, i64>(9)? != 0,
        media_blobs: serde_json::from_str(&row.get::<_, String>(10).unwrap_or_default()).unwrap_or_default(),
        nostr_event_id: row.get::<_, String>(11).unwrap_or_default(),
        relay_url: row.get::<_, String>(12).unwrap_or_default(),
        created_at: row.get(13)?,
      })
    })?;
    let mut posts = Vec::new();
    for row in rows {
      posts.push(row?);
    }
    Ok(posts)
  }

  pub fn get_trending_feed(&self, current_user: Option<&str>) -> Result<Vec<Post>> {
    self.list_posts(None, current_user)
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

  pub fn increment_relay_uptime(&self, handle: &str, hours: i64) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET relay_uptime_hours = relay_uptime_hours + ?1 WHERE handle = ?2",
      params![hours, handle],
    )?;
    Ok(())
  }
}
