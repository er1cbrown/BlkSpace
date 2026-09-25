# FINISH LINE

A note to whoever is reading this at 2am wondering whether any of this matters.

## What is actually built

Not aspirations. Shipped, typechecked, on `main`:

| | |
|---|---|
| **Identity** | Nostr keys in the OS key store, real signed events, v2 ticket signing |
| **Social** | Posts, replies, likes, follows, reposts — 53.6k lines of TS/TSX |
| **Backend** | 26k lines of Rust: SQLite schema + migrations, relay manager, blob store, escrow, market |
| **Durability** | A real outbox. Sign once, stable event ID, retry *the same event*, never a duplicate |
| **Content plane** | Full builds do Iroh/Sendme `blkspace1.` tickets |
| **Hosted sync** | Outbox, ack, social outbox — works with or without the service |
| **Catalog** | 103 HBCUs seeded, multi-device sync, device mesh test harness |
| **UI** | Landing, feed, profile, wallet, market, yard rooms, community, search |
| **Tests** | 28 files / 165 frontend tests, green |
| **Repo** | 16.97 MB → 8.64 MB this month. `dist` 6.68 → 2.76 MB. Landing images 4.46 MB → 433 KB |

That is a working application with a real durability story. Most prototypes die
at "it renders." This one has an outbox with correct idempotency, which is the
thing most social apps get wrong.

## The three things between here and done

Nothing below is a feature. That is the point.

### 1. Materialize incoming Nostr events into real feed entities

Right now inbound events are signature-validated and stored, but
`list_combined_feed` reads a separate `relay_events` table instead of the
canonical `posts` table. Two parallel data paths, never unified.

**Until this closes, the app cannot show you what the mesh says to you** — which
is the entire premise. Everything else is infrastructure for a feature you cannot
yet use. This is the last big structural gap.

Needs: event-ID deduplication and durable subscription cursors so a reconnect
catches up instead of duplicating.

### 2. Make the tests actually run

27 Rust tests written, compile-verified, **never executed**. The blocker is
environmental, not the code: the test binary links fine (23m 53s clean) but
Windows won't launch it, because the WinLibs linker on this machine references
`libgcc_s_dw2-1.dll` and that DLL does not exist here. CI on `ubuntu-latest` runs
them and is unaffected.

**See them pass once.** You have written a lot of code believing it is correct.
Run it.

### 3. Three devices, one campus, real timestamps

`docs/implementation/DEVICE_MESH_TESTING.md` is written. It has not been run.

Simulation is not deployment. A paper that says "deployed on three devices" needs
three devices and a table of real numbers: relay availability, sync latency, CPU,
RAM, duplicate-ID count. Record them in `docs/device-b-m0-results.md`.

## Why this is worth finishing

Three reasons, honestly.

**The architecture is right.** Most projects bolt everything onto one transport
and call it resilient. This one splits it correctly: Nostr for identity and
social, Iroh for content, Reticulum for degraded. Each does something the others
cannot. That instinct is the hard part and you already have it.

**The honesty is a genuine asset.** `CURRENT_TOPOLOGY.md` and
`WEIXNET_REMEDIATION.md` say out loud what does not work — that Reticulum moves
zero bytes, that WeixBucks are a practice ledger, that DMs are plaintext. Most
projects never write those files. They are the reason a reviewer can believe the
rest, and they are why a future you can pick this up without being misled.

**You argued well.** When the scope check said Reticulum wasn't viable, the pushback
was correct — the dependency exists, it compiles on Windows, and it has the whole
slice needed. Being right about your own architecture is not luck. Do not lose
that instinct because a tool is slow or a test will not launch.

## Definition of done

You are finished when:

- [ ] A post from another device appears in your feed, authored by them, signed,
      deduplicated, and it survives both devices going offline and coming back
- [ ] `cargo test --lib` is green
- [ ] Three devices, one campus, results written down with real timestamps
- [ ] The tier detector reports a real tier from real conditions
- [ ] `CURRENT_TOPOLOGY.md` still tells the truth

## And then stop

The failure mode for a project like this is not abandonment. It is a sixth month
of "one more transport." The concept doc already says it: if the degraded-regime
numbers come back near zero, document it as a rejected experiment and move on.
**Documenting a negative result is a contribution, not a failure.**

Ship a post. Get a stranger's post on your screen. That is the whole thing.
