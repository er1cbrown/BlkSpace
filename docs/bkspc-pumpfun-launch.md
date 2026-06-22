# BKSPC pump.fun Launch Runbook

**Token:** BKSPC (name + symbol — same on Solana; BLKC was taken on-chain)  
**Platform:** pump.fun (Solana mainnet)  
**Website:** https://bkspc.app (register domain → point DNS to GitHub Pages)  
**Stopgap URL:** https://er1cbrown.github.io/BlkSpace (works until custom domain is live)

---

## What this is

This runbook launches **BKSPC** as a **community token** on Solana via pump.fun. It is separate from the in-app **WeixBucks** economy.

| Layer | Token | Purpose |
|-------|-------|---------|
| In-app credits | **WeixBucks (WB)** | Earn from posts, yards, node work; spend in-app |
| On-chain token | **BKSPC** | Solana SPL — cash-out rail + utility for the social network |

Campus yards (HBCU lore) are the first wedge inside the app. The **investor-facing brand is BKSPC** everywhere: website, pump.fun, nav, metadata.

---

## Before you start

1. Solana wallet with **~0.05 SOL** on mainnet
2. **BKSPC** logo/image ready to upload
3. Register **bkspc.app** (or `.net` / `.social` if `.app` is taken) and point DNS → GitHub Pages

---

## Step 1 — Prepare metadata

```bash
cd Code-Companion
pnpm --filter @workspace/solana run prepare-bkspc-pumpfun-launch
```

Expected output:

```
Name:        BKSPC
Symbol:      BKSPC
Description: BKSPC — the social network that pays you to post...
Website:     https://bkspc.app
Image:       Upload the BKSPC logo
```

---

## Step 2 — Launch on pump.fun

1. Visit https://pump.fun → Connect wallet
2. Click **Create**
3. Paste values from Step 1
4. Upload BKSPC logo
5. Submit + sign → **save the mint address**

---

## Step 3 — Wire the live mint

Update:

- `docs/bkspc-pumpfun-launch.md` — mint address below
- `Code-Companion/artifacts/solana/devnet/bkspc-mint.json` (if mirroring)
- Wallet UI to display live BKSPC mint

---

## Domain setup (bkspc.app)

1. Register `bkspc.app` on Cloudflare or Namecheap
2. GitHub repo → Settings → Pages → Custom domain → `bkspc.app`
3. DNS: `CNAME bkspc.app → er1cbrown.github.io`
4. Token `external_url` in `metadata/bkspc-token.json` already points to `https://bkspc.app`

---

## Mint address

```
(pending launch)
```