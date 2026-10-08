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
const publishToRelays = vi.hoisted(() =>
  vi.fn(async () => ({ ok: false, relayUrl: "", reason: "skipped" })),
);
vi.mock("@/lib/hosted-api", () => ({ hostedPost }));
vi.mock("@/lib/weixnet-relays", () => ({ publishToRelays }));

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

  it("keeps the local pic when shared storage is not configured", async () => {
    hostedPost.mockResolvedValue(
      Response.json(
        { ok: false, error: "Shared post storage is not configured." },
        { status: 503 },
      ),
    );
    const post = await createWebUserPost({
      content: "library pic",
      townTag: "tsu",
      mediaHashes: ["web_abc"],
    });
    expect(post.mediaBlobs).toEqual(["web_abc"]);
    expect(listWebUserPosts()[0].content).toBe("library pic");
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

  it("sends the signed relay note when a WeixNet relay accepts it", async () => {
    await storeIdentity("web_session_token", "alice", "ab".repeat(32), "Alice");
    publishToRelays.mockImplementation(async (event: { id: string }) => ({
      ok: true,
      relayUrl: "wss://nos.lol",
      reason: "",
      id: event.id,
    }));
    hostedPost.mockResolvedValue(Response.json({ ok: true, storage: "cloud" }));
    const post = await createWebUserPost({ content: "on the relay", townTag: "tsu" });
    expect(post.relayUrl).toBe("wss://nos.lol");
    expect(post.nostrEventId).toMatch(/^[0-9a-f]{64}$/);
    const body = hostedPost.mock.calls[0][1];
    expect(body.nostrEvent.kind).toBe(1);
    expect(body.nostrEvent.content).toBe("on the relay");
    expect(verifyEvent(body.nostrEvent)).toBe(true);
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
