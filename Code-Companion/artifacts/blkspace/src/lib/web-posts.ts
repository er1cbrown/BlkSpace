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

export function listWebUserPosts(town?: string): WebUserPost[] {
  const all = load();
  if (!town || town === "all") return all;
  return all.filter((p) => p.townTag === town || p.townTag === `hbcu-town:${town}`);
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
  return post;
}

export function clearWebUserPosts() {
  localStorage.removeItem(LS_KEY);
}
