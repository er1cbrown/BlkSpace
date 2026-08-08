import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  STORY_TTL_MS,
  clearAllStories,
  createYardStory,
  isStoryActive,
  listActiveStories,
  listStoryAuthors,
  listStoriesForAuthor,
  pruneExpiredStories,
} from "@/lib/yard-stories";

vi.mock("@/lib/auth", () => ({
  getCurrentHandle: () => "test_student",
  getCurrentDisplayName: () => "Test Student",
}));

describe("yard-stories (24h ephemeral)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a story that expires in 24h", () => {
    const now = Date.parse("2026-08-08T12:00:00.000Z");
    const story = createYardStory({
      content: "On the yard",
      townTag: "tsu",
      now,
    });
    expect(story.authorHandle).toBe("test_student");
    expect(story.content).toBe("On the yard");
    expect(Date.parse(story.expiresAt) - now).toBe(STORY_TTL_MS);
    expect(isStoryActive(story, now)).toBe(true);
    expect(listActiveStories(now)).toHaveLength(1);
  });

  it("prunes expired stories", () => {
    const t0 = Date.parse("2026-08-08T12:00:00.000Z");
    createYardStory({ content: "fresh", townTag: "tsu", now: t0 });
    expect(listActiveStories(t0 + STORY_TTL_MS - 1000)).toHaveLength(1);
    expect(listActiveStories(t0 + STORY_TTL_MS + 1)).toHaveLength(0);
    expect(pruneExpiredStories(t0 + STORY_TTL_MS + 1)).toHaveLength(0);
  });

  it("groups authors and filters by handle", () => {
    const now = Date.parse("2026-08-08T12:00:00.000Z");
    createYardStory({ content: "one", townTag: "tsu", now });
    createYardStory({
      content: "two",
      townTag: "tsu",
      now: now + 1000,
    });
    const authors = listStoryAuthors(now + 2000);
    expect(authors).toHaveLength(1);
    expect(authors[0].handle).toBe("test_student");
    expect(authors[0].count).toBe(2);
    expect(listStoriesForAuthor("test_student", now + 2000)).toHaveLength(2);
  });

  it("requires content or media", () => {
    expect(() =>
      createYardStory({ content: "  ", townTag: "tsu" }),
    ).toThrow(/text or media/i);
  });

  it("clearAllStories empties store", () => {
    createYardStory({ content: "x", townTag: "tsu" });
    clearAllStories();
    expect(listActiveStories()).toHaveLength(0);
  });
});
