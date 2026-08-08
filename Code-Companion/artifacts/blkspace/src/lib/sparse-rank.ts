/**
 * Sparse ranking helpers (yard-local A_y affinity).
 * See docs/theory-of-computing-scale.md — r ≈ locality + follow + domain w·f
 */
import type { OpportunityDomain } from "@/lib/opportunity-domains";
import { scoreDomainMatch } from "@/lib/opportunity-domains";

export interface SparseRankInput {
  /** 1 if item yard matches user home yard */
  sameYard: boolean;
  /** 1 if creator/org lead is in following set */
  followAffinity: boolean;
  /** Domain match score w·f */
  domainScore: number;
  /** Engagement proxy (interest count, likes, …) */
  engagement: number;
  /** Optional recency boost 0..1 */
  recency?: number;
}

/**
 * Linear score: α·yard + β·follow + γ·domain + δ·log(1+eng) + ε·recency
 * Coefficients chosen for campus discovery (local first, then graph, then domain).
 */
export function sparseLinearScore(x: SparseRankInput): number {
  const eng = Math.log1p(Math.max(0, x.engagement));
  return (
    (x.sameYard ? 3.0 : 0) +
    (x.followAffinity ? 2.0 : 0) +
    1.5 * x.domainScore +
    0.4 * eng +
    0.5 * (x.recency ?? 0)
  );
}

export function sortBySparseScore<T>(
  items: T[],
  scoreOf: (item: T) => number,
): T[] {
  return [...items].sort((a, b) => scoreOf(b) - scoreOf(a));
}

export function domainScoreFor(
  weights: Partial<Record<OpportunityDomain, number>>,
  domains: OpportunityDomain[],
): number {
  return scoreDomainMatch(weights, domains);
}
