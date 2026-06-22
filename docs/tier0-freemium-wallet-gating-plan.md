# Tier 0 Freemium + Wallet-Gating Plan

**Date:** 2026-06-22  
**Status:** Proposal for beta (Device 2 / Tier 0 sign-off)  
**Goal:** Keep BlkSpace usable for *everybody*, including the weakest PCs, while gating advanced/creator/node features behind a lightweight wallet/identity layer.

---

## 1. Core Insight

BlkSpace should not force every user to run a wallet, relay, or dev node on day one. The healthiest adoption path is:

> **Browse first, earn/own later.**

A Tier 0 laptop with 4 GB RAM should be able to:
- Open the app
- Watch / read the FYP
- Search profiles and yards
- See trending content

That same machine should *not* be required to:
- Run Iroh uploads
- Pin blobs for others
- Host a relay
- Mint/swap tokens
- Customize a MySpace theme
- Access developer tools

This mirrors how mainstream platforms grow: TikTok, YouTube, Instagram, and X all let you consume anonymously before asking you to create an account or pay.

---

## 2. Competitive Positioning

From `docs/platform-comparison-analysis.md`:

| Platform | Free Browse? | Wallet/Creator Gate? | Tier 0 Friendly? |
|----------|-------------|----------------------|------------------|
| **TikTok** | ✅ FYP without login | Creator tools + shop require account | ❌ mobile-only |
| **YouTube** | ✅ watch without login | Upload/channel requires Google account | ❌ heavy web app |
| **Instagram** | ⚠️ limited browse, prompts login | Post/shop/reels monetization gated | ❌ mobile-first |
| **X/Twitter** | ✅ read without login (rate limited) | Premium / creator subs gated | ⚠️ standard web |
| **Spill** | ❌ app-first, no anonymous web | revenue sharing for creators | ❌ standard phone |
| **Fanbase** | ❌ invite/account gate | equity + subscriptions | ❌ standard phone |
| **Our Social** | ✅ feature-phone friendly | Web3 wallet optional | ✅ low-end |
| **BlkSpace (proposed)** | ✅ full FYP + search | Post/creator/node/dev features wallet-gated | ✅ **Tier 0 laptops** |

**Differentiation:**
- Only BlkSpace combines **anonymous browse**, **wallet-gated creator economy**, and **Tier 0 desktop compatibility**.
- Only BlkSpace treats low-end Windows laptops as a first-class launch target, not an afterthought.

---

## 3. Feature-Gating Matrix

### 3.1 Anonymous / No-Wallet Tier (always free, Tier 0 optimized)

| Feature | Why free | Tier 0 impact |
|---------|----------|---------------|
| Welcome / landing page | onboarding | minimal |
| Read/Watch FYP tabs | core discovery | optimized feed, lazy load |
| Search profiles & yards | social discovery | lightweight Nostr queries |
| View public posts + comments | content consumption | no write load |
| View trending summaries | discovery | cached kind 1030 |
| Security badges (read-only) | trust | no compute cost |
| Town / yard directory | exploration | static-ish data |

**Technical baseline:** no `nsec` required, no SQLite write load beyond cache, no Iroh upload, no relay publish.

### 3.2 Wallet / Identity Tier (free to create, required for write/actions)

| Feature | Why gated | Cost / complexity unlocked |
|---------|-----------|---------------------------|
| Create account / handle | identity = Nostr keypair | key gen + mnemonic backup |
| Post / reply / like | writes to relays + local DB | DB writes, relay pub, rate limits |
| Follow / unfollow | social graph | NIP-02 list management |
| Join yard | reputation + rewards | WB grant, rate-limit accounting |
| Media upload | Iroh blob store | RAM/disk/CPU for hashing |
| Profile customization (themes, music, top friends) | storage + personal state | DB writes, blob refs |
| Send tips / boosts | economy | WB transfer events |
| Wallet view + earn summary | economy | balance + tx history |

**This tier is still free to use** — the "gate" is creating an identity, not paying money. It keeps spam expensive (keypair + MIDF) while remaining open.

### 3.3 Creator / Power-User Tier (wallet + reputation/Karma)

| Feature | Gate | Why |
|---------|------|-----|
| Marketplace listing / shop | wallet + Karma threshold | reduce scam listings |
| DJ mix NFT publish | wallet + WB cost | content ownership, anti-spam |
| Custom profile themes beyond defaults | wallet + WB optional | cosmetic sink |
| Run a relay / pin node | wallet + Tier 1+ hardware | node rewards, resource commitment |
| Dev tools (event verifier, sync test, relay admin) | wallet + dev flag | protect casual users from complexity |
| LogosDecks scripture mix publish | wallet + Karma | cultural content quality gate |

### 3.4 Optional Premium / Patreon-Style Tier (Phase 4+)

| Feature | Model | Purpose |
|---------|-------|---------|
| Profile badges / verified yard affiliation | subscription or BKSPC stake | creator revenue + trust |
| Boosted posts | WB or fiat -> WB | algorithmic amplification |
| Exclusive yard channels | creator-defined access | Patreon-style community |
| Premium themes / music embeds | WB one-time or subscription | cosmetic monetization |
| Withdraw to Solana / BlkCoin | KYC/counsel-gated | off-ramp compliance |

**Important:** The base browse experience never requires payment. Premium is additive.

---

## 4. How This Protects Tier 0

From `docs/TIER0_DEV.md`, the biggest Tier 0 enemies are:
1. Cold-cache dev toolchain
2. Iroh / Rust crate bloat
3. Full workspace builds
4. Swap thrashing

This plan protects the **user runtime** on Tier 0 by:

| Pain Point | Mitigation via gating |
|------------|----------------------|
| Iroh upload RAM spikes | Anonymous users never upload; wallet users trigger upload only when they choose |
| SQLite write pressure | No-wallet tier is read-mostly; writes are gated behind account creation |
| Relay publishing bandwidth | Anonymous users don't publish; wallet users publish on their own actions |
| Complex UI chrome | Dev tools, node panels, wallet advanced tabs hidden behind identity/role checks |
| Large binary / feature flags | No-wallet build can compile without Solana/Anchor libs; wallet tier lazy-loads them |

**Result:** The "guest" app is the smallest, fastest variant of BlkSpace — perfect for 4 GB laptops and for onboarding.

---

## 5. Implementation Roadmap

### 5.1 Phase 0: Anonymous Read-Only Mode (beta-ready for Device 2)

**Goal:** Ship a no-wallet build that passes Tier 0 benchmarks on Device 2.

Tasks:
1. Add `GuestModeProvider` / `useGuestMode()` hook.
2. Allow routing to `/feed`, `/search`, `/yard/:slug`, `/profile/:handle` without `nsec`.
3. Disable composer, like, reply, follow, upload, wallet, and settings dev tools when no identity.
4. Show persistent "Create account to post/earn" CTA (non-intrusive, bottom or sidebar).
5. Ensure feed ranking still works without local user pubkey (uses public relays + town defaults).
6. Benchmark on Device 2:
   - Startup < 5 s
   - Feed (50 posts) < 2 s
   - Memory < 500 MB
   - CPU < 50 %

**Files to touch:**
- `Code-Companion/artifacts/blkspace/src/App.tsx` (route guards)
- `Code-Companion/artifacts/blkspace/src/lib/auth.ts` (guest identity fallback)
- `Code-Companion/artifacts/blkspace/src/hooks/use-app-data.ts` (guest-safe queries)
- `Code-Companion/artifacts/blkspace/src/pages/feed.tsx` (hide composer/actions)
- `Code-Companion/artifacts/blkspace/src/pages/profile.tsx` (read-only view)
- `Code-Companion/artifacts/blkspace/src/components/layout/AppShell.tsx` (guest nav)

### 5.2 Wallet-Required Feature Gates (post-beta, before Phase 3 close)

**Goal:** Every write/action feature checks for a valid identity and, where appropriate, sufficient Karma/WB.

Tasks:
1. Create `useRequiresWallet()` hook that returns `{ hasWallet, gate }`.
2. Wrap action buttons (post, like, reply, follow, join yard, upload, tip, boost) with:
   - If no wallet: show login/create modal on click.
   - If wallet but insufficient Karma/WB: show earn-more tooltip.
3. Move dev tools (event verifier, sync test, relay admin) behind a `devMode` flag that requires a wallet + opted-in setting.
4. Add "Create free account" flows from every gated surface.

**Files to touch:**
- New: `Code-Companion/artifacts/blkspace/src/hooks/use-requires-wallet.ts`
- New: `Code-Companion/artifacts/blkspace/src/components/economy/WalletGate.tsx`
- `Code-Companion/artifacts/blkspace/src/components/social/PostComposer.tsx`
- `Code-Companion/artifacts/blkspace/src/pages/wallet.tsx` (require identity)
- `Code-Companion/artifacts/blkspace/src/pages/settings.tsx` (dev mode toggle)

### 5.3 Lazy-Loaded Wallet / Solana Payload

**Goal:** Tier 0 users who only browse never download Solana/Anchor code paths.

Tasks:
1. Lazy import `@solana/web3.js` and `@coral-xyz/anchor` inside wallet advanced flows.
2. Gate Rust Solana features behind a non-default `solana` feature in `Cargo.toml`.
3. In Tauri, return `Err("solana feature not enabled")` if wallet withdraw is called without the feature.

**Files to touch:**
- `Code-Companion/artifacts/blkspace/src-tauri/Cargo.toml` (features)
- `Code-Companion/artifacts/blkspace/src-tauri/src/lib.rs` (feature-gated commands)
- `Code-Companion/artifacts/blkspace/src/pages/wallet.tsx` (dynamic imports)

### 5.4 Creator / Premium Gates (Phase 4)

**Goal:** Monetization without breaking the free base.

Tasks:
1. Define Karma thresholds per creator feature.
2. Add WB cost for boosts, marketplace listings, premium themes.
3. Implement creator subscription / exclusive yard channel UI.
4. Counsel-gated Solana withdraw path.

---

## 6. Device 2 Beta Test Plan

Device 2 = Tier 0 Windows laptop (4 GB RAM, i3), per `docs/device-b-m0-results.md`.

### 6.1 Anonymous Mode Smoke Test

| Step | Expected Result |
|------|-----------------|
| Install / launch app | Opens to `/welcome` or `/feed` in guest mode |
| Skip wallet creation | Lands on read-only FYP |
| Scroll Watch + Read tabs | Smooth, < 2 s feed loads |
| Search a handle | Profile loads, posts visible, no crash |
| Click like / reply / follow | Prompts "Create free account" |
| Open Sync Test → Performance | Run Tier 0 Benchmark, all metrics pass |
| Task Manager spot check | Memory < 500 MB, CPU < 50 % |

### 6.2 Wallet Mode Regression Test

After creating an account on Device 2:

| Step | Expected Result |
|------|-----------------|
| Create post | Composer available, posts to feed |
| Upload 512 KiB media | Succeeds < 30 s |
| Join yard | +5 WB, visible in sidebar |
| Send tip | WB transfer event signed |
| Customize profile theme | Persists |
| Sync Test → Performance | Still passes with wallet active |

### 6.3 Sign-Off Criteria

Update `docs/device-b-m0-results.md` §6 to add:

```markdown
### 6. §4.1 — Sync Test → Performance (Tier 0)
- [ ] Anonymous FYP loads and scrolls smoothly
- [ ] Wallet-gated actions prompt account creation instead of error
- [ ] Tier 0 benchmark passes in both guest and wallet mode
```

---

## 7. UI/UX Principles

1. **No dead ends.** A guest clicking "Post" sees a clear, one-tap path to create a free account — not an error.
2. **No paywall on content.** Free users see the same FYP as wallet users; gating applies to *actions*, not *access*.
3. **Progressive disclosure.** Advanced tools (relays, sync test, dev verifier) are hidden by default and revealed after identity + opt-in.
4. **Respect hardware.** Guest mode should be the *default* if the app detects low RAM or a cold launch on Tier 0.
5. **Earn-first messaging.** Frame wallet creation as "start earning WeixBucks" rather than "verify your identity."

---

## 8. Open Questions (resolved 2026-06-22)

1. **Launch in guest mode by default or require the welcome wizard?**
   → **Resolved:** First-run still shows the Welcome wizard, but step 0 now offers
   "Just browse the yard as a guest." Returning users (first-run complete) land on
   Landing → `/feed`. Guest mode is opt-in, never forced. Implemented in
   `pages/welcome.tsx` + `lib/auth.ts#enterGuestMode`.

2. **Features requiring minimum Karma vs. just a wallet?**
   → **Resolved for beta:** Wallet-only gating ships now (post, like, reply, follow,
   upload, join yard, channel post, create event). Karma/WB thresholds for
   marketplace listings, DJ NFT publish, and dev tools land in Phase 4 per §3.3.

3. **Incognito mode (wallet exists but is not revealed)?**
   → **Deferred:** Not in beta. Tracked for Phase 4 privacy pass.

4. **Relay/node features on Tier 0 — hidden or visible with a tooltip?**
   → **Resolved for beta:** Dev tools (`/settings` verifier, `/mesh-test`,
   `/wallet`, `/create`) are wallet-gated via `GuestRoute`. Relay/node panels
   surface a "requires better hardware (Tier 1+)" tooltip in Phase 4 node UI.

5. **Legal/compliance of showing fiat-equivalent WB value to guests?**
   → **Resolved:** Guests see WB counts only — never a fiat-equivalent. Phase 4
   compliance review gates any fiat display behind KYC/counsel.

> Decisions are reflected in the Phase 0 implementation (see `docs/phase-0-status.md`
> "Anonymous Mode (guest browse)" section) and the code in
> `src/lib/guest-mode.tsx`, `src/hooks/use-requires-wallet.ts`, and
> `src/components/social/GuestCTA.tsx`.

---

## 9. Next Steps

1. **Approve this plan.**
2. **Create tracking issue or update `docs/phase-0-status.md`** with anonymous-mode beta goal.
3. **Implement `GuestModeProvider` + read-only route guards** (est. 1–2 days).
4. **Run Device 2 smoke test** with anonymous FYP.
5. **Iterate on wallet-gate UX** based on Device 2 feedback.
6. **Update `platform-comparison-analysis.md`** with the final competitive matrix once features land.

---

*This plan keeps BlkSpace true to its Tier 0 mission while building a sustainable creator economy on top.*
