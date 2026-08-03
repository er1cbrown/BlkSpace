# Sendme-style P2P file drop (BlkSpace)

**Upstream:** [n0-computer/sendme](https://github.com/n0-computer/sendme) · crates.io `sendme` 0.36  
**Status:** Integrated as product UX + CLI bridge (2026-08). Not a vendored copy of the sendme binary.

## What sendme is

Sendme is an **example app / CLI** on **iroh + iroh-blobs**:

| Side | Command | Behavior |
|------|---------|----------|
| Send | `sendme send <path>` | Temp iroh endpoint, import file/dir, print `BlobTicket`, keep serving until Ctrl-C |
| Receive | `sendme receive <ticket>` | Connect (hole-punch / relay), blake3 verified stream, export into cwd |

Tickets are **location-transparent** (256-bit node id). NAT traversal via iroh; TLS between peers.

## Why BlkSpace does not embed the sendme crate

| | sendme 0.36 | BlkSpace Yard / Full today |
|--|-------------|----------------------------|
| iroh-blobs | **0.103** | optional **0.35** `fs-store` only |
| iroh endpoint | **1.0** full magicsock | store-only `IrohNode` (no provider loop) |
| Default ship | CLI | **Yard** = `--no-default-features` (no iroh) for students / Windows link health |
| Windows | N/A as app dep | Full iroh link can hit “export ordinal too large” |

Pulling `sendme` or upgrading to iroh 1.x would break Yard CI size and Full Windows builds. We implement the **same product pattern** on our stack instead.

## What we ship

### 1. `blkspace1.` content tickets

Portable string:

```text
blkspace1.<url-safe-base64 JSON>
```

Payload (v1):

```json
{
  "v": 1,
  "hash": "<sha256 local content id>",
  "cid": "<optional iroh blake3 when Full/iroh>",
  "name": "syllabus.pdf",
  "mime": "application/pdf",
  "size": 1200,
  "src": "blkspace"
}
```

| Action | Tauri command | Behavior |
|--------|---------------|----------|
| Share | `create_blob_share_ticket` | Encode ticket for an uploaded blob |
| Receive | `receive_blob_share_ticket` | Materialize from **local blob_store** or **Iroh store** into current user library |
| CLI info | `get_sendme_cli_info` | Detect `sendme` on PATH + install hint |
| CLI cmds | `get_sendme_cli_commands` | Exact `sendme send/receive` strings |

### 2. UI

- **Create** page → **Drop tickets** panel  
- **Mesh test** → **Drop** tab  
- Component: `src/components/media/SendmeSharePanel.tsx`

### 3. Optional sendme CLI (true hole-punch P2P)

Operators / Device B:

```bash
cargo install sendme
sendme send ./project.zip
# peer:
sendme receive <ticket>
```

In-app: if user pastes a non-`blkspace1` ticket, receive returns a clear **run this CLI** error (and notes if `sendme` is installed).

## Flow diagram

```
Upload (composer) ──► blob_store + SQLite (+ Iroh CID if feature iroh)
         │
         ▼
  create_blob_share_ticket ──► blkspace1.… string (DM / paste / QR later)
         │
         ▼
  receive_blob_share_ticket
         ├─ local store hit ──► insert library row
         ├─ Iroh store hit ──► export → local + row
         └─ miss ──► hint: mesh sync / keep sender online / sendme CLI
```

## Roadmap (not done)

- Live **iroh provider** in-process (iroh 1.x) behind `feature = "iroh-net"` when Windows link budget allows  
- QR of tickets; auto-paste into DMs  
- Directory collections (sendme `HashSeq` collections)  
- Pin rewards for serving ticket peers (ties to existing pin serve WB)

## Code map

| Path | Role |
|------|------|
| `src-tauri/src/sendme_share.rs` | Ticket codec + CLI detect |
| `src-tauri/src/lib.rs` | Tauri commands |
| `src-tauri/src/iroh_node.rs` | Store-only add/get (receive path) |
| `src/lib/sendme-tickets.ts` | Client helpers |
| `src/lib/tauri-api.ts` | Invoke wrappers |
| `src/components/media/SendmeSharePanel.tsx` | UI |

## Related

- [IROH_INTEGRATION.md](../implementation/IROH_INTEGRATION.md)  
- [media-upload.md](./media-upload.md)  
- [MESH_ARCHITECTURE.md](../implementation/MESH_ARCHITECTURE.md)
