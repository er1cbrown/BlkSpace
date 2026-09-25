# Reticulum (Route B) — bundled native rns/rnsd

**Status:** Policy locked 2026-09-09 · probe + local spool shipped · live TCP mesh still needs a native binary in the Full installer  
**Lane:** Optional WeixNet resilient transport (`Mesh Test` → **RNS · B** / **3 Routes**)  
**Yard:** works with rnsd **absent** (`--no-default-features`)

Upstream protocol: [markqvist/Reticulum](https://github.com/markqvist/Reticulum). BlkSpace does **not** vendor the Python package.

## Locked shape

| Ship | Refuse |
|------|--------|
| Bundled native **`rns` / `rnsd`** next to the Full app (or `BLKSPACE_RNSD`) | Python sidecar (`pip install rns`, `python -m RNS`, `.py` launchers) |
| Local announce / note **spool** under `{app_data}/rns/` | **LXMF** identity store |
| TCP / AutoInterface only (when a native daemon is present) | **RNode** serial / BLE interface |
| Nostr keys stay in `{app_data}/keys/` | Destination hashes persisted **next to** Nostr keys |

Route A (Nostr) and Route B (RNS) do not share an identity directory.

## Why not the Python stack

`pip install rns` puts `rnsd` on PATH as a console script. That is a Python sidecar: extra interpreter, LXMF/Sideband identity files, and easy serial/RNode enablement. Tier 0 Yard cannot depend on that. Full may ship a **native** daemon the same way it ships Iroh in-process — not by spawning `python`.

PATH is **not** searched (that is how pip `rnsd` would sneak in). Discovery order:

1. `BLKSPACE_RNSD` / `BLKSPACE_RNS` (native file only; Python shebang / `.py` refused)
2. Next to the executable
3. `{exe}/rns/` and `{exe}/resources/rns/`

## What the app does today

| Action | Command | Behavior |
|--------|---------|----------|
| Status | `reticulum_status` | Reports bundled `rnsd`/`rns`; `lxmf=false`; `rnode=false`; `pythonSidecar=false` |
| Announce | `reticulum_announce_yard` | Appends `{app_data}/rns/spool.jsonl` — no dest hash |
| Note | `reticulum_send_yard_note` | Same spool. Offline queue until a native daemon is bundled |

Spool records are `{ v, kind, yard, handle, text, at }`. They do **not** include `destination`, `destHash`, or `destination_hash`.

## Not in this lane

- LXMF DMs / NomadNet / Sideband identity
- Radio default profiles (RNode, KISS, BLE)
- Auto-creating `~/.lxmf` or writing hashes into `keys/`
- Requiring rnsd on Yard / 4 GB laptops

## Next (honest)

Ship a native `rnsd` in the **Full** installer (TCP-only config under `{app_data}/rns/`). Device B proof of announce over LAN. Do not add LXMF or RNode to close that loop.

The full path to a live transport — daemon lifecycle, the learned address book
it requires, drain/retry/ACK, and the measured value gate that should decide
whether to build any of it — is written up in
[`RETICULUM_PLAN.md`](RETICULUM_PLAN.md).

## Code

- Rust: `Code-Companion/artifacts/blkspace/src-tauri/src/reticulum_bridge.rs`
- Drop-in binaries: `src-tauri/rns/README.md`
- UI: `src/components/media/ReticulumPanel.tsx`
- Probe: `src/lib/reticulum.ts` · `src/lib/secure-connectivity-routes.ts`

Related: [`../features/secure-connectivity-three-routes.md`](../features/secure-connectivity-three-routes.md)
