# BlkSpace Tokenomics (Canonical)

**Status:** Product decision (2026-08-26)  
**Canonical on-chain home:** Hyperliquid **HyperEVM**  
**On-chain token:** **BLACKINCCOIN (BI9)** — ERC-20  
**Gas:** **HYPE**  
**In-app points:** **WeixBucks (WB)** — off-chain, live now  
**Decision record:** [`finance-l1-strategy.md`](finance-l1-strategy.md)

This file is the **canonical** tokenomics overview. Live WeixBucks constants still live in [`tokenomics-policy.md`](tokenomics-policy.md) and `TokenomicsPolicy::published()`. Solana **BKSPC** docs describe earlier Phase A scaffolding; they are **not** the home of BI9.

---

## 1. Three layers (do not collapse them)

| Layer | Name | Where it lives | What it is |
|---|---|---|---|
| 1 | **WeixBucks (WB)** | App / SQLite / signed economy events | Earn-only practice credits. Daily cap. Spend in-app. **Not bridged.** |
| 2 | **Yard Cred / Karma** | App | Reputation. Never spendable. Never convertible. |
| 3 | **BLACKINCCOIN (BI9)** | HyperEVM ERC-20 | On-chain financial asset for BlkFinance (staking, later BLKSHI / governance). |

There is **no automatic 1:1** (or 1,000:1) conversion from WeixBucks to BI9.

WeixBucks is the student / campus loop.  
BI9 is the advanced finance asset.  
They stay separate until a **governance-controlled, capped, opt-in** distribution is reviewed and shipped.

---

## 2. Canonical chain = HyperEVM

| Item | Decision |
|---|---|
| Home of BI9 | Hyperliquid HyperEVM (HYPE chain) |
| Token standard | ERC-20 |
| Gas | HYPE (native) |
| Why | Finance VM on the same validator set as HyperCore; trader / DeFi users already hold HYPE |
| What does **not** go on-chain | Posts, follows, town feeds, Iroh blobs, daily WB earn/spend, local app state |
| Solana | Optional later for **wallet reach**. Not the canonical mint. Existing Anchor / BKSPC work is scaffolding, not the token home. |

**Chain IDs (reference):** HyperEVM mainnet `999`, testnet `998`.  
Contracts: `Code-Companion/artifacts/hyperevm/`.

Solana remains a possible *destination* in [`blkbridge.md`](blkbridge.md) (users already hold SOL / USDC there). It is not where BI9 is defined.

---

## 3. What WeixBucks still is (unchanged)

Live now in the Yard app. Do not wait on HyperEVM to keep this loop honest.

- Earned for quality posts, media, pinning, relay uptime
- Spent on boosts, tips, creator marketplace
- Capped (250 WB / rolling 24h) and quality-weighted (MIDF)
- **Not** an investment
- **Not** sold for USD without a new reviewed product
- **Not** deposited into BlkBridge
- **Not** automatically minted into BI9 or BLKSHI

Published fees, caps, and student copy: [`tokenomics-policy.md`](tokenomics-policy.md) · [`economy-student-terms.md`](economy-student-terms.md) · [`reward-formulas.md`](reward-formulas.md).

---

## 4. BI9 issuance rules

These replace “WB → on-chain mint as the default path.”

| Rule | Specification |
|---|---|
| **Mint** | Governance-controlled only. No public mint. No WB-triggered mint in v1. |
| **Cap** | Constructor / admin cap. Mint reverts until a cap is set and a minter is authorized. |
| **Team / insider genesis** | 0% automatic allocation in the skeleton. Any allocation is an explicit, disclosed mint. |
| **Presale** | None implied by this document. |
| **WB relationship** | Separate product. Future distribution, if any, is opt-in, capped, and reviewed. |
| **Utility (intended)** | Staking membership / collateral / protocol-role bond; later BLKSHI fee or collateral token. |
| **Not** | A memecoin launch, a cashback coupon, or a promise of price. |

Official positioning (finance UI, not the student feed):

> Optional on-chain asset on HyperEVM. No guaranteed value or yield. Not investment advice. WeixBucks do not convert automatically.

---

## 5. How value moves (when finance ships)

```
BlkCore (WeixBucks, social, media)     stays in the app
                │
                │  no auto-bridge
                ✕
                │
User's existing assets (HYPE, stables, SOL, later BI9)
                │
                ▼
         BlkBridge  ──►  HyperEVM wallet
                │
                ▼
    BI9 + HYPE stake  ──►  BLKSHI desk (advanced, opt-in)
                │
                ▼
     HyperCore spot/perps (optional, later)
```

Product specs: [`blkbridge.md`](blkbridge.md) · [`blkshi.md`](blkshi.md).

---

## 6. HYPE staking (safe framing)

Advanced users may stake **HYPE** (native) and later **BI9** while financing or hedging a portfolio they already hold.

Allowed mechanics:

1. **Fee discount / tier** — staked HYPE reduces BLKSHI fees.
2. **Collateral sleeve** — staked HYPE (later BI9) as margin / membership.
3. **Protocol role** — stake to operate a town relay or bond a market.
4. **Optional incentives** — if they exist, they are **variable and disclosed**, never guaranteed.

Do **not** ship copy that says staking HYPE produces yield from posting, likes, or WeixBucks.

---

## 7. Relationship to older BKSPC / Solana docs

| Doc | Still true? | How to read it after this decision |
|---|---|---|
| [`tokenomics-policy.md`](tokenomics-policy.md) | **WB / fees / caps** yes | On-chain row now points here. BKSPC-on-Solana is not canonical. |
| [`bkspc-tokenomics-policy.md`](bkspc-tokenomics-policy.md) | Historical Phase A lock | Solana earned-settlement design. Superseded as the **home** of the coin. |
| [`bkspc-phase0-phase1-tickets.md`](bkspc-phase0-phase1-tickets.md) | Devnet experiment | Keep as Solana scaffolding notes; do not treat as BI9 mint path. |
| [`beta-tokenomics-and-launch-strategy.md`](beta-tokenomics-and-launch-strategy.md) | Research | Pump.fun / 1,000 WB → 1 BKSPC is **not** the BI9 launch path. |
| `Code-Companion/artifacts/solana/` | Code exists | Optional wallet-reach later. New token work is Solidity under `artifacts/hyperevm/`. |

Ticker note: product chrome in the Yard app today still says **BKSPC** in some Phase 4 surfaces. Canonical ticker for the HyperEVM asset is **BI9** (BLACKINCCOIN). Do not mint two “the coin” stories in student UI. Student UI stays on WeixBucks until BlkFinance is an explicit advanced mode.

---

## 8. What ships when

| Phase | Tokenomics work | Status |
|---|---|---|
| 0–1 | WeixBucks live loop | **Keep shipping** |
| 2 | BlkBridge deposits (stables, HYPE) | Spec: [`blkbridge.md`](blkbridge.md) |
| 3 | BI9 ERC-20 + stake + governance skeletons | **Code ready** · `artifacts/hyperevm/` · mint still **off** (cap 0) |
| 3b | HyperEVM **mainnet deploy path** | `DeployMainnet.s.sol` (chain 999 only). Addresses empty until broadcast. App panel on `/wallet`. |
| 4 | BLKSHI private / advanced | Spec: [`blkshi.md`](blkshi.md) — no public US event-contract launch without counsel |
| 5 | Optional HyperCore attach | Only if an order book is actually needed |

Do not skip BlkCore. Do not market app usage as a path to BI9 profits.

---

## 9. Non-goals

- Automatic WeixBucks → BI9
- Bridging WeixBucks
- Custom L1 / custom consensus
- Putting the social graph on HyperEVM
- Guaranteed staking yield
- Unreviewed public event contracts in the US

---

*Canonical chain decision: 2026-08-26. WeixBucks remains the live campus economy; BI9 lives on HyperEVM.*
