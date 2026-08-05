import { beforeEach, describe, expect, it } from "vitest";
import {
  isOpportunitySaved,
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
