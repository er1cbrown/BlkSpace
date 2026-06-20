# BKSP Devnet Runbook

**Purpose:** Reserve **BLKSPACE COIN (BKSP)** on-chain as a settlement registry,
secure mint authority, and wire real devnet settlement — without mainnet value or public sale.

---

## Step 1 — Devnet init (mint + metadata)

```bash
solana config set --url devnet
solana airdrop 2

cd Code-Companion
pnpm install
pnpm --filter @workspace/solana run setup-bksp-devnet
```

Creates:

| Output | Location |
|--------|----------|
| 2-of-2 treasury multisig | `artifacts/solana/devnet/treasury-manifest.json` |
| Treasury signer keys | `devnet/treasury-signer-a.json`, `treasury-signer-b.json` |
| BKSP mint + Metaplex metadata | `devnet/bksp-mint.json` |

All key material is **gitignored**. Back up locally (encrypted).

### Backup (plain English)

**What happened:** setup wrote secret key files to your computer. Git ignores them on purpose. If the laptop dies, those files are gone — and so is control of the BKSP mint.

**Two kinds of keys:**

| Key | File | Recovery |
|-----|------|----------|
| Deployer wallet | `~/.config/solana/id.json` | 12-word seed phrase on **paper** (best) |
| Treasury signers A & B | `devnet/treasury-signer-a.json`, `treasury-signer-b.json` | **No seed phrase** — you must copy or encrypt these files |

**One command** (password you choose; no GPG required):

```bash
cd Code-Companion
pnpm --filter @workspace/solana run backup-bksp-keys
```

Creates `~/BlkSpace-key-backups/bksp-keys-*.enc`. Copy that `.enc` file to USB or cloud. Do not commit it.

**Minimum if you skip encryption:** write deployer seed words on paper **and** copy `treasury-signer-a.json` + `treasury-signer-b.json` to a USB stick.

---

## Step 2 — Mint authority on treasury (not solo hot wallet)

`setup-bksp-devnet` automatically:

1. Creates SPL **2-of-2 multisig** (separate signer keypairs)
2. Mints BKSP with deployer wallet
3. Transfers **mint authority** → multisig

Mainnet: replace with **Squads multisig + timelock** before real value.

---

## Step 3 — Wire withdraw → real devnet mint

Build Tauri with the settlement feature:

```bash
cd Code-Companion/artifacts/blkspace
cargo build --manifest-path src-tauri/Cargo.toml --features bksp-devnet
# or: pnpm tauri:dev --features bksp-devnet
```

The backend auto-discovers the manifest at:

- `Code-Companion/artifacts/solana/devnet/bksp-mint.json`
- `artifacts/solana/devnet/bksp-mint.json`

Or set it explicitly:

```bash
export BKSP_DEVNET_MANIFEST="$PWD/artifacts/solana/devnet/bksp-mint.json"
```

`withdraw_to_solana` flow (called from Wallet → Withdraw to Solana):

1. Eligibility checks (`db.rs`)
2. Debit WB + 1% settlement fee
3. SPL `mint_to` signed by **both** treasury multisig members
4. Returns real devnet tx signature

Without the feature or manifest → simulated signature (safe default).

Check status in-app via `get_bksp_settlement_status`.

---

## Step 4 — Audit (before any mainnet value)

From `docs/solana-security.md`:

- [ ] Instruction-level threat model signed off
- [ ] Anchor tests + fuzzing on `programs/bksp`
- [ ] Professional audit (OtterSec / Zellic / Neodyme class)
- [ ] Bug bounty plan post-mainnet
- [ ] **No mainnet mint with real economic value until audit complete**

---

## Step 5 — Counsel sign-off (before trading / listings)

- [ ] Settlement disclosures for your jurisdiction
- [ ] Mainnet deploy approval
- [ ] DEX / perps / secondary trading = **separate** product review
- [ ] Update `on_chain_ready` and wallet copy only after written approval

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `BKSP_DEVNET_MANIFEST` | Optional | Path to `bksp-mint.json`; auto-detected in default workspace locations |
| `ANCHOR_WALLET` | Setup only | Deployer payer (`~/.config/solana/id.json`) |
| `SOLANA_RPC_URL` | Optional | Default devnet RPC |
| `BKSP_FORCE_INIT` | Optional | Recreate treasury/mint |
| `BKSP_ALLOW_NON_DEVNET` | Optional | Blocked by default |

---

## Ethics checklist

- ✅ Devnet only until counsel
- ✅ Earn-only WB → optional BKSP settlement
- ✅ No presale, no DEX, no ROI marketing
- ✅ Published fees + eligibility in wallet
- ❌ Do not enable mainnet or trading without steps 4–5