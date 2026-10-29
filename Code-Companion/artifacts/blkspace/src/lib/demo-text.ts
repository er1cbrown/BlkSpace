/**
 * Template strings were saved with UTF-8 read as Windows-1252.
 * Repair those sequences so a beta card shows plain separators.
 */
const REPLACEMENTS: [string, string][] = [
  [" \u00c2\u00b7 ", " - "],
  ["\u00c2\u00b7", " - "],
  [" \u00e2\u20ac\u201d ", " - "],
  ["\u00e2\u20ac\u201d", " - "],
  [" \u00e2\u20ac\u201c ", " - "],
  ["\u00e2\u20ac\u201c", " - "],
  [" \u00e2\u2020\u2019 ", " -> "],
  ["\u00e2\u2020\u2019", " -> "],
  ["\u00c3\u2014", "x"],
  ["\u00e2\u20ac\u2122", "'"],
  ["\u00e2\u20ac\u00a6", "..."],
  ["\u00e2\u20ac\u0153", '"'],
  ["\u00e2\u20ac\u009d", '"'],
  ["\u00e2\u201d\u20ac", "-"],
];

export function repairTemplateText(value: string): string {
  let out = value;
  for (const [from, to] of REPLACEMENTS) out = out.replaceAll(from, to);
  return out;
}
