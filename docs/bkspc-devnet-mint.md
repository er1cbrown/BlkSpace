# BKSPC Token-2022 Devnet mint (Ticket 0.1)

**Status:** Live on Devnet  
**Date:** 2026-08-26

| Field | Value |
|-------|--------|
| Token program | Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`) |
| Name / symbol | **BKSPC Coin** / **BKSPC** |
| Decimals | **6** |
| Mint | `HBcTHr2LEC7wb1Y5Sni8pgBp8ChduHuf4sk2tLgykZPx` |
| Mint authority | `3M29LLWvrrQf5Lf4cRqh3Yqw5SE1H2vBKtCCGyUipe1e` (deployer; pending convert PDA) |
| Freeze | none |
| Supply | 0 |
| Init tx | `3wzCi3qMAPZF197J6T2JH3ELJwwCB5TZfiK8f4ZTPNUjEK8pHLLa2EoxZpLJYvzVUZBD9wRmgWfotCtoDrM5gmQ` |
| Metadata URI | https://raw.githubusercontent.com/er1cbrown/BlkSpace/main/Code-Companion/artifacts/solana/metadata/bkspc-token.json |
| Explorer (mint) | https://explorer.solana.com/address/HBcTHr2LEC7wb1Y5Sni8pgBp8ChduHuf4sk2tLgykZPx?cluster=devnet |
| Explorer (tx) | https://explorer.solana.com/tx/3wzCi3qMAPZF197J6T2JH3ELJwwCB5TZfiK8f4ZTPNUjEK8pHLLa2EoxZpLJYvzVUZBD9wRmgWfotCtoDrM5gmQ?cluster=devnet |

Public JSON (no secrets): [`../Code-Companion/artifacts/solana/devnet/bkspc-token2022.example.json`](../Code-Companion/artifacts/solana/devnet/bkspc-token2022.example.json)

Local secrets stay gitignored: `devnet/deployer.json`, `devnet/bkspc-token2022-mint.json`.

## Ticket 0.2 (code landed, deploy pending)

| PDA | Address |
|-----|---------|
| Mint authority | `55hw5PBVtYCxqgE6rjQrPuAXLtLhpYDxYyPT26bd8gcw` |
| Convert config | `3bJXBvnihAdMCKYWPpvFzQwiFrmhyF7QgtPKAWWW9LTv` |

Program source: `initialize_convert` + `convert_wb_to_bkspc`. Wire after BPF deploy:

```powershell
cd Code-Companion\artifacts\solana
bun run wire-bkspc-token2022-convert
```

**Do not** transfer mint authority until the upgraded program is on Devnet — otherwise the mint cannot mint or recover.

**Next:** BPF deploy (`cargo-build-sbf` + `solana program deploy`) then wire. Ticket 0.3 client helper after that.
