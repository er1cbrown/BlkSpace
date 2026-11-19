import { describe, expect, it } from "vitest";
import {
  LAB_SIZE,
  STUDY_PLATES,
  correctedSight,
  examChart,
  predictFocus,
  presentationBrief,
  schematicPoints,
  referralGroup,
  runLab,
  runPlate,
  scoreMetadata,
  scoreStudyPrompt,
  sightDrills,
  sightView,
  toggleStudyPlate,
  towerFor,
} from "@/lib/clinyard/vision-lab";

describe("ClinYard vision lab", () => {
  it("keeps the diopter on vergence and the grade off that equation", () => {
    const calm = predictFocus(22.3, 43, 17, "normal", 0);
    expect(calm.refractiveErrorD).toBe(-0.09);
    expect(calm.state).toBe("near emmetropia");
    expect(calm.snell.corneaDegrees).toBe(14.4);
    expect(calm.airCorneaReflectance).toBe(0.025);

    expect(predictFocus(22.3, 43, 17, "high", 0).refractiveErrorD).toBe(-1.59);
    expect(predictFocus(24.8, 43, 17, "normal", 0).refractiveErrorD).toBe(-6.13);
    expect(predictFocus(21, 43, 17, "normal", 0).refractiveErrorD).toBe(3.62);
    expect(predictFocus(22.3, 43, 17, "normal", 4).refractiveErrorD).toBe(
      calm.refractiveErrorD,
    );
  });

  it("marks principal, nodal, and both focal points from the vertex", () => {
    const calm = predictFocus(22.3, 43, 17, "normal", 0);
    const eye = schematicPoints(calm);
    expect(eye.principalMm).toBe(0);
    expect(eye.anteriorFocusMm).toBe(-16.67);
    expect(eye.nodalMm).toBe(5.6);
    expect(eye.posteriorFocusMm).toBe(22.27);
    expect(eye.retinaMm).toBe(22.3);
    expect(eye.gap).toBe("on the retina");

    const long = schematicPoints(predictFocus(24.8, 43, 17, "normal", 2));
    expect(long.posteriorFocusMm).toBeLessThan(long.retinaMm);
    expect(long.gap).toBe("in front");

    const short = schematicPoints(predictFocus(21, 43, 17, "normal", 0));
    expect(short.posteriorFocusMm).toBeGreaterThan(short.retinaMm);
    expect(short.gap).toBe("behind");

    const samePower = schematicPoints(predictFocus(22.3, 43, 17, "normal", 4));
    expect(samePower).toEqual(eye);
  });

  it("writes the study key as APTOS diagnosis and five-class level", () => {
    const calm = runPlate(STUDY_PLATES.find((plate) => plate.id === "plate-a")!);
    expect(calm.score.diagnosis).toBe(0);
    expect(calm.score.level).toBe(0);
    expect(calm.score.classMass).toEqual([1, 0, 0, 0, 0]);
    expect(calm.score.gap).toBe("on the retina");
    expect(calm.score.posteriorFocusMm).toBe(22.27);
    expect(calm.score.retinaMm).toBe(22.3);

    const severe = runPlate(STUDY_PLATES.find((plate) => plate.id === "plate-e")!);
    expect(severe.score.diagnosis).toBe(4);
    expect(severe.score.level).toBe(4);
    expect(severe.score.classMass).toEqual([0, 0, 0, 0, 1]);
    expect(severe.score.idCode).toBe("plate-e");

    const sameEye = scoreMetadata({
      grade: 4,
      gradeName: "Proliferative",
      group: "Referable",
      metadata: calm.metadata,
      focus: predictFocus(22.3, 43, 17, "normal", 4),
    });
    expect(sameEye.posteriorFocusMm).toBe(calm.score.posteriorFocusMm);
    expect(sameEye.diagnosis).toBe(4);
  });

  it("maps grades the way the referral drill does", () => {
    expect(referralGroup(0)).toBe("No DR");
    expect(referralGroup(1)).toBe("Non-referable");
    expect(referralGroup(2)).toBe("Referable");
    expect(referralGroup(4)).toBe("Referable");
  });

  it("stops the set at five plates", () => {
    let selected: string[] = [];
    for (const plate of STUDY_PLATES) {
      selected = toggleStudyPlate(selected, plate.id);
    }
    expect(selected).toHaveLength(LAB_SIZE);
    expect(toggleStudyPlate(selected, selected[0])).toHaveLength(4);
  });

  it("blurs distance for a nearsighted plate and the near card for a farsighted one", () => {
    const near = sightView(-6.13, 0);
    const far = sightView(3.62, 0);
    expect(near.distantBlurPx).toBeGreaterThan(near.nearBlurPx);
    expect(far.nearBlurPx).toBeGreaterThan(far.distantBlurPx);
    expect(sightView(-6.13, 4).haze).toBeGreaterThan(sightView(-6.13, 0).haze);
    expect(sightView(-6.13, 4).blotches).toBe(true);
    expect(sightView(-6.13, 0).distantBlurPx).toBe(
      sightView(-6.13, 4).distantBlurPx,
    );
  });

  it("ties the distant chart to the schematic eye and the grade", () => {
    const calm = examChart(sightView(-0.09, 0));
    expect(calm.goodScoreP).toBe(0.98);
    expect(calm.lastLine).toBe("20/20");

    const long = examChart(sightView(-6.13, 0));
    expect(long.goodScoreP).toBe(0.18);
    expect(long.lastLine).toBe("20/200");
    expect(examChart(correctedSight(sightView(-6.13, 0))).goodScoreP).toBe(0.98);

    const retinal = examChart(sightView(-0.09, 4));
    expect(retinal.goodScoreP).toBe(0.4);
    expect(retinal.lastLine).toBe("20/100");
    expect(examChart(correctedSight(sightView(-0.09, 4))).goodScoreP).toBe(0.4);

    const far = examChart(sightView(3.62, 0));
    expect(far.goodScoreP).toBeGreaterThan(long.goodScoreP);
    expect(far.lastLine).toBe("20/30");
  });

  it("runs five plates and reports a comparison only when both groups exist", () => {
    const report = runLab(STUDY_PLATES.slice(0, 5).map((plate) => plate.id));
    expect(report.n).toBe(5);
    expect(report.plates).toHaveLength(5);
    expect(report.gradeCounts.reduce((sum, n) => sum + n, 0)).toBe(5);
    expect(report.cohensD).not.toBeNull();
    expect(() => runLab(["plate-a"])).toThrow(/five/i);
  });

  it("repeats five services and keeps retinal haze after the teaching lens", () => {
    const plate = STUDY_PLATES.find((item) => item.id === "plate-e")!;
    const readout = runPlate(plate);
    expect(towerFor(readout).map((step) => step.id)).toEqual([
      "preprocess",
      "severity",
      "label-map",
      "vergence",
      "sight",
    ]);
    const fixed = correctedSight(readout.sight);
    expect(fixed.distantBlurPx).toBe(0.2);
    expect(fixed.nearBlurPx).toBe(0.2);
    expect(fixed.haze).toBe(readout.sight.haze);
    expect(fixed.blotches).toBe(true);
    const drills = sightDrills(readout);
    expect(drills[1].answerIndex).toBe(1);
  });

  it("accepts a study prompt and rejects a diagnosis prompt", () => {
    expect(
      scoreStudyPrompt("Grade 2 on this teaching plate, refractive error -6.13 D.")
        .ok,
    ).toBe(true);
    expect(scoreStudyPrompt("Diagnose this patient and prescribe glasses.").ok).toBe(
      false,
    );
    expect(scoreStudyPrompt("The picture looks red.").ok).toBe(false);
    const report = runLab(["plate-a", "plate-b", "plate-c", "plate-d", "plate-e"]);
    expect(presentationBrief(report)).toContain("Not a diagnosis");
    expect(presentationBrief(report)).toContain("plate-e");
    expect(presentationBrief(report)).toContain("diagnosis 4");
    expect(presentationBrief(report)).toContain("Quadratic weighted kappa");
    expect(presentationBrief(report)).toContain("Chart P(good)");
    expect(report.b5Kappa).not.toBeNull();
    expect(report.b5Kappa).toBeLessThan(1);
    const fewDots = report.plates.find((plate) => plate.plate.id === "plate-b");
    expect(fewDots?.b5.regression).toBe(0.5);
    expect(fewDots?.b5.rounded).toBe(0);
    expect(fewDots?.score.diagnosis).toBe(1);
    expect(fewDots?.b5.cropped).toBe(true);
  });
});
