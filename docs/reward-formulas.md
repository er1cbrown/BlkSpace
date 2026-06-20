# Reward Formulas (Draft)

**Status:** Phase 1 — Numeric caps approved and implemented in `db.rs` reward engine  
**Last Updated:** 2026-06-16  
**Gate:** ✅ PASSED — Post 5 WB, Reply 2 WB, Like 1 WB, Daily cap 250 WB

---

## Principles

1. Tier 0 nodes must earn meaningfully
2. Transparent math published in client (see `docs/tokenomics-policy.md`)
3. Engagement Quality reduces Sybil/forgery impact
4. All rewards = signed Nostr events + SQLite cache
5. **No speculative token** — WB = earn-only credits; BKSP = optional settlement receipt

---

## WeixBucks vs Karma (two separate systems)

| | **WeixBucks (WB)** | **Karma** |
|---|-------------------|-----------|
| **What it is** | Spendable in-app currency | Reddit-style reputation score |
| **Earned from** | Posts, uploads, yard joins, likes received | Posts, replies, upvotes, yard engagement |
| **Spent on** | Tips, boosts, themes, marketplace (Phase 4) | Nothing — display & ranking only |
| **Purchasable?** | No (earn only in Phase 1–3) | **Never** |
| **Convertible?** | N/A | **No** — karma ≠ WB |
| **Abuse controls** | MIDF throttle (score >0.7 → 0 WB) + **250 WB/day cap** | MIDF throttle (score >0.7 → 0 karma) |

**Clarification:** Showing karma on a profile does not mean the user has spendable WB. Wallet balance and karma leaderboard are separate UIs (`/wallet` vs `/leaderboard`).

---

## WeixBucks — Base Earn (simulated)

| Action | Base reward (draft units) | Notes |
|--------|---------------------------|-------|
| First upload of type | 10 WB | Once per type per pubkey |
| Post (text) | 5 WB | Feed + profile creation |
| Yard channel post | 5 WB + 3 WB | Fizz / Discord engagement bonus |
| Media upload (new blob) | 10 WB | Bound to account grid |
| Join yard | 5 WB | Once per yard |
| Event RSVP (first per event) | 2 WB | Yard events tab |
| Wall post (approved) | 1 WB | Facebook-style visitor wall |
| Photo upload | 5 WB | + Iroh CID in event |
| DJ mix upload | 8 WB | See `features/nft-dj-mixes.md` |
| Video upload (per min) | 1 WB/min | Capped at 30 WB |
| Comment on others' content | 0.5 WB | Capped |
| Node relay heartbeat (1h) | 1–5 WB | Tier 1+ only |

**Daily earn cap:** ✅ **250 WB per pubkey** per rolling 24h — enforced in `grant_weix_bucks()` (`db.rs`).

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

## BKSP — BLKSPACE COIN (Phase 4+)

**BKSP** is **not** a daily earn memecoin. It is minted only when eligible users **withdraw** settled WB (counsel-gated).

| Mechanism | Policy |
|-----------|--------|
| Mint path | Treasury after WB debit + eligibility check |
| Ratio | 1,000 WB → 1 BKSP (fixed, published) |
| Operator bonuses | Deferred until counsel; no viral “grants” marketing |

**Supply policy:** Hard cap; mint authority revoked at cap; sinks via fees and burns.

---

## Karma (Reddit-style — not purchasable)

| Action | Post karma | Comment karma |
|--------|------------|---------------|
| Feed post | +3 | — |
| Yard channel post | +5 | +2 |
| Reply | — | +2 |
| Yard reply | — | +1 |
| Upvote received | +1 | — |
| Media creation | +5 | — |
| Join yard | — | +3 |

Karma affects visibility ranking and the `/leaderboard` page. WB remains the **only** spendable currency for tips, boosts, and marketplace. Both respect MIDF throttle when `overallScore > 0.7`.

## Platform fees (implemented)

| Activity | Fee | Constant |
|----------|-----|----------|
| Tip / peer send | 2% | `TIP_PLATFORM_FEE_BPS = 200` |
| Marketplace purchase | 5% | `MARKETPLACE_PLATFORM_FEE_BPS = 500` |
| Withdrawal settlement | 1% | `WITHDRAW_SETTLEMENT_FEE_BPS = 100` |

Fee is burned (reduces WB in circulation). Recipient receives net on transfers.

## Sinks (WeixBucks spend)

| Action | Cost (draft) |
|--------|--------------|
| Tip | User-defined + platform fee |
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

## Withdrawal eligibility (draft — counsel gate)

**Status:** Implemented in `db.rs` (`evaluate_withdraw_eligibility`) — devnet/simulated only until counsel approves mainnet.

| Rule | Draft value |
|------|-------------|
| Minimum withdrawal | 100 WB |
| Account age | 7 days |
| Total karma | ≥ 10 (post + comment) |
| Real posts | ≥ 3 |
| Weekly cap | 1,000 WB per rolling 7 days |
| Cooldown | 7 days between withdrawals |
| Conversion ratio (display) | 1,000 WB = 1 BKSP |

**Not live:** Anchor CPI mint, mainnet deployment, or purchasable WB. Wallet UI shows utility-credit disclaimer.

---

## Open Items

- [x] User approves numeric caps (250 WB/day implemented)
- [x] Draft withdrawal eligibility in Rust (counsel gate for mainnet)
- [ ] Define "active engager" precisely
- [ ] Test formulas on Tier 0 hardware with simulated load
- [ ] Integrate with `nostr-event-kinds.md` reward event kinds