# BlkSpace Progress Dashboard

**Project:** BlkSpace on WeixNet  
**Last updated:** 2026-06-22  
**Repo:** `BlkSpoof/` monorepo

---

## Status line

```
Phase 0 ✅ | Phase 1 ✅ | Phase 2 auto ✅ | M1 hub-sync ✅ | P4–P5 ✅ | P6 earn ✅ | P7 bridge ✅ | Guest mode ✅ | M0 manual ⏳
```

---

## Device B M0 run (in progress)

**Quick gate:** [`YARD_RELEASE_CHECKLIST.md`](YARD_RELEASE_CHECKLIST.md) (student smoke + tag)  
**Full runbook:** [`device-b-m0-results.md`](device-b-m0-results.md) (fill as you go)

| Step | Task | Status |
|------|------|--------|
| 1 | Install build on Device B | ⏳ |
| 2 | Bot accounts + join yard | ⏳ |
| 3 | Assign Yard Mod — confirm badge (§2.6) | ⏳ |
| 4 | Recover `@test_user` + sync <60s (§1.4–1.5) | ⏳ |
| 5 | Offline queue flush (§3.1) | ⏳ |
| 6 | Sync Test → Performance / Tier 0 (§4.1) | ⏳ |
| 7 | Results file + this dashboard updated | ⏳ |

When step 7 passes, set **M0 manual ✅** and **Tier 0 Device B ✅** in the status line above.

---

## Anonymous Mode (guest browse) — ✅ Phase 0 shipped

**Plan:** [`tier0-freemium-wallet-gating-plan.md`](tier0-freemium-wallet-gating-plan.md)  
**Goal:** A Tier 0 user can open BlkSpace and consume FYP / search / profiles / yards
without creating a Nostr identity. Write actions are gated behind a "Create free
account" prompt. Protects the weakest machines and matches TikTok/YouTube/X browse-first UX.

### Implementation (landed 2026-06-22)

| Surface | Guest behavior | File |
|---------|----------------|------|
| Identity detection | `hasIdentity()` = session token present; `isGuest` = !hasIdentity | `src/lib/auth.ts`, `src/lib/guest-mode.tsx` |
| First-run entry | Welcome step 0 has "Just browse the yard as a guest" → `enterGuestMode()` → `/feed` | `src/pages/welcome.tsx` |
| Feed FYP / Watch / Read | Read-only; composer replaced by `GuestCTA` | `src/pages/feed.tsx` |
| Like / Repost / Boost | Prompt "Create a free account to …" via `useRequiresWallet` | `src/pages/feed.tsx` |
| Profile view | Read-only; Follow prompts; wall composer hidden for guests; `isOwnProfile` false | `src/pages/profile.tsx` |
| Search | Read-only (unchanged) | `src/pages/search.tsx` |
| Yards list / detail | Read-only; Join Yard / channel post / reply / create event prompt | `src/pages/community.tsx` |
| Gated routes | `/wallet`, `/create`, `/settings`, `/mesh-test` show full-page `GuestCTA` via `GuestRoute` | `src/App.tsx` |
| Nav chrome | Desktop/mobile hide Create + Wallet; show "Create free account" + "Sign in" | `src/components/layout/AppShell.tsx` |

### Automated proof

| Check | Command | Status |
|-------|---------|--------|
| Typecheck | `pnpm typecheck` | ✅ 2026-06-22 |
| Frontend tests | `pnpm test:run` | ✅ 27/27 (5 new guest-mode tests) |

### Device 2 beta (pending)

- [ ] Launch app on Device 2 (Tier 0 Windows 4GB/i3)
- [ ] Tap "Just browse the yard as a guest" → lands on read-only `/feed`
- [ ] Scroll Watch + Read tabs; feed loads < 2 s, no crash
- [ ] Search a handle; profile loads read-only
- [ ] Click Like / Follow / Join Yard → "Create free account" prompt (no error)
- [ ] Sync Test → Performance: Tier 0 benchmark passes in guest mode
- [ ] Task Manager: memory < 500 MB, CPU < 50 %
- [ ] Create account → composer + actions unlock; regression-check post/upload/join

---

## Automated proof (run from `Code-Companion/artifacts/blkspace`)

| Suite | Command | Last run | Count |
|-------|---------|----------|-------|
| Rust unit | `cargo test --lib -- --skip nostr_relay_smoke` | 2026-06-19 ✅ | 100 |
| Iroh | included in default `--lib` (`iroh` feature) | 2026-06-19 ✅ | in above |
| Nostr live | `cargo test nostr_relay_smoke -- --test-threads=1` | 2026-06-16 ✅ | 6 |
| Tier 0 bench | `cargo test tier0_benchmark` | 2026-06-16 ✅ | 1 |

**Total automated:** 100 lib tests passing (`a1bf52a`, excluding live Nostr smoke).

---

## Implementation success criteria

### Iroh (`docs/implementation/IROH_INTEGRATION.md`)

| Criterion | Status |
|-----------|--------|
| Upload → CID | ✅ auto |
| CID in Nostr `imeta` | ✅ auto |
| Multi-device fetch by CID | ✅ auto |
| Town pin threshold | ✅ auto |
| Pin serve rewards | ✅ auto |
| Local blob fallback | ✅ auto |
| Tier 0 hardware upload/download | ⏳ manual Device B §4.1 |

**Score: 6/7**

### Nostr relays (`docs/implementation/REAL_NOSTR_RELAYS.md`)

| Criterion | Status |
|-----------|--------|
| Connect ≥3 public relays | ✅ auto |
| Publish + read on relay.damus.io | ✅ auto |
| Subscribe/sync town tags | ✅ auto |
| Relay health | ✅ auto |
| NIP-65 publish + live fetch | ✅ auto + Relays UI |

**Score: 5/5**

### Hub-sync mesh (`docs/implementation/MESH_ARCHITECTURE.md`)

| Criterion | Auto | Manual |
|-----------|------|--------|
| Account recovery (2+ desktops) | ✅ `/recover` path | ⏳ M0.1 Device B |
| Cross-device sync &lt; 60s (Nostr) | ✅ `test_nostr_*` | ⏳ M0.2 |
| Offline queue → relay flush | ✅ queue + M1 reply Nostr flush | ⏳ M0.3 |
| Media CID + cache | ✅ `pnpm test:iroh` + M1 kind 1063 on upload | ⏳ M0.4 |
| Tier 0 hardware smooth | ✅ `pnpm test:tier0` dev Mac | ⏳ M0.5 Device B |
| No data loss on sync | ✅ DB + rate-limit tests | ⏳ M0 stress |

**Score: 6/6 auto · 0/6 manual**. BLE/LAN mesh **deferred**.

### Security (`docs/security-considerations.md`)

| Area | Status |
|------|--------|
| Signature + event id hash | ✅ |
| Unified relay ingest | ✅ |
| Publish identity (user key only) | ✅ |
| MIDF heuristics + UI badges | ✅ |
| Daily cap 250 WB + self-reply/like blocks | ✅ |
| No NIP-04 / no link previews | ✅ |

**Score: checklist complete** — formal audit not done

---

## Phase completion (high level)

| Phase | Focus | Status |
|-------|--------|--------|
| 0 | Theory, repo, CI | ✅ Complete |
| 1 | Social, economy, auth, security UI | ✅ Complete |
| 2 | Iroh, Nostr mesh, offline queue | ~90% — M0 manual open on Device B |
| 3 | Communities, full rewards, theming | ~75% — events, roles, earn rates, Bridge polish; pilot open |
| 4 | Wallet on-chain, NFT, BKSPC | Not started |
| 5 | Ops, release | Not started |

**MVP target:** end of Phase 3 per `plan.md`. **~78–80% to MVP** (automated proof ahead of Device B sign-off).

---

## In-app verification (manual, ~20 min)

| Check | Where |
|-------|--------|
| Yard mod assign + badge | Communities → TSU → Members |
| Yard event RSVP + earn | Communities → TSU → Events |
| NIP-65 publish/fetch | Relays → **Publish my relay list** → **Refresh from relays** |
| Tier 0 benchmarks | Sync Test → Performance (Device B for sign-off) |
| Offline flush | Sync Test → Offline → **Flush Now** |

---

## Open next (priority)

1. **P1 Device 2 guest-mode beta** — run the "Device 2 beta" checklist in the Anonymous Mode section above (Tier 0 Windows 4GB/i3)
2. **P2 Device B M0 matrix** — run [`device-b-m0-results.md`](device-b-m0-results.md) steps 1–7
3. **P3** — tagged pilot build (`v0.x`)
4. ~~**P6 earn audit**~~ — ✅ earn-sources + wallet rates + like earn toast
5. ~~**P7 Bridge polish**~~ — ✅ mobile tab, BridgeFeed, yard links
6. ~~**P4 events**~~ · ~~**P5 roles**~~ · ~~**P8 wallet**~~ — ✅ 2026-06-19

---

## Key doc index

| Doc | Use for |
|-----|---------|
| [`device-b-m0-results.md`](device-b-m0-results.md) | Fill-in M0 results (step 7) |
| [`implementation/DEVICE_MESH_TESTING.md`](implementation/DEVICE_MESH_TESTING.md) | Full M0 matrix |
| [`plan.md`](../plan.md) | Master phase plan |
| [`mvp-timeline-and-onchain-roadmap.md`](mvp-timeline-and-onchain-roadmap.md) | Priority list P1–P11 |

---

*After Device B session: check boxes in `device-b-m0-results.md`, then update the status line and M0 manual column in this file.*