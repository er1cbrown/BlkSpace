# BlkSpace Solana (Phase 4)

Anchor program and devnet tooling for **BKSPC** (`BlkSpace Settlement`).

## BKSPC devnet mint (reserve name on-chain)

Ethical devnet-only step: creates an SPL fungible mint with Metaplex metadata (`name`, `symbol: BKSPC`). No public sale, no liquidity pool.

### Prerequisites

```bash
solana config set --url devnet
solana airdrop 2   # fund default keypair if needed
```

### Initialize mint

From `Code-Companion/`:

```bash
pnpm install
pnpm --filter @workspace/solana run init-bkspc-devnet
```

Writes `devnet/bkspc-mint.json` (gitignored). See `devnet/bkspc-mint.example.json` for shape.

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `ANCHOR_WALLET` | `~/.config/solana/id.json` | Mint authority keypair |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | Must be devnet unless overridden |
| `BKSPC_METADATA_URI` | embedded data URI | Optional hosted metadata JSON |
| `BKSPC_FORCE_INIT` | — | Set `1` to create another mint |
| `BKSPC_ALLOW_NON_DEVNET` | — | Set `1` to allow mainnet RPC (not recommended) |

### Files

| Path | Role |
|------|------|
| `metadata/bkspc-token.json` | Off-chain Metaplex metadata template |
| `programs/bkspc/` | Anchor settlement program (mint/burn via treasury) |
| `scripts/init-bkspc-devnet-mint.ts` | Devnet mint + metadata init |

### Ethics / gates

- **Devnet only** until counsel approves mainnet settlement
- Mint authority stays on your wallet / future treasury multisig
- No presale, no DEX listing, no ROI marketing
- WB → BKSPC remains earn-only via `withdraw_to_solana` eligibility in `db.rs`

See `docs/economy-uniform-model.md` and `docs/tokenomics-policy.md`.