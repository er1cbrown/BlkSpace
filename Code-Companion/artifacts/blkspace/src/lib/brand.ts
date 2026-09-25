/**
 * BKSPC brand lock — single source of truth for product UI + token copy.
 *
 * Product name is **BKSPC** only. Not BlkSpace. Not a dual mark.
 * Yards are HBCU campuses only — no SEC / NCAA / PWI picker.
 * Soft credits stay WeixBucks (WB).
 *
 * TWO COINS, DISTINCTLY DIFFERENT. Coexistence is intentional; conflation is not.
 *
 *   BI9   — canonical ERC-20 on HyperEVM. The only mint. Settlement, treasury,
 *           protocol roles. Canonical wherever copy says "the token".
 *   BKSPC — Solana Token-2022. Optional prototype and wallet-reach. NEVER
 *           canonical, never a second mint home. Same mark as the *product*,
 *           which is a branding collision, not a token identity.
 *
 * `symbol` therefore means the Solana prototype ticker and must not be used for
 * canonical-token copy — use `canonicalTokenSymbol` for that. See
 * docs/economy-canonical.md §2 and §8.
 *
 * Site: bkspc.app · GitHub repo path stays er1cbrown/BlkSpace (history).
 */
export const BRAND = {
  /** Primary product name — UI, installers, window chrome */
  name: "BKSPC",
  /** Same as name; explicit for copy that says “product” */
  product: "BKSPC",
  /** Solana Token-2022 prototype ticker. NOT the canonical token. */
  symbol: "BKSPC",
  /** Long form for Solana-prototype settlement copy */
  coinName: "BKSPC Coin",
  /** Canonical on-chain token — BI9, ERC-20 on HyperEVM. The only mint. */
  canonicalTokenSymbol: "BI9",
  /** Long form for canonical token / legal-facing copy */
  canonicalTokenName: "BLACKINCCOIN",
  /** Chain the canonical token lives on */
  canonicalTokenChain: "HyperEVM",
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
