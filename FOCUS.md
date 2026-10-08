# Active focus (2026-10-08)

| Tree | Status |
|------|--------|
| **Solana BKSPC** | **The cash-out.** Earned WeixBucks settle only into BKSPC, at 1,000 WB = 1 BKSPC, on Solana devnet until a funded mint exists. Also the governance token: non-rewarding staking plus allowlisted timelocked governance. Minting requires the on-chain `minter` and is bounded by a hard `cap` that governance can only lower. |
| **HyperEVM / BI9 ERC-20** | **Separate asset.** Not paid out from WeixBucks. Contracts in `Code-Companion/artifacts/hyperevm/`. Mint cap stays 0. |
| **`rustytempleOS/`** | Paused (Phase 1 VFS still next on that tree) |
| **BlkSpace campus app** | Keep shipping WeixBucks / Yard. Do not delete assets, keys, or CI. |

Do not auto-convert WeixBucks to BI9. Do not set a mint cap in the same session as a mainnet deploy.
BKSPC staking pays no reward, and no governance action can raise the supply cap. Broadcast `DeployMainnet.s.sol` only with `TIMELOCK_ADMIN` + HYPE for gas on chain **999**.
