/** Town / yard options — backed by full HBCU catalog (no yard-themes import). */

import {
  FEATURED_YARD_IDS,
  HBCU_CATALOG,
  getHbcu,
  type HbcuInstitution,
} from "@/lib/hbcu-catalog";

export interface TownOption {
  id: string;
  label: string;
  school: string;
  state?: string;
  control?: "public" | "private";
}

/** Featured towns for quick selects; full list via allTownOptions(). */
export const TOWN_OPTIONS: TownOption[] = FEATURED_YARD_IDS.map((id) => {
  const h = getHbcu(id)!;
  return {
    id: h.id,
    label: h.yardLabel,
    school: h.school,
    state: h.state,
    control: h.control,
  };
});

export function allTownOptions(): TownOption[] {
  return HBCU_CATALOG.map((h) => ({
    id: h.id,
    label: h.yardLabel,
    school: h.school,
    state: h.state,
    control: h.control,
  }));
}

const GRADIENT_PAIRS = [
  "from-blue-600 to-blue-800",
  "from-red-600 to-red-800",
  "from-green-600 to-green-800",
  "from-orange-500 to-orange-700",
  "from-purple-600 to-purple-800",
  "from-teal-600 to-cyan-800",
  "from-rose-600 to-rose-800",
  "from-amber-600 to-amber-800",
  "from-indigo-600 to-indigo-800",
  "from-emerald-600 to-emerald-800",
] as const;

const FEATURED_GRADIENTS: Record<string, string> = {
  tsu: "from-blue-600 to-blue-800",
  howard: "from-red-600 to-red-800",
  spelman: "from-green-600 to-green-800",
  famu: "from-orange-500 to-orange-700",
  morehouse: "from-purple-600 to-purple-800",
  meharry: "from-teal-600 to-cyan-800",
  ncat: "from-blue-700 to-amber-500",
  hampton: "from-blue-800 to-slate-400",
  tuskegee: "from-amber-600 to-red-800",
  jsu: "from-blue-700 to-blue-950",
  grambling: "from-zinc-900 to-amber-600",
  pvamu: "from-purple-700 to-amber-500",
};

function gradientForId(id: string): string {
  if (FEATURED_GRADIENTS[id]) return FEATURED_GRADIENTS[id];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENT_PAIRS[h % GRADIENT_PAIRS.length];
}

/** Lazy map — built on first access so module load stays light. */
let _gradients: Record<string, string> | null = null;
function gradients(): Record<string, string> {
  if (!_gradients) {
    _gradients = Object.fromEntries(
      HBCU_CATALOG.map((h) => [h.id, gradientForId(h.id)]),
    );
  }
  return _gradients;
}

export const TOWN_GRADIENTS: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(_t, prop: string) {
      return gradients()[prop];
    },
    ownKeys() {
      return Object.keys(gradients());
    },
    getOwnPropertyDescriptor(_t, prop) {
      const v = gradients()[prop as string];
      if (v === undefined) return undefined;
      return { configurable: true, enumerable: true, value: v };
    },
  },
);

export function townLabel(id: string): string {
  const h = getHbcu(id);
  if (h) return h.yardLabel;
  const t = TOWN_OPTIONS.find((x) => x.id === id);
  return t?.label ?? `${id.toUpperCase()} Yard`;
}

export function townGradient(id: string): string {
  return gradients()[id] ?? gradientForId(id) ?? "from-primary to-primary/70";
}

export function townSchool(id: string): string {
  return (
    getHbcu(id)?.school ?? TOWN_OPTIONS.find((t) => t.id === id)?.school ?? id
  );
}

export function findTown(id: string): TownOption | HbcuInstitution | null {
  return getHbcu(id) ?? TOWN_OPTIONS.find((t) => t.id === id) ?? null;
}
