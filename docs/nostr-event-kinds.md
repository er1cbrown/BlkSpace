# Nostr Event Kind Registry (Draft)

**Status:** Phase 0 — Placeholder numbers; finalize before Phase 1  
**Last Updated:** 2026-06-15

---

## Standard Kinds (NIP-01)

| Kind | Name | BlkSpace use |
|------|------|--------------|
| 0 | Metadata | Profile + portfolio |
| 1 | Text note | Posts, feed |
| 3 | Contacts | Follow graph |
| 4 | Encrypted DM | **Low-trust only** — see `security-considerations.md` |
| 5 | Deletion | Moderation |
| 6 | Repost | Boost post to followers (`repost_post` — `e` + `p` tags) |
| 7 | Reaction | Likes, tips signal |

---

## BlkSpace Custom Kinds (30000+ range, draft)

| Kind | Name | Payload |
|------|------|---------|
| 30078 | Mix publish | CID, title, BPM, key, tracklist hash |
| 30079 | Tip | Target pubkey, WB amount |
| 30080 | Reward grant | WB/BC amount, reason, formula version |
| 30081 | NFT listing | Price, edition, royalty % |
| 30082 | Node heartbeat | Uptime, role, town tag |
| 30083 | Pin report | CID, serve count |
| 30100 | Scripture mix | LogosDecks set metadata |
| 1030 | Town trending | Aggregated cross-town summary (relay-published) |

**Required tags on all BlkSpace events:**

```
["t", "hbcu-town:tsu"]
["t", "blkspace"]
```

---

## Validation Rules (all custom kinds)

1. Valid secp256k1 signature
2. Required town tag present
3. Pubkey matches claimed author
4. Size under relay limit (e.g. 64 KB)
5. Engagement Quality check before reward kinds accepted

---

## Migration Notes

- Kind numbers are **draft** — register in Nostr convention doc before public launch
- Simulated economy uses same kinds whether or not on-chain
- Phase 4: Anchor program reads signed reward events for BlkCoin claims