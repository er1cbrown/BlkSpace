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

describe("ProjectConnect IEEE evaluation seeds (web demo)", () => {
  it("includes IEEE Student Branch org and evaluation opportunities", async () => {
    const orgs = await listOrgs();
    expect(orgs.some((o) => o.id === "org_ieee_tsu")).toBe(true);
    const opps = await listOpportunities();
    const ieee = opps.filter((o) => o.orgId === "org_ieee_tsu");
    expect(ieee.length).toBeGreaterThanOrEqual(3);
    expect(
      ieee.some((o) => /Device B|Tier 0/i.test(o.title)),
    ).toBe(true);
  });
});
