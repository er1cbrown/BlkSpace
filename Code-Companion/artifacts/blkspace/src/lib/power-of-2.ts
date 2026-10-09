/**
 * Power of 2 — the two on-chain rails.
 *
 * Canonical on-chain asset: BKSPC (Token-2022) on Solana — settlement, non-rewarding
 * staking, and allowlisted timelocked governance.
 *
 * BI9 (ERC-20) on HyperEVM is retained but NOT deployable by this operator: Hyperliquid
 * geo-restricts the US. Decision record: docs/canonical-chain-decision.md
 *
 * Canonical rules: docs/tokenomics.md
 */

export const POWER_OF_2 = {
  /** BKSPC — the rail users can actually reach. */
  canonicalSolana: {
    tier: 2,
    chain: "solana-devnet",
    chainLabel: "Solana",
    role: "Canonical on-chain asset — settlement, staking, governance",
    token: "BKSPC",
    standard: "Token-2022",
    canonical: true,
    wbRatio: 1000,
    interactsWithWeixBucks: true,
    pillarSub: "Solana · BKSPC",
    pillarHref: "#settlement",
  },
  /** BI9 — retained reference code. Not deployable from this operator's jurisdiction. */
  retainedHyperEvm: {
    tier: 1,
    chain: "hyperevm",
    chainLabel: "HyperEVM",
    role: "Retained reference contracts — not deployable from the US",
    token: "BI9",
    standard: "ERC-20",
    canonical: false,
    wbRatio: null,
    interactsWithWeixBucks: false,
    deployable: false,
    pillarSub: "HyperEVM · BI9",
    pillarHref: "#hyperevm",
  },
} as const;

/** @deprecated use optionalSolanaPrototype — kept so older study text still maps */
export const socialMicroSettlement = POWER_OF_2.canonicalSolana;
/** @deprecated use canonicalSolana */
export const protocolGovernance = POWER_OF_2.canonicalSolana;

export type PowerOf2Rail = keyof typeof POWER_OF_2;

/** Wallet pillar 4 points at BKSPC, the canonical rail. */
export function settlementPillar() {
  const t = POWER_OF_2.canonicalSolana;
  return { label: "On-chain", sub: t.pillarSub, href: t.pillarHref };
}

export function canonicalStandard(): "Token-2022" {
  return POWER_OF_2.canonicalSolana.standard;
}

/**
 * Whether the canonical rail settles from WeixBucks.
 *
 * True — BKSPC is the settlement target. This is *explicit, user-initiated withdrawal*,
 * never an automatic conversion. The no-auto-conversion invariant lives on
 * `retainedHyperEvm.interactsWithWeixBucks === false` and `wbRatio === null`.
 */
export function canonicalRailSettlesWeixBucks(): boolean {
  return POWER_OF_2.canonicalSolana.interactsWithWeixBucks;
}

export function solanaIsCanonicalMint(): boolean {
  return POWER_OF_2.canonicalSolana.canonical;
}

/** BI9 on HyperEVM is retained but not deployable from this operator's jurisdiction. */
export function hyperEvmDeployable(): boolean {
  return POWER_OF_2.retainedHyperEvm.deployable;
}
