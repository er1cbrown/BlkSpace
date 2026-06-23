# Yard Release Checklist — `v0.1.0-yard`

**Goal:** A TSU student can download BlkSpace from GitHub Releases, install on a 4 GB Windows laptop, and use the yard without developer tools.

**Time:** ~1–2 hours on one test laptop + 10 minutes for the git tag.

---

## Before you start

| Item | Where |
|------|-------|
| Yard installer built | CI job `Build (BlkSpace Yard - windows-latest)` on `main` |
| Or local build | `cd Code-Companion/artifacts/blkspace && pnpm tauri:build:tier0` |
| Full M0 matrix (optional) | [`device-b-m0-results.md`](device-b-m0-results.md) + [`implementation/DEVICE_MESH_TESTING.md`](implementation/DEVICE_MESH_TESTING.md) |

---

## Part A — Minimum student smoke (30 min)

Use a **Windows 10+ laptop with 4–8 GB RAM** (Device B ideal).

### A1. Install

- [ ] Download `BlkSpace-Yard-Windows-x64.msi` from [Actions artifacts](https://github.com/er1cbrown/BlkSpace/actions) or Releases
- [ ] Double-click install (no admin required)
- [ ] App opens within **5 seconds** of first launch (second launch faster)

### A2. Guest browse

- [ ] Welcome screen → **"Just browse the yard as a guest"**
- [ ] Feed loads on **Local** tab without crash
- [ ] Tap Like → "Create free account" prompt (no error toast)

### A3. Create account

- [ ] Complete welcome wizard
- [ ] Write recovery phrase on **paper** (see [`../FIRST_RUN.md`](../FIRST_RUN.md))
- [ ] Land on feed; post one short message
- [ ] Post appears on Local tab

### A4. Tier 0 benchmark

- [ ] Open **Sync Test** (`/mesh-test`) → **Performance** tab
- [ ] **Run Tier 0 Benchmark** — all metrics pass:

| Metric | Target | Actual | Pass |
|--------|--------|--------|------|
| Feed load (50 posts) | < 2 s | | ☐ |
| Post creation | < 1 s | | ☐ |
| Blob round-trip (512 KiB) | < 30 s | | ☐ |

- [ ] Task Manager: app memory **< 500 MB** during feed scroll (spot check)

**If A1–A4 pass → ready to tag Yard release for students.**

---

## Part B — Full M0 (optional, before campus beta)

For mesh sync, mods, offline queue — fill [`device-b-m0-results.md`](device-b-m0-results.md):

- [ ] Bot accounts + Yard Mod badge
- [ ] Recover account on second device + sync < 60 s
- [ ] Offline post → reconnect → flush

---

## Part C — Tag release

When Part A passes (and CI green on `main`):

```bash
cd BlkSpace
git pull origin main
git tag -a v0.1.0-yard -m "First student-facing Yard build (Tier 0, no Iroh default)"
git push origin v0.1.0-yard
```

- [ ] GitHub Actions **Release** workflow completes
- [ ] Releases page shows `BlkSpace-Yard-Windows-x64.msi` (and macOS/Linux if built)
- [ ] Update [`../TIER0_USER.md`](../TIER0_USER.md) link to point at `v0.1.0-yard` if needed
- [ ] Announce in TSU Yard with: install link + "write down 12 words" reminder

---

## What students should download

| Platform | File |
|----------|------|
| Windows | `BlkSpace-Yard-Windows-x64.msi` |
| macOS | `BlkSpace-Yard-macOS.dmg` |
| Linux | `BlkSpace-Yard-Linux.AppImage` |

**Not** `BlkSpace-Full` — that's for lab machines with Iroh mesh (separate CI job `build-tauri-full`).

---

## If something fails

| Symptom | Check |
|---------|-------|
| White screen > 30 s | Use Yard `.msi`, not `pnpm dev` |
| Feed empty | Wi‑Fi on; wait 10 s; Local tab |
| Benchmark fail | [`TIER0_DEV.md`](TIER0_DEV.md) — warm vs cold dev confusion |
| CI artifact missing | `build-tauri-yard` job log on GitHub Actions |

---

## After `v0.1.0-yard`

See [`ROADMAP.md`](ROADMAP.md) — Phase 4 marketplace, Tier C service worker.