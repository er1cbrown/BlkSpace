# Four-pillar economy (IEEE-review claim)

**Status:** Product architecture — implemented in UX + progression v2 (2026-08)  
**Audience:** Faculty, counsel, students, IEEE-style reviewers  
**Related:** [`wb-progression-v2.md`](wb-progression-v2.md) · [`project-connect-credibility-layer.md`](project-connect-credibility-layer.md) · [`../tokenomics.md`](../tokenomics.md) · [`../tokenomics-policy.md`](../tokenomics-policy.md) · [`../economy-student-terms.md`](../economy-student-terms.md) · [`comparative-multi-chain-prototyping-study.md`](comparative-multi-chain-prototyping-study.md)

> **Settlement (student, pillar 4):** optional **BKSPC on Solana Devnet** — 1,000 WB → 1 BKSPC, Cred-gated. **BI9 on HyperEVM** is **governance**, not this pillar. No WB → BI9. See [`../finance-l1-strategy.md`](../finance-l1-strategy.md).

---

## One claim

BlkSpace is a **campus social + professional network** with a **practice economy** and a **credibility-gated optional settlement**.  
It teaches value, trust, fees, and settlement—**not** day trading, brokerage accounts, or guaranteed returns.

---

## Dependency order (non-negotiable)

```text
┌─────────────────────────────────────────────────────────────┐
│  4 · SETTLEMENT (BKSPC on Solana Devnet)                     │
│  Optional student micro-receipt. 1,000 WB → 1 BKSPC.         │
│  Devnet prototype · not investment advice                    │
│  (BI9 / HyperEVM is governance, off this pillar)             │
└────────────────────────────▲────────────────────────────────┘
                             │ only after 2 + 3
┌────────────────────────────┴────────────────────────────────┐
│  3 · LITERACY                                                │
│  Soft credits, fees, caps · Markets 101 (brokerage education)│
│  “We are not a brokerage” · no NASDAQ/crypto trading in-app  │
└────────────────────────────▲────────────────────────────────┘
                             │ teaches before settlement
┌────────────────────────────┴────────────────────────────────┐
│  2 · CREDIBILITY (Yard Cred)                                 │
│  Reliability score · Connect completions · endorsements      │
│  Non-purchasable · gates high-trust & settlement eligibility │
└────────────────────────────▲────────────────────────────────┘
                             │ proves who you are on the yard
┌────────────────────────────┴────────────────────────────────┐
│  1 · FAIR EARN (WeixBucks + XP tiers)                        │
│  Soft earn-only practice credits · daily cap · diminishing   │
│  returns · CreatorSpace unlocks by contribution tier         │
└─────────────────────────────────────────────────────────────┘
         ▲
┌────────┴────────────────────────────────────────────────────┐
│  LAYER 0 · SOCIAL YARD                                       │
│  Feed · yards · Connect orgs · Studio · guest browse         │
└─────────────────────────────────────────────────────────────┘
```

Finance without credibility is a **product failure mode** (scam narrative).  
Credibility without finance remains **useful** (matching, research, collaboration).

---

## User-facing names (wallet IA)

| Pillar | Wallet label | User should think |
|--------|--------------|-------------------|
| 1 Fair earn | **Practice credits (WeixBucks)** | Soft game money for create/help/buy creator work |
| 2 Credibility | **Reliability (Yard Cred)** | Can people trust me for research / delivery? |
| 3 Literacy | **Learn markets** | How brokerages & risk work *outside* this app |
| 4 Settlement | **Settlement (BKSPC)** | Optional receipt after Cred + eligibility — not a casino |

---

## What we never claim on the student (Yard) path

- BKSPC price, ROI, or NASDAQ-like returns  
- In-app brokerage for real stocks or crypto  
- Buying WeixBucks with USD (unless a separate, reviewed product)  
- Paying crypto for likes/posts  
- “Mainnet ready” without Device B + counsel gates  

---

## Evaluation bars (IEEE-style honesty)

| Bar | Evidence |
|-----|----------|
| Soft vs settlement honesty | Wallet copy + policy docs + withdraw gates in `db.rs` |
| Cred before coin | `MIN_WITHDRAW_YARD_CRED` + Connect completions |
| Fair earn | Progression v2: XP, tiers, diminishing returns (`wb-progression-v2.md`) |
| Tier 0 | Yard build, bundle budget, Device B checklist |
| Reproducibility | CI + install docs + this diagram |

**“IEEE ready”** = reviewable claim + methods + partial results — **not** an IEEE product certification.
