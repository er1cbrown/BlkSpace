import { beforeEach, describe, expect, it, vi } from "vitest";
import { storeIdentity } from "@/lib/auth";
import {
  createWebUserPost,
  listWebUserPosts,
} from "@/lib/web-posts";
import {
  fetchFollowSummary,
  followHostedHandle,
  getFollowing,
  isPostLiked,
  likeHostedPost,
} from "@/lib/web-userspace";

const hostedPost = vi.hoisted(() => vi.fn());
vi.mock("@/lib/hosted-api", () => ({ hostedPost }));

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  hostedPost.mockReset();
  localStorage.setItem("blkspace_handle", "alice");
  await storeIdentity("web_session_token", "alice", "1".repeat(64), "Alice");
  hostedPost.mockImplementation(async (url: string, body: { desiredState?: boolean; postUid?: string }) => {
    if (String(url).includes("/like")) {
      const likes = body.desiredState ? 1 : 0;
      return Response.json({
        ok: true,
        liked: body.desiredState,
        likesCount: likes,
        counts: { likes },
      });
    }
    if (String(url).includes("/follow")) {
      return Response.json({
        ok: true,
        following: body.desiredState,
        desiredState: body.desiredState,
      });
    }
    return Response.json({ ok: true, postUid: body.postUid });
  });
});

describe("shared likes and follows", () => {
  it("saves a like on the yard post and keeps the shared count", async () => {
    const post = await createWebUserPost({ content: "hello", townTag: "tsu" });
    const liked = await likeHostedPost(post.id);
    expect(liked.liked).toBe(true);
    expect(liked.likesCount).toBe(1);
    expect(listWebUserPosts()[0].liked).toBe(true);
    expect(listWebUserPosts()[0].likesCount).toBe(1);
    const likeCall = hostedPost.mock.calls.find((call) =>
      String(call[0]).includes("/like"),
    );
    expect(likeCall?.[1]).toMatchObject({
      postUid: post.postUid,
      desiredState: true,
    });

    const unliked = await likeHostedPost(post.id);
    expect(unliked.liked).toBe(false);
    expect(listWebUserPosts()[0].likesCount).toBe(0);
  });

  it("keeps a demo-post heart in this browser", async () => {
    const liked = await likeHostedPost(101);
    expect(liked.liked).toBe(true);
    expect(isPostLiked(101)).toBe(true);
    expect(
      hostedPost.mock.calls.some((call) => String(call[0]).includes("/like")),
    ).toBe(false);
  });

  it("saves a follow for this account", async () => {
    expect(await followHostedHandle("bob")).toBe(true);
    expect(getFollowing()).toContain("bob");
    expect(await followHostedHandle("bob")).toBe(false);
    expect(getFollowing()).not.toContain("bob");
    expect(hostedPost).toHaveBeenCalledWith(
      "/api/portfolio/interactions/follow",
      expect.objectContaining({ targetHandle: "bob", desiredState: true }),
    );
  });

  it("reads the public follow list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          ok: true,
          followersCount: 2,
          followingCount: 4,
        }),
      ),
    );
    try {
      await expect(fetchFollowSummary("bob")).resolves.toEqual({
        followersCount: 2,
        followingCount: 4,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
