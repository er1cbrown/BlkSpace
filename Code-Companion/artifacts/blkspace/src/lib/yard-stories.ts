/**
 * Yard Stories — 24h ephemeral posts (client-side, dual-mode).
 *
 * Tier 0 safe: localStorage only (no mandatory cloud / ML).
 * Works in web preview and as an overlay on desktop until a server kind ships.
 * Never invent fake people — only the signed-in author and their media.
 */

import { getCurrentDisplayName, getCurrentHandle } from "@/lib/auth";

const LS_KEY = "blkspace_yard_stories_v1";
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_STORIES = 80;

export interface YardStory {
  id: string;
  authorHandle: string;
  authorDisplayName: string;
  content: string;
  mediaHashes: string[];
  /** Optional data URLs for web preview media (images). */
  mediaDataUrls: string[];
  townTag: string;
  createdAt: string;
  expiresAt: string;
}

type Store = {
  stories: YardStory[];
};

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { stories: [] };
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || !Array.isArray(parsed.stories)) return { stories: [] };
    return { stories: parsed.stories };
  } catch {
    return { stories: [] };
  }
}

function saveStore(store: Store) {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ stories: store.stories.slice(0, MAX_STORIES) }),
    );
    window.dispatchEvent(new CustomEvent("blkspace-stories"));
  } catch {
    /* quota */
  }
}

export function isStoryActive(story: YardStory, now = Date.now()): boolean {
  const exp = Date.parse(story.expiresAt);
  if (Number.isNaN(exp)) return false;
  return exp > now;
}

/** Drop expired stories and return remaining active ones. */
export function pruneExpiredStories(now = Date.now()): YardStory[] {
  const store = loadStore();
  const next = store.stories.filter((s) => isStoryActive(s, now));
  if (next.length !== store.stories.length) {
    saveStore({ stories: next });
  }
  return next;
}

export function listActiveStories(now = Date.now()): YardStory[] {
  return pruneExpiredStories(now).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

/** Authors with at least one unexpired story, most recent first. */
export function listStoryAuthors(now = Date.now()): {
  handle: string;
  displayName: string;
  latestAt: string;
  count: number;
}[] {
  const stories = listActiveStories(now);
  const map = new Map<
    string,
    { handle: string; displayName: string; latestAt: string; count: number }
  >();
  for (const s of stories) {
    const prev = map.get(s.authorHandle);
    if (!prev) {
      map.set(s.authorHandle, {
        handle: s.authorHandle,
        displayName: s.authorDisplayName,
        latestAt: s.createdAt,
        count: 1,
      });
    } else {
      prev.count += 1;
      if (Date.parse(s.createdAt) > Date.parse(prev.latestAt)) {
        prev.latestAt = s.createdAt;
        prev.displayName = s.authorDisplayName;
      }
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => Date.parse(b.latestAt) - Date.parse(a.latestAt),
  );
}

export function listStoriesForAuthor(
  handle: string,
  now = Date.now(),
): YardStory[] {
  return listActiveStories(now).filter(
    (s) => s.authorHandle.toLowerCase() === handle.toLowerCase(),
  );
}

export function createYardStory(input: {
  content?: string;
  mediaHashes?: string[];
  mediaDataUrls?: string[];
  townTag: string;
  now?: number;
}): YardStory {
  const now = input.now ?? Date.now();
  const handle = getCurrentHandle();
  if (!handle || handle === "guest") {
    throw new Error("Sign in to post a story");
  }
  const mediaHashes = (input.mediaHashes ?? []).filter(Boolean);
  const mediaDataUrls = (input.mediaDataUrls ?? []).filter(Boolean);
  const body = (input.content ?? "").trim();
  if (!body && mediaHashes.length === 0 && mediaDataUrls.length === 0) {
    throw new Error("Add text or media for your story");
  }

  const story: YardStory = {
    id: `story_${now}_${Math.random().toString(36).slice(2, 8)}`,
    authorHandle: handle,
    authorDisplayName: getCurrentDisplayName() || handle,
    content: body || "📸",
    mediaHashes,
    mediaDataUrls,
    townTag: input.townTag || "tsu",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + STORY_TTL_MS).toISOString(),
  };

  const store = loadStore();
  store.stories = [story, ...store.stories.filter((s) => isStoryActive(s, now))];
  saveStore(store);
  return story;
}

export function clearAllStories() {
  localStorage.removeItem(LS_KEY);
  window.dispatchEvent(new CustomEvent("blkspace-stories"));
}

export function msUntilExpiry(story: YardStory, now = Date.now()): number {
  return Math.max(0, Date.parse(story.expiresAt) - now);
}

export function formatStoryTtl(story: YardStory, now = Date.now()): string {
  const ms = msUntilExpiry(story, now);
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (h >= 1) return `${h}h left`;
  if (m >= 1) return `${m}m left`;
  return "expiring";
}
