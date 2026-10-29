import { beforeEach, describe, expect, it } from "vitest";
import {
  listClubTemplates,
  listReadingCircles,
  listTournaments,
} from "@/lib/club-activities";
import { repairTemplateText } from "@/lib/demo-text";

describe("beta demo template text", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("repairs irregular template separators", () => {
    expect(repairTemplateText("Health \u00c2\u00b7 lab")).toBe("Health - lab");
    expect(repairTemplateText("2\u00e2\u20ac\u201c4 hr")).toBe("2 - 4 hr");
    expect(repairTemplateText("2\u00c3\u201410")).toBe("2x10");
    expect(repairTemplateText("open \u00e2\u2020\u2019 Connect")).toBe(
      "open -> Connect",
    );
  });

  it("ships club kits without Omega or broken separators", async () => {
    const templates = await listClubTemplates();
    expect(templates.map((t) => t.id)).toEqual([
      "anime",
      "gaming",
      "study",
      "faculty",
      "chess",
      "creators",
      "med",
      "systems",
    ]);
    const blob = JSON.stringify(templates);
    expect(blob).not.toMatch(/omega psi phi|omega-psi-phi/i);
    expect(blob).not.toMatch(/\u00c2\u00b7|\u00e2\u20ac|\u00c3\u2014/);

    const circles = await listReadingCircles("tsu");
    expect(circles[0]?.title).toBe("Tiger Anime Club - Weekly Read");
    const tours = await listTournaments("tsu");
    expect(tours.map((t) => t.title)).toContain("HBCU Chess Classic - R1");
    expect(JSON.stringify(tours)).not.toMatch(/\u00c2\u00b7|\u00e2\u20ac/);
  });

  it("repairs a stored club title the next time it loads", async () => {
    localStorage.setItem(
      "blkspace_club_activities_v1",
      JSON.stringify({
        applied: {},
        circles: [
          {
            id: 1,
            communityId: "tsu",
            title: "Tiger Anime Club \u00c2\u00b7 Weekly Read",
            mediaType: "manga",
            description: "Share chapter thoughts.",
            currentWork: "One Piece",
            currentChapter: "Ch. 1",
            createdBy: "demo_user",
            memberCount: 1,
            entryCount: 0,
            createdAt: "2026-10-28T12:00:00",
          },
        ],
        entries: [],
        tournaments: [],
        entrants: {},
        matches: [],
        nextCircle: 2,
        nextEntry: 1,
        nextTour: 1,
        nextMatch: 1,
      }),
    );
    const circles = await listReadingCircles("tsu");
    expect(circles[0]?.title).toBe("Tiger Anime Club - Weekly Read");
  });
});
