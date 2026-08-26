# BKSPC Token-2022 Devnet mint (Ticket 0.1)

**Status:** Script ready. **On-chain mint blocked** until the deployer has Devnet SOL.  
**Date:** 2026-08-26

Public RPC airdrop (`api.devnet.solana.com`) returned **429 / faucet dry**. The mint is not invented — do not treat a placeholder as live.

## What is ready

| Item | Value |
|------|--------|
| Script | `Code-Companion/artifacts/solana/scripts/init-bkspc-token2022-devnet.ts` |
| Command | `cd Code-Companion/artifacts/solana ; bun run init-bkspc-token2022-devnet` |
| Standard | Token-2022 + metadata pointer |
| Name / symbol | **BKSPC Coin** / **BKSPC** |
| Decimals | **6** |
| Off-chain metadata | `artifacts/solana/metadata/bkspc-token.json` |
| Deployer (mint authority, public) | `3M29LLWvrrQf5Lf4cRqh3Yqw5SE1H2vBKtCCGyUipe1e` |
| Deployer key file | gitignored `artifacts/solana/devnet/deployer.json` |

## Finish the mint

1. Open [faucet.solana.com](https://faucet.solana.com) (GitHub sign-in raises the limit).
2. Airdrop **≥ 0.25 SOL** on **Devnet** to:

   `3M29LLWvrrQf5Lf4cRqh3Yqw5SE1H2vBKtCCGyUipe1e`

3. Re-run:

   ```powershell
   cd C:\Users\viper\desktop\BlkSpace\BlkSpace\Code-Companion\artifacts\solana
   bun run init-bkspc-token2022-devnet
   ```

4. Script writes:
   - gitignored full manifest: `devnet/bkspc-token2022-mint.json`
   - public record: `devnet/bkspc-token2022.example.json` (commit this)
   - Explorer URL for the mint + init tx

Mint authority stays on that deployer until Ticket 0.2 moves it to the convert PDA.

## After a successful run

Paste mint + tx into this file and check Ticket 0.1 in [`bkspc-phase0-phase1-tickets.md`](bkspc-phase0-phase1-tickets.md).
