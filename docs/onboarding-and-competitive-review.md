# BlkSpace — Onboarding Flow + Competitive Review

**Date:** 2026-06-22  
**Author:** Interpretation pass for the maintainer  
**Scope:** (1) Usefulness of the latest committed work, (2) end-user onboarding audit across web/desktop/mobile and hardware tiers, (3) scored competitive rating against decentralized social networks and the mainstream landscape.  
**Related:** [`tier0-freemium-wallet-gating-plan.md`](tier0-freemium-wallet-gating-plan.md) · [`platform-comparison-analysis.md`](platform-comparison-analysis.md) · [`phase-0-status.md`](phase-0-status.md)

---

## 1. What just shipped — and why it matters

### 1.1 Anonymous (guest) browse mode — `b29ffe2`

**What it does:** A user can now open BlkSpace and consume the FYP, search, profiles, and yards **without creating a Nostr identity**. Write actions (post, like, reply, follow, upload, join yard, channel post, create event) surface a "Create free account" prompt instead of erroring.

**Why it's useful (interpretation):**
- It removes the #1 Web3 adoption friction — forcing a wallet/key before showing anything. TikTok, YouTube, and X all let you consume first; now BlkSpace does too.
- It creates the **smallest, fastest runtime variant** of the app. The guest path is read-only: no SQLite write pressure, no relay publishing, no Iroh upload, no Solana/Anchor code paths. That is *exactly* the variant a 4 GB Tier 0 laptop should run cold. This is the right architectural instinct for "optimal for all users, big and small."
- It is the foundation for a hosted web version (see §2). Without guest mode, a web build would force account creation on the first visit; with it, a web visitor can scroll immediately.
- 27/27 frontend tests + 116 Rust tests pass.

### 1.2 Role authorization hardening — `bcc61f0`

**What it does:** `set_node_role` and `set_community_role` Tauri commands now enforce real permission rules:
- Self-service node role allowed; cross-user changes require a platform admin; no self-assigning admin.
- Community roles: owner (`Admin`) + moderator (`Yard Mod`) only; bootstrap allows the first owner to claim `Admin` when a yard has none; moderators cannot assign `Admin` or change an owner.
- UI: `YardMembersPanel` hides the role-assign button unless the viewer is `Admin` or `Yard Mod`.
- 8 new Rust tests cover self-service, cross-user, admin, bootstrap, and moderator limits.

**Why it's useful:**
- Closes a real privilege-escalation hole — previously any signed-in user could set anyone's role. This is the kind of bug that sinks a beta once a student finds it.
- It makes yards self-governing (owners bootstrap, mods are scoped), which matches the "federated college-town" thesis in `FLESHTHEORY.md`. Without enforced roles, the yard model is decorative.
- The UI guard + backend auth are paired — defense in depth. The UI hiding the button is good UX; the backend rejecting the call is what actually stops a bad actor.

### 1.3 `docs/TIER0_DEV.md` — `d859750`

**Why it's useful:** It documents the real dev bottleneck (cold-cache toolchain + Iroh crate bloat on 8 GB) and the workaround (slim Iroh locally, `CARGO_BUILD_JOBS=2`, scoped typecheck, push heavy builds to CI). It also confirms `pnpm tauri:build:no-iroh` exists in `package.json`, so the "build without Iroh locally" path is real, not aspirational. This is the doc a new contributor on a weak laptop needs on day one.

---

## 2. Onboarding flow audit — desired vs. current

### 2.1 The flow you described (the goal)

```
GitHub → run web version → create account / login
      → connect wallet → use app/dev mode
      → download desktop app → unlock more features
      → (mobile users) same path
```

### 2.2 What actually exists today

| Step | Status | Evidence |
|------|--------|----------|
| New user finds app on GitHub | ⚠️ Partial | Repo is public; `INSTALL.md`/`STARTUP.md` point to Releases. But **no `v*` tag has been pushed** and `release.yml` creates **draft** releases, so there are currently **no downloadable installer files**. `gh` confirms no published releases. |
| Downloads installer files | ❌ Not yet | `release.yml` builds `.msi` (Windows), `.dmg` (Mac arm+intel), `.AppImage` (Linux) on a `v*` tag — but only as a **draft** the maintainer must publish. |
| Runs a **hosted web version** | ❌ Does not exist | No web deploy workflow (only `ci.yml` + `release.yml`). `weixblack.net` is mentioned in `AGENTS.md` but nothing hosts it. The only "web version" is `pnpm dev` (localhost:24442), which requires Node 22 + pnpm — not an end-user path. |
| Runs local web preview (dev) | ✅ Works | `pnpm dev` from `Code-Companion/`. Mock fallback for non-Tauri. Guest mode + account creation both work here. |
| Creates account / logs in | ✅ Works | Welcome wizard (5 steps) or `/login` or `/recover`. Non-Tauri path returns a fake session token so web preview works. |
| **Browses as guest** (new) | ✅ Works | "Just browse the yard as a guest" on Welcome step 0 → read-only `/feed`. |
| Connects wallet | 🟡 Partial | Wallet page exists with Solana/Anchor stubs (`useAppWithdrawToSolana`, `@coral-xyz/anchor`). On-chain BlkCoin is Phase 4 — not live. "Connect wallet" today means having a Nostr identity, not a Solana wallet. |
| Uses dev mode | ✅ Works | `/settings` (event verifier), `/mesh-test` (sync/offline/Tier 0 bench), `/relays`. Now wallet-gated for guests. |
| Downloads desktop app → unlocks more | ❌ No tiering | Today the desktop app is the *full* app, not an upgrade tier. Web preview is the *limited* one (mock backend). There is no "web → desktop unlocks features" ladder; it's "web preview (mock) vs desktop (real)." |
| Mobile users | ❌ Not built | `release.yml` has no iOS/Android targets. Tauri 2 supports mobile but it's not wired. `FLESHTHEORY.md` lists mobile as future. |

### 2.3 The honest gap

> **There is no hosted web version a non-technical user can visit.** The only end-user path today is "download the desktop installer" — and the installer doesn't exist yet because no release has been published.

The guest-mode work is the right *foundation* for a hosted web tier, but the **hosting step is missing**. Right now "run it on web version" = `pnpm dev` for developers only.

### 2.4 Recommended fix (the minimal viable onboarding ladder)

Build an explicit **three-rung ladder** so every user — weak PC, strong PC, mobile — has a path:

```
Rung 1 — Web (hosted, no install)
  • Anonymous browse (guest mode ✅ already ships)
  • Optional free account (Nostr identity)
  • Post / like / follow / upload (web preview mock or a real API)
  → Best for: Chromebooks, lab machines, mobile browsers, "I just want to look"

Rung 2 — Desktop app (download from GitHub Releases)
  • Full Rust backend: real Nostr relays, Iroh blob store, SQLite, offline queue
  • Sync Test / Tier 0 benchmark / dev tools
  • Node/relay features (Tier 1+ hardware)
  → Best for: students who want the real decentralized experience + offline

Rung 3 — Power/creator (wallet + Karma)
  • Solana wallet connect, BlkCoin, NFT tickets, marketplace, boosts
  • Run a relay/pin node (Tier 1+ hardware)
  • Dev mode (event verifier, relay admin)
  → Best for: creators, node operators, contributors
```

**To make Rung 1 real you need one of:**
1. A static-hosted web build (Vercel/Netlify/GitHub Pages) + the Express `api-server` artifact for a real backend, **or**
2. A "web" build that talks to public Nostr relays directly (no BlkSpace backend) — guest browse + Nostr-only posting.

Option 2 is cheaper and more on-thesis (decentralized), but the app currently relies on Tauri commands for most actions, so a pure-web build would need the `api-client-react` path wired as the web fallback. That's a real project, not a config flip.

**To make the desktop installer real:**
1. Push a `v0.1-beta` tag → `release.yml` builds Win/Mac/Linux installers as a draft.
2. Publish the draft on GitHub Releases.
3. `INSTALL.md` already tells users how to download — it just needs a real release to point at.

---

## 3. Mobile readiness

**Current state:** Desktop-only (Windows/macOS/Linux). No iOS/Android build targets in `release.yml`. No mobile-CA build config.

**Relevance of your "same process for mobile" goal:** High, but it's a Phase 5 item, not a beta blocker. The onboarding *model* (guest → account → wallet → power) is device-agnostic and will transfer cleanly to mobile. The *implementation* is not there.

**What to do for beta:** Don't block on native mobile. Make Rung 1 (hosted web) mobile-browser-friendly — the `AppShell` already has a mobile bottom nav and responsive layout. A mobile browser hitting the hosted web build is a fine beta path for phone users. Native mobile (Tauri 2 iOS/Android) can follow.

---

## 4. Hardware-tier coverage — "optimal for all users, big and small"

| Hardware | Best path | Status |
|----------|-----------|--------|
| Tier 0 — 4 GB Windows laptop | Hosted web (guest) **or** desktop installer (no Iroh build) | Guest mode ✅; installer pending release; `tauri:build:no-iroh` exists |
| Tier 0 — Chromebook / lab machine | Hosted web (no install) | ❌ Hosting missing |
| Tier 1 — mid laptop / Mac M1 | Desktop app (full) | ✅ Build path exists |
| Tier 2 — M4 Mac / lab desktop | Desktop app + node/relay | ✅; node rewards stubbed |
| Mobile — phone browser | Hosted web | ❌ Hosting missing |
| Mobile — native app | Tauri 2 iOS/Android | ❌ Not wired |

**Interpretation:** The *code* is tier-aware (guest mode = lightest, Iroh/Solana lazy-loadable, `CARGO_BUILD_JOBS` tuning, no-Iroh build flag). The *distribution* is not — there's no hosted web tier, which is the thing Tier 0 and mobile users actually need to avoid installing anything.

---

## 5. Competitive rating — decentralized social networks (direct competitors)

Scored 1–5 (5 = best). **Bold** = BlkSpace advantage.

| Platform | Protocol | Decentralization | Hardware accessibility | Creator economy | HBCU / cultural fit | Browse-first (no account) | Mobile | Active user base | Momentum | **BlkSpace edge** |
|----------|----------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| **BlkSpace** | Nostr + Iroh + Solana | 5 | **5** (4GB laptops) | 4 (WB + BlkCoin) | **5** (HBCU-native) | **5** (guest mode) | 3 (web-ready, native TBD) | 1 (pre-launch) | 3 | — |
| **Bluesky** | AT Protocol | 4 | 3 (standard) | 2 | 1 | 4 | 5 | 5 (~30M) | 5 | Hardware + HBCU + creator econ |
| **Mastodon** | ActivityPub | 5 | 3 | 1 | 1 | 3 (limited) | 4 | 4 (~10M) | 3 | Hardware + creator econ + browse |
| **Nostr / Damus** | Nostr | 5 | 3 | 2 (Zaps) | 1 | 3 | 4 (Damus) | 2 (niche) | 3 | HBCU + creator econ + desktop tier |
| **Farcaster** | Farcaster protocol | 3 (hub-centric) | 2 (ETH-gated historically) | 4 (Frames) | 1 | 2 | 4 | 3 (~500K) | 4 | Hardware + HBCU + browse-first |
| **Lens Protocol** | Lens (Polygon) | 3 | 2 (wallet-gated) | 5 (NFT social graph) | 1 | 1 | 3 | 2 (~150K) | 3 | Hardware + HBCU + browse-first |
| **Spill** | Centralized + blockchain | 2 | 3 | 3 | 3 (Black community) | 1 | 5 | 3 | 3 | Decentralization + hardware + browse |
| **Fanbase** | Hybrid (equity) | 2 | 3 | 4 (equity + subs) | 3 (HBCU partners) | 1 | 5 | 2 | 3 | Decentralization + hardware + browse |
| **BlkFocus** | DESO | 4 | 3 | 3 | 3 (Black liberation) | 1 | 4 | 1 | 2 | Hardware + browse + HBCU specificity |
| **Our Social** | Web3 + lightweight | 4 | **5** (feature phones) | 2 | 2 | 4 | 5 | 1 | 2 | HBCU + creator econ + desktop |
| **MeWe** | DSNP | 3 | 3 | 1 (ad-free) | 1 | 3 | 4 | 2 | 2 | Decentralization + HBCU + creator econ |
| **Steemit** | Steem blockchain | 4 | 3 | 3 (token rewards) | 1 | 2 | 3 | 2 (declining) | 1 | HBCU + hardware + browse |
| **Minds** | Minds chain | 3 | 3 | 3 (tokens) | 1 | 3 | 3 | 2 | 2 | HBCU + hardware + Nostr modernity |

### Decentralized landscape — the pattern

BlkSpace's **only durable, defensible wedge** against this field is the combination of:
1. **Hardware floor at 4 GB** — *nobody else in decentralized social does this.* Farcaster/Lens are wallet-gated; Mastodon/Nostr assume a normal phone or server.
2. **HBCU-native cultural fit** — Spill/Fanbase/BlkFocus are "Black community" broadly; none are HBCU-town federated.
3. **Browse-first with no wallet** — Farcaster, Lens, BlkFocus, Spill, Fanbase all force account/wallet before content. Bluesky and Nostr are closer but neither targets low-end hardware.

**Where BlkSpace is weakest:** active user base (pre-launch) and momentum. Every decentralized social network dies or lives on network effects, so the beta's job is to convert the HBCU + hardware wedge into a real yard with real students.

---

## 6. Competitive rating — mainstream social (feature inspiration + indirect competitors)

You named these as the amalgamation BlkSpace pulls from. Scored on **what BlkSpace borrows vs. must beat**.

| Platform | What BlkSpace borrows | Where BlkSpace must differentiate | Verdict |
|----------|----------------------|-----------------------------------|---------|
| **TikTok** | Watch FYP, vertical video, shop | Algorithmic feed → BlkSpace uses transparent FYP ranking (engagement × quality × 1−MIDF); no opaque algorithm | Borrow the surface, keep the transparency |
| **YouTube** | Long-form video, uploads | Decentralized hosting via Iroh (no ad-driven recommendation); creator-owned CIDs | Borrow the format, drop the ad model |
| **Twitter / X** | Read/feed, threads, follows | Nostr events instead of corporate DB; self-certifying identity; no rate-limit paywalls | Strong fit — BlkSpace is structurally "X but you own it" |
| **Myspace** | Profile themes, top friends, music embed | MySpace revival is already built (4 themes, top friends, wall, music hash embed) | Direct revival — lean in |
| **Newgrounds** | Creative uploads, community ratings | Creator-first economics (85% model), no ads | Borrow the creator ethos, add real money |
| **Discord** | Communities, channels, chat | Yards = servers, channels exist; experimental-messaging warning shown (Nostr DMs untrusted per Kimura) | Borrow the structure, not the DM trust model |
| **LinkedIn** | Pro profile, networking | `ProProfileTab` exists; alumni networking angle (HBCU legacy) | Under-leveraged — HBCU alumni networking is a wedge |
| **Handshake** | Decentralized naming/identity | Nostr pubkeys are self-certifying (no naming market needed) | Different solution to same problem |
| **Reddit** | Karma, subreddits, upvotes | Karma system built (not purchasable, MIDF-throttled); yards ≠ subreddits but similar | Borrow karma integrity, keep town model |
| **Facebook** | Social graph, wall posts, groups | Wall posts built; yards = groups; no ad targeting | Borrow the surfaces, reject the surveillance |
| **Instagram** | Grid profile, media-first | `ProfileGrid` built; media display via Iroh | Borrow the visual, own the storage |

### Mainstream landscape — the pattern

BlkSpace is not trying to beat TikTok at scale. It's trying to be the **one place where the HBCU community gets the best of all of those surfaces *without* surrendering data, identity, or economics to a corporation.** The pitch is breadth-of-surfaces + depth-of-ownership, not head-to-head DAU.

---

## 7. Verdict + priority

**What's strong:**
- The guest-mode + wallet-gating model is the correct onboarding thesis and now exists in code.
- Role auth hardening closes a real beta-blocking security hole.
- Tier 0 is treated as a real design constraint, not a footnote — unique in the decentralized social space.

**What's blocking the vision you described:**
1. **No hosted web version.** This is the single biggest gap between "new users can run it on web" and reality. Without it, the onboarding ladder only has one rung (desktop installer).
2. **No published release.** Push a `v0.1-beta` tag and publish the draft — `INSTALL.md` already describes the download path.
3. **No native mobile.** Acceptable for beta if hosted web is mobile-friendly; not acceptable long-term.
4. **"Connect wallet" is currently identity, not Solana.** The wallet page exists but BlkCoin is Phase 4. Beta messaging should say "create your account (your keys)" not "connect wallet" until Solana is live.

**Priority order:**
1. Push `v0.1-beta` tag → publish draft release → downloadable Win/Mac/Linux installers exist.
2. Stand up a hosted web build (Vercel/Netlify + Express `api-server`, or a Nostr-only web build). This unlocks Chromebook/lab/mobile-browser users without install.
3. Run Device 2 beta with the guest-mode checklist in [`phase-0-status.md`](phase-0-status.md).
4. Fix messaging: "Create your account" (now) vs "Connect Solana wallet" (Phase 4).
5. Native mobile (Tauri 2 iOS/Android) — Phase 5, post-beta.

**One-line summary:** The *code* now supports "browse free, earn when ready, runs on weak hardware." The *distribution* doesn't yet — there's no hosted web rung and no published installer. Close those two gaps and the onboarding vision you described is real.
