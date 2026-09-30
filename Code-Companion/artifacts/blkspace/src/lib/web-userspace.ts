/**
 * Interactive browser userspace — likes, yards, WB, follow, profile deltas.
 * Web preview has no Tauri DB; this makes buttons feel real on localhost.
 */

import {
  createHttpAuthHeader,
  getCurrentDisplayName,
  getCurrentHandle,
} from "@/lib/auth";
import { hostedPost } from "@/lib/hosted-api";
import { loadUiPrefs } from "@/lib/ui-prefs";
import { getYardTheme } from "@/lib/yard-themes";
import {
  createWebUserPost,
  listWebUserPosts,
  type WebUserPost,
} from "@/lib/web-posts";
import { getSeedPosts, type SeedPost } from "@/lib/seed-content";

const LIKES_KEY = "blkspace_web_likes_v1";
const REPOSTS_KEY = "blkspace_web_reposts_v1";
const YARDS_KEY = "blkspace_web_yards_v1";
const FOLLOWING_KEY = "blkspace_web_following_v1";
const WB_KEY = "blkspace_web_wb_delta_v1";
const PROFILE_KEY = "blkspace_web_profile_v1";

function notify() {
  try {
    window.dispatchEvent(new Event("blkspace-userspace"));
  } catch {
    /* ignore */
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  notify();
}

/** postId → liked */
export function getLikedMap(): Record<string, boolean> {
  return readJson(LIKES_KEY, {} as Record<string, boolean>);
}

export function isPostLiked(postId: number): boolean {
  return !!getLikedMap()[String(postId)];
}

/** Toggle like; returns { liked, likesDelta } */
export function toggleWebLike(postId: number): {
  liked: boolean;
  likesDelta: number;
} {
  const map = getLikedMap();
  const k = String(postId);
  const was = !!map[k];
  if (was) delete map[k];
  else map[k] = true;
  writeJson(LIKES_KEY, map);
  if (!was) grantWebWb(1, "Like on the yard");
  return { liked: !was, likesDelta: was ? -1 : 1 };
}

export function toggleWebRepost(postId: number): {
  reposted: boolean;
  repostsDelta: number;
} {
  const map = readJson<Record<string, boolean>>(REPOSTS_KEY, {});
  const key = String(postId);
  const was = !!map[key];
  if (was) delete map[key];
  else map[key] = true;
  writeJson(REPOSTS_KEY, map);
  return { reposted: !was, repostsDelta: was ? -1 : 1 };
}

export function getJoinedYards(): string[] {
  return readJson(YARDS_KEY, [] as string[]);
}

export function isWebYardMember(communityId: string): boolean {
  const id = communityId.toLowerCase();
  const yards = getJoinedYards().map((y) => y.toLowerCase());
  const home = (loadUiPrefs().homeYardId || "tsu").toLowerCase();
  return yards.includes(id) || id === home;
}

export async function joinWebYard(communityId: string): Promise<{
  joined: boolean;
  wb: number;
  memberCount?: number;
}> {
  const id = communityId.toLowerCase();
  const yards = getJoinedYards();
  const already = yards.map((y) => y.toLowerCase()).includes(id);
  if (!already) {
    writeJson(YARDS_KEY, [...yards, id]);
    grantWebWb(5, `Joined ${id} yard`);
  }
  try {
    const res = await hostedPost("/api/yards/join", { yardId: id });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.ok === false) {
      throw new Error(body?.error || "Could not join that yard.");
    }
    return { joined: true, wb: already ? 0 : 5, memberCount: body.memberCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Sign in again")) {
      return { joined: true, wb: already ? 0 : 5 };
    }
    throw err;
  }
}

export async function sharedYardIds(): Promise<string[] | null> {
  try {
    const authorization = createHttpAuthHeader("/api/yards/mine", "GET", "");
    const res = await fetch("/api/yards/mine", { headers: { authorization } });
    if (!res.ok) return null;
    const body = await res.json();
    return Array.isArray(body.yards) ? body.yards : null;
  } catch {
    return null;
  }
}

export async function sharedYardCounts(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch("/api/yards/counts");
    if (!res.ok) return null;
    const body = await res.json();
    return body.counts && typeof body.counts === "object" ? body.counts : null;
  } catch {
    return null;
  }
}

export async function sharedYardMembers(
  yardId: string,
): Promise<{ handle: string }[] | null> {
  try {
    const res = await fetch(
      `/api/yards/members?yard=${encodeURIComponent(yardId)}`,
    );
    if (!res.ok) return null;
    const body = await res.json();
    return Array.isArray(body.members) ? body.members : null;
  } catch {
    return null;
  }
}

export function getFollowing(): string[] {
  return readJson(FOLLOWING_KEY, [] as string[]);
}

export function toggleWebFollow(handle: string): boolean {
  const h = handle.replace(/^@/, "");
  let list = getFollowing();
  const on = list.includes(h);
  list = on ? list.filter((x) => x !== h) : [...list, h];
  writeJson(FOLLOWING_KEY, list);
  try {
    localStorage.setItem("blkspace_followed", JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return !on;
}

export function isWebFollowing(handle: string): boolean {
  return getFollowing().includes(handle.replace(/^@/, ""));
}

export function getWbDelta(): number {
  return readJson(WB_KEY, 0);
}

export function grantWebWb(amount: number, _reason?: string) {
  writeJson(WB_KEY, getWbDelta() + amount);
}

export interface WebProfilePatch {
  bio?: string;
  displayName?: string;
  town?: string;
  /** External forge — out of product scope as host; link-out only */
  githubUrl?: string;
  /** X / Twitter profile URL */
  xUrl?: string;
  /** Personal site / portfolio */
  websiteUrl?: string;
}

export function getWebProfilePatch(): WebProfilePatch {
  return readJson(PROFILE_KEY, {} as WebProfilePatch);
}

export function saveWebProfilePatch(patch: WebProfilePatch) {
  writeJson(PROFILE_KEY, { ...getWebProfilePatch(), ...patch });
}

async function readHosted(res: Response): Promise<Record<string, unknown>> {
  const body = (await res.json().catch(() => null)) as
    | (Record<string, unknown> & { ok?: boolean; error?: string })
    | null;
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.error || "Could not save that to the yard.");
  }
  return body || {};
}

function actionUid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `web-action-${Date.now()}`;
}

/** Like or unlike a post that was saved on the yard. Other browsers see the count. */
export async function likeHostedPost(
  postId: number,
  desiredState?: boolean,
): Promise<{ liked: boolean; likesCount: number }> {
  const stored = listWebUserPosts().find((post) => post.id === postId);
  if (!stored) {
    const local = toggleWebLike(postId);
    return {
      liked: local.liked,
      likesCount: Math.max(0, local.likesDelta),
    };
  }
  const currently = stored?.liked ?? isPostLiked(postId);
  const next = desiredState ?? !currently;
  const body = await readHosted(
    await hostedPost("/api/portfolio/interactions/like", {
      postUid: stored?.postUid || String(postId),
      desiredState: next,
      actionUid: actionUid(),
    }),
  );
  const counts = body.counts as { likes?: number } | undefined;
  const liked = Boolean(body.liked);
  const likesCount = Number(body.likesCount ?? counts?.likes ?? 0);
  const map = getLikedMap();
  const key = String(postId);
  if (liked) map[key] = true;
  else delete map[key];
  writeJson(LIKES_KEY, map);
  patchImportedLike(postId, liked, likesCount);
  return { liked, likesCount };
}

function patchImportedLike(postId: number, liked: boolean, likesCount: number) {
  const posts = listWebUserPosts();
  const index = posts.findIndex((post) => post.id === postId);
  if (index < 0) return;
  posts[index] = { ...posts[index], liked, likesCount };
  localStorage.setItem(
    "blkspace_web_user_posts_v1",
    JSON.stringify(posts.slice(0, 100)),
  );
}

/** Follow or unfollow a handle that exists on the yard. */
export async function followHostedHandle(
  handle: string,
  desiredState?: boolean,
): Promise<boolean> {
  const cleaned = handle.replace(/^@/, "");
  const next = desiredState ?? !isWebFollowing(cleaned);
  const body = await readHosted(
    await hostedPost("/api/portfolio/interactions/follow", {
      targetHandle: cleaned,
      desiredState: next,
      actionUid: actionUid(),
    }),
  );
  const following = Boolean(body.following ?? body.desiredState);
  let list = getFollowing().filter((item) => item !== cleaned);
  if (following) list = [...list, cleaned];
  writeJson(FOLLOWING_KEY, list);
  try {
    localStorage.setItem("blkspace_followed", JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return following;
}

export async function refreshHostedFollowing(): Promise<string[]> {
  try {
    const authorization = createHttpAuthHeader(
      "/api/portfolio/following",
      "GET",
      "",
    );
    const res = await fetch("/api/portfolio/following", {
      headers: { authorization },
    });
    if (!res.ok) return getFollowing();
    const body = (await res.json()) as {
      following?: { handle?: string }[];
      rows?: { handle?: string }[];
    };
    const handles = (body.following || body.rows || [])
      .map((row) => (row.handle || "").replace(/^@/, ""))
      .filter(Boolean);
    writeJson(FOLLOWING_KEY, handles);
    try {
      localStorage.setItem("blkspace_followed", JSON.stringify(handles));
    } catch {
      /* ignore */
    }
    return handles;
  } catch {
    return getFollowing();
  }
}

export async function fetchFollowSummary(handle: string): Promise<{
  followersCount: number;
  followingCount: number;
} | null> {
  const cleaned = handle.replace(/^@/, "");
  if (!cleaned) return null;
  try {
    const res = await fetch(
      `/api/portfolio/follows?handle=${encodeURIComponent(cleaned)}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      ok?: boolean;
      followersCount?: number;
      followingCount?: number;
    };
    if (body.ok !== true) return null;
    return {
      followersCount: Number(body.followersCount || 0),
      followingCount: Number(body.followingCount || 0),
    };
  } catch {
    return null;
  }
}

/** Apply like state onto a post list for the current browser user. */
export function applyLikesToPosts<
  T extends { id: number; likesCount: number; liked: boolean; postUid?: string },
>(posts: T[]): T[] {
  const map = getLikedMap();
  return posts.map((p) => {
    // A cloud post already carries the shared count and this viewer's heart.
    if (p.postUid) return p;
    const k = String(p.id);
    if (!Object.prototype.hasOwnProperty.call(map, k)) return p;
    const liked = !!map[k];
    let count = p.likesCount;
    if (liked && !p.liked) count = p.likesCount + 1;
    if (!liked && p.liked) count = Math.max(0, p.likesCount - 1);
    return { ...p, liked, likesCount: count };
  });
}

export function applyRepostsToPosts<
  T extends { id: number; repostsCount: number; reposted?: boolean },
>(posts: T[]): T[] {
  const map = readJson<Record<string, boolean>>(REPOSTS_KEY, {});
  return posts.map((post) => {
    const key = String(post.id);
    if (!Object.prototype.hasOwnProperty.call(map, key)) return post;
    const reposted = !!map[key];
    return {
      ...post,
      reposted,
      repostsCount: Math.max(0, post.repostsCount + (reposted ? 1 : -1)),
    };
  });
}

export function listInteractiveFeed(town?: string): SeedPost[] {
  const seed = getSeedPosts(town) as SeedPost[];
  const mine = listWebUserPosts(town) as SeedPost[];
  return applyRepostsToPosts(applyLikesToPosts([...mine, ...seed]));
}

export function listInteractiveUserPosts(handle: string): SeedPost[] {
  const h = handle.replace(/^@/, "");
  const mine = listWebUserPosts().filter((p) => p.authorHandle === h);
  const seed = getSeedPosts().filter((p) => p.authorHandle === h);
  return applyRepostsToPosts(
    applyLikesToPosts([...mine, ...seed] as SeedPost[]),
  );
}

export function buildWebUser(handle: string) {
  const h = handle.replace(/^@/, "") || getCurrentHandle();
  const me = getCurrentHandle();
  const isMe = h === me || !handle;
  const patch = getWebProfilePatch();
  const prefs = loadUiPrefs();
  const town = isMe
    ? patch.town || prefs.homeYardId || "tsu"
    : patch.town || "tsu";
  const theme = getYardTheme(town);
  const found = listWebUserPosts().find((p) => p.authorHandle === h);
  const seedHit = getSeedPosts().find((p) => p.authorHandle === h);

  const baseWb = isMe ? 50 + getWbDelta() : 1250;
  const display = isMe
    ? patch.displayName || getCurrentDisplayName() || h
    : seedHit?.authorDisplayName || found?.authorDisplayName || h;

  return {
    id: isMe ? 9001 : 1,
    handle: h,
    displayName: display,
    bio:
      (isMe && patch.bio) ||
      (isMe
        ? "Your MyYard — Customize your look, post, join yards."
        : seedHit
          ? "HBCU student on the yard."
          : "HBCU student exploring the yard."),
    avatarUrl: "",
    university: theme?.school || "Tennessee State University",
    town,
    followersCount: isMe ? 12 + getFollowing().length : 245,
    followingCount: isMe ? getFollowing().length : 89,
    weixBucks: baseWb,
    pubkey: "",
    engagementQuality: 1.0,
    postKarma: isMe
      ? 5 + listWebUserPosts().filter((p) => p.authorHandle === h).length * 3
      : 42,
    commentKarma: isMe ? 2 : 18,
    githubUrl: isMe ? patch.githubUrl || "" : "",
    xUrl: isMe ? patch.xUrl || "" : "",
    websiteUrl: isMe ? patch.websiteUrl || "" : "",
    proProfileJson: "{}",
    profileLayoutJson: "{}",
    topFriendsJson: "[]",
    themeId: 0,
    musicHash: "",
    createdAt: new Date().toISOString(),
  };
}

export async function sharedYardChannels(
  yardId: string,
  origin = "",
): Promise<{ id: string; name: string }[] | null> {
  const path = `/api/yards/channels?yard=${encodeURIComponent(yardId)}`;
  const urls = origin ? [`${origin}${path}`, path] : [path];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const body = await res.json();
      if (Array.isArray(body.channels)) return body.channels;
    } catch {
      /* try the next host */
    }
  }
  return null;
}

export async function sharedYardWb(yardId: string): Promise<number | null> {
  try {
    const path = `/api/yards/wb?yard=${encodeURIComponent(yardId)}`;
    const authorization = createHttpAuthHeader(path, "GET", "");
    const res = await fetch(path, { headers: { authorization } });
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body.balance === "number" ? body.balance : null;
  } catch {
    return null;
  }
}

export async function createSharedYardChannels(
  yardId: string,
  names: string[],
  origin = "",
): Promise<string[]> {
  const res = await hostedPost(`${origin}/api/yards/channels`, { yardId, names });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.error || "Could not add that channel.");
  }
  return Array.isArray(body.channelsCreated) ? body.channelsCreated : [];
}

export async function createInteractivePost(input: {
  content: string;
  townTag: string;
  channelId?: string;
  mediaHashes?: string[];
}): Promise<WebUserPost> {
  const post = await createWebUserPost(input);
  grantWebWb(5, "Posted to the yard");
  notify();
  return post;
}
