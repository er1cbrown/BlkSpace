# Reward Formulas (Draft)

**Status:** Phase 0 — Qualitative draft; numeric caps need user review  
**Last Updated:** 2026-06-15  
**Gate:** Must be finalized before Phase 1 economy code

---

## Principles

1. Tier 0 nodes must earn meaningfully
2. Transparent math published in client
3. Engagement Quality reduces Sybil/forgery impact
4. All rewards = signed Nostr events + SQLite cache

---

## WeixBucks — Base Earn (simulated)

| Action | Base reward (draft units) | Notes |
|--------|---------------------------|-------|
| First upload of type | 10 WB | Once per type per pubkey |
| Post (text) | 2 WB | Daily cap applies |
| Photo upload | 5 WB | + Iroh CID in event |
| DJ mix upload | 8 WB | See `features/nft-dj-mixes.md` |
| Video upload (per min) | 1 WB/min | Capped at 30 WB |
| Comment on others' content | 0.5 WB | Capped |
| Node relay heartbeat (1h) | 1–5 WB | Tier 1+ only |

**Daily earn cap (draft):** 100 WB per pubkey (adjust after testing).

---

## Engagement Quality Multiplier

```
final_reward = base_reward × engagement_quality × node_bonus
```

| Signal | Multiplier | Rationale (MIDF-inspired) |
|--------|------------|---------------------------|
| Normal engagement | 1.0 | Default |
| >50% engagers < 24h old | 0.25 | Sybil spike |
| Star pattern detected | 0.1 | Farm indicator |
| Verified long-term follower | 1.2 | Quality boost (Phase 2) |

---

## BlkCoin — Premium Grants (simulated Phase 3, on-chain Phase 4)

| Trigger | Grant (draft) |
|---------|---------------|
| Top 1% weekly uploads | 1 BC |
| Top 10% weekly node operators | 0.5 BC |
| Viral cross-town trending | 2 BC |

**Supply policy:** Low issuance; sinks via NFT tickets, boosts, fees.

---

## Sinks (WeixBucks spend)

| Action | Cost (draft) |
|--------|--------------|
| Tip | User-defined |
| Profile theme unlock | 20 WB |
| Feed boost (24h) | 15 WB |
| Marketplace listing fee | 5 WB |
| Anti-abuse penalty | Balance freeze or burn |

---

## Node Harvest (draft)

| Contribution | WB/hour |
|--------------|---------|
| Relay uptime (verified) | 1–5 |
| Pin serve (per fetch) | 0.1 |
| Validate reward batch | 0.5 |

Per-node daily cap prevents farm scaling.

---

## Open Items

- [ ] User approves numeric caps
- [ ] Define "active engager" precisely
- [ ] Test formulas on Tier 0 hardware with simulated load
- [ ] Integrate with `nostr-event-kinds.md` reward event kinds