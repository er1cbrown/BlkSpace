# BlkSpace — Amalgamation Feature Gap + Optimization + Mobile DevOps

**Date:** 2026-06-22  
**Identity:** BLKSPACE — an **aggregate amalgamation social network** where users **monetize, own everything, customize, make profiles, and interact with other users like them**.  
**Scope:** (1) Feature-gap evaluation vs. every technology we aggregate from, (2) optimization priorities to close the gaps that matter for the amalgamation thesis, (3) mobile DevOps plan to take the same experience to phones.  
**Related:** [`onboarding-and-competitive-review.md`](onboarding-and-competitive-review.md) · [`tier0-freemium-wallet-gating-plan.md`](tier0-freemium-wallet-gating-plan.md) · [`blkspace-ui-system-plan.md`](blkspace-ui-system-plan.md) · [`FLESHTHEORY.md`](../FLESHTHEORY.md) §7

> **North star:** BlkSpace is not a clone of any one app. It is the **one place** where the HBCU community gets the surfaces of TikTok + YouTube + Twitter + Myspace + Newgrounds + Discord + LinkedIn + Reddit + Facebook + Instagram — **without surrendering data, identity, or economics to a corporation.** Every gap below is measured against *that* thesis, not against parity for parity's sake.

---

## 1. The amalgamation thesis, mapped

| Surface we aggregate | Source | BlkSpace equivalent | Built? | Ownership/economics angle |
|----------------------|--------|---------------------|:------:|---------------------------|
| Short video FYP | TikTok | Watch tab + FYP ranking | ✅ | Transparent ranking (engagement × quality × 1−MIDF); no opaque algorithm |
| Long-form video | YouTube | Media upload + `MediaDisplay` | 🟡 | Iroh content-addressed CIDs (creator-owned), no ad model |
| Text feed / threads | Twitter / X | Read tab + posts | ✅ | Nostr events, self-certifying identity |
| Profile themes + music | Myspace | 4 themes, top friends, wall, music hash embed | 🟡 | Themes are a cosmetic sink (WB); music embed chrome incomplete |
| Creative uploads + ratings | Newgrounds | Upload + Karma | 🟡 | No ratings/reviews system, no "portal" curation, no awards |
| Communities + channels | Discord | Yards + channels | ✅ | Town-federated, self-governing roles (just hardened) |
| Pro networking | LinkedIn | `ProProfileTab` | 🟡 | HBCU alumni networking is an under-leveraged wedge — no jobs/resume |
| Karma / reputation | Reddit | Karma (not purchasable, MIDF-throttled) | ✅ | Karma ≠ WB; integrity preserved |
| Social graph + wall + groups | Facebook | Follow + wall + yards | ✅ | No ad targeting, no surveillance |
| Grid profile + media | Instagram | `ProfileGrid` | ✅ | Iroh-backed media, creator-owned |
| Stories | Instagram / Snapchat | `StoryStrip` | 🟡 | **Static UI shell only** — hardcoded handles, no real stories |
| DMs | All | **Intentionally untrusted** | ⛔ | Nostr DMs vulnerable (Kimura et al.); deferred by design |
| Live streaming | TikTok / YouTube | — | ⛔ | Not started; Phase 5+ |
| Marketplace + shop | TikTok Shop | Wallet marketplace tab | 🟡 | Listings stubbed; on-chain settlement is Phase 4 |
| Monetization (real money) | YouTube / Patreon | WB now, BlkCoin Phase 4 | 🟡 | WB is earn-only credits; BKSPC settlement gated by counsel |
| Customize / own everything | Myspace + Web3 | Themes + keys + CIDs | 🟡 | Keys = self-sovereign; CIDs = owned media; themes need depth |

**Legend:** ✅ Built · 🟡 Partial · ⛔ Not started

---

## 2. Missing-feature evaluation (per aggregated technology)

### 2.1 TikTok — short video
**Have:** Watch tab, vertical scroll, FYP ranking, mute toggle, like.  
**Missing:**
- **In-app camera/capture** — no record button, no effects, no trim. Users can only upload files.
- **Sounds library** — no shared audio clips to dub over video.
- **Duets / stitches** — no remix surface.
- **Live streaming** — not started.
- **Shop checkout** — marketplace stub has no cart/checkout flow.
- **Real video player** — `MediaDisplay` renders base64 blobs; no streaming, no scrubbing, no captions.

**Priority for amalgamation:** 🟡 Medium. The FYP surface exists; the *creation* surface is the gap. A native camera is Phase 5 (mobile-first). For desktop beta, file upload is acceptable.

### 2.2 YouTube — long-form video
**Have:** Upload, CID addressing, media render.  
**Missing:**
- **Player chrome** — no chapters, no playback speed, no quality selector, no subtitles.
- **Playlists / collections** — none.
- **Monetization** — no ads, no memberships, no super-chat (by design — but creator needs *a* revenue path).
- **Analytics** — creators see nothing about their own performance.
- **Live** — not started.

**Priority for amalgamation:** 🟡 Medium. Long-form is a creator-economy hook. Player chrome + playlists are cheap wins. Monetization rolls into Phase 4 BlkCoin.

### 2.3 Twitter / X — text feed
**Have:** Posts, replies, reposts (kind 6), follows, trending, FYP.  
**Missing:**
- **Quote tweets** — no quote-with-comment (kind 6 with inline content).
- **Threads (proper)** — no multi-post threading UI (posts exist but no "add to thread" composer).
- **Bookmarks** — none.
- **Lists** — no custom feed lists.
- **Spaces (audio rooms)** — not started.

**Priority for amalgamation:** 🟢 Low–Medium. Text feed is strong. Threads + bookmarks are cheap and high-utility. Quote tweets + Spaces can wait.

### 2.4 Myspace — profile customization
**Have:** 4 themes (classic/pro/vibrant/myspace), top friends, wall, music hash embed fields.  
**Missing:**
- **Music player chrome** — fields exist, no visible player UI or autoplay.
- **Layout editor** — no HTML/CSS customization (Myspace's signature feature). Themes are preset-only.
- **Animated / glitter themes** — static gradients only.
- **Profile song** — no "profile song" that plays for visitors.

**Priority for amalgamation:** 🔴 High. **Myspace revival is a core differentiator** and it's half-built. Music player chrome + profile song is the single most on-thesis cheap win here — it's literally the thing people remember.

### 2.5 Newgrounds — creative community
**Have:** Upload, Karma.  
**Missing:**
- **Ratings / reviews** — no 5-star or thumbs-up/down on media, no written reviews.
- **Portals** — no curated "movies / games / art" sections.
- **Awards** — no daily/weekly recognition.
- **Scouting** — no community-curated quality gate.

**Priority for amalgamation:** 🟡 Medium. Ratings surface is a natural extension of the existing Karma/MIDF system. Portals = yard channels re-skinned. Awards = WB grants on a schedule.

### 2.6 Discord — communities
**Have:** Yards, channels, roles (now hardened), experimental-messaging warning.  
**Missing:**
- **Real-time chat** — current posts are async Nostr; no presence, no typing indicators, no instant delivery feel.
- **Voice channels** — none.
- **Threads** — no sub-channel threads.
- **Granular roles** — only 4 roles (Student/Yard Mod/Alum/Admin).
- **Bots / webhooks** — none.
- **Rich reactions / emoji** — like only.

**Priority for amalgamation:** 🟡 Medium. Real-time chat is the big lift (requires a different transport than async Nostr). Voice is Phase 5. Threads + richer reactions are cheap.

### 2.7 LinkedIn — pro networking
**Have:** `ProProfileTab`.  
**Missing:**
- **Jobs board** — none.
- **Resume / portfolio import** — none.
- **Alumni directory** — yards have members, no alumni-specific view.
- **Professional messaging** — DMs deferred.
- **Events / learning** — yard events are stubbed.

**Priority for amalgamation:** 🟢 Low for beta. **High long-term** — HBCU alumni networking is a unique wedge nobody else serves. Park it as a Phase 4/5 differentiator.

### 2.8 Reddit — karma & communities
**Have:** Karma (post + comment), MIDF throttle, yards.  
**Missing:**
- **Downvote** — only like exists; no downvote signal.
- **Awards** — no give-award flow (could be WB spend).
- **AMAs** — no structured ask-me-anything format.
- **Moderation tooling** — role auth exists, but no mod queue, no ban/mute UI.

**Priority for amalgamation:** 🟢 Low. Downvote conflicts with the anti-brigading MIDF model — intentional omission. Awards = WB spend, easy add. Mod tooling matters at scale.

### 2.9 Facebook — social graph
**Have:** Follow, wall, yards (groups), events stub.  
**Missing:**
- **Friend requests (bidirectional)** — we use follow (one-way). Arguable — follow is the X/IG model.
- **Events (full)** — create/RSVP stubbed, no calendar, no reminders.
- **Memories / on-this-day** — none.
- **Pages (for orgs/businesses)** — profiles are people-only.

**Priority for amalgamation:** 🟡 Medium. Events is the highest-value gap — HBCU homecoming, yard events, step shows. Full events UI is a beta-grade win.

### 2.10 Instagram — visual profile
**Have:** `ProfileGrid`, media display, stories shell.  
**Missing:**
- **Real stories** — `StoryStrip` is hardcoded mock.
- **Reels** — folded into Watch tab (fine).
- **Explore page** — `/search` exists but no visual discover grid.
- **Filters** — no camera filters (ties to mobile capture).

**Priority for amalgamation:** 🟡 Medium. Stories being a mock is a visible gap. Either build real stories (24h expiring posts, kind 30315) or remove the strip for beta.

### 2.11 Handshake — decentralized naming
**Have:** Nostr pubkeys (self-certifying), human handles.  
**Missing:** Nothing needed — pubkeys solve the naming/identity problem without a marketplace. Different solution, same goal.

**Priority:** ⛔ None. Intentional non-gap.

---

## 3. Monetization & ownership — the core thesis

> "Users can also monetize and own everything."

| Pillar | Today | Missing | Phase |
|--------|-------|---------|-------|
| **Own your identity** | ✅ Nostr keypair, BIP39 recovery | — | Done |
| **Own your media** | ✅ Iroh CIDs, content-addressed | Pinning persistence guarantees TBD | Phase 2 close |
| **Own your graph** | ✅ Follow list (kind 3), portable | Cross-relay graph sync UX | Phase 2 |
| **Own your data** | ✅ Local SQLite, exportable | No "export my data" button | Cheap add |
| **Earn WB** | ✅ Posts, likes, uploads, yard join, node work | Creator analytics, earn transparency dashboard | Phase 3 |
| **Spend WB** | 🟡 Tips, boosts, themes | Marketplace checkout, premium themes, awards | Phase 3–4 |
| **Real money (BlkCoin)** | ⛔ Stub | Solana on-chain mint, NFT tickets, withdraw | Phase 4 |
| **Creator subscriptions** | ⛔ None | Patreon-style exclusive yards/channels | Phase 4 |
| **NFT tickets (DJ mixes)** | 🟡 Publish stub | Mint + trade + royalty | Phase 4 |
| **Customize** | 🟡 4 preset themes | Music player, layout editor, animated themes | Phase 3 |

**The monetization gap is the biggest thesis risk.** Today a creator can *earn* WB but can't convert it to anything external, and can't offer subscriptions/NFTs. Phase 4 unblocks this — but the beta should at least surface an **earn dashboard** so creators see their WB history and understand the loop.

---

## 4. Optimization priorities — "optimize all this first"

Ordered by **thesis impact × effort**. These are the things to fix *before* chasing net-new surfaces.

### 🔴 P0 — Beta-blocking optimizations

1. **Myspace music player chrome** — fields exist, no visible player. Build a profile song player that renders the `musicHash` embed. *Highest on-thesis cheap win.*
2. **Real stories or remove the strip** — `StoryStrip` is a hardcoded mock with 4 fake handles. Either wire it to real expiring posts (kind 30315) or hide it for beta so it doesn't read as broken.
3. **Events UI completion** — create/RSVP is stubbed. HBCU homecoming/yard events are a beta-grade social loop. Finish the `YardEventsPanel` create + calendar view.
4. **Creator earn dashboard** — wallet has earn summary; add a clear "this is how you earned, this is what you can spend it on" view. Without it the monetization thesis is invisible.
5. **`MediaDisplay` streaming** — base64 blob render doesn't scale to real video. Add chunked/range fetch from Iroh so a 50 MB video doesn't block the feed.

### 🟡 P1 — High-value, medium-effort

6. **Threads (multi-post)** — composer "add to thread" + thread view. Twitter-parity text surface.
7. **Bookmarks** — save posts locally (SQLite). Cheap, high-utility.
8. **Ratings/reviews on media** — extend Karma system to media items. Newgrounds surface.
9. **Mod queue** — ban/mute/hide-post UI for Yard Mods. Now that role auth is hardened, the UX needs to exist.
10. **Profile "export my data" button** — one-click JSON export of posts/wallet/contacts. Proves the ownership thesis tangibly.

### 🟢 P2 — Later, but spec now

11. **Quote tweets** (kind 6 with inline content).
12. **Richer reactions** (multiple emoji, not just like).
13. **Channel threads** (Discord-style sub-threads).
14. **Playlists / collections** (YouTube surface).
15. **Awards** (Reddit-style, WB spend).
16. **Live streaming** (Phase 5 — spec the transport).
17. **Voice channels** (Phase 5).
18. **Native camera + filters** (Phase 5, mobile-first).

### ⛔ Intentionally not doing (by design)

- **DMs** — Nostr DMs untrusted per Kimura et al.; deferred until a verified encrypted transport exists.
- **Downvotes** — conflicts with anti-brigading MIDF model.
- **Ad targeting / surveillance** — thesis violation.
- **Algorithmic opaque feed** — FYP stays transparent.

---

## 5. Mobile DevOps plan — "start to do mobile devops soon"

### 5.1 Current state
- `tauri.conf.json` has a stub `android` block (`debugApplicationIdSuffix`).
- **No `gen/apple` or `gen/android` folders** — `tauri mobile init` has not been run.
- `release.yml` builds desktop only (macOS arm/intel, Linux, Windows). **No iOS/Android targets.**
- UI is responsive: `AppShell` has a mobile bottom nav + compact top bar, `minWidth: 360`.
- No mobile-specific capabilities file.

### 5.2 The strategy — mobile is a rung, not a rewrite

The onboarding ladder (from [`onboarding-and-competitive-review.md`](onboarding-and-competitive-review.md)) makes mobile a **rung**, not a separate app:

```
Rung 1 — Hosted web (mobile-browser friendly now via responsive AppShell)
Rung 2 — Native mobile app (Tauri 2 iOS/Android) ← this section
Rung 3 — Desktop app (exists)
```

**Phase 5a (mobile beta):** ship a Tauri 2 mobile build that reuses the *entire* React frontend. The Rust backend already compiles for mobile targets; the work is DevOps + signing + a few mobile-specific capabilities (camera, push).

### 5.3 Mobile DevOps roadmap

#### Step 1 — Initialize mobile targets (1 day)
```bash
cd Code-Companion/artifacts/blkspace
pnpm tauri mobile init --manager cocoa      # iOS (macOS host required)
pnpm tauri mobile init --manager gradle     # Android
```
This creates `src-tauri/gen/apple` and `src-tauri/gen/android`, project identifiers, and signing stubs.

#### Step 2 — Mobile capabilities (1 day)
Create `src-tauri/capabilities/mobile.json`:
- Camera + microphone (in-app capture for reels — closes TikTok gap on mobile)
- Local notifications (offline flush, earn toasts)
- Biometric keystore (protect the `nsec`)
- No file-system write outside app sandbox (Tier 0 data hygiene)

Keep desktop capabilities unchanged. Gate camera/capture behind wallet + mobile.

#### Step 3 — Mobile CI (2 days)
Add to `.github/workflows/release.yml` a mobile matrix:
```yaml
- os: macos-latest
  target: aarch64-apple-ios
  ext: ipa
- os: ubuntu-latest
  target: aarch64-linux-android
  ext: apk
```
- iOS: sign with a stored App Store Connect key (secrets); produce an `.ipa` for TestFlight.
- Android: sign with a stored keystore (secret); produce an `.apk` + `.aab` for Play Internal Testing.
- Run mobile builds only on `v*` tags (keep CI fast for PRs).

#### Step 4 — Mobile-responsive audit (1 day)
- Audit every page at 360×640 and 390×844 (common phone widths).
- Known issues to fix:
  - `ProfileGrid` columns at narrow widths.
  - `WalletPage` (953 lines) — likely desktop-heavy; needs a mobile tab layout.
  - `CommunityPage` 12-col grid → stack on mobile.
  - Composer `Select` (town picker) touch target size.

#### Step 5 — Mobile-only features (Phase 5b)
- In-app camera capture (reels, stories) — closes the TikTok/IG creation gap.
- Push notifications via APNs/FCM → Nostr event bridge.
- Biometric unlock for the Nostr key.
- Offline BLE mesh (per `MESH_ARCHITECTURE.md` Phase M2) — dorm offline chat.

### 5.4 Mobile signing & distribution

| Platform | Build host | Signing | Distribution (beta) | Distribution (GA) |
|----------|-----------|---------|---------------------|-------------------|
| iOS | macOS | App Store Connect key (secret) | TestFlight (100 testers) | App Store |
| Android | ubuntu | Keystore (secret) | Play Internal Testing (100 testers) | Play Store |

**Cost note:** Apple Developer Program = $99/yr; Google Play Console = $25 one-time. Budget these now.

### 5.5 What NOT to do on mobile yet
- Don't fork the frontend. One React tree, responsive + capability-gated.
- Don't build native-only features before the hosted web rung exists (see onboarding review) — mobile-browser users come first.
- Don't ship DMs on mobile to "match iMessage" — same Kimura trust problem.

---

## 6. Priority order (the merged backlog)

1. **Hosted web build** (from onboarding review) — without this, mobile-browser users and Tier 0 Chromebook users have no path. Highest leverage.
2. **Publish `v0.1-beta` release** — push tag, publish draft, get desktop installers live.
3. **Myspace music player chrome** (P0-1) — on-thesis, cheap.
4. **Real stories or hide strip** (P0-2) — don't ship a visible mock.
5. **Events UI completion** (P0-3) — HBCU social loop.
6. **Creator earn dashboard** (P0-4) — make monetization visible.
7. **`MediaDisplay` streaming** (P0-5) — unblock real video.
8. **Device 2 beta** (guest-mode checklist) — validate the rung-1 experience.
9. **Threads + bookmarks** (P1-6,7) — cheap Twitter parity.
10. **Mobile `tauri mobile init` + mobile CI** — start the mobile rung.
11. **Phase 4 BlkCoin** — real monetization (on-chain).
12. **Mobile-responsive audit + TestFlight/Play Internal** — mobile beta.

---

## 7. The one-paragraph thesis

BlkSpace is the **aggregate amalgamation social network** — the one place where the HBCU community gets short video (TikTok), long video (YouTube), text (Twitter), profile customization (Myspace), creative uploads (Newgrounds), communities (Discord), pro networking (LinkedIn), karma (Reddit), social graph (Facebook), and visual profiles (Instagram), all on **decentralized infrastructure that runs on the 4 GB laptops students already own**. Users **own their identity** (Nostr keys), **own their media** (Iroh CIDs), **own their graph** (portable follows), **monetize** their work (WeixBucks → BlkCoin), **customize** their presence (MySpace themes + music), and **interact** with other HBCU students, alumni, and creators in town-federated yards. The beta job is to make that thesis **visible** — music player, stories, events, earn dashboard, installers, and a hosted web rung — and then take it to mobile without forking the soul of the app.

---

*This document is the living backlog for closing the amalgamation gaps and taking BlkSpace to every screen a student uses.*
