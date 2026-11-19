/**
 * Teaching numbers from the seven papers on the ClinYard reading desk.
 * They do not enter the focus equation, the study-key grades, or a model.
 */

export type CvsqBandId = "under" | "mild" | "moderate" | "severe" | "above";

export type CvsqBand = {
  id: CvsqBandId;
  label: string;
  detail: string;
};

/** Anshel's 20-20-20 rule, as Pucker et al. restate it. */
export const BREAK_RULE = {
  workSeconds: 20 * 60,
  lookSeconds: 20,
  lookFeet: 20,
} as const;

export type BreakPhase = "work" | "look";

export type BreakClock = {
  phase: BreakPhase;
  secondsLeft: number;
  done: boolean;
};

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

/** One tick of the look-away timer. A finished look returns done. */
export function nextBreak(phase: BreakPhase, secondsLeft: number): BreakClock {
  if (secondsLeft > 0) {
    return { phase, secondsLeft: secondsLeft - 1, done: false };
  }
  if (phase === "work") {
    return { phase: "look", secondsLeft: BREAK_RULE.lookSeconds, done: false };
  }
  return { phase: "work", secondsLeft: 0, done: true };
}

export function readScore(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/**
 * Bands from Pucker et al. 2024 for a CVS-Q total the reader already has.
 * The instrument items are not reproduced here.
 */
export function cvsqBand(score: number): CvsqBand | null {
  if (!Number.isFinite(score) || score < 0) return null;
  if (score < 6) {
    return {
      id: "under",
      label: "Under 6",
      detail: "Pucker et al. put digital eye strain at a CVS-Q total of 6 or higher.",
    };
  }
  if (score <= 12) {
    return {
      id: "mild",
      label: "Mild",
      detail: "The review's mild band is 6–12.",
    };
  }
  if (score <= 18) {
    return {
      id: "moderate",
      label: "Moderate",
      detail: "The review's moderate band is 13–18.",
    };
  }
  if (score <= 23) {
    return {
      id: "severe",
      label: "Severe",
      detail: "The review's severe band is 19–23.",
    };
  }
  return {
    id: "above",
    label: "Above 23",
    detail: "The review's severe band stops at 23.",
  };
}

/** CVSS17 totals in the review run from 17 to 53. Higher means more symptoms. */
export function cvss17Inside(score: number): boolean | null {
  if (!Number.isFinite(score) || score < 0) return null;
  return score >= 17 && score <= 53;
}

export const PRACTICE_TALLY = [
  "Screen time was long today",
  "Blinks felt less often than usual",
  "A look-away break was taken",
  "The room light felt comfortable",
  "The eyes felt dry",
] as const;

/** Vavrek et al. 2025. Extraction fraction from one fluorescein pass. */
export const PERMEABILITY = [
  { id: "control", label: "Healthy controls", n: 7, mean: 0.04, sd: 0.01 },
  { id: "dmnodr", label: "Diabetes, no retinopathy", n: 22, mean: 0.07, sd: 0.04 },
  { id: "mild", label: "Mild NPDR", n: 7, mean: 0.1, sd: 0.04 },
] as const;

/** Bar scale sits at the control-to-mild upper edge, 0.10 + 0.04. */
export const PERMEABILITY_SCALE = 0.14;

export const PERMEABILITY_AGE_MATCHED = [
  { label: "Diabetes, no retinopathy", mean: 0.07, sd: 0.05 },
  { label: "Mild NPDR", mean: 0.11, sd: 0.05 },
] as const;

/**
 * Kurukuti, Manda, and Peli, 2025 erratum.
 * The corrected peak is the value to teach. The other two are the withdrawn ones.
 */
export const BEARING = {
  correctedPeakDeg: 40,
  correctedLowDeg: 34,
  correctedHighDeg: 52,
  withdrawnBodyPeakDeg: 65,
  withdrawnBodyLowDeg: 50,
  withdrawnBodyHighDeg: 80,
  withdrawnFigurePeakDeg: 60,
  withdrawnFigureLowDeg: 55,
  withdrawnFigureHighDeg: 69,
} as const;

export const AO_SECTIONS = [
  {
    id: "evaluation",
    title: "Visual evaluation",
    body: "Correct the eye's aberrations, or put a chosen pattern back, and the test is no longer limited to a small pupil or to interference fringes. Marcos et al. note that people often see better through their own aberration pattern than through someone else's.",
  },
  {
    id: "imaging",
    title: "Retinal imaging",
    body: "The same correction is used to image the retina at higher resolution. The feature issue keeps imaging in its own section.",
  },
  {
    id: "neuro",
    title: "Neurophysiology",
    body: "The third section is adaptive optics used to study retinal physiology, including signals measured more directly than a letter chart allows.",
  },
] as const;

export const MUSEUM_ROLES = [
  {
    role: "Ophthalmologist",
    scope: "A medical doctor who specializes in eyes.",
  },
  {
    role: "Optometrist",
    scope: "Primary eye care. The degree is OD, from a program outside medical school. The article says optometrists diagnose and help treat glaucoma, macular degeneration, and cataract.",
  },
  {
    role: "Optician",
    scope: "Fits a vision-correction device. Does not diagnose or prescribe.",
  },
] as const;

export const EXAM_PASS = 50;

export type ExamModel = "GPT-3.5" | "GPT-4" | "o1";

export type ExamRow = {
  model: ExamModel;
  median: string;
  iqr: string;
  min: string;
  max: string;
  abovePass: boolean;
};

export type ExamQuestion = {
  id: string;
  label: string;
  rows: readonly ExamRow[];
};

/** Table 3 medians from Yoshioka et al. Stars in the paper become abovePass. */
export const EXAM_QUESTIONS: readonly ExamQuestion[] = [
  {
    id: "d1",
    label: "Dispensing",
    rows: [
      { model: "GPT-3.5", median: "65", iqr: "15.0", min: "45", max: "85", abovePass: true },
      { model: "GPT-4", median: "77.5", iqr: "12.5", min: "60", max: "80", abovePass: true },
      { model: "o1", median: "100", iqr: "2.50", min: "90", max: "100", abovePass: true },
    ],
  },
  {
    id: "c1",
    label: "Clinical communication",
    rows: [
      { model: "GPT-3.5", median: "35.7", iqr: "3.57", min: "35.7", max: "50", abovePass: false },
      { model: "GPT-4", median: "69.6", iqr: "10.71", min: "50", max: "71.4", abovePass: false },
      { model: "o1", median: "86.7", iqr: "8.33", min: "80", max: "93.3", abovePass: true },
    ],
  },
  {
    id: "b1",
    label: "Binocular vision",
    rows: [
      { model: "GPT-3.5", median: "67.3", iqr: "9.13", min: "56.3", max: "70", abovePass: true },
      { model: "GPT-4", median: "72.9", iqr: "5.92", min: "59.8", max: "74.8", abovePass: true },
      { model: "o1", median: "85.3", iqr: "6.43", min: "81.2", max: "93.6", abovePass: true },
    ],
  },
  {
    id: "p1",
    label: "Pathology imaging",
    rows: [
      { model: "GPT-3.5", median: "57.1", iqr: "16.1", min: "28.6", max: "71.4", abovePass: false },
      { model: "GPT-4", median: "57.1", iqr: "21.4", min: "42.9", max: "71.4", abovePass: false },
      { model: "o1", median: "89.3", iqr: "28.6", min: "71.4", max: "100", abovePass: true },
    ],
  },
  {
    id: "p2",
    label: "Pathology diagnosis",
    rows: [
      { model: "GPT-3.5", median: "58.8", iqr: "15.0", min: "45.9", max: "63.5", abovePass: false },
      { model: "GPT-4", median: "75.3", iqr: "5.88", min: "72.9", max: "82.4", abovePass: true },
      { model: "o1", median: "89.4", iqr: "6.77", min: "83.5", max: "92.9", abovePass: true },
    ],
  },
];

export const EXAM_AGGREGATE = [
  { model: "GPT-3.5" as const, median: "57.65", iqrLow: "45.44", iqrHigh: "66.05" },
  { model: "GPT-4" as const, median: "71.43", iqrLow: "59.16", iqrHigh: "75.07" },
  { model: "o1" as const, median: "89.41", iqrLow: "85.46", iqrHigh: "95.19" },
];

export function examRowInRange(row: ExamRow): boolean {
  const median = Number(row.median);
  return median >= Number(row.min) && median <= Number(row.max);
}

export const IRIS_SETS = [
  {
    id: "iitd",
    name: "IITD",
    source: "2240 images, 244 subjects",
    selected: 229,
    train: 6183,
    psnr: "22.201",
    fid: "28.229",
    eer: "0.038%",
    tar: "99.330%",
  },
  {
    id: "ca4i",
    name: "CASIA V4 Interval",
    source: "2639 images, 249 subjects",
    selected: 367,
    train: 9909,
    psnr: "21.857",
    fid: "16.313",
    eer: "1.422%",
    tar: "96.194%",
  },
  {
    id: "nd",
    name: "ND-IRIS-0405 subset",
    source: "10080 images from 288 categories; the parent set is 64980 images, 356 subjects",
    selected: 2480,
    train: 14880,
    psnr: "24.402",
    fid: "42.635",
    eer: "0.561%",
    tar: "95.174%",
  },
] as const;

export type StudyDrill = {
  id: string;
  title: string;
  prompt: string;
  choices: readonly string[];
  answerIndex: number;
  explain: string;
};

/** One question per paper. The long tables stay in the constants above. */
export const STUDY_DRILLS: readonly StudyDrill[] = [
  {
    id: "strain",
    title: "Digital eye strain",
    prompt: "Pucker et al. A CVS-Q total of 19 is which band?",
    choices: ["Under 6", "Mild", "Moderate", "Severe"],
    answerIndex: 3,
    explain: "Severe is 19–23. The review puts digital eye strain at 6 or higher.",
  },
  {
    id: "permeability",
    title: "Retinal permeability",
    prompt: "Vavrek et al. Which group had the highest extraction fraction?",
    choices: [
      "Healthy controls, 0.04",
      "Diabetes, no retinopathy, 0.07",
      "Mild NPDR, 0.10",
    ],
    answerIndex: 2,
    explain: "Mild NPDR was 0.10 ± 0.04 (n = 7). The groups differed, P = 0.003.",
  },
  {
    id: "bearing",
    title: "Peripheral field",
    prompt: "Kurukuti, Manda, and Peli. Which peak bearing does the 2025 erratum say to use?",
    choices: ["40°", "60°", "65°"],
    answerIndex: 0,
    explain:
      "Corrected peak 40° (34–52°). 65° is the withdrawn text peak. 60° is the withdrawn figure peak.",
  },
  {
    id: "optics",
    title: "Adaptive optics",
    prompt: "Marcos et al. What is the retinal-imaging use of adaptive optics?",
    choices: ["A smaller letter chart", "Sharper retinal images", "A new glasses prescription"],
    answerIndex: 1,
    explain:
      "The same correction used for vision tests is used to image the retina at higher resolution.",
  },
  {
    id: "museum",
    title: "Museum of Vision Science",
    prompt: "Griffith. Who fits a vision-correction device and does not diagnose?",
    choices: ["Ophthalmologist", "Optometrist", "Optician"],
    answerIndex: 2,
    explain:
      "The Museum of Vision Science is at the University of Waterloo School of Optometry and Vision Science.",
  },
  {
    id: "exam",
    title: "Exam questions",
    prompt: "Yoshioka et al. Which model has the aggregated median 89.41?",
    choices: ["GPT-3.5", "GPT-4", "o1"],
    answerIndex: 2,
    explain: "GPT-3.5 is 57.65 and GPT-4 is 71.43. The pass mark in the paper is 50%.",
  },
  {
    id: "iris",
    title: "Iris texture repair",
    prompt: "Chen et al. What loss does the fine stage of TSDRA-GAN use?",
    choices: ["L1 against the intact image", "WGAN-GP", "No loss"],
    answerIndex: 1,
    explain:
      "The coarse stage uses L1. IITD inpainted PSNR is 22.201. An iris is not filled on this desk.",
  },
];

export function scoreStudyDrill(drill: StudyDrill, choice: number): boolean {
  return choice === drill.answerIndex;
}

export const IRIS_STAGES = [
  {
    id: "coarse",
    title: "Coarse",
    body: "Four encoder layers. Each layer is two 3×3 convolution, batch-norm, leaky-ReLU blocks, then max pooling. Skip links are plain concatenations. The loss against the intact image is L1.",
  },
  {
    id: "fine",
    title: "Fine",
    body: "Five encoder layers. The first is one convolution block and max pooling. The next four are a modified residual block and max pooling. Skip links are the dual-attention computing connection. The loss is WGAN-GP, with smoothing constant 1e-8 in the gradient penalty.",
  },
  {
    id: "discriminator",
    title: "Discriminator",
    body: "Six stride-2 layers, 5×5 kernels, leaky ReLU, and no batch norm. The last layer is 3×3, leaky ReLU, average pooling, then a linear layer. Weights use He initialization.",
  },
] as const;
