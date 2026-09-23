/**
 * Browser-local posts when Tauri is unavailable.
 * Merged with seed content for feed preview.
 */

import type { SeedPost } from "@/lib/seed-content";
import { getCurrentDisplayName, getCurrentHandle } from "@/lib/auth";

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

function mirrorPost(post: WebUserPost) {
  void fetch("/api/portfolio/post", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(post),
  }).catch(() => {});
}

/** Pull posts saved on Turso into this browser. No-op until the database is configured. */
export async function refreshPortfolioFromTurso(): Promise<void> {
  try {
    const res = await fetch("/api/portfolio/posts");
    if (!res.ok) return;
    const body = (await res.json()) as {
      rows?: Array<{
        id: string | number;
        author_handle: string;
        content: string;
        town_tag: string;
        media_blobs: string;
        created_at: string;
      }>;
    };
    if (!body.rows?.length) return;
    const local = load();
    const seen = new Set(local.map((p) => p.id));
    const merged = [...local];
    for (const row of body.rows) {
      const id = Number(row.id);
      if (!id || seen.has(id)) continue;
      let mediaBlobs: string[] = [];
      try {
        const parsed = JSON.parse(row.media_blobs || "[]");
        if (Array.isArray(parsed)) mediaBlobs = parsed.map(String);
      } catch {
        mediaBlobs = [];
      }
      merged.push({
        id,
        authorHandle: row.author_handle,
        authorDisplayName: row.author_handle,
        authorAvatarUrl: "",
        content: row.content,
        townTag: row.town_tag,
        repliesCount: 0,
        repostsCount: 0,
        likesCount: 0,
        liked: false,
        mediaBlobs,
        nostrEventId: "",
        relayUrl: "",
        createdAt: row.created_at,
        engagementQuality: 1,
        maliciousScore: 0,
        riskLevel: "low",
      });
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

export function createWebUserPost(input: {
  content: string;
  townTag: string;
  mediaHashes?: string[];
}): WebUserPost {
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
  const next = [post, ...load()];
  save(next);
  mirrorPost(post);
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
