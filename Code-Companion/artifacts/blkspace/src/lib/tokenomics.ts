/**
 * Kalshi-style tokenomics — mirrors `db.rs` published policy.
 * See docs/tokenomics-kalshi-model.md
 */

export const TOKENOMICS_MODEL = "kalshi-regulated-settlement" as const;

/** Basis points (1 bps = 0.01%) */
export const FEE_BPS = {
  tip: 200,
  marketplace: 500,
  withdrawSettlement: 100,
} as const;

export function formatFeePercent(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

export function calcPlatformFee(amount: number, feeBps: number): number {
  if (amount <= 0 || feeBps <= 0) return 0;
  return Math.floor((amount * feeBps) / 10000);
}

export const KALSHI_FRAMING = {
  wbLabel: "Platform credits (collateral)",
  blkLabel: "Settlement receipt (optional)",
  karmaLabel: "Reputation index (non-monetary)",
} as const;