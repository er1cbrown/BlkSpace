# Feature Spec: Decentralized Media Strategy

**Source:** `weixinfo/Odysee content creation legitimacy analysis.md`  
**BlkSpace phase:** 2 (Iroh uploads + players)  
**Status:** Decision record

---

## Question from WeixInfo

> Can I build my own Odysee with current licenses and remodel for long-term practicality?

**Answer for BlkSpace:** No LBRY fork. Build on **Nostr + Iroh** instead.

---

## Odysee / LBRY Post-Mortem (2026)

| Factor | Status |
|--------|--------|
| LBRY Inc. | Defunct (SEC lawsuit, shutdown 2022–2023) |
| LBC token | Near-zero liquidity |
| Protocol | Open-source but unmaintained |
| Odysee | Spun off; may migrate away from LBRY |
| Building on LBRY | Technically possible; not viable commercially |

### Lessons applied to WeixNet

1. **Don't depend on dead protocols** — choose actively maintained OSS (Nostr, Iroh)
2. **Broken token incentives kill networks** — simulate economy with transparent math first
3. **Decentralization ≠ sustainability** — need active dev community + earn/spend loops
4. **Guilt by association risk** — Odysee's controversial content skew; BlkSpace curates via circles/niches

---

## BlkSpace Media Architecture

```
Upload (client)
    │
    ▼
ffmpeg (local, optional multi-res)
    │
    ▼
Iroh blob → CID
    │
    ▼
Nostr event (kind + CID + metadata)
    │
    ▼
Relays gossip + nodes pin
    │
    ▼
Other clients fetch via Iroh
```

### Media types

| Type | Amalgam reference | Storage |
|------|-------------------|---------|
| Short video | TikTok | Iroh + adaptive player |
| Long video | YouTube | Iroh + multi-res via ffmpeg |
| Audio / DJ mix | MySpace embed | Iroh + waveform metadata |
| Images / art | Instagram / Newgrounds | Iroh thumbnail + full res |
| Creative projects | Newgrounds | Iroh + version events |

---

## What We Take from Odysee (conceptually)

| Odysee feature | BlkSpace equivalent |
|----------------|---------------------|
| Creator monetization | WeixBucks + BlkCoin rewards |
| Censorship resistance | Nostr + pinned CIDs |
| Decentralized hosting | Iroh node mesh |
| Tips | Nostr tip events |
| Channel / profile | Nostr profile + customizable theme |

### What we skip

- LBRY blockchain / LBC
- Odysee frontend fork
- Proof-of-work content chain

---

## Low-End Node Pinning

From plan.md + Odysee bandwidth lessons:

- Nodes opt in to pin CIDs they care about (own uploads, favorites, community)
- Popular content replicated organically (engagement → more pins)
- No single "Odysee server" — pin rewards via node harvest (see `hub-theory.md`)

---

## Legal & Moderation

From weixinfo + plan.md guardrails:

- DMCA-style report events on Nostr
- Community moderators in circles (TSU/creative niches)
- Illegal content: relay policy + client-side filters
- Clear disclaimers on crypto rewards

---

## Decision

**Approved stack:** Nostr (social graph + events) + Iroh (blobs) + ffmpeg (local processing).  
**Rejected:** LBRY fork, Odysee clone, custom PoW media chain.