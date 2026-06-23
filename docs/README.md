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
| [`ROADMAP.md`](ROADMAP.md) | **What's done, what's next** (plain English) |
| [`phase-0-status.md`](phase-0-status.md) | Living checklist & M0 progress |
| [`../FLESHTHEORY.md`](../FLESHTHEORY.md) | Full product theory |
| [`codebase-overview.md`](codebase-overview.md) | Where code lives |

### I'm working on a specific feature
| Topic | Doc |
|-------|-----|
| UI / pages | [`blkspace-ui-system-plan.md`](blkspace-ui-system-plan.md) |
| Tier 0 performance | [`tier0-load-optimization.md`](tier0-load-optimization.md) |
| Nostr + mesh testing | [`implementation/DEVICE_MESH_TESTING.md`](implementation/DEVICE_MESH_TESTING.md) |
| Economy / WeixBucks | [`reward-formulas.md`](reward-formulas.md) · [`economy-student-terms.md`](economy-student-terms.md) |
| Solana / BKSPC | [`solana-blueprint.md`](solana-blueprint.md) · [`bkspc-devnet-runbook.md`](bkspc-devnet-runbook.md) |
| Security | [`security-considerations.md`](security-considerations.md) |

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
| **4** | Real on-chain marketplace, NFT, BKSPC — **early** |
| **5** | Scripture NLP, anti-abuse ML, LogosDecks — **not started** |

Details: [`ROADMAP.md`](ROADMAP.md)

---

## Full index

Power users: [`INDEX.md`](INDEX.md) (complete categorized list).