/**
 * ClinYard vision lab.
 *
 * Five original teaching plates go through the same steps as the earlier
 * studies: a label map, a numeric comparison, then a picture of the result.
 * The grade on each plate is the study key. This file does not load
 * EfficientNet, the Wisconsin model, or the injury classifiers.
 * The diopter comes from vergence. The grade does not enter that equation.
 * The B5 step crops the dark ring, applies Ben Graham, and rounds a teaching
 * regression with np.rint. It does not load EfficientNet weights.
 */

import { b5Kappa, b5OnPlate, type B5Plate } from "@/lib/clinyard/b5-lab";

export const LAB_SIZE = 5;

/** Navarro 589.3 nm row. Aqueous and lens indices stay on the Navarro card. */
export const N_VITREOUS = 1.336;
export const N_CORNEA = 1.376;
export const N_AIR = 1;

export const GLUCOSE_SHIFT = {
  normal: 0,
  high: 1.5,
  falling: -0.75,
} as const;

export type Glucose = keyof typeof GLUCOSE_SHIFT;
export type StudyGrade = 0 | 1 | 2 | 3 | 4;
export type LesionMark = "none" | "micro" | "moderate" | "severe" | "proliferative";
export type ReferralGroup = "No DR" | "Non-referable" | "Referable";
export type FocusState = "nearsighted" | "farsighted" | "near emmetropia";

const AFTER_FOCUS: Record<StudyGrade, string> = {
  0: "The retina is the sensor. With no diabetic retinopathy, image quality is limited by the focus, not by retinal damage.",
  1: "Mild retinopathy adds microaneurysms. They do not move the focal plane. A person can be nearsighted or farsighted for a separate optical reason.",
  2: "Moderate retinopathy can include macular edema. The eye may still focus light on the retina while the swollen macula blurs the picture.",
  3: "Severe retinopathy still does not change axial length. Cotton-wool spots, venous beading, and IRMA mark retinal ischemia. Blur here is retinal, not a new glasses prescription.",
  4: "Proliferative disease can put blood or fibrous tissue in the vitreous. Light is scattered and blocked. Refraction through a clear vitreous no longer describes the path.",
};

const GRADE_NAME: Record<StudyGrade, string> = {
  0: "No DR",
  1: "Mild",
  2: "Moderate",
  3: "Severe",
  4: "Proliferative",
};

const GRADE_FINDING: Record<StudyGrade, string> = {
  0: "No microaneurysms.",
  1: "Microaneurysms only.",
  2: "More than microaneurysms, and short of the severe rule.",
  3: "Extensive hemorrhages in 4 quadrants, venous beading in 2, or IRMA in 1.",
  4: "Neovascularization, or vitreous or preretinal hemorrhage.",
};

export interface FundusPlate {
  id: string;
  title: string;
  grade: StudyGrade;
  lesions: LesionMark;
  axialMm: number;
  corneaD: number;
  lensD: number;
  glucose: Glucose;
  drawing: string;
}

export const STUDY_PLATES: FundusPlate[] = [
  {
    id: "plate-a",
    title: "Clear disc",
    grade: 0,
    lesions: "none",
    axialMm: 22.3,
    corneaD: 43,
    lensD: 17,
    glucose: "normal",
    drawing: "Orange disc, pale optic disc, two vessel arcs, no lesion marks.",
  },
  {
    id: "plate-b",
    title: "A few dots",
    grade: 1,
    lesions: "micro",
    axialMm: 22.3,
    corneaD: 43,
    lensD: 17,
    glucose: "high",
    drawing: "Same eye as the clear disc, plus three small red dots. High-glucose preset.",
  },
  {
    id: "plate-c",
    title: "Long eye",
    grade: 2,
    lesions: "moderate",
    axialMm: 24.8,
    corneaD: 43,
    lensD: 17,
    glucose: "normal",
    drawing: "Longer axial length. Scattered dots and one larger blot.",
  },
  {
    id: "plate-d",
    title: "Short eye",
    grade: 0,
    lesions: "none",
    axialMm: 21,
    corneaD: 43,
    lensD: 17,
    glucose: "normal",
    drawing: "Shorter axial length. No lesion marks.",
  },
  {
    id: "plate-e",
    title: "Vitreous haze",
    grade: 4,
    lesions: "proliferative",
    axialMm: 24.2,
    corneaD: 43,
    lensD: 17,
    glucose: "high",
    drawing: "A fan of new-vessel marks and a dark vitreous patch.",
  },
  {
    id: "plate-f",
    title: "Quadrant marks",
    grade: 3,
    lesions: "severe",
    axialMm: 22.6,
    corneaD: 43,
    lensD: 16,
    glucose: "normal",
    drawing: "Blots in four quadrants. Power is set so the focus stays near the retina.",
  },
  {
    id: "plate-g",
    title: "Falling glucose",
    grade: 1,
    lesions: "micro",
    axialMm: 22.3,
    corneaD: 43,
    lensD: 17,
    glucose: "falling",
    drawing: "A few red dots. Falling-glucose preset on the lens.",
  },
  {
    id: "plate-h",
    title: "Steep cornea",
    grade: 2,
    lesions: "moderate",
    axialMm: 22.3,
    corneaD: 46,
    lensD: 17,
    glucose: "normal",
    drawing: "Steeper cornea. Moderate lesion marks.",
  },
];

export interface FocusPrediction {
  axialMm: number;
  corneaD: number;
  lensD: number;
  osmoticD: number;
  glucose: Glucose;
  powerD: number;
  matchingPowerD: number;
  refractiveErrorD: number;
  state: FocusState;
  where: string;
  correction: string;
  focusMm: number;
  retinaMm: number;
  focusMinusRetinaMm: number;
  airCorneaReflectance: number;
  snell: { airDegrees: 20; corneaDegrees: number; law: string };
  grade: StudyGrade;
  afterFocus: string;
}

export interface SightView {
  distantBlurPx: number;
  nearBlurPx: number;
  haze: number;
  blotches: boolean;
  mitigation: string;
}

export interface PlateMetadata {
  plateId: string;
  medium: string;
  field: string;
  blackBorder: string;
  glucose: Glucose;
  axialMm: number;
  corneaD: number;
  lensD: number;
}

export interface PlateReadout {
  plate: FundusPlate;
  metadata: PlateMetadata;
  grade: StudyGrade;
  gradeName: string;
  finding: string;
  group: ReferralGroup;
  focus: FocusPrediction;
  sight: SightView;
  score: ScoreMetadata;
  /** EfficientNet-B5 crop, Ben Graham, and rounded teaching regression. */
  b5: B5Plate;
}

export interface LabReport {
  n: number;
  plates: PlateReadout[];
  gradeCounts: number[];
  referable: number;
  meanErrorD: number;
  cohensD: number | null;
  comparison: string;
  /** Quadratic weighted kappa of the study key against the rounded B5 column. */
  b5Kappa: number | null;
  setScore: string;
}

function round(n: number, digits: number): number {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}

function focusState(errorD: number): FocusState {
  if (errorD <= -0.5) return "nearsighted";
  if (errorD >= 0.5) return "farsighted";
  return "near emmetropia";
}

export function referralGroup(grade: number): ReferralGroup {
  if (grade <= 0) return "No DR";
  if (grade === 1) return "Non-referable";
  return "Referable";
}

export function predictFocus(
  axialMm: number,
  corneaD: number,
  lensD: number,
  glucose: Glucose,
  grade: StudyGrade,
): FocusPrediction {
  if (!(grade in AFTER_FOCUS)) {
    throw new Error("grade must be an integer from 0 to 4");
  }
  if (!(18 <= axialMm && axialMm <= 30)) {
    throw new Error("axial length must be between 18 and 30 mm");
  }
  if (!(30 <= corneaD && corneaD <= 55 && 5 <= lensD && lensD <= 35)) {
    throw new Error("cornea or lens power is outside the teaching range");
  }
  const osmoticD = GLUCOSE_SHIFT[glucose];
  const powerD = corneaD + lensD + osmoticD;
  if (powerD <= 1) throw new Error("total eye power must stay positive");

  const matchingPower = N_VITREOUS / (axialMm / 1000);
  const errorD = matchingPower - powerD;
  const focusMm = (1000 * N_VITREOUS) / powerD;
  const state = focusState(errorD);
  const shown = errorD.toFixed(2);
  let correction: string;
  let where: string;
  if (state === "nearsighted") {
    correction = `A diverging (concave) lens of about ${shown} D.`;
    where = "The rays meet in front of the retina.";
  } else if (state === "farsighted") {
    correction = `A converging (convex) lens of about ${shown} D.`;
    where = "The rays have not met yet when they reach the retina. The focus is behind it.";
  } else {
    correction = "No spherical lens in this model. The focus is on the retina.";
    where = "The rays meet on the retina.";
  }

  const reflectance = ((N_CORNEA - N_AIR) / (N_CORNEA + N_AIR)) ** 2;
  const thetaAir = (20 * Math.PI) / 180;
  const thetaCornea = Math.asin(
    Math.min(1, (N_AIR / N_CORNEA) * Math.sin(thetaAir)),
  );

  return {
    axialMm: round(axialMm, 2),
    corneaD: round(corneaD, 2),
    lensD: round(lensD, 2),
    osmoticD,
    glucose,
    powerD: round(powerD, 2),
    matchingPowerD: round(matchingPower, 2),
    refractiveErrorD: round(errorD, 2),
    state,
    where,
    correction,
    focusMm: round(focusMm, 2),
    retinaMm: round(axialMm, 2),
    focusMinusRetinaMm: round(focusMm - axialMm, 2),
    airCorneaReflectance: round(reflectance, 4),
    snell: {
      airDegrees: 20,
      corneaDegrees: round((thetaCornea * 180) / Math.PI, 1),
      law: "n_air sin θ_air = n_cornea sin θ_cornea",
    },
    grade,
    afterFocus: AFTER_FOCUS[grade],
  };
}

export interface SchematicPoints {
  /** Millimetres from the principal plane. Object space is negative. */
  principalMm: number;
  nodalMm: number;
  anteriorFocusMm: number;
  posteriorFocusMm: number;
  retinaMm: number;
  gap: "in front" | "on the retina" | "behind";
}

/**
 * Reduced eye. One refracting plane.
 * P is the vertex. N is the center of curvature. F is in air.
 * F′ is the posterior focus of a distant object. The retina is the axial length.
 */
export function schematicPoints(focus: FocusPrediction): SchematicPoints {
  const posterior = focus.focusMm;
  const retina = focus.retinaMm;
  const delta = round(posterior - retina, 2);
  let gap: SchematicPoints["gap"] = "on the retina";
  if (delta < -0.05) gap = "in front";
  else if (delta > 0.05) gap = "behind";
  return {
    principalMm: 0,
    nodalMm: round((1000 * (N_VITREOUS - N_AIR)) / focus.powerD, 2),
    anteriorFocusMm: round(-1000 / focus.powerD, 2),
    posteriorFocusMm: posterior,
    retinaMm: retina,
    gap,
  };
}

function capBlur(diopters: number): number {
  return round(Math.min(12, Math.max(0, diopters)), 2);
}

export function sightView(errorD: number, grade: StudyGrade): SightView {
  const state = focusState(errorD);
  const miss = Math.abs(errorD);
  const distant =
    state === "farsighted" ? miss * 0.35 : state === "nearsighted" ? miss * 1.6 : 0.2;
  const near =
    state === "nearsighted" ? miss * 0.35 : state === "farsighted" ? miss * 1.6 : 0.2;
  const haze = [0, 0.05, 0.18, 0.32, 0.5][grade];
  let mitigation: string;
  if (state === "nearsighted") {
    mitigation =
      "Distant letters blur first. A diverging lens pulls the focus back to the retina. The retina did not move.";
  } else if (state === "farsighted") {
    mitigation =
      "A near card blurs first in this model. A converging lens brings the focus up to the retina.";
  } else {
    mitigation =
      "The focus is already on the retina. A spherical lens is not the next step in this model.";
  }
  if (grade >= 2) {
    mitigation +=
      " Grade 2 and above can still blur the picture after the focus is corrected, through macular edema, ischemia, or blood in the vitreous.";
  }
  return {
    distantBlurPx: capBlur(distant),
    nearBlurPx: capBlur(near),
    haze,
    blotches: grade === 4,
    mitigation,
  };
}

export interface ExamChart {
  /** Chance of still reading the 20/30 line on the distant teaching chart. */
  goodScoreP: number;
  lastLine: string;
  penalty: number;
  note: string;
}

const CHART_CUTS: { line: string; maxPenalty: number }[] = [
  { line: "20/20", maxPenalty: 1 },
  { line: "20/30", maxPenalty: 2 },
  { line: "20/40", maxPenalty: 3.5 },
  { line: "20/70", maxPenalty: 5 },
  { line: "20/100", maxPenalty: 8 },
  { line: "20/200", maxPenalty: Number.POSITIVE_INFINITY },
];

/**
 * Distant wall chart. Blur comes from the schematic-eye gap.
 * Haze and grade-4 blotches come from the retina and stay after the teaching lens.
 * A good score means the 20/30 line. This is not a measured acuity.
 */
export function examChart(sight: SightView): ExamChart {
  const penalty = round(
    sight.distantBlurPx + sight.haze * 8 + (sight.blotches ? 3 : 0),
    2,
  );
  const goodScoreP = round(
    Math.min(0.98, Math.max(0.02, 1 - penalty / 12)),
    2,
  );
  const lastLine =
    CHART_CUTS.find((cut) => penalty < cut.maxPenalty)?.line ?? "20/200";
  return {
    goodScoreP,
    lastLine,
    penalty,
    note: "Teaching chart at distance. A good exam score means the 20/30 line is still readable in this model. The schematic eye sets the blur. The grade sets the haze.",
  };
}

export function toggleStudyPlate(selected: string[], id: string): string[] {
  if (!STUDY_PLATES.some((plate) => plate.id === id)) return selected;
  if (selected.includes(id)) return selected.filter((item) => item !== id);
  if (selected.length >= LAB_SIZE) return selected;
  return [...selected, id];
}

export function platesByIds(ids: string[]): FundusPlate[] {
  return ids.map((id) => {
    const plate = STUDY_PLATES.find((item) => item.id === id);
    if (!plate) throw new Error(`Unknown plate ${id}`);
    return plate;
  });
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Sample Cohen's d. Returns null when either group has fewer than 2 plates. */
export function cohensD(left: number[], right: number[]): number | null {
  if (left.length < 2 || right.length < 2) return null;
  const meanLeft = mean(left);
  const meanRight = mean(right);
  const variance = (values: number[], center: number) =>
    values.reduce((sum, value) => sum + (value - center) ** 2, 0) /
    (values.length - 1);
  const pooled = Math.sqrt(
    ((left.length - 1) * variance(left, meanLeft) +
      (right.length - 1) * variance(right, meanRight)) /
      (left.length + right.length - 2),
  );
  if (pooled === 0) return 0;
  return (meanLeft - meanRight) / pooled;
}

/** Study key written as the five-class mass the ResNet-50 notebook argmaxes. */
export function classMassFor(
  grade: StudyGrade,
): [number, number, number, number, number] {
  const mass: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  mass[grade] = 1;
  return mass;
}

export interface ScoreMetadata {
  /** APTOS train.csv id_code. Here it is the teaching-plate id. */
  idCode: string;
  /** APTOS diagnosis column, 0–4. */
  diagnosis: StudyGrade;
  /** Older Kaggle level column. The five-class notebook reports argmax of this. */
  level: StudyGrade;
  className: string;
  classMass: [number, number, number, number, number];
  referral: ReferralGroup;
  medium: string;
  field: string;
  blackBorder: string;
  glucose: Glucose;
  axialMm: number;
  corneaD: number;
  lensD: number;
  focusMinusRetinaMm: number;
  gap: SchematicPoints["gap"];
  principalMm: number;
  nodalMm: number;
  anteriorFocusMm: number;
  posteriorFocusMm: number;
  retinaMm: number;
  retinal: string;
  note: string;
}

export function scoreMetadata(input: {
  grade: StudyGrade;
  gradeName: string;
  group: ReferralGroup;
  metadata: PlateMetadata;
  focus: FocusPrediction;
}): ScoreMetadata {
  const eye = schematicPoints(input.focus);
  return {
    idCode: input.metadata.plateId,
    diagnosis: input.grade,
    level: input.grade,
    className: input.gradeName,
    classMass: classMassFor(input.grade),
    referral: input.group,
    medium: input.metadata.medium,
    field: input.metadata.field,
    blackBorder: input.metadata.blackBorder,
    glucose: input.metadata.glucose,
    axialMm: input.metadata.axialMm,
    corneaD: input.metadata.corneaD,
    lensD: input.metadata.lensD,
    focusMinusRetinaMm: input.focus.focusMinusRetinaMm,
    gap: eye.gap,
    principalMm: eye.principalMm,
    nodalMm: eye.nodalMm,
    anteriorFocusMm: eye.anteriorFocusMm,
    posteriorFocusMm: eye.posteriorFocusMm,
    retinaMm: eye.retinaMm,
    retinal: `${input.grade} ${input.gradeName}`,
    note: "Study key in the APTOS diagnosis column and the five-class level column. The class mass is 1 on that grade. The screening card is where a GPU host replaces the five masses.",
  };
}

export function runPlate(plate: FundusPlate): PlateReadout {
  const focus = predictFocus(
    plate.axialMm,
    plate.corneaD,
    plate.lensD,
    plate.glucose,
    plate.grade,
  );
  const metadata: PlateMetadata = {
    plateId: plate.id,
    medium: "Original teaching drawing. Not a camera file and not a patient photo.",
    field: "320×320 schematic",
    blackBorder: "Drawn dark field around the disc, the same crop idea as the fundus notebooks.",
    glucose: plate.glucose,
    axialMm: plate.axialMm,
    corneaD: plate.corneaD,
    lensD: plate.lensD,
  };
  const gradeName = GRADE_NAME[plate.grade];
  const group = referralGroup(plate.grade);
  return {
    plate,
    metadata,
    grade: plate.grade,
    gradeName,
    finding: GRADE_FINDING[plate.grade],
    group,
    focus,
    sight: sightView(focus.refractiveErrorD, plate.grade),
    score: scoreMetadata({ grade: plate.grade, gradeName, group, metadata, focus }),
    b5: b5OnPlate(plate),
  };
}

export function runLab(ids: string[]): LabReport {
  if (ids.length !== LAB_SIZE) {
    throw new Error("Pick five plates.");
  }
  const plates = platesByIds(ids).map(runPlate);
  const gradeCounts = [0, 0, 0, 0, 0];
  for (const plate of plates) gradeCounts[plate.grade] += 1;
  const referableRows = plates.filter((plate) => plate.grade >= 2);
  const otherRows = plates.filter((plate) => plate.grade < 2);
  const d = cohensD(
    referableRows.map((plate) => plate.focus.refractiveErrorD),
    otherRows.map((plate) => plate.focus.refractiveErrorD),
  );
  const comparison =
    d === null
      ? "This five does not have two plates on both sides of the referral cut, so Cohen's d stays blank. The breast-cancer notebook uses the same comparison once both groups are large enough."
      : `Cohen's d on refractive error, referable minus the other plates, is ${d.toFixed(2)}. That is the breast-cancer comparison, run on these five drawings. It is not a clinical effect.`;
  const errors = plates.map((plate) => plate.focus.refractiveErrorD);
  const kappa = b5Kappa(
    plates.map((plate) => ({
      diagnosis: plate.score.diagnosis,
      rounded: plate.b5.rounded,
    })),
  );
  const kappaText =
    kappa === null ? "blank" : kappa.toFixed(2);
  return {
    n: plates.length,
    plates,
    gradeCounts,
    referable: referableRows.length,
    meanErrorD: round(mean(errors), 2),
    cohensD: d === null ? null : round(d, 2),
    comparison,
    b5Kappa: kappa === null ? null : round(kappa, 2),
    setScore: `Five rows. diagnosis is the study key. The B5 column is a teaching regression rounded to the nearest grade. Quadratic weighted kappa on this five is ${kappaText}. EfficientNet-B5 weights are not loaded.`,
  };
}

export interface TowerStep {
  id: string;
  service: string;
  from: string;
  output: string;
}

/** One plate, five services, same order every time. */
export function towerFor(readout: PlateReadout): TowerStep[] {
  const focus = readout.focus;
  return [
    {
      id: "preprocess",
      service: "Preprocess",
      from: "EfficientNet-B5 notebook: crop gray above 7, then Ben Graham. The notebook frame is 456 px with sigma 10. This drawing is 32 px, so the blur sigma is scaled by 32/456.",
      output: `${readout.score.idCode}. diagnosis ${readout.score.diagnosis}. level ${readout.score.level}. Crop ${readout.b5.cropped ? "removed the dark ring" : "kept the frame"}. Mean ${readout.b5.meanBefore} to ${readout.b5.meanAfter}. Regression ${readout.b5.regression} rounds to ${readout.b5.rounded}.`,
    },
    {
      id: "severity",
      service: "Severity",
      from: "DR transfer-learning scale, grades 0–4. This is the study key. EfficientNet stays on the GPU card.",
      output: `${readout.grade} ${readout.gradeName}. ${readout.finding}`,
    },
    {
      id: "label-map",
      service: "Label map",
      from: "Injury notebook: many raw labels become one smaller group.",
      output: readout.group,
    },
    {
      id: "vergence",
      service: "Vergence",
      from: "Schematic eye. The grade is not an input.",
      output: `${focus.refractiveErrorD} D, ${focus.state}. ${focus.where}`,
    },
    {
      id: "sight",
      service: "Sight picture",
      from: "The other side of the eye: focus blur first, retinal haze second.",
      output: `Distant blur ${readout.sight.distantBlurPx} px. Near blur ${readout.sight.nearBlurPx} px. Haze ${readout.sight.haze}.`,
    },
  ];
}

/** Spherical blur drops to the focused floor. Retinal haze and blotches stay. */
export function correctedSight(sight: SightView): SightView {
  const retinal = sight.haze >= 0.18 || sight.blotches;
  return {
    ...sight,
    distantBlurPx: 0.2,
    nearBlurPx: 0.2,
    mitigation: retinal
      ? "The teaching lens clears the focus blur. Haze or blotches stay, because those come from the retina and the vitreous."
      : "The teaching lens clears the focus blur. This plate has little retinal haze left in the picture.",
  };
}

export interface SightDrill {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  teach: string;
}

export function sightDrills(readout: PlateReadout): SightDrill[] {
  const distant = readout.sight.distantBlurPx;
  const near = readout.sight.nearBlurPx;
  let blurAnswer = 2;
  let blurTeach =
    "The focus is on the retina, so the two cards stay about equally sharp before any retinal haze.";
  if (distant > near + 0.05) {
    blurAnswer = 0;
    blurTeach =
      "Nearsighted: the rays meet in front of the retina, so distant letters blur first.";
  } else if (near > distant + 0.05) {
    blurAnswer = 1;
    blurTeach =
      "Farsighted: the rays have not met at the retina, so the near card blurs first in this model.";
  }
  return [
    {
      id: "which-blur",
      prompt: "On this plate, which teaching view is blurrier from the focus alone?",
      choices: ["Distant letters", "Near card", "About the same"],
      answerIndex: blurAnswer,
      teach: blurTeach,
    },
    {
      id: "grade-diopter",
      prompt: "Does raising the retinopathy grade change the diopter in this model?",
      choices: ["Yes", "No"],
      answerIndex: 1,
      teach: "The grade describes the retina after the focus is set. Glucose, axial length, cornea, and lens set the diopter.",
    },
  ];
}

const REJECT_PROMPT = [/diagnos/i, /\bpatient\b/i, /\bmrn\b/i, /prescri/i, /\bssn\b/i];

/** A study prompt may ask for the grade and the diopter. It may not ask for a diagnosis or an identifier. */
export function scoreStudyPrompt(text: string): { ok: boolean; teach: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, teach: "Write one sentence before checking." };
  }
  if (REJECT_PROMPT.some((pattern) => pattern.test(trimmed))) {
    return {
      ok: false,
      teach: "That prompt asks for a diagnosis, a prescription, or an identifier. The lab rejects it. Ask for the study key and the refractive error on a teaching plate.",
    };
  }
  const hasGrade = /grade/i.test(trimmed);
  const hasOptics = /diopter|refractive|nearsight|farsight/i.test(trimmed);
  if (!hasGrade || !hasOptics) {
    return {
      ok: false,
      teach: "Name the grade and the refractive error. Use grade, and one of diopter, refractive, nearsighted, or farsighted.",
    };
  }
  return {
    ok: true,
    teach: "That prompt stays on the study key and the optics. It does not ask the model to diagnose anyone.",
  };
}

export function presentationBrief(report: LabReport): string {
  const lines = [
    "ClinYard vision lab. Teaching plates. Not a diagnosis and not a glasses prescription.",
    `n=${report.n}. Grade counts 0–4: ${report.gradeCounts.join(", ")}. Referable ${report.referable}. Mean error ${report.meanErrorD} D.`,
    report.comparison,
    report.setScore,
    ...report.plates.map(
      (plate) =>
        `${plate.score.idCode} ${plate.plate.title}: diagnosis ${plate.score.diagnosis}, level ${plate.score.level} ${plate.score.className}, ${plate.score.referral}, ${plate.focus.refractiveErrorD} D ${plate.focus.state}. P ${plate.score.principalMm} N ${plate.score.nodalMm} F ${plate.score.anteriorFocusMm} F′ ${plate.score.posteriorFocusMm} R ${plate.score.retinaMm}. F′ is ${plate.score.gap}. Chart P(good) ${examChart(plate.sight).goodScoreP}.`,
    ),
  ];
  return lines.join("\n");
}
