import { describe, expect, it } from "vitest";
import { referralGroup } from "@/lib/clinyard/vision-lab";
import {
  EYE_STUDIES,
  PYTORCH_BINARY,
  STARTER_THRESHOLDS,
  eyeStudyById,
  eyeStudyHref,
  gradeFromNearest,
  gradeFromRegression,
  isReferable,
  pytorchBinaryLabel,
  quadraticWeightedKappa,
} from "@/lib/clinyard/eye-studies";

describe("Amalgamated eye studies", () => {
  it("lists the notebooks and the schematic eye once each", () => {
    expect(EYE_STUDIES.map((study) => study.id)).toEqual([
      "aptos-starter",
      "aptos-eyepacs-eda",
      "resnet50-referable",
      "efficientnet-five",
      "efficientnet-b5",
      "pytorch-binary",
      "schematic-eye",
    ]);
    expect(EYE_STUDIES.filter((study) => study.where === "browser")).toEqual([
      eyeStudyById("schematic-eye"),
    ]);
    expect(eyeStudyById("schematic-eye").file).toBeNull();
  });

  it("points each notebook at its file in the biostats repo", () => {
    expect(eyeStudyHref(eyeStudyById("aptos-starter").file!)).toBe(
      "https://github.com/er1cbrown/BiostatsPython/blob/main/Intro_APTOS_Diabetic_Retinopathy_(EDA_%26_Starter).ipynb",
    );
    expect(eyeStudyHref(eyeStudyById("efficientnet-five").file!)).toContain(
      "Diabetic_Retinopathy_Detection_Using_Deep_Learning.ipynb",
    );
    expect(eyeStudyHref(eyeStudyById("resnet50-referable").file!)).toContain(
      "Diabetic_Retinopathy%2C_ResNet50%2C_Binary%2C_Cropped.ipynb",
    );
  });

  it("cuts a regression score at the starter thresholds", () => {
    expect(STARTER_THRESHOLDS).toEqual([0.5, 1.5, 2.5, 3.5]);
    expect(gradeFromRegression(0.49)).toBe(0);
    expect(gradeFromRegression(0.5)).toBe(1);
    expect(gradeFromRegression(1.5)).toBe(2);
    expect(gradeFromRegression(2.5)).toBe(3);
    expect(gradeFromRegression(3.5)).toBe(4);
  });

  it("rounds the B5 score to the nearest grade, ties toward even", () => {
    expect(eyeStudyById("efficientnet-b5").file).toBe(
      "EfficientNetB5_with_Keras_(APTOS_2019).ipynb",
    );
    expect(gradeFromNearest(1.2)).toBe(1);
    expect(gradeFromNearest(1.6)).toBe(2);
    expect(gradeFromNearest(0.5)).toBe(0);
    expect(gradeFromNearest(1.5)).toBe(2);
    expect(gradeFromNearest(4.8)).toBe(4);
    expect(gradeFromNearest(-0.4)).toBe(0);
  });

  it("uses the same referable cut as the schematic eye", () => {
    for (const grade of [0, 1, 2, 3, 4]) {
      expect(isReferable(grade)).toBe(referralGroup(grade) === "Referable");
    }
    expect(isReferable(1)).toBe(false);
    expect(isReferable(2)).toBe(true);
  });

  it("keeps the PyTorch class order off the APTOS scale", () => {
    expect(pytorchBinaryLabel(0)).toBe("DR");
    expect(pytorchBinaryLabel(1)).toBe("No_DR");
    expect(PYTORCH_BINARY[0].label).not.toBe("No DR");
    expect(() => pytorchBinaryLabel(2)).toThrow(/0 or 1/);
  });

  it("scores quadratic weighted kappa", () => {
    expect(quadraticWeightedKappa([0, 1, 2, 3, 4], [0, 1, 2, 3, 4])).toBe(1);
    expect(quadraticWeightedKappa([0, 1], [1, 0], 2)).toBeCloseTo(-1);
    expect(quadraticWeightedKappa([0], [1])).toBeCloseTo(0);
    expect(quadraticWeightedKappa([0, 9], [0, 1])).toBeNull();
    expect(quadraticWeightedKappa([], [])).toBeNull();
  });
});
