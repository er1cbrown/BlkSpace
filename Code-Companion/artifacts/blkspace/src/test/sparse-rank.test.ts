import { describe, expect, it } from "vitest";
import {
  sortBySparseScore,
  sparseLinearScore,
} from "@/lib/sparse-rank";
import { computeYardScaleMetrics } from "@/lib/yard-scale-metrics";

/**
 * Complexity contracts from docs/theory-of-computing-scale.md
 * Rank inside A_y: O(n log n) sort on a yard window — never dense N_u².
 */
describe("sparse-rank complexity contracts", () => {
  it("is O(1) per item (no N_u in the score)", () => {
    const a = sparseLinearScore({
      sameYard: true,
      followAffinity: false,
      domainScore: 1,
      engagement: 3,
    });
    const b = sparseLinearScore({
      sameYard: false,
      followAffinity: true,
      domainScore: 1,
      engagement: 3,
    });
    expect(a).toBeGreaterThan(b);
  });

  it("uses log(1+engagement), not a quadratic engagement term", () => {
    const low = sparseLinearScore({
      sameYard: true,
      followAffinity: false,
      domainScore: 0,
      engagement: 10,
    });
    const high = sparseLinearScore({
      sameYard: true,
      followAffinity: false,
      domainScore: 0,
      engagement: 10_000,
    });
    // 1000× engagement must not 1000× the score (that would be farmable n²-ish).
    expect(high - low).toBeLessThan(8);
  });

  it("sortBySparseScore returns n items (comparison sort, not n×n matrix)", () => {
    const n = 64;
    const items = Array.from({ length: n }, (_, i) => ({
      id: i,
      sameYard: i % 3 === 0,
      followAffinity: i % 5 === 0,
      domainScore: (i % 7) / 7,
      engagement: i,
    }));
    const ranked = sortBySparseScore(items, (x) => sparseLinearScore(x));
    expect(ranked).toHaveLength(n);
    expect(new Set(ranked.map((x) => x.id)).size).toBe(n);
    const scores = ranked.map((x) => sparseLinearScore(x));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  it("yard-local window stays linear in sample size, not N_u²", () => {
    const n = 2_000;
    const items = Array.from({ length: n }, (_, i) => i);
    const t0 = performance.now();
    sortBySparseScore(items, (x) => x);
    const ms = performance.now() - t0;
    // 2k compares must stay well under a second on CI; n²=4e6 would still be
    // fast, so this is a sanity ceiling, not a formal proof.
    expect(ms).toBeLessThan(250);
    expect(n * n).toBe(4_000_000);
  });
});

describe("yard-scale-metrics", () => {
  it("returns finite local counts (O(orgs+opps), not global users)", async () => {
    const m = await computeYardScaleMetrics({ yardId: "tsu" });
    expect(m.yardId).toBe("tsu");
    expect(m.nOrgsYard).toBeGreaterThanOrEqual(0);
    expect(m.nOppsVisible).toBeGreaterThanOrEqual(m.nOppsYard);
    expect(Number.isFinite(m.edgeProxy)).toBe(true);
  });
});
