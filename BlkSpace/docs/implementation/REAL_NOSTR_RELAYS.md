# Implementation Plan: Connect to Real Nostr Relays

**Status:** Draft — Ready for implementation  
**Priority:** High (blocks cross-town sync)  
**Estimated Time:** 2-3 days  
**Dependencies:** None (relay manager already implemented)

---

## Overview

Currently, BlkSpace uses mock relays with hardcoded data. This plan implements connection to real public Nostr relays for:
1. Publishing user posts/events to the global Nostr network
2. Subscribing to town-specific events from other users
3. Syncing cross-town content via relay mesh

---

## Current State

**Working:**
- `relay_manager.rs` — Nostr SDK integration, event publishing, subscription
- `connect_to_relay` Tauri command — WebSocket connection
- `sync_town_events` — Fetch recent events from connected relays
- Background sync task — Polls every 60s

**Gaps:**
- No real relay URLs configured (only hardcoded mock data)
- No relay discovery (NIP-65)
- No event validation before storing
- No relay health monitoring

---

## Phase 1: Public Relay Connection (Day 1)

### 1.1 Add Public Relay URLs

Add 3-5 public relays to the default configuration:

```rust
const DEFAULT_RELAYS: &[&str] = &[
    "wss://relay.damus.io",
    "wss://relay.nostr.band",
    "wss://nos.lol",
    "wss://relay.snort.social",
    "wss://nostr.wine",
];
```

**Location:** `src-tauri/src/lib.rs` (AppState initialization)

### 1.2 Relay Health Check

Implement `check_relay_health` command:
- Send PING to relay
- Measure response time
- Track uptime percentage
- Mark degraded relays

**Code:**
```rust
#[tauri::command]
fn check_relay_health(state: State<AppState>, url: String) -> Result<String, String> {
    let manager = state.relay_manager.lock().unwrap();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        manager.add_relay(&url).await?;
        manager.connect_relay(&url).await?;
        Ok(format!("Connected to {}", url))
    })
}
```

### 1.3 Update UI

Add to `relays.tsx` page:
- "Connect to Public Relay" button
- Show connection status (online/offline)
- Display latency
- Town tag selector

---

## Phase 2: Event Validation (Day 1-2)

### 2.1 Signature Verification on Receive

Before storing any relay event:
1. Verify Schnorr signature
2. Check timestamp (not too old, not future)
3. Validate event structure

**Code:**
```rust
fn validate_incoming_event(event_json: &str) -> Result<bool, String> {
    let event: serde_json::Value = serde_json::from_str(event_json)
        .map_err(|_| "Invalid JSON")?;
    
    // Verify signature
    let verified = verify_nostr_auth_event(event_json, "received")?;
    
    // Check timestamp
    let created_at = event["created_at"].as_i64()
        .ok_or("Missing timestamp")?;
    let now = chrono::Utc::now().timestamp();
    if (now - created_at).abs() > 86400 {
        return Err("Event too old or from future".to_string());
    }
    
    Ok(true)
}
```

### 2.2 Town Tag Filtering

Enforce `t:hbcu-town:<town>` tag:
- Reject events without town tag (unless explicitly followed)
- Store town tag in `relay_events` table
- Query by town for feed construction

---

## Phase 3: NIP-65 Relay List (Day 2)

### 3.1 Publish User's Relay List

When user connects to relays:
- Publish kind 10002 event (NIP-65)
- Contains relay URLs with read/write flags
- Signed with user's key

**Already implemented:** `publish_relay_list` command

### 3.2 Fetch Other Users' Relay Lists

When viewing a user's profile:
- Fetch their kind 10002 event
- Connect to their preferred relays
- Sync their content

**Already implemented:** `fetch_user_relay_list` command

### 3.3 UI Integration

- Profile page: show "Active Relays" section
- Settings: "My Relay List" management
- Discovery: "Find Users on Other Relays"

---

## Phase 4: Cross-Town Sync (Day 2-3)

### 4.1 Subscription Management

When user follows someone from another town:
- Subscribe to their pubkey on connected relays
- Filter by town tag if known
- Store events in `relay_events` table

### 4.2 Trending Gossip

Implement kind 1030 (custom) for trending summaries:
- Town relays publish weekly summaries
- Top posts, new users, engagement stats
- Other towns subscribe to summaries

**Code:**
```rust
#[tauri::command]
fn publish_trending_summary(state: State<AppState>, session_token: String) -> Result<String, String> {
    let handle = get_handle_from_session(&state, &session_token)?;
    let stats = state.db.get_network_stats()?;
    
    let summary = serde_json::json!({
        "town": "tsu",
        "week": "2026-06-15",
        "top_posts": [/* ... */],
        "new_users": stats.total_users,
        "total_events": stats.events_last_24h,
    });
    
    // Publish as kind 1030
    let (client, keys) = {
        let m = state.relay_manager.lock().unwrap();
        (m.client_clone(), m.keys_clone())
    };
    
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let event = EventBuilder::new(Kind::Custom(1030), summary.to_string())
            .tag(Tag::parse(vec!["t", "hbcu-town:tsu"]).ok())
            .sign(&keys)
            .await?;
        client.send_event(event).await?;
        Ok("Published trending summary")
    })
}
```

### 4.3 UI: Cross-Town Feed

- Combined feed from subscribed towns
- Town selector (TSU, Howard, FAMU, etc.)
- Badge showing "Trending in [Town]"

---

## Testing Plan

### Unit Tests
- `connect_to_relay` — Test with real relay URL
- `validate_incoming_event` — Test signature verification, timestamp checks
- `sync_town_events` — Test event storage, deduplication

### Integration Tests
- End-to-end: Connect to relay → publish post → verify on relay
- Cross-town: TSU user posts → Howard user sees it
- Relay health: Connect → disconnect → reconnect

### Manual Testing
1. Connect to `wss://relay.damus.io`
2. Publish a test post
3. View on damus.io web client
4. Follow a user from another town
5. Verify their posts appear in your feed

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Public relay censors content | Maintain multiple relays; fallback to town relays |
| Relay goes offline | Health checks; auto-reconnect; multiple relays |
| Event spam | Rate limiting; town tag filtering; engagement quality |
| Privacy leak | Town tags only; no geolocation; opt-in public relays |
| Signature verification cost | Batch verification; cache verified events |

---

## Files to Modify

1. `src-tauri/src/lib.rs` — Add relay commands, validation
2. `src-tauri/src/relay_manager.rs` — Add health checks, reconnection
3. `src/pages/relays.tsx` — UI for relay management
4. `src/pages/feed.tsx` — Show cross-town content
5. `src/hooks/use-app-data.ts` — Add relay hooks

---

## Success Criteria

- [ ] Can connect to ≥3 public relays
- [ ] Posts published to Nostr network visible on other clients
- [ ] Can view posts from other towns via relay sync
- [ ] Relay health visible in UI
- [ ] NIP-65 relay lists published and fetched

---

*Next: After relay connection works, proceed to device mesh testing.*
