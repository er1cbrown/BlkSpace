# Active focus (2026-10-08)

**Canonical on-chain asset is BKSPC on Solana.** BI9 / HyperEVM is retained as code but is
**not deployable by this operator** — Hyperliquid geo-restricts the US. Decision record:
[`docs/canonical-chain-decision.md`](docs/canonical-chain-decision.md).

| Tree | Status |
|------|--------|
| **Solana BKSPC** | **Canonical.** Earned WeixBucks settle into it at 1,000 WB = 1 BKSPC on Solana devnet. Non-rewarding staking plus allowlisted timelocked governance. Minting requires the on-chain `minter` and is bounded by a one-way `cap` that governance can only lower. Blocked on devnet SOL for the first real deploy. |
| **HyperEVM / BI9** | **Retained, not deployable.** Hyperliquid geo-restricts the US; this operator is in Tennessee. `DeployMainnet.s.sol` only accepts chain 999, so the old plan was never executable. 38 forge tests still pass against the retained contracts. Leave as reference. Do not deploy. |
| **Order book listing** | OpenBook v2 (CLOB on Solana, open source, permissionless) is the intended venue. Raydium/Orca are constant-product AMMs — a different venue type, not a better one. Sui/DeepBook v3 stays open as a later fallback if liquidity proves too thin; do not pre-empt that. |
| **`rustytempleOS/`** | Paused (Phase 1 VFS still next on that tree) |
| **BlkSpace campus app** | Keep shipping WeixBucks / Yard. Do not delete assets, keys, or CI. |

## Hard rules

- Never auto-convert WeixBucks.
- BKSPC staking pays **no reward**; staked BKSPC is governance weight and nothing else.
- No governance action can raise the supply cap. It activates once, then only decreases.
- No presale, no market-maker arrangement, no investor-return framing. People may buy
  BKSPC freely at market price with no preferential access.
- **No paid launch before legal review.** Selling a token with staking and governance
  carries securities exposure in most jurisdictions including the US, and it does not change
  with the chain.
- **No mainnet value before an external audit** — `docs/bkspc-devnet-runbook.md` step 5.

## Blocked on the operator

| Blocker | Action |
|---|---|
| Push | Authorize `workflow` scope: `gh auth refresh -h github.com -s workflow` |
| Solana devnet deploy | Send devnet SOL to `5WuhGYdC5xRruWXzwikzFbpEmJrDAN14iPTm6hGMCSNo` |
| Key backups | Encrypt `backup-bkspc-keys`; `devnet/deployer.json` and `~/.config/hyperevm/testnet.pk` have no seed phrase |
| Anchor tests | This CPU lacks AVX, so no local `solana-test-validator`. CI runs them. |