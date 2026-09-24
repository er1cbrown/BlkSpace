//! Hosted portfolio synchronization for the native app.
//!
//! The WebView never receives a private key or a reusable authorization
//! header. NIP-98 proofs are created here with the key held by KeyStore and
//! the exact request bytes are used for both signing and sending.

use crate::blob_store::BlobStore;
use crate::db::{
  CloudPostRecord,
  Database,
  HostedFollowing,
  HostedNotification,
  HostedReply,
  HostedSocialOutboxItem,
};
use crate::key_store::KeyStore;
use base64::Engine;
use nostr_sdk::prelude::{EventBuilder, Keys, Kind, Tag};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use reqwest::redirect::Policy;
use reqwest::Client;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::time::Duration;
use url::Url;

const DEFAULT_API_URL: &str = "https://bkspc.app";
const MAX_RESPONSE_BYTES: usize = 2 * 1024 * 1024;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(12);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(6);

#[derive(Debug, Clone)]
pub struct PortfolioSyncClient {
  base: Url,
  http: Client,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortfolioSyncResult {
  pub pulled: usize,
  pub cached: usize,
  pub pushed: usize,
  pub failed: usize,
  pub pending: usize,
  pub disabled: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SocialSyncResult {
  pub pushed: usize,
  pub failed: usize,
  pub pending: usize,
  pub pulled: usize,
  pub cached: usize,
  pub notifications: usize,
  pub replies: usize,
  pub following: usize,
  pub disabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HostedPostPayload {
  /// Compatibility id for the first hosted-web release. New servers ignore it
  /// in favor of postUid; it is a safe, per-post value rather than a local row id.
  pub id: i64,
  pub post_uid: String,
  pub author_handle: String,
  pub content: String,
  pub town_tag: String,
  pub channel_id: String,
  pub media_blobs: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct HostedPostAck {
  pub post_uid: String,
  pub remote_id: String,
  pub revision: i64,
}

#[derive(Debug, Deserialize)]
struct HostedEnvelope {
  #[serde(default)]
  rows: Vec<HostedRow>,
  #[serde(rename = "nextCursor", default)]
  next_cursor: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HostedRow {
  id: Option<Value>,
  #[serde(rename = "postUid", alias = "post_uid", default)]
  post_uid: Option<String>,
  #[serde(rename = "remoteId", alias = "remote_id", default)]
  remote_id: Option<String>,
  #[serde(rename = "authorHandle", alias = "author_handle")]
  author_handle: String,
  #[serde(rename = "authorPubkey", alias = "author_pubkey", default)]
  author_pubkey: Option<String>,
  content: String,
  #[serde(rename = "townTag", alias = "town_tag")]
  town_tag: String,
  #[serde(rename = "channelId", alias = "channel_id", default)]
  channel_id: Option<String>,
  #[serde(rename = "mediaBlobs", alias = "media_blobs", default)]
  media_blobs: Option<Value>,
  #[serde(rename = "likesCount", alias = "likes_count", default)]
  likes_count: Option<i64>,
  #[serde(rename = "repliesCount", alias = "replies_count", default)]
  replies_count: Option<i64>,
  #[serde(rename = "repostsCount", alias = "reposts_count", default)]
  reposts_count: Option<i64>,
  #[serde(default)]
  liked: bool,
  #[serde(default)]
  reposted: bool,
  #[serde(rename = "viewerState", alias = "viewer_state", default)]
  viewer_state: Option<Value>,
  #[serde(rename = "createdAt", alias = "created_at")]
  created_at: String,
  #[serde(rename = "updatedAt", alias = "updated_at", default)]
  updated_at: Option<String>,
  #[serde(default)]
  revision: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct PushResponse {
  #[serde(rename = "postUid", default)]
  post_uid: Option<String>,
  #[serde(rename = "remoteId", default)]
  remote_id: Option<String>,
  #[serde(default)]
  id: Option<Value>,
  #[serde(default)]
  revision: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
struct HostedMediaTarget {
  provider: String,
  method: String,
  #[serde(rename = "uploadUrl", alias = "upload_url")]
  upload_url: String,
  #[serde(rename = "publicUrl", alias = "public_url")]
  public_url: String,
  #[serde(default)]
  headers: HashMap<String, String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum HostedMediaKind {
  Image,
  Video,
  Audio,
  Pdf,
  Document,
}

impl HostedMediaKind {
  fn label(self) -> &'static str {
    match self {
      Self::Image => "image",
      Self::Video => "video",
      Self::Audio => "audio",
      Self::Pdf => "PDF",
      Self::Document => "document",
    }
  }

  fn limit(self) -> usize {
    match self {
      Self::Image => 15 * 1024 * 1024,
      Self::Video => 50 * 1024 * 1024,
      Self::Audio => 25 * 1024 * 1024,
      Self::Pdf => 20 * 1024 * 1024,
      Self::Document => 15 * 1024 * 1024,
    }
  }
}

#[derive(Debug)]
enum MediaPromotionError {
  Blocked(String),
  Retry(String),
}

pub fn stable_portfolio_id(post_uid: &str) -> i64 {
  let digest = Sha256::digest(post_uid.as_bytes());
  let mut value = 0u64;
  for byte in digest.iter().take(8) {
    value = (value << 8) | u64::from(*byte);
  }
  // Keep the compatibility id within JavaScript's safe integer range.
  ((value & 0x1fff_ffff_ffff_ffff) as i64).max(1)
}

fn cloud_sync_enabled() -> bool {
  !matches!(
    std::env::var("BLKSPACE_CLOUD_SYNC")
      .unwrap_or_default()
      .to_ascii_lowercase()
      .as_str(),
    "0" | "false" | "off" | "no"
  )
}

fn parse_base_url(raw: &str) -> Result<Url, String> {
  let mut base = Url::parse(raw.trim()).map_err(|_| "Invalid BlkSpace API URL".to_string())?;
  let host = base.host_str().unwrap_or_default();
  let loopback = matches!(host, "localhost" | "127.0.0.1" | "::1");
  if base.scheme() != "https" && !(base.scheme() == "http" && loopback) {
    return Err("BlkSpace API must use HTTPS (HTTP is allowed only on loopback).".into());
  }
  if !base.username().is_empty()
    || base.password().is_some()
    || base.query().is_some()
    || base.fragment().is_some()
    || !matches!(base.path(), "" | "/")
  {
    return Err("BlkSpace API URL must be an origin without credentials, query, or path.".into());
  }
  base.set_path("/");
  Ok(base)
}

impl PortfolioSyncClient {
  pub fn from_env() -> Result<Self, String> {
    let raw = std::env::var("BLKSPACE_API_URL").unwrap_or_else(|_| DEFAULT_API_URL.into());
    let base = parse_base_url(&raw)?;
    let http = Client::builder()
      .connect_timeout(CONNECT_TIMEOUT)
      .timeout(REQUEST_TIMEOUT)
      .redirect(Policy::none())
      .user_agent("BlkSpace-Tauri/0.1")
      .build()
      .map_err(|e| format!("Could not create hosted sync client: {e}"))?;
    Ok(Self { base, http })
  }

  fn endpoint(&self, path: &str) -> Url {
    self.base.join(path.trim_start_matches('/')).expect("validated API base")
  }

  async fn read_json_response(
    &self,
    response: reqwest::Response,
  ) -> Result<Value, String> {
    let status = response.status();
    if !status.is_success() {
      let body = response.text().await.unwrap_or_default();
      return Err(format!("Hosted API returned {status}: {}", truncate(&body, 240)));
    }
    let content_type = response
      .headers()
      .get(CONTENT_TYPE)
      .and_then(|value| value.to_str().ok())
      .unwrap_or_default();
    if !content_type.to_ascii_lowercase().contains("application/json") {
      return Err("Hosted API returned a non-JSON response.".into());
    }
    let bytes = response
      .bytes()
      .await
      .map_err(|e| format!("Hosted API response failed: {e}"))?;
    if bytes.len() > MAX_RESPONSE_BYTES {
      return Err("Hosted API response is too large.".into());
    }
    serde_json::from_slice(&bytes).map_err(|e| format!("Hosted API returned invalid JSON: {e}"))
  }

  async fn signed_post_json(
    &self,
    keys: &Keys,
    path: &str,
    payload: &Value,
  ) -> Result<Value, String> {
    let body = serde_json::to_vec(payload)
      .map_err(|error| format!("Could not encode hosted request: {error}"))?;
    let endpoint = self.endpoint(path);
    let authorization = sign_nip98(keys, "POST", &endpoint, &body).await?;
    let response = self
      .http
      .post(endpoint)
      .header(CONTENT_TYPE, "application/json")
      .header(AUTHORIZATION, authorization)
      .body(body)
      .send()
      .await
      .map_err(|error| format!("Hosted request failed: {error}"))?;
    self.read_json_response(response).await
  }

  async fn signed_get_json(
    &self,
    keys: &Keys,
    endpoint: Url,
  ) -> Result<Value, String> {
    let authorization = sign_nip98(keys, "GET", &endpoint, b"").await?;
    let response = self
      .http
      .get(endpoint.clone())
      .header(AUTHORIZATION, authorization)
      .send()
      .await
      .map_err(|error| format!("Hosted request failed: {error}"))?;
    self.read_json_response(response).await
  }

  pub async fn pull(
    &self,
    town: &str,
    cursor: Option<&str>,
  ) -> Result<(Vec<CloudPostRecord>, Option<String>), String> {
    let mut endpoint = self.endpoint("api/portfolio/posts");
    {
      let mut query = endpoint.query_pairs_mut();
      if !town.trim().is_empty() {
        query.append_pair("town", town.trim());
      }
      if let Some(cursor) = cursor.filter(|value| !value.is_empty()) {
        query.append_pair("cursor", cursor);
      }
    }
    let response = self
      .http
      .get(endpoint)
      .send()
      .await
      .map_err(|e| format!("Hosted API pull failed: {e}"))?;
    let value = self.read_json_response(response).await?;
    let envelope: HostedEnvelope =
      serde_json::from_value(value).map_err(|e| format!("Hosted API page is invalid: {e}"))?;
    let rows = envelope
      .rows
      .into_iter()
      .filter_map(|row| parse_hosted_row(row).ok())
      .collect();
    Ok((rows, envelope.next_cursor))
  }

  pub async fn pull_for_viewer(
    &self,
    keys: &Keys,
    town: &str,
    cursor: Option<&str>,
  ) -> Result<(Vec<CloudPostRecord>, Option<String>), String> {
    let mut endpoint = self.endpoint("api/portfolio/posts");
    {
      let mut query = endpoint.query_pairs_mut();
      if !town.trim().is_empty() {
        query.append_pair("town", town.trim());
      }
      if let Some(cursor) = cursor.filter(|value| !value.is_empty()) {
        query.append_pair("cursor", cursor);
      }
    }
    let authorization = sign_nip98(keys, "GET", &endpoint, b"").await?;
    let response = self
      .http
      .get(endpoint)
      .header(AUTHORIZATION, authorization)
      .send()
      .await
      .map_err(|e| format!("Hosted viewer pull failed: {e}"))?;
    let value = self.read_json_response(response).await?;
    let envelope: HostedEnvelope =
      serde_json::from_value(value).map_err(|e| format!("Hosted viewer page is invalid: {e}"))?;
    let rows = envelope
      .rows
      .into_iter()
      .filter_map(|row| parse_hosted_row(row).ok())
      .collect();
    Ok((rows, envelope.next_cursor))
  }

  pub async fn push(
    &self,
    keys: &Keys,
    payload: &HostedPostPayload,
  ) -> Result<HostedPostAck, String> {
    validate_payload(payload)?;
    let body = serde_json::to_vec(payload).map_err(|e| format!("Could not encode post: {e}"))?;
    let endpoint = self.endpoint("api/portfolio/post");
    let authorization = sign_nip98(keys, "POST", &endpoint, &body).await?;
    let response = self
      .http
      .post(endpoint)
      .header(CONTENT_TYPE, "application/json")
      .header(AUTHORIZATION, authorization)
      .body(body)
      .send()
      .await
      .map_err(|e| format!("Hosted API push failed: {e}"))?;
    let value = self.read_json_response(response).await?;
    let response: PushResponse =
      serde_json::from_value(value).map_err(|e| format!("Hosted API acknowledgement is invalid: {e}"))?;
    let remote_id = response
      .remote_id
      .or_else(|| {
        response.id.map(|value| match value {
          Value::String(value) => value,
          Value::Number(value) => value.to_string(),
          _ => String::new(),
        })
      })
      .filter(|value| !value.is_empty())
      .unwrap_or_else(|| payload.id.to_string());
    Ok(HostedPostAck {
      post_uid: response.post_uid.unwrap_or_else(|| payload.post_uid.clone()),
      remote_id,
      revision: response.revision.unwrap_or(1),
    })
  }

  pub async fn register_identity(&self, keys: &Keys, handle: &str) -> Result<Value, String> {
    self
      .signed_post_json(
        keys,
        "api/portfolio/identity",
        &serde_json::json!({ "handle": handle }),
      )
      .await
  }

  pub async fn push_social_action(
    &self,
    keys: &Keys,
    item: &HostedSocialOutboxItem,
  ) -> Result<Value, String> {
    if item.actor_pubkey != keys.public_key().to_hex() {
      return Err("Stored social action does not match this account.".into());
    }
    let (path, payload) = match item.action_type.as_str() {
      "like" | "repost" => {
        let post_uid = item
          .post_uid
          .as_deref()
          .filter(|value| !value.is_empty())
          .ok_or("Social action is missing its post identity.")?;
        let desired_state = item
          .desired_state
          .ok_or("Social action is missing its desired state.")?;
        (
          format!("api/portfolio/interactions/{}", item.action_type),
          serde_json::json!({
            "postUid": post_uid,
            "desiredState": desired_state,
            "actionUid": item.action_uid,
          }),
        )
      }
      "reply" => {
        let post_uid = item
          .post_uid
          .as_deref()
          .filter(|value| !value.is_empty())
          .ok_or("Reply action is missing its post identity.")?;
        let reply_uid = item
          .reply_uid
          .as_deref()
          .filter(|value| !value.is_empty())
          .ok_or("Reply action is missing its reply identity.")?;
        let content = item
          .content
          .as_deref()
          .map(str::trim)
          .filter(|value| !value.is_empty())
          .ok_or("Reply action is empty.")?;
        if content.chars().count() > 2_000 {
          return Err("Reply action is too long.".into());
        }
        (
          "api/portfolio/interactions/reply".to_string(),
          serde_json::json!({
            "postUid": post_uid,
            "replyUid": reply_uid,
            "content": content,
            "actionUid": item.action_uid,
          }),
        )
      }
      "follow" => {
        let target_handle = item
          .target_handle
          .as_deref()
          .map(str::trim)
          .filter(|value| !value.is_empty())
          .ok_or("Follow action is missing its target.")?;
        let desired_state = item
          .desired_state
          .ok_or("Follow action is missing its desired state.")?;
        let mut body = serde_json::json!({
          "targetHandle": target_handle,
          "desiredState": desired_state,
          "actionUid": item.action_uid,
        });
        if let Some(target_pubkey) = item.target_pubkey.as_deref().filter(|value| !value.is_empty()) {
          body["targetPubkey"] = serde_json::Value::String(target_pubkey.to_string());
        }
        (
          "api/portfolio/interactions/follow".to_string(),
          body,
        )
      }
      _ => return Err("Unsupported hosted social action.".into()),
    };
    self.signed_post_json(keys, &path, &payload).await
  }

  pub async fn following(&self, keys: &Keys) -> Result<Vec<HostedFollowing>, String> {
    let value = self
      .signed_get_json(
        keys,
        self.endpoint("api/portfolio/interactions/following"),
      )
      .await?;
    let rows = value
      .get("rows")
      .or_else(|| value.get("following"))
      .or_else(|| value.get("items"))
      .and_then(Value::as_array)
      .ok_or("Hosted following response is invalid.")?;
    let following = rows
      .iter()
      .filter_map(|row| {
        let target_pubkey = row
          .get("targetPubkey")
          .or_else(|| row.get("pubkey"))
          .and_then(Value::as_str)?;
        let target_handle = row
          .get("handle")
          .or_else(|| row.get("targetHandle"))
          .and_then(Value::as_str)
          .unwrap_or("");
        (!target_pubkey.is_empty() && !target_handle.is_empty()).then(|| HostedFollowing {
          target_pubkey: target_pubkey.to_ascii_lowercase(),
          target_handle: target_handle.to_ascii_lowercase(),
        })
      })
      .collect::<Vec<_>>();
    Ok(following)
  }

  pub async fn replies(&self, post_uid: &str) -> Result<Vec<HostedReply>, String> {
    let mut endpoint = self.endpoint("api/portfolio/interactions/replies");
    endpoint
      .query_pairs_mut()
      .append_pair("postUid", post_uid);
    let response = self
      .http
      .get(endpoint)
      .send()
      .await
      .map_err(|error| format!("Hosted replies pull failed: {error}"))?;
    let value = self.read_json_response(response).await?;
    let rows = value
      .get("rows")
      .or_else(|| value.get("replies"))
      .or_else(|| value.get("items"))
      .and_then(Value::as_array)
      .ok_or("Hosted replies response is invalid.")?;
    rows
      .iter()
      .cloned()
      .map(|row| {
        serde_json::from_value::<HostedReply>(row)
          .map_err(|error| format!("Hosted reply is invalid: {error}"))
      })
      .collect()
  }

  pub async fn notifications(
    &self,
    keys: &Keys,
    limit: i64,
  ) -> Result<Vec<HostedNotification>, String> {
    let mut endpoint = self.endpoint("api/portfolio/interactions/notifications");
    endpoint
      .query_pairs_mut()
      .append_pair("limit", &limit.clamp(1, 100).to_string());
    let value = self.signed_get_json(keys, endpoint).await?;
    let rows = value
      .get("rows")
      .or_else(|| value.get("notifications"))
      .or_else(|| value.get("items"))
      .and_then(Value::as_array)
      .ok_or("Hosted notifications response is invalid.")?;
    rows
      .iter()
      .cloned()
      .map(|row| {
        serde_json::from_value::<HostedNotification>(row)
          .map_err(|error| format!("Hosted notification is invalid: {error}"))
      })
      .collect()
  }

  pub async fn mark_notifications_read(
    &self,
    keys: &Keys,
    notification_ids: &[String],
  ) -> Result<Value, String> {
    if notification_ids.len() > 100 {
      return Err("Choose no more than 100 notifications to mark read.".into());
    }
    let payload = if notification_ids.is_empty() {
      serde_json::json!({ "all": true })
    } else {
      serde_json::json!({ "notificationIds": notification_ids })
    };
    self
      .signed_post_json(
        keys,
        "api/portfolio/interactions/notifications/read",
        &payload,
      )
      .await
  }

  async fn request_media_target(
    &self,
    keys: &Keys,
    filename: &str,
    mime: &str,
    size: usize,
    kind: HostedMediaKind,
  ) -> Result<HostedMediaTarget, String> {
    let body = serde_json::to_vec(&serde_json::json!({
      "filename": filename,
      "mime": mime,
      "size": size,
    }))
    .map_err(|e| format!("Could not encode media target request: {e}"))?;
    let endpoint = self.endpoint("api/media/upload-target");
    let authorization = sign_nip98(keys, "POST", &endpoint, &body).await?;
    let response = self
      .http
      .post(endpoint)
      .timeout(Duration::from_secs(30))
      .header(CONTENT_TYPE, "application/json")
      .header(AUTHORIZATION, authorization)
      .body(body)
      .send()
      .await
      .map_err(|_| "Hosted media target request failed.".to_string())?;
    let value = self.read_json_response(response).await?;
    let target: HostedMediaTarget = serde_json::from_value(value)
      .map_err(|_| "Hosted media target response is invalid.".to_string())?;
    let method = target.method.to_ascii_uppercase();
    let provider_matches = match kind {
      HostedMediaKind::Video => target.provider == "stream" && method == "POST",
      _ => target.provider == "r2" && method == "PUT",
    };
    if !provider_matches
      || !is_https_media_url(&target.upload_url)
      || !is_https_media_url(&target.public_url)
    {
      return Err(format!(
        "Hosted {} service returned an incompatible upload target.",
        kind.label()
      ));
    }
    Ok(target)
  }

  async fn upload_media_bytes(
    &self,
    target: &HostedMediaTarget,
    filename: &str,
    mime: &str,
    bytes: Vec<u8>,
  ) -> Result<(), String> {
    let method = target.method.to_ascii_uppercase();
    let response = if method == "PUT" {
      let mut request = self
        .http
        .put(&target.upload_url)
        .timeout(Duration::from_secs(120))
        .body(bytes);
      let mut has_content_type = false;
      for (name, value) in &target.headers {
        if name.eq_ignore_ascii_case("content-type") {
          has_content_type = true;
        }
        request = request.header(name.as_str(), value.as_str());
      }
      if !has_content_type {
        request = request.header(CONTENT_TYPE, mime);
      }
      request
        .send()
        .await
        .map_err(|_| "Hosted R2 media upload failed.".to_string())?
    } else if method == "POST" {
      let part = reqwest::multipart::Part::bytes(bytes)
        .file_name(filename.to_string())
        .mime_str(mime)
        .map_err(|_| "Could not encode hosted media upload.".to_string())?;
      let form = reqwest::multipart::Form::new().part("file", part);
      self
        .http
        .post(&target.upload_url)
        .timeout(Duration::from_secs(600))
        .multipart(form)
        .send()
        .await
        .map_err(|_| "Hosted Stream media upload failed.".to_string())?
    } else {
      return Err("Hosted media target uses an unsupported HTTP method.".into());
    };
    if !response.status().is_success() {
      return Err(format!(
        "Hosted media upload failed with status {}.",
        response.status().as_u16()
      ));
    }
    Ok(())
  }
}

fn validate_payload(payload: &HostedPostPayload) -> Result<(), String> {
  if payload.id <= 0 || payload.id > 9_007_199_254_740_991 {
    return Err("Hosted compatibility id is invalid.".into());
  }
  if payload.post_uid.len() < 8 || payload.post_uid.len() > 128 {
    return Err("Hosted post UID is invalid.".into());
  }
  if payload.author_handle.is_empty() || payload.author_handle.len() > 30 {
    return Err("Hosted post handle is invalid.".into());
  }
  if payload.content.len() > 10_000 || payload.town_tag.len() > 100 {
    return Err("Hosted post content is too large.".into());
  }
  if payload.media_blobs.len() > 10
    || payload
      .media_blobs
      .iter()
      .any(|value| !is_https_media_url(value))
  {
    return Err("Native media must be uploaded before hosted sync.".into());
  }
  if payload.content.trim().is_empty() && payload.media_blobs.is_empty() {
    return Err("Hosted post cannot be empty.".into());
  }
  Ok(())
}

async fn sign_nip98(keys: &Keys, method: &str, url: &Url, payload: &[u8]) -> Result<String, String> {
  let digest = hex::encode(Sha256::digest(payload));
  let tags = vec![
    Tag::parse(vec!["u".to_string(), url.to_string()])
      .map_err(|e| format!("Could not build NIP-98 URL tag: {e}"))?,
    Tag::parse(vec!["method".to_string(), method.to_string()])
      .map_err(|e| format!("Could not build NIP-98 method tag: {e}"))?,
    Tag::parse(vec!["payload".to_string(), digest])
      .map_err(|e| format!("Could not build NIP-98 payload tag: {e}"))?,
  ];
  let event = EventBuilder::new(Kind::Custom(27235), "")
    .tags(tags)
    .sign(keys)
    .await
    .map_err(|e| format!("Could not sign hosted request: {e}"))?;
  let bytes = serde_json::to_vec(&event).map_err(|e| format!("Could not encode NIP-98 event: {e}"))?;
  Ok(format!(
    "Nostr {}",
    base64::engine::general_purpose::STANDARD.encode(bytes)
  ))
}

fn parse_hosted_row(row: HostedRow) -> Result<CloudPostRecord, String> {
  let remote_id = row
    .remote_id
    .or(row.id.map(|value| match value {
      Value::String(value) => value,
      Value::Number(value) => value.to_string(),
      _ => String::new(),
    }))
    .unwrap_or_default();
  if remote_id.is_empty() || remote_id.len() > 80 {
    return Err("Hosted row has no usable remote id.".into());
  }
  let post_uid = row
    .post_uid
    .filter(|value| !value.is_empty())
    .unwrap_or_else(|| format!("legacy:{remote_id}"));
  if post_uid.len() < 8 || post_uid.len() > 128 {
    return Err("Hosted row has an invalid post UID.".into());
  }
  if row.author_handle.is_empty() || row.author_handle.len() > 30 {
    return Err("Hosted row has an invalid handle.".into());
  }
  if row.content.len() > 10_000 || row.town_tag.len() > 100 {
    return Err("Hosted row is too large.".into());
  }
  let media_blobs = parse_media(row.media_blobs)?;
  if media_blobs.iter().any(|value| !is_https_media_url(value)) {
    return Err("Hosted row contains an unsafe media URL.".into());
  }
  let created_at = row.created_at;
  let updated_at = row.updated_at.unwrap_or_else(|| created_at.clone());
  Ok(CloudPostRecord {
    post_uid,
    remote_id,
    author_handle: row.author_handle,
    author_pubkey: row.author_pubkey.unwrap_or_default(),
    content: row.content,
    town_tag: row.town_tag,
    channel_id: row.channel_id.unwrap_or_default(),
    media_blobs,
    likes_count: row.likes_count.unwrap_or(0).max(0),
    replies_count: row.replies_count.unwrap_or(0).max(0),
    reposts_count: row.reposts_count.unwrap_or(0).max(0),
    liked: row.liked,
    reposted: row.reposted,
    viewer_state: row.viewer_state.is_some(),
    created_at,
    updated_at,
    revision: row.revision.unwrap_or(1).max(1),
  })
}

fn parse_media(value: Option<Value>) -> Result<Vec<String>, String> {
  let Some(value) = value else { return Ok(Vec::new()) };
  let values = match value {
    Value::String(text) => serde_json::from_str::<Value>(&text).unwrap_or(Value::Array(Vec::new())),
    other => other,
  };
  let Value::Array(values) = values else { return Ok(Vec::new()) };
  values
    .into_iter()
    .map(|value| value.as_str().map(str::to_string).ok_or_else(|| "Hosted media is not a string.".to_string()))
    .collect()
}

fn truncate(value: &str, max: usize) -> String {
  value.chars().take(max).collect()
}

fn is_https_media_url(value: &str) -> bool {
  Url::parse(value)
    .map(|url| {
      url.scheme() == "https"
        && url.host_str().is_some()
        && url.username().is_empty()
        && url.password().is_none()
    })
    .unwrap_or(false)
}

fn is_local_blob_hash(value: &str) -> bool {
  value.len() == 64 && value.chars().all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
}

fn extension_of(filename: &str) -> String {
  filename
    .rsplit('.')
    .next()
    .unwrap_or_default()
    .to_ascii_lowercase()
}

fn inferred_mime(extension: &str) -> Option<&'static str> {
  Some(match extension {
    "jpg" | "jpeg" => "image/jpeg",
    "png" => "image/png",
    "gif" => "image/gif",
    "webp" => "image/webp",
    "avif" => "image/avif",
    "bmp" => "image/bmp",
    "heic" => "image/heic",
    "heif" => "image/heif",
    "mp4" | "m4v" => "video/mp4",
    "webm" => "video/webm",
    "mov" => "video/quicktime",
    "avi" => "video/x-msvideo",
    "mkv" => "video/x-matroska",
    "mp3" => "audio/mpeg",
    "m4a" | "aac" => "audio/mp4",
    "ogg" | "opus" => "audio/ogg",
    "wav" => "audio/wav",
    "flac" => "audio/flac",
    "pdf" => "application/pdf",
    "doc" => "application/msword",
    "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt" => "text/plain",
    "md" => "text/markdown",
    "csv" => "text/csv",
    "json" => "application/json",
    "zip" => "application/zip",
    "rtf" => "application/rtf",
    _ => return None,
  })
}

fn hosted_media_kind(
  mime: &str,
  filename: &str,
) -> Option<(HostedMediaKind, usize, String)> {
  let extension = extension_of(filename);
  let supplied = mime.split(';').next().unwrap_or_default().trim().to_ascii_lowercase();
  let effective = if supplied.is_empty() || supplied == "application/octet-stream" {
    inferred_mime(&extension).unwrap_or(&supplied).to_string()
  } else {
    supplied
  };
  let kind = match extension.as_str() {
    "jpg" | "jpeg" | "png" | "gif" | "webp" | "avif" | "bmp" | "heic" | "heif"
      if matches!(
        effective.as_str(),
        "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp"
          | "image/avif"
          | "image/bmp"
          | "image/heic"
          | "image/heif"
      ) =>
    {
      HostedMediaKind::Image
    }
    "mp4" | "m4v" | "webm" | "mov" | "avi" | "mkv"
      if matches!(
        effective.as_str(),
        "video/mp4"
          | "video/x-m4v"
          | "video/webm"
          | "video/quicktime"
          | "video/x-msvideo"
          | "video/x-matroska"
      ) =>
    {
      HostedMediaKind::Video
    }
    "mp3" | "m4a" | "aac" | "ogg" | "opus" | "wav" | "flac"
      if matches!(
        effective.as_str(),
        "audio/mpeg"
          | "audio/mp3"
          | "audio/mp4"
          | "audio/x-m4a"
          | "audio/aac"
          | "audio/x-aac"
          | "audio/ogg"
          | "application/ogg"
          | "audio/opus"
          | "audio/wav"
          | "audio/x-wav"
          | "audio/flac"
          | "audio/x-flac"
      ) =>
    {
      HostedMediaKind::Audio
    }
    "pdf" if effective == "application/pdf" => HostedMediaKind::Pdf,
    "doc" | "docx" | "txt" | "md" | "csv" | "json" | "zip" | "rtf"
      if matches!(
        effective.as_str(),
        "application/msword"
          | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          | "application/rtf"
          | "application/x-rtf"
          | "application/json"
          | "text/json"
          | "application/zip"
          | "application/x-zip-compressed"
          | "text/plain"
          | "text/markdown"
          | "text/csv"
      ) =>
    {
      HostedMediaKind::Document
    }
    _ => return None,
  };
  Some((kind, kind.limit(), effective))
}

fn fallback_kind_from_mime(mime: &str) -> HostedMediaKind {
  let mime = mime.to_ascii_lowercase();
  if mime.starts_with("image/") {
    HostedMediaKind::Image
  } else if mime.starts_with("video/") {
    HostedMediaKind::Video
  } else if mime.starts_with("audio/") {
    HostedMediaKind::Audio
  } else if mime == "application/pdf" {
    HostedMediaKind::Pdf
  } else {
    HostedMediaKind::Document
  }
}

fn fallback_media_filename(kind: HostedMediaKind, hash: &str) -> String {
  let extension = match kind {
    HostedMediaKind::Image => "jpg",
    HostedMediaKind::Video => "mp4",
    HostedMediaKind::Audio => "mp3",
    HostedMediaKind::Pdf => "pdf",
    HostedMediaKind::Document => "txt",
  };
  format!("{hash}.{extension}")
}

fn promote_native_media(
  db: &Database,
  blob_store: &BlobStore,
  client: &PortfolioSyncClient,
  keys: &Keys,
  item_id: i64,
  payload: &mut HostedPostPayload,
  promoted: &mut HashMap<String, String>,
) -> Result<(), MediaPromotionError> {
  for index in 0..payload.media_blobs.len() {
    let reference = payload.media_blobs[index].clone();
    if is_https_media_url(&reference) {
      continue;
    }
    if !is_local_blob_hash(&reference) {
      return Err(MediaPromotionError::Blocked(
        "Only local media hashes can be promoted to hosted media.".into(),
      ));
    }
    if let Some(public_url) = promoted.get(&reference) {
      payload.media_blobs[index] = public_url.clone();
      let encoded = serde_json::to_string(payload)
        .map_err(|e| MediaPromotionError::Retry(format!("Could not save media URL: {e}")))?;
      db.update_hosted_outbox_payload(item_id, &encoded)
        .map_err(MediaPromotionError::Retry)?;
      continue;
    }

    let record = match db.get_blob_record(&reference) {
      Ok(Some(record)) => record,
      Ok(None) => {
        return Err(MediaPromotionError::Blocked(
          "The local media file is no longer available; attach it again before sharing.".into(),
        ));
      }
      Err(error) => {
        return Err(MediaPromotionError::Retry(format!(
          "Could not inspect local media: {error}"
        )));
      }
    };
    let filename = if record.filename.trim().is_empty() {
      fallback_media_filename(fallback_kind_from_mime(&record.mime_type), &reference)
    } else {
      record.filename.clone()
    };
    let (kind, limit, mime) = match hosted_media_kind(&record.mime_type, &filename) {
      Some(media) => media,
      None => {
        return Err(MediaPromotionError::Blocked(
          "This media type is not supported for shared posts yet.".into(),
        ));
      }
    };
    let bytes = blob_store.get_blob(&reference).ok_or_else(|| {
      MediaPromotionError::Blocked(
        "The local media bytes are no longer available; attach the file again.".into(),
      )
    })?;
    if bytes.is_empty() || bytes.len() > limit {
      return Err(MediaPromotionError::Blocked(format!(
        "Shared {} files must be between 1 byte and {} MB.",
        kind.label(),
        limit / 1024 / 1024
      )));
    }
    let target = run_block_on(client.request_media_target(
      keys,
      &filename,
      &mime,
      bytes.len(),
      kind,
    ))
    .map_err(MediaPromotionError::Retry)?;
    run_block_on(client.upload_media_bytes(&target, &filename, &mime, bytes))
      .map_err(MediaPromotionError::Retry)?;

    payload.media_blobs[index] = target.public_url.clone();
    promoted.insert(reference, target.public_url);
    let encoded = serde_json::to_string(payload)
      .map_err(|e| MediaPromotionError::Retry(format!("Could not save media URL: {e}")))?;
    db.update_hosted_outbox_payload(item_id, &encoded)
      .map_err(MediaPromotionError::Retry)?;
  }
  Ok(())
}

/// Pull hosted rows, promote local media, then push due outbox rows for one identity.
pub fn sync_once(
  db: &Database,
  blob_store: &BlobStore,
  key_store: &KeyStore,
  author_pubkey: &str,
  town: &str,
) -> Result<PortfolioSyncResult, String> {
  if !cloud_sync_enabled() {
    return Ok(PortfolioSyncResult {
      pulled: 0,
      cached: 0,
      pushed: 0,
      failed: 0,
      pending: db.count_hosted_outbox(author_pubkey)?,
      disabled: true,
    });
  }
  let client = PortfolioSyncClient::from_env()?;
  let (rows, _cursor) = run_block_on(client.pull(town, None))?;
  let cached = db.upsert_hosted_posts(&rows)?;
  let due = db.due_hosted_outbox(author_pubkey, 10)?;
  let mut promoted_media: HashMap<String, String> = HashMap::new();
  let mut pushed = 0usize;
  let mut failed = 0usize;
  for item in due {
    let mut payload = match serde_json::from_str::<HostedPostPayload>(&item.payload) {
      Ok(payload) => payload,
      Err(error) => {
        db.mark_hosted_outbox_blocked(item.id, &format!("Invalid outbox payload: {error}"))?;
        failed += 1;
        continue;
      }
    };
    let keys = match key_store.load(&item.author_handle) {
      Ok(Some(secret)) => match Keys::parse(secret.trim()) {
        Ok(keys) if keys.public_key().to_hex() == author_pubkey => keys,
        _ => {
          db.mark_hosted_outbox_blocked(item.id, "Stored key does not match this account.")?;
          failed += 1;
          continue;
        }
      },
      _ => {
        db.mark_hosted_outbox_blocked(item.id, "No signing key is available for this account.")?;
        failed += 1;
        continue;
      }
    };
    if let Err(error) = promote_native_media(
      db,
      blob_store,
      &client,
      &keys,
      item.id,
      &mut payload,
      &mut promoted_media,
    ) {
      match error {
        MediaPromotionError::Blocked(message) => {
          db.mark_hosted_outbox_blocked(item.id, &message)?;
        }
        MediaPromotionError::Retry(message) => {
          db.mark_hosted_outbox_retry(item.id, &message)?;
        }
      }
      failed += 1;
      continue;
    }
    match run_block_on(client.push(&keys, &payload)) {
      Ok(ack) => {
        db.ack_hosted_outbox(&item, &ack)?;
        pushed += 1;
      }
      Err(error) => {
        db.mark_hosted_outbox_retry(item.id, &error)?;
        failed += 1;
      }
    }
  }
  Ok(PortfolioSyncResult {
    pulled: rows.len(),
    cached,
    pushed,
    failed,
    pending: db.count_hosted_outbox(author_pubkey)?,
    disabled: false,
  })
}

/// Flush idempotent hosted social actions, refresh viewer-aware post state, and
/// cache the authenticated notification feed. Private keys remain in KeyStore.
pub fn sync_social_once(
  db: &Database,
  key_store: &KeyStore,
  author_handle: &str,
  author_pubkey: &str,
  town: &str,
) -> Result<SocialSyncResult, String> {
  if !cloud_sync_enabled() {
    return Ok(SocialSyncResult {
      pushed: 0,
      failed: 0,
      pending: db.count_social_actions(author_pubkey)?,
      pulled: 0,
      cached: 0,
      notifications: 0,
      replies: 0,
      following: 0,
      disabled: true,
    });
  }

  let secret = key_store
    .load(author_handle)?
    .ok_or("No signing key is available for this account.")?;
  let keys = Keys::parse(secret.trim())
    .map_err(|_| "Stored social signing key is invalid.")?
    ;
  if keys.public_key().to_hex() != author_pubkey {
    return Err("Stored signing key does not match this account.".into());
  }

  let client = PortfolioSyncClient::from_env()?;
  // Older deployments may not expose identity registration yet; keep social
  // mutations retryable instead of making an otherwise valid action fail.
  let _ = run_block_on(client.register_identity(&keys, author_handle));
  let due = db.due_social_actions(author_pubkey, 50)?;
  let mut pushed = 0usize;
  let mut failed = 0usize;
  for item in due {
    match run_block_on(client.push_social_action(&keys, &item)) {
      Ok(_) => {
        db.mark_social_action_synced(item.id)?;
        pushed += 1;
      }
      Err(error) => {
        db.mark_social_action_retry(item.id, &error)?;
        failed += 1;
      }
    }
  }

  let (rows, _cursor) = run_block_on(client.pull_for_viewer(&keys, town, None))?;
  for row in &rows {
    db.apply_social_snapshot(
      &row.post_uid,
      author_pubkey,
      row.liked,
      row.reposted,
      row.likes_count,
      row.replies_count,
      row.reposts_count,
      row.revision,
    )?;
  }
  let cached = db.upsert_hosted_posts(&rows)?;
  let mut reply_count = 0usize;
  for row in &rows {
    if row.replies_count <= 0 {
      continue;
    }
    if let Ok(replies) = run_block_on(client.replies(&row.post_uid)) {
      for reply in &replies {
        db.upsert_hosted_reply(reply)?;
        reply_count += 1;
      }
    }
  }
  let following = run_block_on(client.following(&keys))
    .ok()
    .and_then(|rows| db.replace_hosted_follows(author_pubkey, &rows).ok())
    .unwrap_or(0);
  let notifications = run_block_on(client.notifications(&keys, 100))?;
  let notification_count = db.upsert_hosted_notifications(author_pubkey, &notifications)?;

  Ok(SocialSyncResult {
    pushed,
    failed,
    pending: db.count_social_actions(author_pubkey)?,
    pulled: rows.len(),
    cached,
    notifications: notification_count,
    replies: reply_count,
    following,
    disabled: false,
  })
}

pub fn mark_notifications_read_once(
  client: &PortfolioSyncClient,
  keys: &Keys,
  notification_ids: &[String],
) -> Result<Value, String> {
  run_block_on(client.mark_notifications_read(keys, notification_ids))
}

fn run_block_on<T>(future: impl std::future::Future<Output = T>) -> T {
  tokio::runtime::Builder::new_current_thread()
    .enable_all()
    .build()
    .expect("hosted sync runtime")
    .block_on(future)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn rejects_non_origin_api_urls() {
    assert!(parse_base_url("https://example.com/api").is_err());
    assert!(parse_base_url("https://user:pass@example.com").is_err());
    assert!(parse_base_url("http://example.com").is_err());
    assert!(parse_base_url("http://127.0.0.1:3000/").is_ok());
  }

  #[test]
  fn parses_legacy_and_new_hosted_rows() {
    let row: HostedRow = serde_json::from_value(serde_json::json!({
      "id": "42",
      "postUid": "native-12345678",
      "remoteId": "42",
      "authorHandle": "alice",
      "authorPubkey": "aa",
      "content": "hello",
      "townTag": "tsu",
      "mediaBlobs": ["https://media.example.test/photo.jpg"],
      "createdAt": "2026-09-24T00:00:00Z",
      "revision": 1
    }))
    .unwrap();
    let parsed = parse_hosted_row(row).unwrap();
    assert_eq!(parsed.post_uid, "native-12345678");
    assert_eq!(parsed.remote_id, "42");
    assert_eq!(parsed.media_blobs.len(), 1);
    assert_eq!(parsed.media_blobs[0], "https://media.example.test/photo.jpg");
  }

  #[test]
  fn parses_r2_media_target_aliases() {
    let target: HostedMediaTarget = serde_json::from_value(serde_json::json!({
      "provider": "r2",
      "method": "PUT",
      "upload_url": "https://upload.example.test/signed",
      "public_url": "https://media.example.test/photo.jpg",
      "headers": { "content-type": "image/jpeg" }
    }))
    .unwrap();
    assert_eq!(target.provider, "r2");
    assert_eq!(target.method, "PUT");
    assert!(is_https_media_url(&target.public_url));
  }

  #[test]
  fn classifies_supported_hosted_media() {
    let (image, image_limit, image_mime) =
      hosted_media_kind("image/jpeg", "photo.jpg").unwrap();
    assert_eq!(image, HostedMediaKind::Image);
    assert_eq!(image_limit, 15 * 1024 * 1024);
    assert_eq!(image_mime, "image/jpeg");

    let (audio, audio_limit, audio_mime) =
      hosted_media_kind("audio/mpeg", "voice.mp3").unwrap();
    assert_eq!(audio, HostedMediaKind::Audio);
    assert_eq!(audio_limit, 25 * 1024 * 1024);
    assert_eq!(audio_mime, "audio/mpeg");

    let (document, document_limit, document_mime) =
      hosted_media_kind("application/pdf", "notes.pdf").unwrap();
    assert_eq!(document, HostedMediaKind::Pdf);
    assert_eq!(document_limit, 20 * 1024 * 1024);
    assert_eq!(document_mime, "application/pdf");

    let (video, video_limit, video_mime) =
      hosted_media_kind("video/quicktime", "clip.mov").unwrap();
    assert_eq!(video, HostedMediaKind::Video);
    assert_eq!(video_limit, 50 * 1024 * 1024);
    assert_eq!(video_mime, "video/quicktime");

    assert!(hosted_media_kind("image/svg+xml", "unsafe.svg").is_none());
    assert!(hosted_media_kind("application/octet-stream", "payload.exe").is_none());
    assert!(hosted_media_kind("application/octet-stream", "voice.mp3").is_some());
  }

  #[test]
  fn parses_stream_media_target_aliases() {
    let target: HostedMediaTarget = serde_json::from_value(serde_json::json!({
      "provider": "stream",
      "method": "POST",
      "upload_url": "https://upload.videodelivery.net/target",
      "public_url": "https://iframe.videodelivery.net/uid"
    }))
    .unwrap();
    assert_eq!(target.provider, "stream");
    assert_eq!(target.method, "POST");
    assert!(is_https_media_url(&target.public_url));
  }

  #[test]
  fn only_lowercase_sha_hashes_are_local_media() {
    assert!(is_local_blob_hash(&"a".repeat(64)));
    assert!(!is_local_blob_hash(&"A".repeat(64)));
    assert!(!is_local_blob_hash("https://media.example.test/photo.jpg"));
  }

  #[tokio::test]
  async fn nip98_header_contains_no_private_key() {
    let keys = Keys::generate();
    let url = Url::parse("https://bkspc.app/api/portfolio/post").unwrap();
    let header = sign_nip98(&keys, "POST", &url, b"{}").await.unwrap();
    assert!(header.starts_with("Nostr "));
    let encoded = header.trim_start_matches("Nostr ");
    let bytes = base64::engine::general_purpose::STANDARD
      .decode(encoded)
      .unwrap();
    let event: Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(event["kind"], 27235);
    assert_eq!(event["content"], "");
  }

  #[test]
  fn parses_hosted_social_notification_aliases() {
    let notification: HostedNotification = serde_json::from_value(serde_json::json!({
      "id": "notification-12345678",
      "notificationId": "notification-12345678",
      "actorHandle": "alice",
      "actorPubkey": "aa",
      "type": "like",
      "message": "liked your post",
      "createdAt": "2026-09-24T00:00:00Z",
      "unread": true
    }))
    .unwrap();
    assert_eq!(notification.notification_uid, "notification-12345678");
    assert_eq!(notification.kind, "like");
    assert!(notification.unread);
  }

  #[test]
  fn parses_hosted_reply_shape() {
    let reply: HostedReply = serde_json::from_value(serde_json::json!({
      "id": "reply-12345678",
      "replyUid": "reply-12345678",
      "postUid": "post-12345678",
      "authorHandle": "alice",
      "authorPubkey": "aa",
      "content": "hello",
      "createdAt": "2026-09-24T00:00:00Z"
    }))
    .unwrap();
    assert_eq!(reply.reply_uid, "reply-12345678");
    assert_eq!(reply.post_uid, "post-12345678");
    assert!(!reply.pending);
  }
}
