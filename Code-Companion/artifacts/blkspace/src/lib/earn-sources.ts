/**
 * BlkSpace has two separate reputation/economy systems:
 *
 * - **WeixBucks (WB)** — spendable in-app currency (tips, boosts, themes, shop).
 *   Earned from posts, uploads, yard activity. Subject to MIDF throttle + 250 WB/day cap.
 *
 * - **Karma** — Reddit-style reputation (post karma + comment karma). Not purchasable,
 *   not convertible to WB. Affects visibility ranking and leaderboard standing.
 */

export const WB_EARN = {
  feedPost: 5,
  yardChannelPost: 5,
  yardEngagementBonus: 3,
  reply: 2,
  yardReplyBonus: 1,
  likeReceived: 1,
  mediaUpload: 10,
  joinYard: 5,
  wallPostApproved: 1,
  nodePinServe: 0.1,
} as const;

export const KARMA_EARN = {
  feedPost: 3,
  yardPost: 5,
  yardPostComment: 2,
  reply: 2,
  yardReply: 1,
  upvoteReceived: 1,
  mediaCreation: 5,
  joinYard: 3,
  wallComment: 1,
} as const;

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