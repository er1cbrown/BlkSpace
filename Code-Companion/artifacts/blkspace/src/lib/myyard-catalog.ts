/** Sellable MyYard themes and Yard Sale item metadata. */

import { FEATURED_YARD_IDS } from "@/lib/hbcu-catalog";
import { YARD_THEME_PACKS } from "@/lib/yard-themes";

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

/** Featured campus packs for Yard Sale (full catalog via getYardTheme). */
export const YARD_PACK_THEMES = FEATURED_YARD_IDS.map((id) => {
  const pack = YARD_THEME_PACKS[id] ?? {
    name: id,
    tagline: "Campus pack",
  };
  return {
    id,
    label: `${pack.name} Pack`,
    itemRef: `theme:yard:${id}`,
    description: pack.tagline,
  };
});

export const YARD_SALE_ITEM_TYPES = [
  { value: "media", label: "Media (photo/video/audio)" },
  { value: "mix", label: "DJ Mix (metadata + kind 30078)" },
  { value: "theme", label: "Theme pack (MyYard or campus)" },
  { value: "logos-deck", label: "Logos Deck set (scripture mix)" },
  { value: "service", label: "Service" },
  { value: "ticket", label: "Event ticket" },
  { value: "art", label: "Art (digital illustration)" },
  { value: "mockup", label: "Mockup (apparel / print)" },
  { value: "blueprint", label: "Blueprint / tech pack" },
  { value: "merch-digital", label: "Merch digital (stickers, assets)" },
  { value: "fashion", label: "Fashion drop (capsule / look)" },
] as const;

/** Fashion / digital goods default to 2-party escrow (pay → deliver → release). */
export const ESCROW_DEFAULT_TYPES = [
  "art",
  "mockup",
  "blueprint",
  "merch-digital",
  "fashion",
] as const;

export function isEscrowDefaultType(itemType: string): boolean {
  return (ESCROW_DEFAULT_TYPES as readonly string[]).includes(itemType);
}

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