# BlkSpace Economy Policy (Published)

**Status:** Implemented in `db.rs` + wallet UI  
**On-chain token:** **BKSPC** (`BlkSpace Settlement`)  
**Gate:** Devnet simulated until counsel approves mainnet listing/trading rules

---

## What this is (honest)

BlkSpace is a **creator economy for the yard** — not a prediction market, not a copy of any exchange brand.

| Layer | Name | Role |
|-------|------|------|
| **WeixBucks (WB)** | Off-chain credits | Earn from posts, yards, node work. Spend in-app. **Never purchasable with real money.** |
| **Karma** | Reputation | Leaderboard / visibility only. **Never spendable, never convertible to WB.** |
| **BKSPC** | Solana SPL (Phase 4+) | On-chain settlement of **earned** WB after eligibility. **May become tradable** (DEX, perps, etc.) **only after** counsel + compliance — not promised today. |

HBCU cultural grounding is **community context**, not a reason to hide economics. Same transparency rules apply to every user.

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

## We will never (pre-counsel defaults)

1. Sell WB for USD or card payments  
2. Market BKSPC with ROI / “moon” / guaranteed profit language  
3. Mint BKSPC to team wallets before public eligibility rules ship  
4. Run yard **prediction markets** for real money without separate regulatory review  
5. Hide fee or throttle rules from the wallet UI  

Counsel may approve **additional** products (e.g. compliant BKSPC secondary trading). That is a **new** gate, not a silent pivot.

---

## Student one-pager

See in-app **Economy terms** on `/wallet` and `docs/economy-student-terms.md`.

---

## Implementation map

| Piece | Location |
|-------|----------|
| Policy constants | `db.rs` → `TokenomicsPolicy::published()` |
| Appeals | `economy_appeals` table, `submit_economy_appeal` |
| UI | `EconomyPolicyPanel`, `EconomyTermsCard`, `EconomyAppealCard` |