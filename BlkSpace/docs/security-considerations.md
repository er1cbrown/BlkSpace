# Security Considerations for BlkSpace

**Status:** Phase 0 — Living document  
**Last Updated:** 2026-06-15  
**Source:** Grok JSON export + Kimura et al. (EuroS&P 2025) analysis  
**Scope:** Nostr risks, cryptographic weaknesses, mitigation for BlkSpace / WeixNet

---

## 1. Executive Summary

BlkSpace uses Nostr for its social and event layer. Kimura et al. (EuroS&P 2025) identified practical flaws in Nostr specs and popular clients: signature bypasses, unauthenticated CBC encryption in DMs, and confidentiality attacks via link previews.

These are **containable** within BlkSpace because of:

- Federated college-town relay mesh (`t:hbcu-town:*` tagging)
- Selective cross-town sync (follow-based + trending summaries)
- Economic layer (WeixBucks / BlkCoin) usable for defense

**Core policy:** Nostr encrypted DMs (NIP-17/44) are **untrusted** for sensitive or high-value coordination.

---

## 2. Threat Model

### Primary threat actors

- **Malicious user / Sybil farm** — forge engagement, farm WeixBucks
- **Malicious town relay** — inject forged events, exploit DM weaknesses
- **Network attacker** — traffic analysis, link-preview side channels

### Assets to protect

- User identity and reputation
- Reward integrity (WeixBucks, future BlkCoin)
- Content authenticity (Iroh blobs)
- Confidentiality of coordination messages

---

## 3. Known Nostr Risks

| Attack | Severity | Affected component |
|--------|----------|-------------------|
| Signature verification bypass | High | All events |
| Encrypted DM forgery (AES-CBC, no MAC) | Critical | NIP-17 / NIP-44 |
| Confidentiality via link preview + CBC malleability | Critical | DMs + previews |
| Cache poisoning | Medium | Client cache |

**Root causes:** Unauthenticated encryption, weak client verification, dangerous feature/crypto interactions.

---

## 4. Mitigation Strategy

### 4.1 Before Phase 1 (Phase 0 tasks)

| # | Mitigation | Location |
|---|------------|----------|
| 1 | Disable automatic link previews (manual, sender-side preferred) | Client |
| 2 | Strict signature verification on every event | Client + relay |
| 3 | Reject events missing `t:hbcu-town:*` at town relays | Relay |
| 4 | UI warning on experimental private messages | Client (Phase 1) |
| 5 | Document risks in theory docs | Done |

### 4.2 Phase 1

**Client:** Validation pipeline (signature → tags → size). Cache by `(event_id, relay_url)`. Opt-in previews only.

**Relay:** Rate limits per pubkey; spike detection from new accounts; star-pattern detection (7-day local graph). No auto-forward of encrypted DMs across towns.

**Rewards:** Engagement Quality multiplier — penalize engagement from accounts < 24h old and star-shaped interaction graphs.

### 4.3 Phase 2+

- Custom ECDH + AES-GCM channel for sensitive coordination (not NIP-17/44 alone)
- Signed Iroh blob manifests from uploader pubkey
- Relay reputation scores (uptime + anomaly rate)
- Cross-town sync limited to follows or kind 1030 trending summaries

### 4.4 Phase 4–5

- High-value settlement on Solana — see `solana-security.md`
- Lightweight ML/statistical anomaly detection on Tier 2+ nodes (MIDF-inspired)

---

## 5. Private Messaging Policy

> BlkSpace does **not** consider Nostr encrypted DMs (NIP-17/44) sufficient for high-value, private, or economically sensitive communication.

| Tier | Usage |
|------|-------|
| Casual | Nostr DMs with UI warning |
| Coordination / rewards | Custom authenticated encryption |
| High-value | Defer or out-of-band until Phase 3+ |

---

## 6. References

- Kimura et al., "Not in The Prophecies: Practical Attacks on Nostr", EuroS&P 2025
- MIDF (Fausak et al., AICCSA 2024) — relationship-based signals
- `docs/architecture-blueprint.md` — federated mesh context
- `docs/federated-college-towns.md` — relay enforcement