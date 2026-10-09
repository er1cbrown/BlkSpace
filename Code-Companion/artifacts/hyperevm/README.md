# BlkSpace BI9 (ERC-20) — targets Ethereum, not deployed

> **Repointed from HyperEVM to Ethereum on 2026-10-08.** Hyperliquid geo-restricts the United
> States, so chains 999 and 998 were never deployable by this operator. The contracts are
> chain-agnostic EVM at `evm_version = cancun` and compile unchanged for Ethereum, so
> `DeployMainnet.s.sol` now targets **chain 1** and refuses every other chain id.
>
> **BKSPC on Solana is still the canonical on-chain asset** — this is a secondary ERC-20 if
> a second asset is ever wanted. See
> [`docs/canonical-chain-decision.md`](../../../docs/canonical-chain-decision.md).
>
> Nothing is deployed yet: `cap` is `0`, `minter` is `address(0)`, and both manifests are
> empty. 38 `forge test` cases pass and `test-forge-hyperevm` runs them in CI. If you do
> deploy, keep cap at 0 and activate it only through a delayed timelock proposal.

| Contract | Job |
|---|---|
| `BI9.sol` | BLACKINCCOIN ERC-20. Cap `0` = mint disabled. No WeixBucks hook. |
| `StakeVault.sol` | Native + BI9 staking sleeves. Fee-tier view. **No rewards.** 7-day unstake cooldown. *Symbol names still say `Hype*` from the HyperEVM era — rename to `Eth*` if you keep it.* |
| `TimelockAdmin.sol` | Delayed admin. Owner of BI9 + vault. Delay floor **2 days**; `setMinDelay` / `transferAdmin` only via the timelock itself. |

This is **not** an Anchor program. **BI9 is the canonical ERC-20.** Solana Token-2022 is optional scaffolding, not the mint home.

## Chain

| Network | Chain ID | RPC | Explorer |
|---|---|---|---|
| Ethereum mainnet | 1 | `https://eth.llamarpc.com` | https://etherscan.io |
| Sepolia | 11155111 | `https://ethereum-sepolia-rpc.publicnode.com` | https://sepolia.etherscan.io |

Gas token is **HYPE** (`msg.value` in `StakeVault.stakeHype`). Addresses after a broadcast live in `deployments/`. Empty `bi9` means **not deployed yet**.

HYPE Core↔EVM system address: `0x2222222222222222222222222222222222222222` (official Hyperliquid path — not a BlkSpace contract).

## Setup

Requires [Foundry](https://book.getfoundry.sh/getting-started/installation).

```bash
cd Code-Companion/artifacts/hyperevm
forge install foundry-rs/forge-std --no-commit
forge test
```

## Deploy (testnet, chain 998)

Mint stays **off** until a timelocked `setCap` + `setMinter`. There is no WB → BI9 path.

The deploy needs HYPE for gas (about 0.001 HYPE at the 100 gwei testnet gas price — the
`drip` at <https://app.hyperliquid.xyz/drip> is the only source, and it is a UI action).
Testnet gas is free; mainnet gas is not.

```bash
export TIMELOCK_ADMIN=0xYourAdmin      # EOA that may PROPOSE. Admin of the timelock.
export TIMELOCK_DELAY=172800           # 2 days, seconds
export PRIVATE_KEY=0x...

# `hyperevm_testnet` is the official host. If forge fails with a TLS or empty-response
# error, the network is blocking it — use `hyperevm_testnet_fallback` instead.
forge script script/Deploy.s.sol:Deploy \
  --rpc-url hyperevm_testnet \
  --broadcast --private-key $PRIVATE_KEY

# Same command, but dry-run first to confirm addresses and cap:
forge script script/Deploy.s.sol:Deploy --rpc-url hyperevm_testnet
```

Review `deployments/last-run.json`, then copy it to `deployments/testnet.json`.

### Wiring the deployed address into the app

`deployments/testnet.json` is documentation only. The app reads the address from
`VITE_BI9_ADDRESS`, and an empty value is what makes `isBi9Deployed` false and keeps the
amber "BI9 not deployed" badge on `/wallet`.

```bash
export VITE_BI9_ADDRESS=$(jq -r .bi9 deployments/testnet.json)
export VITE_STAKE_VAULT=$(jq -r .stakeVault deployments/testnet.json)
export VITE_TIMELOCK=$(jq -r .timelock deployments/testnet.json)
export VITE_HYPEREVM_NETWORK=testnet
bun run build            # from artifacts/blkspace
```

Never set `VITE_BI9_ADDRESS` to a simulated address. `forge script` without `--broadcast`
prints real-looking addresses that do not exist on chain, and the app will then issue
`eth_call`s against empty accounts.

## Deploy (Ethereum mainnet, chain 1)

You need ETH for gas. The script **reverts on any other chain id** (verified: it reverts `WrongChain(11155111)` against Sepolia).

```bash
export TIMELOCK_ADMIN=0xYourAdmin   # required; proposer EOA, not the token minter
export TIMELOCK_DELAY=172800        # must be >= 2 days
forge script script/DeployMainnet.s.sol:DeployMainnet --rpc-url ethereum --broadcast --private-key $PRIVATE_KEY
```

After a successful 999 broadcast:

1. Copy `deployments/last-run.json` → `deployments/mainnet.json`
2. Set app env `VITE_BI9_ADDRESS`, `VITE_STAKE_VAULT`, `VITE_TIMELOCK` (or operator fields on `/wallet`)
3. **Do not** `setCap` / `setMinter` in the same session. That is a later, delayed, reviewed propose.

Unsigned / unaudited bytecode is still a skeleton. Mainnet deploy turns mint **on** only after governance sets a cap.

## App

Advanced, collapsed **On-chain (HyperEVM)** panel on `/wallet` (hidden in Yard lite). Read-only HYPE + BI9. WeixBucks are not listed as a bridge asset.

## What this will not do

- Convert WeixBucks
- Pay staking yield
- List BLKSHI markets (later contract family)
- Speak Solana / Anchor
- Deploy if you are not on chain 999 (`DeployMainnet`)
