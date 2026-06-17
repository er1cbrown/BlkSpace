# FLESHTHEORY.md — Comprehensive Theoretical & Practical Foundation

**Project**: BlkSpace on WeixNet  
**Author**: Eric Brown (WeixBlack / B.L.A.C.K. Inc.)  
**Date**: June 14, 2026  
**Status**: Phase 0 — Pre-Implementation (Rev 7, security + federated mesh)  
**Purpose**: Single source of truth before any code. Synthesizes `plan.md`, `weixinfo/` (98 research notes), and `docs/`.

---

## 1. Executive Summary

BlkSpace is a culturally grounded creator economy platform for HBCU students and Black creators, built on **WeixNet** — a decentralized ATM (Automated Value Transfer) networking layer.

Students and creators can:
- Share and monetize creative work (photography, videography, music, DJ mixes, writing, scripture creative)
- Build professional portfolios with MySpace-style customization
- Earn WeixBucks and BlkCoin through uploads, engagement, and node participation
- Access economic opportunities within a trusted cultural context (B.L.A.C.K. Inc., TSU roots)

**Core innovation**: Hardware-tiered hybrid decentralization starting from low-end student laptops (Tier 0), scaling upward — never gatekeeping core features.

**Current state**:
```
Phase 0 | Concepts: AGREED | Code: BLOCKED | User readiness: NOT YET
```

All stack and feature decisions below are agreed. Phase 1 code opens only when `docs/phase-0-status.md` gate criteria are met.

---

## 2. Vision & Mission

### Vision
Decentralized creative and economic infrastructure where HBCU students and Black creators own their content, earn fairly, and build sustainable value — on hardware they already have.

### Mission
Produce **EB Productions** (Eric Brown Productions):
1. Hosted media (video, audio, photos, scripture creative) on Iroh
2. Settled payments (WeixBucks/BlkCoin) with transparent Nostr audit trail
3. Distributed rewards for node operators and engagers
4. Cultural/creative uplift (B.L.A.C.K., TSU, Liberian heritage, scripture study)

### Guiding Principles
- **Hardware reality first** — Tier 0 is the design constraint
- **Cultural grounding** — B.L.A.C.K. identity is core, not decorative
- **Hybrid decentralization** — real protocols where they add value; simulate where accessibility requires it
- **Value flows to participants** — uploads, engagement, node work all earn
- **Hub theory before code** — no Tauri, no devops until Phase 0 gate passes
- **Bottom-up ATM model** — WeixNet settles value; clients connect to it

---

## 3. WeixInfo Research Synthesis (98 Files)

The `weixinfo/` folder contains exported DeepSeek research notes. Full catalog: `docs/weixinfo-catalog.md`. Summary:

| Category | Count | BlkSpace relevance |
|----------|-------|-------------------|
| BlkSpace / Web3 | 3 | Direct — blueprint, NFT DJ, Odysee |
| Creative features | 10 | High — Bible DJ, music, scripture, culture |
| Tech stack | 49 | Medium — networking, SQL, ML inform design |
| DevOps / tools | 12 | Low now — defer per Phase 0 hold |
| Academic / personal / misc | 24 | Archive or mission guardrails |

### Direct BlkSpace sources

| File | Key insight | Decision |
|------|-------------|----------|
| `BLKSPACE Blueprint Analysis.md` | Web3 BLGs, BLKCOIN, Rust blockchain stubs, Proxmox, Solana/Anchor | BLKCOIN → BlkCoin premium tier; **reject** custom PoW chain and early Proxmox |
| `NFT DJ Mix Creation Guidance.md` | Mint DJ mixes as NFTs on WeixNet | Upload rewards Phase 2; NFT Phase 4; WeixNet = settlement hub |
| `Odysee content creation legitimacy analysis.md` | LBRY dead; build-your-own Odysee impractical | **Nostr + Iroh**; skip LBRY fork |

### Creative feature sources

| File | Feature | Phase |
|------|---------|-------|
| `Bible DJ Software Concept Design.md` | **LogosDecks** — chapters=albums, verses=tracks, Serato-like scripture mixing | 5 (metadata stub Phase 2) |
| `Building Religious Text Analysis GUI Project.md` | Book/chapter/verse DataFrame reader | 5 |
| `Python Script for DJ Audio Conversion.md` | yt-dlp → MP3 for Mixxx/VirtualDJ | Pre-upload tooling |
| `Music Playlist Analysis.md` | 6,213-track DJ metadata (BPM, key, genre) | Profile music embeds |
| `Genesis Chapters 1-41 Summary Overview.md` | Genesis summaries from `gntDraft1.xml` | Seed content |

### Cross-cutting lessons

1. **Rust for hub core** — blueprint + plan; not custom OS (TempleOS guide rejected)
2. **LBRY is legacy** — Odysee analysis validates Nostr+Iroh
3. **Solo PM discipline** — Full Stack vs Minimal: MVP, MoSCoW, parking lot for scope creep
4. **Ethics as guardrails** — no children's facial recognition; transparent reward math; cultural respect
5. **ML later** — PySpark→LLM, DistillGPT2, myBibleNLP inform Phase 5 anti-abuse and scripture

---

## 4. Hardware-Tiered Architecture

### Tier 0 — Foundation (Primary Target)
- **Hardware**: Low-end Windows laptops (4–8 GB RAM, older Intel/AMD, integrated graphics)
- **Users**: Majority of HBCU students
- **Node roles**: Lightweight Nostr relay/client, personal pinning, event publish/receive, local SQLite reward cache, offline-first sync
- **Client**: Lightweight Tauri UI, basic media playback, portfolio tools
- **Earnings**: WeixBucks via content + engagement

### Tier 1 — Enhanced
- **Hardware**: Mid-range laptops, Mac M1
- **Node roles**: Persistent relay, broader pinning, light validation/anti-abuse signals
- **Earnings**: Higher node contribution rewards

### Tier 2 — Advanced
- **Hardware**: M4 MacBooks, university lab machines
- **Node roles**: Heavy pinning, compute/validation, support lower tiers
- **Role**: Network backbone

**Design rule**: No mandatory feature that fails on Tier 0. Higher tiers accelerate and increase rewards only.

### Node harvest economics (draft)

| Role | WeixBucks (simulated) | BlkCoin trigger |
|------|----------------------|-----------------|
| Relay uptime (heartbeat) | 1–5 / hour | Weekly top-10% nodes |
| Pin popular CID | 0.1 per serve | Pinning viral content |
| Validate reward events | 0.5 per batch | Accuracy streak |

Numeric caps: Phase 0 remaining item — see `docs/hub-theory.md`.

---

## 5. WeixNet — Decentralized ATM Layer

WeixNet hosts, produces, shares, and settles value across the full amalgamation:

```
Tauri Clients (Win/Mac/Linux)
├── React UI (feeds, uploads, wallet, shop, profiles, communities)
└── Rust commands → WeixNet Hub

WeixNet Hub
├── Nostr: social events, custom kinds, rewards, payments, node contributions
├── Iroh: content blobs (video, audio, images, projects)
├── Economy: WeixBucks / BlkCoin balances & txs (signed events)
└── Settlement: pay creators, viewers, marketplace, tips, boosts, NFT claims

Low-End Nodes (harvest)
└── relay · pin · validate · optional ffmpeg transcode
```

### Capability matrix

| Capability | Layer | Amalgam reference |
|------------|-------|-------------------|
| Social feeds & profiles | Nostr | Facebook / Instagram |
| Short + long video | Iroh + Nostr CID | TikTok + YouTube |
| Music / creative | Iroh + metadata | MySpace + Newgrounds |
| Communities / chat | Nostr DMs + groups | Discord |
| Marketplace | Nostr listings + settlement | TikTok Shop |
| Profile themes | Nostr profile + theme CID | MySpace |
| Rewards / payments | Signed economy events | WeixBucks / BlkCoin |
| Node contributions | Node-reward events | Low-end harvest |

### Authoritative stack (reconciled from blueprint + plan)

| Component | Choice | Rejected |
|-----------|--------|----------|
| Client | Tauri v2 + React 18 + TS + Tailwind | — |
| Social | `nostr-sdk` | LBRY events |
| Content | Iroh + ffmpeg | LBRY/Odysee fork, Kubo-only |
| Economy | Rust engine + SQLite + signed Nostr | Custom PoW chain |
| On-chain | Solana Phase 4 (BlkCoin SPL, NFT) | Early Anchor deploy |
| Infra | Deferred | Proxmox, Cozystack, GHA (until Phase 5) |

### Systems architecture — Federated College-Town Relay Mesh

BlkSpace uses **Model C** (see `docs/architecture-blueprint.md`): town-level relays with mandatory `t:hbcu-town:<local>` tags, selective cross-town sync via follows and trending summaries (kind 1030). This avoids O(N²) event flooding while scaling across HBCU/college towns.

Optional Phase 2+ **dual-transport**: BLE mesh for local/offline (BitChat-inspired), Nostr + Iroh for global reach. Tier 0 devices remain clients; relay duty is Tier 1+.

### Security & trust model (June 2026)

Kimura et al. (EuroS&P 2025) identified Nostr DM weaknesses (unauthenticated CBC, link-preview attacks). **Official position:** Nostr encrypted DMs are untrusted for sensitive coordination.

Mitigations (`docs/security-considerations.md`):

- Strict signature verification; required town tags at relays
- Disable automatic link previews (manual, sender-side preferred)
- Relay-side anomaly detection (rate limits, star-pattern, new-account spikes)
- Engagement Quality multiplier in reward formulas
- Solana Phase 4: Anchor + checked math — see `docs/solana-security.md`

---

## 6. Tokenomics (WeixBucks + BlkCoin)

### WeixBucks (Everyday)
- Earned: uploads, engagement, light node work
- Spent: tips, boosts, customization, marketplace fees, basic NFT claims
- High velocity, simulated first

### BlkCoin (Premium Meme-Coin)
- Earned: viral/top content, sustained node contributions, governance
- Spent: high-value NFT tickets, prestige features, future cashout
- Lower supply, Phase 4 on-chain via Solana

### Economic loops

```
SOURCES                    SINKS
───────                    ─────
Uploads ──────┐            Tips
Engagement ───┼→ Reward ──→ Boosts
Node work ────┘   Engine    Marketplace
                            Fees / burns
                            Anti-abuse penalties
```

All txs = **signed Nostr events** + SQLite local cache. Nostr is audit trail; SQLite is offline cache.

### Creative reward triggers (draft)

| Content | Upload | Engagement |
|---------|--------|------------|
| DJ mix | WeixBucks base | Listener pool |
| Video | WeixBucks base | Per-minute micro-reward |
| Scripture mix (LogosDecks) | WeixBucks base | Cross-ref discovery bonus |
| Viral (top 1% weekly) | — | BlkCoin grant |

---

## 7. Feature Specifications (from weixinfo)

Detailed specs in `docs/features/`:

### LogosDecks (Bible DJ)
- Verse = track, chapter = album, author = artist, literary genre = genre
- Modes: Hermeneutical Sync, Sermon Constructor, Gospel vs. Law battle
- Integration: upload type `scripture-mix` in BlkSpace — not standalone app for MVP
- Spec: `docs/features/logos-decks.md`

### NFT DJ Mixes
- Flow: local mix → Iroh upload → WeixBucks → Phase 4 BlkCoin NFT ticket
- Profile music embed (MySpace pattern)
- Spec: `docs/features/nft-dj-mixes.md`

### Decentralized Media
- Skip LBRY; Nostr gossip + Iroh blobs + optional node pinning
- ffmpeg local transcode before upload
- Spec: `docs/features/decentralized-media.md`

### Creative Pipeline
- Verticals: scripture, DJ/music, videography, B.L.A.C.K. branding, cultural/educational
- Ingest via Tauri upload ("add bloat back" — no folder sync)
- Spec: `docs/features/creative-pipeline.md`

---

## 8. Existing Assets & Pre-Work (~1/3 Foundation)

**Branding**: B.L.A.C.K. logos (blk999, panafricanism, kwanzaa, Liberia flag, etc.); org history PDFs  
**Creative**: Camera Roll videography, headshots, DJ mixes, photos, essays  
**Technical**: React/TSX (TSU projects), Django REST, myBibleNLP, NFLinjuries pipeline  
**Validation**: 2nd place — Bank of America HBCU Code-A-Thon (ProjectConnectTSU)  
**Research**: 98 weixinfo notes + this documentation pass

External paths (not in repo): `hotencoderpy/`, `Documents/`, `abc_management*`, `myBibleNLP` — content inventory is Phase 0 remaining item.

---

## 9. Agreed Decisions (June 14, 2026)

| Item | Decision |
|------|----------|
| Stack | Nostr + Iroh; skip LBRY |
| Economy | Simulated first; Solana Phase 4 |
| Tokens | WeixBucks + BlkCoin |
| Niche | TSU / Black creative circles first |
| LogosDecks | Full UI Phase 5; metadata Phase 2 |
| Settlement | Pure Nostr signed events Phases 1–3 |
| MVP | End of Phase 3 |
| Code | **Blocked** — Phase 0 continues |

---

## 10. Phase 0 Checklist

### Done
- [x] THEORY.md + FLESHTHEORY.md (Rev 7)
- [x] plan.md Rev 6
- [x] docs/ synthesis (hub-theory, concepts-review, features, catalog, phase-0-status)
- [x] Security + architecture docs (from Grok JSON export)
- [x] weixinfo/ archived in repo (98 files)
- [x] Grok JSON export archived
- [x] Concept agreement

### Remaining (before Phase 1)
- [ ] Backup confirmation
- [ ] Workspace cleanup → archive folder (no delete)
- [ ] Content inventory (external asset paths) — template pending user data
- [ ] User review of draft `reward-formulas.md` numeric caps
- [ ] User review of draft `nostr-event-kinds.md` kind numbers
- [ ] Node spec on actual hardware
- [ ] User: **"ready for Phase 1"**

---

## 11. Roadmap (Aligned with plan.md)

| Phase | Deliverable |
|-------|-------------|
| **0** (now) | Theory, weixinfo synthesis, backup, inventory |
| **1** | Tauri + Nostr key/login + posts/profiles + stub economy |
| **2** | Iroh upload + players + upload rewards + DJ mixes |
| **3** | Communities + full rewards + MySpace themes — **MVP** |
| **4** | Solana BlkCoin + marketplace + NFT DJ tickets |
| **5** | LogosDecks + Bible NLP + GHA builds + node self-host docs |

---

## 12. Risks & Guardrails

- **Scope creep**: Phase 0 hold enforced; parking lot for new ideas
- **Hardware overreach**: Tier 0 gate on every feature
- **Token compliance**: Simulated + labeled; BlkCoin = meme + utility
- **Over-promising decentralization**: Hybrid MVP honest; full hub is documented future
- **LBRY temptation**: Research confirms skip — do not fork Odysee
- **Early devops**: OpenClaw/homelab notes exist but deferred
- **Solo sustainability**: Vertical slices; OSS reuse; existing 1/3 assets
- **Ethics**: Cultural respect, children's wellbeing, transparent math, no facial recognition on minors

---

## 13. Documentation Index

| Path | Role |
|------|------|
| `THEORY.md` | Investor / hackathon summary |
| `FLESHTHEORY.md` | This file — full baseline |
| `plan.md` | Detailed spec + cleanup strategy |
| `docs/INDEX.md` | Docs map |
| `docs/hub-theory.md` | Token flows, nodes, EB Productions |
| `docs/concepts-review.md` | Weixinfo → BlkSpace review |
| `docs/phase-0-status.md` | Living gate checklist |
| `docs/features/` | LogosDecks, NFT DJ, media, pipeline, stack |
| `docs/security-considerations.md` | Nostr risks + mitigations |
| `docs/solana-security.md` | Phase 4 on-chain security |
| `docs/architecture-blueprint.md` | Federated mesh + stack mapping |
| `docs/federated-college-towns.md` | Town relay spec |
| `docs/reward-formulas.md` | Draft earn/spend math |
| `docs/nostr-event-kinds.md` | Custom kind registry |
| `weixinfo/` | Raw research archive |
| `Grok-*.json` | Grok chat export (networking + security) |

---

## 14. Summary

FLESHTHEORY.md is the comprehensive baseline: vision, weixinfo research, hardware tiers, WeixNet hub, tokenomics, creative features, agreed decisions, and Phase 0 gate — all before a single line of application code.

The goal is the most useful system that runs on real HBCU student hardware today, with a credible path to full decentralization and BlkCoin ownership tomorrow.

---

*End of FLESHTHEORY.md — Rev 6, weixinfo-integrated*