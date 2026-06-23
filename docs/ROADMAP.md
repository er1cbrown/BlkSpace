# BlkSpace Roadmap (plain English)

**Last updated:** June 2026 · **Repo:** `main` @ `ea36c0a` era

This doc answers: *what works today, what “BlkSpace-Full” means, and what Tier C / Phase 5 are.*

---

## Where we are

```
Yard MVP (~80%)  ████████░░  Students can install & use core social loop
Economy MVP (~40%) ████░░░░░░  WB simulated; BKSPC devnet scaffolded
```

**Works today:** install → welcome wizard → browse feed (guest or account) → post → profile/MySpace themes → yards → wallet (simulated WB) → marketplace (WB + BKSPC with devnet build).

**Not ready for real money yet:** NFT ownership transfer on purchase, full devnet E2E proof, Device B sign-off on a 4 GB Windows laptop.

---

## Build flavors

### BlkSpace Yard (shipped in CI)

**For:** HBCU students on everyday laptops (4–8 GB RAM).

| Property | Yard build |
|----------|------------|
| Tauri features | `--no-default-features` (no Iroh in binary) |
| Frontend | `VITE_TIER0_LITE=1` — local tab default, less feed IPC |
| Boot | 1 Nostr relay deferred; demo DB seed in background |
| CI artifact | `BlkSpace-Yard-Windows-x64.msi`, `BlkSpace-Yard-macOS.dmg`, `BlkSpace-Yard-Linux.AppImage` |
| Job | `build-tauri-yard` in `.github/workflows/ci.yml` |

**Student doc:** [`../TIER0_USER.md`](../TIER0_USER.md)

### BlkSpace Full (planned — not separate CI artifact yet)

**For:** Power users, lab machines, creators uploading large media over P2P.

| Property | Full build |
|----------|------------|
| Tauri features | `iroh` default — Iroh blob store, heavier binary |
| Relays | Full mesh (5 relays, parallel connect) — set `BLKSPACE_FULL_MESH=1` |
| UI | Bridge tab, trending, sidebar trending, relay panel |
| Use when | Pinning viral CIDs, cross-town bridge, running a real relay node |

**Today:** run locally with `BLKSPACE_FULL_MESH=1 pnpm tauri:dev` or full `pnpm tauri build` (CI `build-tauri` job). A dedicated **`BlkSpace-Full-*`** release artifact is on the todo list so students don't accidentally download the heavy build.

---

## Tier C — Service worker feed cache

**What it is:** For the **web** app (not installed Tauri), cache the last feed in a service worker so reopening BlkSpace feels instant and works offline-read like Instagram's cached timeline.

**Why not yet:** Tauri desktop is the primary student path; web is dev preview + future PWA. Tier C matters when you ship a browser-only yard for Chromebooks.

**Status:** ⬜ Not implemented · spec in [`tier0-load-optimization.md`](tier0-load-optimization.md) Tier C section

---

## Phase 5 — Anti-abuse & scripture NLP

**What it is (from [`../FLESHTHEORY.md`](../FLESHTHEORY.md)):**

| Piece | Purpose |
|-------|---------|
| **Anti-abuse ML** | Detect spam, malicious engagement farming, MIDF gaming — after core yard is stable |
| **Scripture NLP** | Opt-in Bible study / creative scripture tools (`docs/bible-nlp-opt-in-draft.md`) |
| **LogosDecks** | Structured scripture + media decks (`docs/features/logos-decks.md`) |

**Why later:** Phase 0 rule — *no mandatory feature that fails on Tier 0*. ML inference and heavy NLP don't belong on 4 GB laptops until you have cloud or Tier 2+ nodes doing validation.

**Status:** ⬜ Not started · research in `weixinfo/`

---

## Recommended order (next 4 milestones)

### 1. Device B + `v0.1.0-yard` tag ← **do this first**

Turns CI artifacts into a **named release** TSU can trust.

Checklist: [`YARD_RELEASE_CHECKLIST.md`](YARD_RELEASE_CHECKLIST.md)

### 2. Finish Phase 3 gaps

- Community **events** and **roles** (stubbed UI)
- Bundle size budget in CI (no regressions on Tier 0)
- `tauri:dev:tier0` compiles without Iroh (dev parity with Yard)

### 3. Phase 4 marketplace (devnet demo)

- Mint → list → BKSPC burn → seller paid → **buyer owns NFT**
- One recorded devnet walkthrough
- See [`solana-blueprint.md`](solana-blueprint.md)

### 4. BlkSpace Full CI artifact

- `build-tauri-full` job alongside Yard
- Clear naming on Releases page so students pick Yard, labs pick Full

---

## Performance targets (Tier 0)

| Metric | Target | Where measured |
|--------|--------|----------------|
| Window visible | < 3 s | Installed Yard build |
| Feed interactive | < 3 s | `/feed` local tab |
| Feed 50 posts | < 2 s | Sync Test benchmark |
| Post create | < 1 s | Sync Test benchmark |

Plan: [`tier0-load-optimization.md`](tier0-load-optimization.md)

---

## Quick links

| Question | Doc |
|----------|-----|
| How do I install? | [`../TIER0_USER.md`](../TIER0_USER.md) |
| What's in the code? | [`codebase-overview.md`](codebase-overview.md) |
| What's done this week? | [`phase-0-status.md`](phase-0-status.md) |
| All docs | [`README.md`](README.md) |