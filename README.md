# BKSPC · BlkSpace

<p align="center">
  <img src="docs/assets/screenshots/01-welcome.png" alt="BKSPC welcome — The social network that pays you to post" width="920" />
</p>

<p align="center">
  <strong>The digital yard for HBCU students</strong><br/>
  Post on your campus · Customize MySpace-style · Earn WeixBucks · Built for Tier&nbsp;0 laptops
</p>

<p align="center">
  <a href="https://github.com/er1cbrown/BlkSpace/releases"><img src="https://img.shields.io/github/v/release/er1cbrown/BlkSpace?style=for-the-badge&label=Download&color=f97316" alt="Releases" /></a>
  <a href="https://github.com/er1cbrown/BlkSpace/actions"><img src="https://img.shields.io/github/actions/workflow/status/er1cbrown/BlkSpace/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a>
  <img src="https://img.shields.io/badge/Tier%200-Windows%20%7C%20macOS%20%7C%20Linux-0f172a?style=for-the-badge" alt="Tier 0 multi-OS" />
  <img src="https://img.shields.io/badge/DB-Turso%20embedded-0ea5e9?style=for-the-badge" alt="Turso" />
</p>

---

## Look at the product (not just the docs)

| Welcome · guest or account | Yard feed · works on cheap hardware |
|:---:|:---:|
| <img src="docs/assets/screenshots/01-welcome.png" width="420" alt="Welcome" /> | <img src="docs/assets/screenshots/03-feed.png" width="420" alt="Feed" /> |

| Search the network | Guest-safe wallet gate |
|:---:|:---:|
| <img src="docs/assets/screenshots/07-search.png" width="420" alt="Search" /> | <img src="docs/assets/screenshots/05-wallet.png" width="420" alt="Guest CTA" /> |

<p align="center">
  <img src="docs/assets/screenshots/hero-yard.png" alt="Campus yard — the metaphor for BlkSpace" width="720" />
</p>

> **Why this matters:** BlkSpace is designed for *shitty hardware on purpose* — 4–8&nbsp;GB Windows laptops that HBCU students actually use. If it runs smooth there, it runs anywhere.

---

## Download (students & demos)

1. Open **[Releases](https://github.com/er1cbrown/BlkSpace/releases)** or the latest green **CI** run → Artifacts  
2. Grab the build for your machine:

| Platform | Yard (students / Tier 0) | Full (labs / creators) |
|----------|--------------------------|-------------------------|
| **Windows** | `BlkSpace-Yard-Windows-x64.msi` | `BlkSpace-Full-Windows-x64.msi` |
| **macOS** | `BlkSpace-Yard-macOS.dmg` | `BlkSpace-Full-macOS.dmg` |
| **Linux** | `BlkSpace-Yard-Linux.AppImage` | `BlkSpace-Full-Linux.AppImage` |

3. Install → read [`FIRST_RUN.md`](FIRST_RUN.md) (save your **12-word recovery phrase**).

**MacBook tip:** after a push to `main`, wait for CI `build-tauri-yard` → download the macOS artifact. Or clone + `pnpm tauri:dev:tier0` if you develop.

Student guide: [`TIER0_USER.md`](TIER0_USER.md)

---

## Progress at a glance (Aug 2026)

```
Yard MVP  ████████░░  ~80%   install → feed → profile → yards → wallet
Economy   ████░░░░░░  ~40%   WeixBucks local · BKSPC devnet scaffolded
UI / UX   █████████░  polish  dark theme, guest mode, MyYard, search
Data      ████████░░  Turso   embedded local DB (Tier 0 optimized)
Mesh      ██████░░░░  Nostr   + optional Iroh (Full build only)
```

| Area | Status | Notes |
|------|--------|--------|
| Auth · recovery · guest browse | ✅ | Create free account or just browse |
| Feed (Watch / Read / Following / My Yard) | ✅ | Guest CTA, MIDF flag toggle |
| Profile · themes · people on the yard | ✅ | MySpace-style customization |
| Search | ✅ | Users, posts, communities |
| Wallet (WeixBucks) | ✅ | Simulated economy; gated for guests |
| Tier 0 boot | ✅ | Deferred seed, lite UI, no Iroh in Yard |
| **Turso embedded DB** | ✅ | Replaces rusqlite; low-RAM PRAGMAs |
| Yard + Full CI installers | ✅ | Windows / macOS / Linux |
| Device B student sign-off | ⏳ | [`docs/YARD_RELEASE_CHECKLIST.md`](docs/YARD_RELEASE_CHECKLIST.md) |
| BKSPC on-chain E2E | 🟡 | Devnet scaffold; NFT transfer pending |
| Phase 5 NLP / anti-abuse | ⬜ | After Yard is stable |

**Next milestone:** tag **`v0.1.0-yard`** after Device B passes → install from Releases on campus machines.

Full roadmap: [`docs/ROADMAP.md`](docs/ROADMAP.md) · Dashboard: [`docs/phase-0-status.md`](docs/phase-0-status.md)

---

## Stack

| Layer | Tech |
|-------|------|
| Desktop | **Tauri 2** (Windows · macOS · Linux) |
| UI | **React** + TypeScript + Tailwind |
| Local DB | **Turso** (SQLite-compatible, embedded, Tier 0 cache) |
| Social mesh | **Nostr** events |
| Media mesh | **Iroh** blobs (Full build) |
| Settlement | **Solana** / Anchor (devnet experiments) |

---

## Develop

```bash
git clone https://github.com/er1cbrown/BlkSpace.git
cd BlkSpace/Code-Companion
pnpm install

# Fast UI (web only — no Rust)
pnpm dev
# → http://localhost:24442  (defaults PORT/BASE_PATH)

# Tier 0 desktop (Turso, no Iroh) — Windows / Mac / Linux
cd artifacts/blkspace
pnpm tauri:dev:tier0
pnpm tauri:build:tier0
```

| You are… | Start here |
|----------|------------|
| Student / alum | [`TIER0_USER.md`](TIER0_USER.md) |
| New contributor | [`STARTUP.md`](STARTUP.md) · [`INSTALL.md`](INSTALL.md) |
| Agent / CI | [`AGENTS.md`](AGENTS.md) · [`DEVOPS.md`](DEVOPS.md) |
| Investor | [`THEORY.md`](THEORY.md) |

CI builds installers — push to `main` and download artifacts if your laptop is low on RAM/disk.

---

## Two builds

| | **Yard** | **Full** |
|--|----------|----------|
| Who | Students, 4–8 GB laptops | Labs, creators |
| Flags | `--no-default-features` | default + Iroh |
| UI | `VITE_TIER0_LITE=1`, yard-first | Bridge, trending, full mesh |
| Artifact | `BlkSpace-Yard-*` | `BlkSpace-Full-*` |

---

## Repo map

```
BlkSpace/
├── README.md                 ← this page (UI + progress)
├── docs/assets/screenshots/  ← live product shots
├── Code-Companion/artifacts/blkspace/   React + Tauri app
├── docs/                     architecture · economy · testing
└── .github/workflows/        CI + release installers
```

---

## Contributing (future builders)

1. Open an issue or pick something from [`docs/ROADMAP.md`](docs/ROADMAP.md).  
2. Keep **Tier 0** sacred — no mandatory feature that dies on a 4 GB Windows laptop.  
3. Prefer `pnpm tauri:dev:tier0` for desktop work.  
4. Screenshots: `node artifacts/blkspace/scripts/capture-readme-shots.mjs` (with `pnpm dev` running).  
5. Push to a branch → PR → CI must stay green.

---

## Links

- [Releases (download)](https://github.com/er1cbrown/BlkSpace/releases)  
- [CI Actions](https://github.com/er1cbrown/BlkSpace/actions)  
- [Docs index](docs/README.md) · [Security](docs/security-considerations.md) · [Tokenomics](docs/tokenomics-policy.md)

<p align="center">
  <sub>Built for the yard · Runs on the hardware you already have</sub>
</p>
