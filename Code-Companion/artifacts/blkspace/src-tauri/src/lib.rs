mod db;
mod blob_store;
mod relay_manager;

#[cfg(feature = "iroh")]
mod iroh_node;

#[cfg(test)]
mod tests;

use blob_store::{BlobInfo, BlobStore};
use db::{
  AppError, BlobRecord, Community, CrossTownEvent, Database, NetworkStats, Notification, Post, Relay, Reply, User, WalletTx,
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

// ─── Key Store (secure file-based, not localStorage) ─────

fn keys_dir(app_dir: &PathBuf) -> PathBuf {
  app_dir.join("keys")
}

fn key_path(app_dir: &PathBuf, handle: &str) -> PathBuf {
  keys_dir(app_dir).join(format!("{}.key", handle))
}

#[tauri::command]
fn store_key(state: State<AppState>, session_token: String, handle: String, key: String) -> Result<(), String> {
  let session_handle = get_handle_from_session(&state, &session_token)?;
  if session_handle != handle {
    return Err("Cannot store key for a different user".to_string());
  }
  validate_handle(&handle).map_err(map_err)?;
  let dir = keys_dir(&state.app_dir);
  std::fs::create_dir_all(&dir).map_err(|_| "Failed to create key storage".to_string())?;
  let path = key_path(&state.app_dir, &handle);
  std::fs::write(&path, &key).map_err(|_| "Failed to store key".to_string())?;
  Ok(())
}

#[tauri::command]
fn get_key(state: State<AppState>, session_token: String, handle: String) -> Result<Option<String>, String> {
  let session_handle = get_handle_from_session(&state, &session_token)?;
  if session_handle != handle {
    return Err("Cannot read key for a different user".to_string());
  }
  validate_handle(&handle).map_err(map_err)?;
  let path = key_path(&state.app_dir, &handle);
  if path.exists() {
    std::fs::read_to_string(&path).map(Some).map_err(|_| "Failed to read key".to_string())
  } else {
    Ok(None)
  }
}

#[tauri::command]
fn has_key(state: State<AppState>, session_token: String, handle: String) -> Result<bool, String> {
  let session_handle = get_handle_from_session(&state, &session_token)?;
  if session_handle != handle {
    return Err("Cannot check key for a different user".to_string());
  }
  validate_handle(&handle).map_err(map_err)?;
  Ok(key_path(&state.app_dir, &handle).exists())
}

fn validate_blob_hash(hash: &str) -> Result<(), String> {
  if hash.len() != 64 || !hash.chars().all(|c| matches!(c, '0'..='9' | 'a'..='f')) {
    return Err("Invalid blob hash — expected 64 lowercase hex characters".to_string());
  }
  Ok(())
}

fn validate_incoming_event(event_json: &str) -> Result<bool, String> {
  let event: serde_json::Value = serde_json::from_str(event_json)
    .map_err(|_| "Invalid event JSON".to_string())?;
  
  // Check required fields
  let pubkey = event["pubkey"].as_str().ok_or("Missing pubkey")?;
  let id = event["id"].as_str().ok_or("Missing event id")?;
  let created_at = event["created_at"].as_i64().ok_or("Missing timestamp")?;
  let kind = event["kind"].as_i64().ok_or("Missing kind")?;
  let sig = event["sig"].as_str().ok_or("Missing signature")?;
  
  if pubkey.len() != 64 {
    return Err("Invalid pubkey format".to_string());
  }
  if id.len() != 64 {
    return Err("Invalid event id format".to_string());
  }
  
  // Check timestamp (not older than 1 day, not in future)
  let now = chrono::Utc::now().timestamp();
  if (now - created_at).abs() > 86400 {
    return Ok(false); // Too old or from future, skip silently
  }
  
  // Verify Schnorr signature
  let secp = Secp256k1::new();
  let pubkey_obj = XOnlyPublicKey::from_slice(
    &hex::decode(pubkey).map_err(|_| "Invalid pubkey hex")?
  ).map_err(|_| "Invalid pubkey")?;
  let sig_obj = schnorr::Signature::from_slice(
    &hex::decode(sig).map_err(|_| "Invalid sig hex")?
  ).map_err(|_| "Invalid signature")?;
  
  // Reconstruct event id
  let tags = event["tags"].as_array().ok_or("Missing tags")?;
  let serialized = serde_json::json!([0, pubkey, created_at, kind, tags, event["content"].as_str().unwrap_or("")]);
  let canonical = serde_json::to_string(&serialized).map_err(|_| "Serialization error")?;
  let event_id = Sha256::digest(canonical.as_bytes());
  
  secp.verify_schnorr(&sig_obj, &event_id, &pubkey_obj)
    .map_err(|_| "Signature verification failed")?;
  
  Ok(true)
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
fn create_post(
  state: State<AppState>,
  session_token: String,
  content: String,
  town_tag: String,
  channel_id: Option<String>,
  media_hashes: Option<String>,
) -> Result<Post, String> {
  let author_handle = check_session_rate_limit(&state, &session_token)?;
  validate_content(&content).map_err(map_err)?;
  validate_town(&town_tag).map_err(map_err)?;
  let hashes: Vec<String> = media_hashes
    .map(|j| serde_json::from_str(&j).unwrap_or_default())
    .unwrap_or_default();
  let hashes: Vec<String> = hashes.into_iter().take(10).collect();
  let ch = channel_id.unwrap_or_default();
  let post = state.db.create_post(&author_handle, &content, &town_tag, &ch, &hashes)
    .map_err(|e| AppError::from(e).to_string())?;

  // Auto-publish to connected Nostr relays (non-blocking, best-effort)
  let has_relays = state.relay_manager.lock().unwrap().relay_count() > 0;
  if has_relays {
    let content_clone = content.clone();
    let town_clone = town_tag.clone();
    let ch_clone = ch.clone();
    let post_id = post.id;

    // Clone client and keys out of the mutex so the async block is Send
    let (nostr_client, nostr_keys) = {
      let m = state.relay_manager.lock().unwrap();
      (m.client().clone(), m.keys().clone())
    };

    if let Ok(rt) = tokio::runtime::Runtime::new() {
      let result = rt.block_on(async {
        use nostr_sdk::prelude::{Tag, EventBuilder};
        let mut tags: Vec<Vec<String>> = vec![
          vec!["t".to_string(), format!("hbcu-town:{}", town_clone)],
          vec!["t".to_string(), "blkspace".to_string()],
        ];
        if !ch_clone.is_empty() {
          tags.push(vec!["t".to_string(), format!("blkspace:channel:{}", ch_clone)]);
        }
        let nostr_tags: Vec<Tag> = tags.iter()
          .filter_map(|t| Tag::parse(t.clone()).ok())
          .collect();
        let event = EventBuilder::text_note(&content_clone)
          .tags(nostr_tags)
          .sign(&nostr_keys)
          .await
          .map_err(|e| format!("Signing failed: {}", e))?;
        let event_id = nostr_client.send_event(event)
          .await
          .map_err(|e| format!("Publish failed: {}", e))?;
        Ok::<_, String>(event_id.to_hex())
      });
      if let Ok(ref event_id) = result {
        let _ = state.db.update_post_nostr_meta(post_id, event_id, "self-published");
      }
    }
  }

  Ok(post)
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

#[tauri::command]
fn create_reply(state: State<AppState>, session_token: String, post_id: i64, content: String) -> Result<Reply, String> {
  let author_handle = check_session_rate_limit(&state, &session_token)?;
  validate_content(&content).map_err(map_err)?;
  let reply = state.db.create_reply(post_id, &author_handle, &content).map_err(|e| AppError::from(e).to_string())?;

  // Nostr hygiene for replies: kind 1 + e tag + channel/town tags if available from parent post
  let has_relays = state.relay_manager.lock().unwrap().relay_count() > 0;
  if has_relays {
    if let Ok(Some(parent)) = state.db.get_post(post_id, None) {
      let town = parent.town_tag.clone();
      let ch = parent.channel_id.clone();
      let (nostr_client, nostr_keys) = {
        let m = state.relay_manager.lock().unwrap();
        (m.client().clone(), m.keys().clone())
      };
      if let Ok(rt) = tokio::runtime::Runtime::new() {
        let _ = rt.block_on(async {
          use nostr_sdk::prelude::{Tag, EventBuilder};
          let mut tags: Vec<Vec<String>> = vec![
            vec!["t".to_string(), format!("hbcu-town:{}", town)],
            vec!["t".to_string(), "blkspace".to_string()],
            vec!["e".to_string(), post_id.to_string()],
          ];
          if !ch.is_empty() {
            tags.push(vec!["t".to_string(), format!("blkspace:channel:{}", ch)]);
          }
          let nostr_tags: Vec<Tag> = tags.iter().filter_map(|t| Tag::parse(t.clone()).ok()).collect();
          let event = EventBuilder::text_note(&content)
            .tags(nostr_tags)
            .sign(&nostr_keys)
            .await
            .map_err(|e| format!("Reply sign: {}", e))?;
          let _ = nostr_client.send_event(event).await;
          Ok::<_, String>(())
        });
      }
    }
  }

  Ok(reply)
}

// ─── Like Command ────────────────────────────────────────

#[tauri::command]
fn toggle_like(state: State<AppState>, session_token: String, post_id: i64) -> Result<bool, String> {
  let user_handle = check_session_rate_limit(&state, &session_token)?;
  state.db.toggle_like(post_id, &user_handle).map_err(|e| AppError::from(e).to_string())
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

  // Real signed custom kind 30079 (Tip) - Nostr hygiene
  let has_relays = state.relay_manager.lock().unwrap().relay_count() > 0;
  if has_relays {
    let content = format!("Tip {} WB to @{}", amount, to_handle);
    let tags: Vec<Vec<String>> = vec![
      vec!["t".to_string(), "blkspace".to_string()],
      vec!["t".to_string(), "tip".to_string()],
      vec!["p".to_string(), to_handle.clone()],
      vec!["amount".to_string(), amount.to_string()],
    ];
    let (nostr_client, nostr_keys) = {
      let m = state.relay_manager.lock().unwrap();
      (m.client().clone(), m.keys().clone())
    };
    if let Ok(rt) = tokio::runtime::Runtime::new() {
      let _ = rt.block_on(async {
        use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
        let nostr_tags: Vec<Tag> = tags.iter().filter_map(|t| Tag::parse(t.clone()).ok()).collect();
        let event = EventBuilder::new(Kind::Custom(30079), &content)
          .tags(nostr_tags)
          .sign(&nostr_keys)
          .await
          .map_err(|e| format!("Tip sign failed: {}", e))?;
        let _event_id = nostr_client.send_event(event).await.map_err(|e| format!("Tip publish: {}", e))?;
        Ok::<_, String>(())
      });
    }
  }

  Ok(res)
}

#[tauri::command]
fn withdraw_to_solana(
  state: State<AppState>,
  session_token: String,
  student_solana_address: String,
  amount_wb: i64,
) -> Result<String, String> {
  let user_handle = check_session_rate_limit(&state, &session_token)?;
  
  if amount_wb < 100 {
    return Err("Minimum withdrawal is 100 WeixBucks".to_string());
  }
  
  // Basic validation of Solana address (must be 32-44 base58 characters)
  if student_solana_address.len() < 32 || student_solana_address.len() > 44 {
    return Err("Invalid Solana address format".to_string());
  }
  
  // Deduct WeixBucks and insert wallet transaction
  let desc = format!("Withdrawn to Solana address: {}...", &student_solana_address[0..8]);
  let _new_balance = state.db.deduct_weix_bucks(&user_handle, amount_wb, &desc)
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
  let connected = rt.block_on(async {
    manager.connect_to_default_relays().await
  })?;
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
  let town_lower = town.to_lowercase();
  let manager = state.relay_manager.lock().unwrap();
  if manager.relay_count() == 0 {
    return Err("No relays connected. Connect to a relay first.".to_string());
  }
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  rt.block_on(async {
    manager.subscribe_tag_filter("t", &town_lower, 3600).await?;
    let now = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap_or_default()
      .as_secs();
    let filter = nostr_sdk::prelude::Filter::new()
      .custom_tag(nostr_sdk::prelude::SingleLetterTag::lowercase(nostr_sdk::prelude::Alphabet::T), vec![&town_lower])
      .since(nostr_sdk::prelude::Timestamp::from_secs(now - 3600));
    let events = manager.sync_recent(filter, 5).await?;

    // Store events in DB
    for event in &events {
      let _ = state.db.insert_relay_event(
        &event.id,
        "synced",
        event.kind as i64,
        &event.pubkey,
        &event.content,
        &serde_json::to_string(&event.tags).unwrap_or("[]".to_string()),
        event.created_at as i64,
      );
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
  let town_lower = town.to_lowercase();
  let mut subs = state.relay_town_subscriptions.lock().unwrap();
  if !subs.contains(&town_lower) {
    subs.push(town_lower);
  }
  Ok(())
}

#[tauri::command]
fn unsubscribe_from_town(state: State<AppState>, session_token: String, town: String) -> Result<(), String> {
  get_handle_from_session(&state, &session_token)?;
  let town_lower = town.to_lowercase();
  let mut subs = state.relay_town_subscriptions.lock().unwrap();
  subs.retain(|t| t != &town_lower);
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
  get_handle_from_session(&state, &session_token)?;
  let (client, keys) = {
    let m = state.relay_manager.lock().unwrap();
    (m.client_clone(), m.keys_clone())
  };
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
    let event_id = client.send_event(event)
      .await
      .map_err(|e| format!("Publish failed: {}", e))?;

    // Store in relay_events for local discovery
    let _ = state.db.insert_relay_event(
      &event_id.to_hex(),
      "self-published",
      10002,
      &keys.public_key().to_string(),
      "",
      "[]",
      chrono::Utc::now().timestamp(),
    );

    Ok(event_id.to_hex())
  })
}

#[tauri::command]
fn fetch_user_relay_list(state: State<AppState>, session_token: String, pubkey: String) -> Result<Vec<String>, String> {
  get_handle_from_session(&state, &session_token)?;
  Ok(state.db.get_relay_list_from_tags(&pubkey))
}

#[tauri::command]
fn announce_blob(state: State<AppState>, session_token: String, hash: String, filename: String) -> Result<String, String> {
  get_handle_from_session(&state, &session_token)?;
  let (client, keys) = {
    let m = state.relay_manager.lock().unwrap();
    (m.client_clone(), m.keys_clone())
  };
  if state.relay_manager.lock().unwrap().relay_count() == 0 {
    return Err("No relays connected".to_string());
  }
  validate_blob_hash(&hash)?;
  let mime = mime_from_filename(&filename);
  let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;
  rt.block_on(async {
    use nostr_sdk::prelude::{Tag, EventBuilder, Kind};
    let tags = vec![
      Tag::parse(vec!["url".to_string(), format!("blob://{}", hash)]).ok(),
      Tag::parse(vec!["m".to_string(), mime]).ok(),
      Tag::parse(vec!["x".to_string(), hash.clone()]).ok(),
    ].into_iter().filter_map(|t| t).collect::<Vec<_>>();
    let event = EventBuilder::new(Kind::Custom(1063), filename)
      .tags(tags)
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
  
  let (client, keys) = {
    let m = state.relay_manager.lock().unwrap();
    (m.client_clone(), m.keys_clone())
  };
  
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
  
  Ok(true)
}

#[tauri::command]
fn claim_node_rewards(state: State<AppState>, session_token: String) -> Result<f64, String> {
  let handle = get_handle_from_session(&state, &session_token)?;
  let serves_today = state.db.count_serves_today(&handle).map_err(|e| e.to_string())?;
  let rewards = (serves_today as f64) * 0.1;
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
      match rt.block_on(iroh.get_blob(hash)) {
        Ok(Some(bytes)) => {
          // Store locally as fallback
          let _ = state.blob_store.store_blob(&bytes);
          synced.push(hash.clone());
          log::info!("Synced blob {} from Iroh", hash);
        }
        Ok(None) => {
          log::warn!("Blob {} not found in Iroh", hash);
        }
        Err(e) => {
          log::warn!("Failed to sync blob {}: {}", hash, e);
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
      match rt.block_on(iroh.get_blob(hash)) {
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
) -> Result<BlobInfo, String> {
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

  // Reward upload +10 WB only for brand-new blobs (fix 1)
  if is_new {
    let quality = state.db.update_engagement_quality(&uploader_handle)
      .map_err(|_| 0.0).unwrap_or(1.0);
    let reward = (10.0_f64 * quality).round() as i64;
    let conn = state.db.conn.lock().unwrap();
    conn.execute(
      "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
      rusqlite::params![reward, uploader_handle],
    ).ok();
    conn.execute(
      "INSERT INTO wallet_tx (user_handle, tx_type, amount, description, balance_after)
       SELECT ?1, 'earn', ?2, 'Media upload', weix_bucks FROM users WHERE handle = ?1",
      rusqlite::params![uploader_handle, reward],
    ).ok();
    drop(conn);
  }

  Ok(BlobInfo {
    hash,
    cid,
    filename: record.filename,
    mime_type: record.mime_type,
    file_size: record.file_size,
    uploader_handle: record.uploader_handle,
    created_at: record.created_at,
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
  let relay_manager = RelayManager::new();

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

  // Connect to default public relays on startup (non-blocking)
  let mut default_relays_connected: Vec<String> = Vec::new();
  {
    let rt = tokio::runtime::Runtime::new().expect("Failed to create runtime");
    if let Ok(connected) = rt.block_on(relay_manager.connect_to_default_relays()) {
      default_relays_connected = connected.clone();
      log::info!("Connected to {} default relays: {:?}", connected.len(), connected);
    }
  }

  tauri::Builder::default()
    .manage(AppState {
      db: database,
      blob_store,
      iroh: iroh_node,
      app_dir,
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
                      // Validate event before storage
                      let event_json = serde_json::to_string(&event)
                        .unwrap_or("{}".to_string());
                      if validate_incoming_event(&event_json).unwrap_or(false) {
                        let st = handle.state::<AppState>();
                        let tags_json = serde_json::to_string(
                          &event.tags.iter().map(|t| t.clone().to_vec()).collect::<Vec<_>>()
                        ).unwrap_or("[]".to_string());
                        let event_id = event.id.to_hex();
                        let content_hash = format!("{:x}", sha2::Sha256::digest(&event.content));
                        let relay_url_str = relay_url.to_string();
                        let _ = st.db.insert_relay_event(
                          &event_id,
                          &relay_url_str,
                          event.kind.as_u16() as i64,
                          &event.pubkey.to_string(),
                          &event.content,
                          &tags_json,
                          event.created_at.as_u64() as i64,
                        );
                        // Record relay consensus for cache poisoning prevention
                        let _ = st.db.record_relay_consensus(&event_id, &relay_url_str, &content_hash);
                        if let Ok(count) = st.db.count_relay_events_since((now_secs - 86400) as i64) {
                          let _ = st.relay_manager.lock().unwrap().increment_events(
                            if count > 0 { 1 } else { 0 },
                          );
                        }
                      } else {
                        log::warn!("Invalid event received: {}", event.id.to_hex());
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
      create_user,
      update_user,
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
      get_user_account_data,
      log_device_sync,
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
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
