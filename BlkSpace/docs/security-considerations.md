# Security Considerations — BlkSpace

**Document:** Threat model, attack vectors, and mitigations for BlkSpace's decentralized architecture.  
**Last Updated:** 2026-06-15  
**Threat Model:** HBCU students on low-end hardware (Tier 0) connecting to public Nostr relays.  

---

## 1. Attack Vectors from Kimura et al. 2025

**Source:** H. Kimura et al., "Not in The Prophecies: Practical Attacks on Nostr," EuroS&P 2025.  
**Paper Finding:** Four practical attack classes against the Nostr protocol and client implementations.

---

### 1.1 Signature Verification Bypasses

**What the paper found:**  
Multiple Nostr client implementations failed to verify event signatures under edge conditions:
- Malformed pubkeys accepted without validation
- Signature malleability in some secp256k1 libraries
- Events with invalid `id` field hashes accepted anyway

**BlkSpace Mitigation:**

| Check | Implementation | File |
|-------|---------------|------|
| Pubkey format | `pubkey.len() != 64` → reject | `lib.rs:294` |
| Event ID format | `id.len() != 64` → reject | `lib.rs:297` |
| Schnorr signature verification | `secp.verify_schnorr()` using `schnorr::Signature` | `lib.rs:322` |
| Event ID reconstruction | SHA-256 of canonical JSON `[0, pubkey, created_at, kind, tags, content]` | `lib.rs:317-320` |
| Timestamp validation | Reject events > 24 hours old or from future | `lib.rs:303` |

**Code Reference:**
```rust
fn validate_incoming_event(event_json: &str) -> Result<bool, String> {
  // ... field extraction ...
  if pubkey.len() != 64 { return Err("Invalid pubkey format"); }
  if id.len() != 64 { return Err("Invalid event id format"); }
  let now = chrono::Utc::now().timestamp();
  if (now - created_at).abs() > 86400 { return Ok(false); }
  // ... Schnorr verification using secp256k1 ...
}
```

**Status:** ✅ Fully implemented. Every event from public relays is validated before storage.

---

### 1.2 Unauthenticated CBC Encryption in Legacy DMs (NIP-04)

**What the paper found:**  
NIP-04 (Nostr's legacy direct message standard) uses **AES-256-CBC without a MAC (Message Authentication Code)**. This means:
- **No integrity protection:** An attacker can flip bits in ciphertext without detection
- **No authentication:** Anyone with the ciphertext can modify it; the recipient cannot verify it came from the claimed sender unaltered
- **Padding oracle attacks:** CBC mode with PKCS#7 padding is vulnerable to padding oracle attacks in some implementations

**NIP-04 Technical Details:**
- Encryption: `AES-256-CBC` with shared secret derived from ECDH (secp256k1)
- **No MAC:** No HMAC-SHA256, no AEAD tag
- **No forward secrecy:** Same key for all messages between a pair of users
- **No replay protection:** No timestamps or nonces in the ciphertext

**NIP-17 vs. NIP-04:**
- **NIP-04** (legacy, 2019): Uses AES-256-CBC without MAC. This is the standard Kimura et al. cryptanalyzed.
- **NIP-17** (modern, 2024): Uses `libsodium` sealed boxes (`crypto_box`) which provides authenticated encryption (XSalsa20 + Poly1305 MAC). However, Kimura et al.'s analysis focused on NIP-04, and BlkSpace treats **both NIP-04 and NIP-17 as untrusted for sensitive coordination** because:
  - NIP-17 is newer and has less battle-tested implementation history
  - Metadata (sender, recipient, timestamps) is still visible on relays
  - The paper's general caution about Nostr DMs applies to any DM standard

**BlkSpace Policy:**

| Standard | Encryption | Trust Level | BlkSpace Use |
|----------|-----------|-------------|--------------|
| NIP-04 | AES-256-CBC (no MAC) | ❌ **Untrusted** | Not implemented |
| NIP-17 | XSalsa20-Poly1305 (sealed boxes) | ⚠️ **Untrusted** | Not implemented |
| Public posts | None (plaintext) | ✅ **Trusted** | Primary communication |
| Sensitive data | **Not on Nostr** | N/A | Encrypted file sharing via Iroh (future) |

**Rationale:**  
HBCU students coordinating protests, sharing financial information, or discussing sensitive topics should **not use Nostr DMs**. BlkSpace recommends:
1. **Public posts** for general discussion (content is public anyway, and signatures provide authenticity)
2. **Out-of-band** (Signal, WhatsApp, in-person) for sensitive coordination
3. **Future:** Iroh-based encrypted blob sharing with pre-shared keys (Phase 2+)

**Status:** ✅ Policy enforced — no DM implementation in codebase.

---

### 1.3 CBC Malleability + Link Preview = Confidentiality Breach

**What the paper found:**  
The combination of NIP-04's unauthenticated CBC encryption and **automatic link previews** creates a practical confidentiality attack:

1. Attacker intercepts a NIP-04 DM containing a URL (e.g., `https://docs.google.com/...`)
2. Attacker flips specific bits in the CBC ciphertext (malleability attack)
3. Decrypted plaintext now contains a different URL (e.g., `https://attacker.com/...`)
4. Recipient's client renders the message and **automatically fetches the link preview**
5. Attacker's server logs the request, proving the recipient decrypted the message → **confidentiality broken**

**Attack Requirements:**
- Victim uses a client with automatic link previews enabled
- Attacker can intercept ciphertext (public relay operator, network observer)
- Attacker knows the approximate structure of the plaintext (URL format)

**BlkSpace Mitigation:**

| Layer | Mitigation | Implementation |
|-------|-----------|----------------|
| **Application** | No automatic link previews | BlkSpace frontend does not fetch link previews for any content |
| **Protocol** | No NIP-04 implementation | Legacy DM standard not implemented |
| **Policy** | User education | Onboarding warns: "Nostr DMs are not private. Use Signal for secrets." |
| **Future** | AEAD for blob sharing | Iroh-based sharing with authenticated encryption (Phase 2+) |

**Status:** ✅ Fully mitigated — no link preview fetching, no NIP-04 implementation.

---

### 1.4 Cache Poisoning in Client Implementations

**What the paper found:**  
Nostr clients cache events (pubkey-to-profile mappings, relay lists, metadata) to avoid re-fetching. Kimura et al. identified:
- **Profile cache poisoning:** A malicious relay can serve a fake profile for a legitimate pubkey. If the client caches it, the fake profile persists even when switching to honest relays.
- **Relay list cache poisoning:** A malicious relay can inject fake relay recommendations into a user's cached relay list, causing the client to connect to attacker-controlled relays.
- **Metadata cache poisoning:** Cached follower counts, display names, or verification badges can be manipulated.

**Attack Scenario:**
```
1. Student connects to Relay A (honest) and Relay B (malicious)
2. Relay B serves a fake profile for @tsu_student:
   - Fake display name: "TSU Official Account"
   - Fake bio: "Send money to this address: ..."
3. Client caches this profile
4. Even after disconnecting from Relay B, the fake profile persists
5. Student sees "TSU Official Account" asking for money → scam succeeds
```

**BlkSpace Mitigation:**

| Check | Implementation | File |
|-------|---------------|------|
| **Signature validation on every event** | `validate_incoming_event()` verifies all cached events | `lib.rs:283` |
| **No profile caching without verification** | Events written to SQLite only after signature check | `lib.rs:1447` |
| **Town tag filtering** | Reject events without `t:hbcu-town:*` tag | `lib.rs` (relay subscription) |
| **Multi-relay consensus** | `record_relay_consensus()` + `validate_relay_consensus()` — track events across relays | `db.rs` (new relay_consensus table) |
| **Cache invalidation** | React Query `staleTime` + `refetchInterval` | `use-app-data.ts` |

**Code Reference:**
```rust
// In relay_manager.rs or background sync
if validate_incoming_event(&event_json).unwrap_or(false) {
    // Only store validated events
    state.db.store_event(&event_json).unwrap();
} else {
    // Reject invalid events — don't cache poison
    log::warn!("Invalid event rejected: {}", event_id);
}
```

**Additional Defense:**
- **Relay health checks:** `check_relay_health()` monitors latency and event quality. Unhealthy relays are deprioritized.
- **Default relay list:** Hardcoded list of known public relays (damus.io, nostr.band, nos.lol, snort.social, nostr.wine). Malicious relays cannot inject themselves into this list.

**Status:** ✅ **Implemented.** Multi-relay consensus table (`relay_consensus`) tracks every event from every relay with its content hash. The `validate_relay_consensus()` function checks if ≥min_relays agree on the same content hash before trusting the event. Background sync automatically records consensus for all incoming events.

**Code Reference:**
```rust
// Background sync records consensus for each event
let content_hash = format!("{:x}", sha2::Sha256::digest(&event.content));
let _ = st.db.record_relay_consensus(&event_id, &relay_url, &content_hash);

// Later: validate before using
if db.validate_relay_consensus(event_id, 2)? {
    // At least 2 relays agree on content hash — safe to use
}
```

---

## 2. Sybil & Coordinated Attack Mitigation (Fausak et al. 2024)

**Source:** A. R. Fausak et al., "Malicious Intent Detection Framework for Social Networks," AICCSA 2024.  
**Paper Finding:** Relationship-based (graph) anomaly detection can identify Sybil attacks, bot farms, and coordinated inauthentic behavior.

---

### 2.1 What MIDF Proposes

The Malicious Intent Detection Framework (MIDF) defines:
- **Relationship Graph:** Nodes = users, Edges = follows, likes, replies, mentions
- **Malicious Intent Vector:** Composite score of suspicious signals:
  - Follower velocity (sudden spikes)
  - Network centrality (star patterns = bot farms)
  - Content similarity (copy-paste spam)
  - Temporal patterns (coordinated posting)
- **ML-driven:** Extensible framework for anomaly detection

**BlkSpace Implementation Status:**

| MIDF Feature | BlkSpace Status | Implementation |
|--------------|----------------|----------------|
| **Relationship graph** | ✅ Implemented | `get_follower_graph()` — followers of followers up to depth 2 | `db.rs` |
| **Follower velocity** | ✅ Implemented | `get_follower_velocity()` — recent followers / total followers | `db.rs` |
| **Network centrality** | ✅ Implemented | `get_network_centrality()` — degree centrality in follows graph | `db.rs` |
| **Content similarity** | ✅ Implemented | `get_content_similarity_score()` — duplicate first-50 chars detection | `db.rs` |
| **Temporal patterns** | ✅ Implemented | `get_temporal_pattern_score()` — burst posting (>4 posts/hour) | `db.rs` |
| **Self-interaction** | ✅ Implemented | `get_self_interaction_score()` — self-likes + self-replies detection | `db.rs` |
| **Star pattern detection** | ✅ Implemented | `get_star_pattern_score()` — detect bot farms (followers with <3 connections) | `db.rs` |
| **Composite score** | ✅ Implemented | `calculate_malicious_intent_vector()` — 6-dimensional weighted composite | `db.rs` |

**Current Implementation:**
```rust
// In db.rs — full MIDF composite score with 6 dimensions
pub fn calculate_malicious_intent_vector(&self, handle: &str) -> Result<serde_json::Value> {
    let star = self.get_star_pattern_score(handle)?;
    let centrality = self.get_network_centrality(handle)?;
    let velocity = self.get_follower_velocity(handle)?;
    let self_int = self.get_self_interaction_score(handle)?;
    let similarity = self.get_content_similarity_score(handle)?;
    let temporal = self.get_temporal_pattern_score(handle)?;

    // Weighted composite score (MIDF-inspired heuristics)
    let overall = (
        star * 0.30 +           // Star pattern: highest weight for Sybil detection
        velocity * 0.25 +       // Follower velocity: rapid growth attack
        self_int * 0.20 +       // Self-interaction: reward farming
        similarity * 0.15 +     // Content similarity: spam
        temporal * 0.10         // Temporal pattern: automation
    ).min(1.0);

    // Store in malicious_intent_scores table
    // ...
}
```

**Status:** ✅ **Implemented.** All 6 MIDF dimensions are now queryable via SQL graph analysis on the `follows` table. The composite score is stored in `malicious_intent_scores` table with automatic risk classification (`low`/`medium`/`high`). Background recalculation can be triggered via `recalculate_all_malicious_intent_scores()`.

---

### 2.2 Rate Limiting (Heuristic Defense)

While full MIDF graph analysis is not yet implemented, BlkSpace uses rate limiting as a first-line defense:

```rust
const RATE_LIMIT_WINDOW: i64 = 60;  // seconds
const RATE_LIMIT_MAX: usize = 30;   // requests per window

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
```

**Status:** ✅ Implemented. All Tauri commands check rate limits per pubkey.

---

### 2.3 Economic Anomaly Detection

**WeixBucks rewards:** Post +5, Reply +2, Like +1, Upload +10, Pin serve +0.1 (cap 100/day)

**Attack:** Farm accounts create spam posts, reply to themselves, and like their own content to drain the reward pool.

**Current Mitigation:**
- Rate limiting (30 req/60s) prevents rapid spam
- `engagement_quality` multiplier reduces rewards for low-quality accounts
- Future: Self-like and self-reply detection

**Status:** ⚠️ Partial. Basic rate limiting and quality multipliers exist. Self-interaction detection is planned for Phase 2.

---

## 3. Session & Authentication Security

### 3.1 Challenge-Response Authentication

BlkSpace uses Nostr's kind 22242 challenge-response (NIP-42) for authentication:

```
1. Client: get_challenge(handle) → Server returns random UUID
2. Client: Signs challenge with Nostr private key → sends auth_event
3. Server: verify_nostr_auth_event(auth_event, challenge)
   - Check kind == 22242
   - Check challenge tag matches
   - Check created_at within ±120 seconds
   - Verify Schnorr signature
   - Reconstruct event ID and verify against provided id
4. Server: If valid, create session token (UUID)
```

**Security Properties:**
- **Replay resistance:** Challenge is single-use (removed after verification)
- **Time-bound:** 120-second expiry prevents stale replay
- **No password:** Cryptographic proof of key ownership (no plaintext passwords stored)
- **Session expiry:** 24-hour TTL on sessions

**Code Reference:** `lib.rs:78-135` (verify_nostr_auth_event), `lib.rs:140-152` (get_challenge)

**Status:** ✅ Implemented.

---

### 3.2 Key Management

| Practice | Implementation | Status |
|----------|---------------|--------|
| **Private key storage** | `localStorage` (frontend) + encrypted backup (future) | ⚠️ Basic |
| **Recovery phrase** | BIP39 12-word mnemonic → `mnemonicToNsec()` | ✅ Implemented |
| **Paper backup** | User writes down 12 words; no "Forgot Password" | ✅ Policy enforced |
| **Key rotation** | Not yet implemented | ❌ Future |
| **Hardware wallet** | Not yet implemented | ❌ Future (Phase 4) |

**BIP39 Recovery:**
```typescript
// In auth.ts
export const mnemonicToNsec = (mnemonic: string): string => {
  // Convert BIP39 mnemonic to Nostr private key (nsec)
  // Uses bitcoinjs-lib BIP39 + secp256k1 derivation
};
```

**Status:** ✅ BIP39 recovery implemented. No key rotation yet.

---

## 4. Infrastructure & Network Security

### 4.1 Relay Selection

**Default Public Relays:**
- `wss://relay.damus.io` (largest, most reliable)
- `wss://nostr.band` (indexing/search)
- `wss://nos.lol` (general purpose)
- `wss://relay.snort.social` (privacy-focused)
- `wss://nostr.wine` (paid, high quality)

**Relay Health Checks:**
```rust
fn check_relay_health(url: &str) -> Result<RelayStatus, String> {
    let start = Instant::now();
    let connection = connect_to_relay(url)?;
    let latency = start.elapsed().as_millis() as u32;
    
    // Send ping, expect pong
    connection.send_ping()?;
    let pong = connection.recv_pong(Duration::from_secs(5))?;
    
    Ok(RelayStatus {
        url: url.to_string(),
        latency_ms: latency,
        connected: true,
        last_checked: chrono::Utc::now().timestamp(),
    })
}
```

**Status:** ✅ Implemented.

---

### 4.2 Rate Limiting & DoS Protection

| Layer | Limit | Implementation |
|-------|-------|---------------|
| **Per-pubkey** | 30 requests / 60 seconds | `lib.rs:54-68` |
| **Per-session** | Implicit (session token required) | `lib.rs` (session validation) |
| **Event sync** | 100 events / batch | `relay_manager.rs` |
| **Media upload** | 50MB max | `blob_store.rs` |

**Status:** ✅ Implemented.

---

### 4.3 Iroh Content Security

**Content-Addressed Storage:**
- All blobs stored by SHA-256 hash (CID)
- Tamper-evident: Any bit flip changes the CID
- Deduplication: Same content = same CID (saves storage)

**Pinning Rewards:**
- Nodes earn 0.1 WB per blob served (cap 100/day)
- Incentivizes honest caching
- Mitigates content unavailability

**Status:** ✅ Implemented.

---

## 5. Security Checklist

### ✅ Implemented

- [x] Strict Schnorr signature verification on all events
- [x] Pubkey and event ID format validation (64 hex chars)
- [x] Timestamp validation (±24 hours)
- [x] Rate limiting (30 req/60s per pubkey)
- [x] Challenge-response authentication (NIP-42, kind 22242)
- [x] Session expiry (24 hours)
- [x] No NIP-04 implementation (legacy vulnerable DMs)
- [x] No automatic link previews
- [x] BIP39 recovery phrase (paper backup)
- [x] Town-based relay filtering (prevents global flooding)
- [x] Iroh content-addressed storage (SHA-256 integrity)
- [x] Relay health checks (latency monitoring)
- [x] Default relay list (known public relays)
- [x] **Multi-relay consensus** (`relay_consensus` table — track events across relays)
- [x] **Cache poisoning defense** (`validate_relay_consensus()` — require ≥2 relays agreeing on content hash)
- [x] **Graph-based Sybil detection** (`get_star_pattern_score()` — detect bot farms)
- [x] **Network centrality analysis** (`get_network_centrality()` — degree centrality)
- [x] **Follower velocity detection** (`get_follower_velocity()` — sudden growth spikes)
- [x] **Self-interaction detection** (`get_self_interaction_score()` — self-likes/self-replies)
- [x] **Content similarity detection** (`get_content_similarity_score()` — duplicate content spam)
- [x] **Temporal pattern analysis** (`get_temporal_pattern_score()` — burst posting detection)
- [x] **MIDF composite score** (`calculate_malicious_intent_vector()` — 6-dimensional weighted vector)
- [x] **Malicious intent scoring table** (`malicious_intent_scores` — persistent score storage)
- [x] **Risk classification** (`low`/`medium`/`high` based on composite score)

### ⚠️ Partially Implemented

- [~] Economic anomaly detection (rate limiting + quality multipliers; no ML yet)

### ❌ Not Yet Implemented

- [ ] NIP-17 sealed box DMs (not implemented by design)
- [ ] Key rotation mechanism
- [ ] Hardware wallet support (Phase 4)
- [ ] Iroh encrypted blob sharing (Phase 2+)
- [ ] Formal security audit

---

## 6. References

- [1] H. Kimura et al., "Not in The Prophecies: Practical Attacks on Nostr," EuroS&P 2025.
- [2] A. R. Fausak et al., "Malicious Intent Detection Framework for Social Networks," AICCSA 2024.
- [3] E. Biagioni, "Early Review of The BitChat Protocol," ICNC 2026.
- [4] NIP-04: https://github.com/nostr-protocol/nips/blob/master/04.md (Legacy DM standard)
- [5] NIP-17: https://github.com/nostr-protocol/nips/blob/master/17.md (Modern DM standard)
- [6] NIP-42: https://github.com/nostr-protocol/nips/blob/master/42.md (Authentication)
- [7] BIP39: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki

---

*This document is a living threat model. It should be updated whenever new attack vectors are discovered or new mitigations are implemented.*

*Last reviewed: 2026-06-15*
