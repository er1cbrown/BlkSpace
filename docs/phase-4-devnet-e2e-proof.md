# Phase 4 Devnet E2E Proof

**Purpose:** Record real devnet transaction signatures proving BKSPC settlement works end-to-end — mint setup, program wire, live withdraw (`mint_rewards`), and live burn (`burn_tokens`).

**Program ID:** `7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs`

Until steps 3–4 below have explorer-verifiable devnet signatures, Phase 4 is **code complete** but not **operationally proven**.

---

## What “recorded” means

| Step | On-chain action | App / script | Proof field |
|------|-----------------|--------------|-------------|
| 1 | Create BKSPC mint | `setup-bkspc-devnet` (init) | `initSignature` in manifest |
| 2 | Deploy program + `initialize_config` | `wire-bkspc-program-devnet` | `initializeConfigSignature`, `configInitialized: true` |
| 3 | **Withdraw** — WB → BKSPC via `mint_rewards` | `withdraw_to_solana` | Devnet tx sig (not `simulated-…`) |
| 4 | **Burn** — marketplace BKSPC payment | `buy_marketplace_listing_bkspc` | Burn tx sig in listing `payment_tx` |

---

## Quick start (automated template)

```bash
solana config set --url devnet
solana airdrop 2   # retry later if rate-limited, or use faucet

cd Code-Companion
pnpm --filter @workspace/solana run record-devnet-e2e
```

`record-devnet-e2e` will:

1. Check deployer balance (fails fast if unfunded)
2. Run `setup-bkspc-devnet` when manifest is missing, legacy, or unwired
3. Print a proof template with pubkeys and setup signatures filled from `devnet/bkspc-mint.json`
4. Optionally write `docs/phase-4-devnet-e2e-proof-RESULTS.md` when `BKSPC_WRITE_PROOF=1`

---

## Manual runbook (public devnet)

### 0. Fund deployer

```bash
solana config set --url devnet
solana airdrop 2
solana balance     # need ~2–3 SOL for mint + program deploy + initialize_config
```

### 1. Mint + wire (recreate if legacy manifest)

Legacy manifests (`mintAuthorityType: spl-multisig-2of2`, no `programId`) cannot be wired without a new mint or manual authority transfer.

```bash
cd Code-Companion
BKSPC_FORCE_INIT=1 pnpm --filter @workspace/solana run setup-bkspc-devnet
pnpm --filter @workspace/solana run backup-bkspc-keys
```

**Verify** `artifacts/solana/devnet/bkspc-mint.json`:

```json
"cluster": "devnet",
"programId": "7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs",
"configInitialized": true,
"mintAuthorityType": "program-pda"
```

### 2. Build Tauri with settlement

```bash
export BKSPC_DEVNET_MANIFEST="$PWD/artifacts/solana/devnet/bkspc-mint.json"
cd artifacts/blkspace
cargo build --manifest-path src-tauri/Cargo.toml --features bkspc-devnet
```

### 3. Record live withdraw (`mint_rewards`)

1. Student account with eligible WB balance
2. Wallet → withdraw to Solana (student Phantom pubkey on devnet)
3. Capture tx signature

**Verify:**

```bash
# In-app: get_bkspc_settlement_status → enabled, programId, mint, configInitialized
solana confirm <WITHDRAW_TX_SIG> --url devnet
```

### 4. Record live burn (`burn_tokens`)

See [`phase-4-devnet-demo.md`](phase-4-devnet-demo.md) Demo B:

1. Seller lists NFT listing
2. Buyer connects Phantom (devnet), holds BKSPC in ATA
3. Yard Sale → Pay with BKSPC → approve burn in Phantom
4. Capture burn tx signature

**Verify:** seller WB credited, buyer owns NFT in app, `payment_tx` = burn sig.

---

## Proof template (fill after withdraw + burn)

```markdown
# Phase 4 Devnet E2E Proof — YYYY-MM-DD

## Setup
- Deployer: <pubkey>
- Mint: <from manifest>
- Program: 7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs
- initialize_config: <sig>
- Manifest: artifacts/solana/devnet/bkspc-mint.json

## Withdraw (mint_rewards)
- Student handle: <handle>
- Student Solana pubkey: <pubkey>
- WB debited: <amount>
- Tx: <sig>
- Explorer: https://explorer.solana.com/tx/<sig>?cluster=devnet

## Burn (burn_tokens)
- Listing id: <id>
- Buyer Phantom: <pubkey>
- Burn amount (BKSPC): <amount>
- Tx: <sig>
- Explorer: https://explorer.solana.com/tx/<sig>?cluster=devnet

## settlement_status snapshot
<paste JSON from get_bkspc_settlement_status>
```

Save completed proofs as `docs/phase-4-devnet-e2e-proof-RESULTS.md` (gitignored manifest keys stay local; only pubkeys + sigs in the proof file).

---

## Partial proof (local validator)

Program logic without Tauri + Phantom:

```bash
cd Code-Companion
pnpm --filter @workspace/solana run test:anchor
```

Covers: `initialize_config`, `mint_rewards`, unauthorized mint fails, `burn_tokens`.

---

## Blockers checklist

| Blocker | Fix |
|---------|-----|
| 0 devnet SOL | `solana airdrop 2`, [faucet](https://faucet.solana.com/), or transfer to deployer |
| Legacy multisig manifest | `BKSPC_FORCE_INIT=1 setup-bkspc-devnet` |
| Simulated withdraw sig | Build with `bkspc-devnet` + set `BKSPC_DEVNET_MANIFEST` |
| Raw SPL burn rejected | Buyer must sign `burn_tokens` Anchor ix (not legacy SPL burn) |

---

## Related docs

- [`bkspc-devnet-runbook.md`](bkspc-devnet-runbook.md) — full bootstrap
- [`phase-4-devnet-demo.md`](phase-4-devnet-demo.md) — marketplace walkthrough
- [`solana/README.md`](../Code-Companion/artifacts/solana/README.md) — scripts table