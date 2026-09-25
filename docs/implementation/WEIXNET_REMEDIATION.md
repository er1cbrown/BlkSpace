# WeixNet Remediation Priorities

This is the execution order after the architecture audit. The goal is to make
the product and paper claims match the code before adding more transport
features.

## P0 — truthfulness and security

| Issue | Action | Exit criterion |
|-------|--------|----------------|
| Ticket sender authentication | Sign v2 `blkspace1.` payloads with the Nostr key over every security-relevant field | **Implemented; Full cargo check passes; focused test link is slow on this Windows toolchain** |
| DM security claim | Remove NIP-44/“secure DM” claims until encrypted transport exists | **Done in UI/docs; transport remains plaintext** |
| Hosted data disclosure | Show local + hosted + Nostr delivery states separately | **Done: `nostr_outbox` reports pending/published/retrying separately from the offline queue** |
| Economy claim freeze | Describe WeixBucks as a local practice ledger | **Done in current topology and wallet copy** |
| Recovery wording | State that identity recovery does not restore local DB/wallet rows | **Current topology corrected; user guides still need consolidation** |

## P1 — make the core paths real

1. ~~Add a durable, idempotent Nostr outbox for native social events.~~
   **Done.** `nostr_outbox` is written at sign time, keyed on event id and post
   id, retried with a 60s backoff, and cleared on relay acknowledgement. What is
   *not* done: relay-level negative acknowledgement is not yet distinguished from
   a transport failure.
2. Materialize validated Nostr events into canonical feed entities with
   event-ID deduplication and durable subscription cursors.
3. Prove hosted, local, and relay states independently on two/three devices.
4. Make Full mode operational: relay set, reconnect/backoff, delivery report,
   and Windows proof.
5. Keep Reticulum optional until native daemon lifecycle, receive/drain, retry,
   and acknowledgement are implemented.
   **Plan written, not started:** [`RETICULUM_PLAN.md`](RETICULUM_PLAN.md). Two
   findings from that review: Route B needs a *learned* address book (RNS
   addresses are not derivable from a Nostr pubkey), so it is a second
   identity-adjacency system, not just plumbing; and the build should be gated
   on a measured relay-unavailability number from the three-device matrix rather
   than started as a standing TODO.
   **Preferred direction:** [`DELIVERY_TIER_CONCEPT.md`](DELIVERY_TIER_CONCEPT.md)
   scopes Route B to a text-only degraded tier over Reticulum propagation, which
   removes the address book and reuses the existing Nostr identity and event-id
   dedup. The gate stands: Phase 1 (tier detector + honest UI) should produce the
   measurement before any daemon work begins.

## P2 — evidence and research

- Run the deterministic A/B/S simulation before physical tests.
- Run the physical three-device matrix with real timestamps and integrity data.
- Measure sync latency, queue recovery, duplicate IDs, CPU/RAM, and user task
  completion.
- Use the current topology truth sheet in IEEE submissions; do not present
  simulation as deployment.

## Current safe product statement

> BlkSpace is a local-first campus social prototype with Nostr-key identity,
> signed relay interoperability, hosted synchronization, an optional Full-build
> Iroh ticket path, and a non-purchasable practice economy.
