/**
 * Power of 2 — dual-chain jobs with one canonical mint.
 *
 * Canonical on-chain token: BI9 ERC-20 on HyperEVM.
 * Optional Solana Token-2022 BKSPC is a high-throughput prototype, not the mint home.
 *
 * Spec: docs/features/comparative-multi-chain-prototyping-study.md
 * Canonical rules: docs/tokenomics.md
 */

export const POWER_OF_2 = {
  canonicalErc20: {
    tier: 2,
    chain: "hyperevm",
    chainLabel: "HyperEVM",
    role: "Canonical on-chain token (ERC-20) + protocol governance",
    token: "BI9",
    standard: "ERC-20",
    canonical: true,
    wbRatio: null,
    interactsWithWeixBucks: false,
    pillarSub: "HyperEVM · BI9",
    pillarHref: "#hyperevm",
  },
  optionalSolanaPrototype: {
    tier: 1,
    chain: "solana-devnet",
    chainLabel: "Solana Devnet",
    role: "Optional high-throughput student receipt prototype",
    token: "BKSPC",
    standard: "Token-2022",
    canonical: false,
    wbRatio: 1000,
    interactsWithWeixBucks: true,
    pillarSub: "Solana · BKSPC",
    pillarHref: "#settlement",
  },
} as const;

/** @deprecated use optionalSolanaPrototype — kept so older study text still maps */
export const socialMicroSettlement = POWER_OF_2.optionalSolanaPrototype;
/** @deprecated use canonicalErc20 */
export const protocolGovernance = POWER_OF_2.canonicalErc20;

export type PowerOf2Rail = keyof typeof POWER_OF_2;

/** Wallet pillar 4 points at the canonical ERC-20, not the Solana prototype. */
export function settlementPillar() {
  const t = POWER_OF_2.canonicalErc20;
  return { label: "On-chain", sub: t.pillarSub, href: t.pillarHref };
}

export function canonicalStandard(): "ERC-20" {
  return POWER_OF_2.canonicalErc20.standard;
}

export function governanceRailTouchesWeixBucks(): boolean {
  return POWER_OF_2.canonicalErc20.interactsWithWeixBucks;
}

export function solanaIsCanonicalMint(): boolean {
  return POWER_OF_2.optionalSolanaPrototype.canonical;
}
