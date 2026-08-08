import { describe, expect, it } from "vitest";
import {
  applyDisciplineToUiPrefs,
  disciplineUpliftLine,
  getDisciplineTrack,
  isDisciplineTrack,
  orderHubTopicsForTrack,
} from "@/lib/discipline-track";
import {
  blogFypScore,
  blogSubstanceScore,
  rankBlogFypPosts,
} from "@/lib/blog-fyp";

const SAMPLE_TOPICS = [
  { id: "chess" as const },
  { id: "fashion" as const },
  { id: "study" as const },
  { id: "med" as const },
  { id: "music" as const },
  { id: "pro" as const },
  { id: "culture" as const },
  { id: "live" as const },
  { id: "gaming" as const },
];

describe("discipline-track", () => {
  it("validates track ids", () => {
    expect(isDisciplineTrack("finance")).toBe(true);
    expect(isDisciplineTrack("nope")).toBe(false);
  });

  it("puts finance topics pro/study first", () => {
    const ordered = orderHubTopicsForTrack(SAMPLE_TOPICS, "finance");
    expect(ordered[0].id).toBe("pro");
    expect(ordered[1].id).toBe("study");
  });

  it("puts creative fashion/music first", () => {
    const ordered = orderHubTopicsForTrack(SAMPLE_TOPICS, "creative");
    expect(ordered[0].id).toBe("fashion");
    expect(ordered[1].id).toBe("music");
  });

  it("puts research med/study first", () => {
    const ordered = orderHubTopicsForTrack(SAMPLE_TOPICS, "research");
    expect(ordered[0].id).toBe("med");
    expect(ordered[1].id).toBe("study");
  });

  it("enables faculty nav on faculty track", () => {
    const base = {
      disciplineTrack: "general" as const,
      showFacultyNav: false,
      showFocusNav: true,
      pinnedModules: {
        events: true,
        studio: true,
        clubs: true,
        yardSale: true,
        literacy: true,
      },
      startPath: "/feed" as const,
    };
    const next = applyDisciplineToUiPrefs(base, "faculty");
    expect(next.showFacultyNav).toBe(true);
    expect(next.disciplineTrack).toBe("faculty");
    expect(next.pinnedModules.literacy).toBe(true);
  });

  it("returns uplift lines without buy-rank language", () => {
    for (const id of [
      "general",
      "finance",
      "creative",
      "research",
      "faculty",
    ] as const) {
      const line = disciplineUpliftLine(id);
      expect(line.toLowerCase()).not.toMatch(/buy rank|ad slot|boost fyp/);
      expect(getDisciplineTrack(id).id).toBe(id);
    }
  });
});

describe("blog-fyp", () => {
  it("scores substance by length", () => {
    expect(blogSubstanceScore("hi")).toBeLessThan(
      blogSubstanceScore("a".repeat(150)),
    );
  });

  it("prefers same-yard substantial posts over thin captions", () => {
    const thin = blogFypScore(
      {
        content: "ok",
        townTag: "howard",
        likesCount: 50,
        authorHandle: "a",
      },
      { homeYardId: "tsu", followedHandles: [] },
    );
    const essay = blogFypScore(
      {
        content: "a".repeat(300),
        townTag: "tsu",
        likesCount: 2,
        authorHandle: "b",
      },
      { homeYardId: "tsu", followedHandles: [] },
    );
    expect(essay).toBeGreaterThan(thin);
  });

  it("demotes high-risk posts in rank list", () => {
    const ranked = rankBlogFypPosts(
      [
        {
          id: 1,
          content: "safe essay ".repeat(20),
          townTag: "tsu",
          riskLevel: "low",
        },
        {
          id: 2,
          content: "bad essay ".repeat(20),
          townTag: "tsu",
          riskLevel: "high",
          maliciousScore: 0.9,
        },
      ],
      { homeYardId: "tsu", followedHandles: [], limit: 10 },
    );
    expect(ranked.map((p) => p.id)).toEqual([1]);
  });
});
