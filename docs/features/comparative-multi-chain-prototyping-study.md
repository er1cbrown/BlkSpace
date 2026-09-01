# Comparative Multi-Chain Prototyping Study

**Status:** Optional IEEE / systems track — **not** the core campus-social contribution  
**Date:** 2026-08-27  
**Freeze context:** IEEE preview pack + Device B smoke; dual-chain code exists under `Code-Companion/artifacts/solana/` and `…/hyperevm/`  
**Audience:** Program committee, faculty, counsel. Not student onboarding.

> This study is **optional**. The core paper remains a hardware-aware federated campus social system. **Canonical on-chain token is BI9 ERC-20 on HyperEVM.** Solana Token-2022 is an optional prototype. Do not present BKSPC as the mint home.

**Related:** [`../tokenomics.md`](../tokenomics.md) · [`../finance-l1-strategy.md`](../finance-l1-strategy.md) · [`../IEEE_CONFERENCE_PACK.md`](../IEEE_CONFERENCE_PACK.md) · [`../IEEE_REFEREE_REPORT_2026-08-27.md`](../IEEE_REFEREE_REPORT_2026-08-27.md) · [`four-pillar-economy.md`](four-pillar-economy.md)

---

## Abstract (study only)

BlkSpace already runs a closed-loop practice currency (WeixBucks) off-chain. The **canonical on-chain token is BI9, an ERC-20 on Hyperliquid HyperEVM**. A Solana Devnet Token-2022 (**BKSPC**) prototype also exists. A referee flagged two settlement ontologies when both were described as “the coin.” This study keeps **one canonical mint (ERC-20 / BI9)** and treats Solana as an **optional high-throughput prototype**, not a second home of the protocol token. WeixBucks never auto-mint BI9.

---

## Research question (optional track)

**RQ-P2.** Can a Solana Token-2022 prototype coexist with a canonical HyperEVM ERC-20 without both claiming to be the mint?

**Working claim.** Yes: **BI9 ERC-20 on HyperEVM is canonical.** Solana BKSPC may prototype high-throughput receipts. Only one asset is the protocol token. WeixBucks stay off-chain and do not auto-convert to BI9.

This document completes **§1 (role definition)**. Measurement (§2+) is not claimed as a finished experiment.

---

## 1. Define the “Power of 2” roles (functional separation)

“Power of 2” here is **architectural**, not a token-supply slogan. It means **two rails, one canonical mint**: HyperEVM **ERC-20 (BI9)** is the protocol token; Solana Token-2022 is optional scaffolding. A dual-chain diagram that labels both assets “the coin” is a failed design. The partition is:

| | **Optional prototype — Solana Devnet** | **Canonical — HyperEVM** |
|---|---|---|
| **Name** | High-throughput receipt prototype | Canonical ERC-20 + protocol governance |
| **Who** | Lab / Devnet convert experiments | Protocol, institutions, advanced BlkFinance |
| **Asset** | **BKSPC** (Token-2022) | **BI9** (**ERC-20**, BLACKINCCOIN) |
| **Canonical mint?** | **No** | **Yes** |
| **Touches WeixBucks?** | Prototype 1,000:1 path (undeployed) | **No** — contract has no WB hook |
| **Primary job** | Rapid state updates without bloating Tier 0 client CPU | On-chain home of BI9: routing, treasury, governance |
| **Gas / runtime** | SOL on Solana | HYPE on HyperEVM (chain id 999 / 998) |

**Invariant (non-negotiable):** we **are** doing ERC-20. BI9 on HyperEVM is the canonical on-chain token. Off-chain WeixBucks remain the live student loop. Solana must not be described as the mint home.

```
BlkCore (off-chain)
  WeixBucks · Yard Cred · Nostr · Iroh
           │
           │  no auto-bridge to BI9
           ✕
           │
     existing assets (HYPE, stables, later BI9)
           │
           ▼
┌──────────────────────────┐                    ┌──────────────────────────────┐
│ Optional  Solana Devnet  │                    │ Canonical  HyperEVM          │
│ Token-2022 BKSPC proto   │                    │ BI9  ERC-20  (the mint)      │
│ not the home of BI9      │                    │ governance + treasury        │
└──────────────────────────┘                    └──────────────────────────────┘
```

### 1.1 Optional prototype — Solana Devnet (Token-2022)

**Role.** Optional high-throughput, low-latency, low-fee **prototype** of earned-value receipts. **Not** the canonical mint.

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

### 1.2 Canonical — HyperEVM (BI9 ERC-20)

**Role.** Canonical on-chain home of **BLACKINCCOIN (BI9)**. ERC-20 on Hyperliquid HyperEVM. Also the venue for institutional routing, treasury, and protocol-role governance.

**Mechanic.** **BI9** is a real **ERC-20**. It **does not interact with WeixBucks**. That isolation is the student-protection property: campus practice credits are insulated from HYPE gas spikes. Solidity: no WB parameter, no convert instruction, cap `0` until timelocked governance. Stake sleeves (HYPE / BI9) are membership and collateral, **not** yield from posting.

**What HyperEVM is allowed to be**

- **Canonical mint** of **BI9** (ERC-20 on chain 999 / testnet 998)  
- Timelocked admin, minter, cap, and protocol-role bonds  
- Later BlkBridge destinations and BLKSHI *advanced* desks (opt-in, not Yard lite)  

**What HyperEVM is forbidden to be**

- A WeixBucks mint, burn, or 1,000:1 converter  
- A required screen on the Yard (4 GB) lite path  
- “We are not doing ERC-20”  

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
| Canonical protocol token | **No** | **Yes (ERC-20)** | N/A (not a chain) |

If a sentence in slides, wallet copy, or an abstract assigns **both** chains the same job, that sentence is out of spec.

### 1.4 Why this split (systems rationale)

1. **Throughput vs. canonical mint.** Solana may prototype many small receipts. The **winner for the protocol token is already picked: HyperEVM ERC-20.** Jobs still differ; the mint home does not.
2. **Hardware.** Tier 0 clients already simulate the social ledger locally. Pushing every campus event onto either L1 would fail the Device B constraint. Solana is used only at the *convert* boundary; HyperEVM is not on the Yard lite hot path.
3. **Consumer protection.** Mixing WeixBucks into an EVM gas market would expose students to HYPE fee spikes and to a second token narrative. BI9’s missing WB hook is a **safety invariant**, not a missing feature.
4. **Referee repair.** IEEE-style review recorded “two settlement ontologies.” The revision: **one canonical ERC-20 (BI9)**, one optional Solana prototype, **zero** second mint home.

### 1.5 Claims this section does **not** make

- That either chain is production-ready or mainnet-settled for students  
- That WB → BKSPC conversion has completed on Devnet for a real user (supply is 0)  
- That BI9 is deployed with a live mint cap  
- That we are skipping ERC-20 or that Solana is the canonical mint  
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
| Wallet pillar 4 | **On-chain · HyperEVM · BI9 ERC-20** → `#hyperevm` |
| Wallet HyperEVM panel | **Canonical ERC-20** — no WB convert button |
| Landing economy card | BI9 ERC-20 is the on-chain token |
| `BI9.sol` | Canonical ERC-20; no WB |
| Anchor `bkspc` | Optional prototype; not the mint home |

Code lock: `Code-Companion/artifacts/blkspace/src/lib/power-of-2.ts`.

---

## 4. One sentence for the podium (if asked)

> Canonical on-chain token is BI9, an ERC-20 on HyperEVM. Solana BKSPC is an optional Token-2022 prototype. WeixBucks do not auto-convert.

If time is short, **omit this track**. The core contribution does not depend on it.
