# BlkBridge

**Status:** Spec (v1 not shipped)  
**Product:** Yard-class / HyBridge-class **surface** for moving value into BlkFinance  
**Chain:** HyperEVM (canonical) · HyperCore accounts as explicit destinations  
**Decision:** [`finance-l1-strategy.md`](finance-l1-strategy.md) · Token rules: [`tokenomics.md`](tokenomics.md)

BlkBridge is a **product in the app**, not a new lock-and-mint bridge protocol. v1 routes through rails that already exist.

---

## 1. Job

Move assets a user **already holds** onto the BlkSpace finance layer with as little friction as possible, and always tell them **where the money will sit**.

| In | Out |
|---|---|
| Stables, HYPE, SOL, common L2 assets | HyperEVM wallet (BI9 / HYPE / stables) |
| HyperEVM balances | HyperCore Spot or Perps (when the user asks) |
| Portfolio collateral | BLKSHI desk (later) |
| Finance-layer proceeds | User wallet on the destination they picked |

**Never in:** WeixBucks. WB does not leave the app and is not a bridge asset.

---

## 2. Destinations (must be named in the UI)

The user picks **one** destination before signing. Do not hide HyperCore vs HyperEVM behind a generic “deposit.”

| Code | Label in UI | What it means |
|---|---|---|
| `hyperevm` | **HyperEVM wallet** | ERC-20 / native HYPE on HyperEVM. Default for BI9 and BLKSHI. |
| `hypercore-spot` | **HyperCore Spot** | Hyperliquid spot clearing. Only when the user needs Core spot. |
| `hypercore-perps` | **HyperCore Perps** | Hyperliquid perps margin. Only when the user needs Core perps. |

Default for “Enter BlkFinance”: `hyperevm`.

If a quote cannot reach the chosen destination with the selected rail, **fail closed** — do not silently land funds on a different layer.

---

## 3. Rails (v1: existing infrastructure)

Prefer these in order. Do not invent a BlkSpace canonical bridge until a second home chain is a real requirement.

| Rail | Use for | Notes |
|---|---|---|
| **Official Hyperliquid deposit** | CEX / supported assets → HyperCore, then optional Core→EVM | First-party path; show Hyperliquid’s own ETA/fee language |
| **Across** | Fast EVM → EVM intents | Good for USDC-class deposits onto HyperEVM if supported |
| **Stargate / LayerZero** | EVM / L2 stables | Use only if HyperEVM is a supported destination at ship time |
| **deBridge** | Solana + EVM → HyperEVM | Primary Solana inbound candidate |
| **Garden** | BTC / intent-style if needed | Later; not v1 |

v1 **does not**:

- Run a BlkSpace lock-and-mint mint/burn of BI9 on a foreign chain
- Custody user keys
- Mix several destinations in one click
- Bridge WeixBucks
- Promise a fixed ETA

If no listed rail supports the pair, the UI says **unsupported pair** and stops.

---

## 4. Primary routes

### v1

1. **EVM L2 / Ethereum stables → HyperEVM** (USDC or equivalent)
2. **HYPE already on HyperEVM** — no bridge; just show balance and “Enter BlkFinance”
3. **Official Hyperliquid deposit → HyperCore**, then a **second explicit step** to HyperEVM if the user wants the EVM wallet
4. **Display BI9** once the ERC-20 exists (read-only if the user has none)

### Later

5. Solana → HyperEVM (deBridge or equivalent)
6. HyperEVM ↔ HyperCore spot/perps as a first-class toggle (still two named destinations)
7. Canonical BI9 representation on a second chain (only if wallet reach requires it)
8. Town-relay operator deposits
9. BLKSHI collateral onboarding ([`blkshi.md`](blkshi.md))

---

## 5. UX rules

BlkBridge should feel like a Yard kiosk, not a chain explorer.

### Copy

- “Deposit to **HyperEVM**” / “Deposit to **HyperCore Spot**” / “Deposit to **HyperCore Perps**”
- Fees and ETA in **plain language**: “You pay about $X. Arrival is usually N minutes. This is not instant.”
- “You can lose funds if you pick the wrong destination.”
- No “bridge WeixBucks.” No “cash out likes.”

### One-click “Enter BlkFinance”

Allowed only when:

1. Wallet is connected
2. Destination is `hyperevm`
3. A supported rail quote exists **or** the asset is already on HyperEVM
4. The user has passed the advanced-mode gate (BlkFinance is not the student home screen)

The button labels the destination. It does not say “invest.”

### Status row (always visible)

| Field | Example |
|---|---|
| Asset in | 100 USDC on Arbitrum |
| Rail | Across |
| Destination | HyperEVM wallet |
| Fee | ~$0.40 |
| ETA | 1–3 min typical |
| Status | quoting → signing → in flight → confirmed / failed |
| Tx links | source chain + destination chain |

Persist status locally so a closed window can resume the receipt.

### Failures

- Quote expired → re-quote, do not reuse the old fee
- User rejected signature → idle, no retry spam
- Rail timeout → “still pending; check the destination address” + explorer links
- Wrong destination selected → do not auto-correct; user must start over

---

## 6. Non-custodial rule

v1:

- User signs in **their** wallet
- BlkSpace never holds bridge liquidity
- BlkSpace never wraps WeixBucks as an IOU
- Quotes come from the rail’s public APIs / contracts
- If a rail requires a solver / relayer, disclose it: “A third-party filler completes this transfer.”

If a flow cannot be non-custodial, it is **out of v1**.

---

## 7. App placement

| Surface | Behavior |
|---|---|
| Student feed / Wallet WeixBucks | **No** BlkBridge entry |
| `/wallet` advanced | Collapsed “On-chain (HyperEVM)” — off by default |
| Explicit BlkFinance / BLKSHI | Full BlkBridge |

Do not put BlkBridge on the Yard home screen.

Identity: Nostr keys stay on BlkCore. Chain wallets are a **separate** advanced binding. Losing a HyperEVM key does not delete the campus account; losing the Nostr nsec does not move BI9.

---

## 8. Suggested data shape (app)

Local-only receipt (SQLite), not an on-chain BlkSpace contract:

```text
BridgeTransfer
  id, created_at
  src_chain, src_asset, src_amount
  dst_kind          // hyperevm | hypercore-spot | hypercore-perps
  dst_asset, dst_amount_quoted
  rail              // across | stargate | debridge | garden | hl-official
  fee_quoted, eta_seconds
  status            // quoting | signed | inflight | confirmed | failed | expired
  src_tx, dst_tx
  error_plain
```

No WeixBucks column. No “BI9 minted from WB” column.

---

## 9. Implementation notes

- Frontend: quote → review sheet → wallet send → poll rail + destination.
- Tauri: no custom rust bridge protocol. HTTP to rail APIs + wallet deep-link / injected provider.
- BI9 balance: `balanceOf` on HyperEVM once the token is deployed (`artifacts/hyperevm`).
- Tests: quote parsing, destination enum exhaustiveness, “WB excluded from asset list,” expired quote rejection.
- Feature flag: `blkfinance` / advanced mode. Yard build can compile with the UI stubbed.

---

## 10. Non-goals (v1)

- Custom canonical bridge
- HyperCore trading UI (that is Hyperliquid / later BLKSHI)
- Gasless meta-transactions as a requirement
- Campus-wide “deposit your WeixBucks”
- Hiding HyperCore vs HyperEVM

---

*BlkBridge v1 is a kiosk over other people’s rails. Destination naming is the product.*
