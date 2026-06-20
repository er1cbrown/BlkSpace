# BlkSpace Codebase Overview

**Updated:** 2026-06-20  
**Status:** Phase 0 ✅ · Phase 1 ✅ · Phase 2 ~90% · Phase 3 ~75% · Phase 4 in progress · Phase 5 not started  
**Location:** `~/Desktop/BlkSpoof` (consolidated monorepo)

---

## 1. PROJECT OVERVIEW

### 1.1 What is BlkSpace?

BlkSpace is a **decentralized creator economy platform** for HBCU students:

- **Frontend:** React 19 + TypeScript + Vite + Tailwind + shadcn/ui (60+ components)
- **Backend:** Tauri v2 + Rust + SQLite (2,768 lines of Rust across 5 modules)
- **Social Layer:** Nostr protocol (events, identity, relay mesh)
- **Content:** Iroh blob storage (Phase 2)
- **Economy:** WeixBucks (off-chain) + BKSPC (Solana Phase 4 settlement)
- **Security:** Rate limiting, Schnorr signature verification, BIP39 recovery

**The vision:** Enable HBCU students to share work, monetize fairly, and build sustainable value on hardware they already own (Tier 0 = low-end Windows laptops).

### 1.2 Current Phase

```
Phase 0 ✅ | Phase 1 ✅ | Phase 2 ~90% | Phase 3 ~75% | Phase 4 in progress | Phase 5 not started
MVP target: end of Phase 3 (~78–80% complete)
```

- ✅ 400+ files committed
- ✅ TypeScript strict mode passes
- ✅ Rust unit tests: 100 passing (`cargo test --lib`)
- ✅ Iroh blob upload + CID round-trip implemented (Phase 2)
- ✅ Live Nostr relay publish/read verified (relay.damus.io)
- ✅ GitHub Actions CI/CD configured
- ⚠️ Vitest suite hangs on Node 25 (project targets Node 22)
- ⚠️ Vite production build fails on Node 25 (`Resolver is not a constructor`)

---

## 2. REPOSITORY STRUCTURE

### 2.1 Top-Level

```
BlkSpoof/
├── .devcontainer/         # Codespaces development environment
├── .editorconfig          # Editor formatting rules
├── .github/               # GitHub Actions CI/CD
│   ├── workflows/
│   │   ├── ci.yml         # Lint → typecheck → test → build
│   │   └── release.yml    # Tag-triggered releases
│   └── dependabot.yml     # Automated dependency updates
├── .gitignore             # Comprehensive ignore rules
├── AGENTS.md              # Development operating instructions
├── DEVOPS.md              # DevOps pipeline documentation
├── FIRST_RUN.md           # Security guide for users
├── FLESHTHEORY.md         # Cultural & theoretical foundation
├── INSTALL.md             # User-friendly install guide
├── Makefile               # Development commands
├── SETUP.md / setup.*     # Automated setup scripts
├── SOUL.md                # Project persona
├── STARTUP.md             # Quick start guide
├── THEORY.md              # Investor/hackathon pitch
├── docs/                  # Architecture, security, features
│   ├── INDEX.md
│   ├── architecture-blueprint.md
│   ├── security-considerations.md
│   ├── solana-security.md
│   ├── federated-college-towns.md
│   ├── hub-theory.md
│   ├── reward-formulas.md
│   ├── phase-0-status.md
│   ├── features/          # Feature specs
│   └── implementation/    # Integration test plans
├── tools/                 # Build & development scripts
├── weixinfo/              # 98 research notes (read-only archive)
└── Code-Companion/        # Code (pnpm monorepo)
    ├── artifacts/
    │   ├── blkspace/      # Main Tauri app
    │   ├── api-server/    # Mock API server
    │   ├── mockup-sandbox/# UI prototypes
    │   └── solana/        # Anchor programs + devnet scripts
    ├── lib/               # Shared libraries
    │   ├── api-spec/      # OpenAPI schema
    │   ├── api-zod/       # Zod types
    │   ├── api-client-react/ # React Query client
    │   └── db/            # Drizzle ORM
    ├── scripts/           # Build scripts
    ├── package.json       # Root workspace config
    ├── pnpm-workspace.yaml # Workspace definition
    ├── tsconfig.base.json  # TypeScript base
    └── pnpm-lock.yaml     # Dependency lock
```

### 2.2 Code-Companion: Main Application

```
artifacts/blkspace/
├── src/                    # React frontend
│   ├── App.tsx             # Router (18 routes, WelcomeWizard)
│   ├── main.tsx            # Entry point
│   ├── index.css           # Tailwind entry
│   ├── pages/              # 18 page components
│   │   ├── welcome.tsx     ← NEW: 5-step Welcome Wizard
│   │   ├── landing.tsx     # Public landing page
│   │   ├── feed.tsx        # Main content feed
│   │   ├── post.tsx        # Individual post
│   │   ├── profile.tsx     # User profile
│   │   ├── login.tsx       # Sign in
│   │   ├── signup.tsx      # Sign up (with mnemonic verification)
│   │   ├── recover.tsx     # Account recovery
│   │   ├── settings.tsx    # Settings (3-tab: Profile/Security/Privacy)
│   │   ├── wallet.tsx      # WeixBucks transactions
│   │   ├── relays.tsx      # Nostr relay management
│   │   ├── communities.tsx # Community list
│   │   ├── community.tsx   # Individual community
│   │   ├── notifications.tsx # Activity feed
│   │   ├── search.tsx      # Content discovery
│   │   ├── media.tsx       # Media upload/playback
│   │   ├── architecture.tsx # Architecture docs
│   │   └── not-found.tsx   # 404 page
│   ├── components/
│   │   ├── layout/
│   │   │   └── Navbar.tsx  # Navigation bar
│   │   └── ui/             # 60+ shadcn/ui components
│   ├── hooks/
│   │   ├── use-app-data.ts # Dual-mode data hooks (Tauri vs web)
│   │   ├── use-mobile.tsx  # Mobile detection
│   │   └── use-toast.ts   # Toast notifications
│   └── lib/
│       ├── auth.ts         # Nostr auth + BIP39 + first-run check
│       ├── tauri-api.ts    # Tauri IPC client (363 lines)
│       └── utils.ts        # General utilities
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── lib.rs          # Main Tauri commands (1,090 lines)
│   │   ├── db.rs           # SQLite database (1,363 lines)
│   │   ├── relay_manager.rs # Nostr relay integration (242 lines)
│   │   └── blob_store.rs   # Media storage (67 lines)
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri config
├── package.json            # Frontend dependencies
└── vite.config.ts          # Vite build config
```

---

## 3. KEY TECHNOLOGIES

### 3.1 Frontend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React | 19.1.0 | UI library |
| Build | Vite | 7.3.5 | Bundler |
| Language | TypeScript | ~5.9.3 | Type safety |
| Styling | Tailwind CSS | 4.1.14 | Utility CSS |
| UI | shadcn/ui + Radix | latest | 60+ components |
| Routing | Wouter | 3.3.5 | Lightweight router |
| Forms | React Hook Form | 7.55.0 | Form validation |
| Validation | Zod | 3.25.76 | Schema validation |
| Data | TanStack Query | 5.90.21 | Data fetching |
| Animations | Framer Motion | 12.23.24 | Transitions |
| Icons | Lucide React | 0.545.0 | SVG icons |
| Themes | next-themes | 0.4.6 | Dark mode |

### 3.2 Backend (Rust)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Tauri | 2.11.2 | Desktop framework |
| SQLite (rusqlite) | 0.34.0 | Local database |
| Nostr SDK | 0.38 | Nostr protocol |
| Secp256k1 | 0.30 | Cryptography |
| Tokio | 1.x | Async runtime |
| SHA2 | 0.10 | Hashing |
| UUID | 1.x | Unique IDs |
| Chrono | 0.4 | Datetime |
| Serde | 1.0 | Serialization |

---

## 4. MAIN COMPONENTS

### 4.1 Frontend Architecture

**18 pages** with Wouter routing:
- `/` → WelcomeWizard (first run) or LandingPage (returning)
- `/welcome` → WelcomeWizard (explicit)
- `/feed` → Content feed
- `/posts/:id` → Individual post
- `/profile/:handle` → User profile
- `/login` → Sign in
- `/signup` → Sign up (with mnemonic verification)
- `/recover` → Account recovery
- `/settings` → Settings (3-tab: Profile/Security/Privacy)
- `/wallet` → WeixBucks transactions
- `/relays` → Nostr relay management
- `/communities` → Community list
- `/community/:id` → Individual community
- `/notifications` → Activity feed
- `/search` → Content discovery
- `/media` → Media upload/playback
- `/architecture` → Architecture docs
- `/*` → 404

**Dual-mode architecture** (`use-app-data.ts`):
- Detects `__TAURI_INTERNALS__` in window
- Uses Tauri IPC when in desktop mode
- Uses web API when in browser mode
- Same React code runs in both

### 4.2 Backend Architecture

**~3,300 lines in lib.rs** covering:
- Session management (challenges, tokens, rate limiting)
- Nostr auth event verification (kind 22242)
- Nostr event ID + Schnorr signature verification
- User CRUD, follows, contact lists (kind 3)
- Post creation, feeds, replies, likes
- Community + channel management, yard events, wall posts
- Wallet/WeixBucks transactions, tips, earn sources, appeals
- Withdraw eligibility + BKSPC settlement wiring (feature-gated)
- Relay subscription + health checks + consensus records
- Cross-town event sync
- Blob upload/download with SHA256 + CID fallback
- Background relay polling

**~4,400 lines in db.rs** covering:
- 20+ tables: users, posts, replies, likes, notifications, wallet_tx, follows, blobs, relay_connections, relay_events, communities, channels, yard_events, marketplace, economy_appeals, etc.
- Seed data for demo users/posts
- Engagement quality scoring
- SQLite transactions for WeixBucks transfers
- Nostr event JSON cache

---

## 5. SECURITY FEATURES

| Feature | Implementation | Status |
|---------|---------------|--------|
| Rate limiting | 30 requests/60s per pubkey | ✅ |
| Challenge-response auth | Nostr kind 22242 | ✅ |
| Schnorr signature verification | Secp256k1 | ✅ |
| Session expiry | 24 hours | ✅ |
| BIP39 key recovery | 12-word mnemonic | ✅ |
| Mnemonic verification | Type 2 random words during signup | ✅ |
| Paper backup warning | UI everywhere phrase appears | ✅ |
| No auto link previews | Prevent CBC malleability attack | ✅ |
| Secure key storage | File-based (Tauri) / localStorage (web) | ✅ |
| Town tag filtering | `t:hbcu-town:*` | ✅ |

---

## 6. BUILD & DEPLOYMENT

### 6.1 Commands

```bash
# Setup
cd Code-Companion
pnpm install

# Development
pnpm dev                    # Web preview
pnpm tauri dev             # Desktop preview

# Quality
pnpm lint                  # ESLint
pnpm typecheck             # TypeScript (passes ✅)
pnpm format               # Prettier

# Production
pnpm build                 # Web production
pnpm tauri build          # Desktop release

# Full CI simulation
pnpm run typecheck:libs && pnpm -r --filter "./artifacts/**" --filter "./scripts" run typecheck
```

### 6.2 CI/CD Pipeline

GitHub Actions (`.github/workflows/ci.yml`):
1. **Lint** — ESLint + Prettier
2. **Typecheck** — TypeScript strict mode
3. **Test** — Vitest (framework ready)
4. **Build Web** — Vite production
5. **Build Tauri** — `cargo tauri build` (macOS + Linux)

Release pipeline (`.github/workflows/release.yml`):
- Triggered on tag push (`v*`)
- Builds macOS (Apple Silicon + Intel) + Linux (AppImage)
- Creates draft GitHub Release

---

## 7. CURRENT STATE

### 7.1 Completeness

| Component | Status | Notes |
|-----------|--------|-------|
| Documentation | ✅ 90% | Theory, architecture, security, runbooks documented |
| Frontend UI | ✅ 85% | 20+ pages, 70+ components, Welcome Wizard |
| Rust Backend | ✅ 80% | Auth, posts, wallet, relays, blobs, communities |
| Nostr Integration | ✅ 75% | Relay manager, event publishing, sync, kind registry |
| Testing | ⚠️ 50% | 100 Rust unit tests; Vitest configured but hangs on Node 25 |
| Economy Engine | ✅ 70% | WeixBucks rewards, engagement quality, appeals, withdraw eligibility |
| Iroh Integration | ✅ 85% | Upload → CID, CID in Nostr imeta, fetch fallback |
| Solana / BKSPC | ⚠️ 20% | Devnet mint + treasury scripts; Anchor program stub; not wired end-to-end |

### 7.2 What's Working End-to-End

- ✅ **Install** — `setup.sh` / `setup.bat` or download release
- ✅ **Welcome** — first-run wizard
- ✅ **Signup** — key generation + mnemonic verification
- ✅ **Login** — challenge-response auth (Nostr kind 22242)
- ✅ **Feed** — view posts, create posts, reply, like
- ✅ **Profile** — view/edit profile, town selection, theme + music
- ✅ **Wallet** — transactions, WeixBucks balance, earn rates, appeals
- ✅ **Relays** — connect to Nostr relays, sync town tags, publish NIP-65
- ✅ **Media** — upload images/audio, SHA256 dedupe + Iroh CID
- ✅ **Communities** — yards, channels, events, roles, wall posts
- ✅ **Settings** — recovery phrase, sign out, privacy info

### 7.3 Known Gaps

- ❌ Vitest hangs on Node 25 (project targets Node 22)
- ❌ Vite production build fails on Node 25
- ❌ Solana/BKSPC not wired end-to-end (devnet scripts + stub program)
- ❌ Mobile builds not configured (iOS/Android future)
- ⚠️ Some error handling reduces errors to strings (`map_err`)
- ⚠️ `Cargo.lock` is gitignored (unusual for an application binary)

---

## 8. NEXT STEPS

1. **Node 22 downgrade** — fix Vitest hang and Vite build failure
2. **Device B M0 sign-off** — run `docs/implementation/DEVICE_MESH_TESTING.md` matrix
3. **Solana Phase 4** — complete BKSPC Anchor program, wire withdraw to devnet
4. **Write frontend tests** — Vitest suite currently empty of assertions beyond auth
5. **Mobile builds** — Tauri v2 mobile support
6. **Consider committing `Cargo.lock`** for reproducible Rust builds

---

## 9. KEY FILES

### Theory & Planning

| File | Lines | Purpose |
|------|-------|---------|
| `THEORY.md` | 141 | Investor pitch |
| `FLESHTHEORY.md` | 359 | Technical baseline |
| `plan.md` | 311 | Specification |
| `DEVOPS.md` | 143 | CI/CD pipeline |
| `TOP_DOWN_APPROACH.md` | ~500 | Kurose & Ross mapping |
| `REFERENCES.md` | ~150 | Academic citations |

### Code

| File | Lines | Purpose |
|------|-------|---------|
| `src-tauri/src/lib.rs` | ~3,300 | Core backend |
| `src-tauri/src/db.rs` | ~4,400 | Database layer |
| `src-tauri/src/relay_manager.rs` | ~600 | Nostr relay client |
| `src-tauri/src/blob_store.rs` | ~300 | Local + Iroh blob storage |
| `src/hooks/use-app-data.ts` | ~1,540 | Dual-mode data hooks |
| `src/lib/tauri-api.ts` | ~600 | IPC client |
| `src/lib/auth.ts` | ~240 | Nostr auth + BIP39 |
| `src/App.tsx` | ~134 | Router + error boundary |
| `lib/api-spec/openapi.yaml` | ~600 | API spec |

---

*This overview reflects the codebase as of 2026-06-20. For the original theoretical baseline, see `../FLESHTHEORY.md`.*
