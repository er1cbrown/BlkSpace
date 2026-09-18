# Yard room watch (Jellyfin / Iroh only)

**Status:** Spec + allowlist scaffold (2026-09-18) — UI not wired  
**Lane:** Yard Live tab extension (`kind: "watch"`)  
**Not this lane:** native RTMP ingest, Netflix-class catalog, ani-cli / HiAnime / Megaplay scrape

This is how a club night plays **video in a chat room** without turning BlkSpace into a pirate CDN.

---

## Promise (honest)

| You can say | You cannot say |
|-------------|----------------|
| Club posts a watch ticket. Peers join. Bytes come from **Jellyfin** (library you host) or **Iroh** (blob you uploaded). | “BlkSpace streams anime.” |
| Chat/presence rides **Route A (Nostr)**. Optional **Route B (Reticulum)** carries join notes when the internet is bad. | Reticulum is the video pipe. |
| **Hostinger** is an always-on VPS that runs Jellyfin (and maybe an Iroh relay). | Hostinger is WeixNet. |
| Syncplay (or Jellyfin SyncPlay) keeps clocks together. | BlkSpace is a licensed streaming service. |

Capability log stays aligned:

- Row **5** (anime club) — reading circles **Done**; licensed catalog still missing; **this spec** covers user-owned / rights-cleared files only.
- Row **11** — native live ingest still **Not in product**.
- Row **12** — Netflix-class licensed media still **Out of scope**.

---

## Three planes (do not collapse)

```
Route A  Nostr     chat, room event, ticket gossip
Route B  RNS       optional join/leave notes (native rnsd, no Python sidecar)
Bytes    Jellyfin  HTTPS HLS/DirectPlay from a library you run
    or   Iroh      blake3 CID / blkspace1. ticket (Full build)
Clock    Syncplay  optional; not required for “same file, press play”
```

**ani-cli stays on the laptop.** Personal `mpv` watch is not a WeixNet source. Do not paste HiAnime, Megaplay, Gogo, 9anime, or raw third-party `m3u8` URLs into a room.

---

## Watch ticket

Portable string (same family as sendme tickets):

```text
blkspace-watch.v1.<url-safe-base64 JSON>
```

Payload:

```json
{
  "v": 1,
  "kind": "jellyfin" | "iroh" | "syncplay",
  "title": "Club night — student short",
  "origin": "https://media.your.hostinger.tld",
  "itemId": "0a1b2c3d4e5f",
  "ticket": "blkspace1....",
  "cid": "<iroh blake3>",
  "mime": "video/mp4",
  "syncplayUrl": "https://syncplay.pl:8999"
}
```

| Field | When |
|-------|------|
| `kind` | required |
| `title` | display only |
| `origin` + `itemId` | `jellyfin` — HTTPS origin on the operator allowlist |
| `ticket` / `cid` + `mime` | `iroh` — `mime` must be `video/*` or `audio/*` |
| `syncplayUrl` | optional clock; never a scrape URL |

Parser: `src/lib/yard-room-watch.ts`. Refuse anything that does not parse.

---

## Allow / refuse

**Allow**

- `https://<allowlisted-jellyfin-origin>/...` (operator list; default empty except `localhost` / `127.0.0.1` for Device B)
- `http://127.0.0.1:*` and `http://localhost:*` on the **same machine only**
- `blkspace1.` tickets whose mime is video/audio
- Syncplay host `syncplay.pl` or a user-set Syncplay origin
- Existing Live **external** hosts (Discord / Zoom / YT / Twitch / Jitsi / `.edu`) stay on `isSafeExternalLiveUrl` — those are **stages**, not watch tickets

**Refuse**

- HiAnime, Megaplay, akirax, gogo, 9anime, aniwatch, animix, consumet, zoro, and any host matching that family
- Bare `.m3u8` / `.mpd` URLs that are not under an allowlisted Jellyfin origin
- `ani-cli`, magnet, IPFS-gateway-of-unknown-origin
- `http:` except loopback
- Iroh tickets with non-media mime (pdf/zip/exe)

On refuse: show the reason, do not open a player.

---

## UX (Yard → Live)

Extend [`YardLiveRooms.tsx`](../../Code-Companion/artifacts/blkspace/src/components/community/YardLiveRooms.tsx) with `kind: "watch"` next to stage / voice / external.

1. Host picks **Watch** → paste a Jellyfin item URL, an Iroh ticket, or a Syncplay URL.
2. Client runs `parseWatchSource`. If ok, store ticket on the room (localStorage v1 is fine; later a Nostr kind).
3. Joiners see title + source kind. **Full** fetches Iroh; **Yard** opens the Jellyfin HTTPS URL in the system browser / `<video>` only if DirectPlay and size is honest.
4. Chat stays the existing room thread. Reticulum may spool “joined watch” notes; it must not fetch segments.

Yard (4–8 GB) **does not transcode**. Transcode is Jellyfin on Hostinger.

---

## Who runs what

| Role | Machine | Job |
|------|---------|-----|
| Student / Yard | 4–8 GB laptop | Join ticket, chat, play DirectPlay or Iroh if Full |
| Club operator | Hostinger VPS | Jellyfin + Caddy TLS + invite users |
| Full node | Lab PC | Pin Iroh CID, optional relay |
| Nobody | — | Scrape sites into the mesh |

Hostinger compose: [`../implementation/jellyfin-hostinger/README.md`](../implementation/jellyfin-hostinger/README.md).

---

## Implementation PRs (do not merge as one)

| PR | Change | Gate |
|----|--------|------|
| **P0** | `yard-room-watch.ts` allowlist + tests (this drop) | `bun run test` |
| **P1** | Live UI: `kind: "watch"` paste → parse → store | Device B: refuse hianime URL; accept localhost Jellyfin |
| **P2** | Nostr event for ticket gossip (kind TBD, no bytes in the event) | Two devices same yard |
| **P3** | Hostinger Jellyfin up + one allowlisted origin in app config | TLS, no open directory listing |
| **P4** | Full: Iroh pin of host-uploaded mp4, ticket in room | Yard still must not transcode |

Reticulum: no new Python, no LXMF, no RNode — [`../implementation/RETICULUM_INTEGRATION.md`](../implementation/RETICULUM_INTEGRATION.md).

---

## Related

- [`bkspc-mainnet-and-live-rooms.md`](bkspc-mainnet-and-live-rooms.md) — Jitsi stages (not VOD)
- [`media-upload.md`](media-upload.md) — 50 MB feed uploads; watch files live in Jellyfin/Iroh
- [`sendme-iroh-transfer.md`](sendme-iroh-transfer.md) — `blkspace1.` tickets
- [`decentralized-media.md`](decentralized-media.md) — Nostr + Iroh, no LBRY
- [`use-case-capability-log.md`](use-case-capability-log.md) — rows 5 / 11 / 12 / 22
