/**
 * Campus Yard theme packs — every school in the catalog gets a yard skin.
 * Featured schools keep hand-tuned gradients/norms; others are generated.
 */

import {
  ALL_YARD_CATALOG,
  FEATURED_YARD_IDS,
  getHbcu,
  hbcuLocation,
  yardKind,
  type FeaturedYardId,
} from "@/lib/hbcu-catalog";
import { yardAccentHsl } from "@/lib/yard-colors";

/** Featured yard ids (re-export for pages; prefer FEATURED_YARD_IDS from catalog). */
export { FEATURED_YARD_IDS };
export const FEATURED_YARD_THEME_IDS: string[] = [...FEATURED_YARD_IDS];

export type YardId = string;

export interface YardThemePack {
  id: string;
  name: string;
  school: string;
  location: string;
  mascot: string;
  gradient: string;
  accentClass: string;
  cardBorderClass: string;
  tagline: string;
  norms: string[];
  weatherHint: string;
  fanbase: string;
  control?: "public" | "private";
  state?: string;
  featured?: boolean;
}

/** Tailwind gradient pairs keyed by color family index */
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

const ACCENT_CLASSES = [
  "text-blue-600 dark:text-blue-400",
  "text-red-600 dark:text-red-400",
  "text-green-600 dark:text-green-400",
  "text-orange-600 dark:text-orange-400",
  "text-purple-600 dark:text-purple-400",
  "text-teal-600 dark:text-teal-400",
  "text-rose-600 dark:text-rose-400",
  "text-amber-600 dark:text-amber-400",
  "text-indigo-600 dark:text-indigo-400",
  "text-emerald-600 dark:text-emerald-400",
] as const;

const BORDER_CLASSES = [
  "border-blue-500/20",
  "border-red-500/20",
  "border-green-500/20",
  "border-orange-500/20",
  "border-purple-500/20",
  "border-teal-500/20",
  "border-rose-500/20",
  "border-amber-500/20",
  "border-indigo-500/20",
  "border-emerald-500/20",
] as const;

function colorIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % GRADIENT_PAIRS.length;
}

/** Hand-tuned packs for flagship yards */
const FEATURED_OVERRIDES: Record<
  FeaturedYardId,
  Partial<YardThemePack> & {
    mascot: string;
    tagline: string;
    norms: string[];
    weatherHint: string;
    fanbase: string;
    gradient: string;
    accentClass: string;
    cardBorderClass: string;
  }
> = {
  tsu: {
    mascot: "🐯 Tigers",
    gradient: "from-blue-600 to-blue-800",
    accentClass: "text-blue-600 dark:text-blue-400",
    cardBorderClass: "border-blue-500/20",
    tagline: "Nashville energy — music city meets yard culture",
    norms: ["Hot chicken", "Homecoming tailgate", "Blue & white"],
    weatherHint: "Humid summers · mild winters",
    fanbase: "Tiger nation",
  },
  howard: {
    mascot: "🦁 Bison",
    gradient: "from-red-600 to-red-800",
    accentClass: "text-red-600 dark:text-red-400",
    cardBorderClass: "border-red-500/20",
    tagline: "The Mecca — culture, politics, and excellence",
    norms: ["Yardfest", "DC go-go", "Red & blue"],
    weatherHint: "Four seasons · cherry blossom spring",
    fanbase: "Bison pride",
  },
  spelman: {
    mascot: "🦋 Jaguars",
    gradient: "from-green-600 to-green-800",
    accentClass: "text-green-600 dark:text-green-400",
    cardBorderClass: "border-green-500/20",
    tagline: "Where Black women lead and uplift",
    norms: ["Sisterhood", "Atlanta food scene", "Green & white"],
    weatherHint: "Warm springs · peach season",
    fanbase: "Jaguar sisterhood",
  },
  famu: {
    mascot: "🐍 Rattlers",
    gradient: "from-orange-500 to-orange-700",
    accentClass: "text-orange-600 dark:text-orange-400",
    cardBorderClass: "border-orange-500/20",
    tagline: "Rattler nation — largest HBCU enrollment",
    norms: ["Marching 100", "Orange & green", "Set Fridays"],
    weatherHint: "Florida heat · storm season",
    fanbase: "Rattler nation",
  },
  morehouse: {
    mascot: "🦅 Maroon Tigers",
    gradient: "from-purple-600 to-purple-800",
    accentClass: "text-purple-600 dark:text-purple-400",
    cardBorderClass: "border-purple-500/20",
    tagline: "Building men who lead with integrity",
    norms: ["Crown Forum", "ATL creators", "Maroon & white"],
    weatherHint: "ATL humidity · fall homecoming",
    fanbase: "Maroon Tigers",
  },
  meharry: {
    mascot: "🩺 Meharry Med",
    gradient: "from-teal-600 to-cyan-800",
    accentClass: "text-teal-600 dark:text-teal-400",
    cardBorderClass: "border-teal-500/20",
    tagline: "HBCU medicine — service, science, underrepresented excellence",
    norms: ["Rotations-aware", "Nashville health", "Teal focus"],
    weatherHint: "Same city energy as TSU · clinic-first calendars",
    fanbase: "Meharry network",
  },
  ncat: {
    mascot: "🐐 Aggies",
    gradient: "from-blue-700 to-amber-500",
    accentClass: "text-blue-700 dark:text-blue-400",
    cardBorderClass: "border-blue-600/20",
    tagline: "Aggie pride — STEM, service, and Greensboro fire",
    norms: ["Aggie Fest", "Blue & gold", "Engineering powerhouse"],
    weatherHint: "Piedmont four seasons",
    fanbase: "Aggie nation",
  },
  hampton: {
    mascot: "⚓ Pirates",
    gradient: "from-blue-800 to-slate-400",
    accentClass: "text-blue-800 dark:text-blue-300",
    cardBorderClass: "border-blue-700/20",
    tagline: "Home by the sea — excellence since 1868",
    norms: ["Waterfront campus", "Pirate pride", "Blue & white"],
    weatherHint: "Coastal VA · mild winters",
    fanbase: "Pirate nation",
  },
  tuskegee: {
    mascot: "🦅 Golden Tigers",
    gradient: "from-amber-600 to-red-800",
    accentClass: "text-amber-600 dark:text-amber-400",
    cardBorderClass: "border-amber-500/20",
    tagline: "Booker T. legacy — aviation, vet med, Tuskegee Airmen",
    norms: ["Crimson & gold", "Vet med", "History on the yard"],
    weatherHint: "Alabama heat · fall homecoming",
    fanbase: "Golden Tiger pride",
  },
  jsu: {
    mascot: "🐯 Tigers",
    gradient: "from-blue-700 to-blue-950",
    accentClass: "text-blue-700 dark:text-blue-400",
    cardBorderClass: "border-blue-600/20",
    tagline: "Thee I Love — Jackson excellence",
    norms: ["Sonic Boom", "Blue & white", "Mississippi heart"],
    weatherHint: "Hot summers · mild winters",
    fanbase: "Tiger nation",
  },
  grambling: {
    mascot: "🐯 Tigers",
    gradient: "from-zinc-900 to-amber-600",
    accentClass: "text-amber-500 dark:text-amber-400",
    cardBorderClass: "border-amber-500/20",
    tagline: "World Famed Tiger Marching Band",
    norms: ["Black & gold", "Bayou Classic", "GSU pride"],
    weatherHint: "Louisiana humidity",
    fanbase: "Tiger pride",
  },
  pvamu: {
    mascot: "🐴 Panthers",
    gradient: "from-purple-700 to-amber-500",
    accentClass: "text-purple-700 dark:text-purple-400",
    cardBorderClass: "border-purple-600/20",
    tagline: "Prairie View A&M — purple and gold excellence",
    norms: ["Pantherland", "ROTC legacy", "Texas A&M system"],
    weatherHint: "Texas heat",
    fanbase: "Panther nation",
  },
  vanderbilt: {
    mascot: "⚓ Commodores",
    gradient: "from-black to-amber-700",
    accentClass: "text-amber-600 dark:text-amber-400",
    cardBorderClass: "border-amber-600/20",
    tagline: "West End — SEC academics, Nashville nights",
    norms: ["Black & gold", "SEC", "Music Row next door"],
    weatherHint: "Same city as TSU · humid summers",
    fanbase: "Commodore nation",
  },
  belmont: {
    mascot: "🐻 Bruins",
    gradient: "from-blue-900 to-red-700",
    accentClass: "text-red-600 dark:text-red-400",
    cardBorderClass: "border-red-500/20",
    tagline: "Music city campus — Bruins on the hill",
    norms: ["Navy & red", "Curb College", "Nashville"],
    weatherHint: "Midtown humidity · mild winters",
    fanbase: "Bruin nation",
  },
  tennessee: {
    mascot: "🧡 Volunteers",
    gradient: "from-orange-500 to-orange-800",
    accentClass: "text-orange-600 dark:text-orange-400",
    cardBorderClass: "border-orange-500/20",
    tagline: "Rocky Top — orange nation, SEC Saturdays",
    norms: ["Tennessee orange", "Checkerboard", "Vol Navy"],
    weatherHint: "Smokies fall · hot game days",
    fanbase: "Vol nation",
  },
  "ut-austin": {
    mascot: "🤘 Longhorns",
    gradient: "from-orange-600 to-neutral-900",
    accentClass: "text-orange-600 dark:text-orange-400",
    cardBorderClass: "border-orange-600/20",
    tagline: "Hook 'em — forty acres, SEC now",
    norms: ["Burnt orange", "Bevo", "Austin nights"],
    weatherHint: "Texas heat year-round",
    fanbase: "Longhorn nation",
  },
};

function buildPackFromCatalog(id: string): YardThemePack | null {
  const h = getHbcu(id);
  if (!h) return null;
  const idx = colorIndex(id);
  const featured = (FEATURED_YARD_IDS as readonly string[]).includes(id);
  const override = featured ? FEATURED_OVERRIDES[id as FeaturedYardId] : null;
  const kind = yardKind(h);
  const campusWord = kind === "ncaa" ? "campus" : "campus";
  const sector =
    h.conference ?? (kind === "ncaa" ? "NCAA" : h.control === "public" ? "Public" : "Private");

  const base: YardThemePack = {
    id: h.id,
    name: h.yardLabel,
    school: h.school,
    location: hbcuLocation(h),
    mascot: h.control === "public" ? "🎓 Public campus" : "🏛️ Private campus",
    gradient: GRADIENT_PAIRS[idx],
    accentClass: ACCENT_CLASSES[idx],
    cardBorderClass: BORDER_CLASSES[idx],
    tagline: `${h.shortName} yard — ${h.control} ${campusWord} · est. ${h.founded}`,
    norms: [sector, h.state, `Founded ${h.founded}`],
    weatherHint: "Join the yard to set local norms",
    fanbase: `${h.shortName} family`,
    control: h.control,
    state: h.state,
    featured,
  };

  if (override) {
    return {
      ...base,
      ...override,
      id: h.id,
      name: h.yardLabel,
      school: h.school,
      location: hbcuLocation(h),
      featured: true,
      control: h.control,
      state: h.state,
    };
  }
  return base;
}

/** All yards — full catalog, featured first. */
export const YARD_THEME_PACKS: Record<string, YardThemePack> =
  Object.fromEntries(
    ALL_YARD_CATALOG.map((h) => {
      const pack = buildPackFromCatalog(h.id)!;
      return [h.id, pack];
    }),
  );

/** Featured + commonly used IDs for onboarding grids (not full 100+). */
export const YARD_IDS: string[] = [
  ...FEATURED_YARD_IDS,
  ...ALL_YARD_CATALOG.map((h) => h.id).filter(
    (id) =>
      !(FEATURED_YARD_IDS as readonly string[]).includes(id as FeaturedYardId),
  ),
];

export function getYardTheme(yardId: string): YardThemePack | null {
  if (yardId in YARD_THEME_PACKS) return YARD_THEME_PACKS[yardId];
  return buildPackFromCatalog(yardId);
}

export function yardGradient(yardId: string): string {
  return getYardTheme(yardId)?.gradient ?? "from-primary to-primary/50";
}

export function listYardThemes(opts?: {
  featuredOnly?: boolean;
  state?: string;
  control?: "public" | "private";
  query?: string;
}): YardThemePack[] {
  let list = ALL_YARD_CATALOG.map((h) => YARD_THEME_PACKS[h.id]).filter(Boolean);
  if (opts?.featuredOnly) {
    list = list.filter((y) => y.featured);
  }
  if (opts?.state) {
    list = list.filter((y) => y.state === opts.state);
  }
  if (opts?.control) {
    list = list.filter((y) => y.control === opts.control);
  }
  if (opts?.query?.trim()) {
    const q = opts.query.trim().toLowerCase();
    list = list.filter(
      (y) =>
        y.name.toLowerCase().includes(q) ||
        y.school.toLowerCase().includes(q) ||
        y.location.toLowerCase().includes(q) ||
        y.id.includes(q),
    );
  }
  return list;
}

export type CommunitySkinTier = "preview" | "live";

export interface ResolvedCommunityYardTheme extends YardThemePack {
  packActive: boolean;
  skinTier: CommunitySkinTier;
  purchaseCount: number;
}

/** Community mesh skin — muted until a campus pack is purchased on Yard Sale. */
export function resolveCommunityYardTheme(
  yardId: string,
  packActive: boolean,
  purchaseCount = 0,
): ResolvedCommunityYardTheme | null {
  const base = getYardTheme(yardId);
  if (!base) return null;

  if (packActive) {
    return {
      ...base,
      packActive: true,
      skinTier: "live",
      purchaseCount,
    };
  }

  return {
    ...base,
    gradient: "from-slate-600/50 to-slate-800/60",
    accentClass: "text-muted-foreground",
    cardBorderClass: "border-border/50",
    packActive: false,
    skinTier: "preview",
    purchaseCount: 0,
  };
}

/** CSS primary HSL for yard-accent mode (shared with ui-prefs). */
export function yardPrimaryHsl(yardId: string): string {
  return yardAccentHsl(yardId);
}
