/** Sellable MyYard themes and Yard Sale item metadata. */

import { YARD_THEME_PACKS, type YardId } from "@/lib/yard-themes";

export type ProfileThemeId = "classic" | "pro" | "vibrant" | "myspace";

export const MYARD_PROFILE_THEMES: {
  id: ProfileThemeId;
  label: string;
  itemRef: string;
}[] = [
  { id: "classic", label: "Classic HBCU", itemRef: "theme:classic" },
  { id: "pro", label: "Professional Discord", itemRef: "theme:pro" },
  { id: "vibrant", label: "Vibrant Yard", itemRef: "theme:vibrant" },
  { id: "myspace", label: "MyYard Classic", itemRef: "theme:myyard" },
];

export const YARD_PACK_THEMES = (Object.keys(YARD_THEME_PACKS) as YardId[]).map(
  (id) => ({
    id,
    label: `${YARD_THEME_PACKS[id].name} Pack`,
    itemRef: `theme:yard:${id}`,
    description: YARD_THEME_PACKS[id].tagline,
  }),
);

export const YARD_SALE_ITEM_TYPES = [
  { value: "media", label: "Media (photo/video/audio)" },
  { value: "mix", label: "DJ Mix (metadata + kind 30078)" },
  { value: "theme", label: "Theme pack (MyYard or campus)" },
  { value: "logos-deck", label: "Logos Deck set (scripture mix)" },
  { value: "service", label: "Service" },
  { value: "ticket", label: "Event ticket" },
] as const;

export function itemTypeLabel(itemType: string): string {
  const found = YARD_SALE_ITEM_TYPES.find((t) => t.value === itemType);
  if (found) return found.label.split(" (")[0];
  return itemType;
}

export function themeLabelFromRef(itemRef: string | null | undefined): string | null {
  if (!itemRef?.startsWith("theme:")) return null;
  const profile = MYARD_PROFILE_THEMES.find((t) => t.itemRef === itemRef);
  if (profile) return profile.label;
  const yard = YARD_PACK_THEMES.find((t) => t.itemRef === itemRef);
  if (yard) return yard.label;
  return itemRef.replace("theme:", "");
}