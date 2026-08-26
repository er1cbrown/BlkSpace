# BKSPC product mark · coin rights

**Last updated:** 2026-08-13  
**Not legal advice.** File for product consistency + counsel handoff.

---

## Naming stack (locked 2026-08-13)

| Layer | Canonical string | Where it appears |
|-------|------------------|------------------|
| **Product / app / UI** | **BKSPC** | Nav, welcome, installers, window title, site `bkspc.app` |
| **Coin / settlement ticker** | **BKSPC** | Same mark — wallet settlement, Solana, investor token column |
| **Coin long name** | **BKSPC Coin** | Tokenomics, legal-facing settlement copy |
| **Soft credits** | WeixBucks (**WB**) | Earn/spend, marketplace, escrow — **not** the product mark |

The product is **all-inclusive campus social**. Yards are any school (HBCU, SEC, NCAA). Not an HBCU-only product.

GitHub repo path stays [`er1cbrown/BlkSpace`](https://github.com/er1cbrown/BlkSpace) for history. Chrome never says BlkSpace.

### What not to do

- Do **not** ship “BlkSpace” as the product name in UI.  
- Do **not** market mainnet BKSPC as “already live rights for everyone” without Cred gates + counsel.  
- Do **not** position the app as HBCU-only.

---

## Code source of truth

[`Code-Companion/artifacts/blkspace/src/lib/brand.ts`](../../Code-Companion/artifacts/blkspace/src/lib/brand.ts)

```ts
BRAND.name      // "BKSPC"
BRAND.symbol    // "BKSPC"
BRAND.coinName  // "BKSPC Coin"
```
