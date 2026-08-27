# BlkSpace Economy Policy (Published)

**Status:** Implemented in `db.rs` + wallet UI  
**Uniform model:** `creator-marketplace` — see `docs/economy-uniform-model.md`  
**On-chain token (canonical):** **BLACKINCCOIN / BI9** on **HyperEVM** — see [`tokenomics.md`](tokenomics.md)  
**Decision:** [`finance-l1-strategy.md`](finance-l1-strategy.md)

> **2026-08-26:** HyperEVM is the home of the on-chain asset. This file remains the **live WeixBucks** policy (fees, caps, marketplace). Solana **BKSPC** rows below are historical Phase A scaffolding, not the canonical mint.

**On-chain token (legacy Solana name):** BKSPC — optional wallet reach later, not BI9’s home.

---

## What this is

BlkSpace runs a **creator marketplace economy** — the same class as Roblox (Robux + UGC shop), Fortnite (V-Bucks + item shop), and similar platforms.

| Layer | Name | Role |
|-------|------|------|
| **WeixBucks (WB)** | Soft currency | Earn from posts, yards, node work. Spend on tips and **creator marketplace**. **Not purchasable with USD.** |
| **Creator marketplace** | UGC shop | List media, mixes, themes, services, tickets. Buyers pay WB; sellers get net after 5% fee. |
| **Karma** | Reputation | Leaderboard / visibility only. **Never spendable, never convertible to WB.** |
| **BI9 (BLACKINCCOIN)** | HyperEVM ERC-20 (canonical) | On-chain finance asset. **No automatic WB conversion.** See [`tokenomics.md`](tokenomics.md). |
| **BKSPC** | Solana (legacy scaffolding) | Earlier Phase A name / devnet path. Not the home of BI9. |

---

## Published fees (implemented)

| Activity | Fee | Constant |
|----------|-----|----------|
| Tip / send | 2% | `TIP_PLATFORM_FEE_BPS` |
| Marketplace | 5% | `MARKETPLACE_PLATFORM_FEE_BPS` |
| Withdrawal settlement | 1% | `WITHDRAW_SETTLEMENT_FEE_BPS` |

Fees are burned (reduce WB in circulation). Recipients receive **net** after fee on transfers.

---

## Abuse controls (published)

| Control | Value |
|---------|--------|
| Daily WB earn cap | 250 / rolling 24h |
| MIDF earn throttle | `overall_score > 0.7` → 0 WB earn (karma may still apply) |
| Withdraw eligibility | Age, karma, posts, weekly cap, cooldown — see `reward-formulas.md` |
| Self-like / self-reply | Blocked |

**Appeals:** Users can file `economy_appeal` in-app (earn throttle, withdraw denial, MIDF dispute). Human review before mainnet.

---

## Treasury / mint

- **Canonical on-chain mint (2026-08-26):** **BI9 on HyperEVM**, governance-capped, timelocked. **No automatic WeixBucks → BI9.** See [`tokenomics.md`](tokenomics.md). Skeleton: `Code-Companion/artifacts/hyperevm/`.
- **WeixBucks** stay off-chain. They are not bridged and not a mint input.
- **Legacy Solana Phase A (not canonical):** earned WB → BKSPC notes in [`bkspc-tokenomics-policy.md`](bkspc-tokenomics-policy.md) remain historical scaffolding / optional wallet reach. Do not treat the 1,000 WB → 1 BKSPC ratio as the BI9 issuance path.
- **Mainnet launch:** not a bonding-curve dump of supply. Pump.fun notes in `docs/bkspc-pumpfun-launch.md` are **not** the BI9 mint path.
- No insider presale mint implied by this policy
- WB ledgers: SQLite + Nostr audit trail (unchanged, live)

---

## Platform rules

1. WB is earn-only — not sold for USD without a new reviewed product  
2. Creators sell in the marketplace for WB; fees are published  
3. Karma is reputation only — never spendable or convertible  
4. BI9 minting is governance-controlled on HyperEVM; WeixBucks do not auto-convert; on-chain listings require legal review  
5. Fees, caps, and throttle rules are never hidden from the wallet UI  

Counsel may approve **additional** products (e.g. a reviewed WB→BI9 distribution, or Solana wallet-reach). That is a **new** gate, not a silent pivot.

---

## Student one-pager

See in-app **Economy terms** on `/wallet` and `docs/economy-student-terms.md`.

---

## Implementation map

| Piece | Location |
|-------|----------|
| Locked Phase A policy | `docs/bkspc-tokenomics-policy.md` |
| Phase 0–1 tickets | `docs/bkspc-phase0-phase1-tickets.md` |
| Uniform model doc | `docs/economy-uniform-model.md` |
| Policy constants | `db.rs` → `TokenomicsPolicy::published()` |
| Labels | `lib/tokenomics.ts` |
| Devnet mint init | `artifacts/solana/` → `bun run --filter @workspace/solana init-bkspc-devnet` |
| Appeals | `economy_appeals` table, `submit_economy_appeal` |
| UI | `WalletDisclaimer`, `EconomyPolicyPanel`, `CreatorMarketplacePanel` |