# BlkSpace

**The digital yard for HBCU students** — post on your campus, customize your profile MySpace-style, earn WeixBucks, and (eventually) settle sales on-chain.

Built with **Tauri 2** (desktop), **React**, **SQLite**, **Nostr**, optional **Iroh** blobs, and **Solana** for devnet experiments.

---

## Who are you?

| You are… | Start here | Do **not** need |
|----------|------------|-----------------|
| **Student / alum** (Windows laptop) | [`TIER0_USER.md`](TIER0_USER.md) → install `BlkSpace-Yard-Windows-x64.msi` | Rust, Node, `git clone` |
| **New to the project** | [`STARTUP.md`](STARTUP.md) (3 min) | `weixinfo/` research folder |
| **Developer** | [`INSTALL.md`](INSTALL.md) + [`docs/TIER0_DEV.md`](docs/TIER0_DEV.md) | Local Tauri build on 4 GB RAM (use CI) |
| **Contributor / agent** | [`AGENTS.md`](AGENTS.md) | — |
| **Investor / pitch** | [`THEORY.md`](THEORY.md) | Code |

---

## Install (students)

1. Download **`BlkSpace-Yard-Windows-x64.msi`** from [Releases](https://github.com/er1cbrown/BlkSpace/releases) or CI artifact `BlkSpace-Yard-windows-latest`.
2. Install like any app.
3. Read [`FIRST_RUN.md`](FIRST_RUN.md) — write down your **12-word recovery phrase** on paper.

Full details: [`TIER0_USER.md`](TIER0_USER.md) · [`INSTALL.md`](INSTALL.md)

---

## Develop (contributors)

```bash
git clone git@github.com:er1cbrown/BlkSpace.git
cd BlkSpace/Code-Companion
pnpm install
pnpm dev                    # web preview (fast UI work)
# Tier 0 laptop — use lite dev:
cd artifacts/blkspace && pnpm dev:tier0
cd artifacts/blkspace && pnpm tauri:dev:tier0   # desktop, yard-first UI
```

CI builds installers — push to `main`; don't compile Tauri locally on low-RAM machines unless you're changing Rust.

Pipeline: [`DEVOPS.md`](DEVOPS.md)

---

## Repo layout (simple)

```
BlkSpace/
├── README.md              ← you are here
├── TIER0_USER.md          ← student install guide
├── INSTALL.md / STARTUP.md / FIRST_RUN.md
├── Code-Companion/        ← the app (pnpm workspace)
│   └── artifacts/blkspace/   React + Tauri (main product)
├── docs/                  ← architecture, economy, testing
│   ├── README.md          ← documentation map
│   └── ROADMAP.md         ← what's done & what's next
├── weixinfo/              ← research notes (not required reading)
└── .github/workflows/     ← CI + releases
```

---

## Two builds (important)

| Build | Who | What you get |
|-------|-----|----------------|
| **BlkSpace Yard** | Students, Tier 0 laptops | Smaller app, yard-first boot, lite feed UI, no heavy Iroh mesh at startup |
| **BlkSpace Full** *(planned CI artifact)* | Lab machines, creators | Iroh blob network + full Nostr relay mesh + bridge/trending |

Today CI produces **Yard** artifacts. **Full** is on the [roadmap](docs/ROADMAP.md).

---

## Project health (June 2026)

| Area | Status |
|------|--------|
| Auth, feed, profile, MySpace themes | ✅ Usable |
| Tier 0 boot optimizations | ✅ Shipped |
| Yard CI installers | ✅ `build-tauri-yard` job |
| Device B student sign-off | ⏳ [Checklist](docs/YARD_RELEASE_CHECKLIST.md) |
| Marketplace + BKSPC devnet | 🟡 Hardened; needs E2E + NFT transfer |
| Phase 5 (NLP / anti-abuse) | ⬜ Not started |

**Next concrete milestone:** tag **`v0.1.0-yard`** after Device B passes → TSU can install from Releases.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full picture.

---

## Links

- **Docs index:** [`docs/README.md`](docs/README.md)
- **Progress dashboard:** [`docs/phase-0-status.md`](docs/phase-0-status.md)
- **Security:** [`docs/security-considerations.md`](docs/security-considerations.md)
- **Remote:** `git@github.com:er1cbrown/BlkSpace.git`