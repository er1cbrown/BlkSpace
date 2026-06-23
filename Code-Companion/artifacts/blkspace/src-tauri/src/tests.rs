#[cfg(test)]
mod tests {
  use sha2::{Digest, Sha256};
  use rusqlite;
  use crate::db::{
    Database, DAILY_WB_EARN_CAP, MARKETPLACE_PLATFORM_FEE_BPS, MIN_WITHDRAW_KARMA,
    MIN_WITHDRAW_POSTS, MIN_WITHDRAW_WB, TIP_PLATFORM_FEE_BPS, TokenomicsPolicy,
    WEEKLY_WITHDRAW_CAP_WB, calc_platform_fee, validate_handle, validate_display_name,
    validate_content, validate_bio, validate_town,
  };

  const NO_CHANNEL: &str = "";

  fn setup_test_db() -> Database {
    let temp_dir = std::env::temp_dir().join(format!("blkspace_test_{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&temp_dir).unwrap();
    Database::new_for_test(temp_dir).unwrap()
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
    
    let post = db.create_post("author", "Test content", "tsu", NO_CHANNEL, &[]).unwrap().post;
    
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
    db.create_post("author", "Post 1", "tsu", NO_CHANNEL, &[]).unwrap();
    db.create_post("author", "Post 2", "tsu", NO_CHANNEL, &[]).unwrap();
    
    let posts = db.list_posts(Some("tsu"), None, None, None).unwrap().posts;
    assert_eq!(posts.len(), 2);
  }

  #[test]
  fn test_toggle_like() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    db.create_user("liker", "Liker", "").unwrap();
    
    let post = db.create_post("author", "Test", "tsu", NO_CHANNEL, &[]).unwrap().post;
    let post_id = post.id;
    
    // Like — author earns +1 WB
    let liked = db.toggle_like(post_id, "liker").unwrap();
    assert!(liked.liked);
    assert_eq!(liked.author_earn.wb, 1);
    let author = db.get_user("author").unwrap().unwrap();
    assert_eq!(author.weix_bucks, 106);

    // Unlike
    let unliked = db.toggle_like(post_id, "liker").unwrap();
    assert!(!unliked.liked);

    // Like again
    let liked_again = db.toggle_like(post_id, "liker").unwrap();
    assert!(liked_again.liked);
  }

  #[test]
  fn test_create_reply() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    db.create_user("replier", "Replier", "").unwrap();
    
    let post = db.create_post("author", "Test", "tsu", NO_CHANNEL, &[]).unwrap().post;
    let post_id = post.id;
    
    let reply = db.create_reply(post_id, "replier", "Nice post!").unwrap().reply;
    
    assert_eq!(reply.post_id, post_id);
    assert_eq!(reply.author_handle, "replier");
    assert_eq!(reply.content, "Nice post!");
    
    // Check post reply count incremented
    let posts = db.list_posts(Some("tsu"), None, None, None).unwrap().posts;
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
    
    // Send WeixBucks (2% platform fee: 50 sent, 1 fee burned, 49 received)
    let (sender_new, receiver_new) = db.send_weixbucks("sender", "receiver", 50).unwrap();
    
    assert_eq!(sender_new, 50);
    assert_eq!(receiver_new, 149);
    
    // Check sender wallet
    let sender_txs = db.get_wallet_tx("sender").unwrap();
    assert_eq!(sender_txs.len(), 1);
    assert_eq!(sender_txs[0].tx_type, "spend");
    assert_eq!(sender_txs[0].amount, -50);
    
    // Check receiver wallet (net after 2% platform fee)
    let receiver_txs = db.get_wallet_tx("receiver").unwrap();
    assert_eq!(receiver_txs.len(), 1);
    assert_eq!(receiver_txs[0].tx_type, "earn");
    assert_eq!(receiver_txs[0].amount, 49);
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

  fn qualify_user_for_withdraw(db: &Database, handle: &str) {
    db.test_backdate_user_created_at(handle, 8).unwrap();
    // 4 feed posts → 12 post karma (min posts = 3, min karma = 10)
    for i in 0..4 {
      db.create_post(handle, &format!("Qualify post {i}"), "tsu", NO_CHANNEL, &[])
        .unwrap();
    }
    db.grant_weix_bucks(handle, 500, "test grant").unwrap();
    let user = db.get_user(handle).unwrap().unwrap();
    assert!(user.post_karma >= MIN_WITHDRAW_KARMA);
    assert!(user.post_karma >= MIN_WITHDRAW_POSTS * 3);
  }

  #[test]
  fn test_withdraw_eligibility_passes_when_qualified() {
    let db = setup_test_db();
    db.create_user("withdraw_ok", "Withdraw OK", "").unwrap();
    qualify_user_for_withdraw(&db, "withdraw_ok");

    let elig = db
      .evaluate_withdraw_eligibility("withdraw_ok", Some(MIN_WITHDRAW_WB))
      .unwrap();
    assert!(elig.eligible, "expected eligible: {:?}", elig.reasons);
    assert_eq!(elig.weekly_remaining_wb, WEEKLY_WITHDRAW_CAP_WB);
  }

  #[test]
  fn test_withdraw_eligibility_blocks_young_account() {
    let db = setup_test_db();
    db.create_user("young", "Young", "").unwrap();
    qualify_user_for_withdraw(&db, "young");
    db.test_backdate_user_created_at("young", 2).unwrap();

    let elig = db
      .evaluate_withdraw_eligibility("young", Some(MIN_WITHDRAW_WB))
      .unwrap();
    assert!(!elig.eligible);
    assert!(elig.reasons.iter().any(|r| r.contains("days old")));
  }

  #[test]
  fn test_withdraw_eligibility_blocks_insufficient_karma() {
    let db = setup_test_db();
    db.create_user("low_karma", "Low Karma", "").unwrap();
    db.test_backdate_user_created_at("low_karma", 8).unwrap();
    db.create_post("low_karma", "Only one", "tsu", NO_CHANNEL, &[]).unwrap();

    let elig = db
      .evaluate_withdraw_eligibility("low_karma", Some(MIN_WITHDRAW_WB))
      .unwrap();
    assert!(!elig.eligible);
    assert!(elig.total_karma < MIN_WITHDRAW_KARMA);
  }

  #[test]
  fn test_withdraw_eligibility_weekly_cap() {
    let db = setup_test_db();
    db.create_user("capped", "Capped", "").unwrap();
    qualify_user_for_withdraw(&db, "capped");
    db.test_set_weix_bucks("capped", 2000).unwrap();

    db.deduct_weix_bucks("capped", 600, "Withdrawn to Solana address: abc12345...")
      .unwrap();
    let elig = db
      .evaluate_withdraw_eligibility("capped", Some(500))
      .unwrap();
    assert!(!elig.eligible);
    assert_eq!(elig.weekly_remaining_wb, 400);
    assert!(elig.reasons.iter().any(|r| r.contains("weekly")));
  }

  #[test]
  fn test_platform_fee_on_tip() {
    let db = setup_test_db();
    db.create_user("tipper", "Tipper", "").unwrap();
    db.create_user("creator", "Creator", "").unwrap();
    let fee = calc_platform_fee(50, TIP_PLATFORM_FEE_BPS);
    assert_eq!(fee, 1);
    let (_, receiver_new) = db.send_weixbucks("tipper", "creator", 50).unwrap();
    assert_eq!(receiver_new, 100 + 50 - fee);
  }

  #[test]
  fn test_tokenomics_policy_published() {
    let policy = TokenomicsPolicy::published();
    assert_eq!(policy.model, "blkspace-published");
    assert_eq!(policy.uniform_model, "creator-marketplace");
    assert_eq!(policy.soft_currency_symbol, "WB");
    assert!(policy.marketplace_enabled);
    assert_eq!(policy.tip_fee_bps, TIP_PLATFORM_FEE_BPS);
    assert_eq!(policy.marketplace_fee_bps, MARKETPLACE_PLATFORM_FEE_BPS);
    assert!(!policy.wb_purchasable);
    assert!(policy.bkspc_tradable_after_counsel);
    assert!(!policy.on_chain_ready);
    assert_eq!(policy.bkspc_symbol, "BKSPC");
    assert_eq!(policy.bkspc_name, "BlkSpace Settlement");
    assert!(!policy.never_rules.is_empty());
  }

  #[test]
  fn test_economy_appeal_submit() {
    let db = setup_test_db();
    db.create_user("appealer", "Appealer", "").unwrap();
    let appeal = db
      .submit_economy_appeal("appealer", "earn_throttle", "I think MIDF score is wrong")
      .unwrap();
    assert_eq!(appeal.status, "pending");
    let list = db.list_economy_appeals("appealer", 10).unwrap();
    assert_eq!(list.len(), 1);
  }

  #[test]
  fn test_deduct_weix_bucks() {
    let db = setup_test_db();
    db.create_user("student", "Student", "").unwrap();
    
    // Initial balance should be 100
    let user = db.get_user("student").unwrap().unwrap();
    assert_eq!(user.weix_bucks, 100);
    
    // Deduct 50 WeixBucks
    let new_balance = db.deduct_weix_bucks("student", 50, "Withdrawn to Solana").unwrap();
    assert_eq!(new_balance, 50);
    
    // Check wallet transactions
    let txs = db.get_wallet_tx("student").unwrap();
    assert_eq!(txs.len(), 1);
    assert_eq!(txs[0].tx_type, "spend");
    assert_eq!(txs[0].amount, -50);
    assert_eq!(txs[0].description, "Withdrawn to Solana");
    
    // Try to deduct more than balance
    let result = db.deduct_weix_bucks("student", 100, "Should fail");
    assert!(result.is_err());
  }

  #[test]
  fn test_profile_customization_persistence() {
    let db = setup_test_db();
    db.create_user("demo_user", "Demo User", "").unwrap();
    let user = db
      .update_profile_customization("demo_user", 3, "abc123")
      .unwrap();
    assert_eq!(user.theme_id, 3);
    assert_eq!(user.music_hash, "abc123");

    let stored = db.get_user("demo_user").unwrap().unwrap();
    assert_eq!(stored.theme_id, 3);
    assert_eq!(stored.music_hash, "abc123");
  }

  #[test]
  fn test_nostr_signed_event_cache() {
    let db = setup_test_db();
    let json = r#"{"id":"abc","pubkey":"def"}"#;
    db.store_nostr_event_json("event123", json).unwrap();
    let got = db.get_nostr_event_json("event123").unwrap();
    assert_eq!(got.as_deref(), Some(json));
    assert!(db.get_nostr_event_json("missing").unwrap().is_none());
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
    
    db.create_post("author", "Test", "tsu", NO_CHANNEL, &[]).unwrap();
    
    let after_post = db.get_user("author").unwrap().unwrap();
    // Post creation should reward +5 WB * engagement_quality (1.0)
    assert_eq!(after_post.weix_bucks, 105);
  }

  #[test]
  fn test_reply_rewards() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    db.create_user("replier", "Replier", "").unwrap();
    
    let post = db.create_post("author", "Test", "tsu", NO_CHANNEL, &[]).unwrap().post;
    
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
    
    let post = db.create_post("author", "Test", "tsu", NO_CHANNEL, &[]).unwrap().post;
    
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
    
    let post = db.create_post("author", "Test", "tsu", NO_CHANNEL, &[]).unwrap().post;
    
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
      r#"[["t","tsu"]]"#,
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
      r#"[["t","tsu"]]"#,
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
    assert_eq!(stats.active_towns, 1); // create_user defaults town to "tsu"
    assert!(stats.weix_bucks_in_circulation > 0);
  }

  #[test]
  fn test_blob_operations() {
    let db = setup_test_db();
    db.create_user("uploader", "Uploader", "").unwrap();
    
    let (record, is_new) = db.insert_blob(
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      None,
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
      None,
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
      None,
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
    
    db.insert_blob(hash, None, "photo.jpg", "image/jpeg", 1024, "uploader").unwrap();
    
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

    {
      let conn = db.conn.lock().unwrap();
      conn.execute(
        "INSERT INTO notifications (user_handle, notification_type, from_handle, message) VALUES (?1, 'like', 'from', 'liked your post')",
        rusqlite::params!["user"],
      ).unwrap();
    }

    let notifications = db.get_notifications("user").unwrap();
    assert_eq!(notifications.len(), 1);
    assert_eq!(notifications[0].from_handle, "from");
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
  fn test_demo_seed_pubkeys_and_jane_nip65() {
    let temp_dir = std::env::temp_dir().join(format!("blkspace_seed_{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&temp_dir).unwrap();
    let db = Database::new(temp_dir).unwrap();
    db.ensure_seeded().unwrap();

    let jane = db.get_user("jane_doe").unwrap().expect("jane_doe seeded");
    assert_eq!(
      jane.pubkey,
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    );

    let relays = db.get_relay_list_from_tags(&jane.pubkey);
    assert!(relays.iter().any(|u| u.contains("relay.damus.io")));
    assert!(relays.iter().any(|u| u.contains("nos.lol")));
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
    
    db.create_post("author", "Post 1", "tsu", NO_CHANNEL, &[]).unwrap();
    db.create_post("author", "Post 2", "tsu", NO_CHANNEL, &[]).unwrap();
    db.create_post("author", "Post 3", "howard", NO_CHANNEL, &[]).unwrap();
    
    let trending = db.get_trending_feed(None).unwrap();
    assert_eq!(trending.len(), 3);
  }

  #[test]
  fn test_get_user_posts() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    
    db.create_post("author", "Post 1", "tsu", NO_CHANNEL, &[]).unwrap();
    db.create_post("author", "Post 2", "tsu", NO_CHANNEL, &[]).unwrap();
    
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
    
    let created = db.create_post("author", "Test", "tsu", NO_CHANNEL, &[]).unwrap().post;
    
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
    
    let post = db.create_post("author", "Test", "tsu", NO_CHANNEL, &[]).unwrap().post;
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
    
    let post = db.create_post("author", "Test", "tsu", NO_CHANNEL, &[]).unwrap().post;
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
    
    let post = db.create_post("author", "Test", "tsu", NO_CHANNEL, &[]).unwrap().post;
    
    db.update_post_nostr_meta(post.id, "nostr_event_123", "wss://relay.example.com").unwrap();
    
    let updated = db.get_post(post.id, None).unwrap().unwrap();
    assert_eq!(updated.nostr_event_id, "nostr_event_123");
    assert_eq!(updated.relay_url, "wss://relay.example.com");
  }

  #[test]
  fn test_combined_feed() {
    let db = setup_test_db();
    
    let now = chrono::Utc::now().timestamp();
    
    db.insert_relay_event("e1", "r1", 1, "pk", "Hello", r#"[["t","hbcu-town:tsu"]]"#, now).unwrap();
    db.insert_relay_event("e2", "r1", 1, "pk", "World", r#"[["t","hbcu-town:howard"]]"#, now - 1).unwrap();
    db.record_relay_consensus("e1", "r1", "hash_a").unwrap();
    db.record_relay_consensus("e1", "r2", "hash_a").unwrap();

    let combined = db.list_combined_feed(Some("tsu"), None).unwrap();
    assert_eq!(combined.len(), 1);
    assert_eq!(combined[0].town_tag, "tsu");
    assert!(combined[0].consensus_valid);
    assert!(combined[0].consensus_agreement > 0.0);
  }

  #[test]
  fn test_combined_feed_excludes_no_consensus() {
    let db = setup_test_db();
    let now = chrono::Utc::now().timestamp();

    db.insert_relay_event("solo", "r1", 1, "pk", "No consensus", r#"[["t","hbcu-town:tsu"]]"#, now).unwrap();
    db.record_relay_consensus("solo", "r1", "hash_only").unwrap();

    let combined = db.list_combined_feed(Some("tsu"), None).unwrap();
    assert!(combined.is_empty());
  }

  #[test]
  fn test_enrich_post_security() {
    let db = setup_test_db();
    db.create_user("risky", "Risky User", "").unwrap();
    db.create_post("risky", "Test post", "tsu", NO_CHANNEL, &[]).unwrap();

    {
      let conn = db.conn.lock().unwrap();
      conn.execute(
        "UPDATE users SET engagement_quality = 0.6 WHERE handle = 'risky'",
        [],
      ).unwrap();
      conn.execute(
        "INSERT INTO malicious_intent_scores (handle, overall_score, follower_velocity, network_centrality, content_similarity, temporal_pattern, self_interaction, updated_at)
         VALUES ('risky', 0.75, 0.0, 0.0, 0.0, 0.0, 0.0, datetime('now'))
         ON CONFLICT(handle) DO UPDATE SET overall_score = 0.75",
        [],
      ).unwrap();
    }

    let posts = db.list_posts(Some("tsu"), None, None, None).unwrap().posts;
    assert_eq!(posts.len(), 1);
    assert!((posts[0].engagement_quality - 0.6).abs() < f64::EPSILON);
    assert!((posts[0].malicious_score - 0.75).abs() < f64::EPSILON);
    assert_eq!(posts[0].risk_level, "high");
  }

  #[test]
  fn test_blob_with_cid() {
    let db = setup_test_db();
    db.create_user("demo_user", "Demo User", "").unwrap();

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
    db.create_user("demo_user", "Demo User", "").unwrap();

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
    db.create_user("demo_user", "Demo User", "").unwrap();

    // Create a post with media blobs
    db.create_post("demo_user", "Test post", "tsu", NO_CHANNEL, &[]).unwrap();
    
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
    db.create_user("demo_user", "Demo User", "").unwrap();

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

  // ─── Offline Queue Tests ─────────────────────────────

  #[test]
  fn test_offline_queue() {
    let db = setup_test_db();
    
    // Queue actions
    let id1 = db.queue_offline_action("create_post", "{\"content\":\"Test\"}", "demo_user").unwrap();
    let id2 = db.queue_offline_action("like_post", "{\"post_id\":1}", "demo_user").unwrap();
    
    // Get pending actions
    let pending = db.get_pending_offline_actions("demo_user").unwrap();
    assert_eq!(pending.len(), 2);
    assert_eq!(pending[0].0, id1);
    assert_eq!(pending[0].1, "create_post");
    assert_eq!(pending[1].1, "like_post");
    
    // Count pending
    let count = db.count_pending_offline_actions("demo_user").unwrap();
    assert_eq!(count, 2);
    
    // Mark one as synced
    db.mark_offline_action_synced(id1).unwrap();
    
    // Count again
    let count = db.count_pending_offline_actions("demo_user").unwrap();
    assert_eq!(count, 1);
    
    // Clear synced
    let cleared = db.clear_synced_offline_actions("demo_user").unwrap();
    assert_eq!(cleared, 1);
    
    // Count again
    let count = db.count_pending_offline_actions("demo_user").unwrap();
    assert_eq!(count, 1);
  }

  #[test]
  fn test_search_users_and_posts() {
    let db = setup_test_db();
    db.create_user("demo_user", "Demo User", "").unwrap();
    db.create_post("demo_user", "TSU homecoming vibes", "tsu", "", &[]).unwrap();

    let users = db.search_users("demo", 10).unwrap();
    assert!(!users.is_empty());
    assert!(users.iter().any(|u| u.handle == "demo_user"));

    let posts = db.search_posts("homecoming", 10, Some("demo_user")).unwrap();
    assert_eq!(posts.len(), 1);
    assert!(posts[0].content.contains("homecoming"));
  }

  #[test]
  fn test_search_communities() {
    let db = setup_test_db();
    let all = db.search_communities("");
    assert_eq!(all.len(), 5);

    let howard = db.search_communities("howard");
    assert_eq!(howard.len(), 1);
    assert_eq!(howard[0].id, "howard");
  }

  #[test]
  fn test_offline_flush_create_post() {
    let db = setup_test_db();
    db.create_user("demo_user", "Demo User", "").unwrap();
    let payload = r#"{"content":"Queued post","town_tag":"tsu","channel_id":"","media_hashes":[]}"#;
    let id = db.queue_offline_action("create_post", payload, "demo_user").unwrap();
    assert_eq!(db.count_pending_offline_actions("demo_user").unwrap(), 1);

    let post = db
      .create_post("demo_user", "Queued post", "tsu", "", &[])
      .unwrap()
      .post;
    assert!(post.content.contains("Queued"));
    db.mark_offline_action_synced(id).unwrap();
    assert_eq!(db.count_pending_offline_actions("demo_user").unwrap(), 0);
  }

  // ─── Device Sync Log Tests ──────────────────────────

  #[test]
  fn test_device_sync_log() {
    let db = setup_test_db();
    
    // Log sync events
    db.log_device_sync("device_1", "account_sync", 10, 1500, true).unwrap();
    db.log_device_sync("device_1", "media_sync", 5, 800, true).unwrap();
    db.log_device_sync("device_1", "account_sync", 0, 2000, false).unwrap();
    
    // Get history
    let history = db.get_device_sync_history("device_1").unwrap();
    assert_eq!(history.len(), 3);

    let failed = history.iter().find(|e| !e.3).expect("failed sync entry");
    assert_eq!(failed.0, "account_sync");
    assert_eq!(failed.1, 0);
    assert_eq!(failed.2, 2000);

    let media = history.iter().find(|e| e.0 == "media_sync").expect("media sync entry");
    assert_eq!(media.1, 5);
    assert!(media.3);
  }

  // ─── Cross-Device Data Retrieval Tests ───────────────

  #[test]
  fn test_get_user_account_data() {
    let db = setup_test_db();
    db.create_user("demo_user", "Demo User", "").unwrap();

    // Add user data
    db.create_post("demo_user", "Test post", "tsu", NO_CHANNEL, &[]).unwrap();
    db.create_post("demo_user", "Another post", "tsu", NO_CHANNEL, &[]).unwrap();
    
    // Get account data
    let data = db.get_user_account_data("demo_user").unwrap();
    
    // Verify structure
    assert!(data.get("user").is_some());
    assert!(data.get("posts").is_some());
    assert!(data.get("wallet_tx").is_some());
    
    // Verify posts
    let posts = data.get("posts").unwrap().as_array().unwrap();
    assert_eq!(posts.len(), 2);
    
    // Verify user
    let user = data.get("user").unwrap();
    assert_eq!(user.get("handle").unwrap().as_str().unwrap(), "demo_user");
  }

  // ─── Relay Consensus Tests ─────────────────────────────

  #[test]
  fn test_relay_consensus() {
    let db = setup_test_db();
    let event_id = "abc123";
    
    // Record consensus from multiple relays
    db.record_relay_consensus(event_id, "wss://relay1.com", "hash_a").unwrap();
    db.record_relay_consensus(event_id, "wss://relay2.com", "hash_a").unwrap();
    db.record_relay_consensus(event_id, "wss://relay3.com", "hash_a").unwrap();
    
    // Verify all recorded
    let consensus = db.get_relay_consensus(event_id).unwrap();
    assert_eq!(consensus.len(), 3);
    
    // Validate consensus (3 relays, all agree)
    assert!(db.validate_relay_consensus(event_id, 2).unwrap());
    assert!(db.validate_relay_consensus(event_id, 3).unwrap());
    
    // Get stats
    let (total, unique, agreement) = db.get_relay_consensus_stats(event_id).unwrap();
    assert_eq!(total, 3);
    assert_eq!(unique, 1);
    assert!(agreement > 0.99);
  }

  #[test]
  fn test_relay_consensus_disagreement() {
    let db = setup_test_db();
    let event_id = "def456";
    
    // Record conflicting consensus
    db.record_relay_consensus(event_id, "wss://relay1.com", "hash_a").unwrap();
    db.record_relay_consensus(event_id, "wss://relay2.com", "hash_b").unwrap();
    
    // Should fail validation because hashes disagree
    assert!(!db.validate_relay_consensus(event_id, 2).unwrap());
    
    // Stats should show disagreement
    let (total, unique, agreement) = db.get_relay_consensus_stats(event_id).unwrap();
    assert_eq!(total, 2);
    assert_eq!(unique, 2);
    assert!(agreement < 0.6);
  }

  #[test]
  fn test_relay_consensus_insufficient_relays() {
    let db = setup_test_db();
    let event_id = "ghi789";
    
    // Only one relay
    db.record_relay_consensus(event_id, "wss://relay1.com", "hash_a").unwrap();
    
    // Should fail with min_relays=2
    assert!(!db.validate_relay_consensus(event_id, 2).unwrap());
    
    // Should pass with min_relays=1
    assert!(db.validate_relay_consensus(event_id, 1).unwrap());
  }

  // ─── MIDF Graph Analysis Tests ─────────────────────────

  #[test]
  fn test_follower_graph() {
    let db = setup_test_db();
    
    // Create users and follows
    db.create_user("user_a", "User A", "").unwrap();
    db.create_user("user_b", "User B", "").unwrap();
    db.create_user("user_c", "User C", "").unwrap();
    
    db.toggle_follow("user_b", "user_a").unwrap();
    db.toggle_follow("user_c", "user_a").unwrap();
    
    // Get depth-1 graph
    let graph = db.get_follower_graph("user_a", 1).unwrap();
    assert_eq!(graph.len(), 2);
    assert!(graph.contains(&("user_b".to_string(), "user_a".to_string())));
    assert!(graph.contains(&("user_c".to_string(), "user_a".to_string())));
  }

  #[test]
  fn test_star_pattern_detection() {
    let db = setup_test_db();
    
    // Create a target user and many followers with few connections
    db.create_user("target", "Target", "").unwrap();
    for i in 0..10 {
      let follower = format!("bot_{}", i);
      db.create_user(&follower, &format!("Bot {}", i), "").unwrap();
      db.toggle_follow(&follower, "target").unwrap();
      // Bots don't follow anyone else
    }
    
    // Star pattern should be high
    let score = db.get_star_pattern_score("target").unwrap();
    assert!(score > 0.8, "Star pattern score should be high for bot farm, got {}", score);
    
    // Create a legitimate user with diverse followers
    db.create_user("legit", "Legit", "").unwrap();
    db.create_user("user_a", "User A", "").unwrap();
    for i in 0..5 {
      let follower = format!("user_{}", i);
      db.create_user(&follower, &format!("User {}", i), "").unwrap();
      db.toggle_follow(&follower, "legit").unwrap();
      // Legit users follow multiple people
      db.toggle_follow(&follower, "target").unwrap();
      db.toggle_follow(&follower, "user_a").unwrap();
      // Give each follower inbound follows so they don't look like bot leaves
      for j in 0..3 {
        let fan = format!("fan_{}_{}", i, j);
        db.create_user(&fan, &fan, "").unwrap();
        db.toggle_follow(&fan, &follower).unwrap();
      }
    }
    
    let legit_score = db.get_star_pattern_score("legit").unwrap();
    assert!(legit_score < 0.5, "Legit user should have low star pattern score, got {}", legit_score);
  }

  #[test]
  fn test_network_centrality() {
    let db = setup_test_db();
    
    db.create_user("center", "Center", "").unwrap();
    db.create_user("periph1", "Periph 1", "").unwrap();
    db.create_user("periph2", "Periph 2", "").unwrap();
    
    db.toggle_follow("periph1", "center").unwrap();
    db.toggle_follow("periph2", "center").unwrap();
    db.toggle_follow("center", "periph1").unwrap();
    
    let centrality = db.get_network_centrality("center").unwrap();
    assert!(centrality > 0.0, "Center user should have some centrality");
    
    let isolated = db.get_network_centrality("periph2").unwrap();
    assert!(isolated < centrality, "Periph2 should be less central than center");
  }

  #[test]
  fn test_follower_velocity() {
    let db = setup_test_db();
    
    db.create_user("viral", "Viral", "").unwrap();
    
    // Old followers (more than 7 days ago)
    // In test DB, we can't easily set timestamps, so this test is basic
    let velocity = db.get_follower_velocity("viral").unwrap();
    assert_eq!(velocity, 0.0); // No followers yet
    
    // Add some followers
    for i in 0..5 {
      let follower = format!("f_{}", i);
      db.create_user(&follower, &follower, "").unwrap();
      db.toggle_follow(&follower, "viral").unwrap();
    }
    
    let velocity2 = db.get_follower_velocity("viral").unwrap();
    // All followers are recent (within 7 days since test DB uses current time)
    assert!(velocity2 > 0.0);
  }

  #[test]
  fn test_self_interaction_detection() {
    let db = setup_test_db();
    
    db.create_user("self_lover", "Self Lover", "").unwrap();
    db.create_user("other", "Other", "").unwrap();
    
    // Create a post
    let post = db.create_post("self_lover", "Test", "tsu", NO_CHANNEL, &[]).unwrap().post;
    
    // Self-like
    db.toggle_like(post.id, "self_lover").unwrap();
    
    // Other user also likes
    db.toggle_like(post.id, "other").unwrap();
    
    let score = db.get_self_interaction_score("self_lover").unwrap();
    assert!(score > 0.0, "Should detect self-like");
    assert!(score < 1.0, "Not all interactions are self-interactions");
    
    // Self-reply
    db.create_reply(post.id, "self_lover", "Reply").unwrap();
    
    let score2 = db.get_self_interaction_score("self_lover").unwrap();
    assert!(score2 > score, "Self-reply should increase score");
  }

  #[test]
  fn test_content_similarity() {
    let db = setup_test_db();
    
    db.create_user("spammer", "Spammer", "").unwrap();
    
    // Unique posts
    db.create_post("spammer", "Post one", "tsu", NO_CHANNEL, &[]).unwrap();
    db.create_post("spammer", "Post two", "tsu", NO_CHANNEL, &[]).unwrap();
    
    let score = db.get_content_similarity_score("spammer").unwrap();
    assert_eq!(score, 0.0, "Different posts should have zero similarity");
    
    // Duplicate posts
    db.create_post("spammer", "Spam message here", "tsu", NO_CHANNEL, &[]).unwrap();
    db.create_post("spammer", "Spam message here", "tsu", NO_CHANNEL, &[]).unwrap();
    db.create_post("spammer", "Spam message here", "tsu", NO_CHANNEL, &[]).unwrap();
    
    let score2 = db.get_content_similarity_score("spammer").unwrap();
    assert!(score2 > 0.0, "Duplicate posts should have positive similarity");
  }

  #[test]
  fn test_temporal_pattern() {
    let db = setup_test_db();
    
    db.create_user("bot", "Bot", "").unwrap();
    
    // Normal posting: 1 post
    db.create_post("bot", "Normal", "tsu", NO_CHANNEL, &[]).unwrap();
    
    let score = db.get_temporal_pattern_score("bot").unwrap();
    assert_eq!(score, 0.0, "Single post should have zero temporal pattern score");
    
    // In test DB, we can't easily simulate burst posting with timestamps
    // The test verifies the basic structure works
  }

  #[test]
  fn test_malicious_intent_vector() {
    let db = setup_test_db();
    
    db.create_user("suspicious", "Suspicious", "").unwrap();
    
    // Calculate vector
    let vector = db.calculate_malicious_intent_vector("suspicious").unwrap();
    
    // Verify structure
    assert!(vector.get("overallScore").is_some());
    assert!(vector.get("dimensions").is_some());
    assert!(vector.get("riskLevel").is_some());
    
    // Verify stored scores
    let stored = db.get_malicious_intent_scores("suspicious").unwrap();
    assert!(stored.is_some());
    let stored = stored.unwrap();
    assert!(stored.get("overallScore").is_some());
  }

  // ─── Relay Events with Consensus Tests ─────────────────

  #[test]
  fn test_list_relay_events_with_consensus() {
    let db = setup_test_db();
    
    // Insert relay events
    db.insert_relay_event("event1", "wss://relay1.com", 1, "pubkey1", "content1", "[]", 1000).unwrap();
    db.insert_relay_event("event2", "wss://relay2.com", 1, "pubkey2", "content2", "[]", 2000).unwrap();
    
    // Record consensus for event1 (multiple relays agree)
    let hash1 = format!("{:x}", Sha256::digest(b"content1"));
    db.record_relay_consensus("event1", "wss://relay1.com", &hash1).unwrap();
    db.record_relay_consensus("event1", "wss://relay3.com", &hash1).unwrap();
    
    // Record consensus for event2 (single relay)
    let hash2 = format!("{:x}", Sha256::digest(b"content2"));
    db.record_relay_consensus("event2", "wss://relay2.com", &hash2).unwrap();
    
    // List events with consensus, require min 2 relays
    let events = db.list_relay_events_with_consensus(10, None, 2).unwrap();
    assert_eq!(events.len(), 2);
    
    // Check consensus for event1 (should be valid)
    let event1 = events.iter().find(|e| e.get("eventId").unwrap().as_str().unwrap() == "event1").unwrap();
    let consensus1 = event1.get("consensus").unwrap();
    assert!(consensus1.get("consensusValid").unwrap().as_bool().unwrap());
    assert_eq!(consensus1.get("totalSightings").unwrap().as_i64().unwrap(), 2);
    
    // Check consensus for event2 (should be invalid)
    let event2 = events.iter().find(|e| e.get("eventId").unwrap().as_str().unwrap() == "event2").unwrap();
    let consensus2 = event2.get("consensus").unwrap();
    assert!(!consensus2.get("consensusValid").unwrap().as_bool().unwrap());
    assert_eq!(consensus2.get("totalSightings").unwrap().as_i64().unwrap(), 1);
  }

  // ─── Phase 1 desktop E2E (DB persistence flow) ─────────

  #[test]
  fn test_phase1_desktop_e2e_flow() {
    let temp_dir = std::env::temp_dir().join(format!("blkspace_e2e_{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&temp_dir).unwrap();

    let post_id;
    {
      let db = Database::new_for_test(temp_dir.clone()).unwrap();

      // Signup
      let newbie = db
        .create_user("yard_walker", "Yard Walker", "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890")
        .unwrap();
      assert_eq!(newbie.handle, "yard_walker");
      assert_eq!(newbie.weix_bucks, 100);

      db.create_user("campus_queen", "Campus Queen", "").unwrap();

      // Post
      let post = db
        .create_post("yard_walker", "First post on the yard!", "tsu", NO_CHANNEL, &[])
        .unwrap()
        .post;
      post_id = post.id;
      assert_eq!(post.author_handle, "yard_walker");

      // Follow
      assert!(db.toggle_follow("campus_queen", "yard_walker").unwrap());
      let following = db.get_following_for("campus_queen").unwrap();
      assert_eq!(following, vec!["yard_walker".to_string()]);

      // Like
      assert!(db.toggle_like(post_id, "campus_queen").unwrap().liked);

      // Wallet transfer (author earned +5 post / +1 like rewards before sending)
      let (sender_balance, receiver_balance) =
        db.send_weixbucks("yard_walker", "campus_queen", 25).unwrap();
      assert_eq!(sender_balance, 81);
      assert_eq!(receiver_balance, 125);
    }

    // Simulate app restart — reopen the same on-disk DB
    let db = Database::new_for_test(temp_dir).unwrap();

    let user = db.get_user("yard_walker").unwrap().unwrap();
    assert_eq!(user.weix_bucks, 81);

    let queen = db.get_user("campus_queen").unwrap().unwrap();
    assert_eq!(queen.weix_bucks, 125);

    let posts = db
      .list_posts(Some("tsu"), Some("campus_queen"), None, None)
      .unwrap()
      .posts;
    assert_eq!(posts.len(), 1);
    assert_eq!(posts[0].id, post_id);
    assert_eq!(posts[0].likes_count, 1);

    let following = db.get_following_for("campus_queen").unwrap();
    assert!(following.contains(&"yard_walker".to_string()));

    let wallet = db.get_wallet_tx("yard_walker").unwrap();
    assert!(wallet.iter().any(|tx| tx.tx_type == "spend" && tx.amount == -25));
  }

  #[test]
  fn test_daily_wb_earn_cap() {
    let db = setup_test_db();
    db.create_user("capper", "Capper", "").unwrap();
    let first = db.grant_weix_bucks("capper", 200, "Test earn").unwrap();
    assert_eq!(first, 200);
    let second = db.grant_weix_bucks("capper", 100, "Test earn 2").unwrap();
    assert_eq!(second, 50);
    let third = db.grant_weix_bucks("capper", 5, "Test earn 3").unwrap();
    assert_eq!(third, 0);
    assert_eq!(db.daily_wb_earned("capper").unwrap(), DAILY_WB_EARN_CAP);
  }

  #[test]
  fn test_create_repost() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    db.create_user("fan", "Fan", "").unwrap();
    let post = db.create_post("author", "Original", "tsu", NO_CHANNEL, &[]).unwrap().post;
    let r1 = db.create_repost("fan", post.id).unwrap();
    assert!(r1.reposted);
    assert_eq!(r1.reposts_count, 1);
    let r2 = db.create_repost("fan", post.id).unwrap();
    assert!(!r2.reposted);
    assert_eq!(r2.reposts_count, 1);
  }

  #[test]
  fn test_self_reply_no_reward() {
    let db = setup_test_db();
    db.create_user("author", "Author", "").unwrap();
    let post = db.create_post("author", "Solo thread", "tsu", NO_CHANNEL, &[]).unwrap().post;
    let before = db.get_user("author").unwrap().unwrap().weix_bucks;
    let result = db.create_reply(post.id, "author", "Talking to myself").unwrap();
    let after = db.get_user("author").unwrap().unwrap().weix_bucks;
    assert_eq!(after, before);
    assert_eq!(result.earn.wb, 0);
    assert_eq!(result.earn.karma_comment, 0);
  }

  #[test]
  fn test_validate_relay_event_tags() {
    let db = setup_test_db();
    let good = r#"[["t","hbcu-town:tsu"],["t","blkspace"]]"#;
    let bad_plain = r#"[["t","tsu"]]"#;
    let foreign = r#"[["t","hbcu-town:howard"]]"#;
    assert!(db.validate_relay_event_tags(1, good, Some("tsu")));
    assert!(!db.validate_relay_event_tags(1, bad_plain, Some("tsu")));
    assert!(!db.validate_relay_event_tags(1, foreign, Some("tsu")));
    assert!(db.validate_relay_event_tags(10002, bad_plain, Some("tsu")));
  }

  #[test]
  fn test_earn_result_daily_cap_flag() {
    let db = setup_test_db();
    db.create_user("capper2", "Capper2", "").unwrap();
    db.grant_weix_bucks("capper2", 248, "Fill").unwrap();
    let result = db.create_post("capper2", "Near cap", "tsu", NO_CHANNEL, &[]).unwrap();
    assert_eq!(result.earn.wb, 2);
    assert_eq!(result.earn.wb_nominal, 5);
    assert!(result.earn.daily_cap_limited);
  }

  #[test]
  fn test_karma_throttled_when_midf_high() {
    let db = setup_test_db();
    db.create_user("risky", "Risky", "").unwrap();
    db.conn.lock().unwrap().execute(
      "INSERT INTO malicious_intent_scores (handle, overall_score) VALUES ('risky', 0.85)",
      [],
    ).unwrap();
    db.grant_karma("risky", "tsu", 5, 2, "Test").unwrap();
    let user = db.get_user("risky").unwrap().unwrap();
    assert_eq!(user.post_karma, 0);
    assert_eq!(user.comment_karma, 0);
  }

  #[tokio::test]
  async fn test_validate_incoming_event_rejects_tampered_id() {
    use crate::validate_incoming_event;
    use nostr_sdk::prelude::{EventBuilder, Keys};

    let keys = Keys::generate();
    let event = EventBuilder::text_note("BlkSpace security test")
      .sign(&keys)
      .await
      .expect("sign event");
    let mut json: serde_json::Value =
      serde_json::from_str(&serde_json::to_string(&event).unwrap()).unwrap();
    json["id"] = serde_json::Value::String("f".repeat(64));
    let tampered = serde_json::to_string(&json).unwrap();
    assert!(validate_incoming_event(&tampered).is_err());
  }

  #[tokio::test]
  async fn test_validate_incoming_event_accepts_valid_note() {
    use crate::validate_incoming_event;
    use nostr_sdk::prelude::{EventBuilder, Keys};

    let keys = Keys::generate();
    let event = EventBuilder::text_note("BlkSpace security test valid")
      .sign(&keys)
      .await
      .expect("sign event");
    let json = serde_json::to_string(&event).unwrap();
    assert!(validate_incoming_event(&json).unwrap());
  }

  #[test]
  fn test_tier0_benchmark_feed_post_blob_targets() {
    use crate::blob_store::BlobStore;
    use crate::tier0_benchmark::run_tier0_benchmarks;

    let temp_dir = std::env::temp_dir().join(format!("blkspace_tier0_{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&temp_dir).unwrap();
    let db = Database::new_for_test(temp_dir.clone()).unwrap();
    let blob_store = BlobStore::new(&temp_dir);

    let report = run_tier0_benchmarks(&db, &blob_store);
    assert_eq!(report.metrics.len(), 3);
    assert!(report.metrics.iter().any(|m| m.name.contains("Feed load")));
    assert!(report.metrics.iter().any(|m| m.name.contains("Post creation")));
    assert!(report.metrics.iter().any(|m| m.name.contains("Blob store")));
    for metric in &report.metrics {
      assert!(
        metric.pass,
        "{} took {}ms (target <{}ms)",
        metric.name,
        metric.duration_ms,
        metric.target_ms
      );
    }
    assert!(report.all_pass);
  }

  #[test]
  fn test_yard_events_create_and_rsvp() {
    let db = setup_test_db();
    db.create_user("host_user", "Host User", "").unwrap();
    db.create_user("guest_user", "Guest User", "").unwrap();
    db.join_yard("host_user", "tsu").unwrap();
    db.join_yard("guest_user", "tsu").unwrap();

    let event = db
      .create_yard_event(
        "tsu",
        "host_user",
        "Study Hall",
        "Bring laptops",
        "Library",
        "2026-07-01T18:00:00Z",
        None,
      )
      .unwrap();
    assert_eq!(event.title, "Study Hall");
    assert_eq!(event.rsvp_count, 0);

    let listed = db.list_yard_events("tsu", Some("guest_user")).unwrap();
    assert!(listed.iter().any(|e| e.id == event.id));

    let wb_before_rsvp = db.get_user("guest_user").unwrap().unwrap().weix_bucks;

    let rsvp = db.rsvp_yard_event("guest_user", event.id, "going").unwrap();
    assert!(rsvp.rsvped);
    assert_eq!(rsvp.status, "going");
    assert_eq!(rsvp.earn.wb, 2);

    let listed_after = db.list_yard_events("tsu", Some("guest_user")).unwrap();
    let updated = listed_after.iter().find(|e| e.id == event.id).unwrap();
    assert_eq!(updated.rsvp_count, 1);
    assert_eq!(updated.user_rsvp.as_deref(), Some("going"));

    let guest = db.get_user("guest_user").unwrap().unwrap();
    assert_eq!(guest.weix_bucks, wb_before_rsvp + 2);
  }

  #[test]
  fn test_yard_event_requires_membership() {
    let db = setup_test_db();
    db.create_user("outsider", "Outsider", "").unwrap();
    let err = db
      .create_yard_event(
        "tsu",
        "outsider",
        "Blocked Event",
        "",
        "",
        "2026-07-01T18:00:00Z",
        None,
      )
      .unwrap_err();
    assert!(err.to_string().contains("Join the yard"));
  }

  // ─── Role authorization ─────────────────────────────────

  use crate::{authorize_set_community_role, authorize_set_node_role};

  #[test]
  fn test_node_role_self_service_allowed() {
    let db = setup_test_db();
    db.create_user("alice", "Alice", "").unwrap();
    assert!(authorize_set_node_role(&db, "alice", "alice", "relay").is_ok());
    db.set_node_role("alice", "relay").unwrap();
    assert_eq!(db.get_node_role("alice").unwrap(), "relay");
  }

  #[test]
  fn test_node_role_other_user_denied_for_non_admin() {
    let db = setup_test_db();
    db.create_user("alice", "Alice", "").unwrap();
    db.create_user("bob", "Bob", "").unwrap();
    let err = authorize_set_node_role(&db, "alice", "bob", "relay").unwrap_err();
    assert!(err.contains("platform admins"));
  }

  #[test]
  fn test_node_role_other_user_allowed_for_admin() {
    let db = setup_test_db();
    db.create_user("admin", "Admin", "").unwrap();
    db.create_user("bob", "Bob", "").unwrap();
    db.set_node_role("admin", "admin").unwrap();
    assert!(authorize_set_node_role(&db, "admin", "bob", "relay").is_ok());
  }

  #[test]
  fn test_node_role_self_assign_admin_denied() {
    let db = setup_test_db();
    db.create_user("alice", "Alice", "").unwrap();
    let err = authorize_set_node_role(&db, "alice", "alice", "admin").unwrap_err();
    assert!(err.contains("self-assign"));
  }

  #[test]
  fn test_community_role_student_cannot_assign() {
    let db = setup_test_db();
    db.create_user("alice", "Alice", "").unwrap();
    db.create_user("bob", "Bob", "").unwrap();
    db.join_yard("alice", "tsu").unwrap();
    db.join_yard("bob", "tsu").unwrap();
    let err = authorize_set_community_role(&db, "alice", "tsu", "bob", "Yard Mod").unwrap_err();
    assert!(err.contains("owners and moderators"));
  }

  #[test]
  fn test_community_role_bootstrap_owner() {
    let db = setup_test_db();
    db.create_user("alice", "Alice", "").unwrap();
    db.join_yard("alice", "tsu").unwrap();
    assert!(authorize_set_community_role(&db, "alice", "tsu", "alice", "Admin").is_ok());
  }

  #[test]
  fn test_community_role_owner_can_assign() {
    let db = setup_test_db();
    db.create_user("owner", "Owner", "").unwrap();
    db.create_user("bob", "Bob", "").unwrap();
    db.join_yard("owner", "tsu").unwrap();
    db.join_yard("bob", "tsu").unwrap();
    db.set_community_role("tsu", "owner", "Admin").unwrap();
    assert!(authorize_set_community_role(&db, "owner", "tsu", "bob", "Yard Mod").is_ok());
  }

  #[test]
  fn test_community_role_moderator_cannot_assign_admin() {
    let db = setup_test_db();
    db.create_user("owner", "Owner", "").unwrap();
    db.create_user("mod_user", "Mod", "").unwrap();
    db.create_user("bob", "Bob", "").unwrap();
    db.join_yard("owner", "tsu").unwrap();
    db.join_yard("mod_user", "tsu").unwrap();
    db.join_yard("bob", "tsu").unwrap();
    db.set_community_role("tsu", "owner", "Admin").unwrap();
    db.set_community_role("tsu", "mod_user", "Yard Mod").unwrap();
    let err =
      authorize_set_community_role(&db, "mod_user", "tsu", "bob", "Admin").unwrap_err();
    assert!(err.contains("yard owners"));
  }

  #[test]
  fn test_community_role_moderator_cannot_change_owner() {
    let db = setup_test_db();
    db.create_user("owner", "Owner", "").unwrap();
    db.create_user("mod_user", "Mod", "").unwrap();
    db.join_yard("owner", "tsu").unwrap();
    db.join_yard("mod_user", "tsu").unwrap();
    db.set_community_role("tsu", "owner", "Admin").unwrap();
    db.set_community_role("tsu", "mod_user", "Yard Mod").unwrap();
    let err =
      authorize_set_community_role(&db, "mod_user", "tsu", "owner", "Student").unwrap_err();
    assert!(err.contains("Moderators cannot change an owner"));
  }

  #[test]
  fn test_bkspc_marketplace_purchase_credits_seller() {
    let db = setup_test_db();
    db.create_user("seller", "Seller", "").unwrap();
    db.create_user("buyer", "Buyer", "").unwrap();
    let listing_id = db
      .create_marketplace_listing("seller", "mix", Some("cid123"), 100, "Test Mix", None, true)
      .unwrap();
    let result = db
      .buy_marketplace_listing_bkspc(listing_id, "buyer", "burnTxSig123")
      .unwrap()
      .expect("listing sold");
    assert_eq!(result["paymentMethod"], "bkspc_burn");
    let seller = db.get_user("seller").unwrap().unwrap();
    // 100 WB price - 5% fee = 95 WB net
    assert_eq!(seller.weix_bucks, 100 + 95);
    let buyer = db.get_user("buyer").unwrap().unwrap();
    assert_eq!(buyer.weix_bucks, 100);
  }

  #[test]
  fn test_record_nft_mint() {
    let db = setup_test_db();
    db.create_user("creator", "Creator", "").unwrap();
    let id = db
      .record_nft_mint(
        "creator",
        "MintAddr123",
        Some("MetaAddr"),
        "mix",
        Some("cid456"),
        "My Mix",
        "txSig789",
        Some("blkspace://nft/mix/cid456"),
      )
      .unwrap();
    assert!(id > 0);
    db.set_listing_nft_mint(1, "MintAddr123").ok();
  }
}