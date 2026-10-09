# Decision Record — Canonical chain is Solana / BKSPC

**Date:** 2026-10-08
**Status:** Active. Supersedes the "BI9 on HyperEVM is canonical" position held in
`AGENTS.md`, `FOCUS.md`, `docs/tokenomics.md`, and `docs/finance-l1-strategy.md`.

## What changed

**BKSPC on Solana is the canonical on-chain asset.** It carries earned WeixBucks
settlement, staking, and governance.

**BI9 on HyperEVM is retained as code but is not deployable by this operator.** It is not
the canonical mint, not a fallback, and not on the roadmap.

## Why

Hyperliquid geo-restricts the United States. Two independent IP geolocation services
place this operator in Nashville, Tennessee (`76.22.193.27`, Comcast AS7922, `proxy:
false`, `hosting: false`), and the Hyperliquid frontend returns a restricted-jurisdiction
response for that location. This is not a faucet problem, an access problem, or a stale
geolocation record — the restriction applies to the chain itself, on testnet and mainnet
alike.

`DeployMainnet.s.sol` reverts on any chain id other than 999, so the previous canonical
plan was never executable by this operator. Continuing to describe HyperEVM as canonical
would have sent every future agent and every reader down a path that cannot succeed.

## What was already built

The Solana tree is further along than the HyperEVM tree was, which makes this a change of
direction rather than a restart:

| Component | State |
|---|---|
| Anchor program, PDA mint authority | Compiles to BPF, 415 KB |
| `minter`-gated mint + one-way cap ratchet | Done, tested |
| Non-rewarding staking | Done, tested |
| Allowlisted timelocked governance | Done, tested |
| Settlement with refund-on-failure | Done, 195 Rust tests pass |
| BI9 Solidity suite | 38 forge tests pass, code retained |

## Why not rewrite on another chain

**Sui + DeepBook v3** is the strongest alternative if the goal is an on-chain central limit
order book without Hyperliquid's chain — open source Move package, roughly $13.75B lifetime
volume, sub-400ms finality, staking-based fee tiers.

It was rejected for now because BKSPC is Rust/Anchor and Sui is Move. Rewriting the token,
staking, governance, and settlement would discard finished, tested work.

**The order book is a separate, reversible decision.** A token does not need to live on
the same chain as its liquidity venue. OpenBook v2 is a central limit order book on Solana,
open source, permissionless listing, no geo-gate — the closest analogue to the Hyperliquid
experience available here. Raydium and Orca are constant-product AMMs with deeper
liquidity and no order book; that is a different venue type, not a better one.

Plan: list on OpenBook. If liquidity proves too thin for a real market, Sui/DeepBook stays
open as a later migration. Do not pre-empt that decision.

## Honest caveat

Solana is not perfectly decentralised either — a meaningful share of stake sits in a
handful of stake pools, which is a standing criticism of the network. The relevant
difference is choice: at the listing layer Solana is *more* open than Hyperliquid, since
anyone can create an OpenBook market permissionlessly, whereas HyperCore listings are
curated. At the validator layer Hyperliquid has a far smaller set by design, and that was
not a choice available to this operator.

## Unchanged

- **WeixBucks stay off-chain.** Never auto-converted. BKSPC settlement is explicit,
  user-initiated, and gated.
- **Staking pays no reward.** Staked BKSPC confers governance weight and nothing else.
- **The supply cap is a one-way ratchet.** Activates once, then only decreases.
- **No presale, no DEX integration, no market-maker arrangement, no investor-return
  framing.** People may buy BKSPC freely at market price with no preferential access.
- **BI9's `cap` stays 0 and `minter` stays `address(0)`.** Nothing in this repo can change
  that without a queued proposal on a timelock that has never been deployed.

## Open items

1. **Legal review before any paid launch.** Selling a token with staking and governance
   attached carries securities exposure in most jurisdictions, including the US, and it does
   not change with the chain. `docs/blkshi.md` is already marked *not authorized for public
   US launch*. This is a gate on raising money, not on building.
2. **External audit** before mainnet value, per `docs/bkspc-devnet-runbook.md` step 5.
3. Solana devnet deploy — blocked on devnet SOL.
## Repo changes in this conversion

| Area | Change |
|---|---|
| `AGENTS.md` | Canonical asset is BKSPC/Solana. Rule `6c` added: do not deploy to HyperEVM. |
| `FOCUS.md` | Rewritten as the Solana-canonical status board, with the blocked-on-operator list. |
| `docs/tokenomics.md` | Header repointed to Solana/BKSPC/SOL; prior HyperEVM position kept as superseded. |
| `docs/economy-canonical.md`, `docs/finance-l1-strategy.md` | Amendment banners; the WB→BI9 "never" invariants noted as partly moot. |
| `artifacts/hyperevm/README.md` | Retained-not-deployable banner. Contracts and tests kept. |
| `artifacts/hyperevm/deployments/*.json` | `canonical: false`, `supersededBy: solana/bkspc`, explicit never-deployed status. |
| `src/lib/power-of-2.ts` | `canonicalErc20`/`optionalSolanaPrototype` replaced by `canonicalSolana`/`retainedHyperEvm`; new `hyperEvmDeployable()`. |
| `src/lib/hyperevm.ts`, `src/lib/bkspc-config.ts` | Gate copy corrected. BKSPC copy now states the cap ratchet, no-reward staking, and no presale. |
| `src/pages/wallet.tsx`, `BkspcMainnetPanel.tsx` | User-facing copy no longer claims a BI9 canonical mint or a funded HyperEVM path. |
| `src/pages/hub.tsx` | Fixed a pre-existing `no-empty-function` lint **error** on `main` (not introduced here). CI lint was red before this change and would have blocked the new `bkspc` jobs from ever running. |

Six other docs still reference HyperEVM in passing (`docs/INDEX.md`, `docs/README.md`,
`docs/ROADMAP.md`, `docs/blkshi.md`, `docs/blkbridge.md`, IEEE papers). Those need a
consistency pass; the governing files and the decision record are already correct, so they
will not send anyone down a dead path.
