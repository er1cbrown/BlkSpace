export const TOWN_OPTIONS = [
  { id: "tsu", label: "TSU Yard", school: "Tennessee State University" },
  { id: "howard", label: "Howard Yard", school: "Howard University" },
  { id: "spelman", label: "Spelman Yard", school: "Spelman College" },
  { id: "famu", label: "FAMU Yard", school: "Florida A&M University" },
  { id: "morehouse", label: "Morehouse Yard", school: "Morehouse College" },
] as const;

export const TOWN_GRADIENTS: Record<string, string> = {
  tsu: "from-blue-600 to-blue-900",
  howard: "from-red-600 to-red-900",
  spelman: "from-green-600 to-green-900",
  famu: "from-orange-500 to-orange-800",
  morehouse: "from-purple-600 to-purple-900",
};

export function townLabel(id: string): string {
  return TOWN_OPTIONS.find((t) => t.id === id)?.label ?? `${id.toUpperCase()} Yard`;
}

export function townGradient(id: string): string {
  return TOWN_GRADIENTS[id] ?? "from-primary to-primary/70";
}