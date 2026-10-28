/**
 * Malicious-intent score for a yard account.
 * The weights match the desktop SQLite heuristic. This is not a model.
 * Above 0.7, yard earn pauses. A sale payout is not earn.
 */

export const MIDF_EARN_PAUSE = 0.7;

export const EARN_CAP_DEFAULT = 250;
export const EARN_CAP_MIN = 100;
export const EARN_CAP_MAX = 400;
export const EARN_CAP_STEP = 25;

export interface MidfInput {
  followerCount: number;
  lowFollowerCount: number;
  recentFollowerCount: number;
  selfLikes: number;
  totalLikes: number;
  selfReplies: number;
  totalReplies: number;
  totalPosts: number;
  duplicatePosts: number;
  burstExcess: number;
}

export interface MidfScore {
  overall: number;
  risk: "low" | "medium" | "high";
  paused: boolean;
  dimensions: {
    starPattern: number;
    followerVelocity: number;
    selfInteraction: number;
    contentSimilarity: number;
    temporalPattern: number;
  };
}

export function clampEarnCap(value: number): number {
  if (!Number.isFinite(value)) return EARN_CAP_DEFAULT;
  const stepped = Math.round(value / EARN_CAP_STEP) * EARN_CAP_STEP;
  return Math.min(EARN_CAP_MAX, Math.max(EARN_CAP_MIN, stepped));
}

/** Posts that share a 50-character prefix count once the prefix is repeated. */
export function duplicatePostCount(contents: string[]): number {
  if (contents.length <= 1) return 0;
  const counts = new Map<string, number>();
  for (const content of contents) {
    const prefix = content.slice(0, 50);
    counts.set(prefix, (counts.get(prefix) || 0) + 1);
  }
  let duplicate = 0;
  for (const count of counts.values()) {
    if (count > 1) duplicate += count;
  }
  return duplicate;
}

/** Posts past four in the same clock hour. The stamp is an ISO time. */
export function burstExcess(stamps: string[]): number {
  const hours = new Map<string, number>();
  for (const stamp of stamps) {
    const hour = stamp.slice(0, 13);
    if (hour.length < 13) continue;
    hours.set(hour, (hours.get(hour) || 0) + 1);
  }
  let excess = 0;
  for (const count of hours.values()) {
    if (count > 4) excess += count - 4;
  }
  return excess;
}

function knee(part: number, whole: number, at: number): number {
  if (whole <= 0) return 0;
  return Math.min(1, part / whole / at);
}

export function midfScore(input: MidfInput): MidfScore {
  const star = knee(input.lowFollowerCount, input.followerCount, 0.8);
  const velocity = knee(input.recentFollowerCount, input.followerCount, 0.5);
  const likeRatio =
    input.totalLikes > 0 ? input.selfLikes / input.totalLikes : 0;
  const replyRatio =
    input.totalReplies > 0 ? input.selfReplies / input.totalReplies : 0;
  const selfInteraction = Math.min(1, (likeRatio + replyRatio) / 2);
  const contentSimilarity =
    input.totalPosts <= 1
      ? 0
      : Math.min(1, input.duplicatePosts / input.totalPosts);
  const temporalPattern =
    input.totalPosts <= 0
      ? 0
      : Math.min(1, input.burstExcess / input.totalPosts);
  const overall = Math.min(
    1,
    star * 0.3 +
      velocity * 0.25 +
      selfInteraction * 0.2 +
      contentSimilarity * 0.15 +
      temporalPattern * 0.1,
  );
  const risk = overall > 0.7 ? "high" : overall > 0.4 ? "medium" : "low";
  return {
    overall,
    risk,
    paused: overall > MIDF_EARN_PAUSE,
    dimensions: {
      starPattern: star,
      followerVelocity: velocity,
      selfInteraction,
      contentSimilarity,
      temporalPattern,
    },
  };
}
