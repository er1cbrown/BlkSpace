/**
 * Teaching walk from a fundus picture to the schematic eye.
 * Strain totals, the retinopathy grade, glaucoma names, and cataract
 * stay beside the focus. None of them enter the diopter equation.
 * Questionnaire items are not copied. Glaucoma images are not in this tree.
 */
import { cvss17Inside } from "@/lib/clinyard/paper-desk";
import {
  predictFocus,
  type Glucose,
  type StudyGrade,
} from "@/lib/clinyard/vision-lab";

export interface PathStep {
  id: string;
  title: string;
  body: string;
}

export const OPTICS_PATH: readonly PathStep[] = [
  {
    id: "fundus",
    title: "Fundus",
    body:
      "A fundus picture is the retina after the light has already focused. It does not measure axial length, and it does not set cornea power or lens power. The teaching drawings sit on the vision lab card. This card does not turn that picture into a glasses prescription.",
  },
  {
    id: "schematic",
    title: "Schematic eye",
    body:
      "Eye length, cornea power, lens power, and the glucose preset set the focus. The retinopathy grade does not enter that equation.",
  },
  {
    id: "strain",
    title: "Digital eye strain",
    body:
      "Digital eye strain stays a total the reader already has. Pucker et al. band a CVS-Q total. Alfarhan, citing the English CVSS-17 validation, sorts a CVSS-17 total into five levels. The questionnaire items are not on this card.",
  },
  {
    id: "dr",
    title: "Diabetic retinopathy",
    body:
      "The grade describes the picture after the focus is set. Grades 2, 3, and 4 are the referable side. Grades 0 and 1 are not.",
  },
  {
    id: "glaucoma",
    title: "Glaucoma",
    body:
      "Glaucoma on a fundus photo is a disc and cup measurement. These sets are named in the project map. This card does not have the images or the outlines, and it does not score glaucoma.",
  },
  {
    id: "cataract",
    title: "Cataract",
    body:
      "A cataract is clouding of the lens. This model has no opacity grade and does not calculate an intraocular lens.",
  },
];

export interface GlaucomaSet {
  id: string;
  title: string;
  use: string;
}

/** Sibling of EYE_STUDIES. Sizes from the project map are not stored. */
export const GLAUCOMA_SETS: readonly GlaucomaSet[] = [
  { id: "origa", title: "ORIGA", use: "Glaucoma classification" },
  { id: "acrima", title: "ACRIMA", use: "Glaucoma classification" },
  { id: "refuge", title: "REFUGE", use: "Disc and cup labels" },
  { id: "drishti-gs", title: "Drishti-GS", use: "Disc and cup labels" },
];

export interface CvssLevel {
  id: string;
  label: string;
  detail: string;
}

/**
 * Severity levels reported by Alfarhan for a CVSS-17 total already in hand.
 * The 17 items are not reproduced.
 */
export function cvss17Level(score: number): CvssLevel | null {
  if (cvss17Inside(score) !== true) return null;
  if (score <= 22) {
    return { id: "1", label: "Level 1", detail: "Alfarhan's level 1 is 17–22." };
  }
  if (score <= 28) {
    return { id: "2", label: "Level 2", detail: "Alfarhan's level 2 is 23–28." };
  }
  if (score <= 35) {
    return { id: "3", label: "Level 3", detail: "Alfarhan's level 3 is 29–35." };
  }
  if (score <= 42) {
    return { id: "4", label: "Level 4", detail: "Alfarhan's level 4 is 36–42." };
  }
  return { id: "5", label: "Level 5", detail: "Alfarhan's level 5 is 43–53." };
}

export function gradeLeavesDiopter(
  axialMm: number,
  corneaD: number,
  lensD: number,
  glucose: Glucose,
): boolean {
  const clear = predictFocus(axialMm, corneaD, lensD, glucose, 0);
  const proliferative = predictFocus(axialMm, corneaD, lensD, glucose, 4);
  return (
    clear.refractiveErrorD === proliferative.refractiveErrorD &&
    clear.powerD === proliferative.powerD &&
    clear.osmoticD === proliferative.osmoticD
  );
}

export function lensLine(lensD: number, osmoticD: number): string {
  return `Resting lens ${lensD} D plus the glucose shift ${osmoticD} D.`;
}

export const GRADE_CHOICES: readonly StudyGrade[] = [0, 1, 2, 3, 4];
