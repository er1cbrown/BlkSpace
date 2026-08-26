/**
 * Yard Cred maps to better versions of Fast / Transparent / Self-custodial —
 * not a pay-to-win shop. Mirrors the Fast-Transparent-SelfCustodial UX note.
 */
import { FEE_BPS } from "@/lib/tokenomics";

export interface CredPrivileges {
  score: number;
  tier: "starter" | "campus" | "yard";
  /** Subtracted from published tip fee bps (never below 0). */
  tipFeeDiscountBps: number;
  effectiveTipFeeBps: number;
  listingMaxWb: number;
  settlement: "standard" | "priority";
  bkspcPath: boolean;
  cooldownHint: string;
}

export function privilegesForCred(score: number): CredPrivileges {
  const n = Math.max(0, Math.floor(score || 0));
  if (n >= 40) {
    const discount = 50;
    return {
      score: n,
      tier: "yard",
      tipFeeDiscountBps: discount,
      effectiveTipFeeBps: Math.max(0, FEE_BPS.tip - discount),
      listingMaxWb: 500,
      settlement: "priority",
      bkspcPath: true,
      cooldownHint: "Shorter cash-out cooldown",
    };
  }
  if (n >= 15) {
    const discount = 25;
    return {
      score: n,
      tier: "campus",
      tipFeeDiscountBps: discount,
      effectiveTipFeeBps: Math.max(0, FEE_BPS.tip - discount),
      listingMaxWb: 200,
      settlement: "standard",
      bkspcPath: true,
      cooldownHint: "Standard settlement",
    };
  }
  return {
    score: n,
    tier: "starter",
    tipFeeDiscountBps: 0,
    effectiveTipFeeBps: FEE_BPS.tip,
    listingMaxWb: 80,
    settlement: "standard",
    bkspcPath: false,
    cooldownHint: "Build Cred for lower fees and BKSPC",
  };
}

export const YARD_CRED_RELEASE_DELTA = 1;
