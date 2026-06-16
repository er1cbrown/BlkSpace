# Implementation Plan: Iroh Integration

**Status:** ✅ CORE COMPLETE (feature-gated): Iroh 0.35 fs-store compiles with socket2 pin + API updates for Store/import_bytes/data_reader; basic media CIDs (real blake3 CIDs from iroh-blobs + cid column populated on upload, preferred on get_blob_bytes fetch) + pinning/sync scaffolding work. Full p2p node/replication still behind `cargo tauri dev --features iroh` (mac netwatch issues possible at runtime).  
**Priority:** High (replaces local blob storage)  
**Estimated Time:** 3-5 days  
**Dependencies:** Device mesh testing (proves multi-device viability)

---

## Implementation Status

### ✅ Phase 1: Iroh Setup (COMPLETED)
- **iroh-blobs 0.35** added to `Cargo.toml` with `fs-store` feature
- **IrohNode** wrapper created in `src-tauri/src/iroh_node.rs`
- **AppState** updated to include optional `IrohNode` with graceful fallback
- **Initialization** in `run()` function with proper error handling

### ✅ Phase 2: Content Addressing (COMPLETED)
- **Database migration** — `cid` column added to `blobs` table
- **BlobRecord** updated with optional `cid` field
- **upload_blob** — stores in both local blob store AND Iroh (returns CID when available)
- **get_blob_bytes** — tries Iroh first, falls back to local storage
- **TypeScript types** — `TauriBlobInfo` includes optional `cid` field
- **Tests** — `test_blob_with_cid` and `test_blob_without_cid` in `tests.rs`

### ✅ Phase 3: Pinning & Persistence (COMPLETED)
- **Database** — `blob_pins` table with access_count and last_accessed
- **pin_content** command — pins blob locally with Iroh fallback
- **should_pin_content** — threshold-based pinning (10 accesses)
- **list_pinned_content** — shows user's pinned blobs
- **Pin serve tracking** — records who served what to whom

### ✅ Phase 4: Node Rewards (COMPLETED)
- **report_pin_serve** — 0.1 WB per serve, daily cap of 100 serves (10 WB max)
- **claim_node_rewards** — calculates daily rewards from serve count
- **Node role** — `node_role` column in users table (relay, pinner, etc.)
- **Relay uptime** — `relay_uptime_hours` tracked for bonus rewards

### ✅ Phase 5: Cross-Device Sync & Offline Cache (COMPLETED)
- **sync_account_content** — fetches all CIDs from user's posts via Iroh
- **add_to_offline_cache** — pre-fetches content for offline access
- **remove_from_offline_cache** — manages cache size
- **list_offline_cache** — shows cached content
- **prefetch_content** — bulk fetch from Iroh for followed users
- **Database** — `offline_cache` table with content_type and source

## Overview

Replace local blob storage with Iroh for decentralized content storage:
1. **Upload** media → Iroh → get CID (Content Identifier)
2. **Store** CID in Nostr event metadata
3. **Fetch** content via Iroh from any node that has it
4. **Pin** content on town relays for persistence

---

## Why Iroh (Not IPFS, Not S3)

| Option | Why Not | Why Iroh Wins |
|--------|---------|--------------|
| **Local FS** | Device-dependent, not shareable | Iroh is device-independent |
| **IPFS** | Go implementation, heavy | Iroh is Rust, lightweight, modern |
| **S3** | Centralized, expensive | Iroh is peer-to-peer, free |
| **LBRY** | Defunct protocol, no future | Iroh is actively maintained |
| **WebTorrent** | Browser only, no desktop | Iroh works everywhere |

---

## Current State

**Working:**
- `blob_store.rs` — Local SHA256-based file storage
- `upload_blob` command — Accepts base64, stores file, returns hash
- `get_blob_bytes` command — Returns file as base64

**Gaps:**
- Files stored on single device only
- No sharing between devices
- No redundancy (device dies = content lost)
- No deduplication across users

---

## Phase 1: Iroh Setup (Day 1)

### 1.1 Add Iroh Dependency

```toml
# Cargo.toml
[dependencies]
# ... existing deps ...
# iroh = "0.29" # When available, or use iroh-base
```

**Note:** As of June 2026, Iroh is still evolving. Check https://iroh.computer for latest API.

### 1.2 Iroh Node Initialization

```rust
// src-tauri/src/iroh_node.rs
use iroh::node::Node;
use iroh::blobs::store::fs::Store;

pub struct IrohNode {
    node: Node,
    store: Store,
}

impl IrohNode {
    pub async fn new(data_dir: PathBuf) -> Result<Self, String> {
        let store = Store::new(data_dir.join("iroh"))?;
        let node = Node::builder(store.clone()).spawn().await?;
        Ok(Self { node, store })
    }
    
    pub async fn add_blob(&self, data: &[u8]) -> Result<String, String> {
        let hash = self.store.import_bytes(data).await?;
        Ok(hash.to_string())
    }
    
    pub async fn get_blob(&self, hash: &str) -> Result<Option<Vec<u8>>, String> {
        let hash: Hash = hash.parse()?;
        let data = self.store.get_bytes(&hash).await?;
        Ok(data)
    }
}
```

### 1.3 Replace Blob Store

```rust
// In AppState
struct AppState {
    // ... existing fields ...
    iroh: Option<IrohNode>, // Replace blob_store
}

// In create_post
#[tauri::command]
fn create_post(
    state: State<AppState>,
    session_token: String,
    content: String,
    town_tag: String,
    media_hashes: Option<String>,
) -> Result<Post, String> {
    // ... existing validation ...
    
    // Upload media to Iroh if present
    let iroh_cids: Vec<String> = if let Some(hashes) = media_hashes {
        let hashes: Vec<String> = serde_json::from_str(&hashes).unwrap_or_default();
        let mut cids = Vec::new();
        for hash in hashes {
            // Convert local hash to Iroh CID
            if let Some(bytes) = state.blob_store.get_blob(&hash) {
                if let Some(iroh) = &state.iroh {
                    let cid = iroh.add_blob(&bytes).await?;
                    cids.push(cid);
                }
            }
        }
        cids
    } else {
        Vec::new()
    };
    
    // Store post with Iroh CIDs
    let post = state.db.create_post(&author_handle, &content, &town_tag, &iroh_cids)?;
    
    // Publish to Nostr with Iroh CID metadata
    // ... existing publish logic ...
    
    Ok(post)
}
```

---

## Phase 2: Content Addressing (Day 1-2)

### 2.1 CID-Based Media Display

**Current:** `media_blobs` stores SHA256 hashes
**New:** `media_blobs` stores Iroh CIDs

**Nostr Event Format:**
```json
{
  "kind": 1,
  "content": "Check out this photo!",
  "tags": [
    ["t", "hbcu-town:tsu"],
    ["imeta", "url", "iroh://bafkreiabc123...", "m", "image/jpeg", "x", "sha256...", "size", "1024"],
    ["imeta", "url", "iroh://bafkreidef456...", "m", "image/jpeg", "x", "sha256...", "size", "2048"]
  ]
}
```

### 2.2 Fetch Content from Iroh

```rust
#[tauri::command]
fn get_media(
    state: State<AppState>,
    session_token: String,
    cid: String,
) -> Result<Option<String>, String> {
    let _ = check_session_rate_limit(&state, &session_token)?;
    
    if let Some(iroh) = &state.iroh {
        let data = iroh.get_blob(&cid).await?;
        if let Some(bytes) = data {
            let b64 = base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                &bytes,
            );
            return Ok(Some(b64));
        }
    }
    
    // Fallback to local blob store
    Ok(state.blob_store.get_blob(&cid).map(|b| 
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &b)
    ))
}
```

### 2.3 UI: Media Components

Update `media-display.tsx`:
- Show loading state while fetching from Iroh
- Progressive loading (thumbnail first, full size later)
- Cache fetched media locally

---

## Phase 3: Pinning & Persistence (Day 2-3)

### 3.1 Town Relay Pinning

Town relays (Tier 2 nodes) act as **pinners**:
- Store popular content locally
- Serve content to requesting peers
- Earn WeixBucks for pinning (node harvest)

**Pinning Policy:**
```rust
fn should_pin(cid: &str, access_count: u64) -> bool {
    // Pin if accessed > 10 times in 24h
    access_count > 10
}

fn pin_content(cid: &str) -> Result<(), String> {
    // Fetch from Iroh network
    // Store locally
    // Register as pinner
}
```

### 3.2 Node Harvest Rewards

From `hub-theory.md`:
- Pin serve (per fetch): 0.1 WB
- Relay uptime: 1-5 WB/hour

**Implementation:**
```rust
#[tauri::command]
fn report_pin_serve(
    state: State<AppState>,
    session_token: String,
    cid: String,
) -> Result<(), String> {
    let handle = check_session_rate_limit(&state, &session_token)?;
    
    // Credit node operator for serving content
    let conn = state.db.conn.lock().unwrap();
    conn.execute(
        "UPDATE users SET weix_bucks = weix_bucks + ?1 WHERE handle = ?2",
        rusqlite::params![0.1, handle],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}
```

### 3.3 Garbage Collection

- Unpin content not accessed in 30 days
- Keep user's own content forever
- Popular content replicated across multiple nodes

---

## Phase 4: Cross-Device Sync (Day 3-4)

### 4.1 Account Content Sync

When user recovers account on new device:
1. Fetch all CIDs from Nostr events
2. Download content from Iroh
3. Cache locally

```rust
#[tauri::command]
async fn sync_account_content(
    state: State<AppState>,
    session_token: String,
) -> Result<Vec<String>, String> {
    let handle = get_handle_from_session(&state, &session_token)?;
    
    // Get all posts by user
    let posts = state.db.get_user_posts(&handle, None)?;
    
    let mut cids = Vec::new();
    for post in posts {
        for cid in post.media_blobs {
            // Download from Iroh
            if let Some(iroh) = &state.iroh {
                if let Ok(Some(_)) = iroh.get_blob(&cid).await {
                    cids.push(cid);
                }
            }
        }
    }
    
    Ok(cids)
}
```

### 4.2 Offline Cache

- Pre-fetch content for followed users
- Cache trending posts
- Store in SQLite + local filesystem

---

## Phase 5: Integration (Day 4-5)

### 5.1 Replace Existing Commands

Update these commands to use Iroh:
- `upload_blob` → Upload to Iroh, return CID
- `get_blob_bytes` → Fetch from Iroh by CID
- `list_user_blobs` → List CIDs from Nostr events
- `delete_blob` → Unpin from Iroh + delete local

### 5.2 Migration Path

**Existing content:**
1. Keep local blob store as fallback
2. Lazy migration: upload to Iroh on first fetch
3. Mark as "migrated" in database

**New content:**
1. Always upload to Iroh
2. Store CID in database
3. Cache locally for performance

### 5.3 Fallback Strategy

```rust
pub async fn get_content(cid: &str, fallback_hash: &str) -> Result<Vec<u8>, String> {
    // Try Iroh first
    if let Some(iroh) = &self.iroh {
        if let Ok(Some(data)) = iroh.get_blob(cid).await {
            return Ok(data);
        }
    }
    
    // Fallback to local blob store
    if let Some(data) = self.blob_store.get_blob(fallback_hash) {
        return Ok(data);
    }
    
    Err("Content not found on Iroh or locally".to_string())
}
```

---

## Testing Plan

### Unit Tests
- `IrohNode::add_blob` — Upload and retrieve
- `IrohNode::get_blob` — Fetch from network
- CID generation and validation

### Integration Tests
- End-to-end: Upload → Get CID → Fetch → Verify content
- Cross-device: Upload on A, fetch on B
- Offline: Upload offline, sync when online

### Performance Tests
- Upload speed: 5MB photo on Tier 0
- Download speed: From local node vs. remote node
- Memory usage: Iroh node running

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Iroh API changes | Pin to stable version; check compatibility |
| Content unavailable (no peers) | Town relay pinning; always cache locally |
| Large files (video) | Chunking; progressive upload; size limits |
| CID collisions | SHA-256 guarantees uniqueness; extremely rare |
| Network bandwidth | Compression; thumbnails; lazy loading |

---

## Files to Modify

1. `src-tauri/Cargo.toml` — Add Iroh dependency
2. `src-tauri/src/iroh_node.rs` — New file (Iroh wrapper)
3. `src-tauri/src/lib.rs` — Replace blob commands with Iroh
4. `src-tauri/src/db.rs` — Add CID fields
5. `src-tauri/src/blob_store.rs` — Mark as legacy/fallback
6. `src/components/ui/media-display.tsx` — Show Iroh loading states
7. `src/pages/media.tsx` — Upload to Iroh
8. `src/hooks/use-app-data.ts` — Add Iroh hooks

---

## Success Criteria

- [ ] Media uploads to Iroh, returns CID
- [ ] CID stored in Nostr event metadata
- [ ] Content fetchable from any device via CID
- [ ] Town relays pin popular content
- [ ] Node operators earn WeixBucks for pinning
- [ ] Fallback to local blob store works
- [ ] Tier 0 hardware handles uploads/downloads

---

## References

- Iroh documentation: https://iroh.computer/docs
- Content-addressed storage: https://iroh.computer/docs/layers/blobs
- Nostr NIP-94 (media attachments): https://github.com/nostr-protocol/nips/blob/master/94.md
- BlkSpace hub-theory.md: Node harvest economics

---

*Next: After Iroh integration, content is truly decentralized and cross-device.*
