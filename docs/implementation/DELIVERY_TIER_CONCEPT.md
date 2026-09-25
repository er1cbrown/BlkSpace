# Delivery Tiers — a degraded-mode concept for WeixNet

**Status:** concept, not implemented · supersedes the addressing assumption in [`RETICULUM_PLAN.md`](RETICULUM_PLAN.md)
**Related:** [`CURRENT_TOPOLOGY.md`](CURRENT_TOPOLOGY.md) · [`WEIXNET_REMEDIATION.md`](WEIXNET_REMEDIATION.md) · [`RETICULUM_INTEGRATION.md`](RETICULUM_INTEGRATION.md)

## The concept in one paragraph

BlkSpace should stop presenting three transports as three peers and instead
define a **delivery tier contract**: an explicit, user-visible statement of
which delivery regime the device is currently in, with each transport owning
exactly one regime and no two transports competing for the same job. Nostr owns
*online social*. Iroh owns *content and local transfer*. Reticulum owns
*degraded text delivery when there is neither uplink nor LAN* — the low
bandwidth, high latency, delay-tolerant regime that the other two cannot reach.
The contribution is not "we have three transports"; it is **"we have an honest
degradation contract, and the user is never told a message was delivered when it
was not."**

## Why this framing earns Reticulum its place

The honest problem with Reticulum-as-third-transport is that it mostly
duplicates Iroh. Iroh already does LAN, local discovery, and offline content
transfer. So a design that gives Reticulum "offline" is giving it a job Iroh
already has.

Reticulum's actual unique territory is narrow and real:

- **Low bandwidth** (tens of kbps, expensive mobile data)
- **High latency** (seconds to minutes) with **delay tolerance** built in
- **Meshtailing** — peers forward packets for each other, so range extends past
  direct contact with no central infrastructure
- **Operation with zero server dependency** anywhere on the path

If the campus scenario is "dorm WiFi blipped," Reticulum is overkill and Iroh
wins. If the scenario is "student on a constrained link, or a mesh/campus
network segment with no uplink, where text matters and photos do not," then
Reticulum is the only one of the three that works and the other two genuinely
fail. **That is the concept's entire justification, and it must be stated that
narrowly or not at all.**

## The tier contract

| Tier | Regime | Transport | Carries | Guarantee |
|---|---|---|---|---|
| **T1 — Online** | Uplink available | Nostr relays | Social graph, posts, replies, notifications, profile | Best-effort, globally reachable |
| **T2 — Local** | No uplink, LAN reachable | Iroh / Sendme | Blobs, media, tickets, account sync | Connection-scoped |
| **T3 — Mesh** | No uplink, no LAN, constrained link | Reticulum | **Text only** — post, reply, yard announce, notification | Best-effort, delay-tolerant, no delivery receipt |

Rules that make this a contract rather than a menu:

1. **No overlap.** Each transport owns one regime. Reticulum never carries
   media; Iroh never carries the degraded social path; Nostr never pretends to
   work offline.
2. **The app always knows its tier** and shows it. T3 is a first-class visible
   state, not a silent fallback.
3. **Delivery is never overstated.** This is the same discipline already applied
   to DMs, the economy, and offline sync. A T3 send is reported as *queued*,
   never as *sent*, because Reticulum gives no end-to-end delivery receipt.
4. **Tiers compose, they don't fail over silently.** Dropping T1 → T3 changes
   what is expressible (text only), not just how it is carried.

## The design that makes T3 cheap

This is the important part, and it is why this concept is tractable where
[`RETICULUM_PLAN.md`](RETICULUM_PLAN.md) §2 (learned address book) looked large.
T3 is designed to reuse primitives that already exist, so it adds almost no new
identity, trust, or dedup machinery.

**One identity.** T3 messages are signed with the user's existing Nostr key and
verified by the existing `verify_nostr_auth_event` path. Reticulum is a
**courier, not an identity system.** This satisfies the standing policy — no
LXMF identity store, no second key store — and it means a message arriving over
RNS is verified by exactly the same code that verifies a relay message. There is
no new trust model to get wrong.

**No address book.** T3 uses Reticulum's propagation/announce model rather than
direct addressed delivery. Peers in a segment receive yard traffic without
anyone persisting a `handle → destination` map. This is strictly *more*
compliant with `AGENTS.md` rule 8 than the address-book design, which had to
store destination hashes somewhere. It also removes the single largest cost
identified in the earlier plan.

**Dedup already solved.** Propagation and delay-tolerant delivery inherently
duplicate messages. `nostr_outbox` already keys on `event_id` with
`local_post_id` uniqueness and a stable signed event id. A T3 message is the
same signed event, so **duplicate suppression is free** — the property that was
expensive to build for T1 is inherited by T3.

**Replay is safe.** Because the envelope is a signed, self-contained event with a
stable id, receiving the same message twice, or receiving it after a gap, is a
no-op. That is what makes delay-tolerant delivery acceptable here.

Net new surface for T3: daemon lifecycle, a config, a T3 outbox with bounded
retry, and a tier detector. **No new identity system, no address book, no new
trust model, no new dedup logic.**

## What T3 explicitly does not do

- No LXMF, NomadNet, or Sideband identity. (Policy — and unnecessary given one identity above.)
- No RNode serial / BLE / KISS. TCP and AutoInterface only.
- No media, no blobs, no file transfer. That is Iroh's job, permanently.
- No end-to-end delivery receipt or read receipt. Messages are *queued* or
  *unknown*, never *delivered*.
- No Python sidecar, no `pip install rns`, PATH never searched. Native `rnsd` only.
- No destination hashes in or beside `keys/`.
- No silent T1 → T3 substitution. Losing the internet visibly changes what the
  app can do.

## Honest limitations

State these in any paper or demo; they are real.

- **Range is physical.** T3 needs a link. Without meshtailing hardware it is
  campus-segment range, not city range. Meshtailing is a hardware cost this
  project has explicitly excluded.
- **No internet, ever.** T3 is not a faster path and not a backup for T1
  congestion. It only helps where T1 and T2 both fail.
- **Text-only is a real product downgrade.** The app must visibly shed
  capability, and a media-heavy post cannot be degraded into T3.
- **Unproven at scale.** Propagation behavior, duplicate rates, and battery/
  CPU cost on phones are all unmeasured for this workload.

## Dependency scope check (2026-09-25)

The open question this section used to carry — whether announce/propagate is
usable *without* adopting LXMF identity storage — is **resolved: yes.** A native
Rust implementation exists and contains the entire T3 slice, with more to spare.
It is **not** upstream `markqvist/Reticulum`, which is Python-only; the Rust port
is a separate project.

**Do not use the `reticulum-rs` umbrella crate.** Its `default` feature set
requires `rns-transport`, which is not published (404 on both crates.io and
docs.rs). It is a stale 10-line re-export whose repository metadata points at a
different organisation than the one actually maintaining the code. Depend on the
real crates directly.

| T3 need | Available | Where |
|---|---|---|
| Announce / propagate | yes | `rns-core::announce` |
| Packet send / receive | yes | `rns-core::packet`, `msgpack` (HMU packets) |
| Transport, destinations, links | yes | `rns-core::{transport, destination, link}` |
| Resource advertisements | yes | `rns-core::resource` |
| Delivery receipts | yes | `rns-core::receipt` — more than this concept assumed |
| Proof-of-work anti-spam | yes | `rns-core::stamp` |
| Announce dedup | yes | built-in `announce_dedup` hook example |
| Node daemon | yes | `rns-server` — described as the only binary needed to ship |
| Interfaces | yes | `rns-net`: TCP, UDP, Local, Auto, I2P, Backbone, and others |

LXMF is **not** part of `rns-core`, so the "courier, not identity system"
property holds without adopting any LXMF identity store. `rns-core` is
`no_std`-compatible and declares only three direct runtime dependencies —
`libm`, `log`, and `rns-crypto`.

**But read the lockfile before calling that "tiny".** `rns-crypto 0.1.10` pulls a
*parallel* crypto stack at different major versions from what the app already
uses: a second `aes` (0.9.3 vs 0.8.4), `cipher` (0.5.2 vs 0.4.4), `cbc` (0.2.1 vs
0.1.2), `sha2` (0.11.0 vs 0.10.7), `hmac` (0.13.0), `inout` (0.2.2 vs 0.1.4),
and `block-padding` (0.4.2 vs 0.3.3), plus `cpubits`, `hybrid-array`,
`ed25519-dalek 3`, `x25519-dalek 3`, and `curve25519-dalek 5`. So the direct tree
is three crates and the transitive addition is roughly nine more, including
duplicate implementations of primitives the app already has. Still far smaller
than the Iroh dependency, but it is not the clean three-crate story the direct
list suggests, and it should be reviewed as added crypto surface before the
feature is enabled in any build that handles real keys.

Interoperability is validated rather than assumed: Python-generated conformance
vectors pinned to Reticulum 1.4.0, live Python/Rust interop tests, and 20 Docker
multi-node E2E suites covering chain, mesh, and star topologies.

### Blockers before any adoption

1. **License — the real gate.** The maintained project (`lelloman/rns-rs`) ships
   a custom **"Reticulum License"**, not a standard SPDX license; crates.io
   reports `non-standard`. It is an MIT-style permission grant with **two added
   use restrictions**: the software may not be used in a system whose functions
   include the ability to purposefully do harm to human beings, and it may not be
   used, directly or indirectly, to create an AI/ML/LLM training dataset or to
   contribute to the training or development of such a model or algorithm. Use
   restrictions make this **not OSI-approved** — it is source-available.
   Vendoring it needs explicit legal sign-off, and it constrains relicensing and
   institutional or corporate use.
2. **The AI/ML clause reaches tooling, not just distribution.** It should be read
   by whoever owns that decision rather than assumed, particularly before any
   vendored copy is used in an AI-assisted workflow.
3. **Windows is unconfirmed.** `rns-crypto` and `rns-core` are portable and
   `no_std`, and the project references `LoadLibrary`, so Windows is evidently
   contemplated. But published CI evidence and docs.rs builds are Linux, and
   Device B is Windows, so this needs a real build before Phase 3 is credible.
4. **Small project, single primary maintainer.** 34 stars, 6 forks, ~110
   downloads of `rns-core` 0.1.17. Pre-1.0, so APIs will break. Acceptable for a
   campus prototype with a pinned, vendored dependency; thin assurance for
   anything holding real user keys.
5. **Ecosystem churn.** At least three repositories are in circulation
   (`lelloman/rns-rs`, `BeechatNetworkSystemsLtd/reticulum-rs`,
   `FreeTAKTeam/LXMF-rs`) with differing licenses and scopes. Pin exactly and
   re-verify provenance on every bump.

### Phase status

| Phase | Status | Notes |
|---|---|---|
| 0 — Bound the spool | not started | Spool still grows without limit. Independent of licensing. |
| 1 — Tier detector + honest UI | **implemented** | `src-tauri/src/delivery_tier.rs`, `get_delivery_tier`, `useTauriGetDeliveryTier`, `TauriDeliveryTier*`. 10 unit tests. |
| 2 — Daemon lifecycle | blocked | Gated on licensing, and needs a Windows build proof. |
| 3 — T3 courier | not started | `rns-t3` links `rns-core` and reports capability surface, but sends nothing. |

### What Phase 1 does, and deliberately does not do

`delivery_tier.rs` is a pure classifier over observed inputs, so the precedence
rules are exhaustively testable without touching a socket:

| Condition | Tier |
|---|---|
| any relay connected | `online` |
| no relay, local transport initialized | `local` |
| no relay, no LAN, courier available **and** a peer observed | `mesh` |
| otherwise | `offline` |

Three honesty properties are enforced by tests rather than by convention:

1. **The mesh tier cannot be claimed from a linked library alone.** `mesh` needs
   both a compiled transport *and* an observed peer, so a dark or idle mesh
   reports `offline` rather than implying T3 works.
2. **Capability shed is visible.** `can_carry_media` and `can_publish_social` are
   reported, so a media post is never silently truncated into a text-only tier.
3. **"Not in this build" stays distinguishable from "available but idle"** via
   `meshAvailable`, instead of both collapsing into `offline`.

`lanAvailable` means *a local Iroh transport is initialized* — this device's own
transport exists. It deliberately does not claim a peer answered.

`rns_t3.rs` sits behind the optional `rns-t3` feature (not in `default`), reports
the `rns-core` capability surface, and always reports `courierAvailable: false`.
It spawns nothing and sends nothing. One test asserts that linking the crate
still cannot upgrade the reported tier, so the module cannot drift into implying
a working transport.

The dependency is pinned exactly (`=0.1.17`), optional, and feature-gated, so it
never reaches a Yard build and deleting the feature deletes the dependency.

### Revised recommendation

Phase 1 is done and needs no licence. Phase 2+ stays blocked on item 1. Treat the
capability result as good news and the licence result as the gate.

## Phases

Each phase has an exit criterion and is independently shippable. Phases 0–1 are
useful even if the concept is later abandoned.

**Phase 0 — Bound the spool (do regardless)**
`spool.jsonl` grows without limit today. Add a size cap, TTL, and dedup on
`(kind, yard, handle, text)`. Surface `spooled` / `drained` counts in
`ReticulumPanel.tsx`.
*Exit:* spool is bounded and the UI shows real queue state.

**Phase 1 — Tier detector + honest UI (no transport)**
Detect the current regime — uplink, LAN reachability, link quality — and show the
active tier in the app. No Reticulum traffic at all.
*Exit:* the app truthfully reports its tier, and T1/T2 labels are already correct.
*Why first:* this is the part users actually feel, and it makes the delivery
contract real even if T3 never ships. It also generates the measurements Phase 4 needs.

**Phase 2 — Daemon lifecycle**
Generate a TCP-only `rnsd` config under `{app_data}/rns/`. Spawn, health-check,
restart with backoff, clean shutdown. Keep the Python-sidecar refusal and PATH
exclusion on the spawn path. Full-build only; Yard stays usable without `rnsd`.
*Exit:* status reports a *running* daemon with uptime and restart count, surviving kill/restart.

**Phase 3 — T3 courier**
Text-only envelope signed with the Nostr key, sent over propagation. Land into
the existing `nostr_outbox` on the receiving side so dedup and T1 replay are
inherited. Bounded retry with a terminal `failed` state. Distinguish a negative
acknowledgement from a transport failure.
*Exit:* two devices exchange a signed post with uplinks down, the receiver shows
it once, and it promotes to T1 when the uplink returns.

**Phase 4 — Prove it, then decide**
Three-device matrix measuring: fraction of session time per tier, T3 delivery
success rate, duplicate rate, battery/CPU cost, and post size at which T3 stops
being viable.
*Exit:* a measured answer to "did the degraded regime matter, and did text-only
cost users anything?" — which decides whether T3 stays or is documented as a
rejected experiment.

## The measurement that justifies any of this

Do not build Phase 2+ until Phase 1 has produced a number. Concretely: what
fraction of campus-session time has **no uplink and no LAN**, and what is the
bandwidth in that window?

- If that fraction is near zero, T3 is a paper concept. Document it, ship Phase 0
  and 1, and stop. That is a legitimate and defensible outcome.
- If it is material — for example a campus mesh segment, a field course, or
  students on metered data — T3 is justified by data rather than ambition.

## The strongest thing to say about this concept

Not "BlkSpace runs on three transports." Say instead:

> BlkSpace defines an explicit delivery tier contract. Each transport is scoped
> to the regime it is actually good at, the app always reports which regime it
> is in, and delivery is never overstated — a message on the mesh tier is
> reported as queued, never as sent.

That is a claim the code can back, it survives adversarial review, and it makes
Reticulum a deliberate, bounded design choice instead of a third icon in a
diagram. If the Phase 4 numbers say the degraded regime is rare, saying so is a
*stronger* contribution than quietly pretending otherwise.
