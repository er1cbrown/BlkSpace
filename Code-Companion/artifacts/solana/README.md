# BlkSpace Solana (Phase 4)

Anchor program and devnet tooling for **BKSPC** (`BlkSpace Settlement`).

**Program ID:** `7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs`

Full runbook: `docs/bkspc-devnet-runbook.md`

## Quick setup (all steps)

```bash
solana config set --url devnet
solana airdrop 2

cd Code-Companion
pnpm --filter @workspace/solana run setup-bkspc-devnet
```

Runs: treasury signers → Metaplex mint → deploy program → `initialize_config` (mint authority → program PDA).

## Individual scripts

| Script | Purpose |
|--------|---------|
| `init-treasury-devnet` | Treasury signer keypairs (2-of-2 for `mint_rewards`) |
| `init-bkspc-devnet` | Metaplex mint (authority on deployer until wire) |
| `wire-bkspc-program-devnet` | Deploy program + `initialize_config` |
| `setup-bkspc-devnet` | Runs all three in order |
| `mint-media-nft-devnet` | CLI Metaplex NFT for mix/media (`RECIPIENT`, `CID`, `TITLE`) |
| `backup-bkspc-keys` | Password-locked backup of wallet + treasury keys |
| `record-devnet-e2e` | Fund check → setup (if needed) → proof template |
| `test:anchor` | Local-validator mint/burn + unauthorized tests |

## In-app Phase 4 commands (Tauri)

| Command | Purpose |
|---------|---------|
| `withdraw_to_solana` | WB → BKSPC via `mint_rewards` (`bkspc-devnet` feature) |
| `mint_mix_nft` | Metaplex NFT for mix/media Iroh CID |
| `get_bkspc_purchase_quote` | Burn amount for on-chain marketplace buy |
| `buy_marketplace_listing_bkspc` | Verify `burn_tokens` tx + complete sale |
| `get_bkspc_settlement_status` | Reports `programId`, mint, wiring state |

## Wire real devnet withdraw

```bash
export BKSPC_DEVNET_MANIFEST="/absolute/path/to/artifacts/solana/devnet/bkspc-mint.json"
cargo build --manifest-path ../blkspace/src-tauri/Cargo.toml --features bkspc-devnet
```

Manifest must have `programId`, `configInitialized: true`, and `mintAuthority` = program PDA.

## Anchor program

`programs/bkspc/` — treasury-gated `mint_rewards` / student `burn_tokens`.

```bash
pnpm run build:program          # cargo build-sbf
pnpm run test:anchor            # local validator + ts-mocha
pnpm run wire-bkspc-program-devnet   # deploy + initialize on devnet
```

IDL: `idl/bkspc.json` (Anchor 0.29 format for TS client + Tauri ix builders).

## Ethics / gates

- Devnet only until counsel (runbook steps 5–6)
- Mint authority on **program PDA**, treasury 2-of-2 signs Anchor mint ix
- No presale, no DEX listing, no ROI marketing
- WB → BKSPC via eligibility in `db.rs` only