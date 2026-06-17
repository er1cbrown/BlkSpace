# AGENTS.md — BlkSpace Operating Instructions

## Project Overview
BlkSpace (weixblack.net) — amalgamation social platform.
Tauri 2 + React + TypeScript + Solana + Anchor.
Cross-platform: macOS, Windows, Linux, iOS, Android (future).

## Dev Environment
- Codespaces-first: `.devcontainer/devcontainer.json`
- If local: Node 22+, pnpm, Rust stable, Tauri CLI
- CI: GitHub Actions (`.github/workflows/`)
- No Docker locally (disk constraint). Use CI for builds.

## Key Files
- `DEVOPS.md` — full pipeline docs
- `SOUL.md` — project persona
- `FLESHTHEORY.md` — phased approach, Tier 0 constraint, economic model
- `docs/TOP_DOWN_APPROACH.md` — Nostr/Iroh/Solana to 5-layer network stack
- `docs/security-considerations.md` — Nostr attack mitigations
- `docs/architecture-blueprint.md` — Federated College-Town Relay Mesh
- `.github/workflows/ci.yml` — lint → typecheck → test → build (includes windows-latest)
- `.github/workflows/release.yml` — tag-triggered releases (macOS + Linux + Windows)
- `Code-Companion/package.json` — root workspace config
- `Code-Companion/artifacts/blkspace/src-tauri/Cargo.toml` — Rust deps

## Repository Structure
```
BlkSpace/ (cloned root)
├── AGENTS.md              ← this file
├── DEVOPS.md              ← full pipeline docs
├── FIRST_RUN.md           ← first-run security guide
├── FLESHTHEORY.md          ← phased approach, Tier 0 spec
├── INSTALL.md              ← install instructions (user + dev)
├── SOUL.md                 ← project persona
├── STARTUP.md              ← startup guide
├── THEORY.md               ← project theory / pitch
├── Makefile                ← common commands (dev, build, lint, test)
├── setup.sh / setup.bat   ← automated setup scripts
├── docs/                   ← architecture, design, security docs
├── weixinfo/               ← research notes (98 files)
├── tools/                  ← Python utility scripts
├── Code-Companion/         ← the actual application
│   ├── artifacts/
│   │   ├── blkspace/       ← React frontend (src/) + Rust backend (src-tauri/)
│   │   ├── api-server/     ← Express API server (alternative deployment)
│   │   ├── mockup-sandbox/ ← UI component showcase
│   │   └── solana/         ← Anchor programs (Phase 4)
│   ├── lib/                ← workspace packages (api-client-react, api-spec, api-zod, db)
│   ├── scripts/            ← utility scripts
│   └── package.json        ← pnpm workspace root
└── .github/workflows/
    ├── ci.yml              ← lint → typecheck → test → build (push/PR)
    └── release.yml         ← build + upload (tagged releases)
```

## Development Rules
1. Always run `pnpm lint` and `pnpm typecheck` before committing
2. Keep `node_modules` and Rust `target/` off disk — use pnpm store in /tmp
3. Push to GitHub to trigger CI — don't build Tauri locally unless necessary
4. Write tests for new features (Vitest for frontend, Rust tests for Tauri)
5. Keep dependencies minimal — every byte counts on low-end machines
6. All blockchain code goes through Anchor framework

## Windows / Low-End Machine Workflow
- **Frontend-only dev**: `pnpm dev` (from `Code-Companion/`) starts Vite web preview. No Rust needed. Uses ~200MB.
- **CI builds the desktop app**: Push to GitHub; `ci.yml` builds Tauri for `windows-latest`. Download artifacts.
- **Tagged releases**: Push a `v*` tag; `release.yml` produces `.msi` installer for Windows.
- **Local Rust build** (only if modifying Rust code): `cd artifacts/blkspace && pnpm tauri build`
- **Low-RAM build**: `$env:CARGO_BUILD_JOBS=1` before building (reduces parallelism)

## Rust Build Optimization
- `Cargo.toml` has `iroh-blobs` (40+ crates) in default features. For Phase 0-only builds:
  - Remove `default = ["iroh"]` from `[features]` to drop ~300 crates from compilation
  - CI has separate `build-tauri-iroh` job for Iroh builds

## Workspace
- Git root: `/workspaces/blkspace` (Codespaces) or `~/Desktop/BlkSpoof` (local)
- Remote: `git@github.com:er1cbrown/BlkSpace.git`
- All CI commands run inside `./Code-Companion/` (pnpm workspace root)
- Tauri build runs in `./Code-Companion/artifacts/blkspace`
