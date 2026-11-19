/**
 * One ClinYard desk for the eye studies in er1cbrown/BiostatsPython
 * plus the schematic-eye lab that already runs in this browser.
 * The notebooks stay on a GPU host. This file does not load their weights.
 */
import {
  gradeFromNearest,
  quadraticWeightedKappa,
} from "@/lib/clinyard/grade-round";
import { referralGroup, type StudyGrade } from "@/lib/clinyard/vision-lab";

export { gradeFromNearest, quadraticWeightedKappa };

export const BIOSTATS_REPO = "https://github.com/er1cbrown/BiostatsPython";

/** Initial cut points from the APTOS starter's OptimizedRounder. */
export const STARTER_THRESHOLDS = [0.5, 1.5, 2.5, 3.5] as const;

/**
 * The PyTorch notebook's ImageFolder order.
 * Class 0 is DR and class 1 is No DR. That is the reverse of APTOS,
 * where 0 is No DR.
 */
export const PYTORCH_BINARY = [
  { classIndex: 0, label: "DR" },
  { classIndex: 1, label: "No_DR" },
] as const;

export type EyeWhere = "browser" | "gpu";

export interface EyeStudy {
  id: string;
  title: string;
  file: string | null;
  dataset: string;
  model: string;
  metric: string;
  where: EyeWhere;
  science: string;
}

export const EYE_STUDIES: readonly EyeStudy[] = [
  {
    id: "aptos-starter",
    title: "APTOS starter",
    file: "Intro_APTOS_Diabetic_Retinopathy_(EDA_&_Starter).ipynb",
    dataset: "APTOS 2019 train.csv, diagnosis 0–4",
    model: "ResNet-50 regression, then rounded grades",
    metric: "Quadratic weighted kappa",
    where: "gpu",
    science:
      "APTOS is small and heavy on grade 0. A continuous score is cut at 0.5, 1.5, 2.5, and 3.5, then those cuts can be tuned. Test-time flips are averaged before the cut.",
  },
  {
    id: "aptos-eyepacs-eda",
    title: "APTOS and EyePACS look",
    file: "Diabetic_Retinopathy_EDA_APTOS_+_EyePACS.ipynb",
    dataset: "APTOS 2019 and resized EyePACS 2015",
    model: "No network. Counts, crop, and a grouped split.",
    metric: "Quadratic weighted kappa, left empty until a second column exists",
    where: "gpu",
    science:
      "Grade 0 is about half of APTOS and about three quarters of EyePACS. Crop the black border, resize every file to one size, and keep both eyes of a patient, plus near-duplicate photos, on the same side of a split.",
  },
  {
    id: "resnet50-referable",
    title: "Referable or not",
    file: "Diabetic_Retinopathy,_ResNet50,_Binary,_Cropped.ipynb",
    dataset: "EyePACS images cropped to the retinal circle",
    model: "ResNet-50, last layers then the whole net",
    metric: "Accuracy, AUROC, sensitivity, specificity",
    where: "gpu",
    science:
      "Grades 2, 3, and 4 are the referable side. Grade 0 and grade 1 stay on the other side. The circle crop throws away black border before the 512 pixel resize.",
  },
  {
    id: "efficientnet-five",
    title: "Five-class EfficientNet",
    file: "Diabetic_Retinopathy_Detection_Using_Deep_Learning.ipynb",
    dataset: "Gaussian-filtered 224 pixel folders",
    model: "EfficientNet-B3, ImageNet weights, softmax",
    metric: "Accuracy",
    where: "gpu",
    science:
      "Each folder name is one of the five grades. The split is by image, 80 percent train. Accuracy is the score this notebook prints. It does not compute kappa.",
  },
  {
    id: "efficientnet-b5",
    title: "EfficientNet-B5 regression",
    file: "EfficientNetB5_with_Keras_(APTOS_2019).ipynb",
    dataset: "APTOS 2019, cropped and Ben Graham, 456 pixels",
    model: "EfficientNet-B5, group norm, one linear output",
    metric: "Mean squared error, then quadratic weighted kappa",
    where: "gpu",
    science:
      "The gray border is cropped, then local contrast is boosted. The net predicts one number. That number is rounded to the nearest grade from 0 to 4, with a half rounded to the even grade, and kappa is computed on the rounded grades. Fifteen percent of the images are the validation split.",
  },
  {
    id: "pytorch-binary",
    title: "PyTorch yes or no",
    file: "Diagnosis_of_Diabetic_Retinopathy_By_PyTorch.ipynb",
    dataset: "Folder split labeled DR and No DR",
    model: "Four convolution layers, trained from scratch",
    metric: "Classification report on two classes",
    where: "gpu",
    science:
      "Class 0 means DR and class 1 means no DR. That pairing is the reverse of the APTOS column, where 0 means no DR. Do not mix the two indexes.",
  },
  {
    id: "schematic-eye",
    title: "Schematic eye",
    file: null,
    dataset: "Five original teaching drawings",
    model: "Vergence. No downloaded weights.",
    metric: "Diopter, then the study-key grade beside it",
    where: "browser",
    science:
      "Eye length and lens power set the diopter. The grade does not enter that equation. A teaching lens can clear the focus blur and still leave retinal haze.",
  },
];

export function eyeStudyHref(file: string): string {
  return `${BIOSTATS_REPO}/blob/main/${encodeURIComponent(file)}`;
}

export function eyeStudyById(id: string): EyeStudy {
  const study = EYE_STUDIES.find((item) => item.id === id);
  if (!study) throw new Error(`Unknown eye study: ${id}`);
  return study;
}

/** Same referral cut as the cropped ResNet notebook: grade above 1. */
export function isReferable(grade: number): boolean {
  return referralGroup(grade) === "Referable";
}

/** Map a regression score onto grades 0–4 the way the APTOS starter does. */
export function gradeFromRegression(
  score: number,
  coef: readonly number[] = STARTER_THRESHOLDS,
): StudyGrade {
  if (!Number.isFinite(score)) throw new Error("score must be finite");
  if (coef.length !== 4) throw new Error("four cut points");
  if (score < coef[0]) return 0;
  if (score < coef[1]) return 1;
  if (score < coef[2]) return 2;
  if (score < coef[3]) return 3;
  return 4;
}

export function pytorchBinaryLabel(classIndex: number): string {
  const row = PYTORCH_BINARY.find((item) => item.classIndex === classIndex);
  if (!row) throw new Error("PyTorch class index must be 0 or 1");
  return row.label;
}


