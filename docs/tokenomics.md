# BlkSpace Tokenomics (Canonical)

**Status:** Product decision (2026-08-26) · dual-chain jobs locked 2026-08-27  
**Student micro-settlement:** Solana Devnet **BKSPC** (Token-2022) — 1,000 WB → 1 BKSPC, one-way  
**Institutional governance:** Hyperliquid **HyperEVM** **BI9** (ERC-20) — **no** WeixBucks path  
**In-app points:** **WeixBucks (WB)** — off-chain, live now  
**Decision records:** [`finance-l1-strategy.md`](finance-l1-strategy.md) · [`features/comparative-multi-chain-prototyping-study.md`](features/comparative-multi-chain-prototyping-study.md)

This file is the **canonical** tokenomics overview. Live WeixBucks constants still live in [`tokenomics-policy.md`](tokenomics-policy.md) and `TokenomicsPolicy::published()`.

**Power of 2:** Solana and HyperEVM have **non-overlapping jobs**. Neither is the protocol’s single “primary settlement layer.” Do not mint two “the coin” stories in student UI.

---

## 1. Four layers (do not collapse them)

| Layer | Name | Where it lives | What it is |
|---|---|---|---|
| 1 | **WeixBucks (WB)** | App / SQLite / signed economy events | Earn-only practice credits. Daily cap. Spend in-app. **Not bridged to HyperEVM.** |
| 2 | **Yard Cred / Karma** | App | Reputation. Never spendable. Never convertible. |
| 3 | **BKSPC** | Solana Token-2022 (Devnet prototype) | **Student micro-settlement** of earned WB at **1,000:1**, one-way, Cred-gated. |
| 4 | **BLACKINCCOIN (BI9)** | HyperEVM ERC-20 | **Governance / sovereign backplane** for institutional node runners. **No WB hook.** |

There is **no automatic** conversion from WeixBucks to **BI9** (not 1:1, not 1,000:1).

WeixBucks is the student / campus loop.  
BKSPC is the optional student receipt on Solana.  
BI9 is the institutional governance asset on HyperEVM.  
They stay separate. BI9 issuance, if any, is **governance-controlled, capped, opt-in**, and reviewed — never a WB mint.

---

## 1.1 Power of 2 (functional separation)

| | Tier 1 · Solana Devnet | Tier 2 · HyperEVM |
|---|---|---|
| Job | Social micro-settlement | Protocol governance & sovereign backplane |
| Token | BKSPC | BI9 |
| WeixBucks | 1,000:1 convert (Design 1) | **Forbidden** |
| Who | Students on the Yard | Universities / SGA node runners |

Study (optional IEEE track): [`features/comparative-multi-chain-prototyping-study.md`](features/comparative-multi-chain-prototyping-study.md).

---

## 2. Home of BI9 = HyperEVM (not student settlement)

| Item | Decision |
|---|---|
| Home of BI9 | Hyperliquid HyperEVM (HYPE chain) |
| Token standard | ERC-20 |
| Gas | HYPE (native) |
| Job | Institutional routing, treasury, protocol-role bonds — **not** WB receipts |
| What does **not** go on-chain | Posts, follows, town feeds, Iroh blobs, daily WB earn/spend, local app state |
| Solana | **Student micro-settlement** of BKSPC. Not the home of BI9. Not “legacy only.” |

**Chain IDs (reference):** HyperEVM mainnet `999`, testnet `998`.  
Contracts: `Code-Companion/artifacts/hyperevm/`.

Solana remains a possible *destination* in [`blkbridge.md`](blkbridge.md) (users already hold SOL / USDC there). It is not where BI9 is defined. It **is** where student BKSPC receipts are prototyped.

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

> BI9 is an optional HyperEVM governance asset. No guaranteed value or yield. Not investment advice. WeixBucks do not convert to BI9.

Student settlement positioning:

> Optional on-chain settlement of earned value as BKSPC on Solana. No guaranteed value or price. Not investment advice. Devnet only.

---

## 5. How value moves (two rails)

**Student micro-settlement (Tier 1):**

```
BlkCore (WeixBucks, social, media)     stays in the app
                │
                │  Cred + eligibility + 1% fee
                │  1,000 WB → 1 BKSPC (one-way)
                ▼
         Solana Devnet  ·  Token-2022 BKSPC
```

**Institutional backplane (Tier 2) — no WB:**

```
User's existing assets (HYPE, stables, SOL, later BI9)
                │
                ▼
         BlkBridge  ──►  HyperEVM wallet
                │
                ▼
    BI9 + HYPE stake  ──►  protocol roles / later BLKSHI
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
| [`tokenomics-policy.md`](tokenomics-policy.md) | **WB / fees / caps** yes | On-chain student receipt is BKSPC on Solana, not BI9. |
| [`bkspc-tokenomics-policy.md`](bkspc-tokenomics-policy.md) | Phase A lock for **Tier 1** | Solana earned-settlement design. Not the home of BI9. |
| [`bkspc-phase0-phase1-tickets.md`](bkspc-phase0-phase1-tickets.md) | Devnet experiment | Student convert path. Do not treat as BI9 mint path. |
| [`beta-tokenomics-and-launch-strategy.md`](beta-tokenomics-and-launch-strategy.md) | Research | Pump.fun is **not** the BI9 launch path and **not** the primary BKSPC mint. |
| `Code-Companion/artifacts/solana/` | Code exists | **Tier 1** micro-settlement prototype. New **governance** work is Solidity under `artifacts/hyperevm/`. |

Ticker note: student chrome says **BKSPC** for micro-settlement. HyperEVM ticker is **BI9**. They are different jobs. Do not tell students that WeixBucks become BI9. Yard lite stays on WeixBucks; BKSPC is gated; HyperEVM is advanced / hidden on lite.

---

## 8. What ships when

| Phase | Tokenomics work | Status |
|---|---|---|
| 0–1 | WeixBucks live loop | **Keep shipping** |
| 1s | Student micro-settlement (BKSPC Token-2022) | Devnet mint live; convert program **not** deployed; supply 0 |
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
