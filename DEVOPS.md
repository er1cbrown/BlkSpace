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
| **CI Yard** | Same (job `build-tauri-yard`) | Tier 0 installer: `BlkSpace-Yard-*` per OS |
| **Release** | Tag push (`v*`) | Build Yard binaries, create GitHub Release |

### CI Flow (`.github/workflows/ci.yml`)

```
Push/PR → Install deps → Lint → Typecheck → Test → Build (Web) → Build (Tauri) → Build (BlkSpace Yard)
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
- **Linux**: AppImage + deb (via Ubuntu runner) + Arch PKGBUILD (community)
- **iOS / Android**: Manual for now; Tauri Mobile in Phase 2

## Local Development

### macOS
```bash
brew install rust node
npm install -g pnpm
```

### Arch / Omarchy
```bash
sudo pacman -S rustup nodejs npm
rustup default stable
sudo npm install -g pnpm
sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 librsvg base-devel git
```

### Ubuntu / Debian
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential git
sudo npm install -g pnpm
```

### Fedora
```bash
sudo dnf install rustup nodejs npm
rustup default stable
sudo npm install -g pnpm
sudo dnf install webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel gcc gcc-c++ git
```

### Common Commands
```bash
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
BlkSpoof/
├── .github/workflows/           # CI/CD definitions
├── .devcontainer/               # Codespaces setup
├── BlkSpace/                    # Documentation & theory
│   ├── README.md                # Investor pitch
│   ├── THEORY.md                # Core philosophy
│   ├── FLESHTHEORY.md           # Cultural framework
│   ├── DEVOPS.md                # This file
│   ├── AGENTS.md                # Agent instructions
│   ├── SOUL.md                  # Project persona
│   ├── STARTUP.md               # Quick setup guide
│   └── docs/                    # Architecture, security, features
│       ├── architecture-blueprint.md
│       ├── phase-0-status.md
│       ├── reward-formulas.md
│       ├── hub-theory.md
│       └── ...
├── Code-Companion/              # pnpm monorepo (actual code)
│   ├── package.json             # Workspace root
│   ├── pnpm-workspace.yaml      # Workspace config
│   ├── tsconfig.base.json       # Shared TS config
│   ├── artifacts/
│   │   ├── blkspace/            # Main app (React + Tauri)
│   │   │   ├── src/             # React frontend
│   │   │   └── src-tauri/       # Rust backend
│   │   ├── api-server/          # Mock API server
│   │   └── mockup-sandbox/      # UI prototypes
│   ├── lib/
│   │   ├── api-spec/            # OpenAPI spec
│   │   ├── api-client-react/    # Auto-generated client
│   │   ├── api-zod/             # Zod schemas
│   │   └── db/                  # Drizzle ORM utilities
│   └── scripts/                 # Build/dev scripts
└── Makefile                     # Local dev commands
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
