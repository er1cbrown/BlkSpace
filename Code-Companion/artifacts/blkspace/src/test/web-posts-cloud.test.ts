import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWebReply,
  createWebUserPost,
  listWebReplies,
  listWebUserPosts,
  refreshPortfolioFromTurso,
} from "@/lib/web-posts";
import { createHttpAuthHeader, storeIdentity } from "@/lib/auth";
import { verifyEvent } from "nostr-tools/pure";

const hostedPost = vi.hoisted(() => vi.fn());
vi.mock("@/lib/hosted-api", () => ({ hostedPost }));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  hostedPost.mockReset();
  localStorage.setItem("blkspace_handle", "alice");
});

describe("cloud post acknowledgement", () => {
  it("does not persist a successful-looking local post when the server fails", async () => {
    hostedPost.mockResolvedValue(
      Response.json(
        { ok: false, error: "Storage unavailable" },
        { status: 502 },
      ),
    );
    await expect(
      createWebUserPost({ content: "hello", townTag: "tsu" }),
    ).rejects.toThrow("Storage unavailable");
    expect(listWebUserPosts()).toHaveLength(0);
  });

  it("waits for the server before storing the post locally", async () => {
    let complete!: (value: Response) => void;
    hostedPost.mockReturnValue(
      new Promise<Response>((resolve) => {
        complete = resolve;
      }),
    );
    const pending = createWebUserPost({ content: "shared", townTag: "tsu" });
    expect(listWebUserPosts()).toHaveLength(0);
    complete(Response.json({ ok: true, storage: "cloud" }));
    await pending;
    expect(listWebUserPosts()[0].content).toBe("shared");
  });

  it("signs a verifiable HTTP proof with the existing browser identity", async () => {
    await storeIdentity("web_session_token", "alice", "1".repeat(64), "Alice");
    const header = createHttpAuthHeader("/api/portfolio/post", "POST", "{}");
    const event = JSON.parse(atob(header.slice(6)));
    expect(verifyEvent(event)).toBe(true);
    expect(event.kind).toBe(27235);
    expect(event.tags).toContainEqual([
      "u",
      `${window.location.origin}/api/portfolio/post`,
    ]);
    expect(event.tags).toContainEqual(["method", "POST"]);
  });

  it("keeps browser replies durable and updates the post count", async () => {
    hostedPost.mockResolvedValue(Response.json({ ok: true, storage: "cloud" }));
    const post = await createWebUserPost({
      content: "reply target",
      townTag: "tsu",
    });
    const reply = createWebReply(post.id, "A browser reply", "alice");
    expect(listWebReplies(post.id)).toEqual([reply]);
    expect(listWebUserPosts()[0].repliesCount).toBe(1);
  });

  it("keeps hosted image arrays when refreshing the browser cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        rows: [
          {
            id: 77,
            authorHandle: "bob",
            content: "photo post",
            townTag: "tsu",
            mediaBlobs: ["https://media.example.test/photo.jpg"],
            createdAt: "2026-09-24T00:00:00Z",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      await refreshPortfolioFromTurso();
    } finally {
      vi.unstubAllGlobals();
    }
    expect(listWebUserPosts("tsu")[0].mediaBlobs).toEqual([
      "https://media.example.test/photo.jpg",
    ]);
  });
});
