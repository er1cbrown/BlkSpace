/**
 * Browser-local posts when Tauri is unavailable.
 * Merged with seed content for feed preview.
 */

import type { SeedPost } from "@/lib/seed-content";
import { getCurrentDisplayName, getCurrentHandle } from "@/lib/auth";
import { hostedPost } from "@/lib/hosted-api";

const LS_KEY = "blkspace_web_user_posts_v1";

export type WebUserPost = SeedPost;

function load(): WebUserPost[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WebUserPost[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(posts: WebUserPost[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(posts.slice(0, 100)));
}

async function mirrorPost(post: WebUserPost) {
  const res = await hostedPost("/api/portfolio/post", post);
  // Static-only previews retain their explicitly local userspace.
  if (
    import.meta.env.DEV &&
    (res.status === 404 ||
      (res.ok && res.headers.get("content-type")?.includes("text/html")))
  )
    return;
  const body = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
  } | null;
  if (!res.ok || body?.ok !== true) {
    throw new Error(
      body?.error || "Post was not saved to the cloud. Please retry.",
    );
  }
}

type HostedPortfolioRow = {
  id: string | number;
  post_uid?: string;
  postUid?: string;
  author_handle?: string;
  authorHandle?: string;
  author_pubkey?: string;
  authorPubkey?: string;
  content: string;
  town_tag?: string;
  townTag?: string;
  replies_count?: number;
  repliesCount?: number;
  reposts_count?: number;
  repostsCount?: number;
  likes_count?: number;
  likesCount?: number;
  liked?: boolean;
  reposted?: boolean;
  media_blobs?: unknown;
  mediaBlobs?: unknown;
  created_at?: string;
  createdAt?: string;
};

function parseHostedMedia(value: unknown): string[] {
  const parsed =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return [];
          }
        })()
      : value;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (item): item is string =>
        typeof item === "string" && /^https:\/\//i.test(item),
    )
    .slice(0, 10);
}

/** Pull posts saved on Turso into this browser. No-op until the database is configured. */
export async function refreshPortfolioFromTurso(): Promise<void> {
  try {
    const res = await fetch("/api/portfolio/posts");
    if (!res.ok) return;
    const body = (await res.json()) as { rows?: HostedPortfolioRow[] };
    if (!body.rows?.length) return;
    const local = load();
    const merged = [...local];
    for (const row of body.rows) {
      const id = Number(row.id);
      if (!id) continue;
      const mediaBlobs = parseHostedMedia(row.mediaBlobs ?? row.media_blobs);
      const postUid = row.postUid ?? row.post_uid;
      const authorHandle = row.authorHandle ?? row.author_handle ?? "";
      const authorPubkey = row.authorPubkey ?? row.author_pubkey;
      const townTag = row.townTag ?? row.town_tag ?? "";
      const repliesCount = row.repliesCount ?? row.replies_count ?? 0;
      const repostsCount = row.repostsCount ?? row.reposts_count ?? 0;
      const likesCount = row.likesCount ?? row.likes_count ?? 0;
      const liked = row.liked ?? false;
      const reposted = row.reposted ?? false;
      const createdAt =
        row.createdAt ?? row.created_at ?? new Date().toISOString();
      const existingIndex = merged.findIndex((post) => post.id === id);
      const hostedPost: WebUserPost = {
        id,
        postUid,
        authorHandle,
        authorPubkey,
        authorDisplayName: authorHandle,
        authorAvatarUrl: "",
        content: row.content,
        townTag,
        repliesCount,
        repostsCount,
        likesCount,
        liked,
        reposted,
        mediaBlobs,
        nostrEventId: "",
        relayUrl: "",
        createdAt,
        engagementQuality: 1,
        maliciousScore: 0,
        riskLevel: "low",
      };
      if (existingIndex >= 0) {
        const existing = merged[existingIndex];
        merged[existingIndex] = {
          ...existing,
          postUid: postUid ?? existing.postUid,
          authorHandle,
          authorPubkey: authorPubkey ?? existing.authorPubkey,
          authorDisplayName: authorHandle,
          content: row.content,
          townTag,
          repliesCount,
          repostsCount,
          likesCount,
          liked,
          reposted,
          mediaBlobs: mediaBlobs.length ? mediaBlobs : existing.mediaBlobs,
          createdAt: existing.createdAt || createdAt,
        };
      } else {
        merged.push(hostedPost);
      }
    }
    merged.sort((a, b) => b.id - a.id);
    save(merged.slice(0, 100));
  } catch {
    // Local portfolio still works when Turso is not configured.
  }
}

export function listWebUserPosts(town?: string): WebUserPost[] {
  const all = load();
  if (!town || town === "all") return all;
  return all.filter(
    (p) => p.townTag === town || p.townTag === `hbcu-town:${town}`,
  );
}

export async function createWebUserPost(input: {
  content: string;
  townTag: string;
  mediaHashes?: string[];
}): Promise<WebUserPost> {
  const handle = getCurrentHandle();
  const display = getCurrentDisplayName();
  const body =
    input.content.trim() ||
    (input.mediaHashes && input.mediaHashes.length > 0 ? "📎" : "");
  const post: WebUserPost = {
    id: Date.now(),
    authorHandle: handle,
    authorDisplayName: display || handle,
    authorAvatarUrl: "",
    content: body,
    townTag: input.townTag,
    repliesCount: 0,
    repostsCount: 0,
    likesCount: 0,
    liked: false,
    mediaBlobs: input.mediaHashes ?? [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: new Date().toISOString(),
    engagementQuality: 1,
    maliciousScore: 0,
    riskLevel: "low",
  };
  // Await acknowledgement before showing success or granting local demo rewards.
  await mirrorPost(post);
  const next = [post, ...load()];
  save(next);
  return post;
}

export function clearWebUserPosts() {
  localStorage.removeItem(LS_KEY);
}

/** Mutate a user-created post’s like counts (seed posts use web-userspace map). */
export function patchWebUserPostLikes(
  postId: number,
  liked: boolean,
  likesCount: number,
): boolean {
  const all = load();
  const i = all.findIndex((p) => p.id === postId);
  if (i < 0) return false;
  all[i] = { ...all[i], liked, likesCount };
  save(all);
  return true;
}
