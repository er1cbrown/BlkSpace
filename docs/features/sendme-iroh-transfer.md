# Sendme-style P2P file drop (BlkSpace)

**Upstream:** [n0-computer/sendme](https://github.com/n0-computer/sendme) · crates.io `sendme` 0.36  
**Status:** Full build uses **iroh 1.x + iroh-blobs 0.103** (same generation as sendme). In-app `BlobTicket` hole-punch is on `feature = "iroh-net"` (default with Full). Yard still `--no-default-features`. Not a vendored sendme binary.

## What sendme is

Sendme is an **example app / CLI** on **iroh + iroh-blobs**:

| Side | Command | Behavior |
|------|---------|----------|
| Send | `sendme send <path>` | Temp iroh endpoint, import file/dir, print `BlobTicket`, keep serving until Ctrl-C |
| Receive | `sendme receive <ticket>` | Connect (hole-punch / relay), blake3 verified stream, export into cwd |

Tickets are **location-transparent** (256-bit node id). NAT traversal via iroh; TLS between peers.

## Why BlkSpace does not embed the sendme crate

| | sendme 0.36 CLI | BlkSpace Full (`iroh` + `iroh-net`) | Yard |
|--|-----------------|--------------------------------------|------|
| iroh-blobs | **0.103** | **0.103** FsStore + Router | omitted |
| iroh endpoint | **1.0** magicsock | **1.0** `Endpoint` + `BlobsProtocol` | omitted |
| Ticket | `BlobTicket` string | same + `blkspace1.` wrapper (`p2p_ticket`) | `blkspace1.` metadata only |
| Windows | CLI | **gate** — Full link must stay green; revert Yard-only if ordinal/link fails |

We still **do not** `cargo add sendme` (CLI binary). Full uses the same **crates** sendme uses.

## What we ship

### 1. `blkspace1.` content tickets

Portable string:

```text
blkspace1.<url-safe-base64 JSON>
```

**v2 security:** tickets issued by the current app contain a real Nostr-key
Schnorr signature over the content hash, CID, name, MIME type, source, expiry,
and P2P ticket. Legacy bare v1 metadata may still be read, but it is not
sender-authenticated and must not be described as a signed ticket.

Payload (v2):

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

- QR of tickets; auto-paste into DMs  
- Directory collections (sendme `HashSeq` collections)  
- Pin rewards for serving ticket peers (ties to existing pin serve WB)  
- Windows Full link proof after iroh 1.x (Device B)

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
