import { describe, expect, it } from "vitest";
import { EYE_STUDIES } from "@/lib/clinyard/eye-studies";
import {
  GLAUCOMA_SETS,
  OPTICS_PATH,
  cvss17Level,
  gradeLeavesDiopter,
  lensLine,
} from "@/lib/clinyard/optics-path";
import { GLUCOSE_SHIFT, predictFocus } from "@/lib/clinyard/vision-lab";

describe("Optics path", () => {
  it("keeps the six stations in walk order and leaves the eye-study list alone", () => {
    expect(OPTICS_PATH.map((step) => step.id)).toEqual([
      "fundus",
      "schematic",
      "strain",
      "dr",
      "glaucoma",
      "cataract",
    ]);
    expect(EYE_STUDIES.map((study) => study.id)).not.toContain("origa");
    expect(GLAUCOMA_SETS.map((set) => set.title)).toEqual([
      "ORIGA",
      "ACRIMA",
      "REFUGE",
      "Drishti-GS",
    ]);
  });

  it("bands a CVSS-17 total and leaves the diopter alone when the grade changes", () => {
    expect(cvss17Level(16)).toBeNull();
    expect(cvss17Level(17)?.id).toBe("1");
    expect(cvss17Level(22)?.id).toBe("1");
    expect(cvss17Level(23)?.id).toBe("2");
    expect(cvss17Level(34)?.label).toBe("Level 3");
    expect(cvss17Level(36)?.id).toBe("4");
    expect(cvss17Level(53)?.id).toBe("5");
    expect(cvss17Level(54)).toBeNull();
    expect(gradeLeavesDiopter(22.3, 43, 17, "high")).toBe(true);
    const clear = predictFocus(22.3, 43, 17, "high", 0);
    const late = predictFocus(22.3, 43, 17, "high", 4);
    expect(clear.osmoticD).toBe(GLUCOSE_SHIFT.high);
    expect(late.refractiveErrorD).toBe(clear.refractiveErrorD);
    expect(lensLine(17, 1.5)).toBe("Resting lens 17 D plus the glucose shift 1.5 D.");
  });
});
