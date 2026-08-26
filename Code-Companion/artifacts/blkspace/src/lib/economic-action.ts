/**
 * Shared optimistic economic action: mutate UI first, persist locally,
 * settle in the background, roll back on failure.
 */
export type EconomicPhase =
  | "idle"
  | "submitting"
  | "optimistic"
  | "settling"
  | "settled"
  | "failed";

export interface EconomicActionOpts<T> {
  applyOptimistic: () => T;
  persist: () => void | Promise<void>;
  settle: () => void | Promise<void>;
  rollback: () => void | Promise<void>;
}

export async function runEconomicAction<T>(
  opts: EconomicActionOpts<T>,
): Promise<T> {
  const snapshot = opts.applyOptimistic();
  try {
    await opts.persist();
  } catch (err) {
    await opts.rollback();
    throw err;
  }

  try {
    await opts.settle();
  } catch (err) {
    await opts.rollback();
    throw err;
  }

  return snapshot;
}

export function newEconomicId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
