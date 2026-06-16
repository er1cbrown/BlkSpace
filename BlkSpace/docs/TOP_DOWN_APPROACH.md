# BlkSpace Top-Down Approach

**Mapping Kurose & Ross's Computer Networking layers to BlkSpace's decentralized architecture.**

**Reference:** Kurose & Ross, *Computer Networking: A Top-Down Approach*, 8th ed. (Pearson, 2021)  
**Source:** Grok-Computer Networking Top-Down Approach Overview.json (TSU COMP-3310 coursework)  
**Date:** 2026-06-15

---

## The Classic 5-Layer Stack

| Layer | Kurose & Ross | What It Does |
|-------|--------------|--------------|
| **Application (5)** | HTTP, SMTP, DNS, P2P | Network applications & protocols |
| **Transport (4)** | TCP, UDP | End-to-end process communication |
| **Network (3)** | IP, routing | Host-to-host datagram delivery |
| **Link (2)** | Ethernet, Wi-Fi, ARP | Adjacent node transfer |
| **Physical (1)** | Copper, fiber, radio | Bit transmission |

---

## BlkSpace's Augmented Stack

BlkSpace does not replace the internet — it **augmented** the Application and Link layers for decentralized social networking.

| Layer | Kurose & Ross | BlkSpace Implementation |
|-------|--------------|------------------------|
| **Application (5)** | HTTP, DNS | **Nostr** (events, identity, social) + **Iroh** (blob storage) + **Solana** (Phase 4 settlement) |
| **Transport (4)** | TCP, UDP | **TCP** (reliable relay sync) + **UDP** (optional local mesh discovery) |
| **Network (3)** | IP, routing | **IPv4/IPv6** + **Nostr relay mesh** (town-based routing) |
| **Link (2)** | Ethernet, Wi-Fi | **Wi-Fi** + **BLE mesh** (Phase 2+ offline local chat) |
| **Physical (1)** | Hardware | **Tier 0 laptops** (low-end Windows, ~2GB RAM) |

---

## Layer-by-Layer Mapping

### Application Layer: Nostr + Iroh + Solana

**Kurose & Ross:**  
> "The application layer is where network applications and their application-layer protocols reside." (Ch. 2)

**BlkSpace Mapping:**

| Application Service | Kurose & Ross Equivalent | BlkSpace Protocol |
|--------------------|------------------------|------------------|
| Social feeds, posts | Web (HTTP) | Nostr events (kind 1) |
| Identity / profiles | DNS | Nostr public keys (self-certifying) |
| Direct messages | SMTP / email | **Not implemented** — NIP-04 (legacy, vulnerable CBC) and NIP-17 (modern sealed boxes) both marked **untrusted** per Kimura et al. |
| Media (photos, video) | HTTP streaming | Iroh blob CIDs + Nostr metadata |
| Payments / rewards | Banking APIs | Nostr signed events (WeixBucks) + Solana (Phase 4) |
| Marketplace | E-commerce APIs | Nostr listing events |

> **⚠️ Security Note:** Kimura et al. (EuroS&P 2025) cryptanalyzed **NIP-04** (legacy DMs using AES-256-CBC without MAC) and demonstrated practical attacks via CBC malleability + link previews. BlkSpace does not implement NIP-04. **NIP-17** (modern, using `libsodium` sealed boxes) provides authenticated encryption but is still treated as untrusted for sensitive coordination because relay metadata remains visible. See `docs/security-considerations.md` for full threat model.

**Key Design Decision:**  
BlkSpace replaces HTTP-based social media with **Nostr protocol** at the application layer. This means:
- No central server (like Facebook's data centers)
- Data is stored on relays (like email servers, but distributed)
- Users own their identity via cryptographic keys (not usernames/passwords)

---

### Transport Layer: TCP + UDP

**Kurose & Ross:**  
> "TCP provides reliable, ordered, and error-checked delivery of data. UDP provides a connectionless, best-effort service." (Ch. 3)

**BlkSpace Mapping:**

| Use Case | Transport | Why |
|----------|----------|-----|
| Nostr relay sync | TCP (WebSocket) | Reliable event delivery, ordered streams |
| Town relay gossip | TCP | Consistent cross-relay state |
| Local mesh discovery | UDP | Fast, low-overhead broadcast to nearby devices |
| BLE mesh (Phase 2+) | Custom | Fire-and-forget, TTL-limited flooding |
| Media streaming | TCP (Iroh) | Content-addressed, chunked transfer |

**Key Insight:**  
TCP's **three-way handshake** (SYN → SYN-ACK → ACK) is analogous to Nostr's **challenge-response auth** (kind 22242):
1. Client sends challenge request (SYN)
2. Server responds with challenge string (SYN-ACK)
3. Client signs challenge and sends auth event (ACK)

---

### Network Layer: IP + Nostr Relay Mesh

**Kurose & Ross:**  
> "The network layer delivers datagrams from source to destination host." (Ch. 4)

**BlkSpace Mapping:**

| Function | Traditional Internet | BlkSpace Equivalent |
|----------|---------------------|-------------------|
| Addressing | IP addresses (32/128-bit) | Nostr public keys (256-bit, self-certifying) |
| Routing | BGP, OSPF | Town-based relay selection (`t:hbcu-town:*`) |
| Forwarding | Router tables | Relay subscription filters (kind, pubkey, tags) |
| Fragmentation | Packet splitting | Nostr event size limits (with Iroh for large content) |

**The Federated Mesh Innovation:**

Instead of **global flooding** (all relays see all events → O(N²) problem), BlkSpace uses **town-based routing**:

```
Traditional Nostr:        BlkSpace Mesh:
┌─────────┐              ┌─────────┐
│ Global  │              │ TSU     │──┐
│ Relay   │              │ Relay   │  │
│ Pool    │              └─────────┘  │
└─────────┘              ┌─────────┐  │  Selective
  ↑ every event            │ Howard  │  │  cross-town
  │ goes here              │ Relay   │──┘  sync
  ↓                        └─────────┘
  ALL USERS                ┌─────────┐
                           │ FAMU    │
                           │ Relay   │
                           └─────────┘
```

**Prevents O(N²) flooding** by only syncing:
- Same-town events (automatic)
- Followed accounts (explicit cross-town)
- Trending summaries (aggregated gossip, kind 1030)

---

### Link Layer: Wi-Fi + BLE Mesh

**Kurose & Ross:**  
> "The link layer moves datagrams from one node to an adjacent node over a single link." (Ch. 6)

**BlkSpace Mapping:**

| Mode | Link Technology | Use Case | Status |
|------|----------------|----------|--------|
| Online | Wi-Fi / Ethernet | Normal operation, relay sync | ✅ Active |
| Offline local | BLE mesh (Phase 2+) | Dorms, events, poor connectivity | 🔮 Planned |
| Offline bridge | Wi-Fi Direct | Device-to-device without internet | 🔮 Planned |

**BitChat-Inspired Dual Transport (Biagioni 2026):**

From the BitChat protocol analysis in the Grok export:
- **BLE mesh** for local/offline communication (TTL ~7 hops)
- **Nostr** for global reach when internet returns
- Bridge: local events signed Nostr-style, sync to relays on reconnect

**Key Design Principle:**  
**Borrow philosophy, do not adopt full stack.** BlkSpace uses the dual-transport concept but keeps its own Nostr-based identity and event format.

---

### Physical Layer: Tier 0 Hardware

**Kurose & Ross:**  
> "The physical layer moves individual bits from one node to the next." (Ch. 1)

**BlkSpace Mapping:**

| Tier | Hardware | Role | BlkSpace Function |
|------|---------|------|-------------------|
| **Tier 0** | Low-end Windows laptop (2GB RAM, old CPU) | Student user | Run Tauri desktop client, browse feed, create posts |
| **Tier 1** | Mid-range laptop / Raspberry Pi | Light node | Relay, pin, validate events |
| **Tier 2** | Better hardware / cloud VM | Town relay | Full Nostr relay, Iroh pinning, anomaly detection |
| **Tier 3+** | Server / datacenter | Infrastructure | Solana validators, global CDN (Phase 4+) |

**Hardware-First Design:**  
Unlike most crypto/social apps that assume modern smartphones, BlkSpace is designed for **the computers students actually own** — old laptops, lab machines, even Chromebooks.

---

## Networking Concepts Applied to BlkSpace

### Delay, Loss, and Throughput (Ch. 1.4)

**Kurose & Ross:**
- **Transmission delay** = L / R (packet size / link rate)
- **Propagation delay** = d / s (distance / propagation speed)
- **Queuing delay** = variable, depends on congestion
- **Total delay** = sum of all delays

**BlkSpace Application:**

| Delay Type | BlkSpace Context | Mitigation |
|-----------|-----------------|------------|
| **Transmission** | Large media uploads (photos, video) | Iroh chunked transfer, progressive upload |
| **Propagation** | Cross-town relay sync (Nashville → DC) | Selective sync, not real-time flooding |
| **Queuing** | Popular town relay under load | Multiple relays per town, load balancing |
| **Processing** | Nostr event verification on Tier 0 | Batch verification, lightweight checks first |

**Throughput for Tier 0:**
- Target: 1 Mbps sustained (works on old Wi-Fi)
- Burst: 5 Mbps (for media uploads)
- Design: Lazy loading, pagination, not infinite scroll

---

### Packet Switching vs. Circuit Switching (Ch. 1.3)

**Kurose & Ross:**
- **Packet switching:** Resources allocated on demand; shared capacity; efficient for bursty traffic
- **Circuit switching:** Dedicated resources reserved; guaranteed performance; inefficient if unused

**BlkSpace Application:**

| Aspect | Traditional Social Media | BlkSpace |
|--------|------------------------|----------|
| **Model** | Circuit-like (always-on servers, reserved capacity) | Packet-like (relay sync on demand, shared capacity) |
| **Efficiency** | High for constant load, wasteful for low activity | Efficient for bursty HBCU usage (spikes during events) |
| **Resilience** | Server down = entire town offline | Relay down = other relays continue; mesh resilient |
| **Cost** | Expensive infrastructure (AWS, Google Cloud) | Student-run relays on existing hardware |

---

### TCP & UDP Socket Programming (Ch. 2.7, 3)

**Kurose & Ross:**
- **TCP:** Connection-oriented, reliable, ordered (socket → bind → listen → accept → send/recv)
- **UDP:** Connectionless, best-effort, no ordering (socket → bind → sendto/recvfrom)

**BlkSpace Application:**

**Tauri IPC (like TCP):**
```
Frontend (React)           Backend (Rust)
     ↓                          ↓
  invoke()  ────────────────→  command handler
  (like TCP send)               (like TCP recv)
     ↓                          ↓
  callback  ←──────────────────  return value
  (like TCP recv)               (like TCP send)
```
- Connection-oriented: Tauri maintains persistent IPC channel
- Reliable: Rust handles errors, returns structured results
- Ordered: Sequential command execution

**Nostr Relay (like UDP + TCP hybrid):**
- **WebSocket** (TCP-based) for reliable event streaming
- **Gossip** (UDP-like) for relay-to-relay discovery and status

---

### DNS: From Hierarchical to Self-Certifying

**Kurose & Ross:**  
> "DNS is a distributed, hierarchical database that maps hostnames to IP addresses." (Ch. 2.5)

**BlkSpace Innovation:**

| DNS Feature | Traditional Internet | BlkSpace Equivalent |
|-------------|---------------------|-------------------|
| **Hierarchy** | Root → TLD → Domain → Subdomain | Flat — Nostr pubkeys have no hierarchy |
| **Resolution** | DNS query → recursive resolver → authoritative | No lookup needed — pubkey IS the address |
| **Caching** | TTL-based, minutes to hours | Event-based, forever (relays store all events) |
| **Trust** | Certificate authorities (CAs) | Cryptographic signatures (self-certifying) |
| **Censorship** | ICANN can seize domains | No central authority — impossible to seize |

**Key Difference:**  
DNS maps human-readable names (google.com) to machine addresses (IP).  
Nostr maps human-readable names (handles) to cryptographic keys (pubkeys), but the key itself is the authoritative identifier.

---

### Multiplexing & Demultiplexing (Ch. 3.2)

**Kurose & Ross:**  
> "Multiplexing: gathering data from multiple sockets, enveloping with header info, and passing to network layer. Demultiplexing: delivering received segments to correct sockets." (Ch. 3.2)

**BlkSpace Application:**

**In the Rust Backend (lib.rs):**
```
┌─────────────────────────────────────┐
│  Tauri IPC (single connection)        │  ← Multiplexing: many commands
│  ├─ get_user()                        │     over one IPC channel
│  ├─ create_post()                     │
│  ├─ toggle_like()                     │
│  ├─ send_weixbucks()                  │
│  └─ ... 30+ commands                │
└─────────────────────────────────────┘
         ↓ demultiplexing
┌─────────────────────────────────────┐
│  SQLite Database                      │
│  ├─ users table                       │
│  ├─ posts table                       │
│  ├─ wallet_tx table                   │
│  └─ ...                               │
└─────────────────────────────────────┘
```

---

### Reliable Data Transfer (Ch. 3.4)

**Kurose & Ross:**  
> "rdt 1.0 (perfect channel) → rdt 2.0 (bit errors) → rdt 2.1 (ACK/NAK corruption) → rdt 2.2 (NAK-free) → rdt 3.0 (loss + timers) → TCP (pipelining, congestion control)" (Ch. 3.4)

**BlkSpace Application:**

| RDT Mechanism | BlkSpace Equivalent | Where |
|--------------|---------------------|-------|
| **Checksums** | CRC in SQLite, SHA-256 in blob store | db.rs, blob_store.rs |
| **ACK/NAK** | Nostr OK/EVENT messages | relay_manager.rs |
| **Timers** | React Query retry + stale-while-revalidate | use-app-data.ts |
| **Pipelining** | Batch event sync (sync_recent in relay_manager) | relay_manager.rs |
| **Congestion control** | Rate limiting (30 req/60s per pubkey) | lib.rs |

---

## Security: From Transport to Application Layer

### Internet Checksum (Ch. 3.3)

**Kurose & Ross:**  
> "The Internet checksum is computed by summing 16-bit words, taking the 1s complement, and checking if all bits are 1 at the receiver." (Ch. 3.3)

**BlkSpace Application:**
- **Nostr event IDs:** SHA-256 hash of serialized event (not checksum, but serves same purpose — detect tampering)
- **Blob storage:** SHA-256 of file content for deduplication and integrity

### CRC (Ch. 6.2)

**Kurose & Ross:**  
> "CRC (Cyclic Redundancy Check) detects burst errors with high probability. Used in Ethernet and Wi-Fi." (Ch. 6.2)

**BlkSpace Application:**
- CRC is handled by hardware (Ethernet/Wi-Fi NICs)
- Application layer uses stronger cryptographic hashes (SHA-256) for content integrity

---

## BitChat's Dual Transport: Layer 2 Innovation

**From Grok export analysis of Biagioni 2026:**

BitChat (July 2025, Jack Dorsey/Verse) introduces:
- **BLE mesh** at the Link layer for offline communication
- **Nostr** at the Application layer for global reach
- Bridge: local events signed Nostr-style, forward to relays when online

**BlkSpace Adaptation:**

| BitChat Feature | BlkSpace Equivalent | Status |
|-----------------|---------------------|--------|
| BLE mesh (TTL 7) | BLE mesh for dorms/events | 🔮 Phase 2+ |
| Noise Protocol encryption | **Not implemented** — DMs avoided per Kimura et al.; future Iroh-based encrypted sharing | ❌ Not implemented |
| Firechat-style flooding | Town-based relay gossip (not global flood) | ✅ Active |
| No accounts/phone numbers | Nostr keypairs (self-certifying) | ✅ Active |
| Panic wipe | Settings → Sign Out (deletes local keys) | ✅ Active |

---

## Key Formulas from Kurose & Ross Applied

### Transmission Delay (Ch. 1.4)
```
T_trans = L / R

Example: Upload a 5MB photo
L = 5 MB = 40,000,000 bits
R = 10 Mbps (typical Wi-Fi)
T_trans = 40,000,000 / 10,000,000 = 4 seconds

On Tier 0 (1 Mbps Wi-Fi):
T_trans = 40,000,000 / 1,000,000 = 40 seconds

Mitigation: Iroh chunked upload, progressive display, compression
```

### Propagation Delay (Ch. 1.4)
```
T_prop = d / s

Example: Nashville to Washington DC
d = 900 km = 900,000 meters
s = 2.5 × 10^8 m/s (fiber optic)
T_prop = 900,000 / 2.5 × 10^8 = 3.6 ms

Total delay (ignoring queuing):
T_total = T_trans + T_prop = 4,000 ms + 3.6 ms ≈ 4 seconds

Key insight: Propagation is negligible compared to transmission for media.
Cross-town sync can be async — doesn't need to be real-time.
```

### P2P Distribution (Ch. 2.6)
```
Client-Server: D_cs = max(NF/u_s, F/d_min)
P2P: D_p2p = max(F/u_s, F/d_min, NF/(u_s + Σu_i))

BlkSpace: Hybrid P2P (Nostr relay mesh)
- Server (town relay) uploads to peers
- Peers also upload to each other (via Iroh)
- More peers = faster distribution (not slower!)
```

---

## Summary: From Textbook to BlkSpace

| Kurose & Ross Concept | BlkSpace Implementation | Lesson Applied |
|----------------------|------------------------|----------------|
| **5-layer stack** | Nostr + Iroh at Application; BLE at Link | Augment, don't replace |
| **TCP reliability** | Challenge-response auth (like 3-way handshake) | Proven patterns |
| **Packet switching** | Relay sync on demand; shared capacity | Efficient for bursty traffic |
| **DNS hierarchy** | Self-certifying pubkeys (no hierarchy) | Flat = censorship-resistant |
| **RDT principles** | Checksums, timers, ACKs in Rust backend | Foundation of reliability |
| **P2P distribution** | Iroh content-addressed sharing | More peers = faster |
| **Delay calculation** | Tier 0 hardware constraint (1 Mbps target) | Design for reality |
| **CRC/link layer** | SHA-256 at application; hardware CRC below | Defense in depth |
| **BitChat dual transport** | BLE mesh (Phase 2+) + Nostr global | Borrow philosophy |

---

## References

- Kurose & Ross, *Computer Networking: A Top-Down Approach*, 8th ed. (2021)
- Kimura et al., "Not in The Prophecies: Practical Attacks on Nostr," EuroS&P 2025
- Biagioni, "Early Review of The BitChat Protocol," ICNC 2026
- Fausak et al., "Malicious Intent Detection Framework," AICCSA 2024

---

*This document bridges the gap between academic networking fundamentals and BlkSpace's decentralized architecture. The textbook provides the foundation; BlkSpace applies it to a real-world problem: HBCU student connectivity on low-end hardware.*
