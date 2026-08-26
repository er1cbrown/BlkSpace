/**
 * BKSPC brand lock — single source of truth for product UI + settlement ticker.
 *
 * Product name is **BKSPC** only. Not BlkSpace. Not a dual mark.
 * Yards are all-inclusive: any campus (HBCU, SEC, NCAA, independent).
 * Soft credits stay WeixBucks (WB). Settlement ticker is the same mark: BKSPC.
 *
 * Site: bkspc.app · GitHub repo path stays er1cbrown/BlkSpace (history).
 */
export const BRAND = {
  /** Primary product name — UI, installers, window chrome */
  name: "BKSPC",
  /** Same as name; explicit for copy that says “product” */
  product: "BKSPC",
  /** Solana token ticker — same as the product mark */
  symbol: "BKSPC",
  /** Long form for settlement / legal-facing token copy */
  coinName: "BKSPC Coin",
  /** Soft currency (not the product trademark) */
  softCurrency: "WeixBucks",
  softCurrencySymbol: "WB",
  tagline: "The social network that pays you to post",
  /** In-app cultural layer — campus space, any school */
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
