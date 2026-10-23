/**
 * BKSPC brand lock — single source of truth for product UI + token copy.
 *
 * Product name is **BKSPC** only. Not BlkSpace. Not a dual mark.
 * Yards are HBCU campuses only — no SEC / NCAA / PWI picker.
 * Soft credits stay WeixBucks (WB).
 *
 * TWO COINS, DISTINCTLY DIFFERENT. Coexistence is intentional; conflation is not.
 *
 *   BKSPC — canonical Token-2022 on Solana. Settlement, staking, governance.
 *   BI9   — separate ERC-20 aimed at Ethereum. Not deployed. Not the cash-out.
 *           Not a HyperEVM asset.
 *
 * `symbol` is the canonical settlement ticker. `bi9Symbol` is the other coin.
 *
 * Site: bkspc.app · GitHub repo path stays er1cbrown/BlkSpace (history).
 */
export const BRAND = {
  /** Primary product name — UI, installers, window chrome */
  name: "BKSPC",
  /** Same as name; explicit for copy that says “product” */
  product: "BKSPC",
  /** Canonical settlement ticker — BKSPC, Token-2022 on Solana. */
  symbol: "BKSPC",
  /** Long form for BKSPC settlement copy */
  coinName: "BKSPC Coin",
  /** Canonical on-chain token. Same ticker as `symbol`. */
  canonicalTokenSymbol: "BKSPC",
  /** Long form for the canonical token */
  canonicalTokenName: "BKSPC Coin",
  /** Chain the canonical token lives on */
  canonicalTokenChain: "Solana",
  /** Separate ERC-20. Not deployed. Not a HyperEVM asset. */
  bi9Symbol: "BI9",
  bi9Name: "BLACKINCCOIN",
  bi9Chain: "Ethereum",
  /** Soft currency (not the product trademark) */
  softCurrency: "WeixBucks",
  softCurrencySymbol: "WB",
  tagline: "The social network that pays you to post",
  /** In-app cultural layer — HBCU campus space */
  lore: "the yard",
  /** Product site (custom domain) */
  siteUrl: "https://bkspc.app",
  /** GitHub Pages until custom domain is live */
  pagesUrl: "https://er1cbrown.github.io/BlkSpace",
  /** Canonical monorepo (folder/history name; product chrome is BKSPC) */
  githubRepo: "https://github.com/er1cbrown/BlkSpace",
  githubOrgOrUser: "er1cbrown",
  githubRepoName: "BlkSpace",
} as const;
