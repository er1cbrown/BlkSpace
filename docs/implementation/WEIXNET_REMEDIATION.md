# WeixNet Remediation Priorities

This is the execution order after the architecture audit. The goal is to make
the product and paper claims match the code before adding more transport
features.

## P0 — truthfulness and security

| Issue | Action | Exit criterion |
|-------|--------|----------------|
| Ticket sender authentication | Sign v2 `blkspace1.` payloads with the Nostr key over every security-relevant field | **Implemented; Full cargo check passes; focused test link is slow on this Windows toolchain** |
| DM security claim | Remove NIP-44/“secure DM” claims until encrypted transport exists | **Done in UI/docs; transport remains plaintext** |
| Hosted data disclosure | Show local + hosted + Nostr delivery states separately | **Copy/docs corrected; durable outbox still P1** |
| Economy claim freeze | Describe WeixBucks as a local practice ledger | **Done in current topology and wallet copy** |
| Recovery wording | State that identity recovery does not restore local DB/wallet rows | **Current topology corrected; user guides still need consolidation** |

## P1 — make the core paths real

1. Add a durable, idempotent Nostr outbox for native social events.
2. Materialize validated Nostr events into canonical feed entities with
   event-ID deduplication and durable subscription cursors.
3. Prove hosted, local, and relay states independently on two/three devices.
4. Make Full mode operational: relay set, reconnect/backoff, delivery report,
   and Windows proof.
5. Keep Reticulum optional until native daemon lifecycle, receive/drain, retry,
   and acknowledgement are implemented.

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
