import { describe, expect, it } from "vitest";
import { burstExcess, duplicatePostCount, midfScore } from "@/lib/midf";

describe("midf score", () => {
  it("pauses earn when a new follower ring copies the same post", () => {
    const score = midfScore({
      followerCount: 1,
      lowFollowerCount: 1,
      recentFollowerCount: 1,
      selfLikes: 0,
      totalLikes: 0,
      selfReplies: 0,
      totalReplies: 0,
      totalPosts: 5,
      duplicatePosts: duplicatePostCount(Array(5).fill("farm note")),
      burstExcess: burstExcess([
        "2026-10-28T17:01:00.000Z",
        "2026-10-28T17:02:00.000Z",
        "2026-10-28T17:03:00.000Z",
        "2026-10-28T17:04:00.000Z",
        "2026-10-28T17:05:00.000Z",
      ]),
    });
    expect(score.overall).toBeGreaterThan(0.7);
    expect(score.paused).toBe(true);
    expect(score.risk).toBe("high");
  });

  it("leaves a quiet account alone", () => {
    const score = midfScore({
      followerCount: 0,
      lowFollowerCount: 0,
      recentFollowerCount: 0,
      selfLikes: 0,
      totalLikes: 0,
      selfReplies: 0,
      totalReplies: 0,
      totalPosts: 1,
      duplicatePosts: 0,
      burstExcess: 0,
    });
    expect(score.paused).toBe(false);
    expect(score.risk).toBe("low");
  });
});
