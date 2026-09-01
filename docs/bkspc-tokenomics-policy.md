# BKSPC Tokenomics Policy

**Status:** Proposed – Phase A (Devnet) — **not** the canonical coin home  
**Date:** 2026-08-25  
**Token:** BKSPC (BlkSpace Coin) — Solana prototype name  
**Chain:** Solana (Devnet first) — **not** the home of BI9

> **Canonical on-chain asset is BLACKINCCOIN (BI9), ERC-20, on HyperEVM.**  
> Read [`tokenomics.md`](tokenomics.md) and [`finance-l1-strategy.md`](finance-l1-strategy.md) first.  
> This file keeps the earlier Solana earned-settlement lock (Design 1) as a **historical / optional** note. It does **not** define BI9 minting. WeixBucks still do not auto-convert.

**Related (canonical):** [`tokenomics.md`](tokenomics.md) · [`blkbridge.md`](blkbridge.md) · [`blkshi.md`](blkshi.md)  
**Related:** Design 1 – Earned Settlement + Fee-Burn Model  
**Repo path:** this file. Implementation tickets: [`bkspc-phase0-phase1-tickets.md`](bkspc-phase0-phase1-tickets.md). Published constants still live in [`tokenomics-policy.md`](tokenomics-policy.md) + `TokenomicsPolicy::published()`.

This document **locks Design 1 (earned settlement + fee-burn)** as the Phase A issuance model. Pump.fun / bonding-curve is **not** the primary mint path.

**Product chrome:** **BKSPC**. On-chain metadata name: **BKSPC Coin** (ticker **BKSPC**). Do not ship “BlkSpace” as the UI product name.

---

## 1. Purpose & Positioning

BKSPC is the **optional on-chain settlement receipt** for value already earned inside BKSPC as WeixBucks (WB).

It is **not**:
- An investment product
- A yield-bearing instrument
- A speculative trading vehicle
- A replacement for WeixBucks

It **is**:
- A portable, scarce, user-owned record of earned contribution
- Created only from real platform activity
- Gated by reputation (Yard Cred) and eligibility rules
- Designed so that platform usage creates scarcity

**Official positioning language (required in all UI):**  
> “Optional on-chain settlement of earned value. No guaranteed value or price. Not investment advice.”

---

## 2. Core Rules (Locked for Phase A)

| Rule | Specification |
|------|---------------|
| **Issuance** | Only by converting earned WeixBucks |
| **Ratio** | **1,000 WB → 1 BKSPC** (fixed). Change requires counsel + governance |
| **Direction** | **One-way only**. No BKSPC → WB conversion |
| **Eligibility** | Must pass all gates: Yard Cred threshold, account age, minimum activity/posts, weekly conversion cap, cooldown |
| **Team / Insider Allocation** | **0%** at genesis |
| **Private Sale / Presale** | **None** |
| **Launch Style** | Community-aligned, controlled mint via protocol |
| **Primary Value Accrual** | Usage + fee burns create scarcity |

---

## 3. Fee & Burn Model

| Activity | Fee | What happens to the fee |
|----------|-----|-------------------------|
| Tip / Send (WB) | 2% | Burned (reduces WB supply) |
| Marketplace (WB) | 5% | Burned (reduces WB supply) |
| Settlement (WB → BKSPC) | 1% | Burned (or collected then burned) |

Burned value permanently reduces circulating supply of the soft or hard currency and is the primary scarcity mechanism.

---

## 4. On-Chain Architecture (Solana)

### 4.1 Token Standard
- **Token-2022** (Token Extensions Program)
- Enables future transfer-fee extension, on-chain metadata, and better control
- Decimals: **6** for a new Token-2022 mint. Existing classic-SPL example mint used **9** — do not mix decimals on the same mint.

### 4.2 Mint Authority
- Initially held by a **Program Derived Address (PDA)** or multisig + timelock
- Only the authorized `convert` instruction may mint
- Authority can later be further restricted or renounced according to policy

### 4.3 Conversion Flow (High Level)

1. User requests conversion of X WB
2. App runs `evaluate_withdraw_eligibility`
3. If eligible:
   - Debit X WB (+ 1% settlement fee) from user
   - Call on-chain `convert` instruction
   - Mint `(X * 0.99) / 1000` BKSPC to user’s Associated Token Account
4. Record the full event in local DB + Nostr audit trail
5. Update Transaction History

### 4.4 Instruction Outline (Conceptual)

```text
convert_wb_to_bkspc(
  user: Signer,
  amount_wb: u64,               // amount user wants to convert (before fee)
  user_bkspc_ata: AccountInfo,  // user’s Associated Token Account
  mint: AccountInfo,            // BKSPC mint
  mint_authority: AccountInfo,  // PDA / authority
  token_program: AccountInfo,
  // ... remaining accounts
)
```

**Checks inside the instruction (or tightly coupled off-chain + on-chain):**
- Amount > 0
- User has sufficient eligible WB (enforced before call)
- Mint authority is correct
- ATA belongs to user

**Note:** Full eligibility (Yard Cred, weekly cap, cooldown) is enforced in the application layer before the transaction is built. On-chain focuses on safe minting.

### 4.5 Metadata
- Name: BKSPC Coin
- Symbol: BKSPC
- URI: points to a stable JSON metadata file (logo, description, links to policy)

---

## 5. Eligibility Gates (Application Layer)

All of the following must pass before a conversion transaction is created:

- Account age minimum
- Minimum posts / activity
- Yard Cred score ≥ threshold
- Weekly conversion volume remaining
- Cooldown period satisfied
- No active MIDF / abuse flags

Exact numeric thresholds live in `TokenomicsPolicy` / `reward-formulas` and must be visible to the user.

---

## 6. Supply & Scarcity

- No fixed hard cap required in Phase A (scarcity comes from burns + gated issuance)
- Every conversion is backed by previously earned and burned-fee activity
- Future options (Phase B+):
  - Token-2022 transfer fee that burns a small % on secondary transfers
  - Explicit max supply if governance decides

---

## 7. User Rights & Custody

- User always receives BKSPC in their own wallet / ATA
- The app never holds user BKSPC as custodian after successful mint
- Recovery of identity remains via Nostr recovery phrase
- On-chain assets follow normal Solana key management

---

## 8. Phased Rollout

### Phase A – Devnet (Current Target)
- Token-2022 mint live on devnet
- Controlled mint authority
- Full eligibility + conversion UI
- End-to-end successful conversion documented
- Strong disclaimers everywhere

### Phase B – Mainnet Preparation
- Counsel review of all settlement copy
- Multisig + timelock hardened
- Real-user and Cred gates satisfied (per existing project checklist)
- Mainnet mint created under same rules

### Phase C – Optional Enhancements
- Credibility-weighted caps / fees (Design 2)
- Transfer-fee extension
- Light governance (if ever desired)

---

## 9. Explicit Non-Goals (Phase A)

- No leverage or perpetual futures
- No staking yield
- No two-way bridge
- No insider / team allocation
- No price or ROI promises
- No public bonding-curve launch of the entire supply as the primary issuance method

---

## 10. Audit & Transparency Requirements

- Every conversion attempt (success or failure) is logged locally and on Nostr
- Transaction History shows clear “BKSPC Settlement” entries
- Fee amounts and burn status are visible
- Policy version is recorded with each conversion

---

## 11. Summary Table

| Element              | Phase A Decision                          |
|----------------------|-------------------------------------------|
| Token                | BKSPC (Token-2022)                        |
| Issuance             | Only from earned WB                       |
| Ratio                | 1,000 WB = 1 BKSPC                        |
| Direction            | One-way                                   |
| Team Allocation      | 0%                                        |
| Fees                 | Soft fees + 1% settlement → burned        |
| Authority            | PDA / multisig (controlled)               |
| Positioning          | Optional settlement of earned value       |
| Mainnet              | Only after documented gates               |

---

**This policy locks Design 1 (Earned Settlement + Fee-Burn) as the foundation for all BKSPC work.**
