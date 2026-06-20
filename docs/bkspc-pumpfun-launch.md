# BKSPC pump.fun Launch Runbook

**Token:** BKSPC (BLKSPACE COIN)  
**Platform:** pump.fun (Solana mainnet)  
**Project:** BlkSpace — https://weixblack.net

---

## What this is

This runbook launches `BKSPC` as a **community token** on Solana via pump.fun. It is separate from the in-app `WeixBucks` economy and exists as the on-chain layer of the BlkSpace network.

**Relationship to BlkSpace:**

| Layer | Token | Purpose |
|-------|-------|---------|
| In-app credits | **WeixBucks (WB)** | Earn from posts, yards, node work; spend in-app |
| On-chain community token | **BKSPC** | Solana-native token for the BlkSpace community |

BKSPC is the Solana-facing side of BlkSpace. It is not a presale, not a security, and not a promise of future value.

---

## Before you start

You need:

1. A Solana wallet with **~0.05 SOL** on mainnet (for creation + fees)
2. The BlkSpace logo/image ready to upload
3. This repo checked out

---

## Step 1 — Prepare metadata

```bash
cd Code-Companion
pnpm --filter @workspace/solana run prepare-bkspc-pumpfun-launch
```

This prints the exact values to paste into pump.fun.

Expected output:

```
Name:        BLKSPACE COIN
Symbol:      BKSPC
Description: BLKSPACE COIN (BKSPC) — the Solana token for the BlkSpace community...
Website:     https://weixblack.net
Image:       Upload the BlkSpace logo
```

---

## Step 2 — Launch on pump.fun

1. Go to **https://pump.fun**
2. Connect your wallet
3. Click **Create**
4. Paste the values from Step 1
5. Upload the BlkSpace logo
6. Submit and sign the transaction
7. Save the **mint address** from the success page

Expected cost: **~0.02 SOL**

---

## Step 3 — Record the mint

After launch, paste the mint address below:

```
BKSPC pump.fun mint address: ________________________________
Launch transaction signature: ________________________________
Launch date: ________________________________
```

Optional: update the wallet UI to display the live BKSPC mint info.

---

## Disclaimers

- BKSPC is a community token. It has no guaranteed utility, value, or future conversion to WeixBucks.
- WeixBucks remain closed-loop in-app credits.
- Do not market BKSPC as an investment.
- Mainnet token launches carry legal and regulatory risk. Engage counsel before any marketing or exchange listing.

---

## Related docs

- `docs/bkspc-devnet-runbook.md` — devnet BKSPC mint setup
- `docs/tokenomics-policy.md` — economy policy
- `docs/economy-uniform-model.md` — creator marketplace model
