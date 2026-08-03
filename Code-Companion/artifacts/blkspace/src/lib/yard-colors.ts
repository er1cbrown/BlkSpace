/** Shared yard accent colors — kept free of other lib imports to avoid cycles. */

/** Deterministic primary HSL for any yard id (accent=yard / theme packs). */
export function yardAccentHsl(yardId: string): string {
  const palette = [
    "210 80% 48%", // blue
    "0 72% 48%", // red
    "145 55% 38%", // green
    "24 90% 50%", // orange
    "270 55% 48%", // purple
    "175 55% 38%", // teal
    "330 55% 48%", // pink
    "45 85% 45%", // gold
    "200 70% 42%", // cyan-blue
    "15 75% 45%", // terracotta
  ];
  let h = 0;
  for (let i = 0; i < yardId.length; i++) {
    h = (h * 31 + yardId.charCodeAt(i)) >>> 0;
  }
  return palette[h % palette.length];
}
