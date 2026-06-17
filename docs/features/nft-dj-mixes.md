# Feature Spec: NFT DJ Mixes on WeixNet

**Source:** `weixinfo/NFT DJ Mix Creation Guidance.md`  
**BlkSpace phase:** 4 (wallet, shop, NFT) — upload rewards in Phase 2  
**Status:** Concept → spec

---

## Vision

Users publish DJ mixes on BlkSpace (hosted on Iroh), earn WeixBucks from engagement, and optionally mint limited editions as NFT tickets (BlkCoin) in Phase 4.

The original weixinfo chat confused "WeixNet" with WeChat/Wax. **WeixNet is the BlkSpace settlement hub** — not an external platform.

---

## User Flow

```
1. Create mix locally (Mixxx, VirtualDJ, etc.)
2. Export MP3/WAV
3. Upload to BlkSpace → Iroh CID + Nostr publish event
4. Earn WeixBucks (views, tips, reposts)
5. [Phase 4] Mint NFT edition → BlkCoin purchase or claim
6. Buyers get access ticket + creator royalty on resales
```

---

## Content Pipeline (from weixinfo)

| Source | Method | Legal note |
|--------|--------|------------|
| Local files | Direct upload | Preferred — owned or licensed |
| YouTube / SoundCloud | yt-dlp (personal tooling) | Respect ToS; user responsibility |
| Spotify / Apple Music | Stream integrations only | No DRM ripping |
| iPhone library | Sync to desktop → upload | Local files OK |

Python DJ conversion scripts from weixinfo are **pre-upload tooling**, not hub features.

---

## WeixNet Events (draft kinds)

| Event | Purpose |
|-------|---------|
| `30078` mix publish | CID, title, BPM, key, tracklist hash |
| `30079` mix tip | WeixBucks transfer to creator |
| `30080` NFT listing | BlkCoin price, edition size, royalty % |
| `30081` NFT claim | Buyer pubkey, mix access grant |

*(Kind numbers are placeholders — assign official range before implementation.)*

---

## Reward Model

| Action | WeixBucks | BlkCoin |
|--------|-----------|---------|
| Publish mix | Base upload reward | — |
| 100+ unique listeners | Engagement bonus | — |
| Top 10 weekly mixes | — | BlkCoin grant |
| NFT primary sale | — | Seller receives BlkCoin |
| NFT resale | — | Creator royalty % |

---

## Phase 4: Solana NFT Tickets

- BlkCoin SPL token on Solana devnet → mainnet when ready
- NFT = access ticket to high-quality mix file (gated Iroh fetch or encrypted key in event)
- Revenue share: platform fee sink + creator majority

**Simulated first:** Phase 2–3 use SQLite + signed Nostr events only. No wallet required for MVP.

---

## MySpace Music Embed Tie-In

DJ mixes double as **profile music embeds** (plan.md MySpace vibe):

- Profile displays current featured mix
- Visitors can tip while listening
- Custom profile theme unlocks with WeixBucks

---

## Open Questions

- [ ] Edition size limits for NFT mixes?
- [ ] DMCA / copyright reporting flow?
- [ ] Offline mix playback via pinned CIDs on user nodes?