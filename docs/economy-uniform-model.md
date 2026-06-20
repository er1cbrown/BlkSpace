# Creator Marketplace Economy (Uniform Model)

**Status:** Canonical framing for UI, docs, and `TokenomicsPolicy`  
**Model ID:** `creator-marketplace`

BlkSpace uses the **same three-layer pattern** as Roblox, Fortnite, Twitch bits, and other creator platforms. The optional Solana layer (BKSPC) is an add-on for settlement — not a different product category.

---

## Industry mapping

| BlkSpace | Roblox | Fortnite | Twitch | Role |
|----------|--------|----------|--------|------|
| **WeixBucks (WB)** | Robux | V-Bucks | Bits (earned/gifted) | Soft currency — earn from activity, spend in-app |
| **Creator shop** | UGC catalog | Item shop | Extensions | Creators list; buyers pay WB; platform fee |
| **Karma** | — | — | Channel points (non-cash) | Reputation / visibility only |
| **BKSPC** | DevEx (fiat payout) | — | — | Optional on-chain settlement of **earned** WB |

**What is uniform:** earn soft currency → tip creators → buy from creator marketplace → platform takes a published fee.

**What is BlkSpace-specific:** WB is **not purchasable with USD** (earn-only, like many closed-loop game economies). BKSPC is an **optional** Solana settlement path after eligibility — comparable to Roblox DevEx, not to buying Robux with a credit card.

---

## Three layers (one story)

### 1. Soft currency — WeixBucks (WB)

- Earn from posts, yards, engagement, node work
- Spend on tips, boosts, and **creator marketplace** purchases
- Daily cap: 250 WB
- **Not sold for cash** (closed-loop, same class as Robux/V-Bucks)

### 2. Creator marketplace

- Any user can **list** media, mixes, themes, services, tickets
- Buyers pay WB; sellers receive **net** after platform fee (5%)
- Delivery via Iroh CIDs / Nostr where applicable
- This is the standard UGC shop loop — not a separate “crypto product”

### 3. Optional settlement — BKSPC

- **1,000 WB → 1 BKSPC** after withdraw eligibility
- Devnet simulated until legal review approves mainnet
- Future DEX/perps listing = **new compliance gate**, not promised today
- One-way: no BKSPC → WB

---

## Published fees

| Activity | Fee |
|----------|-----|
| Tips / send | 2% |
| Marketplace | 5% |
| Withdrawal settlement | 1% |

---

## Platform rules (always visible in wallet)

1. WB is earn-only — not sold for USD without a new reviewed product
2. Creators sell in the marketplace for WB; fees are published
3. Karma is reputation only — never spendable or convertible
4. BKSPC mints only from earned WB after eligibility; on-chain listings require legal review
5. Fees, caps, and throttle rules are never hidden from the wallet UI

---

## Implementation

| Piece | Location |
|-------|----------|
| Policy | `db.rs` → `TokenomicsPolicy::published()` |
| Labels | `lib/tokenomics.ts` |
| Wallet UI | `WalletDisclaimer`, `EconomyPolicyPanel`, `CreatorMarketplacePanel` |
| Devnet mint init | `artifacts/solana/scripts/init-bkspc-devnet-mint.ts` |
| On-chain metadata | `artifacts/solana/metadata/bkspc-token.json` |
| Student terms | `docs/economy-student-terms.md` |

### Reserve BKSPC on devnet (ethical, no sale)

```bash
cd Code-Companion
solana config set --url devnet && solana airdrop 2
pnpm --filter @workspace/solana run init-bkspc-devnet
```

Writes `artifacts/solana/devnet/bkspc-mint.json` with mint address + Metaplex `BKSPC` symbol. Devnet only until counsel approves mainnet.