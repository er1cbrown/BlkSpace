# Canonical economy model

**Status:** **canonical.** Supersedes the eleven economy documents listed in §11
for any question of what an economy is, what settles it, or what converts to it.
Superseded documents remain valid only as historical design rationale.

**Date:** 2026-09-25
**Audience:** counsel, faculty, IEEE reviewers, engineering

**Two models are specified, deliberately.** BlkSpace's economy has two coherent
shapes, they are not variants of one another, and they imply different
companies. Both are written out in full because choosing between them is a
counsel decision, not an engineering one, and the choice determines most of
what follows.

| | **Model A — Mint only** | **Model B — BlkSpace operates** |
|---|---|---|
| BlkSpace's role | Mints and educates | Mints, educates, **and operates** |
| Speculation happens | On an external venue | **Inside BlkSpace** |
| BI9 tradable | Yes, externally | Yes, externally **and** internally |
| BLKSHI | Credits-staked markets | Credits **and** BI9-staked markets |
| Perpetual funding | None | **Required** |
| Oracle required | No | **Yes** |
| Insurance fund | No | **Yes** |
| Pillar 3 (Literacy) | Pedagogy | Pedagogy **+** risk disclosure |
| Regulatory surface | Mints a token | **Derivatives operator** |
| "Never lose real money in-app" | **Holds** | **Does not hold** |

The single sharpest difference: **Model B breaks the consumer-protection
invariant** (§4). That is not a defect to be engineered away — it is the
substantive trade being made, and it should be made explicitly.

---

## 1. The one-sentence version, per model

**Model A** — BlkSpace has one soft economy it controls and two cryptographic
layers whose speculative character comes from *external* tradability. BlkSpace
educates and mints; it is never the exchange.

**Model B** — The same three instruments, with BlkSpace additionally operating a
perpetual venue over the two speculative layers, so exposure, funding, and
liquidation occur in-app.

## 2. The three economies (common to both models)

| | Layer 1 — soft | Layer 2 — canonical | Layer 3 — internal markets |
|---|---|---|---|
| **Name** | WeixBucks (WB) | **BI9** (BLACKINCCOIN) | BLKSHI |
| **Form** | Off-chain SQLite credit | **ERC-20 on HyperEVM** | Binary / categorical contracts |
| **Priced in** | Nothing. Fixed internal rate | External markets | WB or BI9 (per model) |
| **Purchasable** | **No — never** | No inside BlkSpace | No |
| **Operator** | BlkSpace | BlkSpace mints | BlkSpace operates |
| **Status** | **Live** | Contracts written, **mint off** | **Not v1** |

### Naming clarification

**BKSPC is not an economy in this model.** It is the *nostalgic social media
layer* — a product and brand concept — and historically the Solana Token-2022
prototype. The `branding/README.md` line "Coin: **BKSPC**" is therefore wrong
and should read BI9 (§10).

## 3. What each layer is for

**WeixBucks** — the participation economy. Earned by posting, helping, and
completing work; spent on creator goods and Yard features. Daily caps and
diminishing returns prevent farming. Deliberately *non-purchasable*.

**BI9** — settlement and treasury asset. Canonical on-chain representation for
routing, treasury, and protocol-role governance. `BI9.sol` has no WeixBucks
parameter and the constructor states there never will be one.

**BLKSHI** — markets on campus events (attendance, yard outcomes, event
outcomes), resolved against declared outcomes.

## 4. The consumer-protection invariant

> **Model A:** a student can never lose real money inside BlkSpace.
> **Model B:** a student can, once BI9 or BLKSHI positions are opened in-app.

This is the load-bearing trade between the two models. Under Model A it holds
because:

- WB cannot be bought, sold, or withdrawn
- BLKSHI stakes credits, never BI9 and never fiat
- BI9's exposure happens on a venue BlkSpace does not operate or intermediate
- Pillar 3 (**Literacy**) stays purely pedagogical

Under Model B the invariant fails by construction: a user with a BI9 position
can be liquidated. Therefore **Model B requires** a segregated collateral
boundary, a loss-cap or negative-balance rule, and a jurisdiction analysis
*before* any position can be opened.

## 5. Conversion rules — definitive in both models

| From → To | Rule | Status |
|---|---|---|
| WB → BI9 | **Never.** No parameter, no function, no bridge. | **Invariant** |
| BI9 → WB | **Never.** | **Invariant** |
| WB → USD | **Never.** Non-purchasable. | **Invariant** |
| WB → BLKSHI | Credits staked into a contract. | Not v1 |
| BLKSHI → WB | Payout on settlement. | Not v1 |
| BLKSHI → BI9 | **Model B only.** Stake/payout denominated in BI9. | Not v1 |
| BI9 ↔ USD | **Model B only, internal.** External otherwise. | Not v1 |
| Any auto-bridge | **None exists.** `BlkBridge` never auto-mints. | **Invariant** |

**"Never" means never, not "not yet."** Changing one of those rows is an
amendment to this document requiring counsel, not a code change.

## 6. Model A — mint only

### 6.1 What settles what

| Instrument | Reference price | Settlement venue | Oracle |
|---|---|---|---|
| WB | None — closed loop, internal rate | In-app, credits only | None needed |
| BI9 | External market price | External DEX | External, not ours |
| BLKSHI | Declared binary/categorical outcome | In-app, credits only | Outcome attestation |

BlkSpace maintains **no oracle, no funding engine, and no liquidation engine**,
because it operates no derivatives. This is the entire operational saving of
Model A, and it is larger than it first appears: an oracle plus a funding engine
is a permanent security and operational liability.

### 6.2 What BlkSpace would still owe users

Education on funding rates, basis, leverage, and liquidation — as content, in a
user's own time, with no position. Pillar 3 unchanged.

## 7. Model B — BlkSpace operates

### 7.1 Feasibility finding: WB perps are incoherent

A perpetual instrument needs something to be perpetual *against*. WeixBucks has
no external reference price and BlkSpace is the only party holding it. So a
"WB perpetual" would have BlkSpace quoting both sides of its own market with no
independent price discovery. That is not a market; it is a house game with a
ledger.

**Therefore: in Model B, WeixBucks may stake BLKSHI contracts, but may not
underlie a perpetual position.** WB remains strictly non-speculative in both
models. This is not a policy choice — it is a consequence of WB having no
external price.

The two speculative layers are therefore:

- **BI9 perpetuals** — index is the external BI9 price. Feasible.
- **BLKSHI contracts** — resolve against declared event outcomes. Feasible, and
  these are prediction markets, which resolve rather than "fund."

### 7.2 Required mechanics

*Design proposal, not a production spec. Requires security review before
implementation.*

**Mark vs index price.** Two distinct prices: *index* from external venues
(manipulation-resistant, median of sources); *mark* from BlkSpace, used for
margin and liquidation. Without this separation a single venue can be used to
liquidate a position.

**Funding rate.** Periodic long↔short transfer. Standard form:

```
funding_rate = clamp(basis_rate + clamp(interest_rate − premium_rate, −0.05%, +0.05%))
```

Basis is `(mark − index) / index`. Premium decay pulls funding back toward
par. Interval must be fixed and announced — hourly or 8-hourly, not
operator-chosen per call.

**Margin and liquidation.** Maintenance margin, tiered by size; liquidation
when `margin_ratio < maintenance_margin`. Liquidation must be marked and
settled at the index price, never the mark, to remove the operator's incentive
to move the mark against a position.

**Insurance fund and ADL.** Per-trade fees accumulate into an insurance fund. It
absorves short-bankruptcy shortfalls first; beyond it, **auto-deleveraging**
retires the most profitable opposing positions. Without ADL the venue itself can
be bankrupted by one position.

**Limits.** Tiered maximum leverage and per-account position caps. Caps must be
set at launch and lowered — not raised — without notice on adverse conditions.

**Risk controls.** A kill switch that halts new positions, a price-deviation
circuit breaker, and reconciliation between index and mark.

### 7.3 What Model B additionally requires

- **Segregated collateral.** BI9 backing positions must be segregated from
  treasury and from user-to-user balances.
- **Loss-cap rule.** A decision on whether a liquidated user's BI9 balance can
  go negative. This single decision determines whether the venue is a
  derivatives operator or a gambling operation in the eyes of a regulator.
- **Oracle integrity.** BlkSpace becomes dependent on external price feeds it
  does not control, and inherits their failure modes.
- **Jurisdiction and licensing analysis.** Offering perps to users is
  materially different from minting a token, in most jurisdictions.
- **Security review.** Funding + liquidation + oracle is the canonical triple
  of DeFi exploits.

### 7.4 The honest cost

Model B converts a campus social app with a token into a **derivatives
operator** with a social app attached. That is a different company, a different
regulatory posture, a different security burden, and a different paper. It is
not a more advanced version of Model A. Reviewers will read it as a different
project entirely.

## 8. Conflict resolution — the referee question

A prior IEEE-style review recorded **"two settlement ontologies"** when multiple
assets were all described as "the coin." The resolution is structural rather
than declarative: the three layers are **different kinds of instrument** with
different settlement venues and different operators. They are not three answers
to one question.

Precedence, when two layers appear to conflict:

1. **Consumer protection (§4) wins over every other consideration.**
2. Canonical mint is **BI9**, singular.
3. Solana BKSPC is **prototype only**, never a mint home.
4. Any proposal creating a WB↔BI9 path is rejected at review, not at
   implementation.
5. Under Model B, §7.1 is non-negotiable: no WB-underlying perpetuals.

## 9. Choosing between the models

| If you want | Choose |
|---|---|
| Students protected, token tradeable, no derivatives risk | **Model A** |
| Students exposed to real leverage, a revenue-bearing venue | **Model B** |
| Fastest path to a defensible paper | **Model A** — less to build, less to defend |
| The full "1 soft + 2 speculative perpetual" vision, operated | **Model B** |
| Lowest regulatory and security liability | **Model A**, decisively |

A defensible hybrid exists and is worth naming: **build Model A, specify
Model B.** The instruments, the economic relationships, and the educational
content are shared; only §7.2 differs. That lets the venue decision be made by
counsel and users rather than by a build order, and it is what most of §7
already assumes.

## 10. Doc corrections this decision forces

| File | Correction |
|---|---|
| `public/images/branding/README.md` | "Coin: **BKSPC**" → BI9. BKSPC is the nostalgic product layer. |
| `v0.1.0-yard` release body | "Coin ticker: BKSPC" → BI9, or annotate BKSPC as prototype. |
| `FIRST_RUN.md`, `INSTALL.md` | "BKSPC" as the *app name* is acceptable **only if** it stops also being a ticker. |
| `WEIX_STACK.md`, `SEMESTER_LOCKIN.md` | Identity line lists "BKSPC BI9" — pick one. Also: these live **outside the repository**, so they are unreviewed and unversioned. |

## 11. Superseded documents

Retained for design rationale; **not authoritative** here.

`tokenomics.md` · `tokenomics-policy.md` · `bkspc-tokenomics-policy.md` ·
`economy-uniform-model.md` · `economy-student-terms.md` ·
`economy-fast-transparent.md` · `finance-l1-strategy.md` · `blkshi.md` ·
`blkbridge.md` · `beta-tokenomics-and-launch-strategy.md` ·
`features/use-case-fisk-finance-ieee.md`

Two contain positions that **contradict this document** and should be treated as
archived, not merely superseded:

- **`beta-tokenomics-and-launch-strategy.md`** — a pump.fun memecoin launch plan
  with explicit investor-return framing ("you profit by buying BKSPC…"). This is
  incompatible with §4 under either model. Either it is a historical artifact
  from an abandoned strategy or it is a live plan. **Leaving both in the
  repository is the actual risk**, because a reviewer who greps will find it.
- **`bkspc-tokenomics-policy.md`** — already self-describes as historical, and
  is the model the other ten should follow.

**`features/four-pillar-economy.md` remains authoritative** for the *product*
dependency order (Social Yard → Fair Earn → Credibility → Literacy →
Settlement). It does not conflict here: it describes how the product layers,
this document describes what the instruments are.

## 12. Open items requiring counsel, not engineering

1. Does minting an external-tradable token create a securities exposure,
   independent of operating a venue?
2. Under Model B, does offering perpetuals to consumers create broker/derivatives
   registration obligations, and in which jurisdictions?
3. The **loss-cap rule** (§7.3) — can a liquidated balance go negative? This is
   the single most consequential undecided question in Model B.
4. Is the Model A "speculation is external" boundary defensible, or does enabling
   it indirectly create broker exposure?
5. Do the pump.fun language and the not-an-investment claim coexist legally?
6. What disclaimer accompanies the BI9 on-ramp, and where must it appear?

**None of these are code questions, and none should be answered by an engineer
or an agent.**

## 13. Where this sits in the product stack

This document governs the **economy layer only**. It is independent of the
transport work, and neither blocks the other:

- [`DELIVERY_TIER_CONCEPT.md`](implementation/DELIVERY_TIER_CONCEPT.md) — which
  transport carries what. Unaffected by this decision.
- [`CURRENT_TOPOLOGY.md`](implementation/CURRENT_TOPOLOGY.md) — what is actually
  built. The economy is `WB live`, `BI9 contracts written, mint off`,
  `BLKSHI not v1`. No economy layer is deployable yet, in either model.
- `features/four-pillar-economy.md` — the product dependency order. Still
  authoritative for how the product layers.

An economy model with no implemented venue is a design document. That is fine
for a paper and fatal for a raise, which is the honest shape of this decision
today.
