//! Hosted portfolio synchronization for the native app.
//!
//! The WebView never receives a private key or a reusable authorization
//! header. NIP-98 proofs are created here with the key held by KeyStore and
//! the exact request bytes are used for both signing and sending.

use crate::db::{CloudPostRecord, Database};
use crate::key_store::KeyStore;
use base64::Engine;
use nostr_sdk::prelude::{EventBuilder, Keys, Kind, Tag};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use reqwest::redirect::Policy;
use reqwest::Client;
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
      .any(|value| !value.starts_with("https://"))
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
  if media_blobs.iter().any(|value| !value.starts_with("https://")) {
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

/// Pull hosted rows, then push due local outbox rows for one identity.
pub fn sync_once(
  db: &Database,
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
  let mut pushed = 0usize;
  let mut failed = 0usize;
  for item in due {
    let payload = match serde_json::from_str::<HostedPostPayload>(&item.payload) {
      Ok(payload) => payload,
      Err(error) => {
        db.mark_hosted_outbox_blocked(item.id, &format!("Invalid outbox payload: {error}"))?;
        failed += 1;
        continue;
      }
    };
    if payload
      .media_blobs
      .iter()
      .any(|value| !value.starts_with("https://"))
    {
      db.mark_hosted_outbox_blocked(
        item.id,
        "Native media must be uploaded to the hosted media service first.",
      )?;
      failed += 1;
      continue;
    }
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
      "mediaBlobs": "[]",
      "createdAt": "2026-09-24T00:00:00Z",
      "revision": 1
    }))
    .unwrap();
    let parsed = parse_hosted_row(row).unwrap();
    assert_eq!(parsed.post_uid, "native-12345678");
    assert_eq!(parsed.remote_id, "42");
    assert_eq!(parsed.media_blobs.len(), 0);
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
}
