# Device B — Student smoke (TSU path)

**Scope:** Install Yard MSI → join **TSU** → post → **Customize** MyYard → **Live**  
**Time:** ~20–40 minutes on a second Windows laptop (or same machine in a clean profile)  
**Full mesh M0:** still [`device-b-m0-results.md`](device-b-m0-results.md)  
**Release installers:** [`YARD_RELEASE_CHECKLIST.md`](YARD_RELEASE_CHECKLIST.md)

---

## Build under test

| Field | Value |
|-------|--------|
| **Tester** | Device B smoke (this PC is Device B) |
| **Date** | 2026-08-27 (re-run on HEAD) · first pass 2026-08-13 |
| **Device B** | Windows · RAM 5.9 GB · CPU AMD Ryzen 5 3500U |
| **Installer** | 2026-08-13 local Yard MSI still on disk; **student path 2–6 re-run 2026-08-27** on Yard lite SPA `bun run build:tier0` |
| **Source** | ☐ GitHub Release · ☑ SPA `dist/public` from `build:tier0` @ `4812bdb` (Playwright) |
| **Commit / tag** | `4812bdb` (MyYard tape + pimp) · prior tag `v0.1.1-yard` |
| **Includes Customize station?** | ☑ yes — Look Neon, About mood, Pimp/Music tabs, Save, reload mood |
| **How steps 2–6 were run** | Playwright `e2e/device-b.browser.spec.ts` against `http://127.0.0.1:24442` — **2 passed (7.8s)** on 2026-08-27 |

**Local MSI (this workspace):**  
`C:\Users\viper\desktop\BlkSpace\downloads\BlkSpace-Yard-Windows-x64.msi` (15.27 MB, 2026-08-13 17:24)  
NSIS: `downloads\BlkSpace-Yard-Windows-x64-setup.exe` (12.47 MB)

Silent MSI needed admin (exit 1603 / 1625). Device B Start Menu `app.exe` was replaced with the new binary (`29,139,456` bytes, `buffer-polyfill` string present).

**Local source (this workspace):**  
`C:\Users\viper\desktop\BlkSpace\BlkSpace` @ `cff3355` (`git reset --hard origin/main`, 2026-08-13)

**If you need Customize station + orientation UI:** rebuild Yard from current `main` before smoke:

```bat
cd BlkSpace\Code-Companion\artifacts\blkspace
set BLKSPACE_SKIP_FRONTEND=1
bun run tauri:build:tier0
```

`BLKSPACE_SKIP_FRONTEND=1` uses `src-tauri/blkspace-device-b-build.json` (empty `beforeBuildCommand`) so 6 GB hosts skip Vite and embed the existing `dist/public`. Unset the flag on CI / full rebuilds.

Installer lands under `%CARGO_TARGET_DIR%\release\bundle\msi\` (default `~\.cache\blkspace-target\`).

---

## Run order (check as you go)

### 1. Install

- [x] Copy MSI to Device B (USB / network / download)
- [x] Double-click install (User install OK) — silent `msiexec /i … /qn` 2026-08-13 (exit 0; product reconfigured)
- [x] Launch **BlkSpace** (`AppData\Local\Programs\BlkSpace\app.exe`)
- [x] Opens without crash · process up within seconds

**Pass?** ☑ Yes · ☐ No · **Notes:** Reloaded 2026-08-13 later same day. `C:\Users\viper\.cache\blkspace-target\release\app.exe` (29,111,296 bytes, mtime 2026-08-13 2:37) launched in ~5 s. pid 10532 then 14072, **33–35 MB** WS. Process was not still running after the Playwright pass (no crash dialog observed).

---

### 2. Guest (optional, 2 min)

- [x] Welcome → **Just browse the yard as a guest**
- [x] **Home** feed loads (My Yard / Local) — orientation “You’re on Tennessee State University”
- [x] Guest CTA **Create free account** shown (composer gated). Heart control present; sonner “like posts” toast not in a11y tree

**Pass?** ☑ Yes · ☐ No · **Notes:** Playwright `device-b.browser.spec.ts` test 2, 1.2–1.4 s. Feed also showed a Meharry link in the Home subtitle (Focus Path leftover) while campus chrome said TSU.

---

### 3. Join as TSU student

- [x] **Create free account** / welcome wizard
- [x] Path: **Student · social home** (not med/faculty)
- [x] Home yard: **Tennessee State / TSU** (`tsu`)
- [x] Display name + `@handle`
- [x] Recovery phrase screen shown (24 words). Ack checkbox + Continue
- [x] Lands on **Home**
- [ ] Dismiss or keep guide (left in place)

**Handle:** `@deviceb_*` (ephemeral per run)  
**Pass?** ☑ Yes · ☐ No · **Notes:** Join works without a test shim after `public/buffer-polyfill.js` (`window.Buffer` present on `/welcome`). Recovery phrase screen shown; ack + Continue.

---

### 4. Post on the yard

- [x] Home → **Yard** tab
- [x] Write short post `Device B smoke · TSU · hello`
- [x] Submit
- [x] Post visible on **Yard**

**Pass?** ☑ Yes · ☐ No · **Latency:** **0.165–0.178 s** on 2026-08-27 (was 0.21–0.28 s on 2026-08-13; target < 2 s)

---

### 5. Customize MyYard (multimedia)

- [x] Open **You / Profile** (own profile)
- [x] Banner **Customize** or tab **Customize**
- [x] **Look:** pick banner gradient **Neon**
- [x] **About:** set mood line `TSU · Device B smoke`
- [ ] **Photos:** add ≥1 image — skipped (no file in CI automation)
- [x] **Music tab** visible — tape only if 2+ tracks; no upload in this run
- [x] **Pimp / CSS** tab visible
- [x] **Save MyYard**
- [x] Reload profile — mood `TSU · Device B smoke` still there

**Pass?** ☑ Yes · ☐ No · **Notes:** 2026-08-27 Playwright: Look Neon + mood + save + reload. Photos still not uploaded. Music/Pimp tabs present.

---

### 6. Live room (yard hangout)

- [x] **Yards** → open **TSU** community (`/communities/tsu`)
- [x] Tab **Live**
- [x] Open Stage room **Device B smoke stage**
- [x] Jitsi iframe loaded (`meet.jit.si/BlkSpaceYardtsu…`); page did not crash

**Pass?** ☑ Yes · ☐ No · **Notes:** iframe title `Device B smoke stage`; “In room” chip shown.

---

### 7. Quick health (spot)

- [x] Task Manager: BlkSpace memory **&lt; 500 MB** at launch (~33 MB WS)
- [x] Process still up after 30 s idle (52 s check) — window contents need human eyes (white-screen unknown)
- [ ] Optional: **More → Mesh / Sync Test → Performance → Tier 0 Benchmark**

| Metric | Target | Actual | Pass |
|--------|--------|--------|------|
| Feed usable | loads | guest + post-join Home/Yard | ☑ |
| Post | &lt; 2 s feel | **0.165 s** (2026-08-27) | ☑ |
| Memory | &lt; 500 MB | ~33–35 MB launch (2026-08-13 native) | ☑ |

---

## Sign-off

| Gate | Result |
|------|--------|
| **Student path (1–6)** | ☑ **PASS** · ☐ FAIL · ☐ PARTIAL |
| **Ready for campus demo** | ☑ **Yes** (SPA path on Device B host) · native photos / Tier 0 bench still optional |
| **Need rebuild at HEAD** | ☑ student path closed on `4812bdb` SPA · new Yard MSI still needed if students are on `v0.1.0-yard` only |

**One-line summary:**  
Device B (2026-08-27, `4812bdb` Yard lite SPA): guest → TSU join → post (**0.17 s**) → Customize (Neon + mood + reload) → Live **PASS**. Photos and native Tier 0 bench still optional.

**Blockers:**

| Step | Issue | Severity |
|------|-------|----------|
| 5 | Photo upload not exercised | low |
| 7 | Native Tier 0 Benchmark not run (Tauri-only) | low |
| ship | Unsigned installers OK; new MSI from HEAD if campus should get pimp/tape | low |

---

## After pass

1. Copy results into this file (commit) or paste into Discord/issue.  
2. If using old MSI and Customize failed: rebuild Yard at `main` (`267cf41+`) and re-run steps 5–6.  
3. Optional full M0: [`device-b-m0-results.md`](device-b-m0-results.md).  
4. When Part A of [`YARD_RELEASE_CHECKLIST.md`](YARD_RELEASE_CHECKLIST.md) is green on HEAD, retag student release if needed.
