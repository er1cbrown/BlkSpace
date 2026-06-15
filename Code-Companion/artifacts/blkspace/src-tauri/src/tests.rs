#[cfg(test)]
mod tests {
  use rusqlite::{Connection, Result};
  use std::path::PathBuf;
  use std::sync::Mutex;
  use crate::db::{
    Database, User, Post, validate_handle, validate_display_name, validate_content, validate_bio, validate_town,
  };

  fn setup_test_db() -> Database {
    let temp_dir = std::env::temp_dir().join(format!("blkspace_test_{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&temp_dir).unwrap();
    Database::new(temp_dir).unwrap()
  }

  #[test]
  fn test_validate_handle() {
    assert!(validate_handle("test_user").is_ok());
    assert!(validate_handle("test-user").is_ok());
    assert!(validate_handle("test_user_123").is_ok());
    assert!(validate_handle("").is_err());
    assert!(validate_handle("a").is_ok());
    assert!(validate_handle("a".repeat(31).as_str()).is_err());
    assert!(validate_handle("test user").is_err());
    assert!(validate_handle("test@user").is_err());
  }

  #[test]
  fn test_validate_display_name() {
    assert!(validate_display_name("Test User").is_ok());
    assert!(validate_display_name("a").is_ok());
    assert!(validate_display_name("").is_err());
    assert!(validate_display_name("a".repeat(51).as_str()).is_err());
  }

  #[test]
  fn test_validate_content() {
    assert!(validate_content("Hello world").is_ok());
    assert!(validate_content("").is_err());
    assert!(validate_content("a".repeat(5001).as_str()).is_err());
  }

  #[test]
  fn test_validate_bio() {
    assert!(validate_bio("").is_ok());
    assert!(validate_bio("Short bio").is_ok());
    assert!(validate_bio("a".repeat(501).as_str()).is_err());
  }

  #[test]
  fn test_validate_town() {
    assert!(validate_town("tsu").is_ok());
    assert!(validate_town("").is_ok());
    assert!(validate_town("a".repeat(31).as_str()).is_err());
  }

  #[test]
  fn test_create_user() {
    let db = setup_test_db();
    let user = db.create_user("test_user", "Test User", "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890").unwrap();
    
    assert_eq!(user.handle, "test_user");
    assert_eq!(user.display_name, "Test User");
    assert_eq!(user.weix_bucks, 100);
    assert_eq!(user.followers_count, 0);
    assert_eq!(user.following_count, 0);
  }

  #[test]
  fn test_get_user() {
    let db = setup_test_db();
    db.create_user("test_user", "Test User", "").unwrap();
    
    let user = db.get_user("test_user").unwrap().unwrap();
    assert_eq!(user.handle, "test_user");
    assert_eq!(user.display_name, "Test User");
  }

  #[test]
  fn test_get_user_not_found() {
    let db = setup_test_db();
    let user = db.get_user("nonexistent").unwrap();
    assert!(user.is_none());
  }

  #[test]
  fn test_create_post() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    
    let post = db.create_post("author", "Test content", "tsu", &[]).unwrap();
    
    assert_eq!(post.author_handle, "author");
    assert_eq!(post.content, "Test content");
    assert_eq!(post.town_tag, "tsu");
    assert_eq!(post.likes_count, 0);
    assert_eq!(post.replies_count, 0);
  }

  #[test]
  fn test_list_posts() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    db.create_post("author", "Post 1", "tsu", &[]).unwrap();
    db.create_post("author", "Post 2", "tsu", &[]).unwrap();
    
    let posts = db.list_posts(Some("tsu"), None).unwrap();
    assert_eq!(posts.len(), 2);
  }

  #[test]
  fn test_toggle_like() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    db.create_user("liker", "Liker", "").unwrap();
    
    let post = db.create_post("author", "Test", "tsu", &[]).unwrap();
    let post_id = post.id;
    
    // Like
    let liked = db.toggle_like(post_id, "liker").unwrap();
    assert!(liked);
    
    // Unlike
    let unliked = db.toggle_like(post_id, "liker").unwrap();
    assert!(!unliked);
    
    // Like again
    let liked_again = db.toggle_like(post_id, "liker").unwrap();
    assert!(liked_again);
  }

  #[test]
  fn test_create_reply() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    db.create_user("replier", "Replier", "").unwrap();
    
    let post = db.create_post("author", "Test", "tsu", &[]).unwrap();
    let post_id = post.id;
    
    let reply = db.create_reply(post_id, "replier", "Nice post!").unwrap();
    
    assert_eq!(reply.post_id, post_id);
    assert_eq!(reply.author_handle, "replier");
    assert_eq!(reply.content, "Nice post!");
    
    // Check post reply count incremented
    let posts = db.list_posts(Some("tsu"), None).unwrap();
    assert_eq!(posts[0].replies_count, 1);
  }

  #[test]
  fn test_wallet_transactions() {
    let db = setup_test_db();
    db.create_user("sender", "Sender", "").unwrap();
    db.create_user("receiver", "Receiver", "").unwrap();
    
    // Initial balance should be 100
    let sender = db.get_user("sender").unwrap().unwrap();
    assert_eq!(sender.weix_bucks, 100);
    
    // Send WeixBucks
    let (sender_new, receiver_new) = db.send_weixbucks("sender", "receiver", 50).unwrap();
    
    assert_eq!(sender_new, 50);
    assert_eq!(receiver_new, 150);
    
    // Check sender wallet
    let sender_txs = db.get_wallet_tx("sender").unwrap();
    assert_eq!(sender_txs.len(), 1);
    assert_eq!(sender_txs[0].tx_type, "spend");
    assert_eq!(sender_txs[0].amount, -50);
    
    // Check receiver wallet
    let receiver_txs = db.get_wallet_tx("receiver").unwrap();
    assert_eq!(receiver_txs.len(), 1);
    assert_eq!(receiver_txs[0].tx_type, "earn");
    assert_eq!(receiver_txs[0].amount, 50);
  }

  #[test]
  fn test_insufficient_funds() {
    let db = setup_test_db();
    db.create_user("poor", "Poor", "").unwrap();
    db.create_user("rich", "Rich", "").unwrap();
    
    // Try to send more than balance
    let result = db.send_weixbucks("poor", "rich", 200);
    assert!(result.is_err());
  }

  #[test]
  fn test_update_user() {
    let db = setup_test_db();
    db.create_user("user", "Old Name", "").unwrap();
    
    db.update_user("user", "New Name", "New bio", "howard").unwrap();
    
    let user = db.get_user("user").unwrap().unwrap();
    assert_eq!(user.display_name, "New Name");
    assert_eq!(user.bio, "New bio");
    assert_eq!(user.town, "howard");
  }

  #[test]
  fn test_list_users() {
    let db = setup_test_db();
    db.create_user("user1", "User One", "").unwrap();
    db.create_user("user2", "User Two", "").unwrap();
    
    let users = db.list_users().unwrap();
    assert_eq!(users.len(), 2);
  }

  #[test]
  fn test_post_rewards() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    
    let initial = db.get_user("author").unwrap().unwrap();
    assert_eq!(initial.weix_bucks, 100);
    
    db.create_post("author", "Test", "tsu", &[]).unwrap();
    
    let after_post = db.get_user("author").unwrap().unwrap();
    // Post creation should reward +5 WB * engagement_quality (1.0)
    assert_eq!(after_post.weix_bucks, 105);
  }

  #[test]
  fn test_reply_rewards() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    db.create_user("replier", "Replier", "").unwrap();
    
    let post = db.create_post("author", "Test", "tsu", &[]).unwrap();
    
    let initial = db.get_user("replier").unwrap().unwrap();
    assert_eq!(initial.weix_bucks, 100);
    
    db.create_reply(post.id, "replier", "Nice!").unwrap();
    
    let after_reply = db.get_user("replier").unwrap().unwrap();
    // Reply should reward +2 WB * engagement_quality (1.0)
    assert_eq!(after_reply.weix_bucks, 102);
  }

  #[test]
  fn test_like_rewards_author() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    db.create_user("liker", "Liker", "").unwrap();
    
    let post = db.create_post("author", "Test", "tsu", &[]).unwrap();
    
    // Reset author balance (seeding gave 100, post creation gave +5)
    let author = db.get_user("author").unwrap().unwrap();
    assert_eq!(author.weix_bucks, 105);
    
    db.toggle_like(post.id, "liker").unwrap();
    
    let after_like = db.get_user("author").unwrap().unwrap();
    // Like should reward +1 WB * engagement_quality (1.0)
    assert_eq!(after_like.weix_bucks, 106);
  }

  #[test]
  fn test_self_like_no_reward() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    
    let post = db.create_post("author", "Test", "tsu", &[]).unwrap();
    
    let before = db.get_user("author").unwrap().unwrap();
    db.toggle_like(post.id, "author").unwrap();
    let after = db.get_user("author").unwrap().unwrap();
    
    // Self-like should not reward
    assert_eq!(after.weix_bucks, before.weix_bucks);
  }

  #[test]
  fn test_relay_events() {
    let db = setup_test_db();
    
    let inserted = db.insert_relay_event(
      "event123",
      "wss://relay.example.com",
      1,
      "pubkey123",
      "Hello",
      "[["t","tsu"]]",
      1234567890,
    ).unwrap();
    
    assert!(inserted);
    
    // Duplicate should be ignored
    let inserted_again = db.insert_relay_event(
      "event123",
      "wss://relay.example.com",
      1,
      "pubkey123",
      "Hello",
      "[["t","tsu"]]",
      1234567890,
    ).unwrap();
    
    assert!(!inserted_again);
  }

  #[test]
  fn test_relay_connections() {
    let db = setup_test_db();
    
    db.upsert_relay_connection("wss://relay1.com", "Relay 1", "tsu", "connected").unwrap();
    db.upsert_relay_connection("wss://relay2.com", "Relay 2", "howard", "connected").unwrap();
    
    let connections = db.list_relay_connections().unwrap();
    assert_eq!(connections.len(), 2);
    
    // Update status
    db.upsert_relay_connection("wss://relay1.com", "Relay 1", "tsu", "disconnected").unwrap();
    
    let connections = db.list_relay_connections().unwrap();
    assert_eq!(connections[0].status, "disconnected");
  }

  #[test]
  fn test_network_stats() {
    let db = setup_test_db();
    db.create_user("user1", "User 1", "").unwrap();
    db.create_user("user2", "User 2", "").unwrap();
    
    let stats = db.get_network_stats().unwrap();
    assert_eq!(stats.total_users, 2);
    assert_eq!(stats.active_towns, 0); // Both users have empty town
    assert!(stats.weix_bucks_in_circulation > 0);
  }

  #[test]
  fn test_blob_operations() {
    let db = setup_test_db();
    db.create_user("uploader", "Uploader", "").unwrap();
    
    let (record, is_new) = db.insert_blob(
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "photo.jpg",
      "image/jpeg",
      1024,
      "uploader",
    ).unwrap();
    
    assert!(is_new);
    assert_eq!(record.filename, "photo.jpg");
    assert_eq!(record.mime_type, "image/jpeg");
    
    // Duplicate hash should return existing record
    let (record2, is_new2) = db.insert_blob(
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "photo.jpg",
      "image/jpeg",
      1024,
      "uploader",
    ).unwrap();
    
    assert!(!is_new2);
    assert_eq!(record2.id, record.id);
  }

  #[test]
  fn test_delete_blob() {
    let db = setup_test_db();
    db.create_user("uploader", "Uploader", "").unwrap();
    
    let (record, _) = db.insert_blob(
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "photo.jpg",
      "image/jpeg",
      1024,
      "uploader",
    ).unwrap();
    
    let deleted = db.delete_blob_record(&record.hash, "uploader").unwrap();
    assert!(deleted);
    
    let not_found = db.get_blob_record(&record.hash).unwrap();
    assert!(not_found.is_none());
  }

  #[test]
  fn test_blob_hash_exists() {
    let db = setup_test_db();
    db.create_user("uploader", "Uploader", "").unwrap();
    
    let hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    
    assert!(!db.blob_hash_exists(hash));
    
    db.insert_blob(hash, "photo.jpg", "image/jpeg", 1024, "uploader").unwrap();
    
    assert!(db.blob_hash_exists(hash));
  }

  #[test]
  fn test_communities() {
    let db = setup_test_db();
    
    let communities = db.get_communities();
    assert_eq!(communities.len(), 5);
    
    // Check TSU
    let tsu = communities.iter().find(|c| c.id == "tsu").unwrap();
    assert_eq!(tsu.name, "TSU Yard");
    assert_eq!(tsu.school, "Tennessee State University");
  }

  #[test]
  fn test_notifications() {
    let db = setup_test_db();
    db.create_user("user", "User", "").unwrap();
    db.create_user("from", "From", "").unwrap();
    
    // Create a notification by seeding
    let notifications = db.get_notifications("user").unwrap();
    // Note: seed data creates 3 notifications for demo_user
    // Since we create user with empty handle, we need to check demo_user
    let demo_notifications = db.get_notifications("demo_user").unwrap();
    assert!(demo_notifications.len() >= 3);
  }

  #[test]
  fn test_user_by_pubkey() {
    let db = setup_test_db();
    db.create_user("user", "User", "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890").unwrap();
    
    let user = db.get_user_by_pubkey("abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890").unwrap().unwrap();
    assert_eq!(user.handle, "user");
    
    let not_found = db.get_user_by_pubkey("nonexistent").unwrap();
    assert!(not_found.is_none());
  }

  #[test]
  fn test_set_user_pubkey() {
    let db = setup_test_db();
    db.create_user("user", "User", "").unwrap();
    
    db.set_user_pubkey("user", "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890").unwrap();
    
    let user = db.get_user("user").unwrap().unwrap();
    assert_eq!(user.pubkey, "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890");
  }

  #[test]
  fn test_trending_feed() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    
    db.create_post("author", "Post 1", "tsu", &[]).unwrap();
    db.create_post("author", "Post 2", "tsu", &[]).unwrap();
    db.create_post("author", "Post 3", "howard", &[]).unwrap();
    
    let trending = db.get_trending_feed(None).unwrap();
    assert_eq!(trending.len(), 3);
  }

  #[test]
  fn test_get_user_posts() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    
    db.create_post("author", "Post 1", "tsu", &[]).unwrap();
    db.create_post("author", "Post 2", "tsu", &[]).unwrap();
    
    let posts = db.get_user_posts("author", None).unwrap();
    assert_eq!(posts.len(), 2);
  }

  #[test]
  fn test_relay_list() {
    let db = setup_test_db();
    
    let relays = db.list_relays().unwrap();
    assert_eq!(relays.len(), 5);
    
    // Check TSU relay
    let tsu = relays.iter().find(|r| r.town == "Nashville, TN").unwrap();
    assert_eq!(tsu.name, "TSU Main Relay");
    assert_eq!(tsu.status, "online");
  }

  #[test]
  fn test_recent_activity() {
    let db = setup_test_db();
    
    let activity = db.get_recent_activity().unwrap();
    assert_eq!(activity.len(), 4);
  }

  #[test]
  fn test_get_post() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    
    let created = db.create_post("author", "Test", "tsu", &[]).unwrap();
    
    let found = db.get_post(created.id, None).unwrap().unwrap();
    assert_eq!(found.content, "Test");
    assert_eq!(found.author_handle, "author");
    
    let not_found = db.get_post(999, None).unwrap();
    assert!(not_found.is_none());
  }

  #[test]
  fn test_get_post_with_like() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    db.create_user("viewer", "Viewer", "").unwrap();
    
    let post = db.create_post("author", "Test", "tsu", &[]).unwrap();
    db.toggle_like(post.id, "viewer").unwrap();
    
    let found = db.get_post(post.id, Some("viewer")).unwrap().unwrap();
    assert!(found.liked);
    assert_eq!(found.likes_count, 1);
  }

  #[test]
  fn test_list_replies() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    db.create_user("replier", "Replier", "").unwrap();
    
    let post = db.create_post("author", "Test", "tsu", &[]).unwrap();
    db.create_reply(post.id, "replier", "Reply 1").unwrap();
    db.create_reply(post.id, "replier", "Reply 2").unwrap();
    
    let replies = db.list_replies(post.id).unwrap();
    assert_eq!(replies.len(), 2);
    assert_eq!(replies[0].content, "Reply 1");
    assert_eq!(replies[1].content, "Reply 2");
  }

  #[test]
  fn test_count_relay_events() {
    let db = setup_test_db();
    
    let now = chrono::Utc::now().timestamp();
    
    db.insert_relay_event("e1", "r1", 1, "pk", "c", "[]", now - 100).unwrap();
    db.insert_relay_event("e2", "r1", 1, "pk", "c", "[]", now - 50).unwrap();
    db.insert_relay_event("e3", "r1", 1, "pk", "c", "[]", now - 1000).unwrap();
    
    let count = db.count_relay_events_since(now - 200).unwrap();
    assert_eq!(count, 2);
  }

  #[test]
  fn test_list_relay_events_by_pubkey() {
    let db = setup_test_db();
    
    let now = chrono::Utc::now().timestamp();
    
    db.insert_relay_event("e1", "r1", 1, "pk1", "c", "[]", now).unwrap();
    db.insert_relay_event("e2", "r1", 1, "pk2", "c", "[]", now).unwrap();
    
    let events = db.list_relay_events_by_pubkey("pk1", 10).unwrap();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].event_id, "e1");
  }

  #[test]
  fn test_update_post_nostr_meta() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    
    let post = db.create_post("author", "Test", "tsu", &[]).unwrap();
    
    db.update_post_nostr_meta(post.id, "nostr_event_123", "wss://relay.example.com").unwrap();
    
    let updated = db.get_post(post.id, None).unwrap().unwrap();
    assert_eq!(updated.nostr_event_id, "nostr_event_123");
    assert_eq!(updated.relay_url, "wss://relay.example.com");
  }

  #[test]
  fn test_combined_feed() {
    let db = setup_test_db();
    
    let now = chrono::Utc::now().timestamp();
    
    db.insert_relay_event("e1", "r1", 1, "pk", "Hello", "[["t","hbcu-town:tsu"]]", now).unwrap();
    db.insert_relay_event("e2", "r1", 1, "pk", "World", "[["t","hbcu-town:howard"]]", now - 1).unwrap();
    
    let combined = db.list_combined_feed(Some("tsu"), None).unwrap();
    assert_eq!(combined.len(), 1);
    assert_eq!(combined[0].town_tag, "tsu");
  }

  #[test]
  fn test_blob_with_cid() {
    let db = setup_test_db();
    
    // Test inserting blob with CID
    let (record, is_new) = db.insert_blob(
      "abc123",
      Some("bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
      "test.jpg",
      "image/jpeg",
      1024,
      "demo_user"
    ).unwrap();
    
    assert!(is_new);
    assert_eq!(record.hash, "abc123");
    assert_eq!(record.cid, Some("bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".to_string()));
    
    // Test retrieving blob with CID
    let retrieved = db.get_blob_record("abc123").unwrap().unwrap();
    assert_eq!(retrieved.cid, Some("bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".to_string()));
    
    // Test listing user blobs with CID
    let blobs = db.list_user_blobs("demo_user").unwrap();
    assert_eq!(blobs.len(), 1);
    assert_eq!(blobs[0].cid, Some("bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".to_string()));
  }

  #[test]
  fn test_blob_without_cid() {
    let db = setup_test_db();
    
    // Test inserting blob without CID (fallback mode)
    let (record, is_new) = db.insert_blob(
      "def456",
      None,
      "test.png",
      "image/png",
      2048,
      "demo_user"
    ).unwrap();
    
    assert!(is_new);
    assert_eq!(record.hash, "def456");
    assert_eq!(record.cid, None);
    
    // Test retrieving blob without CID
    let retrieved = db.get_blob_record("def456").unwrap().unwrap();
    assert_eq!(retrieved.cid, None);
  }

  // ─── Pinning Tests ───────────────────────────────────

  #[test]
  fn test_pin_blob() {
    let db = setup_test_db();
    
    // Pin a blob
    let pinned = db.pin_blob("abc123", "demo_user").unwrap();
    assert!(pinned);
    
    // Try to pin again (should return false since already pinned)
    let pinned_again = db.pin_blob("abc123", "demo_user").unwrap();
    assert!(!pinned_again);
    
    // Check if pinned
    assert!(db.is_pinned("abc123", "demo_user").unwrap());
    assert!(!db.is_pinned("abc123", "other_user").unwrap());
    
    // List pinned blobs
    let pinned = db.list_pinned_blobs("demo_user").unwrap();
    assert_eq!(pinned.len(), 1);
    assert_eq!(pinned[0], "abc123");
  }

  #[test]
  fn test_should_pin() {
    let db = setup_test_db();
    
    // Initially should not pin
    assert!(!db.should_pin("abc123").unwrap());
    
    // Increment access count 11 times
    for _ in 0..11 {
      db.increment_blob_access("abc123").unwrap();
    }
    
    // Now should pin
    assert!(db.should_pin("abc123").unwrap());
  }

  #[test]
  fn test_increment_blob_access() {
    let db = setup_test_db();
    
    // First access
    let count = db.increment_blob_access("abc123").unwrap();
    assert_eq!(count, 1);
    
    // Second access
    let count = db.increment_blob_access("abc123").unwrap();
    assert_eq!(count, 2);
    
    // Third access
    let count = db.increment_blob_access("abc123").unwrap();
    assert_eq!(count, 3);
  }

  // ─── Pin Serve Rewards Tests ────────────────────────

  #[test]
  fn test_record_pin_serve() {
    let db = setup_test_db();
    
    // Record serves
    db.record_pin_serve("abc123", "demo_user", "user_a").unwrap();
    db.record_pin_serve("abc123", "demo_user", "user_b").unwrap();
    db.record_pin_serve("def456", "demo_user", "user_c").unwrap();
    
    // Count serves today
    let count = db.count_serves_today("demo_user").unwrap();
    assert_eq!(count, 3);
    
    // Count serves for specific blob
    let blob_count = db.count_serves_for_blob("abc123").unwrap();
    assert_eq!(blob_count, 2);
  }

  // ─── Offline Cache Tests ───────────────────────────

  #[test]
  fn test_offline_cache() {
    let db = setup_test_db();
    
    // Add to cache
    let added = db.add_to_offline_cache("abc123", "demo_user", "blob", "followed").unwrap();
    assert!(added);
    
    // Try to add again (should return false)
    let added_again = db.add_to_offline_cache("abc123", "demo_user", "blob", "followed").unwrap();
    assert!(!added_again);
    
    // Check if cached
    assert!(db.is_cached_offline("abc123", "demo_user").unwrap());
    assert!(!db.is_cached_offline("abc123", "other_user").unwrap());
    
    // List cache
    let cache = db.list_offline_cache("demo_user").unwrap();
    assert_eq!(cache.len(), 1);
    assert_eq!(cache[0], "abc123");
    
    // Remove from cache
    let removed = db.remove_from_offline_cache("abc123", "demo_user").unwrap();
    assert!(removed);
    assert!(!db.is_cached_offline("abc123", "demo_user").unwrap());
  }

  // ─── Cross-Device Sync Tests ───────────────────────

  #[test]
  fn test_get_user_media_hashes() {
    let db = setup_test_db();
    
    // Create a post with media blobs
    db.insert_post("demo_user", "Test post", "tsu", None).unwrap();
    
    // Add blobs
    db.insert_blob("hash1", Some("cid1"), "test1.jpg", "image/jpeg", 1024, "demo_user").unwrap();
    db.insert_blob("hash2", Some("cid2"), "test2.jpg", "image/jpeg", 2048, "demo_user").unwrap();
    
    // Get user media hashes
    let hashes = db.get_user_media_hashes("demo_user").unwrap();
    assert!(hashes.contains(&"hash1".to_string()));
    assert!(hashes.contains(&"hash2".to_string()));
  }

  // ─── Node Role Tests ───────────────────────────────

  #[test]
  fn test_node_role() {
    let db = setup_test_db();
    
    // Set node role
    db.set_node_role("demo_user", "relay").unwrap();
    
    // Get node role
    let role = db.get_node_role("demo_user").unwrap();
    assert_eq!(role, "relay");
    
    // Increment relay uptime
    db.increment_relay_uptime("demo_user", 5).unwrap();
    
    // Verify uptime (need to query it)
    let conn = db.conn.lock().unwrap();
    let hours: i64 = conn.query_row(
      "SELECT relay_uptime_hours FROM users WHERE handle = ?1",
      rusqlite::params!["demo_user"],
      |r| r.get(0),
    ).unwrap();
    assert_eq!(hours, 5);
  }
}