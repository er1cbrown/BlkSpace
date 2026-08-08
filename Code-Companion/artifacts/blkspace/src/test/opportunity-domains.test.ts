import { describe, it, expect } from "vitest";
import {
  domainsForOpportunity,
  matchesDomainFilter,
  domainFeatureVector,
  scoreDomainMatch,
  OPPORTUNITY_DOMAINS,
} from "@/lib/opportunity-domains";
import type { ConnectOpportunity } from "@/lib/project-connect";

function opp(partial: Partial<ConnectOpportunity>): ConnectOpportunity {
  return {
    id: 1,
    orgId: "o",
    orgName: "Org",
    orgType: "club",
    title: "x",
    description: "",
    durationText: "",
    tagsJson: "[]",
    status: "open",
    createdBy: "u",
    interestCount: 0,
    createdAt: "",
    ...partial,
  };
}

describe("opportunity-domains", () => {
  it("infers finance domains without treating all clubs as fashion", () => {
    const o = opp({
      title: "Mock equity research note",
      tagsJson: '["finance","nasdaq"]',
      orgType: "professional",
    });
    const d = domainsForOpportunity(o);
    expect(d).toContain("finance");
    expect(matchesDomainFilter("finance", o)).toBe(true);
  });

  it("does not mark random club as fashion", () => {
    const o = opp({
      title: "Chess study group",
      description: "weekly puzzles",
      orgType: "club",
    });
    expect(matchesDomainFilter("fashion", o)).toBe(false);
  });

  it("marks fashion lookbook as fashion", () => {
    const o = opp({
      title: "Brand lookbook photoshoot",
      tagsJson: '["fashion","lookbook"]',
      orgType: "club",
    });
    expect(matchesDomainFilter("fashion", o)).toBe(true);
  });

  it("builds multi-hot feature vector of fixed length", () => {
    const v = domainFeatureVector(["finance", "research"]);
    expect(v).toHaveLength(OPPORTUNITY_DOMAINS.length);
    expect(v.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it("scores w·f for persona weights", () => {
    const s = scoreDomainMatch({ finance: 2, fashion: 0.5 }, [
      "finance",
      "scholarship",
    ]);
    expect(s).toBe(2);
  });
});
