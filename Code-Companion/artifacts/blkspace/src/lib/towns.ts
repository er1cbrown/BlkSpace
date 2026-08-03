/** Town / yard options — backed by full HBCU catalog. */

import {
  FEATURED_YARD_IDS,
  HBCU_CATALOG,
  getHbcu,
  type HbcuInstitution,
} from "@/lib/hbcu-catalog";
import { getYardTheme, yardGradient } from "@/lib/yard-themes";

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

export const TOWN_GRADIENTS: Record<string, string> = Object.fromEntries(
  HBCU_CATALOG.map((h) => [h.id, yardGradient(h.id)]),
);

export function townLabel(id: string): string {
  const h = getHbcu(id);
  if (h) return h.yardLabel;
  const t = TOWN_OPTIONS.find((x) => x.id === id);
  return t?.label ?? `${id.toUpperCase()} Yard`;
}

export function townGradient(id: string): string {
  return TOWN_GRADIENTS[id] ?? getYardTheme(id)?.gradient ?? "from-primary to-primary/70";
}

export function townSchool(id: string): string {
  return getHbcu(id)?.school ?? TOWN_OPTIONS.find((t) => t.id === id)?.school ?? id;
}

export function findTown(id: string): TownOption | HbcuInstitution | null {
  return getHbcu(id) ?? TOWN_OPTIONS.find((t) => t.id === id) ?? null;
}
