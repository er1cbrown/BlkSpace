# BlkSpace Progress Dashboard

**Project:** BlkSpace on WeixNet  
**Last updated:** 2026-06-16  
**Repo:** `BlkSpoof/` monorepo

---

## Status line

```
Phase 0 ✅ | Phase 1 ✅ | Phase 2 Iroh auto ✅ (12) | Nostr smoke ✅ (6) | Security hardening ✅ | Hub-sync mesh M0 ⏳ | Tier 0 Device B ⏳
```

---

## Automated proof (run from `Code-Companion/artifacts/blkspace`)

| Suite | Command | Last run | Count |
|-------|---------|----------|-------|
| Rust unit | `cargo test --lib -- --skip nostr_relay_smoke` | 2026-06-16 ✅ | 97 |
| Iroh | `cargo test --features iroh iroh_` | 2026-06-16 ✅ | 12 |
| Nostr live | `cargo test nostr_relay_smoke -- --test-threads=1` | 2026-06-16 ✅ | 6 |
| Tier 0 bench | `cargo test tier0_benchmark` | 2026-06-16 ✅ | 1 |

**Total automated:** 116 tests passing (excluding Playwright).

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

### Hub-sync mesh (`docs/implementation/MESH_ARCHITECTURE.md` M0)

| Criterion | Status |
|-----------|--------|
| Account recovery (2+ desktops) | ⏳ manual M0.1 |
| Cross-device sync &lt; 60s (Nostr) | ⏳ manual M0.2 |
| Offline queue → relay flush | ⏳ manual M0.3 |
| Media CID + cache | ⏳ manual M0.4 (`pnpm test:iroh` ✅) |
| Tier 0 hardware smooth | ⏳ manual M0.5 (auto bench ✅ dev Mac) |
| No data loss on sync | ⏳ manual |

**Score: 0/6** (manual gate). BLE/LAN mesh **deferred** per mesh architecture doc.

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
| 2 | Iroh, Nostr mesh, offline queue | ~85% — auto proof done; live P2P + Tier 0 manual open |
| 3 | Communities, full rewards, theming | ~50% — yards, mesh-test UI, partial cross-town |
| 4 | Wallet on-chain, NFT, BlkCoin | Not started |
| 5 | Ops, release | Not started |

**MVP target:** end of Phase 3 per `plan.md`.

---

## In-app verification (manual, ~20 min)

| Check | Where |
|-------|--------|
| NIP-65 publish/fetch | Relays → **Publish my relay list** → **Refresh from relays** |
| Damus visibility | Relays → **Publish visibility test note** |
| Security UI §2.4 | Post detail, feeds, Settings |
| Tier 0 benchmarks | Mesh Test → Performance (Device B for sign-off) |

---

## Open next (priority)

1. **M0 manual matrix** — [`MESH_ARCHITECTURE.md`](implementation/MESH_ARCHITECTURE.md) + [`DEVICE_MESH_TESTING.md`](implementation/DEVICE_MESH_TESTING.md) Phases 1–3, §4.1
2. **Device B** — Tier 0 sign-off (Windows 4GB / i3 ideal)
3. **§2.4 UI click-through** — flip `[x] code` → `[x] manual` in mesh testing doc
4. **M1 code** (after M0) — relay blob metadata, flush polish, Mesh Test UX
5. ~~**NIP-65 on profile**~~ — ✅ `ProfileRelayList` on `/profile/:handle`

---

## Key doc index

| Doc | Use for |
|-----|---------|
| [`plan.md`](../plan.md) | Master phase plan |
| [`docs/security-considerations.md`](security-considerations.md) | Threat model |
| [`docs/implementation/IROH_INTEGRATION.md`](implementation/IROH_INTEGRATION.md) | Iroh criteria |
| [`docs/implementation/REAL_NOSTR_RELAYS.md`](implementation/REAL_NOSTR_RELAYS.md) | Nostr criteria |
| [`docs/implementation/MESH_ARCHITECTURE.md`](implementation/MESH_ARCHITECTURE.md) | Hub-sync mesh plan (Nostr + Iroh + offline) |
| [`docs/implementation/DEVICE_MESH_TESTING.md`](implementation/DEVICE_MESH_TESTING.md) | M0 manual checklist + Tier 0 |

---

*Replace the status line and test counts when you re-run the four commands above.*