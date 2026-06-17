# Federated College-Town Relay Mesh

**Status:** Phase 0 — Architecture spec  
**Last Updated:** 2026-06-15  
**Related:** `architecture-blueprint.md`, `security-considerations.md`

---

## Problem

Pure global Nostr relays create bottlenecks and trust concentration. Pure P2P floods low-end hardware (O(N²) events). BlkSpace needs **isolation + controlled interconnection**.

---

## Solution: Model C

Each college town operates local relays. Events are partitioned by community tag.

```
Town A (TSU)          Town B (Fisk)         Town C (...)
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ strfry/proxy│       │ strfry/proxy│       │ strfry/proxy│
│ t:hbcu-town:│       │ t:hbcu-town:│       │ t:hbcu-town:│
│ tsu         │       │ fisk        │       │ ...         │
└──────┬──────┘       └──────┬──────┘       └──────┬──────┘
       │    follow / trending sync only           │
       └──────────────────┼──────────────────────┘
                          ▼
              Selective cross-town content
```

---

## Tag Schema

| Tag | Purpose | Example |
|-----|---------|---------|
| `t:hbcu-town:<id>` | **Required** on all local events | `t:hbcu-town:tsu` |
| `t:blkspace` | Platform identifier | `t:blkspace` |
| `t:content:<type>` | Upload category | `t:content:dj-mix` |
| `t:location` | Optional campus geohash | Phase 2+ |

**Relay rule:** Reject any event missing the relay's local `t:hbcu-town:*` tag.

---

## Cross-Town Sync

1. **Explicit follow** — User follows pubkey in another town → pull their events
2. **Trending summary** — Kind `1030` (draft) aggregated highlights, not full firehose
3. **No full mesh** — Towns never auto-sync entire feeds

---

## Relay Roles by Tier

| Tier | Hardware | Relay duty |
|------|----------|------------|
| 0 | Student laptop | Client only; optional light read |
| 1 | Mid-range / M1 | Persistent town relay + pinning |
| 2 | Lab / M4 | Backbone relay + anomaly scoring |

---

## Relay-Side Security

- Mandatory signature verification
- Rate limit per pubkey
- Star-pattern detection (many new accounts → one uploader)
- Spike detection (engagement burst from < 24h accounts)
- Do not auto-forward encrypted DMs to other towns

---

## Economic Incentives

- Tier 1+ relays earn WeixBucks for uptime heartbeat
- BlkCoin grants for top-10% weekly relay operators (Phase 3+ simulated, Phase 4 on-chain)
- Flagged subgraphs → reduced cross-town cache priority

---

## Phase Rollout

| Phase | Deliverable |
|-------|-------------|
| 1 | Single town relay (TSU); tag enforcement |
| 2 | Second town test; follow-based sync |
| 3 | Trending summaries; multi-town gossip |
| 5 | Self-host guide for low-end relay operators |