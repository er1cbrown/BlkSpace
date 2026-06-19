# Implementation Plan: Device Mesh Testing

**Status:** ⏳ M0 manual gate — automated backbone ✅ (M1 hardening shipped); Device B + two-device sign-off open
**Priority:** High (proves multi-device viability)  
**Estimated Time:** 2-3 days  
**Dependencies:** Nostr relay connection ([`REAL_NOSTR_RELAYS.md`](REAL_NOSTR_RELAYS.md))  
**Architecture:** See [`MESH_ARCHITECTURE.md`](MESH_ARCHITECTURE.md) — hub sync (Nostr + Iroh + offline queue), **not** BLE/libp2p

---

## Overview

Test BlkSpace across multiple devices to verify:
1. Cross-device account recovery (BIP39 mnemonic)
2. Real-time sync between devices on same account (via Nostr relays)
3. Offline capability (SQLite queue → flush to relays on reconnect)
4. Performance on Tier 0 hardware

**Terminology:** “Mesh” here means **multi-device hub sync**, not a BLE peer mesh.

### P1 run order (Device B session — canonical)

Use this sequence on Device B. Record results in [`docs/device-b-m0-results.md`](../device-b-m0-results.md).

| Step | Action | Doc ref |
|------|--------|---------|
| **0** | Device A: create `@test_user`, save mnemonic (once) | §1.2 |
| **1** | Install build on Device B (same tag/commit as A) | §1.1 |
| **2** | Create bot accounts on B; each **Join Yard** | §2.6 |
| **3** | Assign **Yard Mod** to `@bot_mod`; confirm badge | §2.6 |
| **4** | Recover `@test_user` on B; cross-device sync <60s | §1.4–1.5 |
| **5** | Offline queue → reconnect → flush | §3.1 |
| **6** | **Sync Test → Performance** — Tier 0 benchmark | §4.1 |
| **7** | Fill results template; update `phase-0-status.md` | P3 |

Why bots before recover: validates yard UI (mods, events) on Device B locally before tying cross-device sync to the primary account.

---

## Test Device Matrix

| Device | OS | Hardware | Role | User |
|--------|-----|----------|------|------|
| Device A | macOS | M1 MacBook (Tier 2) | Primary dev | @eric |
| Device B | Windows 10 | 4GB RAM, i3 (Tier 0) | Student laptop | @jane |
| Device C | Ubuntu | Raspberry Pi 4 (Tier 1) | Node/relay | @campus_king |
| Device D | Android | Mid-range phone (Tier 1) | Mobile test | @hbcustudent |

---

## Phase 1: Single Account, Multiple Devices (Day 1)

### 1.1 Install on All Devices

**Device A (macOS):**
```bash
git clone git@github.com:er1cbrown/BlkSpace.git
cd BlkSpace/Code-Companion
pnpm install
pnpm tauri dev
```

**Device B (Windows 10):**
```batch
# Download setup.bat from GitHub
setup.bat
cd BlkSpace/Code-Companion/artifacts/blkspace
pnpm tauri dev
```

**Device C (Ubuntu/Raspberry Pi):**
```bash
curl -fsSL https://raw.githubusercontent.com/er1cbrown/BlkSpace/main/setup.sh | bash
cd BlkSpace/Code-Companion
pnpm tauri dev
```

### 1.2 Create Account on Device A

1. Open BlkSpace
2. Follow Welcome Wizard
3. Handle: `test_user`
4. Display name: `Test User`
5. **Write down recovery phrase on paper**
6. Verify 2 words
7. Enter the yard

### 1.3 Verify on Device A

- [ ] Account created successfully
- [ ] Recovery phrase displayed in Settings → Security
- [ ] Can create post
- [ ] WeixBucks balance shows 100 (initial)

### 1.4 Recover on Device B

1. Install BlkSpace on Device B
2. Click "Recover Account" (not "Create Account")
3. Type 12-word recovery phrase
4. Account appears with:
   - Same handle: `test_user`
   - Same WeixBucks balance: 100
   - Same posts (if any)

### 1.5 Cross-Device Sync Test

**Device A:** Create post "Hello from Device A"
**Device B:** Wait 60 seconds, refresh feed
- [ ] Post appears on Device B
- [ ] Likes/replies sync between devices
- [ ] Wallet transactions visible on both

### 1.6 Sign Out Test

**Device B:**
1. Go to Settings → Security
2. Click "Sign Out"
3. Confirm
4. App returns to landing page

**Device A:**
- [ ] Account still active
- [ ] Can still create posts

---

## Phase 2: Multi-User, Same Town (Day 1-2)

### 2.1 Create Test Users

**Device A:** Create `@user_a` (TSU Yard)
**Device B:** Create `@user_b` (TSU Yard)
**Device C:** Create `@user_c` (TSU Yard)

### 2.2 Interaction Test

1. `@user_a` posts: "Who's going to the TSU game?"
2. `@user_b` replies: "I'm going!"
3. `@user_c` likes the post
4. All devices verify:
   - [ ] Post visible on all feeds
   - [ ] Reply visible under post
   - [ ] Like count = 1
   - [ ] Notifications received

### 2.3 WeixBucks Economy Test

| Action | Expected Reward | Verify |
|--------|----------------|--------|
| @user_a creates post | +5 WB | Balance 105 |
| @user_b replies | +2 WB | Balance 102 |
| @user_c likes @user_a | @user_a: +1 WB | Balance 106 |
| @user_a likes own post | +0 WB | Balance unchanged |
| @user_a replies to own post | +0 WB | Balance unchanged |
| Earn past 250 WB/day | Partial/zero + cap toast | UI shows daily cap warning |

### 2.4 Security Hardening Test (2026-06-16)

| Check | How to verify | Code/auto | Manual UI |
|-------|----------------|-----------|-----------|
| Post detail `RiskBadge` | Open `/posts/:id` — MIDF badge beside sig badge | [x] `post.tsx` | [x] dev spot-check |
| Invalid sig banner | Post with bad/missing cached sig shows red alert | [x] `SignatureWarningBanner` | [x] dev spot-check |
| `SignatureBadge` on feeds | Watch/Read/Bridge cards show Sig verified/invalid | [x] `WatchFeed`, `ReadFeed`, `feed.tsx` | [x] dev spot-check |
| Link previews off | URLs in posts are plain links, no OG fetch | [x] `SafeContent`, Settings note | [x] dev spot-check |
| DM warning | Yard channel + post reply show amber experimental banner | [x] `community.tsx`, `post.tsx` | [x] dev spot-check |
| Town tag enforcement | Relay rejects kind 1 without `t:hbcu-town:*` | [x] `test_validate_relay_event_tags` | — |
| Daily cap toast | Grant when near 250 WB shows partial/clipped message | [x] `test_earn_result_daily_cap_flag` | [ ] Device B |
| Nostr publish identity | Tips/marketplace/node events skip if no user key | [x] `user_nostr_keys_for_publish` | — |
| Iroh upload → CID → Device B fetch | `pnpm test:iroh`; kind 1063 auto on `upload_blob` (M1) | [x] auto | [ ] two-device |
| Offline flush → Nostr | Sync Test → Flush Now; replies publish on flush (M1) | [x] `flush_offline_queue` | [ ] Device B |

### 2.5 Tipping Test

1. `@user_b` sends 10 WB to `@user_a`
2. Verify:
   - [ ] @user_b balance: 92
   - [ ] @user_a balance: 116
   - [ ] Transaction visible in both wallets

### 2.6 Yard mods & bot accounts (Device B pilot prep)

Use this when deepening backend/tests with **Device B + local bot accounts** before a live HBCU pilot.

> **Note:** `community_roles` live in **local SQLite per install** — not Nostr-synced yet. Assign roles on the device where those accounts exist (typically Device B for bot accounts).

**Device B — create bot accounts**

1. Install / open BlkSpace on Device B (see §1.1)
2. Create 2–3 test accounts (e.g. `@bot_mod`, `@bot_student`, `@bot_alum`) via Welcome Wizard
3. Each bot: **Join Yard** on TSU (or target yard) — earns +5 WB once

**Device B — assign yard mod (confirms P5 UI)**

1. Sign in as your primary tester (or a bot you promote first)
2. Go to **Communities → TSU Yard → Members** (or Quick Actions → **Manage Roles**)
3. Tap **Role** on `@bot_mod` → select **Yard Mod** → **Review assignment** → **Make Yard Mod**
4. Verify:
   - [ ] Success toast: `@bot_mod is now Yard Mod`
   - [ ] **Yard Mod** badge visible on member card immediately
   - [ ] Pilot banner shows your role + mod count
   - [ ] Re-open Members tab — badge persists after navigation

**Device B — mod powers smoke (local)**

1. As `@bot_mod`, post in `#general` and create a yard event (Events tab)
2. As `@bot_student`, RSVP to event — verify +2 WB earn toast
3. Optional: assign **Alum** / **Student** to other bots and confirm badge updates

**Device A ↔ B (what syncs vs what doesn’t)**

| Data | Cross-device via relays? |
|------|-------------------------|
| Posts, replies, likes | ✅ Yes (Nostr) |
| Wallet earn (WB) | ✅ Per account on each device after sync |
| Yard membership | Local per install (re-join on each device) |
| **Yard roles (mod badges)** | ❌ Local SQLite only — re-assign on each install |

**M0 checklist tie-in (run on Device B)**

After §2.6, continue with Phase 1 recovery (§1.4–1.5), Phase 3 offline (§3.1), and Tier 0 bench (§4.1). Check boxes in the test results template at the bottom of this doc.

---

## Phase 3: Offline & Bridge (Day 2) — M0.3

Uses shipped **offline queue** (`queue_offline_action` → `flush_offline_queue`) and `OfflineSyncProvider` (flush on `online` + 60s). No BLE or libp2p required.

### 3.1 Offline write queue

**Scenario:** Device B loses internet mid-session

1. Disconnect Wi‑Fi on Device B (or use OS offline mode)
2. On Device B: create post, like, reply, or follow
3. Confirm pending actions in **Sync Test → Offline** (or `count_pending_offline_actions`)
4. Reconnect internet
5. Verify:
   - [ ] Toast: “Synced N offline actions”
   - [ ] Actions visible on Device A after relay round-trip
   - [ ] No duplicate Nostr events (canonical id ingest)

### 3.2 Read-only offline (cached feed)

1. While online: load feed and prefetch media on Device B
2. Go offline
3. Verify:
   - [ ] Previously loaded posts still readable from SQLite cache
   - [ ] New publish shows queued state (not lost)

### 3.3 Bridge to online (relay publish)

1. After 3.1, reconnect internet
2. Verify:
   - [ ] Offline events published to Nostr relays
   - [ ] Other towns see the content (if town-tagged)
   - [ ] No duplicate events

### 3.4 Deferred — BLE / internet-free LAN mesh (M2+)

> **Not in MVP.** No BLE or “Enable Local Mesh” toggle exists. See [`MESH_ARCHITECTURE.md`](MESH_ARCHITECTURE.md) Phase M2 for optional LAN blob assist. Do not block M0 on this.

---

## Phase 4: Performance Benchmarking (Day 2-3)

### 4.1 Tier 0 Performance

**Device B (Windows 10, 4GB RAM):**

| Metric | Target | Automated | Manual sign-off |
|--------|--------|-----------|-----------------|
| App startup | < 5 seconds | — | [ ] Device B timer |
| Feed load (50 posts) | < 2 seconds | [x] `pnpm test:tier0` (dev Mac) | [ ] Device B |
| Post creation | < 1 second | [x] `pnpm test:tier0` (dev Mac) | [ ] Device B |
| Blob round-trip (512 KiB) | < 30 seconds | [x] `pnpm test:tier0` (dev Mac) | [ ] Device B |
| Memory usage | < 500 MB | — | [ ] Device B Task Manager |
| CPU usage | < 50% | — | [ ] Device B Task Manager |

**Automated baseline (dev hardware):** `pnpm test:tier0` runs `test_tier0_benchmark_feed_post_blob_targets` — passes on Tier 2 Mac (2026-06-16); does **not** replace Device B sign-off.

**In-app:** Sync Test → **Performance** → **Run Tier 0 Benchmark** (`run_tier0_benchmark` Tauri command).

### 4.2 Stress Test

**All devices:**
1. Create 100 posts in 5 minutes
2. Verify:
   - [ ] No crashes
   - [ ] Rate limiting works (30 req/60s)
   - [ ] Database remains consistent
   - [ ] UI remains responsive

### 4.3 Relay Sync Benchmark

**Measure:**
- Time to sync 100 events from relay
- Time to publish event to 3 relays
- Bandwidth usage per sync

---

## Phase 5: Edge Cases (Day 3)

### 5.1 Recovery Phrase Lost

**Test:**
1. Create account on Device A
2. Write down phrase
3. "Lose" phrase (don't use it)
4. Try to recover on Device B
- [ ] Expected: Account unrecoverable
- [ ] Verify: No "Forgot Password" option
- [ ] Document: User education message

### 5.2 Simultaneous Edit

**Test:**
1. User logged in on Device A and B
2. Change profile on Device A
3. Change profile on Device B
4. Verify:
   - [ ] Last write wins (or conflict detected)
   - [ ] No data corruption

### 5.3 Network Interruption

**Test:**
1. Device A creates post
2. Disconnect internet mid-publish
3. Reconnect after 10 minutes
4. Verify:
   - [ ] Post published when reconnected
   - [ ] No duplicate posts
   - [ ] Queue handles offline gracefully

### 5.4 Key Compromise

**Test:**
1. Generate new key in Settings
2. Verify:
   - [ ] Old key invalidated
   - [ ] New recovery phrase displayed
   - [ ] Account still accessible with new phrase

---

## Implementation Status

### ✅ Phase 1: Single Account, Multiple Devices (COMPLETED)
- **Recover Account page** — `/recover` with BIP39 mnemonic recovery
- **Account sync** — `sync_account_content` command fetches all CIDs from Iroh
- **Cross-device data** — `get_user_account_data` retrieves user, posts, wallet

### ✅ Phase 2: Multi-User, Same Town (COMPLETED)
- **WeixBucks economy** — Post +5, Reply +2, Like +1, Daily cap 250
- **Tipping** — `send_weixbucks` command with balance verification
- **Nostr relay sync** — Real-time sync via relay connections

### ✅ Phase 3: Offline Mesh (COMPLETED)
- **Offline queue** — `offline_queue` table for interrupted posts
- **Queue commands** — `queue_offline_action`, `get_pending_offline_actions`, `mark_offline_action_synced`
- **Offline cache** — Pre-fetch content for offline access

### ✅ Phase 4: Performance Benchmarking (COMPLETED)
- **Device Mesh Test page** — `/mesh-test` with 5 tabs
- **Sync history** — `device_sync_log` table with duration tracking
- **Performance targets** — Startup <5s, Feed load <2s, Post <1s

### ✅ Phase 5: Edge Cases (COMPLETED)
- **Recovery phrase** — Settings → Security displays BIP39 mnemonic
- **No "Forgot Password"** — BIP39 only, no digital backups
- **Network interruption** — Offline queue handles graceful recovery

## Test Results Template

```markdown
## Device Mesh Test Results — 2026-06-XX

### Devices
| Device | OS | Hardware | Result |
|--------|-----|----------|--------|
| A | macOS | M1 | ✅ |
| B | Windows 10 | 4GB i3 | ✅ |
| C | Ubuntu | RPi 4 | ✅ |

### Phase 1: Single Account
- [x] Create account on Device A
- [x] Recover on Device B
- [x] Cross-device sync works

### Phase 2: Multi-User
- [x] 3 users interact
- [x] WeixBucks rewards correct
- [x] Tipping works

### Phase 3: Offline
- [x] Offline queue works
- [x] Bridge to online

### Phase 4: Performance
| Metric | Target | Actual | Pass |
|--------|--------|--------|------|
| Startup | < 5s | 3.2s | ✅ |
| Feed load | < 2s | 1.1s | ✅ |

### Issues Found
1. [ ] Issue description
2. [ ] Issue description

### Next Steps
- [ ] Fix issue 1
- [ ] Fix issue 2
```

---

## Files to Modify

1. `src/pages/settings.tsx` — Add "Sign Out" (already done)
2. `src/pages/recover.tsx` — Improve recovery UX
3. `src-tauri/src/lib.rs` — Add offline queue
4. `src/hooks/use-app-data.ts` — Add offline detection

---

## Success Criteria (M0 matrix)

| # | Criterion | Auto proof | Manual |
|---|-----------|------------|--------|
| 1 | Account recovery on 2+ desktops | `/recover` + BIP39 code path | [ ] Phase 1.4 |
| 2 | Cross-device sync &lt;60s | [x] `pnpm test:nostr-relay` | [ ] Phase 1.5 |
| 3 | Offline queue → relay flush | [x] `offline_queue` + M1 reply Nostr flush | [ ] Phase 3.1–3.3 |
| 4 | Media via CID + cache | [x] `pnpm test:iroh` + M1 kind 1063 on upload | [ ] §2.4 Iroh row |
| 5 | Tier 0 performance | [x] `pnpm test:tier0` (dev Mac) | [ ] §4.1 Device B |
| 6 | No data loss on sync | [x] DB + rate-limit tests | [ ] Phase 4.2 stress |

**Score:** 0/6 manual · 6/6 auto backbone (as of 2026-06-16, post-M1).

---

*Next: Complete M0 manual sign-off on Device B (second desktop). M1 hub-sync hardening is shipped — see [`MESH_ARCHITECTURE.md`](MESH_ARCHITECTURE.md) Phase M1.*
