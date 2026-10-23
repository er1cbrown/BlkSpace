# BlkSpace Tokenomics (Canonical)

**Status:** Product decision, amended 2026-10-08  
**Canonical on-chain home:** **Solana**  
**On-chain token:** **BKSPC** — Token-2022, settlement + non-rewarding staking + timelocked governance  
**Gas:** **SOL**  
**In-app points:** **WeixBucks (WB)** — off-chain, live now  
**Decision record:** [`canonical-chain-decision.md`](canonical-chain-decision.md)  
**BI9:** separate ERC-20 aimed at Ethereum. Not deployed. Not a HyperEVM asset. Not the cash-out.

This file is the **canonical** tokenomics overview. Live WeixBucks constants still live in [`tokenomics-policy.md`](tokenomics-policy.md) and `TokenomicsPolicy::published()`.

**BKSPC on Solana is the canonical on-chain asset** — Token-2022, settlement plus non-rewarding staking plus allowlisted timelocked governance. Decision record: [`canonical-chain-decision.md`](canonical-chain-decision.md).

BI9 is an **ERC-20 aimed at Ethereum**. It is not deployed, not canonical, and not a HyperEVM asset. The contracts in `artifacts/hyperevm/` are old chain 999 reference code.

---

## 1. Three layers (do not collapse them)

| Layer | Name | Where it lives | What it is |
|---|---|---|---|
| 1 | **WeixBucks (WB)** | App / SQLite / signed economy events | Earn-only practice credits. Daily cap. Spend in-app. **Not bridged.** |
| 2 | **Yard Cred / Karma** | App | Reputation. Never spendable. Never convertible. |
| 3 | **BLACKINCCOIN (BI9)** | Ethereum **ERC-20**, not deployed | Separate asset. Not the cash-out. Not a HyperEVM asset. |

There is **no automatic** conversion from WeixBucks to BI9 or to BKSPC.

WeixBucks is the student / campus loop.  
**BKSPC on Solana is the on-chain settlement token**, at 1,000 WB = 1 BKSPC, only after a funded mint.  
BI9 stays a separate undeployed Ethereum ERC-20.

---

## 2. Canonical chain = Solana (BKSPC)

| Item | Decision |
|---|---|
| Home of BKSPC | Solana. Devnet until a funded mint exists. |
| Token standard | **Token-2022** |
| Gas | SOL |
| Home of BI9 | Ethereum mainnet. ERC-20. Not deployed. Not a HyperEVM asset. |
| What does **not** go on-chain | Posts, follows, town feeds, Iroh blobs, daily WB earn/spend, local app state |
| Chain 999 | Old reference contracts in `Code-Companion/artifacts/hyperevm/`. Not BI9's home. Do not deploy there. |

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

> Canonical on-chain asset is BKSPC (Token-2022) on Solana. No guaranteed value or yield. Not investment advice. WeixBucks do not convert automatically. BI9 is an ERC-20 aimed at Ethereum and is not deployed.

---

## 5. How value moves (when finance ships)

```
BlkCore (WeixBucks, social, media)     stays in the app
                │
                │  no auto-bridge
                ✕
                │
User's existing assets (HYPE, stables, SOL, later BI9 ERC-20)
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
| [`tokenomics-policy.md`](tokenomics-policy.md) | **WB / fees / caps** yes | On-chain cash-out is BKSPC on Solana. |
| [`bkspc-tokenomics-policy.md`](bkspc-tokenomics-policy.md) | Settlement design | Solana earned-settlement design. This is the cash-out. |
| [`bkspc-phase0-phase1-tickets.md`](bkspc-phase0-phase1-tickets.md) | Devnet experiment | Solana scaffolding. Not a BI9 mint path. |
| [`beta-tokenomics-and-launch-strategy.md`](beta-tokenomics-and-launch-strategy.md) | Research | Pump.fun notes are not a BI9 launch. |
| `Code-Companion/artifacts/solana/` | Canonical chain code | BKSPC Token-2022. |
| `Code-Companion/artifacts/hyperevm/` | Old reference | Chain 999 contracts. Not BI9's home. |

Ticker note: the settlement ticker is **BKSPC** on Solana. **BI9** (BLACKINCCOIN) is a separate ERC-20 aimed at Ethereum and is not deployed. It is not a HyperEVM asset. Student UI stays on WeixBucks until a funded BKSPC mint exists. Do not tell students WeixBucks become BI9 automatically.

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

*Canonical chain decision: 2026-10-08. WeixBucks remains the live campus economy. BKSPC on Solana is the settlement coin. BI9 is an undeployed Ethereum ERC-20.*
