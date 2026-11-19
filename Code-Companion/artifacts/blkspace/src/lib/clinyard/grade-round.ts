export type RoundedGrade = 0 | 1 | 2 | 3 | 4;

/**
 * Nearest grade, ties to the even integer, then clipped to 0–4.
 * That is np.rint(score).clip(0, 4) from the EfficientNet-B5 notebook.
 */
export function gradeFromNearest(score: number): RoundedGrade {
  if (!Number.isFinite(score)) throw new Error("score must be finite");
  const down = Math.floor(score);
  const frac = score - down;
  let rounded = down;
  if (frac > 0.5) rounded = down + 1;
  else if (frac === 0.5) rounded = down % 2 === 0 ? down : down + 1;
  if (rounded < 0) return 0;
  if (rounded > 4) return 4;
  return rounded as RoundedGrade;
}

/**
 * Quadratic weighted kappa on integer grades.
 * Identical columns score 1. A zero denominator with leftover error returns null.
 */
export function quadraticWeightedKappa(
  truth: readonly number[],
  pred: readonly number[],
  classes = 5,
): number | null {
  if (truth.length === 0 || truth.length !== pred.length) return null;
  if (classes < 2) return null;
  if (truth.every((value, index) => value === pred[index])) return 1;
  const n = truth.length;
  const histT = Array.from({ length: classes }, () => 0);
  const histP = Array.from({ length: classes }, () => 0);
  const observed = Array.from({ length: classes }, () =>
    Array.from({ length: classes }, () => 0),
  );
  for (let i = 0; i < n; i += 1) {
    const t = truth[i];
    const p = pred[i];
    if (
      !Number.isInteger(t) ||
      !Number.isInteger(p) ||
      t < 0 ||
      p < 0 ||
      t >= classes ||
      p >= classes
    ) {
      return null;
    }
    histT[t] += 1;
    histP[p] += 1;
    observed[t][p] += 1;
  }
  const scale = (classes - 1) ** 2;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < classes; i += 1) {
    for (let j = 0; j < classes; j += 1) {
      const weight = (i - j) ** 2 / scale;
      numerator += weight * observed[i][j];
      denominator += weight * ((histT[i] * histP[j]) / n);
    }
  }
  if (denominator === 0) return numerator === 0 ? 1 : null;
  return 1 - numerator / denominator;
}
