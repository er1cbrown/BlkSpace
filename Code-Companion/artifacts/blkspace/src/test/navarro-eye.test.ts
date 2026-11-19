import { describe, expect, it } from "vitest";
import { N_CORNEA, N_VITREOUS } from "@/lib/clinyard/vision-lab";
import {
  GULLSTRAND,
  NAVARRO_INDICES,
  NAVARRO_SURFACES,
  axialLengthMm,
  frontSurfacePowerD,
  gullstrandAxialMm,
} from "@/lib/clinyard/navarro-eye";

describe("Navarro eye from Visisipy", () => {
  it("sums the thicknesses the way Visisipy reports axial length", () => {
    expect(axialLengthMm(NAVARRO_SURFACES)).toBeCloseTo(23.9203, 4);
    const lab = NAVARRO_INDICES.find((row) => row.usedByLab);
    expect(lab?.cornea).toBe(N_CORNEA);
    expect(lab?.vitreous).toBe(N_VITREOUS);
    expect(frontSurfacePowerD(1.376, 7.72)).toBeCloseTo(48.7, 1);
  });

  it("keeps Gullstrand axial length when the lens accommodates", () => {
    const [rest, near] = GULLSTRAND;
    expect(gullstrandAxialMm(rest)).toBeCloseTo(gullstrandAxialMm(near), 4);
    expect(near.lensFrontRadiusMm).toBeLessThan(rest.lensFrontRadiusMm);
    expect(near.aqueousMm).toBeLessThan(rest.aqueousMm);
  });
});
