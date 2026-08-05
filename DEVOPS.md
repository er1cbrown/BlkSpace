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

| Workflow | Trigger | What It Does | Status |
|----------|---------|-------------|--------|
| **CI** | PRs + pushes to `main` | Lint, typecheck, unit/Rust/Anchor tests, bundle budget, Playwright E2E, web + Yard/Full Tauri builds | ✅ Live |
| **CI Full Lab** | `workflow_dispatch` only | Optional heavy Full/Iroh lab builds (not every-push) | ✅ Lab-only |
| **Release** | Tag push (`v*`) | Draft GitHub Release + Yard/Full installers (macOS arm64/x64, Linux, Windows) | ✅ Live |
| **Deploy Web Preview** | `main` push / manual | Campus web preview to GitHub Pages | ✅ Workflow ready · repo Pages setting pending |

### CI Flow (`.github/workflows/ci.yml`)

```
Push/PR → Lint → Typecheck → Unit tests → Rust/Anchor/Nostr smoke
         → Bundle budget (Tier 0) → Build Web → Playwright E2E (browser + Tauri)
         → Build Yard (3 OS) → Build Full (3 OS) → Iroh smoke build
```

- **Lint**: ESLint + Prettier (`format:check`)
- **Typecheck**: TypeScript strict mode
- **Test**: Vitest unit tests; Tauri Rust unit tests; Anchor `bkspc` tests; Nostr relay smoke
- **Bundle budget**: `bun run check:bundle:tier0` (job `bundle-budget-tier0`)
- **E2E**: Playwright web preview + Playwright Tauri native (Linux)
- **Build Web**: Vite production build
- **Build Full**: `bun run build:full` + `tauri build` (Iroh on) → `BlkSpace-Full-*` artifacts
- **Build Yard**: `bun run build:tier0` + `tauri build --no-default-features` → `BlkSpace-Yard-*` artifacts

### Release Flow (`.github/workflows/release.yml`)

```
Tag v* → Create draft release (auto notes) → Build Yard + Full (matrix) → Attach installers
```

- **Draft + notes**: `softprops/action-gh-release` with `draft: true` and `generate_release_notes: true`
- **Signing / notarization**: release jobs fail closed unless Apple and Windows signing secrets are configured; CI artifacts remain unsigned
- First student tag shipped: **`v0.1.0-yard`** (Yard + Full assets on GitHub Releases)

Platform targets:
- **macOS**: Intel + Apple Silicon (`.dmg`) ✅ release matrix
- **Windows**: x64 (`.msi`) ✅
- **Linux**: AppImage (Ubuntu runner) ✅ · deb / Arch PKGBUILD community later
- **iOS / Android**: Not in release CI — Tauri Mobile = Phase 4 (next)

## Local Development

### macOS
```bash
brew install rust node
curl -fsSL https://bun.sh/install | bash
```

### Arch / Omarchy
```bash
sudo pacman -S rustup nodejs npm
rustup default stable
sudo curl -fsSL https://bun.sh/install | bash
sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 librsvg base-devel git
```

### Ubuntu / Debian
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential git
sudo curl -fsSL https://bun.sh/install | bash
```

### Fedora
```bash
sudo dnf install rustup nodejs npm
rustup default stable
sudo curl -fsSL https://bun.sh/install | bash
sudo dnf install webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel gcc gcc-c++ git
```

### Common Commands
```bash
# Setup
bun install
bun run tauri:dev          # Desktop dev mode
bun run dev                # Web-only dev mode

# Quality
bun run lint               # ESLint
bun run typecheck          # TypeScript
bun run test               # Vitest
bun run format             # Prettier

# Build
bun run build              # Web production build
bun run tauri build        # Desktop release build
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
├── Code-Companion/              # Bun monorepo (actual code)
│   ├── package.json             # Workspace root
│   ├── package.json             # Bun workspaces + catalog
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

- **No secrets in repo** — configure these GitHub Actions secrets for signed releases:
  - `APPLE_CERTIFICATE` (base64-encoded Developer ID Application `.p12`)
  - `APPLE_CERTIFICATE_PASSWORD` (p12 password)
  - `APPLE_SIGNING_IDENTITY` (Developer ID Application identity)
  - `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` (notarization credentials)
  - `WINDOWS_SIGNING_CERT` (base64-encoded Authenticode `.pfx`)
  - `WINDOWS_SIGNING_CERT_PASSWORD` (pfx password)
- **Dependabot** enabled (`.github/dependabot.yml`)
- **Rust audit** (`cargo audit`): ⬜ not in `ci.yml` yet — add when hardening signed release path

## Open Source

- License: MIT (default for open-source Tauri apps)
- Contributions: Issues + PRs welcome
- Solo dev workflow: OpenCode + OpenClaw for AI-assisted development

## Roadmap (DevOps)

| Phase | Item | Status |
|-------|------|--------|
| 0 | CI pipeline, lint / typecheck / unit test gates | ✅ Done |
| 1 | Tauri cross-platform builds in CI (Yard + Full, 3 OS) | ✅ Done |
| 2 | E2E tests (Playwright — web + Tauri native) | ✅ Done |
| 3 | Automated release drafting (`v*` → draft release + notes + installers) | ✅ Done |
| — | Tier 0 bundle-size budget in CI (`check:bundle:tier0`) | ✅ Done |
| — | Tag + ship `v0.1.0-yard` installers | ✅ Done |
| **Next** | Add signing secrets and run a signed `v*` release | ⏳ Workflow wired |
| **Next** | Enable **GitHub Pages** for Deploy Web Preview campus demo | ⏳ Repo setting pending |
| **Next** | Device B student smoke close-out (see `docs/YARD_RELEASE_CHECKLIST.md` Part A) | ⏳ Partial |
| 4 | Mobile CI (iOS/Android packaging via Tauri Mobile) | ⬜ Planned |
| 5 | `cargo audit` (and signed-release hardening) on CI | ⬜ Planned |

**Authoritative “what ships”:** workflows under `.github/workflows/`. Prefer this table over older narrative that still listed Playwright / release drafting as future work.
