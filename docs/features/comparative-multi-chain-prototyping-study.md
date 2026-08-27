# Comparative Multi-Chain Prototyping Study

**Status:** Optional IEEE / systems track — **not** the core campus-social contribution  
**Date:** 2026-08-27  
**Freeze context:** IEEE preview pack + Device B smoke; dual-chain code exists under `Code-Companion/artifacts/solana/` and `…/hyperevm/`  
**Audience:** Program committee, faculty, counsel. Not student onboarding.

> This study is **optional**. The core paper remains a hardware-aware federated campus social system (Nostr + local WeixBucks + Yard Cred). Dual-chain prototyping is admitted only after functional separation is defined. Do not present Solana and HyperEVM as two copies of “the settlement layer.”

**Related:** [`../tokenomics.md`](../tokenomics.md) · [`../finance-l1-strategy.md`](../finance-l1-strategy.md) · [`../IEEE_CONFERENCE_PACK.md`](../IEEE_CONFERENCE_PACK.md) · [`../IEEE_REFEREE_REPORT_2026-08-27.md`](../IEEE_REFEREE_REPORT_2026-08-27.md) · [`four-pillar-economy.md`](four-pillar-economy.md)

---

## Abstract (study only)

BlkSpace already runs a closed-loop practice currency (WeixBucks) off-chain. Two public chains were prototyped beside it: **Solana Devnet** (Token-2022 **BKSPC**) and **Hyperliquid HyperEVM** (ERC-20 **BI9**). A referee reading both the 2026-08-27 briefing and canonical tokenomics correctly flagged **two settlement ontologies**. This study answers that comment by assigning each chain a **distinct, non-overlapping architectural job**. Solana is the **social micro-settlement** tier (student WB → BKSPC at 1,000:1). HyperEVM is the **protocol governance and sovereign backplane** (BI9 for institutional node runners). They cannot both be the primary settlement layer of the protocol. WeixBucks never mint BI9.

---

## Research question (optional track)

**RQ-P2.** Can two heterogeneous L1 prototypes coexist in a campus social system without both claiming to be the primary on-chain settlement layer?

**Working claim.** Yes, if and only if jobs are partitioned by *who transacts* and *what is allowed to touch WeixBucks*: high-frequency student receipts on a high-throughput VM; institutional governance on an EVM backplane that is prohibited from the student credit path.

This document completes **§1 (role definition)**. Measurement (§2+) is not claimed as a finished experiment.

---

## 1. Define the “Power of 2” roles (functional separation)

“Power of 2” here is **architectural**, not a token-supply slogan. It means **two rails, two jobs**: \(2^{1}\) complementary functions, not two issuers of the same claim. A dual-chain diagram that labels both layers “settlement” is a failed design. The partition is:

| | **Tier 1 — Solana Devnet** | **Tier 2 — HyperEVM** |
|---|---|---|
| **Name** | Social micro-settlement tier | Protocol governance & sovereign backplane |
| **Who** | Students on the Yard (daily activity) | Institutional node runners (universities, student-government associations) |
| **Asset** | **BKSPC** (Token-2022) | **BI9** (ERC-20, BLACKINCCOIN) |
| **Touches WeixBucks?** | **Yes** — one-way convert | **No** — contract has no WB hook |
| **Primary job** | High-throughput, low-latency, low-fee micro-receipts of *already earned* campus value | High-security institutional routing, cross-campus treasury, governance of protocol roles |
| **Is this “the” settlement layer of BlkSpace?** | **No** — it is *student micro-settlement only* | **No** — it does not settle student credits |
| **Gas / runtime** | SOL on Solana; parallel runtime for rapid state updates without bloating Tier 0 client CPU | HYPE on HyperEVM (chain id 999 / 998); EVM tooling for institutional operators |

**Invariant (non-negotiable):** there is no single “primary settlement layer” that both chains occupy. Off-chain WeixBucks remain the live student loop. On-chain work is split by function.

```
BlkCore (off-chain)
  WeixBucks · Yard Cred · Nostr · Iroh
           │
           │  eligibility + 1% fee-burn
           │  1,000 WB → 1 BKSPC   (one-way)
           ▼
┌──────────────────────────┐     forbidden      ┌──────────────────────────────┐
│ Tier 1  Solana Devnet    │  ←──────────────×──┤ Tier 2  HyperEVM             │
│ Social micro-settlement  │                    │ Sovereign backplane          │
│ BKSPC  Token-2022        │                    │ BI9  ERC-20  (governance)    │
│ Student receipts         │                    │ Universities / SGA nodes     │
└──────────────────────────┘                    └──────────────────────────────┘
        ▲                                              ▲
        │                                              │
   daily Yard activity                         institutional routing
   (latency, fees, TPS)                        (treasury, roles, timelock)
```

### 1.1 Tier 1 — Solana Devnet (social micro-settlement)

**Role.** High-throughput, low-latency, low-fee **micro-transactions** that turn local WeixBucks into a portable student receipt.

**Mechanic.** Eligible students convert at a published **1,000 WB : 1 BKSPC** ratio on **Token-2022**. Direction is **one-way**. This path is optimized for daily Yard activity: tips, marketplace sinks, and gated withdraws. Solana’s runtime is used because frequent small state updates should not land on the local Tauri/SQLite hot path as a blocking L1 round-trip for every like or post, and should not inflate Tier 0 (4–8 GB) client CPU. Social posts, follows, and media **do not** live on Solana.

**What Tier 1 is allowed to be**

- Optional on-chain **receipt** of value already earned in-app  
- Devnet prototype of Design 1 (earned settlement + fee-burn)  
- The *only* chain that may debit WeixBucks for an on-chain mint  

**What Tier 1 is forbidden to be**

- The protocol’s institutional treasury or governance venue  
- Home of **BI9**  
- A bonding-curve / pump.fun primary mint (Design 1 lock)  
- A claim of mainnet cash-out, price, or investment advice  

**Live artifact (honest).** Token-2022 mint `HBcTHr2LEC7wb1Y5Sni8pgBp8ChduHuf4sk2tLgykZPx` is **on Solana Devnet**, decimals 6, user supply **0**. Convert program source exists (`convert_wb_to_bkspc`); **user conversion is not live** until BPF deploy + authority move. Eligibility UI and the 1,000:1 constant are in `TokenomicsPolicy::published()`.

### 1.2 Tier 2 — HyperEVM (protocol governance & sovereign backplane)

**Role.** High-security, enterprise-grade **institutional routing** and **cross-campus treasury**. This is the sovereign backplane for operators, not a student wallet product.

**Mechanic.** **BI9** is deployed as an EVM-compatible **governance token** for institutional node runners (universities, student-government associations). It **does not interact with WeixBucks**. That isolation is the student-protection property: campus practice credits are insulated from HyperEVM fee volatility (HYPE gas) and from any future BI9 market. Solidity: no WB parameter, no convert instruction, cap `0` until timelocked governance. Stake sleeves (HYPE / BI9) are membership and collateral, **not** yield from posting.

**What Tier 2 is allowed to be**

- Home of **BI9** (ERC-20 on HyperEVM 999 / testnet 998)  
- Timelocked admin, minter, cap, and protocol-role bonds  
- Later BlkBridge destinations and BLKSHI *advanced* desks (opt-in, not Yard lite)  

**What Tier 2 is forbidden to be**

- The student micro-settlement rail  
- A WeixBucks mint, burn, or 1,000:1 converter  
- The “primary settlement layer” of the campus app  
- A required screen on the Yard (4 GB) path  

**Live artifact (honest).** Contracts in `Code-Companion/artifacts/hyperevm/` (`BI9.sol`, `StakeVault.sol`, `TimelockAdmin.sol`). Constructor comment: *“There is no WeixBucks parameter and never will be.”* App tests assert WeixBucks is **not** a HyperEVM asset. Mint remains **off** (cap 0) until a delayed `setCap`. Do not demo BI9 as student cash-out.

### 1.3 Non-overlap matrix (the paper’s load-bearing table)

| Job | Solana / BKSPC | HyperEVM / BI9 | Off-chain WB |
|-----|----------------|----------------|--------------|
| Daily student earn / spend | — | — | **Only here** |
| 1,000:1 earned-value receipt | **Only here** | Forbidden | Source ledger |
| Institutional governance / node roles | Forbidden | **Only here** | — |
| Cross-campus treasury routing | Not this job | **This job** | — |
| Student-facing gas volatility | SOL (micro, optional) | Isolated from WB | None |
| Yard lite (Tier 0) required? | Optional, gated | Hidden | **Required** |
| “Primary settlement of the protocol” | **No** | **No** | N/A (not a chain) |

If a sentence in slides, wallet copy, or an abstract assigns **both** chains the same job, that sentence is out of spec.

### 1.4 Why this split (systems rationale)

1. **Throughput vs. sovereignty.** Student micro-receipts are many, small, and latency-sensitive. Institutional governance is few, large, and delay-tolerant (2-day timelock floor). One VM that is “best at both” is a slogan, not a measurement. The prototype therefore **does not pick a winner L1**; it assigns jobs.
2. **Hardware.** Tier 0 clients already simulate the social ledger locally. Pushing every campus event onto either L1 would fail the Device B constraint. Solana is used only at the *convert* boundary; HyperEVM is not on the Yard lite hot path.
3. **Consumer protection.** Mixing WeixBucks into an EVM gas market would expose students to HYPE fee spikes and to a second token narrative. BI9’s missing WB hook is a **safety invariant**, not a missing feature.
4. **Referee repair.** IEEE-style review on 2026-08-27 recorded “two settlement ontologies.” Functional separation is the revision: one student micro-settlement prototype, one institutional backplane prototype, **zero** shared claim to “primary settlement.”

### 1.5 Claims this section does **not** make

- That either chain is production-ready or mainnet-settled for students  
- That WB → BKSPC conversion has completed on Devnet for a real user (supply is 0)  
- That BI9 is deployed with a live mint cap  
- That dual-chain is necessary for the campus social contribution  
- That BKSPC and BI9 are the same asset, wrapped, or auto-bridged  

---

## 2. Remaining study protocol (not executed)

These subsections exist so the optional track has a method if the authors continue. They are **not** results.

| ID | Question | Method (planned) | Status |
|----|----------|------------------|--------|
| §2 | Convert-path latency / fee vs local WB debit | Devnet convert tx vs `db.rs` ledger write on Device B | Not run — convert program undeployed |
| §3 | HyperEVM governance call cost (gas, delay) | Timelock propose → execute on chain 998; no WB involved | Skeleton tests only (`forge test`) |
| §4 | Client CPU / RAM with both panels open | Yard lite vs Full; HyperEVM panel hidden on lite | Wallet IA updated; no new Device B table |
| §5 | Ontology regression | Unit tests: WB ∉ HyperEVM assets; 1,000:1 locked; pillar copy | **In tree** (`power-of-2` + `hyperevm` tests) |

Until §2–§3 have numbers, the optional track is a **design partition + prototype inventory**, not a comparative performance paper.

---

## 3. Product mapping (so the study and the app do not diverge)

| Surface | Correct job line |
|---------|------------------|
| Wallet pillar 4 | **Settlement · Solana · BKSPC** → `#settlement` |
| Wallet HyperEVM panel | **Governance backplane · BI9** — no convert button |
| Landing economy card | BKSPC = earned micro-receipt, **not** governance |
| `BI9.sol` | Governance / finance asset; no WB |
| Anchor `bkspc` | Student convert + burn; not BI9 |

Code lock: `Code-Companion/artifacts/blkspace/src/lib/power-of-2.ts`.

---

## 4. One sentence for the podium (if asked)

> We prototype two chains with different jobs: Solana Devnet as student micro-settlement of earned WeixBucks into BKSPC, and HyperEVM as an institutional BI9 governance backplane that never touches WeixBucks. Neither is the primary settlement layer of BlkSpace.

If time is short, **omit this track**. The core contribution does not depend on it.
