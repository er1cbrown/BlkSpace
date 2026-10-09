# BI9 Security Review — 2026-10-08

Findings from reviewing `Code-Companion/artifacts/hyperevm/` before any deployment. Follows
the Solana review recorded in [`bkspc-settlement-hardening.md`](bkspc-settlement-hardening.md).

**Short version: no exploitable vulnerability found.** BI9's gating is sound and the
TimelockAdmin design is good. The issues below are trust assumptions and design
inconsistencies, not bugs — but two of them are the first thing anyone buying BI9 should
know, so they should be disclosed rather than buried.

Test count went from 22 to 33. All pass.

## Nothing deployed, so nothing is at risk

`deployments/mainnet.json` and `deployments/testnet.json` both have empty addresses, and
`BI9` is constructed with `cap = 0` and `minter = address(0)`. `mint()` is therefore
unreachable on two independent counts. The only way to change that is a queued timelock
proposal on an `admin` that does not exist yet.

## Good — worth keeping

- **`minter` starts as `address(0)`.** Even with a cap set, nobody can mint until
  `setMinter` is called. Two independent gates, not one.
- **`TimelockAdmin.onlySelf`** on `transferAdmin` and `setMinDelay` means an EOA cannot
  rotate admin or shorten the delay in a single transaction, and `MIN_DELAY_FLOOR` of 2 days
  holds even through the timelock itself
  (`test_cannotLowerDelayBelowFloorEvenViaTimelock`).
- **`setCap` cannot drop below `totalSupply`**, so the cap can never orphan outstanding
  balances.
- **`_transfer` uses `unchecked` only after the balance check**, so no arithmetic slip.
- Contract sizes leave >20 KB headroom against EIP-170.

## Finding 1 — the cap is raisable, and that differs from BKSPC

`setCap` (`BI9.sol:63`) has no monotonicity constraint. Anyone controlling `admin` can raise
the cap at any time and mint the new headroom immediately. Pinned by
`test_capCanBeRaisedByAdmin`.

On a live deploy `admin` is a `TimelockAdmin`, so a raise requires a queued proposal plus the
2-day `minDelay`. That is a real delay, but it is **not** a one-way door.

This matters because it is *inconsistent with the token we just hardened*. BKSPC's
`ConvertConfig.cap` was deliberately made monotonically decreasing — no instruction can
raise it. BI9 has the opposite property.

**This is a decision, not a defect, but it should be a deliberate one.** For an asset sold
to donors, "supply can never increase" is materially easier to underwrite than "supply can
increase after two days' notice". If the raisable cap is intended, say so plainly in the
tokenomics docs. If not, `setCap` should mirror BKSPC and reject `newCap > cap`.

## Finding 2 — a pause cannot be undone quickly

`pause()` accepts `pauser` **or** `admin`; `unpause()` is `onlyAdmin`
(`BI9.sol:87-96`). On a live deploy `admin` is a timelock, so an emergency pause triggered by
a bug is stuck for at least `minDelay` — two days minimum. Pinned by
`test_pauserCanPauseButOnlyAdminCanUnpause`.

Fail-safe for holders, costly for incident response. Worth an explicit decision before
mainnet rather than discovering it during an incident.

## Finding 3 — pausing does not stop minting

`whenNotPaused` guards `transfer` and `transferFrom` but **not** `mint`. A paused token can
still have supply issued into it. Pinned by `test_mintStillWorksWhilePaused`.

Probably an oversight rather than a decision. If a pause is meant to mean "stop touching
this token," `mint` needs the modifier.

## Finding 4 — nothing enforces that `admin` is a timelock

`BI9`'s constructor comment says *"Admin is expected to be a TimelockAdmin, not an EOA, on
any live deploy."* That is a convention, not an invariant. Deploying with an EOA admin
silently removes every guarantee in this document, and nothing fails.

`DeployMainnet.s.sol` does the right thing — it constructs the timelock first and passes it
as `admin_`, then asserts `cap == 0` and `minter == address(0)` afterwards. So the scripted
path is safe. The risk is an ad-hoc deploy.

## Finding 5 — smaller items

- `setMinter` has **no zero-address check**, unlike `setPauser` and `transferAdmin`. Setting
  it to `address(0)` bricks minting — fail-closed and recoverable, so not a risk, but an
  inconsistency. Pinned by `test_setMinterToZeroDisablesMinting`.
- `approve` **overwrites** rather than accumulating, and there is no `increaseAllowance`.
  Wallets that assume additive semantics will misbehave. Pinned by
  `test_approveOverwritesRatherThanAccumulates`.
- `transferFrom` skips the allowance decrement when allowance is `type(uint256).max`, the
  standard infinite-approval pattern. Correct as written.
- No `permit`. Intentional, and it avoids a live signature-replay surface.

## Not changed

Nothing in `src/` was modified. Every item above is either a deliberate design decision to
confirm or a documented behaviour, not a defect. `cap` remains 0 and `minter` remains unset.

## Deploy path unchanged

`DeployMainnet.s.sol` still hard-reverts on any chain but **999**, still requires
`TIMELOCK_ADMIN`, and still asserts `cap == 0` and `minter == address(0)` post-deploy. It is
untouched. See `docs/finance-l1-strategy.md` and `docs/tokenomics.md`.

Before any mainnet deploy: settle Findings 1–3 as explicit decisions, get an external audit,
and fill `deployments/mainnet.json` with real addresses only after the broadcast succeeds.