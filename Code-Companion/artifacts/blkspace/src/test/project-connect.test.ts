import { beforeEach, describe, expect, it } from "vitest";
import {
  isOpportunitySaved,
  listOpportunities,
  listOrgs,
  listSavedOpportunityIds,
  toggleSavedOpportunity,
} from "@/lib/project-connect";

describe("ProjectConnect saved opportunities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and unsaves an opportunity", () => {
    expect(isOpportunitySaved(42)).toBe(false);

    expect(toggleSavedOpportunity(42)).toBe(true);
    expect(listSavedOpportunityIds()).toEqual([42]);
    expect(isOpportunitySaved(42)).toBe(true);

    expect(toggleSavedOpportunity(42)).toBe(false);
    expect(listSavedOpportunityIds()).toEqual([]);
  });

  it("keeps saved opportunities in most-recent-first order", () => {
    toggleSavedOpportunity(10);
    toggleSavedOpportunity(20);
    toggleSavedOpportunity(30);

    expect(listSavedOpportunityIds()).toEqual([30, 20, 10]);
  });
});

describe("ProjectConnect beta demo", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("seeds the beta checks and leaves Omega Psi Phi out", async () => {
    const orgs = await listOrgs();
    const orgBlob = JSON.stringify(orgs);
    expect(orgBlob).not.toMatch(/omega psi phi|omega-psi-phi|org_opp_meharry/i);
    expect(orgBlob).not.toMatch(/\u00c2\u00b7|\u00e2\u20ac/);
    expect(orgs.some((o) => o.id === "org_ieee_tsu")).toBe(true);
    expect(orgs.some((o) => o.id === "org_snma_meharry")).toBe(true);
    expect(orgs.some((o) => o.id === "org_nsbe_tsu")).toBe(true);

    const opps = await listOpportunities();
    const ieee = opps.filter((o) => o.orgId === "org_ieee_tsu");
    expect(ieee.map((o) => o.title).sort()).toEqual([
      "Beta: close a LogosDecks round",
      "Beta: post a yard photo",
      "Beta: release a numbered copy",
    ]);
    expect(JSON.stringify(opps)).not.toMatch(
      /omega psi phi|Device B|Tier 0|\u00c2\u00b7|\u00e2\u20ac/i,
    );
  });

  it("drops a stored Omega template and keeps a student org", async () => {
    localStorage.setItem(
      "blkspace_project_connect_v2",
      JSON.stringify({
        orgs: [
          {
            id: "org_opp_meharry",
            slug: "omega-psi-phi-meharry",
            name: "Omega Psi Phi Meharry",
            orgType: "professional",
            yardId: "meharry",
            description: "old template",
            createdBy: "demo_user",
            memberCount: 3,
            opportunityCount: 1,
            createdAt: "2026-08-07T12:00:00",
          },
          {
            id: "org_custom_study",
            slug: "sacs-study",
            name: "SACS Study Circle",
            orgType: "peer",
            yardId: "meharry",
            description: "Kept student org",
            createdBy: "alice",
            memberCount: 1,
            opportunityCount: 0,
            createdAt: "2026-10-01T12:00:00",
          },
        ],
        opps: [
          {
            id: 90,
            orgId: "org_opp_meharry",
            orgName: "Omega Psi Phi Meharry",
            orgType: "professional",
            title: "Academic fellowship interest",
            description: "old",
            durationText: "rolling",
            tagsJson: "[]",
            status: "open",
            createdBy: "demo_user",
            interestCount: 1,
            createdAt: "2026-08-07T12:00:00",
          },
        ],
        interests: [],
        nextOppId: 200,
        nextInterestId: 1,
      }),
    );

    const orgs = await listOrgs();
    expect(orgs.some((o) => o.id === "org_opp_meharry")).toBe(false);
    expect(orgs.some((o) => /omega psi phi/i.test(o.name))).toBe(false);
    expect(orgs.some((o) => o.id === "org_custom_study")).toBe(true);
    const opps = await listOpportunities();
    expect(opps.some((o) => o.id === 90)).toBe(false);
    expect(opps.some((o) => o.title === "Beta: post a yard photo")).toBe(true);
  });
});
