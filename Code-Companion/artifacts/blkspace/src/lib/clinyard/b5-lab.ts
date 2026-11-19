/**
 * EfficientNet-B5 notebook steps that run on a teaching drawing.
 * Crop, Ben Graham, nearest-grade rounding, and kappa.
 * The B5 weights are not loaded. The regression column is a teaching head output.
 */
import {
  gradeFromNearest,
  quadraticWeightedKappa,
  type RoundedGrade,
} from "@/lib/clinyard/grade-round";

export const B5_CROP_TOL = 7;
export const B5_SIGMA = 10;
export const B5_SIZE = 456;
export const B5_FIELD = 32;

export interface RgbImage {
  width: number;
  height: number;
  /** RGB bytes, row-major. */
  data: Uint8Array;
}

/** 4 * pixel - 4 * blur + 128, clipped to a byte. OpenCV addWeighted saturate. */
export function benGrahamByte(value: number, blurred: number): number {
  const mixed = 4 * value - 4 * blurred + 128;
  if (mixed < 0) return 0;
  if (mixed > 255) return 255;
  return Math.round(mixed);
}

function grayAt(image: RgbImage, x: number, y: number): number {
  const i = (y * image.width + x) * 3;
  return 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];
}

/**
 * crop_image_from_gray. Pixels with gray above tol stay.
 * An empty mask returns the original image.
 */
export function cropGray(image: RgbImage, tol = B5_CROP_TOL): RgbImage {
  let top = image.height;
  let bottom = -1;
  let left = image.width;
  let right = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (grayAt(image, x, y) > tol) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom < top || right < left) return image;
  const width = right - left + 1;
  const height = bottom - top + 1;
  const data = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    const src = ((top + y) * image.width + left) * 3;
    data.set(image.data.subarray(src, src + width * 3), y * width * 3);
  }
  return { width, height, data };
}

function gaussianKernel(sigma: number): number[] {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const raw: number[] = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i += 1) {
    const value = Math.exp(-(i * i) / (2 * sigma * sigma));
    raw.push(value);
    sum += value;
  }
  return raw.map((value) => value / sum);
}

function sample(image: RgbImage, x: number, y: number, channel: number): number {
  const xx = Math.min(image.width - 1, Math.max(0, x));
  const yy = Math.min(image.height - 1, Math.max(0, y));
  return image.data[(yy * image.width + xx) * 3 + channel];
}

/** Separable Gaussian, then the notebook's addWeighted contrast step. */
export function benGraham(image: RgbImage, sigma: number): RgbImage {
  const kernel = gaussianKernel(sigma);
  const radius = (kernel.length - 1) / 2;
  const horizontal = new Float32Array(image.width * image.height * 3);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      for (let c = 0; c < 3; c += 1) {
        let acc = 0;
        for (let k = 0; k < kernel.length; k += 1) {
          acc += kernel[k] * sample(image, x + k - radius, y, c);
        }
        horizontal[(y * image.width + x) * 3 + c] = acc;
      }
    }
  }
  const data = new Uint8Array(image.data.length);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      for (let c = 0; c < 3; c += 1) {
        let acc = 0;
        for (let k = 0; k < kernel.length; k += 1) {
          const yy = Math.min(image.height - 1, Math.max(0, y + k - radius));
          acc += kernel[k] * horizontal[(yy * image.width + x) * 3 + c];
        }
        const src = image.data[(y * image.width + x) * 3 + c];
        data[(y * image.width + x) * 3 + c] = benGrahamByte(src, acc);
      }
    }
  }
  return { width: image.width, height: image.height, data };
}

export function meanByte(image: RgbImage): number {
  let sum = 0;
  for (let i = 0; i < image.data.length; i += 1) sum += image.data[i];
  return sum / image.data.length;
}

export interface FieldPlate {
  id: string;
  grade: number;
}

/** Dark ring around an orange disc. Higher grades add red marks inside the disc. */
export function teachingField(plate: FieldPlate, size = B5_FIELD): RgbImage {
  const data = new Uint8Array(size * size * 3);
  const center = (size - 1) / 2;
  const radius = size * 0.34;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 3;
      const dx = x - center;
      const dy = y - center;
      if (dx * dx + dy * dy > radius * radius) {
        data[i] = 2;
        data[i + 1] = 2;
        data[i + 2] = 2;
        continue;
      }
      data[i] = 170;
      data[i + 1] = 64;
      data[i + 2] = 28;
      const mark = (x + y * 3) % 11 === 0 && plate.grade > 0;
      if (mark) {
        data[i] = 220;
        data[i + 1] = 20;
        data[i + 2] = 20;
      }
    }
  }
  return { width: size, height: size, data };
}

/**
 * Teaching linear-head outputs for the eight drawings.
 * Not a forward pass of EfficientNet-B5.
 * plate-b is 0.5 so the half rounds to the even grade 0, off the study key 1.
 */
export const B5_TEACHING_SCORE: Record<string, number> = {
  "plate-a": 0.2,
  "plate-b": 0.5,
  "plate-c": 2.2,
  "plate-d": 0.1,
  "plate-e": 3.6,
  "plate-f": 3.1,
  "plate-g": 1.2,
  "plate-h": 1.5,
};

export interface B5Plate {
  cropTol: number;
  sigma: number;
  notebookSize: number;
  field: number;
  cropped: boolean;
  meanBefore: number;
  meanAfter: number;
  regression: number;
  rounded: RoundedGrade;
}

export function b5OnPlate(plate: FieldPlate): B5Plate {
  const field = teachingField(plate);
  const cropped = cropGray(field, B5_CROP_TOL);
  const sigma = (B5_SIGMA * cropped.width) / B5_SIZE;
  const graded = benGraham(cropped, Math.max(sigma, 0.4));
  const regression = B5_TEACHING_SCORE[plate.id];
  if (regression === undefined) throw new Error(`No B5 teaching score for ${plate.id}`);
  return {
    cropTol: B5_CROP_TOL,
    sigma: B5_SIGMA,
    notebookSize: B5_SIZE,
    field: B5_FIELD,
    cropped: cropped.width < field.width || cropped.height < field.height,
    meanBefore: round1(meanByte(cropped)),
    meanAfter: round1(meanByte(graded)),
    regression,
    rounded: gradeFromNearest(regression),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function b5Kappa(
  rows: { diagnosis: number; rounded: number }[],
): number | null {
  return quadraticWeightedKappa(
    rows.map((row) => row.diagnosis),
    rows.map((row) => row.rounded),
  );
}
