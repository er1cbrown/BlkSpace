# BlkSpace Finance Layer Strategy

**Document:** `docs/finance-l1-strategy.md`  
**Status:** Product decision (2026-08-26)  
**Tokens:** WeixBucks (off-chain) → **BLACKINCCOIN / BI9 ERC-20** (on-chain, canonical)  
**Settlement target:** HyperEVM (Hyperliquid / HYPE chain)  
**Related products:** BlkBridge (Yard-class), BLKSHI (Kalshi-inspired)

**Follow-ups from this decision:** [`tokenomics.md`](tokenomics.md) · [`blkbridge.md`](blkbridge.md) · [`blkshi.md`](blkshi.md) · Solidity skeleton in `Code-Companion/artifacts/hyperevm/`

---

## 1. Strategic Inheritance

BlkSpace inherits the **Hyperliquid trajectory**, not Solana’s general-purpose L1 model.

| Pattern | Hyperliquid | BlkSpace |
|---|---|---|
| Start specialized | On-chain perps / order book | College-town social + media + rewards |
| Own the core loop first | HyperCore | BlkCore (Nostr + Iroh + WeixBucks + town relays) |
| Add a finance VM later | HyperEVM | BlkFinance on HyperEVM |
| Stay specialized | Finance-focused L1 behavior | Finance-focused application network |
| Do not become everything | Not a general app chain | Not a general social L1 |

**Decision:** BI9 is the **canonical ERC-20** on the **HYPE chain (HyperEVM)**.  
Solana remains optional later for wallet reach / Token-2022 prototyping. It is not the home of BI9.

BlkSpace is **not** trying to be another general-purpose chain. It is an app-specific network that expands into finance.

---

## 2. Two-Layer Architecture

### BlkCore (now)

The product. Must work offline and on Tier-0 hardware.

- Nostr events + `t:hbcu-town:*` tags
- Iroh content-addressed media
- Local WeixBucks ledger
- Federated town relays
- Engagement quality + anti-farming
- Tauri app (desktop first, mobile later)

BlkCore does **not** live on Hyperliquid. Social and media stay off-chain / P2P.

### BlkFinance (expansion)

The financial layer attached to the core.

- **BLACKINCCOIN (BI9)** as an ERC-20 on HyperEVM
- Relay staking and governance
- BlkBridge (Yard-class cross-chain app)
- **BLKSHI** (Kalshi-inspired event / portfolio finance)
- Advanced users stake **HYPE** while financing an existing portfolio
- Optional later listing / liquidity next to HyperCore

HyperEVM is used because it is a finance-focused execution environment on the same chain as HyperCore, with HYPE as gas, and a trader / DeFi user base.

---

## 3. Token Placement: BI9 on HyperEVM

**Canonical chain:** Hyperliquid HyperEVM  
**Gas token:** HYPE  
**Token standard:** ERC-20 (and related HyperEVM / HyperCore listing path later)

### Why HyperEVM

- Matches the “specialized core → finance VM” pattern
- Same validator set as HyperCore (no extra bridge between Core and EVM)
- Advanced users already hold HYPE
- Finance primitives (staking, markets, portfolio financing) fit the chain better than a general social L1

### What stays off HyperEVM

- Posts, follows, town feeds
- Media blobs (Iroh)
- Daily WeixBucks earn/spend
- Local SQLite / app state

WeixBucks remains an **in-app utility point**.  
BI9 is the **on-chain financial asset**.  
There is no automatic 1:1 conversion.

---

## 4. BlkBridge (Yard-class bridge app)

**Inspiration:** Yard-style / HyBridge-class UX (user referenced “clin yard”; treat as YardRoute / HyBridge pattern).

**Job:** Move value into and out of the BlkSpace finance layer with as little friction as possible.

### Primary routes

1. Solana / EVM / common L2s → HyperEVM (BI9, HYPE, stables)
2. HyperEVM ↔ HyperCore (spot / perps account when needed)
3. Portfolio assets in → collateral / financing for BLKSHI
4. Rewards / settlement out → user wallets

### Design rules

- Non-custodial where possible
- Do not build a custom lock-and-mint L1 bridge as v1
- Route through existing infrastructure first (deBridge, Stargate/LayerZero, Garden, Across, official Hyperliquid deposit path)
- BlkBridge is a **product surface**, not a new trust-minimized bridge protocol on day one
- Always show destination clearly: HyperEVM vs HyperCore Spot vs HyperCore Perps
- Never mix WeixBucks into the bridge. WeixBucks do not leave the app

### v1 scope

- Deposit stables and HYPE onto HyperEVM
- Display BI9 balance after token exists
- One-click “enter BlkFinance”
- Status, fees, and ETA in plain language

### Later scope

- Canonical BI9 representation if a second chain is added
- Town-relay operator deposits
- BLKSHI collateral onboarding

---

## 5. BLKSHI (Kalshi-inspired finance product)

**Name:** BLKSHI  
**Inspiration:** Kalshi event / prediction markets  
**Audience:** Advanced users, not the default college-town feed  
**Chain:** HyperEVM, with optional HyperCore liquidity later

### Product idea

Advanced users can:

- Trade event contracts / structured outcomes (Kalshi-style yes/no or defined events)
- Finance or hedge an **existing portfolio**
- Stake **HYPE** (and later BI9) while that capital is working
- Keep BlkSpace social identity separate from the trading desk

This is the finance-focused expansion. It is **not** the home screen for new users.

### Intended loop

```
Existing portfolio
        ↓
BlkBridge (assets in)
        ↓
BLKSHI desk (event contracts / financing / hedging)
        ↓
Stake HYPE (and later BI9) as margin, fee discount, or yield sleeve
        ↓
Settlement on HyperEVM
        ↓
Optional return to BlkCore identity / creator tools
```

### v1 product rules

- Opt-in advanced mode only
- Separate UI from the social feed
- No “use BlkSpace and get rich” language
- No automatic WeixBucks → BI9 minting into BLKSHI
- Caps, risk labels, and clear “you can lose the stake” copy
- Event contracts must have predefined resolution sources

### Later product rules

- BI9 as collateral or fee token
- HYPE staking rewards for providing liquidity / margin / resolution bonds
- Town-level or campus-level event markets only if legally reviewed
- HyperCore integration only when a real order book is needed

### Legal / regulatory note

Kalshi is a CFTC-regulated event-contract exchange in the United States.  
BLKSHI is a **product inspiration**, not a claim that BlkSpace is a designated contract market.

Before any public US listing of event contracts:

- Get counsel
- Do not market BLKSHI as sportsbook or guaranteed yield
- Keep it behind advanced-user gates
- Assume event contracts may be regulated depending on jurisdiction and contract design

This document does not authorize a public launch.

---

## 6. HYPE Staking + Portfolio Financing

**User request:** advanced users earn HYPE stakes while financing an existing portfolio.

### Safe framing

Do **not** promise that staking HYPE produces guaranteed yield from BlkSpace activity.

Safer mechanics:

1. **Fee discount / tier**  
   Stake HYPE to reduce BLKSHI fees.

2. **Margin / collateral sleeve**  
   Stake HYPE (and later BI9) as collateral to finance or hedge a portfolio.

3. **Protocol role**  
   Stake to operate infrastructure (relays) or to bond a market.

4. **Optional protocol incentives**  
   If incentives exist, they must be disclosed as variable, not guaranteed.

### Portfolio financing meaning (BlkSpace)

- User already holds assets (SOL, stables, HYPE, later BI9)
- User bridges them in via BlkBridge
- BLKSHI lets the user keep exposure or hedge while posting collateral
- Staked HYPE is part of that collateral / membership tier

This is a **finance desk**, not a consumer cashback program.

---

## 7. What WeixBucks Still Is

WeixBucks stays off-chain and in-app:

- Earned for quality posts, media, pinning, relay uptime
- Spent on boosts, tips, creator tools
- Capped and quality-weighted
- Not an investment
- Not bridged
- Not automatically converted to BI9

Any future BI9 distribution remains governance-controlled, capped, and opt-in.

---

## 8. Phased Roadmap

| Phase | Focus | Ships |
|---|---|---|
| 0–1 | BlkCore | Social, Iroh media, WeixBucks, town relays |
| 2 | BlkBridge v1 | Deposit path onto HyperEVM using existing bridge rails |
| 3 | BI9 on HyperEVM | ERC-20, staking skeleton, governance skeleton |
| 4 | BLKSHI private / advanced | Event contracts + portfolio financing + HYPE stake tiers |
| 5 | HyperCore attach (optional) | Only if BLKSHI needs native order-book liquidity |

Do not skip BlkCore. The Hyperliquid lesson is: the specialized product has to work first.

---

## 9. Non-Goals

- Building a custom L1 or custom consensus
- Making BlkSpace a general-purpose chain
- Putting posts or media on HyperEVM
- Launching BI9 as a memecoin with no utility
- Marketing app usage as a path to token profits
- Unregulated public event-contract exchange in the US without counsel

---

## 10. Immediate Next Documents / Code

1. Keep WeixBucks implementation as the live core loop
2. Draft `docs/blkbridge.md` (routes, rails, UX)
3. Draft `docs/blkshi.md` (markets, collateral, HYPE stake tiers)
4. Draft HyperEVM token + staking skeleton (Solidity, not Anchor)
5. Update `docs/tokenomics.md` so canonical chain = HyperEVM

---

*Saved 2026-08-26. This file records the decision to place BI9 on HyperEVM and to build BlkBridge + BLKSHI as the finance expansion around BlkCore.*
