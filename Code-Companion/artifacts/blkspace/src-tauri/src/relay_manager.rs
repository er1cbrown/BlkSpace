use nostr_sdk::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

pub const DEFAULT_RELAYS: &[&str] = &[
    "wss://relay.damus.io",
    "wss://relay.nostr.band",
    "wss://nos.lol",
    "wss://relay.snort.social",
    "wss://nostr.wine",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelayStatus {
  pub url: String,
  pub connected: bool,
  pub events_received: u64,
  pub since_connect: u64,
  pub latency_ms: Option<u64>,
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
  /// Full signed event JSON for signature verification before DB ingest.
  #[serde(default)]
  pub event_json: String,
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
  latency_ms: Option<u64>,
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

  /// Tier 0 yard boot: one relay with timeout. Full mesh: parallel connect, skip slow relays.
  pub async fn connect_startup_relays(&mut self, full_mesh: bool) -> Result<Vec<String>, String> {
    use tokio::time::{timeout, Duration};

    let urls: Vec<&str> = if full_mesh {
      DEFAULT_RELAYS.to_vec()
    } else {
      vec![DEFAULT_RELAYS[0]]
    };

    const RELAY_TIMEOUT: Duration = Duration::from_secs(6);

    if full_mesh && urls.len() > 1 {
      let client = self.client_clone();
      let mut tasks = Vec::with_capacity(urls.len());
      for url in urls {
        let url = url.to_string();
        let log_url = url.clone();
        let c = client.clone();
        tasks.push(tokio::spawn(async move {
          match timeout(
            RELAY_TIMEOUT,
            async {
              c.add_relay(&url).await.map_err(|e| e.to_string())?;
              c.connect_relay(&url).await.map_err(|e| e.to_string())?;
              Ok::<_, String>(url)
            },
          )
          .await
          {
            Ok(Ok(u)) => Some(u),
            Ok(Err(e)) => {
              log::warn!("Relay connect failed for {log_url}: {e}");
              None
            }
            Err(_) => {
              log::warn!("Relay connect timed out: {log_url}");
              None
            }
          }
        }));
      }

      let mut connected = Vec::new();
      for task in tasks {
        if let Ok(Some(url)) = task.await {
          self.register_connection(url.clone(), None);
          connected.push(url);
        }
      }
      return Ok(connected);
    }

    let mut connected = Vec::new();
    for url in urls {
      match timeout(RELAY_TIMEOUT, async {
        self.add_relay(url).await?;
        self.connect_relay(url).await?;
        Ok::<_, String>(())
      })
      .await
      {
        Ok(Ok(())) => {
          let latency = self.check_health(url).await.ok();
          self.register_connection(url.to_string(), latency);
          connected.push(url.to_string());
        }
        Ok(Err(e)) => log::warn!("Failed to connect to {url}: {e}"),
        Err(_) => log::warn!("Relay connect timed out: {url}"),
      }
    }
    Ok(connected)
  }

  /// Blocking wrapper for deferred background thread startup (no mutex held across await).
  pub fn connect_startup_relays_blocking(&mut self, full_mesh: bool) -> Result<Vec<String>, String> {
    let rt = tokio::runtime::Runtime::new().map_err(|e| format!("Runtime error: {e}"))?;
    rt.block_on(self.connect_startup_relays(full_mesh))
  }

  pub async fn connect_to_default_relays(&mut self) -> Result<Vec<String>, String> {
    self.connect_startup_relays(true).await
  }

  pub async fn check_health(&self, url: &str) -> Result<u64, String> {
    let start = std::time::Instant::now();
    self.connect_relay(url).await?;
    let latency = start.elapsed().as_millis() as u64;
    Ok(latency)
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

  pub fn register_connection(&mut self, url: String, latency_ms: Option<u64>) {
    let now = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap_or_default()
      .as_secs();
    if !self.connected_relays.iter().any(|c| c.url == url) {
      self
        .connected_relays
        .push(RelayConnectionState { url, connected_at: now, latency_ms });
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
        latency_ms: c.latency_ms,
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

  pub async fn fetch_event_by_id_on_client(
    client: &Client,
    event_id_hex: &str,
    timeout_secs: u64,
  ) -> Result<Option<NostrEventData>, String> {
    let event_id = EventId::from_hex(event_id_hex)
      .map_err(|e| format!("Invalid event id: {}", e))?;
    let filter = Filter::new().ids(vec![event_id]);
    let events = client
      .fetch_events(vec![filter], std::time::Duration::from_secs(timeout_secs))
      .await
      .map_err(|e| format!("Fetch failed: {}", e))?;
    Ok(events.into_iter().next().map(|event| {
      let event_json = serde_json::to_string(&event).unwrap_or_default();
      NostrEventData {
        id: event.id.to_hex(),
        pubkey: event.pubkey.to_string(),
        kind: event.kind.as_u16() as u64,
        content: event.content.clone(),
        created_at: event.created_at.as_u64(),
        tags: event.tags.iter().map(|t| t.clone().to_vec()).collect(),
        event_json,
      }
    }))
  }

  pub async fn fetch_event_by_id(
    &self,
    event_id_hex: &str,
    timeout_secs: u64,
  ) -> Result<Option<NostrEventData>, String> {
    Self::fetch_event_by_id_on_client(&self.client, event_id_hex, timeout_secs).await
  }

  /// NIP-65: latest kind 10002 for a pubkey from connected relays.
  pub async fn fetch_relay_list_event_on_client(
    client: &Client,
    author_pubkey_hex: &str,
    timeout_secs: u64,
  ) -> Result<Option<NostrEventData>, String> {
    let author = PublicKey::from_hex(author_pubkey_hex)
      .map_err(|e| format!("Invalid pubkey: {e}"))?;
    let filter = Filter::new().author(author).kind(Kind::RelayList);
    let events = client
      .fetch_events(vec![filter], std::time::Duration::from_secs(timeout_secs))
      .await
      .map_err(|e| format!("NIP-65 fetch failed: {e}"))?;
    Ok(events.into_iter().next().map(|event| {
      let event_json = serde_json::to_string(&event).unwrap_or_default();
      NostrEventData {
        id: event.id.to_hex(),
        pubkey: event.pubkey.to_string(),
        kind: event.kind.as_u16() as u64,
        content: event.content.clone(),
        created_at: event.created_at.as_u64(),
        tags: event.tags.iter().map(|t| t.clone().to_vec()).collect(),
        event_json,
      }
    }))
  }

  pub fn relay_urls_from_tags(tags: &[Vec<String>]) -> Vec<String> {
    tags
      .iter()
      .filter(|t| t.len() >= 2 && t[0] == "r")
      .map(|t| t[1].clone())
      .collect()
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

  pub async fn sync_recent_on_client(
    client: &Client,
    filter: Filter,
    timeout_secs: u64,
  ) -> Result<Vec<NostrEventData>, String> {
    let events = Arc::new(std::sync::Mutex::new(Vec::new()));
    let events_clone = events.clone();

    client
      .subscribe(vec![filter], None)
      .await
      .map_err(|e| format!("Subscribe failed: {}", e))
      .map(|_| ())?;

    let mut notifications = client.notifications();
    let deadline = tokio::time::sleep(std::time::Duration::from_secs(timeout_secs));
    tokio::pin!(deadline);

    loop {
      tokio::select! {
        notification = notifications.recv() => {
          match notification {
            Ok(RelayPoolNotification::Event { event, .. }) => {
              let event_json = serde_json::to_string(&event).unwrap_or_default();
              events_clone.lock().unwrap().push(NostrEventData {
                id: event.id.to_hex(),
                pubkey: event.pubkey.to_string(),
                kind: event.kind.as_u16() as u64,
                content: event.content.clone(),
                created_at: event.created_at.as_u64(),
                tags: event.tags.iter().map(|t| t.clone().to_vec()).collect(),
                event_json,
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
    Ok(synced)
  }

  pub async fn sync_recent(
    &self,
    filter: Filter,
    timeout_secs: u64,
  ) -> Result<Vec<NostrEventData>, String> {
    let synced = Self::sync_recent_on_client(&self.client, filter, timeout_secs).await?;
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
