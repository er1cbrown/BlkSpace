# BlkSpace Economy Policy (Published)

**Status:** Implemented in `db.rs` + wallet UI  
**Uniform model:** `creator-marketplace` — see `docs/economy-uniform-model.md`  
**On-chain token:** **BKSPC** (`BlkSpace Settlement`)

---

## What this is

BlkSpace runs a **creator marketplace economy** — the same class as Roblox (Robux + UGC shop), Fortnite (V-Bucks + item shop), and similar platforms.

| Layer | Name | Role |
|-------|------|------|
| **WeixBucks (WB)** | Soft currency | Earn from posts, yards, node work. Spend on tips and **creator marketplace**. **Not purchasable with USD.** |
| **Creator marketplace** | UGC shop | List media, mixes, themes, services, tickets. Buyers pay WB; sellers get net after 5% fee. |
| **Karma** | Reputation | Leaderboard / visibility only. **Never spendable, never convertible to WB.** |
| **BKSPC** | Settlement token (Phase 4+) | Optional on-chain settlement of **earned** WB after eligibility. Tradable on Solana only after legal review — not promised today. |

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

## Treasury / mint (planned mainnet)

- Mint path: **treasury multisig + timelock** only after WB debit + eligibility (`solana-security.md`)
- No insider presale mint
- Mint logs: SQLite + Nostr audit trail
- Ratio: **1,000 WB → 1 BKSPC** (fixed until counsel approves change)

---

## Platform rules

1. WB is earn-only — not sold for USD without a new reviewed product  
2. Creators sell in the marketplace for WB; fees are published  
3. Karma is reputation only — never spendable or convertible  
4. BKSPC mints only from earned WB after eligibility; on-chain listings require legal review  
5. Fees, caps, and throttle rules are never hidden from the wallet UI  

Counsel may approve **additional** products (e.g. compliant BKSPC secondary trading). That is a **new** gate, not a silent pivot.

---

## Student one-pager

See in-app **Economy terms** on `/wallet` and `docs/economy-student-terms.md`.

---

## Implementation map

| Piece | Location |
|-------|----------|
| Uniform model doc | `docs/economy-uniform-model.md` |
| Policy constants | `db.rs` → `TokenomicsPolicy::published()` |
| Labels | `lib/tokenomics.ts` |
| Appeals | `economy_appeals` table, `submit_economy_appeal` |
| UI | `WalletDisclaimer`, `EconomyPolicyPanel`, `CreatorMarketplacePanel` |