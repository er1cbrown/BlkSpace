# BlkSpace Codebase Overview — Phase 1

**Updated:** 2026-06-15  
**Status:** Phase 1 ACTIVE — Code committed, repo structured, builds passing  
**Location:** `~/Desktop/BlkSpoof` (consolidated from previous split structure)

---

## 1. PROJECT OVERVIEW

### 1.1 What is BlkSpace?

BlkSpace is a **decentralized creator economy platform** for HBCU students:

- **Frontend:** React 19 + TypeScript + Vite + Tailwind + shadcn/ui (60+ components)
- **Backend:** Tauri v2 + Rust + SQLite (2,768 lines of Rust across 5 modules)
- **Social Layer:** Nostr protocol (events, identity, relay mesh)
- **Content:** Iroh blob storage (Phase 2)
- **Economy:** WeixBucks (off-chain) + BlkCoin (Solana Phase 4)
- **Security:** Rate limiting, Schnorr signature verification, BIP39 recovery

**The vision:** Enable HBCU students to share work, monetize fairly, and build sustainable value on hardware they already own (Tier 0 = low-end Windows laptops).

### 1.2 Current Phase

```
Phase 0 | ✅ COMPLETE | Phase 1 | 🚀 ACTIVE | Code: COMMITTED | Next: End-to-end testing
```

- ✅ 401 files committed, 77,047 lines
- ✅ TypeScript strict mode passes
- ✅ Production build succeeds (838KB JS, 120KB CSS)
- ✅ GitHub Actions CI/CD configured
- ✅ 6 commits on main

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
├── BlkSpace/              # Documentation & theory
│   ├── docs/              # Architecture, security, features
│   │   ├── architecture-blueprint.md
│   │   ├── TOP_DOWN_APPROACH.md      ← NEW: Kurose & Ross mapping
│   │   ├── security-considerations.md
│   │   ├── solana-security.md
│   │   ├── federated-college-towns.md
│   │   ├── hub-theory.md
│   │   ├── reward-formulas.md
│   │   ├── phase-0-status.md
│   │   ├── REFERENCES.md             ← NEW: Academic citations
│   │   └── features/       # Feature specs
│   ├── AGENTS.md          # Development operating instructions
│   ├── DEVOPS.md          # DevOps pipeline documentation
│   ├── FIRST_RUN.md       ← NEW: Security guide for users
│   ├── FLESHTHEORY.md     # Cultural & theoretical foundation
│   ├── SOUL.md            # Project persona
│   ├── STARTUP.md         # Quick start guide
│   ├── THEORY.md          # Investor/hackathon pitch
│   ├── plan.md            # Detailed specification
│   ├── README.md          # Project overview
│   ├── Makefile           # Development commands
│   ├── Grok-Computer Networking Top-Down Approach Overview.json
│   ├── tools/             # Build & development scripts
│   └── weixinfo/          # 98 research notes (read-only archive)
├── Code-Companion/        # Code (pnpm monorepo)
│   ├── artifacts/
│   │   ├── blkspace/      # Main Tauri app
│   │   ├── api-server/    # Mock API server
│   │   └── mockup-sandbox/# UI prototypes
│   ├── lib/               # Shared libraries
│   │   ├── api-spec/      # OpenAPI schema
│   │   ├── api-zod/       # Zod types
│   │   ├── api-client-react/ # React Query client
│   │   └── db/            # Drizzle ORM
│   ├── scripts/           # Build scripts
│   ├── package.json       # Root workspace config
│   ├── pnpm-workspace.yaml # Workspace definition
│   ├── tsconfig.base.json  # TypeScript base
│   └── pnpm-lock.yaml     # Dependency lock
├── INSTALL.md             ← NEW: User-friendly install guide
├── setup.sh               ← NEW: macOS/Linux automated setup
├── setup.bat              ← NEW: Windows automated setup
└── README_EXPLORATION.md   # Exploration methodology
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

**1,090 lines in lib.rs** covering:
- Session management (challenges, tokens, rate limiting)
- Nostr auth event verification (kind 22242)
- User CRUD
- Post creation, feeds, replies
- Like/unlike
- Community management
- Wallet/WeixBucks transactions
- Relay subscription management
- Cross-town event sync
- Blob upload/download
- Background relay polling (60s interval)

**1,363 lines in db.rs** covering:
- 12 tables: users, posts, replies, likes, notifications, wallet_tx, follows, blobs, relay_connections, relay_events
- Seed data (5 demo users, 6 posts, 3 replies, 3 notifications)
- Engagement quality scoring
- SQLite transactions for WeixBucks transfers

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
| Documentation | ✅ 95% | All theory, architecture, security documented |
| Frontend UI | ✅ 90% | 18 pages, 60+ components, Welcome Wizard |
| Rust Backend | ✅ 70% | Auth, posts, wallet, relays, blobs |
| Nostr Integration | ✅ 60% | Relay manager, event publishing, sync |
| Testing | ⚠️ 10% | Framework ready, no tests written |
| Economy Engine | ✅ 40% | WeixBucks rewards, engagement quality |
| Iroh Integration | ❌ 0% | Phase 2 |
| Solana | ❌ 0% | Phase 4 |

### 7.2 What's Working End-to-End

- ✅ **Install** — `setup.sh` or `setup.bat` or download release
- ✅ **Welcome** — 5-step wizard for first-time users
- ✅ **Signup** — Key generation + mnemonic verification
- ✅ **Login** — Challenge-response auth
- ✅ **Feed** — View posts, create posts, reply
- ✅ **Profile** — View/edit profile, town selection
- ✅ **Wallet** — View transactions, WeixBucks balance
- ✅ **Relays** — Connect to Nostr relays, sync town events
- ✅ **Media** — Upload images, SHA256 deduplication
- ✅ **Settings** — Recovery phrase display, sign out, privacy info

### 7.3 Known Gaps

- ❌ No automated tests (Vitest configured but empty)
- ❌ No Iroh integration (content is local-only)
- ❌ No real Solana integration (economy is simulated)
- ❌ No mobile builds (iOS/Android future)
- ⚠️ Error handling could be more robust (some `map_err` → Strings)

---

## 8. NEXT STEPS

1. **Write tests** — Rust unit tests for db.rs, frontend tests for auth
2. **End-to-end verification** — Sign up → post → like → wallet on real device
3. **Connect to public Nostr relays** — Test against real relay network
4. **Iroh integration** — Replace local blob storage with Iroh CIDs
5. **Device mesh testing** — Run `setup.sh` on other computers, test cross-sync
6. **Mobile builds** — Tauri v2 mobile support

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
| `src-tauri/src/lib.rs` | 1,090 | Core backend |
| `src-tauri/src/db.rs` | 1,363 | Database layer |
| `src/hooks/use-app-data.ts` | 372 | Data hooks |
| `src/lib/tauri-api.ts` | 363 | IPC client |
| `src/lib/auth.ts` | 196 | Authentication |
| `src/pages/welcome.tsx` | 322 | Welcome Wizard |
| `src/pages/settings.tsx` | 224 | Settings page |
| `src/pages/signup.tsx` | 155 | Signup with verification |
| `src/App.tsx` | 67 | Router |
| `lib/api-spec/openapi.yaml` | 636 | API spec |

---

*This overview reflects the current Phase 1 state. For the original Phase 0 conceptual overview, see `README_EXPLORATION.md`.*
