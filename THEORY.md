# THEORY.md — Streamlined Project Theory (Investor & Hackathon Ready)

**Project**: BlkSpace / BlkHub (powered by WeixNet)  
**Tagline**: A culturally grounded creator economy for HBCU students — built for the computers they actually use.  
**Date**: June 15, 2026  
**Phase**: 0 — Concepts agreed; security docs added; code not started  
**Research base**: `weixinfo/` (98 notes) + Grok JSON export → `docs/`

---

## Vision

BlkSpace enables HBCU creators to share work, build portfolios, earn meaningful rewards, and access real economic opportunities — starting on the laptops students already own.

It combines social connection, creative expression, and economic participation in one accessible experience, grounded in B.L.A.C.K. Inc. identity (Brothers for Love, Achievement, Culture & Knowledge — founded 1999 at TSU).

**WeixNet** is the decentralized ATM (automated value transfer) hub underneath: Nostr for social and payments, Iroh for content, Rust for the economy engine.

---

## The Problem

HBCU students produce significant cultural, creative, and intellectual value, yet lack platforms that:

- Let them monetize on their own terms
- Build portfolios leading to internships and jobs
- Run on everyday low-end hardware
- Reflect authentic cultural context

Existing platforms extract value, require high-end hardware, or offer no real earning paths for emerging creators. Legacy decentralized video (LBRY/Odysee) is no longer viable — our research confirms active protocols (Nostr + Iroh) are the path forward.

---

## The Solution

**Hardware-aware hybrid decentralization:**

- **Tier 0 first**: Low-end Windows laptops (4–8 GB RAM) — primary target
- **Federated town relays**: `t:hbcu-town:*` tags; selective cross-town sync (not global flood)
- **Real protocols where they fit**: Nostr for social/events; Iroh for media (Phase 2+)
- **Security-first**: Nostr DMs untrusted; Anchor on-chain in Phase 4 only
- **Simulated economy first**: Signed Nostr events + SQLite — verifiable, migratable to on-chain BKSP (Phase 4)
- **Two-tier rewards**: WeixBucks (everyday) + BKSP (BLKSPACE COIN, counsel-gated)
- **Cultural core**: TSU / Black creative circles as initial niche

Higher tiers (M1, lab machines) unlock more node earnings — never gatekeep core features.

---

## Key Features (MVP — End of Phase 3)

- Customizable profiles with portfolio sections (MySpace-style themes + music embeds)
- Content feed: photos, short/long video, DJ mixes, creative work
- Transparent WeixBucks rewards for uploads and engagement
- Basic marketplace (services, digital goods, merch)
- Portfolio export for internships

### Future creative verticals (from weixinfo research)

| Feature | Source | Phase |
|---------|--------|-------|
| **LogosDecks** — scripture as DJ sets (chapters = albums, verses = tracks) | Bible DJ Software Concept Design | 5 |
| **NFT DJ mixes** — mint limited editions on WeixNet | NFT DJ Mix Creation Guidance | 4 mint / 2 upload |
| **Bible NLP reader** — cross-book scripture analysis | Religious Text GUI + myBibleNLP | 5 |
| **Decentralized media** — skip LBRY; Nostr + Iroh | Odysee legitimacy analysis | 2 |

---

## Technical Approach

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Client | Tauri v2 + React 18 + TypeScript + Tailwind | Cross-platform, lightweight |
| Social | Nostr (`nostr-sdk`) | Proven, low-end friendly |
| Content | Iroh (Rust IPFS) + ffmpeg | Modern, actively maintained |
| Economy | Rust engine + SQLite + signed Nostr events | Simulated first; Solana Phase 4 |
| Rejected | LBRY fork, custom PoW chain, heavy Proxmox devops | weixinfo + blueprint reconciliation |

**EB Productions**: Hosted media + settled payments + node rewards + cultural uplift — the measurable output the hub produces for contributors.

---

## Why This Matters (Bank of America / HBCU Context)

- **Financial inclusion**: Tangible earning and skill-building for HBCU students
- **Career pipeline**: Portfolios → internships (2nd place BoA HBCU Code-A-Thon — ProjectConnectTSU)
- **Cultural impact**: TSU roots, Liberian heritage, B.L.A.C.K. mission — not generic tech
- **Technical realism**: Hybrid decentralization on real student hardware
- **Research-backed**: 98 weixinfo notes + Odysee post-mortem inform stack choices

---

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| **0** | Hub theory, weixinfo synthesis, backup/cleanup | **In progress** — concepts agreed |
| **1** | Tauri + Nostr identity + stub economy | Blocked until Phase 0 gate |
| **2** | Iroh uploads, DJ/media rewards | Planned |
| **3** | Communities, full rewards loop, profile themes | **MVP cutoff** |
| **4** | Solana BKSP, NFT tickets, marketplace | Planned |
| **5** | LogosDecks, Bible NLP, cross-platform release | Planned |

**Phase 0 gate before code**: backup done, content inventory, reward formulas, node spec on real hardware, user says "ready for Phase 1".

---

## Agreed Decisions (June 14, 2026)

- Nostr + Iroh hub; skip LBRY
- Simulated economy → Solana BKSP in Phase 4
- WeixBucks + BKSP two-tier
- TSU / Black creative circles first
- No custom PoW blockchain
- Defer heavy devops until hub proven

---

## Documentation Map

| File | Audience |
|------|----------|
| `THEORY.md` | Investors, hackathon judges (this file) |
| `FLESHTHEORY.md` | Full technical + theoretical baseline |
| `plan.md` | Detailed project spec |
| `docs/` | Hub theory, feature specs, weixinfo catalog |
| `weixinfo/` | Raw research archive (98 files) |

---

## Summary

BlkSpace is a culturally authentic, hardware-conscious creator economy — researched, theorized, and agreed — now in Phase 0 documentation before a single line of app code.

```
Phase 0 | Concepts: AGREED | Code: BLOCKED | Repo: ready for GitHub
```

---

*End of THEORY.md — Rev 6, weixinfo-integrated*