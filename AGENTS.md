# AGENTS.md — BlkSpace Operating Instructions

## Project Overview
BlkSpace (weixblack.net) — amalgamation social platform.
Tauri 2 + React + TypeScript. BlkCore is off-chain (Nostr + Iroh + WeixBucks).

**Canonical on-chain asset is BKSPC on Solana** — Token-2022, earned WeixBucks settlement,
non-rewarding staking, and allowlisted timelocked governance. Never auto-convert
WeixBucks.

BI9 on HyperEVM is **not deployable by this operator**: Hyperliquid geo-restricts the US
and this operator is in Tennessee. The contracts under `Code-Companion/artifacts/hyperevm/`
are retained and tested but are **not** canonical, **not** a fallback, and **not** on the
roadmap. Do not deploy to chain 999 and do not revive the BI9 plan. See
[`docs/canonical-chain-decision.md`](docs/canonical-chain-decision.md).
Cross-platform: macOS, Windows, Linux, iOS, Android (future).

## Dev Environment
- Codespaces-first: `.devcontainer/devcontainer.json`
- If local: Bun 1.3+, Node 22+ (optional for tools), Rust stable, Tauri CLI
- CI: GitHub Actions (`.github/workflows/` — `ci.yml`, `release.yml`, `pages.yml`, `ci-full-lab.yml`)
- No Docker locally (disk constraint). Use CI for builds.
- Prefer `CARGO_TARGET_DIR=$HOME/.cache/blkspace-target` so `src-tauri/target/` does not bloat the clone (can exceed 7 GB and hang `git status` on Desktop/iCloud).

## Key Files
- `README.md` — repo entry point (students vs devs vs docs map)
- `docs/README.md` — documentation map
- `docs/ROADMAP.md` — Yard vs Full, Tier C, Phase 5, next milestones
- `docs/YARD_RELEASE_CHECKLIST.md` — Device B + v0.1.0-yard release gate
- `DEVOPS.md` — full pipeline docs
- `SOUL.md` — project persona
- `FLESHTHEORY.md` — phased approach, Tier 0 constraint, economic model
- `TIER0_USER.md` — student install guide (download only; no builds)
- `docs/TOP_DOWN_APPROACH.md` — Nostr/Iroh/Solana to 5-layer network stack
- `docs/security-considerations.md` — Nostr attack mitigations
- `docs/architecture-blueprint.md` — Federated College-Town Relay Mesh
- `docs/finance-l1-strategy.md` — BI9 on HyperEVM; BlkBridge + BLKSHI (do not skip BlkCore)
- `docs/tokenomics.md` — canonical tokenomics (WeixBucks off-chain, **BKSPC on Solana**)
- `docs/canonical-chain-decision.md` — why Solana/BKSPC is canonical and BI9 is not
- `docs/features/comparative-multi-chain-prototyping-study.md` — optional IEEE dual-chain role split (Power of 2)
- `.github/workflows/ci.yml` — lint → typecheck → test → gated Yard/Full multi-OS builds
- `.github/workflows/release.yml` — tag-triggered releases (macOS + Linux + Windows)
- `.github/workflows/pages.yml` — campus web preview (enable repo Pages setting)
- `.github/workflows/ci-full-lab.yml` — manual Full/Iroh lab builds
- `DEVOPS.md` — pipeline + operator next steps (signing, Pages, Device B)
- `tools/list_tauri_commands.py` — IPC command inventory for authz reviews
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
│   │   ├── solana/         ← Anchor: BKSPC — CANONICAL on-chain asset
│   │   └── hyperevm/       ← Solidity: BI9 ERC-20 — RETAINED, NOT DEPLOYABLE (US geo)
│   ├── lib/                ← workspace packages (api-client-react, api-spec, api-zod, db)
│   ├── scripts/            ← utility scripts
│   └── package.json        ← Bun workspace root
└── .github/workflows/
    ├── ci.yml              ← lint → typecheck → test → build (push/PR)
    └── release.yml         ← build + upload (tagged releases)
```

## Development Rules
1. Always run `bun run lint` and `bun run typecheck` before committing
2. Keep `node_modules` and Rust `target/` off disk — Bun global cache is fine
3. Push to GitHub to trigger CI — don't build Tauri locally unless necessary
4. Write tests for new features (Vitest for frontend, Rust tests for Tauri)
5. Keep dependencies minimal — every byte counts on low-end machines
6. Blockchain: BlkCore stays off-chain. Canonical on-chain asset is **BKSPC on Solana** (`Code-Companion/artifacts/solana/`). It holds a program-PDA mint authority, requires an on-chain `minter` signer, and enforces a one-way supply `cap` that governance may only lower. Never auto-convert WeixBucks.
6c. **Do not deploy to HyperEVM.** BI9 is not deployable from this operator's jurisdiction and is not canonical. Leave `artifacts/hyperevm/` as dead reference code.
6a. **BKSPC minting is not permissionless.** `convert_wb_to_bkspc` requires `convert_config.minter` to sign and rejects any mint above `cap`. Do not weaken this — it was an exploitable hole until 2026-10-08. Staking pays **no reward**, and governance has **no arbitrary-CPI instruction**. See [`docs/bkspc-settlement-hardening.md`](docs/bkspc-settlement-hardening.md).
6b. The `bkspc-devnet` Cargo feature gates the entire WB→BKSPC settlement path and is **not** a default feature. `check-tauri-bkspc` compiles it on three OSes; `build-tauri-bkspc` ships one Linux installer. Builds without it must refuse settlement rather than fabricate a transaction signature.
7. Use **Bun** only (`bun install`, `bun run …`). Do not use pnpm/npm/yarn.
8. Reticulum Route B: bundled native `rns`/`rnsd` only. No Python sidecar, no LXMF identity store, no RNode serial/BLE, no destination hashes next to Nostr keys. [`docs/implementation/RETICULUM_INTEGRATION.md`](docs/implementation/RETICULUM_INTEGRATION.md)
9. Yard room watch: Jellyfin HTTPS, Iroh media tickets, or Syncplay only. Do not wire ani-cli / HiAnime / Megaplay / third-party HLS into rooms. Spec: [`docs/features/yard-room-watch.md`](docs/features/yard-room-watch.md). Hostinger VPS compose: [`docs/implementation/jellyfin-hostinger/README.md`](docs/implementation/jellyfin-hostinger/README.md). Docker is for the VPS, not the Tier 0 laptop.

## Agent Safety & Destructive Operation Guardrails
> Bleeding-edge projects often contain untracked state the user may not think to name explicitly. Agents must protect that state.

1. **Confirm before any destructive operation** — including but not limited to:
   - `rm -rf`, `rm` of files outside obvious caches (`node_modules`, `target`, `dist`)
   - `git reset`, `git revert`, `git clean`, force-pushes
   - dropping tables, deleting wallets/keys, deleting `test-ledger/`, `devnet/`, `.local/`, `attached_assets/`
2. **Explain the risk and recovery path** before asking for confirmation.
3. **Assume untracked files in these paths are user state**, not disposable cache:
   - `Code-Companion/artifacts/solana/devnet/`
   - `Code-Companion/artifacts/solana/test-ledger/`
   - `Code-Companion/attached_assets/`
   - `Code-Companion/.local/`
   - Any `.env`, keypair, manifest, backup, or ledger file
4. **When the user says "clean up"**, clarify scope explicitly. Do not infer permission to delete files.
5. **Prefer preservation over cleanup** — if unsure, leave it, add it to `.gitignore`, and ask.
6. **Document any deletion** in the commit message with rationale and recovery instructions.
7. **No automated deletion of files >10 MB or outside build artifacts** without explicit, item-by-item user approval.

## Windows / Low-End Machine Workflow
- **Frontend-only dev**: `bun run dev` (from `Code-Companion/`) starts Vite web preview. No Rust needed. Uses ~200MB.
- **CI builds the desktop app**: Push to GitHub; `ci.yml` builds Tauri for `windows-latest`. Download artifacts.
- **Tagged releases**: Push a `v*` tag; `release.yml` produces `.msi` installer for Windows.
- **Local Rust build** (only if modifying Rust code): `cd artifacts/blkspace && bun run tauri build`
- **Low-RAM build**: `$env:CARGO_BUILD_JOBS=1` before building (reduces parallelism)

## Rust Build Optimization
- `Cargo.toml` has `iroh-blobs` (40+ crates) in default features. For Phase 0-only builds:
  - Remove `default = ["iroh"]` from `[features]` to drop ~300 crates from compilation
  - CI has separate `build-tauri-iroh` job for Iroh builds

## Workspace
- Git root: `/workspaces/blkspace` (Codespaces) or `~/Desktop/BlkSpoof` (local)
- Remote: `git@github.com:er1cbrown/BlkSpace.git`
- All CI commands run inside `./Code-Companion/` (Bun workspace root)
- Tauri build runs in `./Code-Companion/artifacts/blkspace`
