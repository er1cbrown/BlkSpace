# BlkSpace Solana (Phase 4)

Anchor program and devnet tooling for **BKSPC** (`BlkSpace Settlement`).

Full runbook: `docs/bkspc-devnet-runbook.md`

## Quick setup (all steps 1–2)

```bash
solana config set --url devnet
solana airdrop 2

cd Code-Companion
pnpm --filter @workspace/solana run setup-bkspc-devnet
```

## Individual scripts

| Script | Purpose |
|--------|---------|
| `init-treasury-devnet` | 2-of-2 SPL multisig + signer keypairs |
| `init-bkspc-devnet` | Metaplex mint + transfer authority to treasury |
| `setup-bkspc-devnet` | Runs both in order |

## Wire real devnet withdraw (step 3)

```bash
export BKSPC_DEVNET_MANIFEST="/absolute/path/to/artifacts/solana/devnet/bkspc-mint.json"
cargo build --manifest-path ../blkspace/src-tauri/Cargo.toml --features bkspc-devnet
```

## Anchor program

`programs/bkspc/` — treasury-gated `mint_rewards` / `burn_tokens`. Deploy when program id is finalized:

```bash
anchor build
anchor deploy --provider.cluster devnet
```

## Ethics / gates

- Devnet only until counsel (steps 4–5 in runbook)
- Mint authority on **multisig**, not solo hot wallet
- No presale, no DEX listing, no ROI marketing
- WB → BKSPC via eligibility in `db.rs` only