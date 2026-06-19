/**
 * Kalshi-style tokenomics (see docs/tokenomics-kalshi-model.md):
 *
 * - **WeixBucks (WB)** — earn-only platform credits. Tips/marketplace include published fees.
 *   MIDF throttle + 250 WB/day cap. Withdrawal = optional settlement rail (counsel-gated).
 *
 * - **Karma** — reputation only. Not purchasable, not convertible to WB.
 */

/** Nominal WB rewards — must match `db.rs` throttle_rewards bases. */
export const WB_EARN = {
  feedPost: 5,
  yardChannelPost: 5,
  yardEngagementBonus: 3,
  yardChannelTotal: 8,
  reply: 2,
  yardReplyBonus: 1,
  yardReplyTotal: 3,
  likeReceived: 1,
  mediaUpload: 10,
  joinYard: 5,
  eventRsvp: 2,
  wallPostApproved: 1,
  nodePinServe: 0.1,
} as const;

/** Nominal karma — must match `db.rs` grant_karma deltas. */
export const KARMA_EARN = {
  feedPost: 3,
  yardPost: 5,
  yardPostComment: 2,
  reply: 2,
  yardReply: 1,
  yardReplyTotal: 3,
  upvoteReceived: 1,
  mediaCreation: 2,
  joinYard: 3,
  eventRsvp: 2,
  wallComment: 1,
} as const;

/** UI + audit reference: action → earn surfaced in EarnToast when applicable. */
export const EARN_PATHS = [
  { action: "Feed post", wb: WB_EARN.feedPost, karma: KARMA_EARN.feedPost, toast: "Post created" },
  { action: "Yard channel post", wb: WB_EARN.yardChannelTotal, karma: 7, toast: "Posted to #channel" },
  { action: "Reply", wb: WB_EARN.reply, karma: KARMA_EARN.reply, toast: "Reply posted" },
  { action: "Yard reply", wb: WB_EARN.yardReplyTotal, karma: KARMA_EARN.yardReplyTotal, toast: "Reply posted" },
  { action: "Like received", wb: WB_EARN.likeReceived, karma: KARMA_EARN.upvoteReceived, toast: "Creator earned" },
  { action: "Media upload", wb: WB_EARN.mediaUpload, karma: KARMA_EARN.mediaCreation, toast: "Media upload" },
  { action: "Join yard", wb: WB_EARN.joinYard, karma: KARMA_EARN.joinYard, toast: "Joined yard" },
  { action: "Event RSVP", wb: WB_EARN.eventRsvp, karma: KARMA_EARN.eventRsvp, toast: "RSVP" },
  { action: "Wall post approved", wb: WB_EARN.wallPostApproved, karma: KARMA_EARN.wallComment, toast: "Wall post" },
] as const;

export type EarnCategory =
  | "creation"
  | "community"
  | "engagement"
  | "node";

export const EARN_CATEGORIES: Record<
  EarnCategory,
  { label: string; description: string }
> = {
  creation: {
    label: "Content creation",
    description: "Posts, uploads, reels — Instagram / TikTok / Newgrounds style",
  },
  community: {
    label: "Yard engagement",
    description: "Discord yards, Fizz-style hangouts, Reddit discussions",
  },
  engagement: {
    label: "Social engagement",
    description: "Likes, replies, wall posts — karma + WB to creators",
  },
  node: {
    label: "Node harvest",
    description: "Pinning, relay uptime — WeixNet participation",
  },
};