# DevOps Overview — BlkSpace

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    Users                         │
├─────────────────────────────────────────────────┤
│         Desktop (Tauri)   │   Mobile (Tauri)    │
│         Web (PWA)         │                     │
├─────────────────────────────────────────────────┤
│               Frontend (React + TS)              │
│         shadcn/ui · Tailwind · Zustand           │
├─────────────────────────────────────────────────┤
│          Tauri Bridge (Rust Commands)            │
├─────────────────────────────────────────────────┤
│         Solana RPC  │  Anchor Programs           │
│         (Web3.js)   │  (Rust Smart Contracts)    │
└─────────────────────────────────────────────────┘
```

## CI/CD Pipeline

### Workflows

| Workflow | Trigger | What It Does |
|----------|---------|-------------|
| **CI** | PRs + pushes to `main` | Lint, typecheck, unit test, build |
| **Release** | Tag push (`v*`) | Build signed binaries, create GitHub Release |

### CI Flow (`.github/workflows/ci.yml`)

```
Push/PR → Install deps → Lint → Typecheck → Test → Build (Web) → Build (Tauri)
```

- **Lint**: ESLint + Prettier (auto-fix on PR)
- **Typecheck**: TypeScript strict mode
- **Test**: Vitest unit tests + React Testing Library
- **Build Web**: Vite production build
- **Build Tauri**: `cargo tauri build` (macOS runner for now)

### Release Flow (`.github/workflows/release.yml`)

```
Tag v* → Build all targets → Sign → GitHub Release
```

Platform targets:
- **macOS**: Intel + Apple Silicon (`.dmg`)
- **Windows**: x64 (`.msi`) — cross-compile or runner
- **Linux**: AppImage + deb (via Ubuntu runner)
- **iOS / Android**: Manual for now; Tauri Mobile in Phase 2

## Local Development

```bash
# Prerequisites
brew install rust node
npm install -g pnpm

# Setup
pnpm install
pnpm tauri dev          # Desktop dev mode
pnpm dev                # Web-only dev mode

# Quality
pnpm lint               # ESLint
pnpm typecheck          # TypeScript
pnpm test               # Vitest
pnpm format             # Prettier

# Build
pnpm build              # Web production build
pnpm tauri build        # Desktop release build
```

## Project Structure

```
blkspace/
├── .github/workflows/   # CI/CD definitions
├── src/                 # React app source
│   ├── components/      # UI components
│   ├── hooks/           # React hooks (useTokenBalances, etc.)
│   ├── providers/       # Context providers (Wallet, etc.)
│   ├── lib/             # Utilities, API clients
│   └── pages/           # Route pages
├── src-tauri/           # Tauri (Rust) backend
│   ├── src/             # Rust source
│   │   ├── commands/    # Tauri IPC commands
│   │   └── state/       # App state management
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # Tauri config
├── programs/            # Anchor smart contracts (Solana)
│   ├── blkspace-core/   # Main program
│   └── tests/           # Integration tests
├── tests/               # E2E tests (Playwright)
├── DEVOPS.md            # This file
└── README.md            # Project overview
```

## Code Quality Gates

Before merging to `main`:
- [x] ESLint passes (no warnings)
- [x] TypeScript strict mode compiles
- [x] Unit tests pass
- [x] All feature branches up to date with `main`
- [x] PR approved (self-merge OK for solo dev)

## Infrastructure

- **Source**: GitHub (public repo)
- **CI**: GitHub Actions (free tier)
- **Build Artifacts**: GitHub Releases
- **Blockchain**: Solana Devnet → Mainnet
- **Hosting**: Tauri is client-side only; optional backend via Supabase or custom server later

## Security

- **No secrets in repo** — use GitHub Actions secrets for:
  - `APPLE_SIGNING_IDENTITY` (macOS code signing)
  - `APPLE_NOTARY_KEY` (notarization)
  - `WINDOWS_SIGNING_CERT` (Windows signing)
- **Dependabot** enabled for monthly dependency scans
- **Rust audit** (`cargo audit`) on every CI run

## Open Source

- License: MIT (default for open-source Tauri apps)
- Contributions: Issues + PRs welcome
- Solo dev workflow: OpenCode + OpenClaw for AI-assisted development

## Roadmap (DevOps)

| Phase | Item |
|-------|------|
| Now | CI pipeline, lint/typecheck/test gates |
| Phase 1 | Tauri cross-platform builds in CI |
| Phase 2 | E2E tests (Playwright) |
| Phase 3 | Automated release drafting |
| Phase 4 | Mobile CI (iOS/Android via Tauri Mobile) |
