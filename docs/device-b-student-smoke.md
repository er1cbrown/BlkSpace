# Device B — Student smoke (TSU path)

**Scope:** Install Yard MSI → join **TSU** → post → **Customize** MyYard → **Live**  
**Time:** ~20–40 minutes on a second Windows laptop (or same machine in a clean profile)  
**Full mesh M0:** still [`device-b-m0-results.md`](device-b-m0-results.md)  
**Release installers:** [`YARD_RELEASE_CHECKLIST.md`](YARD_RELEASE_CHECKLIST.md)

---

## Build under test

| Field | Value |
|-------|--------|
| **Tester** | Device B smoke (dev machine as Device B) |
| **Date** | 2026-08-03 |
| **Device B** | Windows (this PC) · RAM — · CPU — |
| **Installer** | `BlkSpace-Yard-Windows-x64.msi` |
| **Source** | ☑ local `downloads/` · ☐ GitHub Release · ☐ CI · ☑ rebuild `bun run tauri:build:tier0` (in progress for step 5) |
| **Commit / tag** | MSI ≈ `v0.1.0-yard` / pre-Customize · rebuild targets `8098f11`+ |
| **Includes Customize station?** | ☐ on this MSI · ☑ after tier0 rebuild finishes |

**Local MSI (this workspace):**  
`C:\Users\viper\desktop\blkspace\downloads\BlkSpace-Yard-Windows-x64.msi` (~15 MB)

**If you need Customize station + orientation UI:** rebuild Yard from current `main` before smoke:

```bat
cd BlkSpace\Code-Companion\artifacts\blkspace
bun run tauri:build:tier0
```

Installer lands under `src-tauri\target\release\bundle\msi\`.

---

## Run order (check as you go)

### 1. Install

- [x] Copy MSI to Device B (USB / network / download)
- [x] Double-click install (User install OK) — silent `msiexec /i … /qn` 2026-08-03
- [x] Launch **BlkSpace** (`AppData\Local\Programs\BlkSpace\app.exe`)
- [x] Opens without crash · process up within seconds

**Pass?** ☑ Yes · ☐ No · **Notes:** MSI reconfigure success (product 0.1.0). Working set ~45 MB at launch. Path: `C:\Users\viper\AppData\Local\Programs\BlkSpace\app.exe`

---

### 2. Guest (optional, 2 min)

- [ ] Welcome → **Just browse the yard as a guest**
- [ ] **Home** feed loads (My Yard / Local)
- [ ] Like → prompt to create account (no hard error)

**Pass?** ☐ Yes · ☐ No · ☑ **Needs human click** (app is open on desktop)

---

### 3. Join as TSU student

- [ ] **Create free account** / welcome wizard
- [ ] Path: **Student · social home** (not med/faculty)
- [ ] Home yard: **Tennessee State / TSU** (`tsu`)
- [ ] Display name + `@handle`
- [ ] Write recovery phrase on **paper** if shown ([`FIRST_RUN.md`](../FIRST_RUN.md))
- [ ] Lands on **Home** with orientation card (“You’re on … TSU”)
- [ ] Dismiss or keep guide

**Handle:** @_______________  
**Pass?** ☐ Yes · ☐ No · **Notes:** UI not automatable here — complete in open window

---

### 4. Post on the yard

- [ ] Home → **My Yard** tab
- [ ] Write short post, e.g. `Device B smoke · TSU · hello`
- [ ] Submit → toast / earn if any
- [ ] Post visible on **My Yard** (refresh if needed)

**Pass?** ☐ Yes · ☐ No · **Latency:** ___ s

---

### 5. Customize MyYard (multimedia)

- [ ] Open **You / Profile** (own profile)
- [ ] Banner **Customize** or tab **Customize**
- [ ] **Look:** pick a banner gradient + accent color
- [ ] **About:** set mood line (e.g. `TSU · Device B smoke`)
- [ ] **Photos:** add ≥1 image (desktop upload or file pick)
- [ ] **Music:** optional if audio already uploaded
- [ ] **Save MyYard**
- [ ] Reload profile — banner/mood/gallery still there

**Pass?** ☐ Yes · ☐ No · ☑ **N/A until tier0 rebuild** (this MSI lacks Customize station)  
**Notes:** `bun run tauri:build:tier0` started 2026-08-03 on HEAD; reinstall new MSI when bundle ready, then retest 5.

---

### 6. Live room (yard hangout)

- [ ] **Yards** → open **TSU** community
- [ ] Tab **Live**
- [ ] Open Stage or Voice room (Jitsi / external link)
- [ ] Page loads (iframe or browser); no app crash

**Pass?** ☐ Yes · ☐ No · **Notes:** Needs human click in running app

---

### 7. Quick health (spot)

- [x] Task Manager: BlkSpace memory **&lt; 500 MB** at launch (~45 MB WS)
- [ ] No white screen after 30 s idle
- [ ] Optional: **More → Mesh / Sync Test → Performance → Tier 0 Benchmark**

| Metric | Target | Actual | Pass |
|--------|--------|--------|------|
| Feed usable | loads | | ☐ |
| Post | &lt; 2 s feel | | ☐ |
| Memory | &lt; 500 MB | ~45 MB launch | ☑ |

---

## Sign-off

| Gate | Result |
|------|--------|
| **Student path (1–6)** | ☐ PASS · ☐ FAIL · ☑ **PARTIAL** (1 + launch health done; 2–4,6 manual; 5 after rebuild) |
| **Ready for campus demo** | ☐ Yes · ☐ No · after 2–4 + 6 |
| **Need rebuild at HEAD** | ☑ Yes (for Customize) · build running |

**One-line summary:**  
MSI installed + `app.exe` launched (step 1 PASS, ~45 MB). Steps 2–4 and 6 need clicks in the open BlkSpace window. Step 5 blocked until `bun run tauri:build:tier0` MSI lands.

**Blockers:**

| Step | Issue | Severity |
|------|-------|----------|
| 5 | Current MSI predates Customize station | medium — rebuild in progress |
| 2–4, 6 | Requires interactive UI | process — do now in open app |

---

## After pass

1. Copy results into this file (commit) or paste into Discord/issue.  
2. If using old MSI and Customize failed: rebuild Yard at `main` (`267cf41+`) and re-run steps 5–6.  
3. Optional full M0: [`device-b-m0-results.md`](device-b-m0-results.md).  
4. When Part A of [`YARD_RELEASE_CHECKLIST.md`](YARD_RELEASE_CHECKLIST.md) is green on HEAD, retag student release if needed.
