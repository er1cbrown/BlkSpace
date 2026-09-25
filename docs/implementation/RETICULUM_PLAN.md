# Reticulum (Route B) — Implementation Plan

**Status:** plan only · no live transport code written
**Companion docs:** [`RETICULUM_INTEGRATION.md`](RETICULUM_INTEGRATION.md) (shipped behavior) · [`WEIXNET_REMEDIATION.md`](WEIXNET_REMEDIATION.md) (P1.5)
**Code today:** `Code-Companion/artifacts/blkspace/src-tauri/src/reticulum_bridge.rs`

This plan covers what would be required to turn Route B from a probe + spool
into a working fallback transport. It deliberately leads with a value gate and
the blocking design problem, because both argue against building it yet.

---

## 1. What exists today

`reticulum_bridge.rs` is ~420 lines and does four real things:

| Capability | Present | Notes |
|---|---|---|
| Native binary discovery | ✅ | `BLKSPACE_RNSD`/`RNS` env, then exe-relative dirs. PATH is never searched. |
| Python sidecar refusal | ✅ | `is_python_sidecar` checks `.py`/`.pyw` names and `#!…python` shebangs. |
| Key-directory guard | ✅ | `rns_path_touches_keys` refuses to spool under or over `{app_data}/keys/`. |
| Local spool | ✅ | `spool_event` appends JSONL to `{app_data}/rns/spool.jsonl`. |
| Unit tests | ✅ | 6 tests covering the policy guards. |

Everything else is absent. Specifically, and this is the important part:

- **The daemon is discovered but never run.** No spawn, no supervise, no health
  check, no shutdown, no restart/backoff. `reticulum_status` only reports that a
  path *exists*.
- **No config is generated.** A working `rnsd` needs an interface config
  (TCP/AutoInterface). Nothing writes one.
- **The spool is write-only.** `spool_event` appends; there is no reader, no
  drain, no delete-after-send, no dedup.
- **No transport exists.** There is no RNS packet send or receive path, so no
  message has ever crossed the wire.
- **No retry or acknowledgement.** No per-record state, no attempt count, no
  backoff, no peer ACK. Contrast with `nostr_outbox`, which now has all four.
- **The spool is unbounded.** Append-only JSONL with no rotation, size cap, or
  retention. Every announce and note appends forever.

Net effect: Route B is a policy-enforcing placeholder. That is an honest and
reasonable place to stop — but it is not a transport, and no user-visible
message should imply otherwise.

---

## 2. The blocking design problem: Route B needs an address book

This is the part that is easy to skip and expensive to discover late.

To send anything over Reticulum you must address a destination. RNS destination
addresses are derived from an **RNS identity's own key material** — they are not
computable from an unrelated existing key such as a Nostr pubkey. So the
mapping `blkspace handle → RNS destination` cannot be derived; it must be
**learned**, by exchanging announce packets between peers that already have a
transport (bootstrap over Nostr, or a manually shared address).

Consequences:

1. Route B cannot bootstrap itself. It needs a seed address from somewhere —
   Nostr, a QR/manual share, or a hardcoded campus address.
2. It needs a **persistent peer store**, e.g. `{app_data}/rns/peers.json` or an
   `rns_peers` table keyed by handle. The current policy already implies the
   correct location: `reticulum_bridge.rs:275` says *"Destination hashes belong
   on the RNS node, never in this spool or keys/"*. The guard
   `rns_path_touches_keys` must keep enforcing that the store never lands in or
   beside `keys/`.
3. It needs **address verification**, or peers can poison each other's address
   book. Minimum bar: an announce must be signed with the BlkSpace Nostr key
   (the same key Route A uses) and cover handle + address + expiry, so a hijack
   is detectable. Without this, Route B is a spoofing surface that Route A is
   not.
4. Addresses need **expiry and re-announce**, or the store rots silently.

> Before implementing, confirm the exact address-derivation rule against
> upstream `markqvist/Reticulum` rather than trusting the summary above. If a
> usable derivation exists, the address book shrinks dramatically and this whole
> section gets cheaper. This is the first thing to verify, not the last.

This is the concrete reason Route B is parked. It is not "a bit more plumbing" —
it is a second identity-adjacency system with its own discovery, trust, and
persistence problems.

---

## 3. Value gate — build only if this is true

Route B is a large, self-contained cost against a narrow benefit. Do not start
until one of these is measured, not assumed:

| Trigger | Why it justifies Route B |
|---|---|
| **Measured relay-unreachable windows** in the three-device matrix (P1.3) exceeding a threshold, e.g. >5% of campus-session time or any dorm/LAN partition where wss is blocked. | This is the only case where a second transport changes user-visible behavior. |
| **A committed no-internet event** (yard meetup, exam-week LAN session) that must still sync. | Concrete, scheduled, and non-speculative. |
| **A relay operator or campus IT** asks for a non-internet path. | External demand justifies external complexity. |

If the measured relay availability in the three-device matrix is good, Route B
should stay parked indefinitely. That is a legitimate and defensible outcome,
and cheaper than the alternative. Record the measurement so the decision is
evidence-based rather than a standing TODO.

---

## 4. Phased plan

Each phase has an exit criterion. Phases 0–2 are prerequisites for any live
transport; do not skip to sending packets.

### Phase 0 — bound the spool (small, worth doing regardless)
Current `spool.jsonl` grows without limit even with no daemon present.

- Add a size cap / rotation, and drop records older than a TTL.
- Add dedup on `(kind, yard, handle, text)` so repeated announces collapse.
- Surface `spooled` / `drained` / `bytes` counts in `ReticulumPanel.tsx`.

**Exit:** spool is bounded; UI shows real queue state.
**Why first:** it is a small correctness win that does not depend on any decision
in §2, and it stops a slow leak in the current build.

### Phase 1 — daemon lifecycle
- Generate a TCP-only `rnsd` config under `{app_data}/rns/` (no RNode, no
  AutoInterface surprises, no LXMF).
- Spawn, health-check, restart with backoff, and shut down cleanly on exit.
- Keep the existing Python-sidecar refusal and PATH exclusion on the spawn path.
- Gate everything behind Full; Yard must remain fully usable with `rnsd` absent.

**Exit:** `reticulum_status` reports a *running* daemon (not merely a present
binary), with uptime and restart count, and survives kill/restart.

### Phase 2 — address book + signed announce
- `rns_peers` store in `{app_data}/rns/`, never in or beside `keys/`.
- Announce packet: `(handle, address, expiry)` signed with the BlkSpace Nostr
  key, reusing the same verification path as `verify_nostr_auth_event`.
- Reject announces for handles whose signature does not match, and surface
  rejected/hijack-attempt counts.
- Seed the first address via an explicit, user-visible share (QR or copy) — do
  not silently scrape addresses from the public relay feed.

**Exit:** two devices learn and verify each other's addresses; a forged
announce is rejected and counted.

### Phase 3 — drain with retry and ACK
Mirror the `nostr_outbox` design, which is the template to copy:
- `rns_outbox` record: `(id, kind, payload, state, attempt_count,
  next_attempt_at, last_error)` with idempotency keyed on a content hash.
- Drain loop: send due records, delete on peer ACK, back off 60s on failure.
- **Bound attempts.** `nostr_outbox` currently retries forever; do not repeat
  that mistake here — add a ceiling and a terminal `failed` state.
- Distinguish a **negative acknowledgement** (peer rejected / unknown address)
  from a **transport failure** (unreachable). Only the latter should retry
  indefinitely.

**Exit:** spool drains to empty on a live pair; a peer that is offline leaves
records queued and resumes without duplication.

### Phase 4 — proof and honest reporting
- Device B proof: two devices, relay deliberately unreachable, Route B delivers.
- Update `CURRENT_TOPOLOGY.md` and `RETICULUM_INTEGRATION.md` to state exactly
  what is and is not live. Until this lands, keep describing Route B as a
  probe/spool.

---

## 5. Guardrails that must not regress

These are enforced by existing code and tests; any change must keep them green:

- No Python sidecar, no `pip install rns`, no `.py` launchers.
- PATH is never searched for `rnsd`/`rns`.
- No LXMF identity store, no NomadNet, no Sideband identity.
- No RNode serial / BLE / KISS interfaces.
- No destination hashes in `keys/`, in the spool, or beside Nostr keys.
- Yard (`--no-default-features`) stays fully usable with `rnsd` absent.
- Route A and Route B keep separate identity directories.

`reticulum_bridge.rs`'s six unit tests are the guard here. Extend them with each
phase rather than replacing them.

---

## 6. Explicitly out of scope

Do not add these to close the loop, even though they are the obvious
"next feature": LXMF DMs, radio default profiles, AutoInterface-by-default,
`~/.lxmf` creation, or writing hashes into `keys/`. Each was excluded
deliberately; re-adding one to make a demo work is a regression.

---

## 7. Honest summary

Route B today is a policy-enforced placeholder with no transport, no drain, and
no retry. The work is not mechanical: it needs a learned address book (§2), a
trust model for it, and a measurable reason to exist (§3).

Recommendation: do **Phase 0** (bounded spool + UI counts) because it is cheap
and correct. Then run the three-device matrix to get the relay-availability
measurement that §3 requires, and let that number decide whether Phases 1–4 are
ever worth building.
