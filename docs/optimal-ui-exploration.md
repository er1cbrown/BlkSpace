# BlkSpace — Optimal UI Exploration

**Date:** 2026-06-22  
**Goal:** Define what "optimal UI" means for BlkSpace's users and identify concrete changes to get there.  
**Users:** HBCU students (18–24), phone-first or 4GB laptop, already use TikTok/IG/Twitter, want to browse → post → earn → customize → connect.

---

## 1. What "optimal" means for BlkSpace

Optimal UI is **not** "every feature visible." It's:

| Principle | What it means | Why for BlkSpace |
|-----------|---------------|------------------|
| **Fast-feeling** | <1s interaction, skeletons not spinners, no layout shift | Tier 0 laptops + 1 Mbps Wi-Fi can't hide slowness |
| **Familiar** | Feels like TikTok/IG/Twitter — not like a "Web3 app" | Students shouldn't need a tutorial |
| **Frictionless** | Browse with zero account, create account in <30s, no wallet to start | Guest mode already ships — extend the principle |
| **Phone-first** | Designed at 360px, scaled up — not desktop shrunk down | Most students are phone-first |
| **Culturally resonant** | HBCU yard aesthetic, not generic crypto-purple | Culture is the wedge |
| **Honest** | No fake data, no broken panels, no "loading..." forever | Trust is earned on first load |

---

## 2. Current UI audit — what's optimal vs suboptimal

### ✅ What's already optimal

| Surface | Why it works |
|---------|--------------|
| **3-column desktop → mobile bottom nav** | Standard pattern (Twitter/IG). Adapts well. |
| **FYP tabs (Watch/Read/Following/Local/Bridge/Trending)** | Good breadth — matches the amalgamation thesis. |
| **Guest mode gating** | Browse → prompt, no dead ends. Correct pattern. |
| **Security badges on feed** | Trust signals visible without being intrusive. |
| **MySpace themes (4 variants)** | Cultural differentiator. Visually distinct. |
| **Earn toasts** | Instant feedback on actions. |
| **Dark mode default** | Matches student usage patterns + saves battery on old screens. |

### 🔴 What's suboptimal (the gaps)

#### A. Fake data everywhere
**Problem:** 15 files have hardcoded mock/fallback data (`SUGGESTED_PEOPLE`, `mockUsers`, `mockPosts`, `fallbackCommunities`, `fallbackEvents`). In web preview, the UI shows fake people who don't exist.

**Why it's suboptimal:** A new user sees "Jane Doe, Campus King, HBCU Student" in the sidebar and thinks they're real. When they click and see the same 3 names everywhere, trust drops. This is the #1 thing that makes the app feel like a "demo" not a product.

**Fix:** Either (a) wire to real Nostr relay data so the sidebar shows actual network users, or (b) label fallback clearly as "Sample — connect to see real yard members."

#### B. Notifications badge is hardcoded "3"
**Problem:** `AppShell.tsx:164` — `<Badge variant="destructive">3</Badge>` is always 3, always red.

**Why it's suboptimal:** Fake notification count erodes trust. Students will tap it, see nothing, and stop trusting the badge.

**Fix:** Hide the badge when there are 0 real notifications. Wire to `useAppGetRecentActivity` or remove until backend-driven.

#### C. Tiny text on mobile
**Problem:** 38 instances of `text-[10px]` and `text-[11px]` across the app. Mobile bottom nav labels are `text-[10px]`.

**Why it's suboptimal:** On a 360px phone, 10px text is unreadable for many users. WCAG recommends minimum 12px for body text. The "Sign in" / "Create free account" labels on the mobile nav are 10px.

**Fix:** Floor all interactive labels at `text-xs` (12px). Reserve `text-[10px]` for non-essential metadata only.

#### D. No keyboard navigation / focus states
**Problem:** 77 aria/role attributes exist (shadcn provides them), but the custom `NavItem`, story circles, and action buttons have no visible focus ring. Tab navigation is unusable.

**Why it's suboptimal:** Accessibility failure. Also breaks power-user flow.

**Fix:** Add `focus-visible:ring-2 focus-visible:ring-ring` to all interactive `span`/`div` wrappers that act as buttons.

#### E. Feed post cards have too much chrome
**Problem:** Each post card shows: avatar, name, handle, town tag, risk badge, signature badge, consensus badge, date, content, media, reply count, repost count, like count, boost button, cross-town relay source. That's 14+ elements per card.

**Why it's suboptimal:** On Tier 0, this is a lot of DOM nodes per post → slow scroll. On mobile, it's visually noisy. Security badges are important but shouldn't compete with content for attention.

**Fix:** Collapse security badges into a single "verified ✓" indicator by default; expand on tap. Move "Boost" to a "..." menu, not the main action row. Keep reply/like/repost as the primary 3 actions (matches Twitter).

#### F. Right rail is hidden below `xl` (1280px)
**Problem:** `YardSidebar` only shows at `xl` breakpoint. On a 1024px laptop (common Tier 0), the right rail never appears — users miss trending, suggested people, and the wallet shortcut.

**Why it's suboptimal:** The most useful discovery surface (trending) is invisible on the laptops we're targeting.

**Fix:** Show a collapsed version at `lg` (1024px) — trending only, no suggested people. Full rail at `xl`.

#### G. Composer is always visible on feed
**Problem:** The post composer sits at the top of every feed tab, taking ~200px of vertical space. On a 640px-tall phone viewport, that's 30% of the screen before any content.

**Why it's suboptimal:** Mobile users want to *consume* first. The composer should be a floating action button (FAB) that expands, like Twitter/X mobile.

**Fix:** On mobile, replace the inline composer with the existing `+` FAB in the bottom nav. Tap → modal composer. Keep inline composer on desktop.

#### H. No empty-state design
**Problem:** When feeds/yards/profiles have no data, the app shows plain text: "No posts yet. Be the first!" No illustration, no CTA, no guidance.

**Why it's suboptimal:** Empty states are the *first* thing a new user sees. A text string feels broken. An illustrated empty state with a clear CTA feels intentional.

**Fix:** Add 3–4 illustrated empty states: feed ("Your yard is quiet — create a post"), yard ("No events yet — host something"), profile ("No posts — share your first"), search ("No results — try a handle").

#### I. Fonts not loading
**Problem:** `index.html` loads Inter from Google Fonts. CSS references `Plus Jakarta Sans`, `Fraunces`, `Spline Sans Mono` — none are imported. The entire UI falls back to system fonts.

**Why it's suboptimal:** The design system was built around these fonts. Without them, headings look generic, the "BlkSpace" wordmark doesn't match, and the MySpace theme loses its character.

**Fix:** Add the 3 font families to the Google Fonts `<link>`. Or self-host for offline (Tier 0 + offline-first).

#### J. No perceived-performance patterns
**Problem:** Route transitions show "Loading page..." text. Feed loads show 3 gray card skeletons (good) but profile/settings/wallet show nothing during load.

**Why it's suboptimal:** "Loading page..." feels like 2010. Skeletons matching the destination layout feel instant.

**Fix:** Per-route skeleton: profile = avatar circle + text lines + grid placeholders; wallet = balance card skeleton + tab skeleton. Use `React.lazy` + `Suspense` with themed fallbacks.

---

## 3. The optimal layout — per breakpoint

### Mobile (360–640px) — phone-first design
```
┌─────────────────────────┐
│ BlkSpace    🔍 🔔(real)  │  ← 56px top bar, real notif count
├─────────────────────────┤
│                         │
│  [FYP content]          │  ← Full-bleed, no composer inline
│  Watch / Read / Following│  ← Sticky tab bar (swipeable)
│                         │
│  Post card:             │
│  avatar name · town     │  ← Badges collapsed to "✓ verified"
│  content                │
│  [media]                │
│  💬  🔁  ❤️  ···         │  ← 3 actions + overflow menu
│                         │
├─────────────────────────┤
│ 🏠  🔍  ➕  🏛️  👤      │  ← 56px bottom nav, 12px labels
└─────────────────────────┘
         ↑ FAB opens modal composer, not inline
```

### Tablet / small laptop (640–1024px)
```
┌────────┬────────────────┐
│        │                │
│  Blk   │  [FYP content] │
│  Space │                │
│        │  Composer      │  ← Composer visible (enough space)
│  🏠    │  Posts...      │
│  ➕    │                │
│  🏛️    │                │
│  💰    │                │
│  👤    │                │
│        │                │
└────────┴────────────────┘
         ← Left rail only, no right rail (too narrow)
```

### Desktop (1024–1280px)
```
┌────────┬────────────────┬──────────┐
│        │                │          │
│  Blk   │  [FYP content] │ Trending │  ← Right rail at lg:
│  Space │                │  (lite)  │    trending only
│        │  Composer      │          │
│  🏠    │  Posts...      │  ──────  │
│  ➕    │                │  Wallet  │
│  🏛️    │                │  shortcut│
│  💰    │                │          │
│  👤    │                │          │
│        │                │          │
└────────┴────────────────┴──────────┘
```

### Wide desktop (1280px+)
```
┌────────┬────────────────┬──────────────┐
│        │                │              │
│  Blk   │  [FYP content] │ User card    │  ← Full right rail:
│  Space │                │ Trending     │    user + trending +
│        │  Composer      │ Suggested    │    suggested + relay
│  🏠    │  Posts...      │ Relay status │
│  ➕    │                │ Leaderboard  │
│  🏛️    │                │ Dev links    │
│  💰    │                │              │
│  👤    │                │              │
│        │                │              │
└────────┴────────────────┴──────────────┘
```

---

## 4. Optimal feed card — the core unit

The feed card is the most-seen surface. It should be **content-first, chrome-second**.

### Current (14+ elements, noisy)
```
avatar | name | @handle | • | town | [risk] [sig] [consensus] | date
content
[media]
💬 0  🔁 0  ❤️ 0  🔁 Boost    ← 4 actions, all equal weight
```

### Optimal (content-first, 8 elements)
```
avatar | name · @handle        | ⓥ ← verified (tap to expand badges)
content
[media — lazy, tap-to-load for large]
💬 0   🔁 0   ❤️ 0     ⋯    ← 3 primary + overflow (boost, share, report)
```

**Rules:**
- Security badges collapse into a single `ⓥ` indicator. Tap → popover with risk/sig/consensus detail.
- "Boost" moves to overflow menu (it's a spend action, not a daily action).
- Cross-town relay source shows as a subtle "🔄 via relay" pill, not a full badge row.
- Media stays lazy (P0-5 already shipped).
- Card uses `content-visibility: auto` so off-screen cards don't render (huge Tier 0 win).

---

## 5. Optimal onboarding flow — the first 60 seconds

```
0s   Open app → Welcome screen
     [Create free account]  [Just browse the yard →]
                              ↓
5s   Guest → /feed (read-only FYP loads immediately)
     Story strip (real followed/trending authors)
     "Create free account to post, like & earn" CTA (non-intrusive, bottom)

30s  User taps "Create account" → 3-step wizard (not 5):
     1. Handle + display name
     2. Generate key → show mnemonic
     3. Confirm → enter yard
     (Merge "mission" + "what makes this different" into the landing page, not the wizard)

60s  User is on /feed with full write access, earned 5 WB from first post
```

**Change from current:** The 5-step welcome wizard is too long. Steps 0 (mission) and 1 (what makes it different) are educational — move them to the landing page. The wizard should be 3 steps: handle → key → confirm.

---

## 6. Optimal mobile composer

**Current:** Composer is inline at top of feed (200px on mobile).
**Optimal:** FAB → bottom-sheet modal.

```
┌─────────────────────────┐
│  [FYP content scrolls]  │
│  ...                    │
│  ...                    │
│              ┌────────┐ │
│              │   ➕   │ │  ← Floating action button
│              └────────┘ │
├─────────────────────────┤
│ 🏠  🔍  ➕  🏛️  👤      │
└─────────────────────────┘

         Tap FAB →
┌─────────────────────────┐
│ ✕           New post     │  ← Bottom sheet slides up
├─────────────────────────┤
│ [avatar] Your name       │
│ ┌─────────────────────┐ │
│ │ What's happening on  │ │
│ │ the yard?            │ │
│ └─────────────────────┘ │
│ 📍 TSU  📎 media        │
│              [Post →]   │
└─────────────────────────┘
```

---

## 7. Optimal profile — the MySpace revival

The profile is where "own + customize + monetize" lives. It should feel **personal**, not generic.

### Current gaps
- Music player: ✅ now styled (P0-1 shipped)
- Themes: 4 presets, no layout editor
- Top friends: ✅ built
- Wall: ✅ built
- Pro tab: ✅ built

### Optimal additions
| Feature | Why | Effort |
|---------|-----|--------|
| **Profile song autoplay** | Myspace signature — visitors hear your vibe on arrival | Low (browser policy allows muted autoplay) |
| **Animated theme backgrounds** | Myspace glitter aesthetic — cultural nostalgia | Medium |
| **Custom CSS slot (sandboxed)** | Power users want full control like original Myspace | Medium (sandbox with CSP) |
| **Profile visitor count** | Myspace classic — "who's been here" | Low |
| **Earn summary on profile** | Creators show "230 WB earned" badge — social proof | Low |
| **Profile QR code** | Share profile at events / in person | Low |

---

## 8. Performance budget — optimal for Tier 0

| Metric | Target | Current | Gap |
|--------|--------|---------|-----|
| First contentful paint | <1.5s | Unknown (stale build) | Measure |
| Largest contentful paint | <2.5s | Unknown | Measure |
| Bundle JS (initial) | <300KB | 664KB `index.js` | 🔴 Code-split |
| Bundle CSS | <50KB | 125KB | 🟡 Purge unused tokens |
| Feed scroll FPS | 60fps | Unknown | Add `content-visibility: auto` |
| Route transition | <200ms | "Loading page..." text | Per-route skeletons |

**Biggest win:** `content-visibility: auto` on feed cards. The browser skips rendering off-screen cards entirely — on a 50-post feed, this cuts render time ~60% on Tier 0.

---

## 9. Priority — what to do first

### 🔴 Do now (biggest perceived-quality wins)
1. **Fix fonts** — add Plus Jakarta Sans, Fraunces, Spline Sans Mono to `index.html` (5 min)
2. **Remove fake notification badge** — hide when 0 (5 min)
3. **Label mock data** — "Sample" tag on fallback suggested people (15 min)
4. **Mobile composer → FAB modal** — reclaim 200px on phone (1 hr)
5. **Feed card simplification** — collapse badges to `ⓥ`, move Boost to overflow (1 hr)

### 🟡 Do next (polish)
6. **`content-visibility: auto`** on feed cards — Tier 0 scroll perf (15 min)
7. **Right rail at `lg`** — trending visible on 1024px laptops (30 min)
8. **Empty-state illustrations** — 4 illustrations + CTAs (2 hrs)
9. **Per-route skeletons** — replace "Loading page..." (1 hr)
10. **Mobile text floor** — `text-[10px]` → `text-xs` for labels (30 min)

### 🟢 Do later (depth)
11. **Welcome wizard 5→3 steps** — move mission/different to landing (1 hr)
12. **Profile additions** — visitor count, earn badge, QR (2 hrs)
13. **Animated Myspace themes** — glitter/cursor trails (medium)
14. **PWA manifest + offline** — installable web app (2 hrs)
15. **Focus-visible rings** — keyboard accessibility (1 hr)

---

## 10. The one-paragraph principle

> Optimal UI for BlkSpace means **a student opens the app on their phone, scrolls a familiar FYP in under 2 seconds, sees real people from their yard (not fake data), taps "Create free account" without leaving the feed, posts in 30 seconds, and earns their first WeixBucks before the app even feels like it's finished loading.** Every pixel should feel like TikTok's speed, Twitter's simplicity, and MySpace's personality — because that's what "aggregate amalgamation" means in practice.
