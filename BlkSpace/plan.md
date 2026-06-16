# BlkSpace on WeixNet

**Project Spec / Planning Dashboard**  
**Date**: 2026-06-14  
**User**: Eric Brown (B.L.A.C.K. branding • TSU roots • Liberian background • cultural/creative/spiritual focus)  
**Status**: Phase 1 ACTIVE (Rev 7) • Core social + economy shipped • Phase 2 Iroh integration in progress  
**Core Constraint**: Build **bottom-up theoretical decentralized hub first**. No heavy devops until the model is solid.

---

## Vision Snapshot

**BlkSpace** is a Rust-powered, cross-platform (Linux • Mac • Windows) decentralized amalgamation social platform on **WeixNet**.

It combines the best of:
- Facebook / Instagram (social feeds & profiles)
- TikTok (short video + shop)
- YouTube (decentralized long-form video uploads & hosting)
- Newgrounds (creative uploads, art, music, community ratings)
- Discord (communities & chat)
- MySpace (highly customizable user pages + music embeds)
- TikTok Shop / Marketplace + NFT ticketing

**Key Economic Innovation**: Real memecoin "charted" currencies (**WeixBucks** everyday tier + **BlkCoin** premium meme-coin tier) that:
- Increment via uploads, engagement, and node participation
- Enable payments across the system (pay creators/users, pay viewers/engagers, marketplace settlements, tips, boosts, NFT claims, etc.)

**1/3 Already Developed (Pre-Dev)**: Full B.L.A.C.K. branding & history, personal/cultural content seeds (videography, scriptures interest via Bible NLP, photos, projects), extensive existing TSU code patterns (React UIs, Django APIs, ML pipelines), crypto research, and this planning work itself. This counts as substantial progress **before** any new code or devops.

**Foundational Directive (from user)**: 
> Build **bottom-up** first as a theoretical decentralized hub. WeixNet is a "decentralized ATM networking" (automated value transfer / payment / settlement hub) that can theoretically host, produce, share, and enable all the amalgamation concepts (media host/produce/share, marketplace, Discord-like, social) with real memecoin charted currencies that increment and flow as payments (pay users/creators, pay viewers/engagers, marketplace payments, etc.). 
> All these systems are designed for **low-end hardware** nodes that "harvest" (participate by providing relay/storage/pinning/light compute/validation) the decentralized hub. In return, the hub produces **EB Productions** (Eric Brown Productions — value, creative output, earnings, token rewards) for all contributors and benefactors using this new decentralized software. 
> The cross-platform clients (Linux, Mac, Windows) are the user-facing part; the hub is the theoretical foundation. Do not rush to devops (CI, scaling, production infra) until the bottom-up hub theory, token flows, node participation, and payment mechanics are modeled. Existing assets (branding, content, TSU code patterns) represent the "1/3 developed" pre-work.

---

## Table of Contents
- [Theoretical Core: WeixNet as Decentralized ATM Hub](#theoretical-core-weixnet-as-decentralized-atm-hub)
- [Existing Assets & "1/3 Pre-Work"](#existing-assets--13-pre-work)
- [Workspace Cleanup Strategy](#workspace-cleanup-strategy)
- [Tech Stack & Architecture](#tech-stack--architecture)
- [Economy & Tokenomics (WeixBucks / BlkCoin)](#economy--tokenomics-weixbucks--blkcoin)
- [Project Structure](#project-structure)
- [Phased Implementation (Pre-Dev Hub First)](#phased-implementation-pre-dev-hub-first)
- [Risks & Guardrails](#risks--guardrails)
- [Open Questions & Decisions Needed](#open-questions--decisions-needed)
- [Next Steps After Approval](#next-steps-after-approval)

---

## Theoretical Core: WeixNet as Decentralized ATM Hub

**Priority**: Fully model this **theoretically** before code or devops. This is the "bottom-up" foundation.

**What it is**  
A permissionless, decentralized "ATM" (automated teller/market/payment/settlement) networking layer. It hosts/produces/shares the full amalgamation: media (video uploads like YT, shorts like TT, music like MySpace, creative like Newgrounds), social feeds (FB/IG), communities (Discord-like), marketplace/shop (TT Shop + NFT ticketing), and value transfer.

**Memecoin Flows (Real Charted Currencies)**  
- **WeixBucks** (everyday tier): Earned via uploads + engagement + participation. Spendable on boosts, tips, marketplace, customizations, fees.  
- **BlkCoin** (premium meme-coin tier): Higher-value, earned via viral/top uploads + node contributions. Used for high-value items, NFT tickets, governance, prestige, future cashout.  
Currencies support payments: pay creators, pay viewers/engagers, marketplace settlements, tips, boosts, NFT claims, etc.

**Low-End Hardware Node Participation ("Harvest the Hub")**  
Designed for low-end hardware (old PCs, laptops, Raspberry Pi-class devices). Nodes harvest/contribute:
- Nostr-style relays (social/events gossip)
- Iroh/IPFS content pinning & storage (videos, photos, music, projects)
- Light validation / compute (rewards, anti-abuse, simple transcoding)
- Discovery & gossip for new users/content

**EB Productions for Contributors & Benefactors**  
Nodes + active participants produce **EB Productions** (Eric Brown Productions): earnings in the two currencies, hosted creative output, community uplift, token rewards. Contributors become benefactors through the loops. Directly extends B.L.A.C.K. mission of uplift via achievement, culture, knowledge — now with decentralized economics.

**Theoretical Modeling Required (Pre-Code)**  
- Token flow diagrams (sources: uploads + node work + engagement; sinks: spends + burns; payments between users/viewers/market)
- Node economics (what low-end hardware earns for harvesting, how it scales with more nodes)
- Hub capabilities (theoretically support all amalgam features without central servers)
- Security & fairness (decentralized, low-end accessible, resistant to abuse even on heterogeneous hardware)
- "Produce EB Productions" definition (hosted media, settled payments, distributed rewards, cultural/creative value)

**Why Bottom-Up & Pre-Devops**  
Ensures the hub can support Fizz-scale organic growth + Roblox-like economy + real memecoin payments + low-end participation **before** building clients or running infra. Clients (Tauri cross-platform) simply connect to and benefit from the hub. Devops comes later.

**Relation to Existing 1/3**  
B.L.A.C.K. branding becomes the cultural identity of the hub. Your existing content seeds the first EB Productions. TSU code patterns inform client thinking. Hub theory is the new integrative layer.

*(This section should be expanded with ASCII/text diagrams, flow models, and node participation spec before any implementation phases begin.)*

---

## Existing Assets & "1/3 Pre-Work"

**Branding & Cultural (hotencoderpy/)**  
- Multiple B.L.A.C.K. logos (blk999, blk_emblem, panafricanism, kwanzaa, fist/stole, scream, gameinc, symbols, Liberia flag)  
- B.L.A.C.K., Inc. PDFs (full history: Brothers for Love, Achievement, Culture & Knowledge, founded 1999 at TSU)  
- Related data & encoder scripts

**Personal & Creative Content**  
- Documents/ (resumes, transcripts, Black literature/music essays, crypto notes, Todo with YHWH/scripture focus, Camera Roll 2× .mp4 videography, headshots, community records, Kindle)  
- Future seeds: projects, scriptures (Bible NLP data + personal study), DJ mixes, photos, videography

**Code Patterns & Skills (no Rust yet)**  
- TSU software engineering full-stack (abc_management + copies): React/TSX + Bulma/router/axios + Django REST + djangorestframework + mysqlclient  
- Other React (projectBOA, lane-learning with antd, rreactproject with uuid)  
- Python/ML (myBibleNLP: full KJV Bible verse/author prediction notebooks + models + data; NFLinjuries: full scraper/cleaning/modeling/PowerBI pipeline)  
- Django projects, data handling, auth/API concepts

**Other**  
Crypto research notes, music passion docs, GitHub starters.

**WeixNet**  
User-coined. No public references. Interpreted as the decentralized ATM/hub layer (Nostr + Iroh/P2P with custom extensions for value transfer and the full amalgam).

---

## Workspace Cleanup Strategy

**Critical**: Never auto-delete. User machine with 100k+ items.

**Preserve & Organize (seed into BlkSpace later)**  
Documents/ (all personal/cultural/writing/crypto), hotencoderpy/ (full branding), valuable code projects (abc_management*, myBibleNLP, NFLinjuries, projectBOA, lane-learning, newDjango*, unique .py/.ipynb), Camera Roll videos, branding images, GitHub items.

**Archive (Games / Bloat / Filler — per explicit request)**  
- BrawlhallaReplays/ (60+ .replay files)  
- Gaming installs/replays (League, StarCraft, RealmOfTheMadGod, Sims 4, My Games, PCSX2)  
- Fightcade/ (large retro emulator + ROMs — user may selectively retain)  
- School homework (Assignments 3/5/6/8, Algorithms*, linked list, GCD, FinchSIM, etc. + all __pycache__ + .exe)  
- Duplicate folders (abc_management - Copy)  
- Outdated Pycharm venvs (2021 Python 3.9)  
- Compiled artifacts, old node_modules in copies, etc.

**Safe Process (User Executes)**  
1. Full backup of critical folders (Documents, Desktop school assignments, hotencoderpy) to external/cloud. Verify.  
2. In workspace: Create `BlkSpace-Archive-2026-PreClean/` (or date-stamped).  
3. Move bloat into Archive (do not delete yet).  
4. Generate inventory. Organize kept items into clear subfolders.  
5. User reviews → explicit confirmation before any final deletion.  
6. "Add back" happens inside the app via upload/organize flows (exactly the content that earns WeixBucks/BlkCoin and produces EB Productions).

---

## Tech Stack & Architecture

**Guiding Principles**  
Rust where it matters (security, crypto, P2P, economy engine). Leverage your React experience. Maximum OSS reuse. Local-first + decentralized. Secure by default. Cross-platform from day 1. Hub theory before heavy devops.

**Core Stack**  
- **Clients (UI)**: Tauri v2 (Rust backend + React 18 + TS + Tailwind). Tiny, secure, excellent Win/Mac/Linux. Leverage existing tsu-react patterns (routing, feeds, profiles).  
- **Decentralized Networking / Social (WeixNet)**: Nostr (nostr-sdk in Rust). Custom event kinds for all BlkSpace concepts (video + CID, shop listings, profile themes, rewards, payments, node contributions). Personal/community "WeixNet" relays (Rust relay options).  
- **Content / Media (decentralized uploads like YT + photos/music/creative)**: Iroh (modern Rust IPFS — blobs, gossip, video streaming mentions). Or Kubo sidecar. Upload → CID → Nostr event. ffmpeg for local processing (multi-res for YT-like experience).  
- **Economy / Payments / ATM Layer**: Simulated first (SQLite balances + signed Nostr events for every reward/tx). Later real on-chain (Solana for BlkCoin meme-coin + payments). Rewards engine in Rust (engagement signals from Nostr + local analytics).  
- **Wallet / Shop / NFT**: Solana integration (wallet connect, balances, payments) + Nostr listings. NFT ticketing stubs (on-chain or event-based). Marketplace with revenue share.  
- **Local State**: SQLite (cache, balances, history, offline queue). Tauri secure storage.  
- **Other OSS**: nostr (protocol + Rust libs), Tauri 2 + awesome-tauri, Iroh, Solana SDKs, ffmpeg, video players. Existing user code for UI/API/ML patterns.

**High-Level Architecture (Hub-Centric)**

```
Tauri Clients (Win/Mac/Linux)
├── React UI (feeds, uploads, wallet, shop, customizable profiles, communities)
└── Rust commands → WeixNet Hub (Nostr + Iroh + Economy Engine)

WeixNet Decentralized ATM Hub (theoretical core)
├── Nostr layer: social events, custom kinds, rewards, payments, node contributions
├── Iroh/IPFS layer: content blobs (video, audio, images, projects) — low-end pinning
├── Economy layer: WeixBucks / BlkCoin balances & txs (signed events), reward calculator, sinks, leaderboards
└── Value settlement: pay creators, pay viewers, marketplace payments, tips, boosts, NFT claims

Low-End Hardware Nodes (harvest the hub)
- Relay, pin, light compute/validation
- Earn/produce EB Productions (tokens + value) for contributors & benefactors
```

Data & value flow decentralized. No single owner of graph, content, or economy. Local-first with verifiable Nostr events for migration/audit.

**Why This for Solo + Scale**  
Mature 2026 OSS (Tauri examples like GitButler, strong Nostr Rust ecosystem, Iroh as efficient IPFS). Directly reuses your React + backend + ML experience. Hub theory + simulated economy keep early scope manageable while architecting for Fizz-scale growth and low-end participation.

---

## Economy & Tokenomics (WeixBucks / BlkCoin)

See the full "Theoretical Core" and "Economy & Tokenomics" sections above for details on:
- Upload + participation rewards (Fizz organic growth + Roblox Creator Rewards model)
- Two-tier system with clear spend sinks
- Simulated implementation (verifiable Nostr events + SQLite) that is robust and migratable
- Anti-abuse for scale
- Future real on-chain BlkCoin + DevEx-like cashout
- Alignment with B.L.A.C.K. uplift mission

---

## Project Structure (New Clean Repo)

Recommended: `C:\Users\viper\Projects\BlkSpace-WeixNet\` (or similar). Git init immediately.

Standard Tauri + React layout + `assets/` (B.L.A.C.K. logos + seed media) + `docs/` (this plan + hub diagrams + content inventory) + `.github/workflows/` (cross-platform builds).

Copy branding with attribution. Reference (do not blindly copy) existing TSU code patterns.

---

## Phased Implementation (Pre-Dev Hub First)

**Strong emphasis**: Theoretical hub modeling and pre-dev work (including this plan and any diagrams/node specs) come before heavy coding or any devops.

**Phase 0: Prep, Cleanup, Hub Theory Solidification (user-driven + planning)**
- Complete backup + selective archive (user executes).
- Expand this plan's "Theoretical Bottom-Up Decentralized Hub" section with ASCII diagrams, token flow models, node participation spec, EB Productions definition.
- Confirm "hub theory is solid" before moving to code.
- Init clean repo + basic docs.

**Phase 1: Identity + Basic Social + Economy Primitives (after hub theory approval)**
- Tauri scaffold + Nostr key/login + basic posts/profiles.
- Simulated economy foundation (balances, stub reward events on publish, anti-abuse, history view).
- Seed with existing branding/content.

**Phase 2: Decentralized Media + Content Rewards**
- Iroh + upload + players (video/audio/creative).
- Reward engine for uploads + engagement.
- "Add bloat back" local library foundation.

**Phase 3: Communities + Full Rewards Loop + Theming**
- Chat/communities.
- Mature Fizz/Roblox-inspired rewards (WeixBucks reliable + BlkCoin for top/viral + node contributions).
- Customizable profiles (MySpace vibe).

**Phase 4: Wallet + Shop/Marketplace + NFT + Real Memecoin Rails**
- Solana + in-app currency payments.
- Listings, revenue share, NFT ticketing.
- Purchase packs simulation + migration notes to real BlkCoin.

**Phase 5: Ops, Cross-Platform, Seeding, Release (after hub is proven in earlier phases)**
- GHA builds for all platforms.
- Self-host guidance for WeixNet relays/nodes (low-end friendly).
- Further seeding (Bible NLP as scripture creative, more personal projects/DJ mixes).
- Documentation of the hub.

**MVP Cutoff**: End of Phase 3 — working clients + live hub-connected rewards economy (earn from your uploads + engagement, spend, transparent history) on the theoretical WeixNet ATM foundation.

---

## Risks & Guardrails

- Scope + devops timing: Strict adherence to "hub theory first, no heavy devops until solid".
- Reward abuse at Fizz-scale: Heavy anti-abuse from Phase 1; transparent math; ML-informed signals later.
- Token/crypto compliance: Simulated first; clear disclaimers; design BlkCoin as meme + utility.
- Low-end hardware realities: Test assumptions on modest devices; keep node requirements light.
- Data/branding: Respectful use of B.L.A.C.K. assets; user consent for personal content seeding.
- Solo sustainability: Small vertical slices; reuse OSS; leverage existing 1/3.

---

## Open Questions & Decisions Needed

- Exact reward formulas, caps, "active engager" definition, node contribution rewards for low-end hardware.
- Preference for pure Nostr events vs hybrid for rewards/payments; timeline for real on-chain BlkCoin.
- Initial focus niches/circles (e.g. TSU/Black creative spaces first, like Fizz campuses)?
- Any specific diagrams or node specs you want modeled in the next planning update?
- Cleanup: Keep any gaming/emulator folders?
- Hard constraints (no Solana, pure Rust UI preference, specific anti-abuse rules)?

---

## Phase 0 Deliverables

WeixInfo concepts synthesized into `docs/`:

- [docs/INDEX.md](docs/INDEX.md) — documentation map
- [docs/concepts-review.md](docs/concepts-review.md) — full review of 98 weixinfo files
- [docs/hub-theory.md](docs/hub-theory.md) — token flows, node economics, EB Productions
- [docs/weixinfo-catalog.md](docs/weixinfo-catalog.md) — categorized source inventory
- [docs/features/](docs/features/) — LogosDecks, NFT DJ, media strategy, creative pipeline, stack reconciliation
- [docs/phase-0-status.md](docs/phase-0-status.md) — living checklist; **concepts agreed, code blocked**
- [docs/security-considerations.md](docs/security-considerations.md) — Nostr cryptographic risks
- [docs/solana-security.md](docs/solana-security.md) — Phase 4 on-chain security
- [docs/architecture-blueprint.md](docs/architecture-blueprint.md) — Federated mesh architecture
- [docs/federated-college-towns.md](docs/federated-college-towns.md) — Town relay spec
- [docs/reward-formulas.md](docs/reward-formulas.md) — Draft earn/spend (needs user review)
- [docs/nostr-event-kinds.md](docs/nostr-event-kinds.md) — Custom kind registry (draft)
- `Grok-Computer Networking Top-Down Approach Overview.json` — Source export archive

## Phase 0 — Still In Progress

Concept agreement does **not** open Phase 1. Remaining before any code:

1. Backup confirmation (user executes)
2. Workspace cleanup / archive moves (user executes, no auto-delete)
3. Content inventory of seed assets (populate with your paths)
4. Review draft `reward-formulas.md` numeric caps
5. Review draft `nostr-event-kinds.md` kind numbers
6. Node spec validated on actual low-end hardware
7. Explicit user signal: **"ready for Phase 1"**

### Phase 1 security hardening

- ✅ Backend event signature verification (`validate_incoming_event`)
- ✅ Event `id` must match canonical SHA-256 hash (Kimura §1.1)
- ✅ Unified relay ingest (`ingest_validated_relay_event` on background sync + `sync_town_events`)
- ✅ Engagement Quality signal in reward engine
- ✅ OS keychain / encrypted key storage (`key_store.rs`)
- ✅ Strict event signature verification in client UI (`SignatureBadge` + `SignatureWarningBanner`)
- ✅ Disable automatic link previews (`SafeContent` — no unfurl, `referrerPolicy=no-referrer`)
- ✅ UI warning on experimental private messages (`ExperimentalMessagingWarning`)
- ✅ Enforce `t:hbcu-town:*` at town relays (`validate_relay_event_tags` on ingest)
- ✅ Social Nostr publish requires user key (no ephemeral relay-manager key)
- ✅ Daily WB cap 250 + self-reply/self-like reward blocks

## Next Steps (Phase 0 only)

1. Track progress in [docs/phase-0-status.md](docs/phase-0-status.md).
2. No Tauri scaffold, no `Cargo.toml`, no devops until gate criteria met.
3. All destructive actions only after explicit per-step sign-off.
4. When truly ready, reply **"ready for Phase 1"** — not before.

---

*File placed on Desktop as requested: `C:\Users\viper\Desktop\weixnetproject\plan.md`*