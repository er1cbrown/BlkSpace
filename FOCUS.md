# Active focus (2026-08-27)

| Tree | Status |
|------|--------|
| **HyperEVM / BI9 mainnet path** | **Work focus** — governance backplane, not student settlement. Contracts in `Code-Companion/artifacts/hyperevm/`. App panel: `/wallet` → HyperEVM (advanced). |
| **Power of 2 roles** | Solana BKSPC = student micro-settlement; HyperEVM BI9 = governance. See `docs/features/comparative-multi-chain-prototyping-study.md`. |
| **`rustytempleOS/`** | Paused (Phase 1 VFS still next on that tree) |
| **BlkSpace campus app** | Keep shipping WeixBucks / Yard. Do not delete assets, keys, or CI. |

Do not auto-convert WeixBucks to BI9. Do not set a mint cap in the same session as a mainnet deploy. Broadcast `DeployMainnet.s.sol` only with `TIMELOCK_ADMIN` + HYPE for gas on chain **999**.
