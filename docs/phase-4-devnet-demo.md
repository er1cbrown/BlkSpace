# Phase 4 Devnet Demo — Mint → List → Buy → Own NFT

**Status:** Walkthrough for Yard Sale NFT marketplace on Solana devnet.  
**Build:** Tauri with `bkspc-devnet` feature (Full profile) or local `cargo build --features bkspc-devnet`.

---

## What this proves

| Step | Layer | Result |
|------|--------|--------|
| Mint | Devnet Metaplex + SQLite `nft_mints` | Seller recorded as owner |
| List | Yard Sale listing + `nft_mint` column | NFT-tagged listing visible |
| Buy (WB) | WeixBucks transfer | Seller paid; buyer owns NFT in app DB |
| Buy (BKSPC) | On-chain burn + WB credit to seller | Same + optional custodial SPL transfer |
| Inventory | Wallet → Marketplace tab | Buyer sees owned NFTs |

App-layer ownership (`nft_mints.owner_handle`) is authoritative for Yard access. On-chain SPL transfer completes automatically only when the treasury custodial ATA holds the token (demo mints with treasury as `RECIPIENT`).

---

## Prerequisites

1. Devnet BKSPC mint configured — see `Code-Companion/artifacts/solana/scripts/setup-bkspc-devnet.ts`
2. Two BlkSpace accounts (seller + buyer) on the same device or Device B pair
3. Phantom wallet on devnet for BKSPC path (buyer)
4. Tauri build with `bkspc-devnet` for real mints; Yard-only builds use simulated mint addresses

---

## Demo A — WeixBucks purchase (any Yard build)

1. **Seller:** Upload a DJ mix → note Iroh CID from upload toast.
2. **Seller:** Wallet → Marketplace → create listing (mix, price in WB, enable NFT).
3. **Seller:** Mint NFT (simulated on Yard build, devnet on Full+bkspc).
4. **Buyer:** Fund WB (earn from posts or seed demo account).
5. **Buyer:** Yard Sale → buy listing with WB.
6. **Verify:**
   - Toast shows `NFT ownership → <mint>…`
   - Wallet → Marketplace → **Your NFTs** lists the mix
   - `nft_mints.owner_handle` = buyer handle (SQLite)

---

## Demo B — BKSPC burn purchase (Full + devnet)

1. Complete Demo A steps 1–3 with Phantom connected as seller (`RECIPIENT` = seller pubkey for normal flow).
2. **Buyer:** Connect Phantom (devnet) on Wallet page.
3. **Buyer:** Yard Sale → **Pay with BKSPC** on the NFT listing.
4. Approve burn transaction in Phantom.
5. **Verify:**
   - Seller WB balance increases (net of 5% platform fee)
   - `payment_tx` on listing = burn signature
   - Buyer owns NFT in app inventory
   - If mint used treasury as recipient, `nftTransferred.onChain = true` and `transferTx` is set

---

## Demo C — Custodial on-chain transfer (CI / script)

For scripted on-chain transfer without seller wallet signature:

```bash
cd Code-Companion/artifacts/solana
# Mint to treasury (custodial) — treasury ATA holds the SPL token
RECIPIENT=<treasury_pubkey> CID=<iroh-cid> TITLE="Demo Mix" \
  pnpm run mint-media-nft-devnet
```

Then list + BKSPC buy with buyer Phantom address. Purchase triggers `transfer_nft_custodial_to_buyer` in Rust.

---

## Rust / Tauri commands

| Command | Purpose |
|---------|---------|
| `mint_mix_nft` | Devnet Metaplex mint + `record_nft_mint` |
| `buy_marketplace_listing` | WB purchase + `transfer_nft_ownership` |
| `buy_marketplace_listing_bkspc` | Burn verify + seller credit + NFT transfer |
| `list_owned_nfts` | Buyer inventory |

---

## Tests

```bash
cd Code-Companion/artifacts/blkspace
cargo test --manifest-path src-tauri/Cargo.toml test_nft_ownership_transfers_on_marketplace_buy --
cargo test --manifest-path src-tauri/Cargo.toml test_join_yard_bootstraps_admin --
cargo test --manifest-path src-tauri/Cargo.toml test_student_cannot_create_yard_event --
```

---

## Known limits (Phase 4b)

- SPL transfer from seller wallet requires seller signature — not automated in this stub.
- NFT metadata URI is compact (`blkspace://nft/...`); full JSON lives in SQLite + Nostr kind 30080.
- Relay-synced ownership proof is future work (Nostr 30081 purchase events publish today).

See also: [`solana-blueprint.md`](solana-blueprint.md), [`ROADMAP.md`](ROADMAP.md) milestone 3.