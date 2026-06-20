/**
 * BlkSpace published economy — mirrors `db.rs` / docs/economy-uniform-model.md
 */

export const TOKENOMICS_MODEL = "blkspace-published" as const;
export const ECONOMY_UNIFORM_MODEL = "creator-marketplace" as const;

/** Basis points (1 bps = 0.01%) */
export const FEE_BPS = {
  tip: 200,
  marketplace: 500,
  withdrawSettlement: 100,
} as const;

export const MIDF_EARN_THROTTLE_THRESHOLD = 0.7;

export const SOFT_CURRENCY = {
  symbol: "WB",
  name: "WeixBucks",
  purchasable: false,
} as const;

export const SETTLEMENT_TOKEN = {
  symbol: "BKSPC",
  name: "BlkSpace Settlement",
  ratio: 1000,
} as const;

/** Same pattern as Robux, V-Bucks, Bits — earn in-app, spend in creator shop */
export const CREATOR_ECONOMY_SUMMARY =
  "Earn WeixBucks from activity, spend them on tips and the creator marketplace. Optional BKSPC settlement is a separate on-chain layer — same class of economy as Roblox or Fortnite, not a cash shop.";

export const PLATFORM_RULES = [
  "WB is earn-only — not sold for USD",
  "Creators sell in the marketplace for WB; platform fee applies",
  "Karma is reputation only — never spendable",
  "BKSPC settles earned WB on-chain after eligibility; listings require legal review",
  "Fees, caps, and throttle rules are always visible in wallet",
] as const;

export function formatFeePercent(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

export function calcPlatformFee(amount: number, feeBps: number): number {
  if (amount <= 0 || feeBps <= 0) return 0;
  return Math.floor((amount * feeBps) / 10000);
}

export const BKSPC_SYMBOL = SETTLEMENT_TOKEN.symbol;
export const BKSPC_NAME = SETTLEMENT_TOKEN.name;
export const WB_TO_BKSPC_RATIO = SETTLEMENT_TOKEN.ratio;