# Documentation — read this if the repo feels overwhelming

BlkSpace has **50+ docs**. Most people only need **one file** from each column:

---

## Pick your path

### I just want to use the app
| Doc | Why |
|-----|-----|
| [`../TIER0_USER.md`](../TIER0_USER.md) | Install on an old laptop — no coding |
| [`../FIRST_RUN.md`](../FIRST_RUN.md) | Recovery phrase & security |
| [`../INSTALL.md`](../INSTALL.md) | Per-OS install steps |

### I'm building or testing
| Doc | Why |
|-----|-----|
| [`../STARTUP.md`](../STARTUP.md) | 3-minute orientation |
| [`TIER0_DEV.md`](TIER0_DEV.md) | Slow laptop dev tips (`dev:tier0`) |
| [`../DEVOPS.md`](../DEVOPS.md) | CI, releases, workflows |
| [`../AGENTS.md`](../AGENTS.md) | AI agent / contributor rules |

### I need the big picture
| Doc | Why |
|-----|-----|
| [`IEEE_PREVIEW_2026-08-27.md`](IEEE_PREVIEW_2026-08-27.md) | **IEEE preview briefing (2026-08-27)** — whole-project packet |
| [`ROADMAP.md`](ROADMAP.md) | **What's done, what's next** (plain English) |
| [`phase-0-status.md`](phase-0-status.md) | Living checklist & M0 progress |
| [`features/use-case-capability-log.md`](features/use-case-capability-log.md) | Campus use cases: Done / Partial / Out of scope |
| [`features/brand-trademark-and-bkspc-rights.md`](features/brand-trademark-and-bkspc-rights.md) | **BlkSpace** mark vs **BKSPC** coin ticker |
| [`features/scale-matrix-complexity-compare.md`](features/scale-matrix-complexity-compare.md) | **Theory of computing + linear algebra scale model** vs competitors |
| [`features/bkspc-university-vision.md`](features/bkspc-university-vision.md) | **BKSPC University** — feed IA, discipline tracks, anti-extraction claim |
| [`theory-of-computing-scale.md`](theory-of-computing-scale.md) | Short entry → scale / space / matrix model |
| [`../FLESHTHEORY.md`](../FLESHTHEORY.md) | Full product theory |
| [`codebase-overview.md`](codebase-overview.md) | Where code lives |
| [`amalgamation-honest-competitive-review.md`](amalgamation-honest-competitive-review.md) | Honest review vs TikTok / IG / Discord / campus apps |

### I'm working on a specific feature
| Topic | Doc |
|-------|-----|
| UI / pages | [`blkspace-ui-system-plan.md`](blkspace-ui-system-plan.md) |
| Tier 0 performance | [`tier0-load-optimization.md`](tier0-load-optimization.md) |
| Nostr + mesh testing | [`implementation/DEVICE_MESH_TESTING.md`](implementation/DEVICE_MESH_TESTING.md) |
| Mesh skeleton (intra → internet) | [`mesh-perfect-skeleton.md`](mesh-perfect-skeleton.md) |
| Economy / WeixBucks | [`reward-formulas.md`](reward-formulas.md) · [`economy-student-terms.md`](economy-student-terms.md) · [`features/four-pillar-economy.md`](features/four-pillar-economy.md) · [`features/wb-progression-v2.md`](features/wb-progression-v2.md) · [`economy-fast-transparent.md`](economy-fast-transparent.md) |
| IEEE campus use cases | [`IEEE_CONFERENCE_PACK.md`](IEEE_CONFERENCE_PACK.md) (start) · [`features/use-case-omega-psi-phi-meharry-ieee.md`](features/use-case-omega-psi-phi-meharry-ieee.md) · [`features/use-case-fisk-finance-ieee.md`](features/use-case-fisk-finance-ieee.md) · [`features/use-case-jimmy-tsu-fashion-ieee.md`](features/use-case-jimmy-tsu-fashion-ieee.md) |
| Finance layer (HyperEVM) | [`finance-l1-strategy.md`](finance-l1-strategy.md) (BI9 = governance backplane) · [`tokenomics.md`](tokenomics.md) · [`blkbridge.md`](blkbridge.md) · [`blkshi.md`](blkshi.md) |
| Dual-chain roles (optional study) | [`features/comparative-multi-chain-prototyping-study.md`](features/comparative-multi-chain-prototyping-study.md) — Power of 2: Solana micro-settlement ≠ HyperEVM governance |
| Solana / BKSPC (student micro-settlement) | [`bkspc-tokenomics-policy.md`](bkspc-tokenomics-policy.md) (Design 1) · [`bkspc-phase0-phase1-tickets.md`](bkspc-phase0-phase1-tickets.md) · [`bkspc-devnet-mint.md`](bkspc-devnet-mint.md) · [`bkspc-devnet-runbook.md`](bkspc-devnet-runbook.md) · [`solana-blueprint.md`](solana-blueprint.md) |
| Security | [`security-considerations.md`](security-considerations.md) |
| Amalgamation / competitors | [`blkspace-hybrid.md`](blkspace-hybrid.md) (Facebook+IG+Threads · Myspace/Newgrounds) · [`amalgamation-honest-competitive-review.md`](amalgamation-honest-competitive-review.md) · [`amalgamation-use-case-testing.md`](amalgamation-use-case-testing.md) · [`amalgamation-feature-gap-and-mobile-roadmap.md`](amalgamation-feature-gap-and-mobile-roadmap.md) |
| Account recovery | [`campus-account-recovery.md`](campus-account-recovery.md) · [`../FIRST_RUN.md`](../FIRST_RUN.md) |

### Yard release to students
| Doc | Why |
|-----|-----|
| [`YARD_RELEASE_CHECKLIST.md`](YARD_RELEASE_CHECKLIST.md) | Device B test + `v0.1.0-yard` tag steps |
| [`device-b-m0-results.md`](device-b-m0-results.md) | Full M0 test results template |

---

## What to ignore (unless you need it)

| Folder / file | What it is |
|---------------|------------|
| `weixinfo/` | 98 research exports — background reading, not install docs |
| `docs/archive/` | Old reviews and exports |
| `docs/pitch-*`, `beta-*` | Launch strategy — not for students |
| `THEORY.md` | Investor pitch summary |

---

## Phases (one line each)

| Phase | Meaning |
|-------|---------|
| **0–1** | App boots, auth, feed, SQLite — **done** |
| **2** | Nostr relays, Iroh blobs, offline queue — **~90%** (Device B sign-off pending) |
| **3** | Yards, MySpace, rewards polish — **~55–75%** |
| **4** | On-chain: BKSPC student micro-settlement (Solana Devnet) + BI9 governance (HyperEVM) — **early**; jobs do not overlap |
| **5** | Scripture NLP, anti-abuse ML, LogosDecks — **not started** |

Details: [`ROADMAP.md`](ROADMAP.md)

---

## Full index

Power users: [`INDEX.md`](INDEX.md) (complete categorized list).