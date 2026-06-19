# Device B — M0 Manual Test Results

**Tester:** _fill in_  
**Date started:** 2026-06-__  
**Date completed:** ____  
**Build:** _tag or commit, e.g. `a1bf52a` or `v0.x`_  
**Runbook:** [`implementation/DEVICE_MESH_TESTING.md`](implementation/DEVICE_MESH_TESTING.md) · ordered steps below

---

## Devices

| Device | OS | RAM / CPU | Build | Role |
|--------|-----|-----------|-------|------|
| A | | | | Primary — `@test_user` creator |
| B | Windows 10 ideal | 4 GB / i3 ideal | | Tier 0 + bots |

---

## Run order (check when done)

### 1. Install build

- [ ] Device B: clone/pull repo **or** install tagged `.msi` / release artifact
- [ ] Same commit/tag as Device A
- [ ] App launches without crash
- **Notes:**

### 2. Bot accounts + join yard

- [ ] Created `@bot_mod` on Device B
- [ ] Created `@bot_student` on Device B (optional: `@bot_alum`)
- [ ] Each bot joined **TSU Yard** (or target yard) — Join Yard toast / +5 WB
- **Notes:**

### 3. §2.6 — Assign Yard Mod, confirm badge

- [ ] Signed in as primary tester on Device B
- [ ] **Communities → TSU → Members** (or Quick Actions → Manage Roles)
- [ ] Assigned **Yard Mod** to `@bot_mod` — confirm dialog → success toast
- [ ] **Yard Mod** badge visible on `@bot_mod` card
- [ ] Badge persists after leaving and re-opening Members tab
- **Notes:**

### 4. §1.4–1.5 — Recover primary + cross-device sync

**Prereq on Device A:** `@test_user` created, mnemonic saved.

- [ ] Device B: **Recover Account** (not Create) with 12-word phrase
- [ ] Same handle `@test_user` on Device B
- [ ] WeixBucks balance matches Device A
- [ ] Device A: post `"Hello from Device A — M0 test"`
- [ ] Device B: post visible within **60s** (refresh feed / wait)
- [ ] Like or reply syncs between devices (optional)
- **Sync latency (seconds):** ___
- **Notes:**

### 5. §3.1 — Offline queue flush

- [ ] Device B: disconnect Wi‑Fi
- [ ] Create post (or like/reply) while offline
- [ ] **Sync Test → Offline** shows pending action(s)
- [ ] Reconnect Wi‑Fi → **Flush Now** or auto flush toast
- [ ] Action appears on Device A after relay round-trip
- [ ] No duplicate posts
- **Notes:**

### 6. §4.1 — Sync Test → Performance (Tier 0)

- [ ] Open **Sync Test** (`/mesh-test`) on Device B
- [ ] **Performance** tab → **Run Tier 0 Benchmark**
- [ ] Record metrics below
- [ ] Task Manager: memory **< 500 MB**, CPU **< 50%** during feed use (manual spot-check)

| Metric | Target | Actual | Pass |
|--------|--------|--------|------|
| App startup | < 5 s | | ☐ |
| Feed load (50 posts) | < 2 s | | ☐ |
| Post creation | < 1 s | | ☐ |
| Blob round-trip (512 KiB) | < 30 s | | ☐ |
| Memory (Task Manager) | < 500 MB | | ☐ |
| CPU (Task Manager) | < 50% | | ☐ |

- **Notes:**

### 7. Sign-off

- [ ] All critical steps 1–6 passed (or failures documented below)
- [ ] Updated [`phase-0-status.md`](phase-0-status.md) status line + manual M0 checkboxes
- [ ] Committed this file with results filled in (or attached to PR)

---

## Failures / blockers

| Step | Issue | Severity |
|------|-------|----------|
| | | |

---

## Summary

**M0 manual gate:** ☐ PASS · ☐ FAIL · ☐ PARTIAL  
**Tier 0 Device B sign-off:** ☐ PASS · ☐ FAIL  
**Phase 2 → 100%:** ☐ Yes (all M0.1–M0.5 checked) · ☐ No

**One-line summary:** _e.g. Device B sync <45s, Tier 0 bench pass, mod badges OK; blob manual pending._