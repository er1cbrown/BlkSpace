# BKSPC Devnet Runbook

**Purpose:** Reserve **BKSPC** on-chain, deploy the `bkspc` Anchor program, secure mint authority via program PDA, and wire real devnet settlement — without mainnet value or public sale.

**Program ID (devnet):** `7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs`

---

## Step 1 — Devnet init (mint + metadata)

```bash
solana config set --url devnet
solana airdrop 2

cd Code-Companion
pnpm install
pnpm --filter @workspace/solana run setup-bkspc-devnet
```

`setup-bkspc-devnet` runs three steps in order:

1. `init-treasury-devnet` — 2-of-2 treasury signer keypairs
2. `init-bkspc-devnet` — Metaplex fungible mint (authority stays on deployer)
3. `wire-bkspc-program-devnet` — deploy program + `initialize_config` (authority → program PDA)

Creates:

| Output | Location |
|--------|----------|
| Treasury signer keys | `devnet/treasury-signer-a.json`, `treasury-signer-b.json` |
| BKSPC mint + Metaplex metadata | `devnet/bkspc-mint.json` |
| Deployed program | `7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs` |

All key material is **gitignored**. Back up locally (encrypted).

### Backup (plain English)

**What happened:** setup wrote secret key files to your computer. Git ignores them on purpose. If the laptop dies, those files are gone — and so is control of the BKSPC mint.

**Two kinds of keys:**

| Key | File | Recovery |
|-----|------|----------|
| Deployer wallet | `~/.config/solana/id.json` | 12-word seed phrase on **paper** (best) |
| Treasury signers A & B | `devnet/treasury-signer-a.json`, `treasury-signer-b.json` | **No seed phrase** — you must copy or encrypt these files |

**One command** (password you choose; no GPG required):

```bash
cd Code-Companion
pnpm --filter @workspace/solana run backup-bkspc-keys
```

Creates `~/BlkSpace-key-backups/bkspc-keys-*.enc`. Copy that `.enc` file to USB or cloud. Do not commit it.

**Minimum if you skip encryption:** write deployer seed words on paper **and** copy `treasury-signer-a.json` + `treasury-signer-b.json` to a USB stick.

---

## Step 2 — Mint authority on program PDA (not raw multisig mint_to)

After `wire-bkspc-program-devnet`:

- SPL **mint authority** = program PDA `[b"mint_authority"]`
- Treasury signers A & B are stored in the on-chain **config PDA** `[b"config"]`
- Mints go through `mint_rewards` — both treasury signers must sign the Anchor instruction; the program PDA signs the SPL `mint_to` CPI
- Burns go through `burn_tokens` — student signs; marketplace payments burn BKSPC via the program

Mainnet: replace treasury keypairs with **Squads multisig + timelock** before real value.

### Migrating from legacy multisig authority

If your manifest has `mintAuthorityType: "spl-multisig-2of2"` (pre-Anchor flow):

1. Both treasury signers must approve transferring mint authority back to the deployer, **or**
2. Set `BKSPC_FORCE_INIT=1` and run `setup-bkspc-devnet` to create a fresh mint + wire

---

## Step 3 — Wire withdraw → real devnet mint

Build Tauri with settlement feature and point at your manifest:

```bash
export BKSPC_DEVNET_MANIFEST="$PWD/artifacts/solana/devnet/bkspc-mint.json"

cd Code-Companion/artifacts/blkspace
cargo build --manifest-path src-tauri/Cargo.toml --features bkspc-devnet
# or: pnpm tauri:dev with BKSPC_DEVNET_MANIFEST set
```

Manifest must include:

- `programId` — deployed Anchor program
- `configInitialized: true` — `initialize_config` completed
- `mintAuthority` — program PDA (not deployer or multisig)

`withdraw_to_solana` flow:

1. Eligibility checks (`db.rs`)
2. Debit WB + 1% settlement fee
3. `mint_rewards` Anchor ix signed by **both** treasury signers
4. Returns real devnet tx signature

Marketplace burns use `burn_tokens` Anchor ix (raw SPL burns are rejected).

Without the feature or manifest → simulated signature (safe default).

Check status in-app via `get_bkspc_settlement_status` (reports `programId` + mint).

---

## Step 4 — Anchor tests (local validator)

```bash
cd Code-Companion
pnpm --filter @workspace/solana run test:anchor
```

Covers: `initialize_config`, `mint_rewards` happy path, unauthorized mint fails, `burn_tokens`.

CI runs the same suite on every push (`test-anchor-bkspc` job).

---

## Step 5 — Audit (before any mainnet value)

From `docs/solana-security.md`:

- [ ] Instruction-level threat model signed off
- [x] Anchor tests on `programs/bkspc` (mint/burn + unauthorized)
- [ ] Professional audit (OtterSec / Zellic / Neodyme class)
- [ ] Bug bounty plan post-mainnet
- [ ] **No mainnet mint with real economic value until audit complete**

---

## Step 6 — Counsel sign-off (before trading / listings)

- [ ] Settlement disclosures for your jurisdiction
- [ ] Mainnet deploy approval
- [ ] DEX / perps / secondary trading = **separate** product review
- [ ] Update `on_chain_ready` and wallet copy only after written approval

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `BKSPC_DEVNET_MANIFEST` | Yes (for real mint) | Path to `bkspc-mint.json` |
| `ANCHOR_WALLET` | Setup only | Deployer payer (`~/.config/solana/id.json`) |
| `SOLANA_RPC_URL` | Optional | Default devnet RPC |
| `BKSPC_FORCE_INIT` | Optional | Recreate treasury/mint |
| `BKSPC_ALLOW_NON_DEVNET` | Optional | Blocked by default |

---

## Ethics checklist

- ✅ Devnet only until counsel
- ✅ Earn-only WB → optional BKSPC settlement
- ✅ No presale, no DEX, no ROI marketing
- ✅ Published fees + eligibility in wallet
- ❌ Do not enable mainnet or trading without steps 5–6