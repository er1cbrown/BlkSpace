# BlkSpace Systems Architecture Blueprint

**Status:** Phase 0 — Authoritative reference (text companion to visual PDF)  
**Last Updated:** 2026-06-15  
**Version:** 1.0

---

## 1. Executive Summary

BlkSpace is a **hybrid, security-hardened, economically incentivized** decentralized social platform for college-town communities (HBCU-first), scaling to a federated mesh of small towns.

It avoids fully centralized platforms and pure P2P extremes. The core model is the **Federated College-Town Relay Mesh**.

---

## 2. Architectural Philosophy

1. **Pragmatic decentralization** — Town relays + selective sync, not global flood
2. **Defense in depth** — Client + relay + economic layers
3. **Hardware realism** — Tier 0 student laptops as design constraint
4. **Economic security** — Rewards are first-class; anti-Sybil built in

---

## 3. Layered Stack Mapping

| Internet layer | BlkSpace implementation |
|----------------|---------------------------|
| Application | Nostr (events) + Iroh (blobs) + Solana (Phase 4 settlement) |
| Transport | TCP (reliable sync) + UDP (optional local mesh) |
| Network | IPv4/IPv6 + Nostr relay mesh |
| Link | Wi-Fi + optional BLE mesh (local/offline) |
| Physical | Tier 0 laptops + standard NICs |

BlkSpace augments Application and Link layers; it does not replace the internet stack.

---

## 4. Core Design Patterns

### 4.1 Federated College-Town Relay Mesh (Model C)

- Each town runs one or more relays (Tier 1/2 hardware)
- Mandatory tag: `t:hbcu-town:<local>` (e.g. `t:hbcu-town:tsu`)
- Relays **reject** events without local town tag
- Cross-town via **explicit follows** or **trending summaries** (kind 1030)
- Prevents O(N²) flooding; enables multi-town growth

See `federated-college-towns.md` for detail.

### 4.2 Dual-transport (optional Phase 2+)

- **Local:** BLE mesh, TTL ~7 hops — dorms, events, poor connectivity
- **Global:** Nostr + Iroh when online
- Local events are signed Nostr-style; bridge to relays on reconnect

Inspired by BitChat analysis — **borrow philosophy, do not adopt full stack**.

### 4.3 Defense in depth

| Layer | Mechanism | Doc |
|-------|-----------|-----|
| Client | No auto link previews; signature verify | `security-considerations.md` |
| Relay | Town tags + anomaly detection | `federated-college-towns.md` |
| Economic | Engagement Quality multipliers | `reward-formulas.md` |
| On-chain | Anchor gates (Phase 4) | `solana-security.md` |

---

## 5. Economic Integration

- **WeixBucks:** Off-chain; Engagement Quality reduces suspicious rewards
- **BlkCoin:** On-chain Phase 4; staking/slashing for Tier 2 relays
- Relay flags can deprioritize cross-town caching for suspicious subgraphs

---

## 6. Scaling Strategy

Horizontal across towns (1 → 10 → 100+), not vertical on one global relay. Viral content replicates via engagement signals, not automatic global flood.

---

## 7. References

- Visual: `BlkSpace_Systems_Architecture.pdf` (local asset, not in repo)
- Grok export: `Grok-Computer Networking Top-Down Approach Overview.json`
- Kurose & Ross — delay, P2P distribution, TCP/UDP foundations
- Kimura et al. 2025 — Nostr attacks
- MIDF 2024 — relationship-based anomaly detection