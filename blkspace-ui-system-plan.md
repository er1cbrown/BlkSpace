# BlkSpace UI System — Living Status Map

**Last updated:** 2026-06-19  
**Code root:** `Code-Companion/artifacts/blkspace/src/`  
**Progress dashboard:** [`docs/phase-0-status.md`](docs/phase-0-status.md)  
**Canonical phases:** [`FLESHTHEORY.md`](FLESHTHEORY.md) §11 · [`plan.md`](plan.md)

This document describes the **BlkSpace UI as it exists today** — a full cross-platform social client with Nostr identity, Iroh media, simulated WeixBucks economy, HBCU yard communities, security-hardened feeds, and a developer-grade sync test harness. It maps product vision to real files, routes, and hooks so contributors can onboard without treating the app as greenfield.

**Scale (June 2026):**

| Metric | Count |
|--------|------:|
| TypeScript / TSX files in `src/` | 111 |
| shadcn/ui primitives in `components/ui/` | 62 |
| Route-level pages | 20 |
| Lines in `hooks/use-app-data.ts` | ~1,370 |
| Lines in `lib/tauri-api.ts` | ~1,220 |
| TanStack Query hooks (`use*` exports) | 80+ |
| Tauri command wrappers | 80+ |
| Rust lib tests (backend) | 104 passing |
| Frontend Vitest suites | `auth.test.ts`, `use-app-data.test.tsx` |

---

## Table of contents

1. [Project goals](#project-goals)
2. [Phase summary](#phase-summary)
3. [System overview](#system-overview)
4. [Authentication & identity](#authentication--identity)
5. [Social feed & interaction](#social-feed--interaction)
6. [Creative pipeline & media](#creative-pipeline--media)
7. [Communities & yards](#communities--yards)
8. [Network, relays & mesh sync](#network-relays--mesh-sync)
9. [Economy & wallet](#economy--wallet)
10. [Profile & MySpace theming](#profile--myspace-theming)
11. [Security & trust UI](#security--trust-ui)
12. [Layout, navigation & responsive design](#layout-navigation--responsive-design)
13. [State management & data layer](#state-management--data-layer)
14. [Dual-runtime: Tauri vs web preview](#dual-runtime-tauri-vs-web-preview)
15. [Cultural & future surfaces](#cultural--future-surfaces)
16. [Route map](#route-map)
17. [Source tree](#source-tree)
18. [Acceptance criteria & verification](#acceptance-criteria--verification)
19. [Open next steps](#open-next-steps)
20. [Related docs](#related-docs)

**Status legend:** ✅ Built · 🟡 Partial · ⬜ Not started

---

## Project goals

| Goal | Implementation today |
|------|----------------------|
| **Audience** | HBCU students and Black creators — five launch yards (TSU, Howard, Spelman, FAMU, Morehouse) in `lib/towns.ts` |
| **Mission** | Decentralized creator economy: Nostr events + Iroh blobs + simulated WeixBucks, scaling to Solana BlkCoin in Phase 4 |
| **Cultural foundation** | B.L.A.C.K. identity, TSU roots, Liberian heritage — branding in shell, profile themes, yard copy |
| **Hardware target** | Tier 0: 4–8 GB RAM laptops, 1 Mbps Wi‑Fi (`FLESHTHEORY.md` §4); benchmark UI in Sync Test |
| **MVP target** | End of Phase 3 — communities, full rewards surfacing, MySpace-style profiles |

---

## Phase summary

Aligned with [`docs/phase-0-status.md`](docs/phase-0-status.md). The original 8-week timeline in early drafts of this file is **retired** — delivery has outpaced that sketch.

| Phase | UI focus | Status | Notes |
|-------|----------|--------|-------|
| **0** | Theory, CI, docs | ✅ Complete | Repo, workflows, security docs |
| **1** | Auth, feed, profile, stub economy, security badges | ✅ Complete | 20 pages, full auth wizard, feed tabs |
| **2** | Iroh upload/playback, relays, offline queue, sync UX | ~90% | Auto tests pass; Device B manual open |
| **3** | Communities, cross-town, MySpace themes, rewards polish | ~55% | Yards live; events/roles stubbed |
| **4** | On-chain BlkCoin, NFT marketplace, Solana depth | Not started | Wallet has Anchor/Solana stub paths |
| **5** | LogosDecks, scripture NLP, release ops | Not started | Research in `weixinfo/` |

---

## System overview

BlkSpace is not a mockup sandbox — it is a **three-column social client** (desktop) with **Instagram-style mobile chrome** (bottom nav + compact top bar), backed by a Rust Tauri core and optional Express API for web preview.

```mermaid
flowchart TB
  subgraph ui [React UI Layer]
    Pages[pages/ — 20 routes]
    Layout[AppShell · Navbar · YardSidebar]
    Features[feed · social · profile · economy]
    Primitives[components/ui — 62 shadcn]
  end

  subgraph data [Data Layer]
    Hooks[use-app-data.ts — TanStack Query]
    Auth[lib/auth.ts — Nostr identity]
    Offline[OfflineSyncProvider]
  end

  subgraph backend [Backend Paths]
    Tauri[tauri-api.ts → Rust commands]
    API[@workspace/api-client-react]
    Mock[Mock posts in web preview]
  end

  Pages --> Layout
  Pages --> Features
  Features --> Hooks
  Hooks --> Tauri
  Hooks --> API
  Hooks --> Mock
  Auth --> Tauri
  Offline --> Tauri
```

**User journey (happy path):**

1. First visit → `welcome.tsx` five-step wizard (mission → handle → key gen → mnemonic backup → confirm)
2. Lands on `/feed` inside `AppShell` with yard sidebar showing town + WeixBucks
3. Posts via `PostComposer` — text, town tag, optional Iroh blob upload → earn toast
4. Profile at `/profile/:handle` — grid, wall, MySpace themes, top friends, relay list
5. Wallet at `/wallet` — send WB, marketplace, node rewards, Solana stub
6. Power users → `/relays` (Nostr), `/mesh-test` (sync/offline/Tier 0 bench)

---

## Authentication & identity

**Status: ✅ Built** — Nostr-first. There is **no password login**; identity is self-sovereign via `nsec` / BIP39 mnemonic.

### Surfaces

| Surface | Route | File | What it does |
|---------|-------|------|--------------|
| First-run wizard | `/welcome` | `pages/welcome.tsx` (~385 lines) | 5-step onboarding: mission, display name + handle, key generation, mnemonic display/hide, confirmation |
| Signup | `/signup` | `pages/signup.tsx` (~290 lines) | Standalone signup with `createNostrIdentity()`, phrase backup, `tauriCreateUser` on desktop |
| Login | `/login` | `pages/login.tsx` | `nsec` + handle → `derivePubkey` → `authenticateWithNostr` → `storeIdentity` |
| Recovery | `/recover` | `pages/recover.tsx` | Cross-device account sync path |
| Settings / keys | `/settings` | `pages/settings.tsx` (~496 lines) | Pubkey display (npub), mnemonic reveal, logout, **event signature verifier** dev tool |
| Landing | `/` | `pages/landing.tsx` | Marketing entry when first-run complete |

### Identity stack (`lib/auth.ts`)

- **Key generation:** `nostr-tools` `generateSecretKey` / `getPublicKey`
- **Mnemonic backup:** BIP39 via `bip39` — `nsecToMnemonic` / `mnemonicToNsec`
- **Formats supported:** hex `nsec` and `nsec1` bech32 (`nip19.decode`)
- **Storage split:**
  - **Tauri:** Rust secure key store via `tauriStoreKey` / `tauriGetKey`
  - **Web preview:** `sessionStorage` for secrets (tab-scoped); handle/display in `localStorage`
- **Session:** Challenge-response via `tauriGetChallenge` → `tauriLogin` → session token
- **First run:** `isFirstRun()` / `markFirstRunComplete()` gates `/` → Welcome vs Landing

### Town & university metadata

Town is a **profile field**, not a login credential. Five HBCU yards ship in `lib/towns.ts` with per-school Tailwind gradients (`TOWN_GRADIENTS`). Profile and composer both read town context; sidebar shows `townLabel()` + gradient header.

### Wireframe (as built)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Welcome Wizard  │ ──► │  Key + Mnemonic  │ ──► │  Feed (/feed)    │
│  handle + name   │     │  backup confirm  │     │  session active  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │                                                  │
         ▼                                                  ▼
┌──────────────────┐                              ┌──────────────────┐
│  Login (return)  │                              │  Settings: npub, │
│  nsec + handle   │                              │  verify events   │
└──────────────────┘                              └──────────────────┘
```

---

## Social feed & interaction

**Status: ✅ Built** — `pages/feed.tsx` (~621 lines) is the richest screen in the app.

### Feed modes (tabs)

| Tab | Component / logic | Purpose |
|-----|-------------------|---------|
| **Watch** | `WatchFeed.tsx` | Video-forward scroll experience |
| **Read** | `ReadFeed.tsx` | Text-first timeline |
| **Bridge** | `useTauriCombinedFeed` + cross-town events | Inter-yard discovery (`TauriCrossTownEvent`) |
| **FYP** | Inline ranking in `feed.tsx` | `likes × engagementQuality × (1 − maliciousScore)` — high-risk posts demoted |
| **Following** | Local + remote follows merge | `useTauriGetFollowing` + `localStorage` `blkspace_followed` |

### Post composer (`components/social/PostComposer.tsx`)

- Textarea with yard placeholder ("What's happening on the yard?")
- **Town selector** — all `TOWN_OPTIONS` with `MapPin` badge
- **Media attach** — file picker → base64 → `tauriUploadBlob` → hash appended to `media_hashes`
- Earn callback via `onUploadSuccess` → `EarnToast`
- Used on feed, create page, and community channels

### Engagement

| Action | Hook | UI feedback |
|--------|------|-------------|
| Like / unlike | `useAppToggleLike` | Optimistic invalidation |
| Repost | `useTauriRepostPost` | Following reposts stream |
| Reply | `pages/post.tsx` + `useAppCreateReply` | Thread view |
| Tip (WB) | `useAppSendWeixBucks` | Wallet integration |
| Trending summary | `useTauriPublishTrendingSummary` / `useTauriFetchTrendingSummaries` | Town-scoped summaries |

### Supporting surfaces

| Surface | Route | Status |
|---------|-------|--------|
| Post detail + replies | `/posts/:id` | ✅ `post.tsx` (~219 lines) |
| Create hub | `/create` | 🟡 `create.tsx` — post/reel/story modes; story = post for now |
| Search users/posts/communities | `/search` | ✅ `search.tsx` (~293 lines) |
| Notifications | `/notifications` | ✅ `notifications.tsx` |
| Leaderboard | `/leaderboard` | ✅ `leaderboard.tsx` — `useTauriGetKarmaLeaderboard` |
| Story strip | Feed header | 🟡 `StoryStrip.tsx` — UI shell |

### Offline-aware posting

When `isTauri() && !navigator.onLine`, successful compose shows: *"Post queued — will sync when you're back online"* (toast in `feed.tsx`). Queue flush lives in Sync Test.

### Wireframe (as built)

```
┌─────────────────────────────────────────────────────────────────┐
│  AppShell                                                        │
│  ┌─────────┐  ┌──────────────────────────┐  ┌───────────────┐  │
│  │ Left    │  │ StoryStrip               │  │ YardSidebar   │  │
│  │ nav     │  │ Tabs: Watch | Read | …   │  │ town + WB     │  │
│  │         │  │ PostComposer             │  │ trending      │  │
│  │         │  │ Post cards + badges      │  │ suggested     │  │
│  └─────────┘  └──────────────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Creative pipeline & media

**Status: 🟡 Partial** — upload and playback work; standalone creator studio and editors are not built.

### What ships

| Capability | Status | Implementation |
|------------|--------|----------------|
| Upload in composer | ✅ | `PostComposer` → `tauriUploadBlob` → CID/hash on post |
| Blob list on profile | ✅ | `tauriListUserBlobs`, `ProfileGrid` |
| Media render | ✅ | `components/ui/media-display.tsx` |
| Account-bound library | ✅ | `pages/media.tsx` redirects to `/profile/:handle?tab=grid` |
| Create modes | 🟡 | Post / reel / story toggle in `create.tsx` |
| DJ mix publish | 🟡 | `useTauriPublishMix` in wallet flows |
| Offline cache / prefetch | ✅ | `tauriPrefetchContent`, `tauriListOfflineCache`, Sync Test UI |
| Pin rewards | ✅ | `tauriPinContent`, `tauriReportPinServe` — node harvest path |

### What is deferred

| Capability | Phase | Notes |
|------------|-------|-------|
| Dedicated Upload Center page | — | Upload embedded in composer — intentional for Tier 0 simplicity |
| Standalone media player chrome (CID, cache bar) | 🟡 | Data available in Sync Test; no consumer player shell |
| Audio mixer / video editor | ⬜ | Parking lot |
| NFT mint from upload | ⬜ | Phase 4 — wallet Solana stub only |

### Earn on creation (`lib/earn-sources.ts`)

```typescript
WB_EARN.mediaUpload: 10
KARMA_EARN.mediaCreation: 5
```

Categories documented: `creation`, `community`, `engagement`, `node`.

---

## Communities & yards

**Status: 🟡 Partial** — yards are fully navigable; admin/events are stubbed.

### Communities list (`pages/communities.tsx`)

- Loads yards via `useTauriGetCommunities`
- Cards with school, location, member counts
- Links to `/communities/:id`

### Yard hub (`pages/community.tsx` — ~701 lines)

**Built:**

- Per-yard metadata (TSU, Howard, Spelman, FAMU, Morehouse fallback copy)
- **Join yard** → `useTauriJoinYard` + earn toast (`WB_EARN.joinYard`, `KARMA_EARN.joinYard`)
- **Channels** — `useTauriListChannels`, `tauriCreateChannel`, channel-scoped posts
- Channel replies via `tauriCreateReply`
- Member list from `useTauriListUsers`
- `ExperimentalMessagingWarning` on yard chat surfaces
- Security badges on channel posts
- `AppShell` with `fullWidth` for chat layout

**Stubbed (toast placeholders):**

- Event creation — *"Event creation coming soon"*
- Role management — *"Role management in Phase 2"*
- Some earn flows — *"coming in Phase 2G"*

**Backend hooks present but UI thin:**

- `tauriSetNodeRole`, `tauriSetCommunityRole`, `tauriGetCommunityRole`

### Wireframe

```
┌─────────────────┐     ┌─────────────────────────────────────┐
│  /communities   │ ──► │  /communities/:id                   │
│  yard cards     │     │  header · join · channels · chat    │
└─────────────────┘     └─────────────────────────────────────┘
```

---

## Network, relays & mesh sync

**Status: ✅ Built (UI)** — operational Nostr tooling; BLE/LAN deferred.

### Relays page (`pages/relays.tsx` — ~643 lines)

| Feature | Hook / command |
|---------|----------------|
| Network stats | `useAppGetNetworkStats`, `useTauriRelayNetworkStats` |
| Relay list + status | `useAppListRelays`, `useTauriRelayStatuses` |
| Connect / disconnect | `useTauriConnectToRelay`, `useTauriDisconnectFromRelay` |
| Default relay bundle | `useTauriConnectToDefaultRelays` |
| Per-relay health + latency | `useTauriCheckRelayHealth` |
| Town event sync | `useTauriSyncTownEvents` |
| **NIP-65** publish | `useTauriPublishRelayList` |
| **NIP-65** fetch | `useTauriFetchUserRelayList` |
| Damus visibility test | `useTauriPublishNostrVisibilityTest` |
| Recent activity stream | `useAppGetRecentActivity` |

Profile embed: `ProfileRelayList.tsx` on `/profile/:handle`.

### Sync Test (`pages/mesh-test.tsx` — ~678 lines)

Developer-facing **hub-sync control panel** (not end-user BLE mesh):

| Tab / section | Capabilities |
|---------------|--------------|
| **Sync** | Account content sync, relay town sync, device ID tracking, sync history log |
| **Offline** | Pending action count, flush queue, offline cache list, pinned content |
| **Performance** | `tauriRunTier0Benchmark` — Tier 0 report display |
| **Checklist** | Phase-gated manual test labels (recovery, cross-device, offline flush, stress) |

`OfflineSyncProvider` (`lib/offline-sync.tsx`) wraps the app for background sync awareness.

### Deferred

- BLE discovery UI — ⬜ per `MESH_ARCHITECTURE.md`
- LAN assist (M2) — only if dorm offline blob transfer becomes mandatory

---

## Economy & wallet

**Status: 🟡 Partial** — simulated WeixBucks economy is rich; on-chain Phase 4 is stubbed.

### Dual reputation system (`lib/earn-sources.ts`)

| System | Role | Properties |
|--------|------|------------|
| **WeixBucks (WB)** | Spendable currency | Tips, boosts, themes, shop; 250 WB/day cap; MIDF throttle |
| **Karma** | Reputation score | Post + comment karma; affects FYP ranking and leaderboard; **not** purchasable |

### Wallet page (`pages/wallet.tsx` — ~953 lines)

| Tab / area | Status | Details |
|------------|--------|---------|
| Balance + overview | ✅ | Pulls user via `useAppGetUser` |
| Send WeixBucks | ✅ | `useAppSendWeixBucks` |
| Transaction history | ✅ | `useTauriGetWalletTx` (Tauri) or mock history (web) |
| Earn summary | ✅ | `useTauriGetEarnSummary` |
| Node rewards claim | ✅ | `tauriClaimNodeRewards` |
| Marketplace | 🟡 | List/create/buy via Tauri marketplace commands |
| Theme unlock | 🟡 | Simulated + Solana NFT stub toast |
| DJ mix publish | 🟡 | `useTauriPublishMix` |
| Solana withdraw | 🟡 | `useAppWithdrawToSolana` + `@solana/web3.js` |
| Anchor CPI stub | 🟡 | `@coral-xyz/anchor` for future `mint_rewards` |

### Economy UI components

- `components/economy/EarnToast.tsx` — surfaces earn payloads after mutations
- `components/economy/KarmaBadge.tsx` — karma on posts and profiles
- `YardSidebar` — live WB badge on user card

### YardSidebar economy surfacing

Desktop right rail shows town gradient header, avatar, `townLabel`, and **WB balance badge** with link to wallet — the plan's "Wallet in navigation" is implemented in three places: Navbar icon, left rail profile chip, and sidebar card.

---

## Profile & MySpace theming

**Status: 🟡 Partial** — strong MySpace revival; music embed depth TBD.

### Profile page (`pages/profile.tsx` — ~734 lines)

| Feature | Status | Notes |
|---------|--------|-------|
| Avatar, bio, town, school | ✅ | `useAppGetUser` |
| Post grid | ✅ | `ProfileGrid` + `useAppGetUserPosts` |
| Wall posts | ✅ | `useTauriListWallPosts`, create/approve flow |
| Top friends | ✅ | `TopFriends` — MySpace pattern |
| Pro profile tab | ✅ | `ProProfileTab` |
| Theme picker | ✅ | `classic` · `pro` · `vibrant` · `myspace` |
| Customization persist | ✅ | `useTauriUpdateProfileCustomization`, `useTauriUpdateProProfile` |
| Relay list (NIP-65) | ✅ | `ProfileRelayList` |
| Karma badge | ✅ | On profile header |
| Blob library | ✅ | `tauriListUserBlobs` for owned media |
| Music hash embed | 🟡 | Fields exist; full player chrome TBD |

### Theme system

- **App chrome:** `next-themes` dark/light in `AppShell` + `Navbar`
- **Profile skins:** Theme keys mapped in `profile.tsx` (`themeKeyFromId`)
- **Town colors:** Per-yard gradients in `lib/towns.ts` (not separate CSS theme files)
- **Design tokens:** Tailwind v4 `@theme inline` in `index.css` — full shadcn token set (primary, accent, sidebar, charts, typography)

---

## Security & trust UI

**Status: ✅ Built** — first-class MIDF and signature surfaces per `docs/security-considerations.md`.

### Feed & post badges

| Component | File | Shows |
|-----------|------|-------|
| Signature badge | `signature-badge.tsx` | Nostr event signature validity |
| Risk badge | `risk-badge.tsx` | `riskLevel` + malicious score band |
| Consensus badge | `consensus-badge.tsx` | Multi-relay agreement |
| Safe content | `safe-content.tsx` | Sanitized post body render |
| Signature warning banner | `signature-warning-banner.tsx` | Publish warnings |
| Experimental messaging | `experimental-messaging-warning.tsx` | Yard chat disclaimer |

### Feed-level MIDF integration

`feed.tsx` implements:

- `isHighRisk()` — demotes `riskLevel === "high"` or `maliciousScore > 0.7`
- `showFlagged` toggle for moderated visibility
- FYP ranking uses `engagementQuality` and `maliciousScore`

### Settings dev tools

- Paste raw Nostr event JSON → `tauriVerifyNostrEvent` → validity badge + event id/pubkey display
- Pubkey shown as npub; mnemonic reveal behind confirmation

### Backend hooks (UI-ready)

`use-app-data.ts` exposes graph and MIDF tooling: `useTauriGetFollowerGraph`, `useTauriCalculateMaliciousIntentVector`, `useTauriGetMaliciousIntentScores`, `useTauriListRelayEventsWithConsensus`, etc.

---

## Layout, navigation & responsive design

**Status: ✅ Built** — `AppShell.tsx` is a production-grade three-breakpoint shell.

### Desktop (md+)

| Column | Width | Content |
|--------|------:|---------|
| Left rail | 240px | Logo, primary nav (Home, Create, Yards, Wallet, Profile), search, notifications, theme toggle, user chip with WB |
| Center | max 640px (default) / 3xl (wide) / 5xl (fullWidth) | Page content |
| Right rail | 320px (xl+) | `YardSidebar` — hidden when `hideRightRail` |

### Mobile

- Sticky top bar: logo, search, notifications
- Fixed bottom nav: Home · Explore · **Create (+)** · Yards · Profile
- Center column full width; side rails hidden
- `safe-area-pb` on bottom nav for notched devices

### Marketing / auth pages

Use `Navbar.tsx` only (no AppShell) — landing, login, signup, recover, relays, mesh-test, architecture.

### Navbar (`Navbar.tsx`) — secondary nav

Feed · Media · Communities · Network · Sync Test · Stack · Search · Notifications · Wallet · Profile · theme toggle · mobile hamburger.

---

## State management & data layer

### Provider tree (`App.tsx`)

```
ErrorBoundary
└── ThemeProvider (next-themes)
    └── QueryClientProvider (@tanstack/react-query)
        └── OfflineSyncProvider
            └── WouterRouter
                └── Router (React.lazy pages)
            └── Toaster
```

`WalletContextProvider` mounts inside wallet page for Solana adapter scope.

### `hooks/use-app-data.ts` — the app's nervous system

Single module (~1,370 lines) wrapping:

1. **REST API hooks** — `@workspace/api-client-react` for web/Express path
2. **Tauri hooks** — direct `tauri-api.ts` commands
3. **Mock fallbacks** — `MOCK_POSTS` and friends so `pnpm dev` Vite preview is never empty

**Hook groups (80+ exports):**

| Group | Examples |
|-------|----------|
| Social | `useAppListPosts`, `useAppCreatePost`, `useAppToggleLike`, `useTauriRepostPost` |
| Users | `useAppGetUser`, `useTauriSearchUsers`, `useTauriToggleFollow` |
| Relays | `useTauriRelayStatuses`, `useTauriPublishRelayList`, `useTauriSyncTownEvents` |
| Blobs / Iroh | Upload via `tauriUploadBlob` in composer; pin/cache hooks in mesh |
| Offline | `useTauriFlushOfflineQueue`, `useTauriGetPendingOfflineActions` |
| Economy | `useTauriGetWalletTx`, `useAppSendWeixBucks`, `useTauriGetEarnSummary` |
| Communities | `useTauriGetCommunities`, `useTauriJoinYard`, `useTauriListChannels` |
| Profile | `useTauriUpdateProfileCustomization`, `useTauriUpdateTopFriends` |
| Security / MIDF | `useTauriListRelayEventsWithConsensus`, `useTauriCalculateMaliciousIntentVector` |
| Benchmark | `useTauriRunTier0Benchmark` |

### `lib/tauri-api.ts` — typed Tauri boundary

~80 exported functions covering auth, posts, relays, blobs, offline queue, marketplace, yards, wall posts, karma leaderboard, and malicious-intent scoring. All UI mutations funnel through this file or the API client.

### Performance patterns

| Pattern | Where |
|---------|-------|
| Route-level `React.lazy` | All non-landing routes in `App.tsx` |
| `React.Suspense` fallback | Router wrapper |
| Error boundary | White-screen recovery with stack display |
| Query invalidation | Targeted keys after mutations (`tauri`, `posts`, town-scoped) |
| Mock data gate | `IS_TAURI` check in `use-app-data.ts` |
| Tier 0 benchmark | Surfaced in Sync Test, not hidden in dev-only CLI |

---

## Dual-runtime: Tauri vs web preview

| Capability | Tauri desktop | Web (`pnpm dev`) |
|------------|---------------|------------------|
| Nostr key storage | Rust key store | `sessionStorage` |
| Posts / feed | Live SQLite + relays | Mock posts |
| Blob upload | `tauriUploadBlob` | Disabled / toast |
| Wallet txs | Real ledger | Mock history |
| Offline queue | Full | N/A |
| Relays UI | Live connections | UI shell, limited |

`IS_TAURI` and `isTauri()` gate behavior throughout. This lets frontend-only dev on ~200 MB RAM machines per `AGENTS.md`.

---

## Cultural & future surfaces

| Surface | Status | Phase |
|---------|--------|-------|
| HBCU yard copy + town gradients | ✅ | 1–3 |
| MySpace profile themes | ✅ | 3 |
| B.L.A.C.K. / Liberia / Kwanzaa heritage hub | ⬜ | Dedicated UI not built — assets in branding docs |
| LogosDecks (Bible DJ) | ⬜ | Phase 5 — `docs/features/logos-decks.md` |
| Scripture search / commentary | ⬜ | Phase 5 |
| Flash / emulator / gaming hub | ⬜ | Parking lot |
| Stack explainer for users | ✅ | `pages/architecture.tsx` |

---

## Route map

From `App.tsx` — all routes lazy-loaded except first-run routing logic.

| Route | Page file | Shell | Primary purpose |
|-------|-----------|-------|-----------------|
| `/` | `landing.tsx` or `welcome.tsx` | Navbar | Entry |
| `/welcome` | `welcome.tsx` | Navbar | Onboarding wizard |
| `/login` | `login.tsx` | Navbar | Return login |
| `/signup` | `signup.tsx` | Navbar | Alt signup |
| `/recover` | `recover.tsx` | Navbar | Account recovery |
| `/feed` | `feed.tsx` | AppShell | Main social timeline |
| `/posts/:id` | `post.tsx` | AppShell | Thread |
| `/create` | `create.tsx` | AppShell | Post / reel / story |
| `/profile/:handle` | `profile.tsx` | AppShell | MySpace profile |
| `/media` | `media.tsx` | — | Redirect → profile grid |
| `/wallet` | `wallet.tsx` | AppShell | Economy dashboard |
| `/communities` | `communities.tsx` | AppShell | Yard list |
| `/communities/:id` | `community.tsx` | AppShell (fullWidth) | Yard hub + channels |
| `/search` | `search.tsx` | AppShell | Discovery |
| `/notifications` | `notifications.tsx` | AppShell | Alerts |
| `/leaderboard` | `leaderboard.tsx` | AppShell | Karma ranks |
| `/settings` | `settings.tsx` | AppShell | Account + security tools |
| `/relays` | `relays.tsx` | Navbar | Nostr network |
| `/mesh-test` | `mesh-test.tsx` | Navbar | Sync / offline / Tier 0 |
| `/architecture` | `architecture.tsx` | Navbar | Stack education |

---

## Source tree

```
src/  (111 files)
├── App.tsx                      # Router, providers, lazy imports, ErrorBoundary
├── index.css                    # Tailwind v4 design tokens
├── pages/                       # 20 route screens (~6,000+ lines total)
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx         # 3-column + mobile bottom nav
│   │   ├── Navbar.tsx           # Marketing / secondary nav
│   │   └── YardSidebar.tsx      # Right rail: user, WB, trending
│   ├── feed/
│   │   ├── ReadFeed.tsx
│   │   └── WatchFeed.tsx
│   ├── social/
│   │   ├── PostComposer.tsx     # Text + town + Iroh upload
│   │   └── StoryStrip.tsx
│   ├── profile/
│   │   ├── ProfileGrid.tsx
│   │   ├── TopFriends.tsx
│   │   ├── ProProfileTab.tsx
│   │   └── ProfileRelayList.tsx
│   ├── economy/
│   │   ├── EarnToast.tsx
│   │   └── KarmaBadge.tsx
│   ├── ui/                      # 62 shadcn primitives + security badges
│   └── WalletContextProvider.tsx
├── hooks/
│   ├── use-app-data.ts          # ~80 TanStack Query hooks
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/
│   ├── auth.ts                  # Nostr identity + session
│   ├── tauri-api.ts             # ~80 Tauri commands
│   ├── towns.ts                 # HBCU yard definitions
│   ├── earn-sources.ts          # WB + Karma constants
│   ├── offline-sync.tsx         # OfflineSyncProvider
│   └── utils.ts
└── test/
    ├── auth.test.ts
    ├── use-app-data.test.tsx
    └── setup.ts
```

---

## Acceptance criteria & verification

### Phase 1 — ✅ met

- [x] New user completes welcome wizard and reaches `/feed` with session
- [x] Post with town tag renders in feed (Tauri or mock preview)
- [x] Profile shows town, WB, post grid, themes
- [x] Security badges visible on feed items
- [x] Frontend Vitest + Rust lib tests pass in CI

### Phase 2 — 🟡 ~90%

- [x] Composer upload returns blob hash; Iroh auto tests pass (see phase-0-status)
- [x] Relays: NIP-65 publish/fetch, visibility test, health checks
- [x] Offline queue flush from Sync Test
- [x] Hub-sync M1: kind 1063 on upload, reply Nostr flush
- [ ] **Device B** Tier 0 manual sign-off (Windows 4 GB / i3)
- [ ] **M0 manual matrix** — [`DEVICE_MESH_TESTING.md`](docs/implementation/DEVICE_MESH_TESTING.md)

### Phase 3 — 🟡 ~55%

- [x] Communities list + yard detail with channels and join flow
- [x] Cross-town Bridge tab in feed
- [x] MySpace profile themes (4 variants) + top friends + wall
- [x] Karma leaderboard
- [ ] Community events UI
- [ ] Community role management UI
- [ ] Cross-town UX polish
- [ ] Full rewards surfacing across all earn paths

### Phase 4+ — not started

- [ ] Production BlkCoin on-chain flows
- [ ] NFT DJ tickets / creator store
- [ ] LogosDecks UI

### Manual smoke (~20 min)

| Check | Where |
|-------|-------|
| NIP-65 publish + fetch | Relays → Publish my relay list → Refresh |
| Damus visibility | Relays → Publish visibility test note |
| Security badges | Feed, post detail, Settings |
| Upload + earn toast | Feed or Create → attach media → post |
| Offline flush | Sync Test → Offline → Flush Now |
| Tier 0 benchmark | Sync Test → Performance |

---

## Open next steps

Priority from [`docs/phase-0-status.md`](docs/phase-0-status.md):

1. **Device B manual matrix** — second desktop; exercise recovery, cross-device sync &lt;60s, offline flush, CID round-trip, Tier 0 benchmark
2. **Phase 3 UI completion** — community events, role management, cross-town polish, earn path consistency
3. **Update this doc** when a 🟡 row moves to ✅

Deferred unless required:

- **M2 LAN assist** — dorm offline blob transfer
- **BLE mesh panel** — no UI until hub-sync LAN path is mandated

---

## Related docs

| Doc | Use for |
|-----|---------|
| [`docs/phase-0-status.md`](docs/phase-0-status.md) | Test counts, phase percentages, status line |
| [`FLESHTHEORY.md`](FLESHTHEORY.md) | Canonical phase definitions, Tier 0 spec |
| [`plan.md`](plan.md) | Master roadmap |
| [`docs/security-considerations.md`](docs/security-considerations.md) | Threat model + UI §2.4 |
| [`docs/implementation/IROH_INTEGRATION.md`](docs/implementation/IROH_INTEGRATION.md) | Upload/CID criteria |
| [`docs/implementation/REAL_NOSTR_RELAYS.md`](docs/implementation/REAL_NOSTR_RELAYS.md) | Relay criteria |
| [`docs/implementation/MESH_ARCHITECTURE.md`](docs/implementation/MESH_ARCHITECTURE.md) | Hub-sync mesh plan |
| [`docs/implementation/DEVICE_MESH_TESTING.md`](docs/implementation/DEVICE_MESH_TESTING.md) | M0 manual checklist |
| [`platform-comparison-analysis.md`](platform-comparison-analysis.md) | Market positioning |

---

## Maintenance

When shipping UI work:

1. Update the relevant section's status (✅ / 🟡 / ⬜)
2. Add file paths if new pages or components land
3. Bump **Last updated** at the top
4. Sync phase % with `docs/phase-0-status.md` if a phase boundary crosses

*This is a living map of a robust system — not a proposal for what to build from zero.*