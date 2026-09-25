# Current BlkSpace / WeixNet Topology

**Status:** Current implementation truth sheet. This document separates shipped
paths from architecture targets so release notes and IEEE materials do not
overstate the system.

## One-line description

BlkSpace is currently a **local-first campus social client with signed Nostr
interoperability, an optional Full-build Iroh ticket path, and a hosted
synchronization service**. WeixNet is the target umbrella architecture; it is
not yet a single deployed network or replicated economy.

## Paths that exist

```text
Browser / native client
        │
        ├── local SQLite / browser storage
        ├── hosted sync: bkspc.app → Turso + Cloudflare media targets
        ├── public Nostr relays (signed events and relay-event store)
        └── Full native build: Iroh / iroh-blobs ticket transfer
```

- **Native identity:** Nostr keys in the OS key store, with encrypted-file
  fallback. Recovery restores identity/key material, not another device's local
  database or wallet rows.
- **Hosted synchronization:** `src-tauri/src/portfolio_sync.rs` defaults to
  `https://bkspc.app`; native posts enter a hosted outbox and browser writes use
  hosted acknowledgement. This is a first-class path, not an invisible side
  effect.
- **Nostr:** real signing and relay-event validation exist. Outgoing posts are
  signed once and committed to a durable `nostr_outbox` before any relay is
  contacted; retries republish that exact event id, and the row is cleared only
  after a relay acknowledges it. Incoming events are stored in relay/signed-event
  tables; they are not yet fully materialized into every canonical feed entity.
- **Iroh/Sendme:** Full builds can create `blkspace1.` tickets and use
  Iroh/iroh-blobs. Ticket transfer requires an available sender/provider or
  local store; a CID alone is not durable public storage.
- **Reticulum Route B:** current code is a native-binary probe plus local spool.
  There is no bundled daemon, drain/receive loop, acknowledgement, or live TCP
  transport yet. See [`RETICULUM_PLAN.md`](RETICULUM_PLAN.md).
- **Offline queue:** the explicit `offline_queue` holds deliberately queued
  actions, while the `nostr_outbox` holds signed events for every native post.
  A queued `create_post` records the local row it produced, so a retried flush
  resumes that post instead of inserting a duplicate. Local SQLite, the hosted
  outbox, and relay delivery are tracked separately and reported separately; a
  post with no relay connection is still durable locally.
- **Economy:** WeixBucks are a local/off-chain practice ledger in the current
  build. They are not a replicated settlement or a Nostr-auditable double-spend
  resistant ledger.

## Safe claims

- Hardware-aware local-first campus social prototype.
- Nostr-key identity with signed relay interoperability.
- Optional Full-build Iroh/Sendme-style content tickets.
- Hosted synchronization path with local outbox/retry behavior.
- Non-purchasable practice economy for product testing.

## Claims still requiring evidence or implementation

- Fully decentralized or federated town-relay operation.
- Durable Iroh availability without an available provider.
- Live resilient Reticulum transport.
- Replicated/auditable WeixBucks settlement.
- NIP-44 encrypted direct messages.
- Proven physical three-device offline mesh operation.

## Required release language

Use **“practice economy”**, **“signed Nostr interoperability”**, and **“optional
content transfer”** until the corresponding evidence gates pass. A simulated
route is labeled simulation; a compiled transport is not the same as an
operational network.
