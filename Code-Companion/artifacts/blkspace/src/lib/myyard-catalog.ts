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
  { value: "mix", label: "Mix" },
  { value: "logos-deck", label: "Logos Deck" },
  { value: "theme", label: "Yard theme" },
  { value: "media", label: "Photo or audio" },
  { value: "service", label: "Service" },
  { value: "ticket", label: "Ticket" },
  { value: "art", label: "Art" },
  { value: "mockup", label: "Mockup" },
  { value: "blueprint", label: "Tech pack" },
  { value: "merch-digital", label: "Digital merch" },
  { value: "fashion", label: "Fashion" },
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

export type ShopShelf = "now" | "order";

/** Instant digital goods sit on the ready-now shelf. Escrow stays made-to-order. */
export function shopShelf(item: {
  itemType: string;
  fulfillmentMode?: string | null;
}): ShopShelf {
  if (item.fulfillmentMode === "escrow") return "order";
  if (item.fulfillmentMode === "instant") return "now";
  return isEscrowDefaultType(item.itemType) ? "order" : "now";
}

export function sortShopListings<
  T extends {
    itemType: string;
    fulfillmentMode?: string | null;
    price: number;
  },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const shelf =
      Number(shopShelf(a) === "order") - Number(shopShelf(b) === "order");
    if (shelf !== 0) return shelf;
    return a.price - b.price;
  });
}

export function shopBuyerLine(item: {
  itemType: string;
  fulfillmentMode?: string | null;
}): string {
  if (shopShelf(item) === "order") {
    return "You pay, they deliver, then you release.";
  }
  if (item.itemType === "mix" || item.itemType === "logos-deck") {
    return "You get the set right away.";
  }
  if (item.itemType === "theme") return "It applies to your yard right away.";
  return "You get it right away.";
}

export function themeLabelFromRef(
  itemRef: string | null | undefined,
): string | null {
  if (!itemRef?.startsWith("theme:")) return null;
  const profile = MYARD_PROFILE_THEMES.find((t) => t.itemRef === itemRef);
  if (profile) return profile.label;
  const yard = YARD_PACK_THEMES.find((t) => t.itemRef === itemRef);
  if (yard) return yard.label;
  return itemRef.replace("theme:", "");
}
