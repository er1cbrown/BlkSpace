//! Live Nostr relay smoke tests — require network. Run: `pnpm test:nostr-relay`

#[cfg(test)]
mod nostr_relay_smoke {
  use crate::relay_manager::{RelayManager, DEFAULT_RELAYS};
  use nostr_sdk::prelude::{Alphabet, Filter, SingleLetterTag, Timestamp};

  #[tokio::test]
  async fn test_nostr_connect_at_least_three_public_relays() {
    let mut manager = RelayManager::new();
    let connected = manager
      .connect_to_default_relays()
      .await
      .expect("connect_to_default_relays");
    assert!(
      connected.len() >= 3,
      "expected ≥3 relays connected, got {} from {:?}",
      connected.len(),
      connected
    );
    let statuses = manager.get_statuses();
    assert!(
      statuses.iter().filter(|s| s.connected).count() >= 3,
      "relay statuses should reflect connections"
    );
  }

  #[tokio::test]
  async fn test_nostr_relay_health_latency() {
    let manager = RelayManager::new();
    let url = DEFAULT_RELAYS[0];
    manager.add_relay(url).await.expect("add relay");
    let latency = manager
      .check_health(url)
      .await
      .expect("health check");
    assert!(latency < 30_000, "latency {}ms too high for {}", latency, url);
  }

  #[tokio::test]
  async fn test_nostr_subscribe_hbcu_town_tag() {
    let mut manager = RelayManager::new();
    let connected = manager.connect_to_default_relays().await.unwrap();
    assert!(!connected.is_empty());
    manager
      .subscribe_tag_filter("t", "hbcu-town:tsu", 3600)
      .await
      .expect("subscribe to town tag");
  }

  #[tokio::test]
  async fn test_nostr_sync_recent_events() {
    let mut manager = RelayManager::new();
    manager.connect_to_default_relays().await.unwrap();
    let single_tag = SingleLetterTag::lowercase(Alphabet::T);
    let since = Timestamp::now().as_u64().saturating_sub(3600);
    let filter = Filter::new()
      .custom_tag(single_tag, vec!["hbcu-town:tsu".to_string()])
      .since(Timestamp::from_secs(since));
    let events = manager
      .sync_recent(filter, 8)
      .await
      .expect("sync_recent");
    // May be zero if no TSU-tagged notes in last hour — smoke is "no error"
    assert!(events.len() < 10_000, "sanity bound on event count");
  }

  /// Publish kind 1 to relay.damus.io and read it back — proxy for Damus / cross-client visibility.
  #[tokio::test]
  async fn test_nostr_publish_roundtrip_damus_relay() {
    let mut manager = RelayManager::new();
    let damus = DEFAULT_RELAYS[0];
    manager.add_relay(damus).await.expect("add damus");
    manager.connect_relay(damus).await.expect("connect damus");
    manager.register_connection(damus.to_string(), None);

    let marker = format!("BlkSpace damus visibility smoke {}", uuid::Uuid::new_v4());
    let tags = vec![
      vec!["t".to_string(), "hbcu-town:tsu".to_string()],
      vec!["t".to_string(), "blkspace".to_string()],
    ];
    let event_id = manager
      .publish_text_note(&marker, tags)
      .await
      .expect("publish to damus");

    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    let mut fetched = None;
    for _ in 0..3 {
      if let Ok(Some(event)) = manager.fetch_event_by_id(&event_id, 15).await {
        fetched = Some(event);
        break;
      }
      tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }
    let event = fetched.expect("event should appear on relay.damus.io");
    assert_eq!(event.id, event_id);
    assert_eq!(event.content, marker);
  }

  /// NIP-65 kind 10002 publish + live fetch by pubkey.
  #[tokio::test]
  async fn test_nostr_nip65_relay_list_roundtrip() {
    use nostr_sdk::prelude::{EventBuilder, Kind, Tag};

    let mut manager = RelayManager::new();
    manager.connect_to_default_relays().await.unwrap();
    let pubkey = manager.keys().public_key().to_string();
    let relay_url = DEFAULT_RELAYS[0];
    let tag = Tag::parse(vec![
      "r".to_string(),
      relay_url.to_string(),
      "read".to_string(),
    ])
    .expect("r tag");
    let event = EventBuilder::new(Kind::RelayList, "")
      .tags(vec![tag])
      .sign(manager.keys())
      .await
      .expect("sign nip65");
    manager.publish_event(event).await.expect("publish nip65");

    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    let fetched = RelayManager::fetch_relay_list_event_on_client(
      manager.client(),
      &pubkey,
      20,
    )
    .await
    .expect("fetch nip65")
    .expect("kind 10002 on relay");
    let urls = RelayManager::relay_urls_from_tags(&fetched.tags);
    assert!(
      urls.iter().any(|u| u.contains("relay.damus.io") || u == relay_url),
      "expected relay list to include damus, got {:?}",
      urls
    );
  }
}