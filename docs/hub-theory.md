# WeixNet Hub Theory

**Theoretical foundation for BlkSpace** — model this before code or devops.  
Synthesized from `plan.md` + weixinfo cross-cutting concepts.

---

## What WeixNet Is

WeixNet is a **decentralized ATM (automated teller/market/payment/settlement) networking layer**. It is not a single app — it is the hub that clients and low-end nodes connect to.

```
                    ┌─────────────────────────────────────┐
                    │         WeixNet ATM Hub             │
                    │  Nostr events + Iroh blobs + Economy │
                    └──────────────┬──────────────────────┘
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
    Tauri Clients            Low-End Nodes           Other Relays
    (Win/Mac/Linux)     (relay/pin/validate)      (community mesh)
```

**ATM metaphor:** Like a bank network that moves value automatically — but permissionless, peer-to-peer, and earned through participation (uploads, engagement, node work).

---

## Hub Capabilities (Theoretical)

The hub must theoretically support the full amalgamation without central servers:

| Capability | Protocol layer | Notes |
|------------|----------------|-------|
| Social feeds & profiles | Nostr custom kinds | FB/IG-style posts, follows |
| Short + long video | Iroh CID + Nostr event | YT + TikTok patterns |
| Music / creative uploads | Iroh + metadata events | MySpace + Newgrounds |
| Communities / chat | Nostr DMs + group kinds | Discord-like |
| Marketplace / shop | Nostr listings + settlement events | TT Shop pattern |
| Custom profile themes | Nostr profile + CSS/theme CID | MySpace vibe |
| Rewards & payments | Signed Nostr economy events | WeixBucks / BKSPC |
| Node contributions | Nostr node-reward events | Low-end harvest |

---

## Token Flow Model

### Two-Tier Currency

| Token | Tier | Earned via | Spent on |
|-------|------|------------|----------|
| **WeixBucks** | Platform credits (earn-only) | Uploads, engagement, light node work | Tips, boosts, marketplace (published fees) |
| **BKSPC** | BlkSpace Settlement (counsel-gated) | Optional withdrawal of **earned** WB only | On-chain receipt; not daily earn or speculation |

### Sources (Mint / Earn)

```
┌─────────────┐   ┌──────────────┐   ┌─────────────────┐
│   Upload    │   │  Engagement  │   │  Node harvest   │
│  (media,    │   │  (likes,     │   │  (relay, pin,   │
│   posts)    │   │   comments,  │   │   validate)     │
│             │   │   watch time)│   │                 │
└──────┬──────┘   └──────┬───────┘   └────────┬────────┘
       │                 │                     │
       └─────────────────┼─────────────────────┘
                         ▼
              ┌──────────────────────┐
              │  Reward Calculator   │
              │  (Rust engine)       │
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │ Signed Nostr event   │
              │ + SQLite balance     │
              └──────────────────────┘
```

### Sinks (Spend / Burn)

- Tips to creators
- Boosts (feed visibility)
- Marketplace purchases
- Profile theme unlocks
- NFT ticket claims
- Transaction fees (small burn to limit inflation)
- Anti-abuse penalties (balance freeze or burn)

### Payment Loops

```
Creator ←── tip ── Viewer
Creator ←── purchase ── Buyer (marketplace)
Node operator ←── harvest reward ── Hub
Engager ←── micro-reward ── Hub (watch/comment incentives)
```

Every reward and payment is a **signed Nostr event** verifiable by any client. SQLite is a local cache; Nostr is the audit trail.

---

## Node Participation ("Harvest the Hub")

Designed for **low-end hardware** (old laptops, Raspberry Pi-class).

| Role | What node does | Minimum hardware |
|------|----------------|------------------|
| Relay | Gossip Nostr events | 512MB RAM, intermittent net |
| Pin | Store Iroh blobs (photos, audio, video) | 32GB+ storage, modest CPU |
| Light validate | Verify reward signatures, simple checks | Same as relay |
| Light transcode | Optional ffmpeg for one resolution | 2GB RAM if enabled |

### Node Economics (Draft — needs user approval)

| Contribution | WeixBucks/hour (simulated) | BKSPC settlement (Phase 4) |
|--------------|---------------------------|-----------------|
| Relay uptime (verified heartbeat) | 1–5 | Weekly top-10% nodes |
| Pin popular CID (served N times) | 0.1 per serve | Pinning viral content |
| Validate reward events | 0.5 per batch | Consistent accuracy streak |

**Scaling rule:** More nodes → same reward pool splits thinner (Odysee lesson applied inversely — we cap per-node earnings to prevent farm abuse).

---

## EB Productions

**Definition:** Eric Brown Productions — the creative and economic output the hub produces for contributors and benefactors.

EB Productions includes:

1. **Hosted media** — videos, DJ mixes, scripture creative, photos pinned on Iroh
2. **Settled payments** — WeixBucks/BKSPC flows with transparent history
3. **Distributed rewards** — node operators and engagers earn for participation
4. **Cultural/creative value** — B.L.A.C.K. branding, TSU roots, Liberian heritage, scripture study

A node or user "produces EB Productions" when their participation results in verifiable value on the hub — not just personal files on disk.

---

## Why Not LBRY/Odysee (from weixinfo)

`Odysee content creation legitimacy analysis.md` concludes:

- LBRY Inc. is defunct; LBC token illiquid
- Protocol is legacy/hobbyist
- Building on LBRY is technically possible but not viable long-term

**WeixNet decision:** Nostr (social/events) + Iroh (content blobs). Skip LBRY fork.

---

## Security & Fairness

| Threat | Mitigation |
|--------|------------|
| Reward farming | Rate caps, device fingerprinting (light), ML signals later |
| Sybil nodes | Stake-free but reputation-weighted; new nodes earn less |
| Content abuse | Community reports + signed moderation events |
| Token inflation | Sinks + daily earn caps per pubkey |
| Low-end overload | Optional roles; transcode is opt-in |

---

## Simulated → On-Chain Migration Path

**Phase 1–3:** SQLite balances + signed Nostr events (fully verifiable, no chain fees).  
**Phase 4:** Solana BKSPC settlement + NFT ticketing.
**Migration:** Export Nostr event history → anchor summaries on-chain; user opt-in wallet connect.

---

## Agreed Decisions (2026-06-14)

| Item | Decision |
|------|----------|
| Stack | Nostr + Iroh; skip LBRY |
| Economy | Simulated first; Solana Phase 4 |
| Tokens | WeixBucks + BKSPC two-tier |
| Niche | TSU / Black creative circles first |
| LogosDecks | Full deck UI Phase 5; metadata stub Phase 2 |
| Settlement | Pure Nostr signed events for Phase 1–3 |
| MVP scope | End of Phase 3 |

## Still To Model (Phase 0 — before code)

- [ ] Exact reward formulas and daily caps (numbers, not ranges)
- [ ] "Active engager" definition for micro-rewards
- [ ] Official Nostr kind number assignments
- [ ] Node spec tested on user's actual hardware

---

## Gates

**Concept gate:** Passed — user agrees to all documented decisions.  
**Code gate:** **Not passed** — user explicitly staying in Phase 0.  
**Phase 1 opens when:** `docs/phase-0-status.md` remaining items complete + user says **"ready for Phase 1"**.