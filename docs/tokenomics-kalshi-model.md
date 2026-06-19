# Tokenomics — Kalshi-Style Regulated Settlement Model

**Status:** Draft policy + partial implementation (`db.rs` fees, withdrawal gates)  
**Last Updated:** 2026-06-19  
**On-chain token:** **BKSPC** — full name `BlkSpace Settlement` (replaces retired BlkCoin/BLKCOIN naming)  
**Gate:** No mainnet / no purchasable WB until legal counsel approves

---

## Why Kalshi (not memecoin)

[Kalshi](https://kalshi.com) is a **regulated event-contract exchange**: users trade on real-world outcomes with published fees, collateral held until settlement, and clear “not an investment product” framing. BlkSpace adopts that **discipline**, not prediction-market gambling on the yard.

| Kalshi | BlkSpace equivalent |
|--------|---------------------|
| USD collateral | **WeixBucks (WB)** — earn-only platform credits |
| Event contracts | **Yard events + participation milestones** (RSVP, posts, node work) |
| Exchange fees on trades | **Platform fees** on tips (2%), marketplace (5%) |
| Settlement at resolution | **Earn on verified activity**; optional **withdrawal** = settlement rail |
| CFTC-regulated DCM | **Counsel gate** before mainnet BKSPC mint |
| No platform token hype | **BKSPC** = optional on-chain **receipt** of settled earnings |
| Published fee schedule | `get_tokenomics_policy` + wallet UI |

**We do not run** a Kalshi-style order book or real-money prediction markets on yard outcomes in Phase 3. Yard events are **community calendars**, not tradable contracts.

---

## Three layers

```
┌─────────────────────────────────────────────────────────┐
│  KARMA — reputation only (Reddit-style, never spendable) │
├─────────────────────────────────────────────────────────┤
│  WEIXBUCKS — platform credits (earn → spend → fee sinks) │
│    • Earn: creation, engagement, node work (250 WB/day cap)│
│    • Spend: tips, boosts, themes, marketplace            │
│    • Never: purchasable, off-platform transfer, ROI pitch │
├─────────────────────────────────────────────────────────┤
│  BKSPC — BlkSpace Settlement (Phase 4+, counsel-gated)   │
│    • Mint: ONLY after WB withdrawal + eligibility        │
│    • Ratio: fixed 1,000 WB → 1 BKSPC (published)         │
│    • No: presale, insider airdrop, “moon” marketing      │
└─────────────────────────────────────────────────────────┘
```

---

## Published fee schedule (implemented)

| Activity | Fee | Notes |
|----------|-----|-------|
| Tip / peer send | **2%** (`TIP_PLATFORM_FEE_BPS = 200`) | Fee burned; recipient gets net |
| Marketplace purchase | **5%** (`MARKETPLACE_PLATFORM_FEE_BPS = 500`) | Kalshi-style exchange take |
| Withdrawal settlement | **1%** (`WITHDRAW_SETTLEMENT_FEE_BPS = 100`) | On top of principal debit; devnet simulated |

Fees reduce circulating WB (deflationary sink), matching Kalshi’s transparent take on activity.

---

## Earn rules (unchanged caps)

- **250 WB/day** per user (rolling 24h)
- MIDF throttle: malicious intent score > 0.7 → 0 WB
- All earns → signed Nostr events + SQLite audit

See `docs/reward-formulas.md` for action-level tables.

---

## Withdrawal = settlement (Kalshi payout analog)

Withdrawal is **opt-in settlement** of earned WB to an on-chain receipt — not a token launch.

| Rule | Value |
|------|-------|
| Minimum | 100 WB |
| Account age | 7 days |
| Karma | ≥ 10 |
| Posts | ≥ 3 |
| Weekly cap | 1,000 WB / 7 days |
| Cooldown | 7 days between withdrawals |
| Settlement fee | 1% of principal |
| On-chain | **Devnet simulated** until counsel |

---

## User-facing copy (required)

> WeixBucks are utility credits for participating on the yard — like Kalshi collateral, but **not purchasable with real money** and **not an investment**.  
> **BKSPC** (BlkSpace Settlement) is an optional on-chain receipt for **earned** value after eligibility checks. No mainnet until counsel approves.

---

## What counsel must review before mainnet

1. Whether WB + withdrawal rail triggers money-transmission or securities analysis in target states
2. Fee disclosure sufficiency (in-app + published schedule)
3. BKSPC mint authority (multisig + timelock per `solana-security.md`)
4. Marketing guardrails — no ROI, no presale, no “token goes up”

---

## Implementation map

| Component | Location |
|-----------|----------|
| Fee constants + `transfer_weixbucks` | `db.rs` |
| `TokenomicsPolicy::published()` | `db.rs` |
| `get_tokenomics_policy` command | `lib.rs` |
| Withdrawal eligibility + settlement fee | `db.rs`, `lib.rs` |
| Wallet disclaimer + policy panel | `wallet.tsx`, `TokenomicsKalshiPanel.tsx` |