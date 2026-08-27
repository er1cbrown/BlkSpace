import { describe, expect, it } from "vitest";
import {
  MESH_RUNGS,
  meshTagsForYard,
  pairwiseYardTunnelsForbidden,
  skeletonRoutes,
  USE_CASE_PALETTE,
  omegaNUsers,
  thetaNUseCases,
  workLooksQuadratic,
} from "@/lib/mesh-skeleton";

describe("perfect mesh skeleton", () => {
  it("has four scale rungs device → internet", () => {
    expect(MESH_RUNGS.map((r) => r.name)).toEqual([
      "device",
      "town",
      "intranet",
      "internet",
    ]);
  });

  it("tags a TSU note for town + intranet + platform (not a private tunnel)", () => {
    const tags = meshTagsForYard("tsu");
    expect(tags).toContain("hbcu-intranet");
    expect(tags).toContain("blkspace");
    expect(tags).toContain("hbcu-town:tsu");
    expect(tags).toHaveLength(3);
  });

  it("refuses pairwise yard mesh as the scale model", () => {
    expect(pairwiseYardTunnelsForbidden(100)).toBe(4950);
  });

  it("keeps A/B/C as parallel routes", () => {
    expect(skeletonRoutes().map((r) => r.id)).toEqual(["A", "B", "C"]);
  });
});

describe("n users · Ω(n) use cases", () => {
  it("palette is constant (not a new app per user)", () => {
    expect(USE_CASE_PALETTE.length).toBeGreaterThan(3);
    expect(USE_CASE_PALETTE.length).toBeLessThan(32);
  });

  it("n users cost Θ(n) = Ω(n) · |U|, never n²", () => {
    const n = 1_000;
    expect(omegaNUsers(n)).toBe(n);
    expect(thetaNUseCases(n)).toBe(n * USE_CASE_PALETTE.length);
    expect(workLooksQuadratic(n, thetaNUseCases(n))).toBe(false);
    expect(workLooksQuadratic(n, n * n)).toBe(true);
  });
});
