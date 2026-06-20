# Solana Smart Contract Security for BlkSpace

**Status:** Phase 0 — Foundational (Phase 4 implementation)  
**Last Updated:** 2026-06-15  
**Related:** `security-considerations.md`, `reward-formulas.md`, `plan.md`

---

## 1. Executive Summary

Solana is planned for **Phase 4** only:

- BKSPC SPL token and reward claims
- NFT tickets (DJ mixes, events)
- Optional staking for Tier 2 relay operators

**Principle:** Solana handles **high-value settlement**. WeixBucks and most social features stay off-chain (Nostr + Iroh).

---

## 2. Why Solana Security Differs from EVM

| Aspect | Solana | Implication |
|--------|--------|-------------|
| State | Stateless programs + separate accounts | Manual account validation required |
| Auth | Explicit `is_signer` + owner checks | Easy to omit checks |
| Math | No overflow protection by default | Use `checked_*` everywhere |
| Upgrades | Programs upgradable by default | Upgrade authority is a risk |
| Tooling | Anchor recommended | Industry standard 2026 |

---

## 3. Threat Model (On-Chain)

- Sybil farms forging reward claims
- Compromised relay operators abusing staking
- Economic attackers gaming conversion timing
- Compromised upgrade authority keys

**Assets:** BKSPC supply, mint authority, staked collateral, NFT rights.

---

## 4. Common Vulnerabilities

| Vulnerability | BlkSpace relevance | Mitigation |
|---------------|-------------------|------------|
| Missing signer/owner checks | Claims, staking | Anchor `Signer<'info>` + constraints |
| Improper PDA derivation | Per-user reward accounts | Canonical seeds + stored bump |
| Integer overflow | Reward math | `checked_add`, `checked_mul` |
| Unsafe CPI | SPL Token, Metaplex | Never trust user program IDs |
| Reinitialization | Stake epochs | `init` + realloc guards |
| Economic gaming | WeixBucks → BKSPC | Cooldowns, caps, engagement signals |
| Centralized upgrade key | All programs | Multisig + timelock |

---

## 5. Architecture Requirements

### Use Anchor for all BlkSpace programs

### Core patterns

- Strict signer checks on privileged instructions
- Canonical PDA derivation (never hardcode bumps)
- Checked arithmetic on all reward calculations
- Capability-based access (role-specific PDAs)
- Multisig timelock on upgrade authority
- Economic guardrails: rate limits, minimum stake periods, slashing multi-step

### Per-program notes

**Reward distribution:** Per-user + per-epoch PDAs; explicit `claimed` flag; vesting for large claims.

**Staking (relay ops):** Separate stake accounts; multi-step slashing; governance for parameter changes.

**Token/NFT:** PDA-controlled mint authority; consider revoking mint after distribution phase.

---

## 6. Development Lifecycle

| Phase | Action |
|-------|--------|
| 0–2 | Threat model on paper; document on-chain vs off-chain boundaries |
| 3 | Test plan + audit budget |
| 4 | Anchor implementation, fuzzing, internal review, **professional audit before mainnet** |
| Post | Bug bounty, monitor anomalous claims |

**Tools:** Anchor, `anchor test`, `cargo-fuzz`, OtterSec/Zellic/Neodyme-class audits.

---

## 7. Actionable Next Steps

- [x] Devnet mint + 2-of-2 treasury multisig (`docs/bkspc-devnet-runbook.md`)
- [x] SPL `mint_to` wired behind `bkspc-devnet` Cargo feature
- [ ] Finalize what moves on-chain vs stays on Nostr (Phase 3 decision)
- [ ] Write instruction-level threat model before coding
- [ ] Budget professional audit in Phase 3 planning
- [ ] No mainnet value until audit complete
- [ ] Counsel sign-off before DEX / trading / listings