/**
 * Power of 2 — dual-chain functional separation.
 * Two rails, two jobs. Neither chain is the protocol's primary settlement layer.
 *
 * Spec: docs/features/comparative-multi-chain-prototyping-study.md
 */

export const POWER_OF_2 = {
  socialMicroSettlement: {
    tier: 1,
    chain: "solana-devnet",
    chainLabel: "Solana Devnet",
    role: "Social micro-settlement",
    token: "BKSPC",
    standard: "Token-2022",
    wbRatio: 1000,
    interactsWithWeixBucks: true,
    pillarSub: "Solana · BKSPC",
    pillarHref: "#settlement",
  },
  protocolGovernance: {
    tier: 2,
    chain: "hyperevm",
    chainLabel: "HyperEVM",
    role: "Protocol governance & sovereign backplane",
    token: "BI9",
    standard: "ERC-20",
    wbRatio: null,
    interactsWithWeixBucks: false,
    pillarSub: "HyperEVM · BI9",
    pillarHref: "#hyperevm",
  },
} as const;

export type PowerOf2Rail = keyof typeof POWER_OF_2;

/** Student settlement is Solana BKSPC. HyperEVM does not occupy this job. */
export function settlementPillar() {
  const t = POWER_OF_2.socialMicroSettlement;
  return { label: "Settlement", sub: t.pillarSub, href: t.pillarHref };
}

export function governanceRailTouchesWeixBucks(): boolean {
  return POWER_OF_2.protocolGovernance.interactsWithWeixBucks;
}

export function bothRailsClaimPrimarySettlement(): boolean {
  return false;
}
