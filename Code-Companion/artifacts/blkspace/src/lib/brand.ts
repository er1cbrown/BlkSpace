/**
 * BKSPC — single source of truth for investor-facing brand.
 * Name and Solana ticker are both BKSPC (BLKC and other BLK* tickers were taken).
 * Do not surface "BlkSpace" / "BLKSPACE" on the public website or pump.fun — one name only.
 * Campus / HBCU culture lives in-app as "the yard" lore — not in the investor pitch.
 */
export const BRAND = {
  /** Product + token name (pump.fun, website, nav) */
  name: "BKSPC",
  /** Solana token ticker — same as name */
  symbol: "BKSPC",
  tagline: "The social network that pays you to post",
  /** In-app cultural layer (yards, campuses) — lore, not investor pitch */
  lore: "the yard",
  /** Register this domain and point DNS → GitHub Pages (see docs/bkspc-pumpfun-launch.md) */
  siteUrl: "https://bkspc.app",
  /** Stopgap until custom domain is live */
  pagesUrl: "https://er1cbrown.github.io/BlkSpace",
  githubRepo: "https://github.com/er1cbrown/BlkSpace",
} as const;