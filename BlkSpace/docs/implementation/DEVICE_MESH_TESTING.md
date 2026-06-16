# Implementation Plan: Device Mesh Testing

**Status:** ⏳ M0 manual gate — automated backbone ✅; Device B + two-device sign-off open  
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

| Check | How to verify | Pass |
|-------|----------------|------|
| Post detail `RiskBadge` | Open `/posts/:id` — MIDF badge beside sig badge | [x] code (`post.tsx`) |
| Invalid sig banner | Post with bad/missing cached sig shows red alert | [x] code (`SignatureWarningBanner`) |
| `SignatureBadge` on feeds | Watch/Read/Bridge cards show Sig verified/invalid | [x] code (`WatchFeed`, `ReadFeed`, `feed.tsx` Bridge) |
| Link previews off | URLs in posts are plain links, no OG fetch | [x] code (`SafeContent`, Settings note) |
| DM warning | Yard channel + post reply show amber experimental banner | [x] code (`community.tsx`, `post.tsx`) |
| Town tag enforcement | Relay rejects kind 1 without `t:hbcu-town:*` | [x] auto (`test_validate_relay_event_tags`, `ingest_validated_relay_event`) |
| Daily cap toast | Grant when near 250 WB shows partial/clipped message | [x] auto (`test_earn_result_daily_cap_flag`, `EarnToast`) |
| Nostr publish identity | Tips/marketplace/node events skip if no user key (no ephemeral key) | [x] code (`user_nostr_keys_for_publish`) |
| Iroh upload → CID → Device B fetch | `pnpm test:iroh` passes; manual § Iroh two-device steps | [x] auto / [ ] manual |

### 2.5 Tipping Test

1. `@user_b` sends 10 WB to `@user_a`
2. Verify:
   - [ ] @user_b balance: 92
   - [ ] @user_a balance: 116
   - [ ] Transaction visible in both wallets

---

## Phase 3: Offline & Bridge (Day 2) — M0.3

Uses shipped **offline queue** (`queue_offline_action` → `flush_offline_queue`) and `OfflineSyncProvider` (flush on `online` + 60s). No BLE or libp2p required.

### 3.1 Offline write queue

**Scenario:** Device B loses internet mid-session

1. Disconnect Wi‑Fi on Device B (or use OS offline mode)
2. On Device B: create post, like, reply, or follow
3. Confirm pending actions in **Mesh Test → Sync** (or `count_pending_offline_actions`)
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
| App startup | < 5 seconds | — | Timer on Device B |
| Feed load (50 posts) | < 2 seconds | `pnpm test:tier0` / Mesh Test → Performance | [ ] Device B |
| Post creation | < 1 second | same | [ ] Device B |
| Blob round-trip (512 KiB) | < 30 seconds | same (proxy for 5MB upload) | [ ] Device B |
| Memory usage | < 500 MB | — | Task Manager |
| CPU usage | < 50% | — | Task Manager |

**Automated baseline (dev hardware):** `pnpm test:tier0` runs `test_tier0_benchmark_feed_post_blob_targets` — passes on Tier 2 Mac; does **not** replace Device B sign-off.

**In-app:** Mesh Test → **Performance** → **Run Tier 0 Benchmark** (`run_tier0_benchmark` Tauri command).

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
| 1 | Account recovery on 2+ desktops | — | [ ] Phase 1.4 |
| 2 | Cross-device sync &lt;60s | `pnpm test:nostr-relay` | [ ] Phase 1.5 |
| 3 | Offline queue → relay flush | `offline_queue` tests | [ ] Phase 3.1–3.3 |
| 4 | Media via CID + cache | `pnpm test:iroh` | [ ] §2.4 Iroh row |
| 5 | Tier 0 performance | `pnpm test:tier0` | [ ] §4.1 Device B |
| 6 | No data loss on sync | DB tests | [ ] Phase 4.2 stress |

**Score:** 0/6 manual (as of 2026-06-16).

---

*Next: Complete M0 manual sign-off, then M1 hardening in [`MESH_ARCHITECTURE.md`](MESH_ARCHITECTURE.md). Iroh integration proof is already automated.*
