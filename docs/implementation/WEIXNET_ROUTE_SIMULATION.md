# WeixNet Route Simulation

**Purpose:** DevOps and IEEE evaluation harness for the three transport planes.

This harness is a deterministic policy simulation. It does **not** run a live
Nostr relay, Reticulum daemon, Iroh node, or Sendme endpoint. It is intended to
verify route selection, queueing, recovery, and duplicate-free delivery before
running the same scenarios on physical devices.

## Planes

| ID | Transport | Role |
|----|-----------|------|
| A | Nostr | Primary signed social-event path |
| B | Reticulum | Optional lightweight fallback path |
| S | Iroh/Sendme | Content/file ticket path |

Reticulum is simulated as a separate fallback state. The production policy
still requires bundled native `rns/rnsd`; do not substitute a Python sidecar.

## Run

From `Code-Companion/artifacts/blkspace`:

```bash
bun run simulate:routes
bun run simulate:routes healthy
bun run simulate:routes nostr-fallback
bun run simulate:routes offline-recovery
bun run simulate:routes sendme-outage
```

The command emits JSON with route choices, simulated latency, pending queues,
and duplicate counts.

## Scenarios

- **healthy:** A and S deliver immediately.
- **nostr-fallback:** B carries social events while S carries the file.
- **offline-recovery:** both social paths and S queue work; recovery flushes it.
- **sendme-outage:** social remains live while the file ticket waits for S.

## Next physical validation

1. Run the same scenario labels on three devices.
2. Record actual relay and Iroh timestamps; do not report synthetic latency as
   a network benchmark.
3. Measure queue depth, duplicate IDs, integrity failures, CPU/RAM, and recovery
   time.
4. Keep Route A/B signing and identity boundaries separate from the simulator.
