# BlkSpace HyperEVM (BI9)

Solidity for the canonical on-chain asset. Decision: [`docs/finance-l1-strategy.md`](../../../docs/finance-l1-strategy.md) · rules: [`docs/tokenomics.md`](../../../docs/tokenomics.md).

| Contract | Job |
|---|---|
| `BI9.sol` | BLACKINCCOIN ERC-20. Cap `0` = mint disabled. No WeixBucks hook. |
| `StakeVault.sol` | Native HYPE + BI9 sleeves. Fee-tier view. **No rewards.** 7-day unstake cooldown. |
| `TimelockAdmin.sol` | Delayed admin. Owner of BI9 + vault. Delay floor **2 days**; `setMinDelay` / `transferAdmin` only via the timelock itself. |

This is **not** an Anchor program. Solana is the **student micro-settlement** rail (BKSPC / WeixBucks). HyperEVM is the **governance backplane**. They do not share a settlement job.

## Chain

| Network | Chain ID | RPC | Explorer |
|---|---|---|---|
| HyperEVM mainnet | 999 | `https://rpc.hyperliquid.xyz/evm` | https://hyperevmscan.io |
| HyperEVM testnet | 998 | `https://rpc.hyperliquid-testnet.xyz/evm` | https://testnet.hyperevmscan.io |

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

```bash
export TIMELOCK_ADMIN=0xYourAdmin
export TIMELOCK_DELAY=172800   # 2 days, seconds
forge script script/Deploy.s.sol:Deploy --rpc-url hyperevm_testnet --broadcast --private-key $PRIVATE_KEY
# review deployments/last-run.json then copy to deployments/testnet.json
```

## Deploy (mainnet, chain 999)

You need HYPE on HyperEVM for gas. The script **reverts on any other chain id**.

```bash
export TIMELOCK_ADMIN=0xYourAdmin   # required; proposer EOA, not the token minter
export TIMELOCK_DELAY=172800        # must be >= 2 days
forge script script/DeployMainnet.s.sol:DeployMainnet --rpc-url hyperevm --broadcast --private-key $PRIVATE_KEY
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
