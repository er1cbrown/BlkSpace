/**
 * Interactive browser userspace — likes, yards, WB, follow, profile deltas.
 * Web preview has no Tauri DB; this makes buttons feel real on localhost.
 */

import { getCurrentDisplayName, getCurrentHandle } from "@/lib/auth";
import { loadUiPrefs } from "@/lib/ui-prefs";
import { getYardTheme } from "@/lib/yard-themes";
import {
  createWebUserPost,
  listWebUserPosts,
  type WebUserPost,
} from "@/lib/web-posts";
import { getSeedPosts, type SeedPost } from "@/lib/seed-content";

const LIKES_KEY = "blkspace_web_likes_v1";
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

export function getJoinedYards(): string[] {
  return readJson(YARDS_KEY, [] as string[]);
}

export function isWebYardMember(communityId: string): boolean {
  const id = communityId.toLowerCase();
  const yards = getJoinedYards().map((y) => y.toLowerCase());
  const home = (loadUiPrefs().homeYardId || "tsu").toLowerCase();
  return yards.includes(id) || id === home;
}

export function joinWebYard(communityId: string): {
  joined: boolean;
  wb: number;
} {
  const id = communityId.toLowerCase();
  const yards = getJoinedYards();
  if (yards.map((y) => y.toLowerCase()).includes(id)) {
    return { joined: true, wb: 0 };
  }
  writeJson(YARDS_KEY, [...yards, id]);
  grantWebWb(5, `Joined ${id} yard`);
  return { joined: true, wb: 5 };
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
}

export function getWebProfilePatch(): WebProfilePatch {
  return readJson(PROFILE_KEY, {} as WebProfilePatch);
}

export function saveWebProfilePatch(patch: WebProfilePatch) {
  writeJson(PROFILE_KEY, { ...getWebProfilePatch(), ...patch });
}

/** Apply like state onto a post list for the current browser user. */
export function applyLikesToPosts<
  T extends { id: number; likesCount: number; liked: boolean },
>(posts: T[]): T[] {
  const map = getLikedMap();
  return posts.map((p) => {
    const k = String(p.id);
    if (!Object.prototype.hasOwnProperty.call(map, k)) return p;
    const liked = !!map[k];
    let count = p.likesCount;
    if (liked && !p.liked) count = p.likesCount + 1;
    if (!liked && p.liked) count = Math.max(0, p.likesCount - 1);
    return { ...p, liked, likesCount: count };
  });
}

export function listInteractiveFeed(town?: string): SeedPost[] {
  const seed = getSeedPosts(town) as SeedPost[];
  const mine = listWebUserPosts(town) as SeedPost[];
  return applyLikesToPosts([...mine, ...seed]);
}

export function listInteractiveUserPosts(handle: string): SeedPost[] {
  const h = handle.replace(/^@/, "");
  const mine = listWebUserPosts().filter((p) => p.authorHandle === h);
  const seed = getSeedPosts().filter((p) => p.authorHandle === h);
  return applyLikesToPosts([...mine, ...seed] as SeedPost[]);
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
    proProfileJson: "{}",
    profileLayoutJson: "{}",
    topFriendsJson: "[]",
    themeId: 0,
    musicHash: "",
    createdAt: new Date().toISOString(),
  };
}

export function createInteractivePost(input: {
  content: string;
  townTag: string;
  mediaHashes?: string[];
}): WebUserPost {
  const post = createWebUserPost(input);
  grantWebWb(5, "Posted to the yard");
  notify();
  return post;
}
