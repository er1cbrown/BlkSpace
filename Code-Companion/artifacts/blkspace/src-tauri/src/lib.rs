mod db;
mod blob_store;
mod key_store;
mod relay_manager;
mod tier0_benchmark;

#[cfg(feature = "iroh")]
mod iroh_node;

#[cfg(test)]
mod tests;

#[cfg(all(test, feature = "iroh"))]
mod tests_iroh;

#[cfg(test)]
mod tests_nostr_relay;

use blob_store::BlobStore;
use key_store::KeyStore;
use db::{
  AppError, ApproveWallPostResult, BlobRecord, Community, CreatePostResult, CreateReplyResult,
  CrossTownEvent, Database, EarnResult, EarnSummary, JoinYardResult, KarmaLeaderboardEntry,
  CommunityRoleEntry, RepostFeedItem, RepostResult, RsvpYardEventResult, ToggleLikeResult,
  YardEvent,
  NetworkStats,
  Notification, Post, Relay, Reply, UploadBlobResult, User, WalletTx, WallPost, WallPostResult,
  TokenomicsPolicy, WithdrawEligibility, WITHDRAW_SETTLEMENT_FEE_BPS, calc_platform_fee,
  RelayConnectionRecord, RelayEventRecord,
  validate_handle, validate_display_name, validate_content, validate_bio, validate_town,
};
use relay_manager::{RelayManager, RelayStatus, NostrEventData};
#[cfg(feature = "iroh")]
use iroh_node::IrohNode;
use secp256k1::{Secp256k1, XOnlyPublicKey, schnorr};
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tauri::{State, Manager};
use std::sync::Mutex;

// ─── Session Management ──────────────────────────────────

struct SessionInfo {
  handle: String,
  pubkey: String,
  created_at: Instant,
}

struct PendingChallenge {
  handle: String,
  challenge: String,
  created_at: Instant,
}

struct AppState {
  db: Database,
  blob_store: BlobStore,
  #[cfg(feature = "iroh")]
  iroh: Option<Mutex<IrohNode>>,
  #[cfg(not(feature = "iroh"))]
  iroh: Option<()>,
  app_dir: PathBuf,
  key_store: KeyStore,
  sessions: Mutex<HashMap<String, SessionInfo>>,
  challenges: Mutex<HashMap<String, PendingChallenge>>,
  rate_limiter: Mutex<HashMap<String, Vec<i64>>>,
  relay_manager: Mutex<RelayManager>,
  relay_town_subscriptions: Mutex<Vec<String>>,
}

const RATE_LIMIT_WINDOW: i64 = 60;
const RATE_LIMIT_MAX: usize = 30;

fn check_rate_limit(
  rate_limiter: &Mutex<HashMap<String, Vec<i64>>>,
  pubkey: &str,
) -> Result<(), String> {
  let now = chrono::Utc::now().timestamp();
  let mut map = rate_limiter.lock().unwrap();
  let timestamps = map.entry(pubkey.to_string()).or_default();
  timestamps.retain(|&t| now - t < RATE_LIMIT_WINDOW);
  if timestamps.len() >= RATE_LIMIT_MAX {
    let retry_after = RATE_LIMIT_WINDOW - (now - timestamps[0]);
    return Err(format!("Rate limit exceeded — try again in {}s", retry_after));
  }
  timestamps.push(now);
  Ok(())
}

fn generate_token() -> String {
  uuid::Uuid::new_v4().to_string()
}

fn generate_challenge() -> String {
  uuid::Uuid::new_v4().to_string()
}

fn verify_nostr_auth_event(
  event_json: &str,
  challenge: &str,
) -> Result<String, String> {
  let event: serde_json::Value = serde_json::from_str(event_json)
    .map_err(|_| "Invalid event JSON".to_string())?;

  let pubkey_hex = event["pubkey"].as_str()
    .ok_or("Missing pubkey".to_string())?;
  let sig_hex = event["sig"].as_str()
    .ok_or("Missing signature".to_string())?;
  let kind = event["kind"].as_i64()
    .ok_or("Missing kind".to_string())?;
  let created_at = event["created_at"].as_i64()
    .ok_or("Missing created_at".to_string())?;
  let content = event["content"].as_str().unwrap_or("");
  let tags = event["tags"].as_array()
    .ok_or("Missing tags".to_string())?;

  if kind != 22242 {
    return Err("Invalid event kind, expected 22242".to_string());
  }

  let has_challenge = tags.iter().any(|t| {
    t.as_array().map(|a| {
      a.len() >= 2
        && a[0].as_str() == Some("challenge")
        && a[1].as_str() == Some(challenge)
    }).unwrap_or(false)
  });
  if !has_challenge {
    return Err("Challenge mismatch".to_string());
  }

  let now = chrono::Utc::now().timestamp();
  if (now - created_at).abs() > 120 {
    return Err("Auth event expired".to_string());
  }

  // Reconstruct event ID: SHA256([0, pubkey, created_at, kind, tags, content])
  let serialized = serde_json::json!([0, pubkey_hex, created_at, kind, tags, content]);
  let canonical = serde_json::to_string(&serialized)
    .map_err(|_| "Serialization error".to_string())?;
  let event_id = Sha256::digest(canonical.as_bytes());

  // Verify Schnorr signature
  let secp = Secp256k1::new();
  let pubkey = XOnlyPublicKey::from_slice(
    &hex::decode(pubkey_hex).map_err(|_| "Invalid pubkey hex".to_string())?
  ).map_err(|_| "Invalid pubkey".to_string())?;
  let sig = schnorr::Signature::from_slice(
    &hex::decode(sig_hex).map_err(|_| "Invalid sig hex".to_string())?
  ).map_err(|_| "Invalid signature".to_string())?;
  secp.verify_schnorr(&sig, &event_id, &pubkey)
    .map_err(|_| "Signature verification failed".to_string())?;

  Ok(pubkey_hex.to_string())
}

// ─── Auth Commands ───────────────────────────────────────

#[tauri::command]
fn get_challenge(state: State<AppState>, handle: String) -> Result<String, String> {
  validate_handle(&handle).map_err(map_err)?;
  let challenge = generate_challenge();
  let mut challenges = state.challenges.lock().unwrap();
  challenges.insert(challenge.clone(), PendingChallenge {
    handle: handle.clone(),
    challenge: challenge.clone(),
    created_at: Instant::now(),
  });
  // Clean expired challenges
  challenges.retain(|_, c| c.created_at.elapsed() < Duration::from_secs(120));
  Ok(challenge)
}

#[tauri::command]
fn login(
  state: State<AppState>,
  handle: String,
  pubkey: String,
  challenge: String,
  auth_event: String,
) -> Result<String, String> {
  // Validate challenge exists, not expired, and was issued for this handle
  {
    let mut challenges = state.challenges.lock().unwrap();
    let c = challenges.remove(&challenge)
      .ok_or("Challenge not found or expired, request a new one".to_string())?;
    if c.created_at.elapsed() > Duration::from_secs(120) {
      return Err("Challenge expired".to_string());
    }
    if c.handle != handle {
      return Err("Challenge was issued for a different user".to_string());
    }
  }

  // Verify auth event signature
  let verified_pubkey = verify_nostr_auth_event(&auth_event, &challenge)?;

  if verified_pubkey != pubkey {
    return Err("Pubkey mismatch in auth event".to_string());
  }

  // Look up user
  let user = state.db.get_user(&handle)
    .map_err(|_| "Database error".to_string())?;
  let user = user.ok_or("User not found".to_string())?;

  // Require matching pubkey — never auto-link (prevents key-replacement attack)
  if user.pubkey != pubkey {
    if user.pubkey.is_empty() {
      return Err("No Nostr key linked to this account. Use link_pubkey to set one.".to_string());
    }
    return Err("Pubkey does not match existing user".to_string());
  }

  // Create session
  let token = generate_token();
  let mut sessions = state.sessions.lock().unwrap();
  sessions.insert(token.clone(), SessionInfo {
    handle: handle.clone(),
    pubkey,
    created_at: Instant::now(),
  });
  // Clean old sessions
  sessions.retain(|_, s| s.created_at.elapsed() < Duration::from_secs(86400));

  Ok(token)
}

#[tauri::command]
fn verify_session(state: State<AppState>, session_token: String) -> Result<String, String> {
  let sessions = state.sessions.lock().unwrap();
  let info = sessions.get(&session_token)
    .ok_or("Invalid or expired session".to_string())?;
  if info.created_at.elapsed() > Duration::from_secs(86400) {
    return Err("Session expired".to_string());
  }
  Ok(info.handle.clone())
}

#[tauri::command]
fn logout(state: State<AppState>, session_token: String) -> Result<(), String> {
  let mut sessions = state.sessions.lock().unwrap();
  sessions.remove(&session_token);
  Ok(())
}

// ─── Key Store (OS keychain + encrypted file fallback) ───

#[tauri::command]
fn store_key(state: State<AppState>, session_token: String, handle: String, key: String) -> Result<(), String> {
  let session_handle = check_session_rate_limit(&state, &session_token)?;
  if session_handle != handle {
    return Err("Cannot store key for a different user".to_string());
  }
  validate_handle(&handle).map_err(map_err)?;
  state.key_store.store(&handle, key.trim())?;
  Ok(())
}

#[tauri::command]
fn get_key(state: State<AppState>, session_token: String, handle: String) -> Result<Option<String>, String> {
  let session_handle = check_session_rate_limit(&state, &session_token)?;
  if session_handle != handle {
    return Err("Cannot read key for a different user".to_string());
  }
  validate_handle(&handle).map_err(map_err)?;
  state.key_store.load(&handle)
}

#[tauri::command]
fn has_key(state: State<AppState>, session_token: String, handle: String) -> Result<bool, String> {
  let session_handle = get_handle_from_session(&state, &session_token)?;
  if session_handle != handle {
    return Err("Cannot check key for a different user".to_string());
  }
  validate_handle(&handle).map_err(map_err)?;
  Ok(state.key_store.exists(&handle))
}

/// Load the user's real Nostr signing keys from the secure store (for real signed events / Nostr hygiene).
fn load_user_nostr_keys(state: &AppState, handle: &str) -> Result<nostr_sdk::prelude::Keys, String> {
  if let Some(secret) = state.key_store.load(handle)? {
    let trimmed = secret.trim();
    if let Ok(keys) = nostr_sdk::prelude::Keys::parse(trimmed) {
      return Ok(keys);
    }
  }
  Err("no user nostr key".to_string())
}

/// Never publish social content with the ephemeral relay-manager key.
fn user_nostr_keys_for_publish(
  state: &AppState,
  handle: &str,
  context: &str,
) -> Option<nostr_sdk::prelude::Keys> {
  match load_user_nostr_keys(state, handle) {
    Ok(keys) => Some(keys),
    Err(e) => {
      log::warn!("Skipping Nostr {context} for {handle}: {e}");
      None
    }
  }
}

fn format_hbcu_town_tag(town: &str) -> String {
  let t = town.trim().to_lowercase();
  if t.starts_with("hbcu-town:") {
    t
  } else {
    format!("hbcu-town:{t}")
  }
}

fn town_id_from_tag(town_tag: &str) -> String {
  town_tag
    .strip_prefix("hbcu-town:")
    .unwrap_or(town_tag)
    .to_string()
}

/// Validate signature, town tags, then persist relay event + consensus record.
fn ingest_validated_relay_event(
  state: &AppState,
  event_json: &str,
  relay_url: &str,
  relay_town: Option<&str>,
) -> bool {
  if !validate_incoming_event(event_json).unwrap_or(false) {
    log::warn!("Rejected relay event — signature or id validation failed");
    return false;
  }
  let event: serde_json::Value = match serde_json::from_str(event_json) {
    Ok(v) => v,
    Err(_) => return false,
  };
  let event_id = match event["id"].as_str() {
    Some(v) => v,
    None => return false,
  };
  let kind_i64 = event["kind"].as_i64().unwrap_or(0);
  let pubkey = event["pubkey"].as_str().unwrap_or("");
  let content = event["content"].as_str().unwrap_or("");
  let created_at = event["created_at"].as_i64().unwrap_or(0);
  let tags_json = serde_json::to_string(&event["tags"]).unwrap_or_else(|_| "[]".to_string());

  if !state
    .db
    .validate_relay_event_tags(kind_i64, &tags_json, relay_town)
  {
    log::warn!("Rejected event {event_id} — missing or invalid t:hbcu-town tag");
    return false;
  }

  let _ = state.db.store_nostr_event_json(event_id, event_json);
  let content_hash = format!("{:x}", sha2::Sha256::digest(content.as_bytes()));
  let _ = state.db.insert_relay_event(
    event_id,
    relay_url,
    kind_i64,
    pubkey,
    content,
    &tags_json,
    created_at,
  );
  let _ = state.db.record_relay_consensus(event_id, relay_url, &content_hash);
  true
}

fn validate_blob_hash(hash: &str) -> Result<(), String> {
  if hash.len() != 64 || !hash.chars().all(|c| matches!(c, '0'..='9' | 'a'..='f')) {
    return Err("Invalid blob hash — expected 64 lowercase hex characters".to_string());
  }
  Ok(())
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct NostrEventVerification {
  valid: bool,
  status: String,
  message: Option<String>,
  event_id: Option<String>,
  pubkey: Option<String>,
  kind: Option<i64>,
}

fn verify_nostr_event_detail(event_json: &str) -> NostrEventVerification {
  let fail = |status: &str, message: &str, event: &serde_json::Value| NostrEventVerification {
    valid: false,
    status: status.to_string(),
    message: Some(message.to_string()),
    event_id: event["id"].as_str().map(|s| s.to_string()),
    pubkey: event["pubkey"].as_str().map(|s| s.to_string()),
    kind: event["kind"].as_i64(),
  };

  let event: serde_json::Value = match serde_json::from_str(event_json) {
    Ok(v) => v,
    Err(_) => {
      return NostrEventVerification {
        valid: false,
        status: "error".to_string(),
        message: Some("Invalid event JSON".to_string()),
        event_id: None,
        pubkey: None,
        kind: None,
      };
    }
  };

  let pubkey = match event["pubkey"].as_str() {
    Some(v) => v,
    None => return fail("error", "Missing pubkey", &event),
  };
  let id = match event["id"].as_str() {
    Some(v) => v,
    None => return fail("error", "Missing event id", &event),
  };
  let created_at = match event["created_at"].as_i64() {
    Some(v) => v,
    None => return fail("error", "Missing timestamp", &event),
  };
  let kind = match event["kind"].as_i64() {
    Some(v) => v,
    None => return fail("error", "Missing kind", &event),
  };
  let sig = match event["sig"].as_str() {
    Some(v) => v,
    None => return fail("error", "Missing signature", &event),
  };

  if pubkey.len() != 64 {
    return fail("invalid", "Invalid pubkey format", &event);
  }
  if id.len() != 64 {
    return fail("invalid", "Invalid event id format", &event);
  }

  let now = chrono::Utc::now().timestamp();
  if (now - created_at).abs() > 86400 {
    return fail("expired", "Event timestamp outside 24h verification window", &event);
  }

  let secp = Secp256k1::new();
  let pubkey_obj = match XOnlyPublicKey::from_slice(&hex::decode(pubkey).unwrap_or_default()) {
    Ok(v) => v,
    Err(_) => return fail("invalid", "Invalid pubkey", &event),
  };
  let sig_obj = match schnorr::Signature::from_slice(&hex::decode(sig).unwrap_or_default()) {
    Ok(v) => v,
    Err(_) => return fail("invalid", "Invalid signature encoding", &event),
  };

  let tags = match event["tags"].as_array() {
    Some(v) => v,
    None => return fail("error", "Missing tags", &event),
  };
  let serialized = serde_json::json!([
    0,
    pubkey,
    created_at,
    kind,
    tags,
    event["content"].as_str().unwrap_or("")
  ]);
  let canonical = match serde_json::to_string(&serialized) {
    Ok(v) => v,
    Err(_) => return fail("error", "Serialization error", &event),
  };
  let event_id = Sha256::digest(canonical.as_bytes());
  let computed_id = hex::encode(event_id);
  if computed_id != id {
    return fail("invalid", "Event id does not match canonical hash", &event);
  }

  if secp.verify_schnorr(&sig_obj, &event_id, &pubkey_obj).is_err() {
    return fail("invalid", "Schnorr signature verification failed", &event);
  }

  NostrEventVerification {
    valid: true,
    status: "valid".to_string(),
    message: None,
    event_id: Some(id.to_string()),
    pubkey: Some(pubkey.to_string()),
    kind: Some(kind),
  }
}

pub(crate) fn validate_incoming_event(event_json: &str) -> Result<bool, String> {
  let result = verify_nostr_event_detail(event_json);
  if result.valid {
    Ok(true)
  } else if result.status == "expired" {
    Ok(false)
  } else {
    Err(result.message.unwrap_or_else(|| "Invalid event".to_string()))
  }
}

#[tauri::command]
fn verify_nostr_event(event_json: String) -> Result<NostrEventVerification, String> {
  Ok(verify_nostr_event_detail(&event_json))
}

#[tauri::command]
fn get_nostr_event_json(state: State<AppState>, event_id: String) -> Result<Option<String>, String> {
  state
    .db
    .get_nostr_event_json(&event_id)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn verify_nostr_event_by_id(
  state: State<AppState>,
  event_id: String,
) -> Result<NostrEventVerification, String> {
  match state.db.get_nostr_event_json(&event_id).map_err(|e| e.to_string())? {
    Some(json) => Ok(verify_nostr_event_detail(&json)),
    None => Ok(NostrEventVerification {
      valid: false,
      status: "unknown".to_string(),
      message: Some("No signed event cached locally — connect to relays and sync".to_string()),
      event_id: Some(event_id),
      pubkey: None,
      kind: None,
    }),
  }
}

#[tauri::command]
fn link_pubkey(
  state: State<AppState>,
  handle: String,
  new_pubkey: String,
  auth_event: String,
) -> Result<String, String> {
  validate_handle(&handle).map_err(map_err)?;
  if new_pubkey.len() != 64 {
    return Err("Invalid pubkey format".to_string());
  }

  // Generate a dedicated linking challenge
  let link_challenge = format!("link:{}:{}", handle, new_pubkey);
  let verified_pubkey = verify_nostr_auth_event(&auth_event, &link_challenge)?;
  if verified_pubkey != new_pubkey {
    return Err("Pubkey mismatch in auth event".to_string());
  }

  // Verify the handle has no pubkey yet
  let user = state.db.get_user(&handle)
    .map_err(|_| "Database error".to_string())?
    .ok_or("User not found".to_string())?;
  if !user.pubkey.is_empty() {
    return Err("User already has a linked Nostr key".to_string());
  }

  state.db.set_user_pubkey(&handle, &new_pubkey)
    .map_err(|_| "Failed to link pubkey".to_string())?;

  // Create session
  let token = generate_token();
  let mut sessions = state.sessions.lock().unwrap();
  sessions.insert(token.clone(), SessionInfo {
    handle: handle.clone(),
    pubkey: new_pubkey,
    created_at: Instant::now(),
  });
  sessions.retain(|_, s| s.created_at.elapsed() < Duration::from_secs(86400));

  Ok(token)
}

fn map_err(e: AppError) -> String {
  e.to_string()
}

fn get_session_info(state: &AppState, session_token: &str) -> Result<(String, String), String> {
  let sessions = state.sessions.lock().unwrap();
  let info = sessions.get(session_token)
    .ok_or("Authentication required — please sign in".to_string())?;
  if info.created_at.elapsed() > Duration::from_secs(86400) {
    return Err("Session expired, please sign in again".to_string());
  }
  Ok((info.handle.clone(), info.pubkey.clone()))
}

fn get_handle_from_session(state: &AppState, session_token: &str) -> Result<String, String> {
  get_session_info(state, session_token).map(|(h, _)| h)
}

fn check_session_rate_limit(state: &AppState, session_token: &str) -> Result<String, String> {
  let (handle, pubkey) = get_session_info(state, session_token)?;
  check_rate_limit(&state.rate_limiter, &pubkey)?;
  Ok(handle)
}

// ─── User Commands ───────────────────────────────────────

#[tauri::command]
fn get_user(state: State<AppState>, handle: String) -> Result<Option<User>, String> {
  validate_handle(&handle).map_err(map_err)?;
  state.db.get_user(&handle).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn list_users(state: State<AppState>) -> Result<Vec<User>, String> {
  state.db.list_users().map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn search_users(state: State<AppState>, query: String, limit: Option<i64>) -> Result<Vec<User>, String> {
  let q = query.trim();
  if q.is_empty() {
    return Ok(vec![]);
  }
  let lim = limit.unwrap_or(50).clamp(1, 100);
  state
    .db
    .search_users(q, lim)
    .map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn search_posts(
  state: State<AppState>,
  query: String,
  limit: Option<i64>,
  current_user: Option<String>,
) -> Result<Vec<Post>, String> {
  let q = query.trim();
  if q.is_empty() {
    return Ok(vec![]);
  }
  let lim = limit.unwrap_or(50).clamp(1, 100);
  state
    .db
    .search_posts(q, lim, current_user.as_deref())
    .map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn search_communities(state: State<AppState>, query: String) -> Result<Vec<Community>, String> {
  Ok(state.db.search_communities(query.trim()))
}

#[tauri::command]
fn create_user(state: State<AppState>, handle: String, display_name: String, pubkey: String) -> Result<User, String> {
  validate_handle(&handle).map_err(map_err)?;
  validate_display_name(&display_name).map_err(map_err)?;
  if pubkey.len() != 64 && !pubkey.is_empty() {
    return Err("Invalid pubkey format".to_string());
  }
  state.db.create_user(&handle, &display_name, &pubkey).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn update_user(
  state: State<AppState>,
  session_token: String,
  display_name: String,
  bio: String,
  town: String,
) -> Result<(), String> {
  let handle = check_session_rate_limit(&state, &session_token)?;
  validate_display_name(&display_name).map_err(map_err)?;
  validate_bio(&bio).map_err(map_err)?;
  validate_town(&town).map_err(map_err)?;
  state.db.update_user(&handle, &display_name, &bio, &town).map_err(|e| AppError::from(e).to_string())
}

fn theme_name_to_id(theme: &str) -> i64 {
  match theme {
    "pro" => 1,
    "vibrant" => 2,
    "myspace" => 3,
    _ => 0,
  }
}

fn theme_id_to_name(theme_id: i64) -> &'static str {
  match theme_id {
    1 => "pro",
    2 => "vibrant",
    3 => "myspace",
    _ => "classic",
  }
}

fn publish_profile_to_nostr(state: &AppState, handle: &str) {
  let user = match state.db.get_user(handle) {
    Ok(Some(u)) => u,
    _ => return,
  };
  let has_relays = state.relay_manager.lock().unwrap().relay_count() > 0;
  if !has_relays {
    return;
  }
  let user_keys = match user_nostr_keys_for_publish(state, handle, "profile publish") {
    Some(k) => k,
    None => return,
  };
  let nostr_client = state.relay_manager.lock().unwrap().client().clone();
  let theme_name = theme_id_to_name(user.theme_id);
  let profile_content = serde_json::json!({
    "name": user.display_name,
    "about": user.bio,
    "picture": user.avatar_url,
    "blkspace": {
      "theme": theme_name,
      "music_hash": user.music_hash,
      "town": user.town,
    }
  });
  let content_str = profile_content.to_string();

  if let Ok(rt) = tokio::runtime::Runtime::new() {
    let _ = rt.block_on(async {
      use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
      let mut tag_vecs: Vec<Vec<String>> = vec![
        vec!["t".to_string(), format!("hbcu-town:{}", user.town)],
        vec!["t".to_string(), "blkspace".to_string()],
        vec!["theme".to_string(), theme_name.to_string()],
      ];
      if !user.music_hash.is_empty() {
        tag_vecs.push(vec!["music".to_string(), user.music_hash.clone()]);
        if let Ok(Some(rec)) = state.db.get_blob_record(&user.music_hash) {
          if let Some(cid) = rec.cid.as_ref() {
            tag_vecs.push(vec!["cid".to_string(), cid.clone()]);
          }
        }
      }
      let nostr_tags: Vec<Tag> = tag_vecs
        .iter()
        .filter_map(|t| Tag::parse(t.clone()).ok())
        .collect();
      let event = EventBuilder::new(Kind::Metadata, &content_str)
        .tags(nostr_tags)
        .sign(&user_keys)
        .await
        .map_err(|e| format!("Profile sign failed: {}", e))?;
      let event_id_hex = event.id.to_hex();
      if let Ok(json) = serde_json::to_string(&event) {
        let _ = state.db.store_nostr_event_json(&event_id_hex, &json);
      }
      nostr_client
        .send_event(event)
        .await
        .map_err(|e| format!("Profile publish failed: {}", e))?;
      Ok::<_, String>(())
    });
  }
}

#[tauri::command]
fn update_profile_customization(
  state: State<AppState>,
  session_token: String,
  theme: String,
  music_hash: Option<String>,
) -> Result<User, String> {
  let handle = check_session_rate_limit(&state, &session_token)?;
  let theme_id = theme_name_to_id(&theme);
  let music = music_hash.unwrap_or_default();
  if music.len() == 64 {
    validate_blob_hash(&music).map_err(|e| e.to_string())?;
  }
  let user = state
    .db
    .update_profile_customization(&handle, theme_id, &music)
    .map_err(|e| AppError::from(e).to_string())?;
  publish_profile_to_nostr(&state, &handle);
  Ok(user)
}

#[tauri::command]
fn set_node_role(state: State<AppState>, session_token: String, handle: String, role: String) -> Result<(), String> {
  let _caller = get_handle_from_session(&state, &session_token)?;
  // Assign yard/community role (node_role used in context of the town).
  state.db.set_node_role(&handle, &role).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_community_role(state: State<AppState>, session_token: String, community_id: String, handle: String, role: String) -> Result<(), String> {
  let _caller = get_handle_from_session(&state, &session_token)?;
  state.db.set_community_role(&community_id, &handle, &role).map_err(|e| e.to_string())
}

fn publish_kind3_contact_list(state: &AppState, follower: &str) -> Result<(), String> {
  let has_relays = state.relay_manager.lock().unwrap().relay_count() > 0;
  if !has_relays {
    return Ok(());
  }
  let following = state.db.get_following_for(follower).map_err(|e| e.to_string())?;
  let keys = match user_nostr_keys_for_publish(state, follower, "contact list publish") {
    Some(k) => k,
    None => return Ok(()),
  };
  let client = state.relay_manager.lock().unwrap().client().clone();
  let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
  rt.block_on(async {
    use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
    let mut ntags: Vec<Tag> = Vec::new();
    for handle in following {
      if let Ok(Some(user)) = state.db.get_user(&handle) {
        if user.pubkey.len() == 64 {
          if let Ok(tag) = Tag::parse(vec!["p".to_string(), user.pubkey]) {
            ntags.push(tag);
          }
        }
      }
    }
    let event = EventBuilder::new(Kind::ContactList, "")
      .tags(ntags)
      .sign(&keys)
      .await
      .map_err(|e| format!("Kind 3 sign: {}", e))?;
    let _ = client.send_event(event).await;
    Ok::<_, String>(())
  })
}

#[tauri::command]
fn toggle_follow(state: State<AppState>, session_token: String, followed_handle: String) -> Result<bool, String> {
  let follower = get_handle_from_session(&state, &session_token)?;
  let is_following = state.db.toggle_follow(&follower, &followed_handle).map_err(|e| e.to_string())?;
  let _ = publish_kind3_contact_list(&state, &follower);
  Ok(is_following)
}

#[tauri::command]
fn get_following(state: State<AppState>, session_token: String) -> Result<Vec<String>, String> {
  let follower = get_handle_from_session(&state, &session_token)?;
  // Real kind 3 for feeds: toggle_follow publishes signed Kind::Custom(3) p: tags + now persists to follows table.
  // This returns the real list (from DB populated by toggle) so feed Following tab + FYP can use real follows
  // (merged in UI with any localStorage for web/demo). Full future: also fetch latest kind 3 from relays.
  state.db.get_following_for(&follower).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_community_role(state: State<AppState>, session_token: String, community_id: String, handle: String) -> Result<String, String> {
  let _caller = get_handle_from_session(&state, &session_token)?;
  state.db.get_community_role(&community_id, &handle).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_marketplace(state: State<AppState>, session_token: String) -> Result<Vec<serde_json::Value>, String> {
  let _caller = get_handle_from_session(&state, &session_token)?;
  state.db.list_marketplace().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_marketplace_listing(
  state: State<AppState>,
  session_token: String,
  item_type: String,
  item_ref: Option<String>,
  price: i64,
  title: String,
  description: Option<String>,
  is_nft: bool,
) -> Result<i64, String> {
  let seller = get_handle_from_session(&state, &session_token)?;
  if price <= 0 { return Err("Price must be positive".to_string()); }
  let listing_id = state.db.create_marketplace_listing(&seller, &item_type, item_ref.as_deref(), price, &title, description.as_deref(), is_nft)
    .map_err(|e| e.to_string())?;

  // Nostr 30081 NFT listing on create (if NFT or media)
  if (is_nft || item_type == "media") && state.relay_manager.lock().unwrap().relay_count() > 0 {
    if let Some(keys) = user_nostr_keys_for_publish(&state, &seller, "marketplace listing publish") {
    let content = format!("Listed: {}", title);
    let tags: Vec<Vec<String>> = vec![
      vec!["t".to_string(), "blkspace".to_string()],
      vec!["id".to_string(), listing_id.to_string()],
      vec!["price".to_string(), price.to_string()],
    ];
    let client = state.relay_manager.lock().unwrap().client().clone();
    if let Ok(rt) = tokio::runtime::Runtime::new() {
      let _ = rt.block_on(async {
        use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
        let ntags: Vec<Tag> = tags.iter().filter_map(|t| Tag::parse(t.clone()).ok()).collect();
        let event = EventBuilder::new(Kind::Custom(30081), &content).tags(ntags).sign(&keys).await.map_err(|e| format!("Nostr sign: {}", e))?;
        let _ = client.send_event(event).await;
        Ok::<_, String>(())
      });
    }
    }
  }
  Ok(listing_id)
}

#[tauri::command]
fn publish_mix(
  state: State<AppState>,
  session_token: String,
  cid: String,
  title: String,
  bpm: Option<i32>,
  key: Option<String>,
  tracklist: Option<String>,
) -> Result<String, String> {
  let author = get_handle_from_session(&state, &session_token)?;
  if state.relay_manager.lock().unwrap().relay_count() == 0 {
    return Err("No relays connected".to_string());
  }
  let keys = match user_nostr_keys_for_publish(&state, &author, "mix publish") {
    Some(k) => k,
    None => return Err("No Nostr signing key for user".to_string()),
  };

  let content = format!("DJ Mix: {}", title);
  let mut tags: Vec<Vec<String>> = vec![
    vec!["t".to_string(), "blkspace".to_string()],
    vec!["cid".to_string(), cid.clone()],
    vec!["title".to_string(), title.clone()],
  ];
  if let Some(b) = bpm {
    tags.push(vec!["bpm".to_string(), b.to_string()]);
  }
  if let Some(k) = key {
    tags.push(vec!["key".to_string(), k]);
  }
  if let Some(tl) = tracklist {
    tags.push(vec!["tracklist".to_string(), tl]);
  }

  let client = state.relay_manager.lock().unwrap().client().clone();
  if let Ok(rt) = tokio::runtime::Runtime::new() {
    let _ = rt.block_on(async {
      use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
      let ntags: Vec<Tag> = tags.iter().filter_map(|t| Tag::parse(t.clone()).ok()).collect();
      let event = EventBuilder::new(Kind::Custom(30078), &content)
        .tags(ntags)
        .sign(&keys)
        .await
        .map_err(|e| format!("Nostr sign: {}", e))?;
      let _ = client.send_event(event).await;
      Ok::<_, String>(())
    });
  }

  // Reward per reward-formulas.md: DJ mix upload 8 WB
  let _ = state.db.grant_weix_bucks(&author, 8, "DJ mix published");

  Ok(cid)
}

#[tauri::command]
fn buy_marketplace_listing(state: State<AppState>, session_token: String, listing_id: i64) -> Result<Option<serde_json::Value>, String> {
  let buyer = get_handle_from_session(&state, &session_token)?;
  let result = state.db.buy_marketplace_listing(listing_id, &buyer).map_err(|e| e.to_string())?;
  if let Some(listing) = &result {
    // Publish Nostr 30081 for NFT listing/purchase if applicable
    if listing["isNft"].as_bool().unwrap_or(false) {
      let has_relays = state.relay_manager.lock().unwrap().relay_count() > 0;
      if has_relays {
        if let Some(keys) = user_nostr_keys_for_publish(&state, &buyer, "marketplace purchase publish") {
        let content = format!("Purchased NFT: {}", listing["itemType"]);
        let tags: Vec<Vec<String>> = vec![
          vec!["t".to_string(), "blkspace".to_string()],
          vec!["id".to_string(), listing_id.to_string()],
          vec!["seller".to_string(), listing["seller"].as_str().unwrap_or("").to_string()],
        ];
        let client = state.relay_manager.lock().unwrap().client().clone();
        if let Ok(rt) = tokio::runtime::Runtime::new() {
          let _ = rt.block_on(async {
            use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
            let ntags: Vec<Tag> = tags.iter().filter_map(|t| Tag::parse(t.clone()).ok()).collect();
            let event = EventBuilder::new(Kind::Custom(30081), &content).tags(ntags).sign(&keys).await.map_err(|e| format!("Nostr sign: {}", e))?;
            let _ = client.send_event(event).await;
            Ok::<_, String>(())
          });
        }
        }
      }
    }
    // Delivery: if has itemRef (CID/hash), buyer can fetch via existing get_blob / Iroh
  }
  Ok(result)
}

// ─── Post Commands ───────────────────────────────────────

#[tauri::command]
fn list_posts(state: State<AppState>, town: Option<String>, current_user: Option<String>) -> Result<Vec<Post>, String> {
  state.db.list_posts(town.as_deref(), current_user.as_deref()).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn get_post(state: State<AppState>, id: i64, current_user: Option<String>) -> Result<Option<Post>, String> {
  state.db.get_post(id, current_user.as_deref()).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn build_post_nostr_tags(
  state: &AppState,
  town_tag: &str,
  channel_id: &str,
  media_hashes: &[String],
) -> Vec<Vec<String>> {
  let mut tags: Vec<Vec<String>> = vec![
    vec!["t".to_string(), format!("hbcu-town:{}", town_tag)],
    vec!["t".to_string(), "blkspace".to_string()],
  ];
  if !channel_id.is_empty() {
    tags.push(vec![
      "t".to_string(),
      format!("blkspace:channel:{}", channel_id),
    ]);
    tags.push(vec![
      "g".to_string(),
      format!("{}:{}", town_tag, channel_id),
    ]);
  }
  for hash in media_hashes {
    if let Ok(Some(rec)) = state.db.get_blob_record(hash) {
      let cid = rec.cid.as_deref().unwrap_or(hash.as_str());
      tags.push(vec![
        "imeta".to_string(),
        format!("url blob://{}", hash),
        format!("m {}", rec.mime_type),
        format!("x {}", hash),
        format!("cid {}", cid),
      ]);
    } else {
      tags.push(vec![
        "imeta".to_string(),
        format!("url blob://{}", hash),
        format!("x {}", hash),
      ]);
    }
  }
  tags
}

fn publish_post_to_nostr(
  state: &AppState,
  author_handle: &str,
  post_id: i64,
  content: &str,
  town_tag: &str,
  channel_id: &str,
  media_hashes: &[String],
) {
  let has_relays = state.relay_manager.lock().unwrap().relay_count() > 0;
  if !has_relays {
    return;
  }
  let user_keys = match user_nostr_keys_for_publish(state, author_handle, "post publish") {
    Some(k) => k,
    None => return,
  };
  let nostr_client = state.relay_manager.lock().unwrap().client().clone();
  let tag_vecs = build_post_nostr_tags(state, town_tag, channel_id, media_hashes);

  if let Ok(rt) = tokio::runtime::Runtime::new() {
    let result = rt.block_on(async {
      use nostr_sdk::prelude::{Tag, EventBuilder};
      let nostr_tags: Vec<Tag> = tag_vecs
        .iter()
        .filter_map(|t| Tag::parse(t.clone()).ok())
        .collect();
      let event = EventBuilder::text_note(content)
        .tags(nostr_tags)
        .sign(&user_keys)
        .await
        .map_err(|e| format!("Signing failed: {}", e))?;
      let event_id_hex = event.id.to_hex();
      if let Ok(json) = serde_json::to_string(&event) {
        let _ = state.db.store_nostr_event_json(&event_id_hex, &json);
      }
      nostr_client
        .send_event(event)
        .await
        .map_err(|e| format!("Publish failed: {}", e))?;
      Ok::<_, String>(event_id_hex)
    });
    match result {
      Ok(event_id) => {
        let _ = state.db.update_post_nostr_meta(post_id, &event_id, "self-published");
      }
      Err(e) => log::warn!("Nostr post publish failed for {author_handle}: {e}"),
    }
  }
}

#[tauri::command]
fn create_post(
  state: State<AppState>,
  session_token: String,
  content: String,
  town_tag: String,
  channel_id: Option<String>,
  media_hashes: Option<String>,
) -> Result<CreatePostResult, String> {
  let author_handle = check_session_rate_limit(&state, &session_token)?;
  validate_content(&content).map_err(map_err)?;
  validate_town(&town_tag).map_err(map_err)?;
  let hashes: Vec<String> = media_hashes
    .map(|j| serde_json::from_str(&j).unwrap_or_default())
    .unwrap_or_default();
  let hashes: Vec<String> = hashes.into_iter().take(10).collect();
  let ch = channel_id.unwrap_or_default();
  let result = state
    .db
    .create_post(&author_handle, &content, &town_tag, &ch, &hashes)
    .map_err(|e| AppError::from(e).to_string())?;

  publish_post_to_nostr(
    &state,
    &author_handle,
    result.post.id,
    &content,
    &town_tag,
    &ch,
    &hashes,
  );

  Ok(result)
}

#[tauri::command]
fn get_user_posts(state: State<AppState>, handle: String, current_user: Option<String>) -> Result<Vec<Post>, String> {
  validate_handle(&handle).map_err(map_err)?;
  state.db.get_user_posts(&handle, current_user.as_deref()).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn get_trending_feed(state: State<AppState>, current_user: Option<String>) -> Result<Vec<Post>, String> {
  state.db.get_trending_feed(current_user.as_deref()).map_err(|e| AppError::from(e).to_string())
}

// ─── Reply Commands ──────────────────────────────────────

#[tauri::command]
fn list_replies(state: State<AppState>, post_id: i64) -> Result<Vec<Reply>, String> {
  state.db.list_replies(post_id).map_err(|e| AppError::from(e).to_string())
}

fn publish_reply_to_nostr(state: &AppState, author_handle: &str, post_id: i64, content: &str) {
  let has_relays = state.relay_manager.lock().unwrap().relay_count() > 0;
  let user_keys = user_nostr_keys_for_publish(state, author_handle, "reply publish");
  if !has_relays || user_keys.is_none() {
    return;
  }
  let user_keys = user_keys.unwrap();
  let Ok(Some(parent)) = state.db.get_post(post_id, None) else {
    return;
  };
  let town = parent.town_tag.clone();
  let ch = parent.channel_id.clone();
  let nostr_client = state.relay_manager.lock().unwrap().client().clone();
  let content = content.to_string();
  if let Ok(rt) = tokio::runtime::Runtime::new() {
    let result = rt.block_on(async {
      use nostr_sdk::prelude::{Tag, EventBuilder};
      let mut tags: Vec<Vec<String>> = vec![
        vec!["t".to_string(), format!("hbcu-town:{}", town)],
        vec!["t".to_string(), "blkspace".to_string()],
        vec!["e".to_string(), post_id.to_string()],
      ];
      if !ch.is_empty() {
        tags.push(vec![
          "t".to_string(),
          format!("blkspace:channel:{}", ch),
        ]);
      }
      let nostr_tags: Vec<Tag> = tags
        .iter()
        .filter_map(|t| Tag::parse(t.clone()).ok())
        .collect();
      let event = EventBuilder::text_note(&content)
        .tags(nostr_tags)
        .sign(&user_keys)
        .await
        .map_err(|e| format!("Reply sign: {}", e))?;
      nostr_client
        .send_event(event)
        .await
        .map_err(|e| format!("Reply publish: {}", e))?;
      Ok::<_, String>(())
    });
    if let Err(e) = result {
      log::warn!("Nostr reply publish failed for {author_handle}: {e}");
    }
  }
}

#[tauri::command]
fn create_reply(state: State<AppState>, session_token: String, post_id: i64, content: String) -> Result<CreateReplyResult, String> {
  let author_handle = check_session_rate_limit(&state, &session_token)?;
  validate_content(&content).map_err(map_err)?;
  let result = state.db.create_reply(post_id, &author_handle, &content).map_err(|e| AppError::from(e).to_string())?;
  publish_reply_to_nostr(&state, &author_handle, post_id, &content);
  Ok(result)
}

// ─── Like Command ────────────────────────────────────────

#[tauri::command]
fn toggle_like(
  state: State<AppState>,
  session_token: String,
  post_id: i64,
) -> Result<ToggleLikeResult, String> {
  let user_handle = check_session_rate_limit(&state, &session_token)?;
  state
    .db
    .toggle_like(post_id, &user_handle)
    .map_err(|e| AppError::from(e).to_string())
}

// ─── Notification Commands ───────────────────────────────

#[tauri::command]
fn get_notifications(state: State<AppState>, session_token: String) -> Result<Vec<Notification>, String> {
  let user_handle = get_handle_from_session(&state, &session_token)?;
  state.db.get_notifications(&user_handle).map_err(|e| AppError::from(e).to_string())
}

// ─── Wallet Commands ─────────────────────────────────────

#[tauri::command]
fn get_wallet_tx(state: State<AppState>, session_token: String) -> Result<Vec<WalletTx>, String> {
  let user_handle = get_handle_from_session(&state, &session_token)?;
  state.db.get_wallet_tx(&user_handle).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn send_weixbucks(
  state: State<AppState>,
  session_token: String,
  to_handle: String,
  amount: i64,
) -> Result<(i64, i64), String> {
  let user_handle = check_session_rate_limit(&state, &session_token)?;
  validate_handle(&to_handle).map_err(map_err)?;
  if to_handle == user_handle {
    return Err("Cannot send WeixBucks to yourself".to_string());
  }
  let res = state.db.send_weixbucks(&user_handle, &to_handle, amount)
    .map_err(|e| AppError::from(e).to_string())?;

  // Real signed custom kind 30079 (Tip) - Nostr hygiene.
  // Signs with the *sender's* (user_handle) real user key.
  let has_relays = state.relay_manager.lock().unwrap().relay_count() > 0;
  if has_relays {
    if let Some(user_keys) = user_nostr_keys_for_publish(&state, &user_handle, "tip publish") {
      let content = format!("Tip {} WB to @{}", amount, to_handle);
      let tags: Vec<Vec<String>> = vec![
        vec!["t".to_string(), "blkspace".to_string()],
        vec!["t".to_string(), "tip".to_string()],
        vec!["p".to_string(), to_handle.clone()],
        vec!["amount".to_string(), amount.to_string()],
      ];
      let nostr_client = state.relay_manager.lock().unwrap().client().clone();
      if let Ok(rt) = tokio::runtime::Runtime::new() {
        let result = rt.block_on(async {
          use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
          let nostr_tags: Vec<Tag> = tags.iter().filter_map(|t| Tag::parse(t.clone()).ok()).collect();
          let event = EventBuilder::new(Kind::Custom(30079), &content)
            .tags(nostr_tags)
            .sign(&user_keys)
            .await
            .map_err(|e| format!("Tip sign failed: {}", e))?;
          nostr_client
            .send_event(event)
            .await
            .map_err(|e| format!("Tip publish: {}", e))?;
          Ok::<_, String>(())
        });
        if let Err(e) = result {
          log::warn!("Nostr tip publish failed for {user_handle}: {e}");
        }
      }
    }
  }

  Ok(res)
}

#[tauri::command]
fn get_tokenomics_policy() -> TokenomicsPolicy {
  TokenomicsPolicy::published()
}

#[tauri::command]
fn get_withdraw_eligibility(
  state: State<AppState>,
  session_token: String,
  amount_wb: Option<i64>,
) -> Result<WithdrawEligibility, String> {
  let user_handle = get_handle_from_session(&state, &session_token)?;
  state
    .db
    .evaluate_withdraw_eligibility(&user_handle, amount_wb)
    .map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn withdraw_to_solana(
  state: State<AppState>,
  session_token: String,
  student_solana_address: String,
  amount_wb: i64,
) -> Result<String, String> {
  let user_handle = check_session_rate_limit(&state, &session_token)?;

  // Basic validation of Solana address (must be 32-44 base58 characters)
  if student_solana_address.len() < 32 || student_solana_address.len() > 44 {
    return Err("Invalid Solana address format".to_string());
  }

  let eligibility = state
    .db
    .evaluate_withdraw_eligibility(&user_handle, Some(amount_wb))
    .map_err(|e| AppError::from(e).to_string())?;
  if !eligibility.eligible {
    return Err(
      eligibility
        .reasons
        .first()
        .cloned()
        .unwrap_or_else(|| "Withdrawal not eligible".into()),
    );
  }

  // Kalshi-style settlement: debit principal + published settlement fee (simulated on-chain until counsel)
  let settlement_fee = calc_platform_fee(amount_wb, WITHDRAW_SETTLEMENT_FEE_BPS);
  let total_debit = amount_wb + settlement_fee;
  let desc = format!(
    "Withdrawn to Solana address: {}... ({} WB settlement + {} WB fee)",
    &student_solana_address[0..8],
    amount_wb,
    settlement_fee,
  );
  let _new_balance = state.db.deduct_weix_bucks(&user_handle, total_debit, &desc)
    .map_err(|e| e.to_string())?;
  
  // Simulate Solana transaction hash generation (Base58, 88 chars)
  let chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let mut signature = String::new();
  for _ in 0..88 {
    let idx = (uuid::Uuid::new_v4().as_u128() % 58) as usize;
    signature.push(chars.chars().nth(idx).unwrap_or('1'));
  }
  
  Ok(signature)
}

// ─── Network & Relay Commands ───────────────────────────

#[tauri::command]
fn get_network_stats(state: State<AppState>) -> Result<NetworkStats, String> {
  state.db.get_network_stats().map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn list_relays(state: State<AppState>) -> Result<Vec<Relay>, String> {
  state.db.list_relays().map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn get_recent_activity(state: State<AppState>) -> Result<Vec<serde_json::Value>, String> {
  state.db.get_recent_activity().map_err(|e| AppError::from(e).to_string())
}

// ─── Community Commands ──────────────────────────────────

#[tauri::command]
fn get_communities(state: State<AppState>) -> Vec<Community> {
  state.db.get_communities()
}

#[tauri::command]
fn list_channels(state: State<AppState>, community_id: String) -> Vec<db::Channel> {
  state.db.list_channels(&community_id)
}

#[tauri::command]
fn list_posts_for_channel(state: State<AppState>, channel_id: String, current_user: Option<String>) -> Result<Vec<Post>, String> {
  state.db.list_posts_for_channel(&channel_id, current_user.as_deref()).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn create_channel(
  state: State<AppState>,
  session_token: String,
  community_id: String,
  name: String,
  description: Option<String>,
) -> Result<db::Channel, String> {
  let _handle = get_handle_from_session(&state, &session_token)?;
  if name.trim().is_empty() {
    return Err("Channel name required".to_string());
  }
  let id = name.trim().trim_start_matches('#').to_lowercase().replace(|c: char| !c.is_alphanumeric() && c != '-', "-");
  let desc = description.unwrap_or_default();
  state.db.create_channel(&community_id, &id, &name, &desc).map_err(|e| e.to_string())
}

// ─── Relay Networking Commands ───────────────────────────

#[tauri::command]
fn connect_to_relay(state: State<AppState>, session_token: String, url: String, name: String, town: String) -> Result<String, String> {
  get_handle_from_session(&state, &session_token)?;
  let url_trimmed = url.trim().to_string();
  if !url_trimmed.starts_with("wss://") && !url_trimmed.starts_with("ws://") {
    return Err("Relay URL must start with wss:// or ws://".to_string());
  }
  let url_for_conn = url_trimmed.clone();
  let town_for_conn = town.clone();
  let name_for_conn = name.clone();
  let mut manager = state.relay_manager.lock().unwrap();
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  let latency = rt.block_on(async {
    manager.add_relay(&url_for_conn).await?;
    manager.connect_relay(&url_for_conn).await?;
    let health = manager.check_health(&url_for_conn).await.ok();
    manager.register_connection(url_for_conn.clone(), health);
    Ok::<_, String>(health)
  })?;
  state.db.upsert_relay_connection(&url_trimmed, &name_for_conn, &town_for_conn, "connected")
    .map_err(|e| format!("DB error: {}", e))?;
  match latency {
    Some(ms) => Ok(format!("Connected to {} (latency: {}ms)", url_trimmed, ms)),
    None => Ok(format!("Connected to {} (health check failed)", url_trimmed)),
  }
}

#[tauri::command]
fn check_relay_health(state: State<AppState>, url: String) -> Result<(bool, Option<u64>), String> {
  let url_trimmed = url.trim().to_string();
  let manager = state.relay_manager.lock().unwrap();
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  let latency = rt.block_on(async {
    manager.check_health(&url_trimmed).await.ok()
  });
  match latency {
    Some(ms) => Ok((true, Some(ms))),
    None => Ok((false, None)),
  }
}

#[tauri::command]
fn connect_to_default_relays(state: State<AppState>) -> Result<Vec<String>, String> {
  let mut manager = state.relay_manager.lock().unwrap();
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  let connected = rt.block_on(async { manager.connect_to_default_relays().await })?;
  for url in &connected {
    let _ = state.db.upsert_relay_connection(url, "Public", "global", "connected");
  }
  Ok(connected)
}

#[tauri::command]
fn disconnect_from_relay(state: State<AppState>, session_token: String, url: String) -> Result<String, String> {
  get_handle_from_session(&state, &session_token)?;
  let url_trimmed = url.trim().to_string();
  let mut manager = state.relay_manager.lock().unwrap();
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  rt.block_on(async {
    manager.disconnect_relay(&url_trimmed).await?;
    manager.remove_connection(&url_trimmed);
    Ok::<_, String>(())
  })?;
  state.db.upsert_relay_connection(&url_trimmed, "", "", "disconnected")
    .map_err(|e| format!("DB error: {}", e))?;
  Ok(format!("Disconnected from {}", url_trimmed))
}

#[tauri::command]
fn get_relay_statuses(state: State<AppState>) -> Vec<RelayStatus> {
  state.relay_manager.lock().unwrap().get_statuses()
}

#[tauri::command]
fn list_relay_connections(state: State<AppState>) -> Result<Vec<RelayConnectionRecord>, String> {
  state.db.list_relay_connections().map_err(|e| e.to_string())
}

#[tauri::command]
fn sync_town_events(
  state: State<AppState>,
  session_token: String,
  town: String,
) -> Result<Vec<NostrEventData>, String> {
  get_handle_from_session(&state, &session_token)?;
  let town_tag = format_hbcu_town_tag(&town);
  let town_id = town_id_from_tag(&town_tag);
  let mut manager = state.relay_manager.lock().unwrap();
  if manager.relay_count() == 0 {
    return Err("No relays connected. Connect to a relay first.".to_string());
  }
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  rt.block_on(async {
    manager.subscribe_tag_filter("t", &town_tag, 3600).await?;
    let now = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap_or_default()
      .as_secs();
    let filter = nostr_sdk::prelude::Filter::new()
      .custom_tag(
        nostr_sdk::prelude::SingleLetterTag::lowercase(nostr_sdk::prelude::Alphabet::T),
        vec![town_tag.as_str()],
      )
      .since(nostr_sdk::prelude::Timestamp::from_secs(now - 3600));
    let events = manager.sync_recent(filter, 5).await?;

    for event in &events {
      if event.event_json.is_empty() {
        continue;
      }
      let _ = ingest_validated_relay_event(&state, &event.event_json, "synced", Some(&town_id));
    }
    Ok(events)
  })
}

#[tauri::command]
fn list_relay_events(
  state: State<AppState>,
  session_token: String,
  limit: Option<i64>,
  kind_filter: Option<i64>,
) -> Result<Vec<RelayEventRecord>, String> {
  let _handle = get_handle_from_session(&state, &session_token)?;
  state.db.list_relay_events(limit.unwrap_or(50), kind_filter)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_relay_events_with_consensus(
  state: State<AppState>,
  session_token: String,
  limit: Option<i64>,
  kind_filter: Option<i64>,
  min_relays: Option<usize>,
) -> Result<Vec<serde_json::Value>, String> {
  let _handle = get_handle_from_session(&state, &session_token)?;
  state.db.list_relay_events_with_consensus(limit.unwrap_or(50), kind_filter, min_relays.unwrap_or(2))
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn subscribe_to_town(state: State<AppState>, session_token: String, town: String) -> Result<(), String> {
  get_handle_from_session(&state, &session_token)?;
  let town_tag = format_hbcu_town_tag(&town);
  let mut subs = state.relay_town_subscriptions.lock().unwrap();
  if !subs.contains(&town_tag) {
    subs.push(town_tag);
  }
  Ok(())
}

#[tauri::command]
fn unsubscribe_from_town(state: State<AppState>, session_token: String, town: String) -> Result<(), String> {
  get_handle_from_session(&state, &session_token)?;
  let town_tag = format_hbcu_town_tag(&town);
  let mut subs = state.relay_town_subscriptions.lock().unwrap();
  subs.retain(|t| t != &town_tag);
  Ok(())
}

#[tauri::command]
fn list_subscribed_towns(state: State<AppState>) -> Vec<String> {
  state.relay_town_subscriptions.lock().unwrap().clone()
}

#[tauri::command]
fn list_combined_feed(state: State<AppState>, town: Option<String>, current_user: Option<String>) -> Result<Vec<CrossTownEvent>, String> {
  state.db.list_combined_feed(town.as_deref(), current_user.as_deref()).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn publish_relay_list(state: State<AppState>, session_token: String) -> Result<String, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  let keys = user_nostr_keys_for_publish(&state, &handle, "NIP-65 relay list publish")
    .ok_or("No Nostr signing key stored — cannot publish relay list")?;
  let client = state.relay_manager.lock().unwrap().client_clone();
  let connections = state.db.list_relay_connections()
    .map_err(|e| e.to_string())?;
  if connections.is_empty() {
    return Err("No relay connections to publish".to_string());
  }
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  rt.block_on(async {
    use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
    let mut tags: Vec<Tag> = Vec::new();
    for conn in &connections {
      if let Ok(tag) = Tag::parse(vec!["r".to_string(), conn.url.clone(), "write".to_string()]) {
        tags.push(tag);
      }
    }
    let event = EventBuilder::new(Kind::RelayList, "")
      .tags(tags)
      .sign(&keys)
      .await
      .map_err(|e| format!("Signing failed: {}", e))?;
    let event_id_hex = event.id.to_hex();
    let event_json = serde_json::to_string(&event)
      .map_err(|e| format!("Serialize failed: {}", e))?;
    client
      .send_event(event)
      .await
      .map_err(|e| format!("Publish failed: {}", e))?;

    let _ = ingest_validated_relay_event(&state, &event_json, "self-published", None);

    Ok(event_id_hex)
  })
}

#[tauri::command]
fn fetch_user_relay_list(state: State<AppState>, session_token: String, pubkey: String) -> Result<Vec<String>, String> {
  get_handle_from_session(&state, &session_token)?;
  let pubkey = pubkey.trim().to_string();
  if pubkey.len() != 64 {
    return Err("Invalid pubkey — expected 64 hex characters".to_string());
  }

  ensure_default_relays_connected(&state)?;
  let client = state.relay_manager.lock().unwrap().client_clone();
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  let live_urls = rt.block_on(async {
    let fetched =
      RelayManager::fetch_relay_list_event_on_client(&client, &pubkey, 15).await?;
    if let Some(event_data) = fetched {
      if !event_data.event_json.is_empty() {
        let _ = ingest_validated_relay_event(&state, &event_data.event_json, "nip65-fetch", None);
      }
      let urls = RelayManager::relay_urls_from_tags(&event_data.tags);
      if !urls.is_empty() {
        return Ok::<_, String>(urls);
      }
    }
    Ok(Vec::new())
  })?;

  if !live_urls.is_empty() {
    return Ok(live_urls);
  }
  Ok(state.db.get_relay_list_from_tags(&pubkey))
}

/// Seeds Jane Doe with a NIP-65 relay list in SQLite and returns a viewer session (e2e only).
#[tauri::command]
fn e2e_prepare_profile_relay_fixture(state: State<AppState>) -> Result<serde_json::Value, String> {
  #[cfg(not(feature = "e2e-testing"))]
  {
    let _ = state;
    return Err("e2e_prepare_profile_relay_fixture is only available in e2e builds".to_string());
  }

  #[cfg(feature = "e2e-testing")]
  {
    const JANE_PUBKEY: &str =
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    const VIEWER_PUBKEY: &str =
      "1111111111111111111111111111111111111111111111111111111111111111";

    state
      .db
      .set_user_pubkey("jane_doe", JANE_PUBKEY)
      .map_err(|e| e.to_string())?;

    let tags = serde_json::json!([
      ["r", "wss://relay.damus.io"],
      ["r", "wss://nos.lol", "read"]
    ]);
    let now = chrono::Utc::now().timestamp();
    state
      .db
      .insert_relay_event(
        "e2e_jane_nip65_fixture",
        "e2e-fixture",
        10002,
        JANE_PUBKEY,
        "",
        &tags.to_string(),
        now,
      )
      .map_err(|e| e.to_string())?;

    let token = generate_token();
    let mut sessions = state.sessions.lock().unwrap();
    sessions.insert(
      token.clone(),
      SessionInfo {
        handle: "demo_user".to_string(),
        pubkey: VIEWER_PUBKEY.to_string(),
        created_at: Instant::now(),
      },
    );

    Ok(serde_json::json!({
      "sessionToken": token,
      "viewerPubkey": VIEWER_PUBKEY,
      "profileHandle": "jane_doe",
      "profilePubkey": JANE_PUBKEY,
    }))
  }
}

/// Kind 1063 blob metadata on relays. Returns `Ok(None)` when relays or keys are unavailable.
fn publish_blob_announce(
  state: &AppState,
  author_handle: &str,
  hash: &str,
  cid: Option<&str>,
  filename: &str,
) -> Result<Option<String>, String> {
  if state.relay_manager.lock().unwrap().relay_count() == 0 {
    return Ok(None);
  }
  let user_keys = match user_nostr_keys_for_publish(state, author_handle, "blob announce publish") {
    Some(k) => k,
    None => return Ok(None),
  };
  validate_blob_hash(hash)?;
  let mime = mime_from_filename(filename);
  let client = state.relay_manager.lock().unwrap().client_clone();
  let hash = hash.to_string();
  let filename = filename.to_string();
  let cid = cid.map(|c| c.to_string());
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  rt.block_on(async {
    use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
    let mut tag_vecs = vec![
      vec!["url".to_string(), format!("blob://{}", hash)],
      vec!["m".to_string(), mime],
      vec!["x".to_string(), hash.clone()],
    ];
    if let Some(ref c) = cid {
      tag_vecs.push(vec!["cid".to_string(), c.clone()]);
    }
    let tags: Vec<Tag> = tag_vecs
      .into_iter()
      .filter_map(|t| Tag::parse(t).ok())
      .collect();
    let event = EventBuilder::new(Kind::Custom(1063), &filename)
      .tags(tags)
      .sign(&user_keys)
      .await
      .map_err(|e| format!("Signing failed: {}", e))?;
    let event_id = client
      .send_event(event)
      .await
      .map_err(|e| format!("Publish failed: {}", e))?;
    Ok(Some(event_id.to_hex()))
  })
}

#[tauri::command]
fn announce_blob(state: State<AppState>, session_token: String, hash: String, filename: String) -> Result<String, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  if state.relay_manager.lock().unwrap().relay_count() == 0 {
    return Err("No relays connected".to_string());
  }
  if user_nostr_keys_for_publish(&state, &handle, "blob announce publish").is_none() {
    return Err("No Nostr signing key stored — cannot announce blob".to_string());
  }
  let cid = state
    .db
    .get_blob_record(&hash)
    .ok()
    .flatten()
    .and_then(|r| r.cid);
  match publish_blob_announce(&state, &handle, &hash, cid.as_deref(), &filename)? {
    Some(event_id) => Ok(event_id),
    None => Err("No relays connected".to_string()),
  }
}

#[tauri::command]
fn get_relay_network_stats(state: State<AppState>) -> Result<NetworkStats, String> {
  let mut stats = state.db.get_network_stats().map_err(|e| e.to_string())?;
  let relay_count = state.relay_manager.lock().unwrap().relay_count() as i64;
  stats.online_relays = relay_count;
  stats.total_relays = std::cmp::max(stats.total_relays, relay_count);
  let since = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap_or_default()
    .as_secs() - 86400;
  if let Ok(count) = state.db.count_relay_events_since(since as i64) {
    stats.events_last_24h += count;
  }
  Ok(stats)
}

// ─── Trending Gossip (Cross-Town Sync) ───────────────────

#[tauri::command]
fn publish_trending_summary(state: State<AppState>, session_token: String) -> Result<String, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  let stats = state.db.get_network_stats().map_err(|e| e.to_string())?;
  let top_posts: Vec<_> = state.db.get_trending_feed(None).map_err(|e| e.to_string())?.into_iter().take(5).collect();
  
  let summary = serde_json::json!({
    "town": "tsu",
    "week": chrono::Utc::now().format("%Y-%m-%d").to_string(),
    "top_posts": top_posts.iter().map(|p| serde_json::json!({
      "id": p.id,
      "author": p.author_handle,
      "content": p.content.chars().take(100).collect::<String>(),
      "likes": p.likes_count,
      "replies": p.replies_count,
    })).collect::<Vec<_>>(),
    "new_users": stats.total_users,
    "total_events": stats.events_last_24h,
    "weix_bucks_circulating": stats.weix_bucks_in_circulation,
  });
  
  let keys = user_nostr_keys_for_publish(&state, &handle, "trending summary publish")
    .ok_or("No Nostr signing key stored — cannot publish trending summary")?;
  let client = state.relay_manager.lock().unwrap().client_clone();

  if state.relay_manager.lock().unwrap().relay_count() == 0 {
    return Err("No relays connected".to_string());
  }
  
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  rt.block_on(async {
    use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
    let tag = Tag::parse(vec!["t".to_string(), "hbcu-town:tsu".to_string()]).ok();
    let event = EventBuilder::new(Kind::Custom(1030), summary.to_string())
      .tags(tag.into_iter().collect::<Vec<_>>())
      .sign(&keys)
      .await
      .map_err(|e| format!("Signing failed: {}", e))?;
    let event_id = client.send_event(event)
      .await
      .map_err(|e| format!("Publish failed: {}", e))?;
    Ok(event_id.to_hex())
  })
}

#[tauri::command]
fn fetch_trending_summaries(state: State<AppState>, session_token: String, town: String) -> Result<Vec<String>, String> {
  let _handle = get_handle_from_session(&state, &session_token)?;
  let events = state.db.list_relay_events(50, Some(1030)).map_err(|e| e.to_string())?;
  
  let summaries: Vec<String> = events.into_iter()
    .filter(|e| {
      let tags: Vec<Vec<String>> = serde_json::from_str(&e.tags).unwrap_or_default();
      tags.iter().any(|t| t.len() >= 2 && t[0] == "t" && t[1].contains(&town))
    })
    .map(|e| e.content)
    .collect();
  
  Ok(summaries)
}

// ─── Pinning & Content Persistence ─────────────────────

#[tauri::command]
fn pin_content(state: State<AppState>, session_token: String, hash: String) -> Result<bool, String> {
  let pinned_by = get_handle_from_session(&state, &session_token)?;
  validate_blob_hash(&hash)?;
  
  // Check if already pinned
  if state.db.is_pinned(&hash, &pinned_by).map_err(|e| e.to_string())? {
    return Ok(false);
  }
  
  // Pin in database
  let pinned = state.db.pin_blob(&hash, &pinned_by).map_err(|e| e.to_string())?;
  
  #[cfg(feature = "iroh")]
  if let Some(iroh) = &state.iroh {
    let iroh = iroh.lock().unwrap();
    let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
    if let Ok(Some(_)) = rt.block_on(iroh.get_blob(&hash)) {
      log::info!("Blob {} pinned by {} (already in Iroh)", hash, pinned_by);
    } else {
      log::warn!("Blob {} not in Iroh, but pinned locally", hash);
    }
  }
  
  Ok(pinned)
}

#[tauri::command]
fn should_pin_content(state: State<AppState>, hash: String) -> Result<bool, String> {
  validate_blob_hash(&hash)?;
  state.db.should_pin(&hash).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_pinned_content(state: State<AppState>, session_token: String) -> Result<Vec<String>, String> {
  let pinned_by = get_handle_from_session(&state, &session_token)?;
  state.db.list_pinned_blobs(&pinned_by).map_err(|e| e.to_string())
}

// ─── Node Rewards (Pinning & Serving) ───────────────────

#[tauri::command]
fn report_pin_serve(state: State<AppState>, session_token: String, hash: String) -> Result<bool, String> {
  let served_by = get_handle_from_session(&state, &session_token)?;
  validate_blob_hash(&hash)?;
  
  // Record the serve
  state.db.record_pin_serve(&hash, &served_by, &served_by).map_err(|e| e.to_string())?;
  
  // Check daily cap (100 serves/day = 10 WB max)
  let serves_today = state.db.count_serves_today(&served_by).map_err(|e| e.to_string())?;
  if serves_today > 100 {
    return Ok(false); // Daily cap reached
  }
  
  // Credit node operator: 0.1 WB per serve
  let conn = state.db.conn.lock().unwrap();
  conn.execute(
    "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
    rusqlite::params![0.1, served_by],
  ).ok();
  conn.execute(
    "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
     SELECT ?1, 'earn', ?2, 'Pin serve reward', weix_bucks FROM users WHERE handle = ?1",
    rusqlite::params![served_by, 0.1],
  ).ok();
  drop(conn);

  // 30083 pin report Nostr (Nostr kinds)
  let hasr = { state.relay_manager.lock().unwrap().relay_count() > 0 };
  if hasr {
    if let Some(ukeys) = user_nostr_keys_for_publish(&state, &served_by, "pin serve report") {
      let content = format!("Pin serve report for {}", hash);
      let tags: Vec<Vec<String>> = vec![
        vec!["t".to_string(), "blkspace".to_string()],
        vec!["hash".to_string(), hash.clone()],
        vec!["serves".to_string(), "1".to_string()],
      ];
      let nclient = { state.relay_manager.lock().unwrap().client().clone() };
      if let Ok(rt) = tokio::runtime::Runtime::new() {
        let _ = rt.block_on(async {
          use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
          let ntags: Vec<Tag> = tags.iter().filter_map(|t| Tag::parse(t.clone()).ok()).collect();
          let ev = EventBuilder::new(Kind::Custom(30083), &content).tags(ntags).sign(&ukeys).await.map_err(|e| format!("Pin report sign: {}", e))?;
          let _ = nclient.send_event(ev).await;
          Ok::<_, String>(())
        });
      }
    }
  }

  Ok(true)
}

#[tauri::command]
fn claim_node_rewards(state: State<AppState>, session_token: String) -> Result<f64, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  let serves_today = state.db.count_serves_today(&handle).map_err(|e| e.to_string())?;
  let rewards = (serves_today as f64) * 0.1;

  // Publish 30080 reward grant on claim (Nostr hygiene)
  let has_relays = { state.relay_manager.lock().unwrap().relay_count() > 0 };
  if has_relays {
    let Some(user_keys) = user_nostr_keys_for_publish(&state, &handle, "node reward claim publish") else {
      return Ok(rewards);
    };
    let content = format!("Node reward grant of {} WB", rewards);
    let tags: Vec<Vec<String>> = vec![
      vec!["t".to_string(), "blkspace".to_string()],
      vec!["amount".to_string(), rewards.to_string()],
      vec!["reason".to_string(), "pin_serves".to_string()],
    ];
    let nostr_client = { state.relay_manager.lock().unwrap().client().clone() };
    if let Ok(rt) = tokio::runtime::Runtime::new() {
      let _ = rt.block_on(async {
        use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
        let nostr_tags: Vec<Tag> = tags.iter().filter_map(|t| Tag::parse(t.clone()).ok()).collect();
        let event = EventBuilder::new(Kind::Custom(30080), &content)
          .tags(nostr_tags)
          .sign(&user_keys)
          .await
          .map_err(|e| format!("Reward sign: {}", e))?;
        let _ = nostr_client.send_event(event).await;
        Ok::<_, String>(())
      });
    }
  }

  Ok(rewards)
}

// ─── Cross-Device Content Sync ──────────────────────────

#[tauri::command]
fn sync_account_content(state: State<AppState>, session_token: String) -> Result<Vec<String>, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  
  // Get all media hashes from user's posts
  let hashes = state.db.get_user_media_hashes(&handle).map_err(|e| e.to_string())?;
  
  #[cfg(feature = "iroh")]
  if let Some(iroh) = &state.iroh {
    let iroh = iroh.lock().unwrap();
    let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
    
    let mut synced = Vec::new();
    for hash in &hashes {
      let iroh_key = state
        .db
        .get_blob_record(hash)
        .ok()
        .flatten()
        .and_then(|r| r.cid)
        .unwrap_or_else(|| hash.clone());
      match rt.block_on(iroh.get_blob(&iroh_key)) {
        Ok(Some(bytes)) => {
          // Store locally as fallback
          let _ = state.blob_store.store_blob(&bytes);
          synced.push(hash.clone());
          log::info!("Synced blob {} from Iroh (key {})", hash, iroh_key);
        }
        Ok(None) => {
          log::warn!("Blob {} not found in Iroh under key {}", hash, iroh_key);
        }
        Err(e) => {
          log::warn!("Failed to sync blob {} (key {}): {}", hash, iroh_key, e);
        }
      }
    }
    return Ok(synced);
  }
  
  Ok(Vec::new())
}

// ─── Offline Cache ────────────────────────────────────

#[tauri::command]
fn add_to_offline_cache(state: State<AppState>, session_token: String, hash: String, content_type: String, source: String) -> Result<bool, String> {
  let cached_by = get_handle_from_session(&state, &session_token)?;
  validate_blob_hash(&hash)?;
  state.db.add_to_offline_cache(&hash, &cached_by, &content_type, &source).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_from_offline_cache(state: State<AppState>, session_token: String, hash: String) -> Result<bool, String> {
  let cached_by = get_handle_from_session(&state, &session_token)?;
  validate_blob_hash(&hash)?;
  state.db.remove_from_offline_cache(&hash, &cached_by).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_offline_cache(state: State<AppState>, session_token: String) -> Result<Vec<String>, String> {
  let cached_by = get_handle_from_session(&state, &session_token)?;
  state.db.list_offline_cache(&cached_by).map_err(|e| e.to_string())
}

#[tauri::command]
fn prefetch_content(state: State<AppState>, session_token: String, hashes: Vec<String>) -> Result<Vec<String>, String> {
  let cached_by = get_handle_from_session(&state, &session_token)?;
  
  #[cfg(feature = "iroh")]
  if let Some(iroh) = &state.iroh {
    let iroh = iroh.lock().unwrap();
    let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
    
    let mut fetched = Vec::new();
    for hash in &hashes {
      let iroh_key = state
        .db
        .get_blob_record(hash)
        .ok()
        .flatten()
        .and_then(|r| r.cid)
        .unwrap_or_else(|| hash.clone());
      match rt.block_on(iroh.get_blob(&iroh_key)) {
        Ok(Some(bytes)) => {
          // Store locally as fallback
          let _ = state.blob_store.store_blob(&bytes);
          // Add to offline cache
          let _ = state.db.add_to_offline_cache(hash, &cached_by, "blob", "prefetched");
          fetched.push(hash.clone());
        }
        _ => {
          log::warn!("Failed to prefetch blob {}", hash);
        }
      }
    }
    return Ok(fetched);
  }
  
  Ok(Vec::new())
}

// ─── Offline Queue ─────────────────────────────────────

#[tauri::command]
fn queue_offline_action(state: State<AppState>, session_token: String, action_type: String, payload: String) -> Result<i64, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  state.db.queue_offline_action(&action_type, &payload, &handle)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_pending_offline_actions(state: State<AppState>, session_token: String) -> Result<Vec<(i64, String, String)>, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  state.db.get_pending_offline_actions(&handle)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn mark_offline_action_synced(state: State<AppState>, session_token: String, id: i64) -> Result<(), String> {
  let _handle = get_handle_from_session(&state, &session_token)?;
  state.db.mark_offline_action_synced(id)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_synced_offline_actions(state: State<AppState>, session_token: String) -> Result<usize, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  state.db.clear_synced_offline_actions(&handle)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn count_pending_offline_actions(state: State<AppState>, session_token: String) -> Result<i64, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  state.db.count_pending_offline_actions(&handle)
    .map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct FlushOfflineResult {
  synced: i64,
  failed: i64,
  remaining: i64,
}

#[derive(serde::Deserialize)]
struct OfflineCreatePostPayload {
  content: String,
  #[serde(default = "default_town_tag")]
  town_tag: String,
  #[serde(default)]
  channel_id: String,
  #[serde(default)]
  media_hashes: Vec<String>,
}

fn default_town_tag() -> String {
  "tsu".to_string()
}

#[derive(serde::Deserialize)]
struct OfflineLikePostPayload {
  post_id: i64,
}

#[derive(serde::Deserialize)]
struct OfflineCreateReplyPayload {
  post_id: i64,
  content: String,
}

#[derive(serde::Deserialize)]
struct OfflineToggleFollowPayload {
  followed_handle: String,
}

#[tauri::command]
fn flush_offline_queue(state: State<AppState>, session_token: String) -> Result<FlushOfflineResult, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  let pending = state
    .db
    .get_pending_offline_actions(&handle)
    .map_err(|e| e.to_string())?;

  let mut synced = 0i64;
  let mut failed = 0i64;

  for (id, action_type, payload) in pending {
    let result: Result<(), String> = match action_type.as_str() {
      "create_post" => {
        let p: OfflineCreatePostPayload =
          serde_json::from_str(&payload).map_err(|e| format!("Invalid create_post payload: {}", e))?;
        validate_content(&p.content).map_err(map_err)?;
        validate_town(&p.town_tag).map_err(map_err)?;
        let hashes: Vec<String> = p.media_hashes.into_iter().take(10).collect();
        let result = state
          .db
          .create_post(&handle, &p.content, &p.town_tag, &p.channel_id, &hashes)
          .map_err(|e| AppError::from(e).to_string())?;
        publish_post_to_nostr(
          &state,
          &handle,
          result.post.id,
          &p.content,
          &p.town_tag,
          &p.channel_id,
          &hashes,
        );
        Ok(())
      }
      "like_post" => {
        let p: OfflineLikePostPayload =
          serde_json::from_str(&payload).map_err(|e| format!("Invalid like_post payload: {}", e))?;
        let _ = state
          .db
          .toggle_like(p.post_id, &handle)
          .map_err(|e| AppError::from(e).to_string())?;
        Ok(())
      }
      "create_reply" => {
        let p: OfflineCreateReplyPayload = serde_json::from_str(&payload)
          .map_err(|e| format!("Invalid create_reply payload: {}", e))?;
        validate_content(&p.content).map_err(map_err)?;
        let _ = state
          .db
          .create_reply(p.post_id, &handle, &p.content)
          .map_err(|e| AppError::from(e).to_string())?;
        publish_reply_to_nostr(&state, &handle, p.post_id, &p.content);
        Ok(())
      }
      "toggle_follow" => {
        let p: OfflineToggleFollowPayload = serde_json::from_str(&payload)
          .map_err(|e| format!("Invalid toggle_follow payload: {}", e))?;
        validate_handle(&p.followed_handle).map_err(map_err)?;
        let _ = state
          .db
          .toggle_follow(&handle, &p.followed_handle)
          .map_err(|e| e.to_string())?;
        let _ = publish_kind3_contact_list(&state, &handle);
        Ok(())
      }
      other => Err(format!("Unknown offline action type: {}", other)),
    };

    match result {
      Ok(()) => {
        state.db.mark_offline_action_synced(id).map_err(|e| e.to_string())?;
        synced += 1;
      }
      Err(e) => {
        log::warn!("Offline flush failed for {} (id={}): {}", action_type, id, e);
        failed += 1;
      }
    }
  }

  let _ = state.db.clear_synced_offline_actions(&handle);
  let remaining = state
    .db
    .count_pending_offline_actions(&handle)
    .map_err(|e| e.to_string())?;

  Ok(FlushOfflineResult {
    synced,
    failed,
    remaining,
  })
}

// ─── Cross-Device Sync ─────────────────────────────────

#[tauri::command]
fn get_user_account_data(state: State<AppState>, session_token: String) -> Result<serde_json::Value, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  state.db.get_user_account_data(&handle)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn log_device_sync(state: State<AppState>, device_id: String, sync_type: String, items_count: i64, duration_ms: i64, success: bool) -> Result<(), String> {
  state.db.log_device_sync(&device_id, &sync_type, items_count, duration_ms, success)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn run_tier0_benchmark(state: State<AppState>) -> Result<tier0_benchmark::Tier0BenchmarkReport, String> {
  Ok(tier0_benchmark::run_tier0_benchmarks(&state.db, &state.blob_store))
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct NostrVisibilityTestResult {
  event_id: String,
  nevent: String,
  npub: String,
  content: String,
  relay_url: String,
  fetched_back: bool,
}

fn ensure_default_relays_connected(state: &AppState) -> Result<(), String> {
  if state.relay_manager.lock().unwrap().relay_count() > 0 {
    return Ok(());
  }
  let mut manager = state.relay_manager.lock().unwrap();
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  let connected = rt.block_on(async { manager.connect_to_default_relays().await })?;
  for url in &connected {
    let _ = state.db.upsert_relay_connection(url, "Public", "global", "connected");
  }
  if connected.is_empty() {
    return Err("No relays connected — check network and try Connect Defaults".to_string());
  }
  Ok(())
}

#[tauri::command]
fn publish_nostr_visibility_test(
  state: State<AppState>,
  session_token: String,
) -> Result<NostrVisibilityTestResult, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  let user_keys = load_user_nostr_keys(&state, &handle)?;
  ensure_default_relays_connected(&state)?;

  let content = format!(
    "#BlkSpace visibility test {} — if you see this on Damus or nostr.band, relay publish works.",
    uuid::Uuid::new_v4()
  );
  let tag_vecs = build_post_nostr_tags(&state, "tsu", "", &[]);
  use nostr_sdk::prelude::ToBech32;
  let npub = user_keys
    .public_key()
    .to_bech32()
    .map_err(|e| format!("npub encode: {}", e))?;

  let nostr_client = state.relay_manager.lock().unwrap().client_clone();
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  let (event_id, nevent, fetched_back) = rt.block_on(async {
    use nostr_sdk::prelude::{Tag, EventBuilder};
    let nostr_tags: Vec<Tag> = tag_vecs
      .iter()
      .filter_map(|t| Tag::parse(t.clone()).ok())
      .collect();
    let event = EventBuilder::text_note(&content)
      .tags(nostr_tags)
      .sign(&user_keys)
      .await
      .map_err(|e| format!("Signing failed: {}", e))?;
    let event_id = event.id.to_hex();
    let nevent = event
      .id
      .to_bech32()
      .map_err(|e| format!("nevent encode: {}", e))?;
    nostr_client
      .send_event(event)
      .await
      .map_err(|e| format!("Publish failed: {}", e))?;
    let fetched_back = RelayManager::fetch_event_by_id_on_client(&nostr_client, &event_id, 20)
      .await?
      .map(|e| e.content == content)
      .unwrap_or(false);
    Ok::<_, String>((event_id, nevent, fetched_back))
  })?;

  Ok(NostrVisibilityTestResult {
    event_id,
    nevent,
    npub,
    content,
    relay_url: relay_manager::DEFAULT_RELAYS[0].to_string(),
    fetched_back,
  })
}

#[tauri::command]
fn get_device_sync_history(state: State<AppState>, device_id: String) -> Result<Vec<(String, i64, i64, bool)>, String> {
  state.db.get_device_sync_history(&device_id)
    .map_err(|e| e.to_string())
}

// ─── Relay Consensus Commands (Cache Poisoning Prevention) ─

#[tauri::command]
fn record_relay_consensus(
  state: State<AppState>,
  event_id: String,
  relay_url: String,
  content_hash: String,
) -> Result<bool, String> {
  state.db.record_relay_consensus(&event_id, &relay_url, &content_hash)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_relay_consensus(
  state: State<AppState>,
  event_id: String,
) -> Result<Vec<(String, String)>, String> {
  state.db.get_relay_consensus(&event_id)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn validate_relay_consensus(
  state: State<AppState>,
  event_id: String,
  min_relays: usize,
) -> Result<bool, String> {
  state.db.validate_relay_consensus(&event_id, min_relays)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_relay_consensus_stats(
  state: State<AppState>,
  event_id: String,
) -> Result<(usize, usize, f64), String> {
  state.db.get_relay_consensus_stats(&event_id)
    .map_err(|e| e.to_string())
}

// ─── MIDF Graph Analysis Commands ────────────────────────

#[tauri::command]
fn get_follower_graph(
  state: State<AppState>,
  handle: String,
  depth: usize,
) -> Result<Vec<(String, String)>, String> {
  state.db.get_follower_graph(&handle, depth)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_star_pattern_score(
  state: State<AppState>,
  handle: String,
) -> Result<f64, String> {
  state.db.get_star_pattern_score(&handle)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_network_centrality(
  state: State<AppState>,
  handle: String,
) -> Result<f64, String> {
  state.db.get_network_centrality(&handle)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_follower_velocity(
  state: State<AppState>,
  handle: String,
) -> Result<f64, String> {
  state.db.get_follower_velocity(&handle)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_self_interaction_score(
  state: State<AppState>,
  handle: String,
) -> Result<f64, String> {
  state.db.get_self_interaction_score(&handle)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_content_similarity_score(
  state: State<AppState>,
  handle: String,
) -> Result<f64, String> {
  state.db.get_content_similarity_score(&handle)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_temporal_pattern_score(
  state: State<AppState>,
  handle: String,
) -> Result<f64, String> {
  state.db.get_temporal_pattern_score(&handle)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn calculate_malicious_intent_vector(
  state: State<AppState>,
  handle: String,
) -> Result<serde_json::Value, String> {
  state.db.calculate_malicious_intent_vector(&handle)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_malicious_intent_scores(
  state: State<AppState>,
  handle: String,
) -> Result<serde_json::Value, String> {
  match state.db.get_malicious_intent_scores(&handle).map_err(|e| e.to_string())? {
    Some(scores) => Ok(scores),
    None => Ok(serde_json::json!({"handle": handle, "overallScore": 0.0, "riskLevel": "unknown"})),
  }
}

#[tauri::command]
fn recalculate_all_malicious_intent_scores(
  state: State<AppState>,
) -> Result<usize, String> {
  state.db.recalculate_all_malicious_intent_scores()
    .map_err(|e| e.to_string())
}

// ─── Blob (Media) Commands ───────────────────────────────

const MAX_UPLOAD_SIZE: usize = 20 * 1024 * 1024;

fn mime_from_filename(filename: &str) -> String {
  let ext = filename.rsplit('.').next().unwrap_or("").to_lowercase();
  match ext.as_str() {
    "jpg" | "jpeg" => "image/jpeg".into(),
    "png" => "image/png".into(),
    "gif" => "image/gif".into(),
    "webp" => "image/webp".into(),
    "svg" => "image/svg+xml".into(),
    "mp4" => "video/mp4".into(),
    "webm" => "video/webm".into(),
    "mov" => "video/quicktime".into(),
    "avi" => "video/x-msvideo".into(),
    "mp3" => "audio/mpeg".into(),
    "ogg" => "audio/ogg".into(),
    "wav" => "audio/wav".into(),
    "flac" => "audio/flac".into(),
    "pdf" => "application/pdf".into(),
    _ => "application/octet-stream".into(),
  }
}

#[tauri::command]
fn upload_blob(
  state: State<AppState>,
  session_token: String,
  data: String,
  filename: String,
) -> Result<UploadBlobResult, String> {
  let uploader_handle = check_session_rate_limit(&state, &session_token)?;

  if filename.len() > 255 {
    return Err("Filename too long".to_string());
  }
  if !filename.contains('.') {
    return Err("Filename must have an extension".to_string());
  }

  let bytes = base64::Engine::decode(
    &base64::engine::general_purpose::STANDARD,
    &data,
  ).map_err(|_| "Invalid base64 data".to_string())?;

  if bytes.is_empty() {
    return Err("Empty file".to_string());
  }
  if bytes.len() > MAX_UPLOAD_SIZE {
    return Err(format!("File too large — maximum is {}MB", MAX_UPLOAD_SIZE / 1024 / 1024));
  }

  let mime_type = mime_from_filename(&filename);
  let file_size = bytes.len() as i64;

  // Write to disk first (local blob store as fallback)
  let hash = state.blob_store.store_blob(&bytes)?;

  // For basic CID support: use the content hash as CID when Iroh not available.
  // When Iroh feature enabled and working, use real Iroh CID.
  #[cfg(feature = "iroh")]
  let cid = if let Some(iroh) = &state.iroh {
    let iroh = iroh.lock().unwrap();
    let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
    match rt.block_on(iroh.add_blob(&bytes)) {
      Ok(iroh_cid) => {
        log::info!("Stored blob in Iroh: {} (local hash: {})", iroh_cid, hash);
        Some(iroh_cid)
      }
      Err(e) => {
        log::warn!("Failed to store blob in Iroh: {}. Using content hash as CID.", e);
        Some(hash.clone())
      }
    }
  } else {
    Some(hash.clone())
  };
  #[cfg(not(feature = "iroh"))]
  let cid: Option<String> = Some(hash.clone());

  let (record, is_new) = state.db.insert_blob(&hash, cid.as_deref(), &filename, &mime_type, file_size, &uploader_handle)
    .map_err(|e| AppError::from(e).to_string())?;

  let mut earn = EarnResult::default();
  if is_new {
    let quality = state.db.update_engagement_quality(&uploader_handle)
      .map_err(|_| 0.0).unwrap_or(1.0);
    let reward = state.db.throttle_rewards(&uploader_handle, 10.0, quality);
    let throttled = state.db.rewards_throttled(&uploader_handle);
    let wb_actual = state
      .db
      .grant_weix_bucks(&uploader_handle, reward, "Media upload")
      .unwrap_or(0);
    if !throttled {
      state.db.grant_karma(&uploader_handle, "", 5, 0, "Content creation").ok();
    }
    earn = EarnResult::build(reward, wb_actual, 5, 0, throttled);
  }

  if let Err(e) = publish_blob_announce(
    &state,
    &uploader_handle,
    &hash,
    cid.as_deref(),
    &record.filename,
  ) {
    log::warn!("Auto blob announce after upload failed for {uploader_handle}: {e}");
  }

  Ok(UploadBlobResult {
    hash,
    cid,
    filename: record.filename,
    mime_type: record.mime_type,
    file_size: record.file_size,
    uploader_handle: record.uploader_handle,
    created_at: record.created_at,
    earn,
  })
}

#[tauri::command]
fn get_blob_bytes(state: State<AppState>, session_token: String, hash: String) -> Result<Option<String>, String> {
  check_session_rate_limit(&state, &session_token)?;
  // Accept either local content hash (sha256) or CID (iroh/blake3 when feature enabled).
  // Validation is lenient (both are 64 lowercase hex) so CIDs from posts/Nostr can be fetched directly.
  validate_blob_hash(&hash).ok(); // best-effort; continue even if odd format for future CID cases
  // If no record under hash col, we still proceed (may be pure cid key or will be served from Iroh).
  // Local blob_store fallback will only succeed for real sha hashes.

  // Try Iroh first (decentralized content fetching). Prefer the recorded CID (real Iroh/blake3 hash)
  // when present — this is the key step that makes "media CIDs" actually fetch from the Iroh store.
  #[cfg(feature = "iroh")]
  if let Some(iroh) = &state.iroh {
    let iroh = iroh.lock().unwrap();
    let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
    // Look up record to get cid if available (upload stores cid separately from the local sha hash)
    let rec = state.db.get_blob_record(&hash).ok().flatten();
    let iroh_key = rec.as_ref().and_then(|r| r.cid.clone()).unwrap_or_else(|| hash.clone());
    match rt.block_on(iroh.get_blob(&iroh_key)) {
      Ok(Some(bytes)) => {
        let b64 = base64::Engine::encode(
          &base64::engine::general_purpose::STANDARD,
          &bytes,
        );
        return Ok(Some(b64));
      }
      Ok(None) => {
        log::warn!("Blob not found in Iroh under key {} (cid fallback from record)", iroh_key);
      }
      Err(e) => {
        log::warn!("Failed to fetch from Iroh under key {}: {}. Falling back to local storage.", iroh_key, e);
      }
    }
  }

  // Fallback to local blob store (only works for sha256 keys that were stored locally)
  if let Some(bytes) = state.blob_store.get_blob(&hash) {
    let b64 = base64::Engine::encode(
      &base64::engine::general_purpose::STANDARD,
      &bytes,
    );
    return Ok(Some(b64));
  }
  // Unknown key (e.g. a CID with no local sha record and no Iroh hit) -> treat as not available rather than hard error
  Ok(None)
}

#[tauri::command]
fn list_user_blobs(state: State<AppState>, session_token: String) -> Result<Vec<BlobRecord>, String> {
  let user_handle = check_session_rate_limit(&state, &session_token)?;
  state.db.list_user_blobs(&user_handle).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn delete_blob(
  state: State<AppState>,
  session_token: String,
  hash: String,
) -> Result<(), String> {
  let user_handle = check_session_rate_limit(&state, &session_token)?;
  validate_blob_hash(&hash)?;
  state.db.delete_blob_record(&hash, &user_handle)
    .map_err(|e| AppError::from(e).to_string())?;
  state.blob_store.delete_blob(&hash);
  Ok(())
}

#[tauri::command]
fn get_blob_metadata(state: State<AppState>, session_token: String, hash: String) -> Result<Option<BlobRecord>, String> {
  check_session_rate_limit(&state, &session_token)?;
  validate_blob_hash(&hash)?;
  state.db.get_blob_record(&hash).map_err(|e| AppError::from(e).to_string())
}

// ─── Karma, yards, profile extensions ───────────────────

#[tauri::command]
fn join_yard(state: State<AppState>, session_token: String, community_id: String) -> Result<JoinYardResult, String> {
  let handle = check_session_rate_limit(&state, &session_token)?;
  state.db.join_yard(&handle, &community_id).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn leave_yard(state: State<AppState>, session_token: String, community_id: String) -> Result<(), String> {
  let handle = check_session_rate_limit(&state, &session_token)?;
  state.db.leave_yard(&handle, &community_id).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn is_yard_member(state: State<AppState>, session_token: String, community_id: String) -> Result<bool, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  state.db.is_yard_member(&handle, &community_id).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn list_yard_members(state: State<AppState>, community_id: String) -> Result<Vec<String>, String> {
  state.db.list_yard_members(&community_id).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn list_community_roles(
  state: State<AppState>,
  community_id: String,
) -> Result<Vec<CommunityRoleEntry>, String> {
  state
    .db
    .list_community_roles(&community_id)
    .map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn list_yard_events(
  state: State<AppState>,
  community_id: String,
  current_user: Option<String>,
) -> Result<Vec<YardEvent>, String> {
  state
    .db
    .list_yard_events(&community_id, current_user.as_deref())
    .map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn create_yard_event(
  state: State<AppState>,
  session_token: String,
  community_id: String,
  title: String,
  description: String,
  location: String,
  starts_at: String,
  ends_at: Option<String>,
) -> Result<YardEvent, String> {
  let handle = check_session_rate_limit(&state, &session_token)?;
  state
    .db
    .create_yard_event(
      &community_id,
      &handle,
      &title,
      &description,
      &location,
      &starts_at,
      ends_at.as_deref(),
    )
    .map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn rsvp_yard_event(
  state: State<AppState>,
  session_token: String,
  event_id: i64,
  status: String,
) -> Result<RsvpYardEventResult, String> {
  let handle = check_session_rate_limit(&state, &session_token)?;
  state
    .db
    .rsvp_yard_event(&handle, event_id, &status)
    .map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn cancel_yard_event_rsvp(
  state: State<AppState>,
  session_token: String,
  event_id: i64,
) -> Result<bool, String> {
  let handle = check_session_rate_limit(&state, &session_token)?;
  state
    .db
    .cancel_yard_event_rsvp(&handle, event_id)
    .map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn create_wall_post(
  state: State<AppState>,
  session_token: String,
  wall_owner: String,
  content: String,
) -> Result<WallPostResult, String> {
  let author = check_session_rate_limit(&state, &session_token)?;
  validate_content(&content).map_err(map_err)?;
  let auto = wall_owner == author;
  state.db.create_wall_post(&wall_owner, &author, &content, auto)
    .map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn list_wall_posts(state: State<AppState>, session_token: String, wall_owner: String) -> Result<Vec<WallPost>, String> {
  let viewer = get_handle_from_session(&state, &session_token)?;
  state.db.list_wall_posts(&wall_owner, &viewer).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn approve_wall_post(state: State<AppState>, session_token: String, post_id: i64) -> Result<ApproveWallPostResult, String> {
  let owner = check_session_rate_limit(&state, &session_token)?;
  state.db.approve_wall_post(&owner, post_id).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn update_pro_profile(state: State<AppState>, session_token: String, json: String) -> Result<(), String> {
  let handle = check_session_rate_limit(&state, &session_token)?;
  state.db.update_pro_profile(&handle, &json).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn update_profile_layout(state: State<AppState>, session_token: String, json: String) -> Result<(), String> {
  let handle = check_session_rate_limit(&state, &session_token)?;
  state.db.update_profile_layout(&handle, &json).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn update_top_friends(state: State<AppState>, session_token: String, json: String) -> Result<(), String> {
  let handle = check_session_rate_limit(&state, &session_token)?;
  state.db.update_top_friends(&handle, &json).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn get_karma_leaderboard(state: State<AppState>, yard: Option<String>, limit: Option<i64>) -> Result<Vec<KarmaLeaderboardEntry>, String> {
  state.db.get_karma_leaderboard(yard.as_deref(), limit.unwrap_or(10))
    .map_err(|e| AppError::from(e).to_string())
}

fn publish_repost_to_nostr(state: &AppState, reposter_handle: &str, post: &Post) {
  if post.nostr_event_id.is_empty() {
    return;
  }
  let has_relays = state.relay_manager.lock().unwrap().relay_count() > 0;
  if !has_relays {
    return;
  }
  let author_pubkey: String = {
    let conn = state.db.conn.lock().unwrap();
    conn.query_row(
      "SELECT COALESCE(pubkey, '') FROM users WHERE handle = ?1",
      rusqlite::params![post.author_handle],
      |r| r.get(0),
    )
    .unwrap_or_default()
  };
  let user_keys = match user_nostr_keys_for_publish(state, reposter_handle, "repost publish") {
    Some(k) => k,
    None => return,
  };
  let nostr_client = state.relay_manager.lock().unwrap().client().clone();
  let event_id = post.nostr_event_id.clone();
  let town = post.town_tag.clone();
  let author_pk = author_pubkey;

  if let Ok(rt) = tokio::runtime::Runtime::new() {
    let _ = rt.block_on(async {
      use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
      let mut tag_vecs = vec![
        vec!["e".to_string(), event_id.clone()],
        vec!["t".to_string(), format!("hbcu-town:{}", town)],
        vec!["t".to_string(), "blkspace".to_string()],
      ];
      if !author_pk.is_empty() {
        tag_vecs.push(vec!["p".to_string(), author_pk]);
      }
      let nostr_tags: Vec<Tag> = tag_vecs
        .iter()
        .filter_map(|t| Tag::parse(t.clone()).ok())
        .collect();
      let event = EventBuilder::new(Kind::Repost, "")
        .tags(nostr_tags)
        .sign(&user_keys)
        .await
        .map_err(|e| format!("Repost sign: {}", e))?;
      let event_id_hex = event.id.to_hex();
      if let Ok(json) = serde_json::to_string(&event) {
        let _ = state.db.store_nostr_event_json(&event_id_hex, &json);
      }
      nostr_client.send_event(event).await.map_err(|e| format!("Repost publish: {}", e))?;
      Ok::<_, String>(())
    });
  }
}

#[tauri::command]
fn repost_post(
  state: State<AppState>,
  session_token: String,
  post_id: i64,
) -> Result<RepostResult, String> {
  let user_handle = check_session_rate_limit(&state, &session_token)?;
  let result = state
    .db
    .create_repost(&user_handle, post_id)
    .map_err(|e| AppError::from(e).to_string())?;
  if result.reposted {
    if let Ok(Some(post)) = state.db.get_post(post_id, Some(&user_handle)) {
      publish_repost_to_nostr(&state, &user_handle, &post);
    }
  }
  Ok(result)
}

#[tauri::command]
fn list_following_reposts(
  state: State<AppState>,
  session_token: String,
) -> Result<Vec<RepostFeedItem>, String> {
  let user_handle = get_handle_from_session(&state, &session_token)?;
  let following = state
    .db
    .get_following_for(&user_handle)
    .map_err(|e| AppError::from(e).to_string())?;
  state
    .db
    .list_reposts_for_handles(&following, 20, Some(&user_handle))
    .map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn get_earn_summary(state: State<AppState>, session_token: String) -> Result<EarnSummary, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  state.db.get_earn_summary(&handle).map_err(|e| AppError::from(e).to_string())
}

#[tauri::command]
fn greet(name: String) -> Result<String, String> {
  if name.len() > 50 {
    return Err("Name too long".into());
  }
  Ok(format!("Welcome to BlkSpace, {}! You're on the yard.", name))
}

#[tauri::command]
fn get_platform() -> String {
  std::env::consts::OS.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app_dir = dirs::data_local_dir()
    .unwrap_or_else(|| std::path::PathBuf::from("."))
    .join("com.blkspace.app");

  let database = Database::new(app_dir.clone()).expect("Failed to initialize database");
  let blob_store = BlobStore::new(&app_dir);
  let mut relay_manager = RelayManager::new();

  // Initialize Iroh node for decentralized content storage (only if feature enabled)
  #[cfg(feature = "iroh")]
  let iroh_node = {
    let rt = tokio::runtime::Runtime::new().expect("Failed to create runtime");
    match rt.block_on(IrohNode::new(app_dir.clone())) {
      Ok(node) => {
        log::info!("Iroh node initialized successfully");
        Some(Mutex::new(node))
      }
      Err(e) => {
        log::warn!("Failed to initialize Iroh node: {}. Falling back to local blob storage.", e);
        None
      }
    }
  };
  #[cfg(not(feature = "iroh"))]
  let iroh_node: Option<()> = None;

  // Connect to default public relays on startup
  {
    let rt = tokio::runtime::Runtime::new().expect("Failed to create runtime");
    if let Ok(connected) = rt.block_on(relay_manager.connect_to_default_relays()) {
      log::info!("Connected to {} default relays: {:?}", connected.len(), connected);
      for url in &connected {
        let _ = database.upsert_relay_connection(url, "Public", "global", "connected");
      }
    }
  }

  let mut app_builder = tauri::Builder::default();

  #[cfg(feature = "e2e-testing")]
  {
    app_builder = app_builder.plugin(tauri_plugin_playwright::init_with_config(
      tauri_plugin_playwright::PluginConfig::new()
        .socket_path("/tmp/blkspace-playwright.sock"),
    ));
  }

  app_builder
    .manage(AppState {
      db: database,
      blob_store,
      iroh: iroh_node,
      app_dir: app_dir.clone(),
      key_store: KeyStore::new(app_dir),
      sessions: Mutex::new(HashMap::new()),
      challenges: Mutex::new(HashMap::new()),
      rate_limiter: Mutex::new(HashMap::new()),
      relay_manager: Mutex::new(relay_manager),
      relay_town_subscriptions: Mutex::new(Vec::new()),
    })
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Background sync: poll connected relays every 60s for new events
      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        use nostr_sdk::prelude::{
          Filter, SingleLetterTag, Alphabet, Timestamp,
          RelayPoolNotification,
        };

        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        interval.tick().await; // skip immediate first tick

        loop {
          interval.tick().await;

          // Read state synchronously and release before awaiting
          let (towns, relay_count, maybe_client) = {
            let st = handle.state::<AppState>();
            let towns = st.relay_town_subscriptions.lock().unwrap().clone();
            let count = st.relay_manager.lock().unwrap().relay_count();
            let client = if count > 0 {
              Some(st.relay_manager.lock().unwrap().client().clone())
            } else {
              None
            };
            (towns, count, client)
          };

          if relay_count == 0 || towns.is_empty() || maybe_client.is_none() {
            continue;
          }

          let client = maybe_client.unwrap();

          for town in &towns {
            let now_secs = std::time::SystemTime::now()
              .duration_since(std::time::UNIX_EPOCH)
              .unwrap_or_default()
              .as_secs();

            let filter = Filter::new()
              .custom_tag(SingleLetterTag::lowercase(Alphabet::T), vec![town.as_str()])
              .since(Timestamp::from_secs(now_secs - 7200));

            if client.subscribe(vec![filter], None).await.is_err() {
              continue;
            }

            let mut notifications = client.notifications();
            let deadline = tokio::time::sleep(std::time::Duration::from_secs(5));
            tokio::pin!(deadline);

            loop {
              tokio::select! {
                notification = notifications.recv() => {
                  match notification {
                    Ok(RelayPoolNotification::Event { event, relay_url, .. }) => {
                      let event_json = serde_json::to_string(&event)
                        .unwrap_or_default();
                      if event_json.is_empty() {
                        continue;
                      }
                      let st = handle.state::<AppState>();
                      let relay_town = st
                        .db
                        .get_relay_town_by_url(&relay_url.to_string())
                        .ok()
                        .flatten();
                      if ingest_validated_relay_event(
                        &st,
                        &event_json,
                        &relay_url.to_string(),
                        relay_town.as_deref(),
                      ) {
                        if let Ok(count) = st.db.count_relay_events_since((now_secs - 86400) as i64) {
                          let _ = st.relay_manager.lock().unwrap().increment_events(
                            if count > 0 { 1 } else { 0 },
                          );
                        }
                      }
                    }
                    Ok(_) => {}
                    Err(_) => break,
                  }
                }
                _ = &mut deadline => break,
              }
            }
          }
        }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      greet,
      get_platform,
      get_challenge,
      login,
      verify_session,
      logout,
      store_key,
      get_key,
      has_key,
      get_user,
      list_users,
      search_users,
      search_posts,
      search_communities,
      create_user,
      update_user,
      update_profile_customization,
      verify_nostr_event,
      verify_nostr_event_by_id,
      get_nostr_event_json,
      set_node_role,
      set_community_role,
      get_community_role,
      toggle_follow,
      get_following,
      list_marketplace,
      create_marketplace_listing,
      buy_marketplace_listing,
      publish_mix,
      list_posts,
      get_post,
      create_post,
      get_user_posts,
      get_trending_feed,
      list_replies,
      create_reply,
      list_channels,
      create_channel,
      toggle_like,
      get_notifications,
      get_wallet_tx,
      send_weixbucks,
      get_tokenomics_policy,
      get_withdraw_eligibility,
      withdraw_to_solana,
      get_network_stats,
      list_relays,
      get_recent_activity,
      get_communities,
      upload_blob,
      get_blob_bytes,
      list_user_blobs,
      delete_blob,
      get_blob_metadata,
      link_pubkey,
      connect_to_relay,
      disconnect_from_relay,
      get_relay_statuses,
      list_relay_connections,
      check_relay_health,
      connect_to_default_relays,
      publish_nostr_visibility_test,
      sync_town_events,
      list_relay_events,
      list_relay_events_with_consensus,
      get_relay_network_stats,
      subscribe_to_town,
      unsubscribe_from_town,
      list_subscribed_towns,
      list_combined_feed,
      publish_relay_list,
      fetch_user_relay_list,
      e2e_prepare_profile_relay_fixture,
      announce_blob,
      publish_trending_summary,
      fetch_trending_summaries,
      pin_content,
      should_pin_content,
      list_pinned_content,
      report_pin_serve,
      claim_node_rewards,
      sync_account_content,
      add_to_offline_cache,
      remove_from_offline_cache,
      list_offline_cache,
      prefetch_content,
      queue_offline_action,
      get_pending_offline_actions,
      mark_offline_action_synced,
      clear_synced_offline_actions,
      count_pending_offline_actions,
      flush_offline_queue,
      get_user_account_data,
      log_device_sync,
      run_tier0_benchmark,
      get_device_sync_history,
      record_relay_consensus,
      get_relay_consensus,
      validate_relay_consensus,
      get_relay_consensus_stats,
      get_follower_graph,
      get_star_pattern_score,
      get_network_centrality,
      get_follower_velocity,
      get_self_interaction_score,
      get_content_similarity_score,
      get_temporal_pattern_score,
      calculate_malicious_intent_vector,
      get_malicious_intent_scores,
      recalculate_all_malicious_intent_scores,
      join_yard,
      leave_yard,
      is_yard_member,
      list_yard_members,
      list_community_roles,
      list_yard_events,
      create_yard_event,
      rsvp_yard_event,
      cancel_yard_event_rsvp,
      create_wall_post,
      list_wall_posts,
      approve_wall_post,
      update_pro_profile,
      update_profile_layout,
      update_top_friends,
      get_karma_leaderboard,
      get_earn_summary,
      repost_post,
      list_following_reposts,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
