# BKSPC Settlement Hardening — 2026-10

Findings and fixes from the review that preceded enabling the Token-2022 settlement path.

The Token-2022 convert path had never been wired on any cluster (the program account
`7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs` and both config PDAs did not exist on
devnet), so the account layout could be changed freely. No deployed state required migration.

## 1. `convert_wb_to_bkspc` was permissionless — CRITICAL

**Before.** The only required signature was `user: Signer`. The `mint_authority` PDA signed
the `mint_to` CPI automatically, and the `user_ata` constraint only checked that the ATA
was owned by `user`. Any third party could therefore mint unlimited BKSPC to a wallet they
controlled by calling the program directly. The old doc comment said *"Eligibility is
off-chain"*, which meant the sole gate was the app not rendering a button.

There was also **no supply cap** on the Token-2022 mint at all.

**After.**
- `convert_config.minter` is the only signer permitted to mint. It is stored on-chain at
  init and rotatable by `rotate_minter` (admin) or `ACTION_ROTATE_MINTER` (governance).
- `user` must still sign, so a mint cannot be redirected into a third party's ATA.
- `convert_config.cap` is a hard ceiling. `mint()` reverts with `CapExceeded` if
  `supply + amount > cap`.

Regression coverage: `tests/bkspc-convert.ts` asserts that a recipient-signed mint, a
non-minter-signed mint, a mint into someone else's ATA, and an over-cap mint all fail, and
that supply does not move.

## 2. Staking and governance added

Non-rewarding staking plus a timelocked, allowlisted governance system.

**Staking** — `stake`, `stake_more`, `begin_unstake`, `cancel_unstake`, `finish_unstake`,
`close_position`. Tokens move to a `stake_vault` PDA ATA. **No reward is paid**; staked
BKSPC confers governance weight and nothing else. The unstake cooldown cannot go below
`MIN_GOV_DELAY`.

**Governance** — `propose`, `cast_vote`, `change_vote`, `execute`, `cancel_proposal`,
`release_vote`. Allowlisted actions only:

| Action | Effect |
|---|---|
| `ACTION_LOWER_CAP` (0) | Lower the supply cap. **There is no way to raise it.** |
| `ACTION_SET_UNSTAKE_DELAY` (1) | Retune the unstake cooldown within bounds |
| `ACTION_SET_GOV_DELAY` (2) | Retune the proposal timelock, `>= MIN_GOV_DELAY` |
| `ACTION_ROTATE_MINTER` (3) | Move the settlement signer |

Design points:
- **No arbitrary-CPI governance instruction.** Governance can only perform the four
  actions above, so a passed proposal cannot drain the vault or re-point mint authority.
- **The cap is monotonic.** `propose` rejects an `ACTION_LOWER_CAP` whose argument is not
  strictly below the current cap, and `execute` re-checks. Combined with a 2-day timelock,
  a holder cannot inflate supply in one transaction.
- **Vote weight is snapshotted** into a `VoteRecord` at first vote, and the voter's
  `Position.active_votes` increments. `begin_unstake` requires `active_votes == 0`, so the
  same stake cannot vote on several proposals at once or flash-vote and withdraw.
  `change_vote` reuses the original snapshot, so topping up mid-proposal cannot inflate a
  changed ballot.
- `MAX_ACTIVE_VOTES = 16` bounds per-position commitment.

## 3. WeixBucks fund-loss window — HIGH

`withdraw_to_solana` debited WB *before* calling the on-chain mint. On mint failure the
student lost both principal and the published fee, with no compensating credit anywhere.

**After.** The debit is reversible. `deduct_weix_bucks` returns the `wallet_tx` row id, and
on mint failure `refund_weix_bucks` credits the full amount back inside one transaction and
marks the original debit `voided = 1`. Voided rows are excluded from the weekly withdrawal
cap and the cooldown query, so a failed settlement no longer burns a cap slot or starts a
7-day lockout. A refund cannot be replayed against an already-voided row.

Schema moved to version 13 (`ALTER TABLE wallet_tx ADD COLUMN voided INTEGER DEFAULT 0`).

## 4. `mint_mix_nft` fabricated an on-chain receipt — HIGH

Without the `bkspc-devnet` feature the command generated a random 88-character base58
"signature", wrote it to `nft_mints`, pointed the listing at a `SimNFT…` address, and
published a Nostr kind 30080 *"Minted NFT"* event. Every downstream consumer read that as
proof a transfer had occurred.

It now refuses before touching any state, matching the existing refusal in
`withdraw_to_solana`.

## 5. `grant_weix_bucks` was not atomic — MEDIUM

The balance update, `wallet_tx` insert, and `earn_category_day` upsert were three separate
autocommit statements. A crash between the first two credited a balance without recording
the earn, permanently inflating the daily-cap denominator — which is recomputed from
`wallet_tx`. All three now share one transaction, as `deduct_weix_bucks` already did.

## 6. CI and tooling gaps

- `tests/bkspc-convert.ts` was never executed — `run-anchor-tests.sh` ran only
  `tests/bkspc.ts`, despite the file's own header claiming otherwise. Both run now.
- `forge test` for `artifacts/hyperevm/` (BI9, StakeVault, TimelockAdmin) was not in CI at
  all. Added as `test-forge-hyperevm` with `forge fmt --check` and `forge build --sizes`.

## Not changed

- `on_chain_ready` remains `false` in `TokenomicsPolicy::published()`, and there is no code
  path that sets it. Counsel sign-off and an external audit are still gates.
- Staking deliberately pays no yield. A yield promise attached to a token marketed to
  sponsors is a materially larger problem than the missing feature.
- BI9 remains `cap == 0` on HyperEVM with an unset minter. Nothing in this change touches it.

## Verification performed — final

**Anchor integration suite: 22/22 passing** on a real Solana validator in CI. This is the
security-critical suite; every mint-exploit regression is green:

```
REJECTS a mint requested only by the recipient (no minter)
REJECTS a mint signed by a non-minter
cannot mint into an ATA the recipient does not own
REJECTS a mint that would exceed the cap
refuses a proposal to RAISE the cap
refuses a proposal to shorten the governance delay below the floor
opens a valid proposal and refuses execution before its eta
locks the voter's stake while a vote is outstanding
```

Getting there surfaced real defects in this work, all fixed: governance instructions
declared `#[instruction(nonce: u64)]` without the handler accepting `nonce`, so they could
not decode their own arguments; and the suite ran without an IDL program address, without
`bn.js`, and without signers on any instruction that pays rent. None were visible until a
validator actually executed them.

Local runs of this suite are impossible on the development machine — `solana-test-validator`
aborts because the CPU lacks AVX. CI is the only place it can run.

BI9 Solidity (`artifacts/hyperevm/`) — **22 tests pass**, run for the first time. These
had never been executed because no CI job ran `forge test`:

| Suite | Result |
|---|---|
| `BI9.t.sol` | 7 passed — including `test_mintRevertsWhenCapZero` |
| `StakeVault.t.sol` | 5 passed |
| `TimelockAdmin.t.sol` | 10 passed — including `test_cannotLowerDelayBelowFloorEvenViaTimelock` |

Contract sizes, all far under the 24,576 B EIP-170 limit: BI9 3,122 B · StakeVault 3,818 B
· TimelockAdmin 3,157 B.

`forge fmt --check` is **not** a CI gate. These contracts predate any formatting
standard, so enabling it would fail immediately, and reformatting them would add diff
noise to an audit surface. Format them deliberately before the audit begins.


| Check | Result |
|---|---|
| `cargo build-sbf` (program for chain) | pass — `bkspc.so`, 415 KB |
| `cargo check` Tauri, no feature | pass |
| `cargo check` Tauri, `--features bkspc-devnet` | pass |
| `cargo test --lib` | 195 pass, 1 fail |
| `tsc --noEmit` (solana package) | pass |

The single failing test is `test_nostr_publish_roundtrip_damus_relay`, which publishes to
the live `damus` relay and returns *"completed without success"*. Nothing in this change
touches the Nostr path; it is an environment-dependent smoke test.

New tests: `test_refund_weix_bucks_restores_balance_and_voids_the_debit` and
`test_voided_withdrawal_does_not_burn_weekly_cap_or_cooldown` both pass.

## bkspc-devnet now reaches a build artifact

The feature gates the entire WB -> BKSPC settlement path and was in no CI job or release,
so `withdraw_to_solana` returned an error in every shipped installer. Added:

- `check-tauri-bkspc` — `cargo check --features bkspc-devnet` across macOS, Linux, and
  Windows. Cheap, and the Solana/SPL crate set is the part most likely to break on a new
  toolchain.
- `build-tauri-bkspc` — a Linux-only `bun run tauri:build:bkspc` installer, uploaded as
  `BlkSpace-BKSPC-Settlement-Linux.AppImage`. Linux only keeps CI cost down; the check job
  covers the other platforms at compile level.
- `bun run tauri:dev:bkspc`, `tauri:build:bkspc`, `tauri:build:bkspc-tier0` in
  `artifacts/blkspace/package.json`.

It is deliberately **not** a default feature: that would pull seven Solana crates into every
install on the 4 GB laptops the repo targets.

## Remaining before any mainnet value

1. **External audit.** The Solana runbook already requires this before mainnet value.
2. **`idl/bkspc.json` must be regenerated with `anchor build`.** The checked-in IDL still
   describes the old five-instruction program, so the TypeScript clients — including
   `wire-bkspc-token2022-convert.ts` and the new test suite — will not work until it is
   refreshed. `anchor-cli` 0.29 does not build against rustc 1.99 (`wasm-bindgen` 0.2.87
   incompatibility); it needs an older toolchain, e.g. `cargo +1.79.0 install --git
   https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked`.
3. **`devnet/deployer.json` was generated on 2026-10-08 with no seed phrase.** Recovery
   depends entirely on the file, so it needs an encrypted file backup before it holds
   anything. `backup-bkspc-keys.sh` now includes it.
4. **UI and docs still describe the old state.** `/wallet` renders *"WeixBucks cash out only
   to BKSPC"* regardless of whether settlement is wired in that build, and `FOCUS.md`,
   `docs/tokenomics.md`, and `AGENTS.md` still describe BKSPC as a prototype that is
   *"never a mint home"* with no staking or governance.