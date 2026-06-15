use nostr_sdk::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelayStatus {
  pub url: String,
  pub connected: bool,
  pub events_received: u64,
  pub since_connect: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NostrEventData {
  pub id: String,
  pub pubkey: String,
  pub kind: u64,
  pub content: String,
  pub created_at: u64,
  pub tags: Vec<Vec<String>>,
}

pub struct RelayManager {
  client: Client,
  keys: Keys,
  connected_relays: Vec<RelayConnectionState>,
  events_received: AtomicU64,
  started_at: u64,
}

struct RelayConnectionState {
  url: String,
  connected_at: u64,
}

impl RelayManager {
  pub fn new() -> Self {
    let keys = Keys::generate();
    let client = Client::new(keys.clone());
    RelayManager {
      client,
      keys,
      connected_relays: Vec::new(),
      events_received: AtomicU64::new(0),
      started_at: std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs(),
    }
  }

  pub fn client(&self) -> &Client {
    &self.client
  }

  pub fn keys(&self) -> &Keys {
    &self.keys
  }

  pub fn client_clone(&self) -> Client {
    self.client.clone()
  }

  pub fn keys_clone(&self) -> Keys {
    self.keys.clone()
  }

  pub async fn add_relay(&self, url: &str) -> Result<(), String> {
    self.client
      .add_relay(url)
      .await
      .map_err(|e| format!("Failed to add relay {}: {}", url, e))?;
    Ok(())
  }

  pub async fn connect_relay(&self, url: &str) -> Result<(), String> {
    self
      .client
      .connect_relay(url)
      .await
      .map_err(|e| format!("Failed to connect to {}: {}", url, e))
  }

  pub async fn disconnect_relay(&self, url: &str) -> Result<(), String> {
    self
      .client
      .disconnect_relay(url)
      .await
      .map_err(|e| format!("Failed to disconnect {}: {}", url, e))
  }

  pub fn register_connection(&mut self, url: String) {
    let now = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap_or_default()
      .as_secs();
    if !self.connected_relays.iter().any(|c| c.url == url) {
      self
        .connected_relays
        .push(RelayConnectionState { url, connected_at: now });
    }
  }

  pub fn remove_connection(&mut self, url: &str) {
    self.connected_relays.retain(|c| c.url != url);
  }

  pub fn get_statuses(&self) -> Vec<RelayStatus> {
    let received = self.events_received.load(Ordering::Relaxed);
    self
      .connected_relays
      .iter()
      .map(|c| RelayStatus {
        url: c.url.clone(),
        connected: true,
        events_received: received,
        since_connect: c.connected_at,
      })
      .collect()
  }

  pub async fn subscribe_tag_filter(
    &self,
    _tag: &str,
    value: &str,
    since_secs: u64,
  ) -> Result<(), String> {
    let single_tag = SingleLetterTag::lowercase(Alphabet::T);
    let filter = Filter::new()
      .custom_tag(single_tag, vec![value])
      .since(Timestamp::from_secs(since_secs));
    self
      .client
      .subscribe(vec![filter], None)
      .await
      .map_err(|e| format!("Subscribe failed: {}", e))
      .map(|_| ())
  }

  pub async fn publish_event(&self, event: Event) -> Result<String, String> {
    let event_id = self
      .client
      .send_event(event)
      .await
      .map_err(|e| format!("Publish failed: {}", e))?;
    Ok(event_id.to_hex())
  }

  pub async fn publish_text_note(
    &self,
    content: &str,
    tags: Vec<Vec<String>>,
  ) -> Result<String, String> {
    let nostr_tags: Vec<Tag> = tags
      .iter()
      .filter_map(|t| Tag::parse(t.clone()).ok())
      .collect();
    let event = EventBuilder::text_note(content)
      .tags(nostr_tags)
      .sign(&self.keys)
      .await
      .map_err(|e| format!("Signing failed: {}", e))?;
    self.publish_event(event).await
  }

  pub async fn publish_custom(
    &self,
    kind: u64,
    content: &str,
    tags: Vec<Vec<String>>,
  ) -> Result<String, String> {
    let nostr_tags: Vec<Tag> = tags
      .iter()
      .filter_map(|t| Tag::parse(t.clone()).ok())
      .collect();
    let event = EventBuilder::new(Kind::Custom(kind as u16), content)
      .tags(nostr_tags)
      .sign(&self.keys)
      .await
      .map_err(|e| format!("Signing failed: {}", e))?;
    self.publish_event(event).await
  }

  pub async fn sync_recent(
    &self,
    filter: Filter,
    timeout_secs: u64,
  ) -> Result<Vec<NostrEventData>, String> {
    let events = Arc::new(std::sync::Mutex::new(Vec::new()));
    let events_clone = events.clone();

    self
      .client
      .subscribe(vec![filter], None)
      .await
      .map_err(|e| format!("Subscribe failed: {}", e))
      .map(|_| ())?;

    let mut notifications = self.client.notifications();
    let deadline = tokio::time::sleep(std::time::Duration::from_secs(timeout_secs));
    tokio::pin!(deadline);

    loop {
      tokio::select! {
        notification = notifications.recv() => {
          match notification {
            Ok(RelayPoolNotification::Event { event, .. }) => {
              events_clone.lock().unwrap().push(NostrEventData {
                id: event.id.to_hex(),
                pubkey: event.pubkey.to_string(),
                kind: event.kind.as_u16() as u64,
                content: event.content.clone(),
                created_at: event.created_at.as_u64(),
                tags: event.tags.iter().map(|t| t.clone().to_vec()).collect(),
              });
            }
            Ok(_) => {}
            Err(_) => break,
          }
        }
        _ = &mut deadline => break,
      }
    }

    let synced = events.lock().unwrap().drain(..).collect::<Vec<_>>();
    self
      .events_received
      .fetch_add(synced.len() as u64, Ordering::Relaxed);
    Ok(synced)
  }

  pub fn increment_events(&self, count: u64) {
    self.events_received.fetch_add(count, Ordering::Relaxed);
  }

  pub fn relay_count(&self) -> usize {
    self.connected_relays.len()
  }
}
