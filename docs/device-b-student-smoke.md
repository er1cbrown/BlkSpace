# Device B — Student smoke (TSU path)

**Scope:** Install Yard MSI → join **TSU** → post → **Customize** MyYard → **Live**  
**Time:** ~20–40 minutes on a second Windows laptop (or same machine in a clean profile)  
**Full mesh M0:** still [`device-b-m0-results.md`](device-b-m0-results.md)  
**Release installers:** [`YARD_RELEASE_CHECKLIST.md`](YARD_RELEASE_CHECKLIST.md)

---

## Build under test

| Field | Value |
|-------|--------|
| **Tester** | _your name_ |
| **Date** | 2026-08-03 |
| **Device B** | Windows · RAM ___ GB · CPU ___ |
| **Installer** | `BlkSpace-Yard-Windows-x64.msi` |
| **Source** | ☐ GitHub Release `v0.1.0-yard` · ☐ local `downloads/` · ☐ CI artifact · ☐ `pnpm tauri:build:tier0` |
| **Commit / tag** | _e.g. `v0.1.0-yard` / `b658153` or rebuild at `267cf41`_ |
| **Includes Customize station?** | Only if build ≥ `267cf41` (2026-08). Older MSI has basic MyYard themes only. |

**Local MSI (this workspace):**  
`C:\Users\viper\desktop\blkspace\downloads\BlkSpace-Yard-Windows-x64.msi` (~15 MB)

**If you need Customize station + orientation UI:** rebuild Yard from current `main` before smoke:

```bat
cd BlkSpace\Code-Companion\artifacts\blkspace
pnpm tauri:build:tier0
```

Installer lands under `src-tauri\target\release\bundle\msi\`.

---

## Run order (check as you go)

### 1. Install

- [ ] Copy MSI to Device B (USB / network / download)
- [ ] Double-click install (User install OK)
- [ ] Launch **BlkSpace** from Start menu
- [ ] Opens without crash · first open &lt; ~15 s (target &lt; 5 s warm)

**Pass?** ☐ Yes · ☐ No · **Notes:** _______________

---

### 2. Guest (optional, 2 min)

- [ ] Welcome → **Just browse the yard as a guest**
- [ ] **Home** feed loads (My Yard / Local)
- [ ] Like → prompt to create account (no hard error)

**Pass?** ☐ Yes · ☐ No · ☐ Skipped

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
**Pass?** ☐ Yes · ☐ No · **Notes:** _______________

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

**Pass?** ☐ Yes · ☐ No · ☐ N/A (old MSI without station)  
**Notes:** _______________

---

### 6. Live room (yard hangout)

- [ ] **Yards** → open **TSU** community
- [ ] Tab **Live**
- [ ] Open Stage or Voice room (Jitsi / external link)
- [ ] Page loads (iframe or browser); no app crash

**Pass?** ☐ Yes · ☐ No · **Notes:** _______________

---

### 7. Quick health (spot)

- [ ] Task Manager: BlkSpace memory **&lt; 500 MB** while scrolling Home
- [ ] No white screen after 30 s idle
- [ ] Optional: **More → Mesh / Sync Test → Performance → Tier 0 Benchmark**

| Metric | Target | Actual | Pass |
|--------|--------|--------|------|
| Feed usable | loads | | ☐ |
| Post | &lt; 2 s feel | | ☐ |
| Memory | &lt; 500 MB | | ☐ |

---

## Sign-off

| Gate | Result |
|------|--------|
| **Student path (1–6)** | ☐ PASS · ☐ FAIL · ☐ PARTIAL |
| **Ready for campus demo** | ☐ Yes · ☐ No |
| **Need rebuild at HEAD** | ☐ Yes (for Customize) · ☐ No |

**One-line summary:**  
_e.g. MSI installed, TSU join + post OK; Live opens; Customize N/A on v0.1.0-yard MSI — rebuild at 267cf41._

**Blockers:**

| Step | Issue | Severity |
|------|-------|----------|
| | | |

---

## After pass

1. Copy results into this file (commit) or paste into Discord/issue.  
2. If using old MSI and Customize failed: rebuild Yard at `main` (`267cf41+`) and re-run steps 5–6.  
3. Optional full M0: [`device-b-m0-results.md`](device-b-m0-results.md).  
4. When Part A of [`YARD_RELEASE_CHECKLIST.md`](YARD_RELEASE_CHECKLIST.md) is green on HEAD, retag student release if needed.
