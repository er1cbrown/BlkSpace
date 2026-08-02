/**
 * BlkSpace brand lock — single source of truth for product UI + coin ticker.
 *
 * | Layer | Mark | Role |
 * |-------|------|------|
 * | Product / app / campus UI | **BlkSpace** | Trademark-intent name (capital B + S). GitHub: er1cbrown/BlkSpace |
 * | Settlement token | **BKSPC** | BlkSpace Coin — Solana ticker / “coin rights” path |
 * | Soft credits | WeixBucks (WB) | Earn-only in-app; not the trademark product name |
 *
 * Do **not** replace BlkSpace with BKSPC in chrome (nav, welcome, about).
 * Do **use** BKSPC only for settlement / Solana / investor token copy.
 * Campus culture: “the yard” — lore, not the legal product mark.
 *
 * Trademark / counsel: product mark = BlkSpace; ticker = BKSPC. Not legal advice.
 */
export const BRAND = {
  /** Primary product name — UI, GitHub, installers, trademark path */
  name: "BlkSpace",
  /** Same as name; explicit for copy that says “product” */
  product: "BlkSpace",
  /** Solana token ticker (BlkSpace Coin) — coin rights path */
  symbol: "BKSPC",
  /** Long form for settlement / legal-facing token copy */
  coinName: "BlkSpace Coin",
  /** Soft currency (not the product trademark) */
  softCurrency: "WeixBucks",
  softCurrencySymbol: "WB",
  tagline: "The social network that pays you to post",
  /** In-app cultural layer */
  lore: "the yard",
  /** Product site (custom domain) */
  siteUrl: "https://bkspc.app",
  /** GitHub Pages until custom domain is live */
  pagesUrl: "https://er1cbrown.github.io/BlkSpace",
  /** Canonical monorepo — keep BlkSpace casing for trademark consistency */
  githubRepo: "https://github.com/er1cbrown/BlkSpace",
  githubOrgOrUser: "er1cbrown",
  githubRepoName: "BlkSpace",
} as const;
