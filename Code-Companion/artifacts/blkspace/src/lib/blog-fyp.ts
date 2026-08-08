/**
 * Blog / FYP ranking — text-first discovery (not buyable rank).
 * Prefers substantial posts + yard locality; demotes high-risk.
 * See docs/features/bkspc-university-vision.md
 */

import { sparseLinearScore } from "@/lib/sparse-rank";

export interface BlogFypPost {
  id?: number | string;
  content?: string;
  authorHandle?: string;
  townTag?: string;
  likesCount?: number;
  engagementQuality?: number;
  maliciousScore?: number;
  riskLevel?: string;
  mediaBlobs?: string[];
  createdAt?: string;
}

export function isHighRiskPost(p: {
  riskLevel?: string;
  maliciousScore?: number;
}): boolean {
  return p.riskLevel === "high" || (p.maliciousScore ?? 0) > 0.7;
}

/** Prefer longer text / essay-like posts over empty captions. */
export function blogSubstanceScore(content: string | undefined): number {
  const len = (content || "").trim().length;
  if (len >= 280) return 1;
  if (len >= 120) return 0.75;
  if (len >= 40) return 0.45;
  if (len >= 1) return 0.2;
  return 0;
}

/**
 * Score for Blog FYP:
 * sparse locality + follow + engagement + substance − risk.
 * No paid boost term — tips are separate transfers, never rank purchase.
 */
export function blogFypScore(
  p: BlogFypPost,
  opts: {
    homeYardId: string;
    followedHandles: Set<string> | string[];
  },
): number {
  if (isHighRiskPost(p)) return -1;

  const followSet =
    opts.followedHandles instanceof Set
      ? opts.followedHandles
      : new Set(opts.followedHandles.map((h) => h.toLowerCase()));

  const sameYard =
    !!p.townTag &&
    p.townTag.toLowerCase() === (opts.homeYardId || "").toLowerCase();
  const followAffinity = !!(
    p.authorHandle && followSet.has(p.authorHandle.toLowerCase())
  );

  const eng =
    (p.likesCount || 0) * (p.engagementQuality || 1) * (1 - (p.maliciousScore || 0));

  let recency = 0;
  if (p.createdAt) {
    const ageMs = Date.now() - new Date(p.createdAt).getTime();
    const ageDays = ageMs / 86_400_000;
    recency = Math.max(0, 1 - ageDays / 14);
  }

  const base = sparseLinearScore({
    sameYard,
    followAffinity,
    domainScore: blogSubstanceScore(p.content),
    engagement: eng,
    recency,
  });

  // Slight preference for text-heavy over media-only captions
  const mediaOnly =
    blogSubstanceScore(p.content) <= 0.2 && (p.mediaBlobs?.length || 0) > 0;
  return base + (mediaOnly ? -0.5 : 0);
}

export function rankBlogFypPosts<T extends BlogFypPost>(
  posts: T[],
  opts: {
    homeYardId: string;
    followedHandles: Set<string> | string[];
    limit?: number;
  },
): T[] {
  const limit = opts.limit ?? 24;
  return [...posts]
    .filter((p) => !isHighRiskPost(p))
    .map((p) => ({ p, s: blogFypScore(p, opts) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
}
