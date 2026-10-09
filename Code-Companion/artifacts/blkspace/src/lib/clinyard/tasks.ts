/**
 * Yard-safe ClinYard drills. Original teaching items.
 * Skill types follow ClinFusion (Apache-2.0). The model weights are not used.
 */

export type DrillMode = "mcq" | "image_vqa" | "instruction" | "report";
export type DrillOrgan = "chest" | "heart";

export interface DrillItem {
  id: string;
  mode: DrillMode;
  organ: DrillOrgan;
  hardness: "intro";
  prompt: string;
  imageAsset?: string;
  choices?: string[];
  answerIndex?: number;
  /** Required tap order for instruction drills. */
  steps?: string[];
  /** Phrases a report must contain, compared case-insensitively. */
  requiredPhrases?: string[];
  modelAnswer: string;
}

export const DRILL_MODES: { id: DrillMode | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mcq", label: "Question" },
  { id: "image_vqa", label: "Picture" },
  { id: "instruction", label: "Instructions" },
  { id: "report", label: "Report" },
];

export const CLINYARD_ITEMS: DrillItem[] = [
  {
    id: "chest-pressure",
    mode: "mcq",
    organ: "heart",
    hardness: "intro",
    prompt:
      "Teaching vignette, not a real patient. Pressure under the breastbone spreads to the left arm, and the person is sweating. What is the first concern?",
    choices: [
      "Heart muscle not getting enough blood",
      "A sore muscle from lifting",
      "Hunger only",
      "A sprained wrist",
    ],
    answerIndex: 0,
    modelAnswer:
      "Pressure that spreads to the arm, plus sweating, is treated as a heart emergency until a clinician says otherwise. Call emergency services. This drill does not diagnose anyone.",
  },
  {
    id: "costophrenic",
    mode: "image_vqa",
    organ: "chest",
    hardness: "intro",
    prompt:
      "On this made-up chest drawing, which letter marks the costophrenic angle, the sharp lower outer corner where the lung meets the diaphragm?",
    imageAsset: "/images/clinyard/costophrenic.svg",
    choices: ["A", "B"],
    answerIndex: 0,
    modelAnswer:
      "A sits at the lower outer corner. B sits over the middle, where the heart shadow would be. Fluid in the chest often blunts the corner marked A.",
  },
  {
    id: "sbar-order",
    mode: "instruction",
    organ: "chest",
    hardness: "intro",
    prompt:
      "A handoff asks for exactly four lines, in this order. Tap them in the order the instruction requires.",
    steps: ["Situation", "Background", "Assessment", "Recommendation"],
    modelAnswer:
      "Situation, then Background, then Assessment, then Recommendation. The order is the instruction. Clinical detail comes after the format is right.",
  },
  {
    id: "normal-film-line",
    mode: "report",
    organ: "chest",
    hardness: "intro",
    prompt:
      "Write one sentence about a made-up normal film. Include the word heart and the word effusion.",
    requiredPhrases: ["heart", "effusion"],
    modelAnswer: "The heart size is normal and there is no pleural effusion.",
  },
];

export function filterDrills(
  items: DrillItem[],
  mode: DrillMode | "all",
): DrillItem[] {
  if (mode === "all") return items;
  return items.filter((item) => item.mode === mode);
}

export function scoreChoice(item: DrillItem, choice: number): boolean {
  return item.answerIndex === choice;
}

export function scoreSteps(item: DrillItem, picked: string[]): boolean {
  const expected = item.steps ?? [];
  if (picked.length !== expected.length) return false;
  return expected.every((step, index) => picked[index] === step);
}

export function scoreReport(item: DrillItem, text: string): boolean {
  const haystack = text.toLowerCase();
  const phrases = item.requiredPhrases ?? [];
  return (
    phrases.length > 0 &&
    phrases.every((phrase) => haystack.includes(phrase.toLowerCase()))
  );
}
