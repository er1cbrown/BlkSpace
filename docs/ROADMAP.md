# BlkSpace Roadmap (plain English)

**Last updated:** August 2026 · **Repo:** [`er1cbrown/BlkSpace`](https://github.com/er1cbrown/BlkSpace)  
**Product mark:** **BlkSpace** · **Coin ticker:** **BKSPC** (BlkSpace Coin) · Soft: **WeixBucks**

This doc answers: *what works today, multi-OS status, what “BlkSpace-Full” means, and what Tier C / Phase 5 are.*

**Capability log (use cases):** [`features/use-case-capability-log.md`](features/use-case-capability-log.md)  
**Trademark / coin rights:** [`features/brand-trademark-and-bkspc-rights.md`](features/brand-trademark-and-bkspc-rights.md)

---

## Where we are

```
Cross-OS desktop (~90%) █████████░  Windows + macOS + Linux (Yard & Full via CI)
Yard MVP (~80%)         ████████░░  Students can install & use core social loop
Campus use cases (~80%) ████████░░  Connect · escrow · events · clubs · studio
Economy MVP (~50%)      █████░░░░░  WB + escrow; BKSPC devnet scaffolded (not mainnet rights)
Mobile (~10%)           ██░░░░░░░░  Planned (Tauri); not shipping yet
```

**Works today:** install on **Windows / macOS / Linux** → welcome → feed → **MyYard** → yards → wallet (WB) → **Yard Sale** (instant + escrow) → **Connect** → **Events/tickets** → **Clubs** (reading/tournaments) → **Studio** (portfolio + client delivery). Local DB **Turso** on desktop. **ClinYard** (`/clinyard`) — offline ClinFusion-style med study drills for professional students (see [`features/clinyard-med-study.md`](features/clinyard-med-study.md)).

**Not ready for real money yet:** mainnet **BKSPC** public launch, full Eventbrite/Pixieset/Twitch clones, live streaming, Device B sign-off on a 4 GB Windows laptop.

**Multi-OS principle:** one codebase (Tauri 2 + React). If it runs on Tier 0 Windows, the same product ships to MacBook and Linux labs.

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

### BlkSpace Full (shipped in CI)

**For:** Power users, lab machines, creators uploading large media over P2P.

| Property | Full build |
|----------|------------|
| Tauri features | `iroh` default — Iroh blob store, heavier binary |
| Relays | Full mesh (5 relays, parallel connect) — set `BLKSPACE_FULL_MESH=1` at dev time |
| UI | Bridge tab, trending, sidebar trending, relay panel |
| Use when | Pinning viral CIDs, cross-town bridge, running a real relay node |
| CI artifact | `BlkSpace-Full-Windows-x64.msi`, `BlkSpace-Full-macOS.dmg`, `BlkSpace-Full-Linux.AppImage` |
| Job | `build-tauri-full` in `.github/workflows/ci.yml` |

**Local dev:** `bun run tauri:dev:full` or `bun run tauri:build:full` from `Code-Companion/artifacts/blkspace`. Tagged releases upload both Yard and Full via `build-yard` + `build-full` in `release.yml`.

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

## Recommended order (next milestones)

### 1. Device B student smoke close-out (tag already shipped)

**Tag `v0.1.0-yard`:** ✅ pushed; Release workflow attached Yard + Full installers  
([GitHub release](https://github.com/er1cbrown/BlkSpace/releases/tag/v0.1.0-yard)).

**Still open:** Part A student path on Device B (guest browse, TSU account/post, Customize/Live, Tier 0 benchmark) and Part C announce / `TIER0_USER` link check.

Checklist: [`YARD_RELEASE_CHECKLIST.md`](YARD_RELEASE_CHECKLIST.md) · IEEE operator pack: [`IEEE_CONFERENCE_PACK.md`](IEEE_CONFERENCE_PACK.md)

**Product pack (2026-08):** 24h dual-mode Stories + web profile-song path + IEEE Connect seeds (see conference pack Track B/C).

### 2. Credibility layer — ProjectConnectBKSPC ← **build before mainnet finance**

Orgs · opportunities · interest · connect · Yard Cred — professional/clubs/service hubs  
**without** shipping token hype first.

Spec: [`features/project-connect-credibility-layer.md`](features/project-connect-credibility-layer.md)

### 3. Finish remaining Phase 3 product gaps

- Community **events** and **roles** (stubbed UI)
- ~~Bundle size budget in CI~~ ✅ — job `bundle-budget-tier0` → `check:bundle:tier0`
- ~~`tauri:dev:tier0` without Iroh~~ ✅ — script in `artifacts/blkspace/package.json`

### 4. Phase 4 marketplace / BKSPC settlement (devnet → mainnet only after Cred gates)

- Mint → list → BKSPC burn → seller paid → **buyer owns NFT**
- Withdraw eligibility includes **credibility_score** + completions (see Connect doc)
- Walkthrough: [`phase-4-devnet-demo.md`](phase-4-devnet-demo.md)
- Token name: **BKSPC = BlkSpace Coin** — [`tokenomics-policy.md`](tokenomics-policy.md)

### DevOps milestones (CI reality)

| Item | Status |
|------|--------|
| Lint / typecheck / unit tests on every PR | ✅ |
| Yard + Full multi-OS CI installers (`build-tauri-yard` / `build-tauri-full`) | ✅ |
| Playwright E2E (web + Tauri) | ✅ |
| Automated draft releases on `v*` tags | ✅ |
| Tier 0 bundle-size budget in CI | ✅ |
| `v0.1.0-yard` tagged release assets | ✅ |
| Code signing / notarization in `release.yml` | ⏳ Workflow wired; secrets pending |
| GitHub Pages web-preview enablement | ⏳ Workflow ready; repo setting pending |
| CI gate heavy builds on lint/typecheck/test; Nostr smoke non-blocking; `cargo --locked` | ✅ |
| Mobile CI (iOS/Android via Tauri Mobile) | ⬜ Planned |

Detail: [`../DEVOPS.md`](../DEVOPS.md) · Roadmap table there is the DevOps checklist of record.

---

## Performance targets (Tier 0)

| Metric | Target | Where measured |
|--------|--------|----------------|
| Window visible / shell ready | < 3 s | Live Tauri: `run_tier0_benchmark` → **Tauri shell ready (process)** |
| Feed interactive | < 3 s | Open `/feed` once, then Sync Test → **Feed interactive (process)** |
| Feed 50 posts | < 2 s | Sync Test benchmark + `bun run test:tier0` |
| Post create | < 1 s | Sync Test benchmark + `bun run test:tier0` |

Process clock: `tier0_benchmark` (`mark_process_start` / `mark_shell_ready` / `mark_feed_interactive`). Plan: [`tier0-load-optimization.md`](tier0-load-optimization.md)

---

## Quick links

| Question | Doc |
|----------|-----|
| How do I install? | [`../TIER0_USER.md`](../TIER0_USER.md) |
| What's in the code? | [`codebase-overview.md`](codebase-overview.md) |
| What's done this week? | [`phase-0-status.md`](phase-0-status.md) |
| All docs | [`README.md`](README.md) |
