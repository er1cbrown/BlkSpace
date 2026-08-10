/**
 * Yard spirit — swag layers + limited cosmetics (Habbo/MySpace energy, not Roblox 3D).
 * Soft WB unlocks; no mainnet, no client AI.
 */

import { grantWebWb, getWbDelta } from "@/lib/web-userspace";
import { getCurrentHandle } from "@/lib/auth";
import type { MyYardAesthetic } from "@/lib/myyard-layout";
import { DEFAULT_AESTHETIC } from "@/lib/myyard-layout";

export type SpiritLayer =
  | "individual"
  | "community"
  | "university"
  | "league";

export type SpiritCosmeticKind = "badge" | "frame" | "myyard_preset";

export interface SpiritCosmetic {
  id: string;
  name: string;
  blurb: string;
  kind: SpiritCosmeticKind;
  layer: SpiritLayer;
  priceWb: number;
  /** ISO end of limited window; null = always */
  limitedUntil: string | null;
  /** Applied when kind is myyard_preset */
  aestheticPatch?: Partial<MyYardAesthetic>;
  /** Badge / frame label shown on profile */
  label?: string;
}

export type SwagTag = "individual" | "community" | "university" | "league";

export const SWAG_TAGS: { id: SwagTag; label: string; blurb: string }[] = [
  {
    id: "individual",
    label: "Individual",
    blurb: "Personal pins, stickers, creator merch",
  },
  {
    id: "community",
    label: "Community / club",
    blurb: "Chess Club Inc., chapter drops",
  },
  {
    id: "university",
    label: "University / yard",
    blurb: "School-colored spirit goods",
  },
  {
    id: "league",
    label: "League / event",
    blurb: "Tournament limiteds, HBCU Open",
  },
];

const INV_KEY = "blkspace_spirit_inventory_v1";
const EQUIP_KEY = "blkspace_spirit_equipped_v1";

function daysFromNow(d: number): string {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString();
}

/** Catalog — limited + evergreen spirit cosmetics */
export const SPIRIT_CATALOG: SpiritCosmetic[] = [
  {
    id: "badge_chess_club",
    name: "Chess Club pin",
    blurb: "Show you ride for Chess Club Inc.",
    kind: "badge",
    layer: "community",
    priceWb: 15,
    limitedUntil: null,
    label: "♟ Chess Club",
  },
  {
    id: "badge_hbcu_open_2026",
    name: "HBCU Chess Open · Entrant",
    blurb: "Limited league badge for the first annual virtual open.",
    kind: "badge",
    layer: "league",
    priceWb: 0,
    limitedUntil: daysFromNow(90),
    label: "🏆 HBCU Open",
  },
  {
    id: "frame_gold_yard",
    name: "Gold yard frame",
    blurb: "University spirit frame around your avatar.",
    kind: "frame",
    layer: "university",
    priceWb: 40,
    limitedUntil: null,
    label: "Gold frame",
  },
  {
    id: "preset_night_tournament",
    name: "Tournament Night MyYard",
    blurb: "Limited-time dark neon look for match week.",
    kind: "myyard_preset",
    layer: "league",
    priceWb: 25,
    limitedUntil: daysFromNow(45),
    aestheticPatch: {
      bannerMode: "gradient",
      bannerGradientId: "neon",
      accent: "#22d3ee",
      bgPattern: "grid",
      mood: "In the zone · HBCU Open",
    },
  },
  {
    id: "preset_gold_black",
    name: "Gold & black spirit",
    blurb: "Classic university energy on your MyYard.",
    kind: "myyard_preset",
    layer: "university",
    priceWb: 20,
    limitedUntil: null,
    aestheticPatch: {
      bannerMode: "gradient",
      bannerGradientId: "gold",
      accent: "#fbbf24",
      bgPattern: "stars",
    },
  },
  {
    id: "badge_yard_newgrounds",
    name: "Yard Newgrounds",
    blurb: "Homebrew / Arcade creator spirit pin.",
    kind: "badge",
    layer: "individual",
    priceWb: 10,
    limitedUntil: null,
    label: "🎮 Yard Arcade",
  },
  {
    id: "badge_podium_bronze",
    name: "Podium bronze · free avatar pin",
    blurb: "3rd place free spirit item — in-app avatar/badge, not 3D Roblox.",
    kind: "badge",
    layer: "league",
    priceWb: 0,
    limitedUntil: null,
    label: "🥉 Podium",
  },
  {
    id: "badge_yard_day_brawl",
    name: "ProjectB / SBF series pin",
    blurb:
      "ProjectB(XK20)=ProjectBlackSpaceFighters · YDB1/XQ5D/5DXQ. Flash nostalgia trilogy. Original cast. Free.",
    kind: "badge",
    layer: "league",
    priceWb: 0,
    limitedUntil: null,
    label: "⚡ ProjectB · SBF",
  },
  {
    id: "preset_brawl_night",
    name: "SBF series Night MyYard",
    blurb: "Flash-era neon for ProjectBlackSpaceFighters trilogy nights (YDB1→XQ5D→5DXQ).",
    kind: "myyard_preset",
    layer: "league",
    priceWb: 15,
    limitedUntil: null,
    aestheticPatch: {
      bannerMode: "gradient",
      bannerGradientId: "neon",
      accent: "#f97316",
      bgPattern: "stars",
      mood: "ProjectB XK20 · YDB1 · XQ5D · 5DXQ · READY",
    },
  },
  {
    id: "frame_podium",
    name: "Podium frame",
    blurb: "Free or prize frame for tournament finishers.",
    kind: "frame",
    layer: "league",
    priceWb: 0,
    limitedUntil: null,
    label: "Podium frame",
  },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, v: unknown) {
  localStorage.setItem(key, JSON.stringify(v));
  try {
    window.dispatchEvent(new Event("blkspace-spirit"));
  } catch {
    /* ignore */
  }
}

export function listSpiritCatalog(includeExpired = false): SpiritCosmetic[] {
  const now = Date.now();
  return SPIRIT_CATALOG.filter((c) => {
    if (includeExpired || !c.limitedUntil) return true;
    return new Date(c.limitedUntil).getTime() > now;
  });
}

export function getOwnedCosmetics(handle?: string): string[] {
  const h = (handle || getCurrentHandle() || "guest").replace(/^@/, "");
  const all = readJson<Record<string, string[]>>(INV_KEY, {});
  return all[h] || [];
}

export function getEquippedCosmetics(handle?: string): {
  badgeId?: string;
  frameId?: string;
  presetId?: string;
} {
  const h = (handle || getCurrentHandle() || "guest").replace(/^@/, "");
  const all = readJson<
    Record<string, { badgeId?: string; frameId?: string; presetId?: string }>
  >(EQUIP_KEY, {});
  return all[h] || {};
}

export function cosmeticById(id: string): SpiritCosmetic | undefined {
  return SPIRIT_CATALOG.find((c) => c.id === id);
}

/** Soft unlock — free items grant without WB; paid needs web WB delta >= price (demo). */
export function unlockCosmetic(
  cosmeticId: string,
  handle?: string,
): { ok: boolean; error?: string } {
  const c = cosmeticById(cosmeticId);
  if (!c) return { ok: false, error: "Unknown cosmetic" };
  if (c.limitedUntil && new Date(c.limitedUntil).getTime() < Date.now()) {
    return { ok: false, error: "Limited drop ended" };
  }
  const h = (handle || getCurrentHandle() || "guest").replace(/^@/, "");
  const owned = getOwnedCosmetics(h);
  if (owned.includes(cosmeticId)) return { ok: true };

  if (c.priceWb > 0) {
    // Soft check: demo WB is base 50 + delta on web; always allow if free
    // Deduct from delta so spend feels real
    const delta = getWbDelta();
    // Allow purchase if delta + informal base covers price (simple demo)
    if (delta + 50 < c.priceWb) {
      return {
        ok: false,
        error: `Need ~${c.priceWb} WB (soft demo balance too low)`,
      };
    }
    grantWebWb(-c.priceWb, `Spirit unlock: ${c.name}`);
  }

  const all = readJson<Record<string, string[]>>(INV_KEY, {});
  all[h] = [...owned, cosmeticId];
  writeJson(INV_KEY, all);
  return { ok: true };
}

/** Grant free league badge (e.g. after tournament RSVP). */
export function grantLeagueBadge(cosmeticId: string, handle?: string): void {
  const c = cosmeticById(cosmeticId);
  if (!c || c.priceWb > 0) return;
  const h = (handle || getCurrentHandle() || "guest").replace(/^@/, "");
  const owned = getOwnedCosmetics(h);
  if (owned.includes(cosmeticId)) return;
  const all = readJson<Record<string, string[]>>(INV_KEY, {});
  all[h] = [...owned, cosmeticId];
  writeJson(INV_KEY, all);
}

export function equipCosmetic(
  cosmeticId: string,
  handle?: string,
): { ok: boolean; error?: string } {
  const c = cosmeticById(cosmeticId);
  if (!c) return { ok: false, error: "Unknown" };
  const h = (handle || getCurrentHandle() || "guest").replace(/^@/, "");
  if (!getOwnedCosmetics(h).includes(cosmeticId)) {
    return { ok: false, error: "Unlock first" };
  }
  const all = readJson<
    Record<string, { badgeId?: string; frameId?: string; presetId?: string }>
  >(EQUIP_KEY, {});
  const cur = { ...(all[h] || {}) };
  if (c.kind === "badge") cur.badgeId = cosmeticId;
  if (c.kind === "frame") cur.frameId = cosmeticId;
  if (c.kind === "myyard_preset") cur.presetId = cosmeticId;
  all[h] = cur;
  writeJson(EQUIP_KEY, all);
  return { ok: true };
}

export function aestheticFromEquipped(
  handle?: string,
): Partial<MyYardAesthetic> {
  const eq = getEquippedCosmetics(handle);
  if (!eq.presetId) return {};
  const c = cosmeticById(eq.presetId);
  return c?.aestheticPatch || {};
}

export function equippedBadgeLabel(handle?: string): string | null {
  const eq = getEquippedCosmetics(handle);
  if (!eq.badgeId) return null;
  return cosmeticById(eq.badgeId)?.label || null;
}

export function equippedFrameLabel(handle?: string): string | null {
  const eq = getEquippedCosmetics(handle);
  if (!eq.frameId) return null;
  return cosmeticById(eq.frameId)?.label || null;
}

/** Yard Sale listing tag helper */
export function formatSwagTag(tag: SwagTag): string {
  return `[[swag:${tag}]]`;
}

export function parseSwagTag(text: string): SwagTag | null {
  const m = /\[\[swag:(individual|community|university|league)\]\]/i.exec(
    text || "",
  );
  return m ? (m[1].toLowerCase() as SwagTag) : null;
}

export function applyPresetToAesthetic(
  base: MyYardAesthetic,
  presetId: string,
): MyYardAesthetic {
  const c = cosmeticById(presetId);
  if (!c?.aestheticPatch) return base;
  return { ...base, ...c.aestheticPatch };
}

export { DEFAULT_AESTHETIC };
