# BI9 Ethereum Deployment — verified rehearsal and cost

**Date:** 2026-10-08 · **Chain:** Ethereum mainnet (1) · **Status: NOT DEPLOYED**

Everything below was executed against a local Anvil node (chain 31337) using Anvil's
well-known development key. Nothing was broadcast to a public network. No mainnet funds were
used.

## Deployment path is proven

A real `--broadcast` against a live EVM succeeded, and the full activation sequence was
executed end to end:

| Step | Result |
|---|---|
| Broadcast all three contracts | `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL` |
| `BI9.name()` / `symbol()` | `"BLACKINCCOIN"` / `"BI9"` |
| `BI9.cap()` | `0` — mint disabled |
| `BI9.minter()` | `0x0` — unset |
| `BI9.totalSupply()` | `0` |
| `BI9.admin()` | the TimelockAdmin **contract**, not an EOA |
| `propose(BI9.setCap(1M))` | success |
| `execute(id)` before `eta` | reverted `NotReady` |
| advance time past the 2-day floor | — |
| `execute(id)` after `eta` | success |
| `BI9.cap()` | `1_000_000e18` |
| propose a **larger** cap, execute after delay | reverted `CapCannotIncrease`, cap unchanged |

That last row is the dilution guarantee, verified live rather than only in unit tests.

## Real gas cost

| Contract | Gas |
|---|---|
| `TimelockAdmin` | 783,918 |
| `BI9` | 802,729 |
| `StakeVault` | 1,016,100 |
| **Total** | **2,602,747** |

At mainnet prices:

| Gas price | ETH | @ $3,000 | @ $4,000 |
|---|---|---|---|
| 10 gwei | 0.0260 | $78 | $104 |
| 20 gwei | 0.0521 | $156 | $208 |
| 40 gwei | 0.1041 | $312 | $416 |

**A $200 budget clears this up to roughly 25 gwei at $3,000/ETH** (and further if ETH is
cheaper). Above ~28 gwei it goes over, so check the live gas price before broadcasting.

## Cheaper path that fits comfortably

`StakeVault` is the most expensive contract and nothing depends on it at deploy time. Ship
the token and its timelock first:

| Set | Gas | @ 20 gwei, $3k |
|---|---|---|
| `TimelockAdmin` + `BI9` | 1,586,647 | **$95** |
| All three | 2,602,747 | $156 |

With a $200 budget all three fit at 20 gwei ($156), leaving roughly $44 of headroom. Gas
tends to be lower on weekends and early UTC, so the window is comfortable.

If the live price is above ~28 gwei, deploy `TimelockAdmin` + `BI9` only ($95 at 20 gwei) and
add `StakeVault` later if it is still wanted.

## Running it yourself

Do not paste a mainnet private key into a chat, a ticket, or a CI log. Run it locally:

```bash
cd Code-Companion/artifacts/hyperevm
export PRIVATE_KEY=0x...          # funded wallet, chain 1
export TIMELOCK_ADMIN=0x...       # EOA allowed to PROPOSE (not the deployer)
export TIMELOCK_DELAY=172800

# Rehearse first — no broadcast, no spend:
forge script script/DeployMainnet.s.sol:DeployMainnet --rpc-url ethereum

# Check gas before spending:
forge script script/DeployMainnet.s.sol:DeployMainnet --rpc-url ethereum --gas-report

# Then broadcast:
forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url ethereum --broadcast --private-key $PRIVATE_KEY --slow
```

`DeployMainnet.s.sol` refuses any chain id other than 1 (verified: reverts `WrongChain`
against Sepolia) and asserts `cap == 0` and `minter == address(0)` immediately after
construction.

After a real broadcast, copy `deployments/last-run.json` to `deployments/mainnet.json` and
fill in the addresses. A rehearsal run is stamped `"network": "rehearsal"` — never publish
those addresses.

## Activation is a separate session

Deploy with `cap = 0`. Do not raise it in the same session as the deployment. Activate later
through the timelock:

1. `propose(BI9.setCap(N))` from `TIMELOCK_ADMIN`
2. wait `minDelay` (minimum 2 days, enforced on-chain)
3. `execute(id)`
4. separately, `propose(BI9.setMinter(addr))` and wait again

Two independent gates: a non-zero cap alone cannot mint while `minter` is `address(0)`, and
the cap can never be raised once set.

## Still ahead of any paid launch

External audit, and legal review before the token is sold to anyone.