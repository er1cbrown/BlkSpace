# BlkSpace Solana (Phase 4)

Anchor program and devnet tooling for **BKSP** (`BLKSPACE COIN`).

Full runbook: `docs/bksp-devnet-runbook.md`

## Quick setup (all steps 1–2)

```bash
solana config set --url devnet
solana airdrop 2

cd Code-Companion
pnpm --filter @workspace/solana run setup-bksp-devnet
```

## Individual scripts

| Script | Purpose |
|--------|---------|
| `init-treasury-devnet` | 2-of-2 SPL multisig + signer keypairs |
| `init-bksp-devnet` | Metaplex mint + transfer authority to treasury |
| `setup-bksp-devnet` | Runs both in order |
| `backup-bksp-keys` | Password-locked backup of wallet + treasury keys |

## Wire real devnet withdraw (step 3)

```bash
export BKSP_DEVNET_MANIFEST="/absolute/path/to/artifacts/solana/devnet/bksp-mint.json"
cargo build --manifest-path ../blkspace/src-tauri/Cargo.toml --features bksp-devnet
```

## Anchor program

`programs/bksp/` — treasury-gated `mint_rewards` / `burn_tokens`. Deploy when program id is finalized:

```bash
anchor build
anchor deploy --provider.cluster devnet
```

## Ethics / gates

- Devnet only until counsel (steps 4–5 in runbook)
- Mint authority on **multisig**, not solo hot wallet
- No presale, no DEX listing, no ROI marketing
- WB → BKSP via eligibility in `db.rs` only