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
- `.github/workflows/ci.yml` — lint → typecheck → test → build
- `.github/workflows/release.yml` — tag-triggered releases

## Development Rules
1. Always run `pnpm lint` and `pnpm typecheck` before committing
2. Keep `node_modules` and Rust `target/` off disk — use pnpm store in /tmp
3. Push to GitHub to trigger CI — don't build Tauri locally unless necessary
4. Write tests for new features (Vitest for frontend, Rust tests for Tauri)
5. Keep dependencies minimal — every byte counts on low-end machines
6. All blockchain code goes through Anchor framework

## Workspace
- Git root: `/workspaces/blkspace` (Codespaces) or `~/Desktop/BlkSpoof` (local)
- Remote: `git@github.com:er1cbrown/BlkSpace.git`
