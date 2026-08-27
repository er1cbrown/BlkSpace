# BLKSHI

**Status:** Spec — private / advanced only. **Not authorized for public US launch.**  
**Inspiration:** Kalshi-style event contracts (product, not a license or DCM claim)  
**Chain:** HyperEVM first; HyperCore order book only if needed later  
**Decision:** [`finance-l1-strategy.md`](finance-l1-strategy.md) · Collateral in via [`blkbridge.md`](blkbridge.md) · Token rules: [`tokenomics.md`](tokenomics.md)

BLKSHI is the **finance desk** attached to BlkCore. It is not the college-town home screen.

---

## 1. Audience and gate

| Who | Access |
|---|---|
| New / campus users | **No.** Feed, yards, WeixBucks only. |
| Advanced users | Opt-in desk after an explicit gate. |

**Gate (product, not legal advice):**

1. Separate route from `/feed` (e.g. `/blkshi` or `/finance`)
2. First-run sheet: you can lose the stake; not a sportsbook; not guaranteed yield; not WeixBucks
3. Acknowledge risk + “I am using advanced mode”
4. Feature flag off in Yard student builds unless explicitly enabled

Social identity (Nostr) stays off the ticket tape. Bind a HyperEVM address as a **trading account**, not as the campus profile.

---

## 2. Product loop

```
Existing portfolio (user already holds assets)
        ↓
BlkBridge → HyperEVM (stables, HYPE, later BI9)
        ↓
BLKSHI desk
   • event contracts (yes/no or defined outcomes)
   • hedge / finance an existing book
   • HYPE stake as fee tier, collateral, or protocol bond
        ↓
Settlement on HyperEVM
        ↓
Optional return to BlkCore creator tools (no auto profit share into WB)
```

Portfolio financing here means: **keep or hedge exposure you already have**, while posting collateral. It does not mean “borrow against likes.”

---

## 3. Markets (event contracts)

### v1 shape

Kalshi-style **binary** (yes/no) or **categorical** contracts with:

| Field | Rule |
|---|---|
| `question` | Plain language, closed-ended |
| `outcomes` | Fixed at create time (e.g. Yes / No) |
| `resolution_source` | Named **before** listing (URL + what counts as final) |
| `resolution_time` | Window, not “whenever an admin feels like it” |
| `tick_size` / `lot` | Discrete prices, e.g. 1¢–99¢ if using probability-style quotes |
| `cap` | Per-user and per-market notional caps in v1 |
| `collateral` | HyperEVM stable and/or HYPE (BI9 later) |

No open-ended “what will happen?” markets. No sportsbook framing. No campus gossip markets in v1.

### Resolution sources (required)

Every listed contract names **one** primary source and an optional backup, for example:

- A specified public data page (agency print, official result)
- A specified timestamped feed
- A specified third-party index **with a URL**

Admin resolution without a predeclared source is **not** a v1 market type.

If the source is missing or contradictory at expiry: **void and return collateral**. Do not “house decide.”

### What v1 will not list

- University sports as a public book
- Individual students / faculty as underlyings
- Markets whose resolution is “the BlkSpace team”
- Anything marketed as a guaranteed return

Town- or campus-level markets: **later, and only after counsel**.

---

## 4. Collateral and portfolio financing

### Allowed collateral (v1)

| Asset | Role |
|---|---|
| HYPE (native or staked sleeve) | Fee tier + optional margin |
| Stables on HyperEVM (USDC-class) | Primary margin for event contracts |
| BI9 | **Not v1.** Later fee / collateral token |

### Financing meaning

1. User bridges in assets they already own ([`blkbridge.md`](blkbridge.md)).
2. User posts collateral into a BLKSHI account (HyperEVM).
3. User may:
   - buy/sell event contracts to **hedge** a view they already have, or
   - keep spot exposure and use HYPE stake as a **membership / margin sleeve**
4. Liquidation / loss is possible. UI must say so **before** the first order.

### Isolation

- BLKSHI collateral is not WeixBucks
- BLKSHI PnL does not mint WB
- A blown desk does not wipe the campus profile
- The campus profile cannot be used as collateral

---

## 5. HYPE stake tiers

Stake is **membership / collateral / bond**, not a savings account.

| Sleeve | What the stake does | Yield language |
|---|---|---|
| **Fee discount** | Higher staked HYPE → lower taker/maker bps on BLKSHI | “Reduced fees,” never “earn” |
| **Collateral** | Counts toward initial / maintenance margin | “At risk,” never “locked yield” |
| **Protocol role** | Relay operator bond or market-resolution bond | “Slashable if you misbehave” |
| **Incentives (optional, later)** | Variable program, explicit budget | “May change or end; not guaranteed” |

### Skeleton parameters (code, not a promise)

Implemented in `Code-Companion/artifacts/hyperevm` staking contract. Numbers are **placeholders** until markets exist:

| Tier | HYPE staked (placeholder) | Fee discount (placeholder) |
|---|---|---|
| 0 | 0 | 0 bps |
| 1 | ≥ 1 HYPE | −10 bps |
| 2 | ≥ 10 HYPE | −25 bps |
| 3 | ≥ 100 HYPE | −50 bps |

Unstake **cooldown** (placeholder: 7 days) so the stake can actually back a position.

**Forbidden copy:** APY, “earn HYPE for posting,” “risk-free,” “as good as Kalshi yield.”

Kalshi is a regulated US DCM. BLKSHI is **not**.

---

## 6. Matching and later HyperCore

| Phase | Matching |
|---|---|
| v1 | HyperEVM contract: escrow + simple CLOB or RFQ is enough for private/advanced |
| Later | Attach HyperCore **only if** a real order book / shared liquidity is needed |

Do not build a second Hyperliquid. If the desk needs a professional book, use Core as an optional attach, with the destination still named in BlkBridge.

---

## 7. Risk, caps, and UI copy

Every order ticket shows:

- Max loss if the contract resolves against the user
- Collateral posted
- Stake still at risk (if used as margin)
- Resolution source + time
- “You can lose this stake.”

v1 caps (product; tune before any private beta):

- Per-market notional cap per address
- Daily loss circuit on the desk (pause new orders, not a bailout)
- Global pause on the market contract

No confetti on wins. No “you earned BI9 for using BlkSpace.”

---

## 8. Legal / regulatory (product constraints)

This section is **not legal advice**. It is a shipping brake.

- Kalshi is CFTC-regulated in the United States. Naming BLKSHI after that pattern is **inspiration only**.
- This spec does **not** authorize a public US event-contract book.
- Before any public US listing: **counsel**.
- Do not market as a sportsbook, lottery, or guaranteed yield.
- Keep the desk behind the advanced gate.
- Event contracts may be regulated by jurisdiction and by contract design.
- Campus markets need a separate review.

Private / staff / geo-restricted testing is a **different** decision from a public launch.

---

## 9. Relationship to WeixBucks and BI9

| Asset | In BLKSHI? |
|---|---|
| WeixBucks | **Never.** Not collateral, not prize, not bridge-in. |
| BI9 | Not v1 collateral. Later opt-in fee / bond token under [`tokenomics.md`](tokenomics.md). |
| HYPE / stables | Yes, via BlkBridge. |

No automatic WB → BI9 mint into a BLKSHI account.

---

## 10. v1 vs later

| v1 (private / advanced) | Later (gated) |
|---|---|
| Binary/categorical contracts, predeclared sources | BI9 as collateral or fee token |
| HYPE fee-tier + collateral sleeve | Variable, disclosed incentives |
| Caps, pause, void-on-bad-source | Counsel-reviewed campus markets |
| HyperEVM settlement | HyperCore book if actually needed |
| Feature-flagged UI | Any public US listing |

---

## 11. Non-goals

- Student-feed prediction widgets
- “Use BlkSpace and get rich”
- Admin-resolved rumor markets
- Custodial betting accounts
- Shipping before BlkCore is the working product

---

*BLKSHI is a gated desk on HyperEVM. Inspiration is not authorization.*
