/** Campus Yard theme packs — each mesh can look and feel distinct. */

export type YardId = "tsu" | "howard" | "spelman" | "famu" | "morehouse";

export interface YardThemePack {
  id: YardId;
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
}

export const YARD_THEME_PACKS: Record<YardId, YardThemePack> = {
  tsu: {
    id: "tsu",
    name: "TSU Yard",
    school: "Tennessee State University",
    location: "Nashville, TN",
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
    id: "howard",
    name: "Howard Yard",
    school: "Howard University",
    location: "Washington, DC",
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
    id: "spelman",
    name: "Spelman Yard",
    school: "Spelman College",
    location: "Atlanta, GA",
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
    id: "famu",
    name: "FAMU Yard",
    school: "Florida A&M University",
    location: "Tallahassee, FL",
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
    id: "morehouse",
    name: "Morehouse Yard",
    school: "Morehouse College",
    location: "Atlanta, GA",
    mascot: "🦅 Maroon Tigers",
    gradient: "from-purple-600 to-purple-800",
    accentClass: "text-purple-600 dark:text-purple-400",
    cardBorderClass: "border-purple-500/20",
    tagline: "Building men who lead with integrity",
    norms: ["Crown Forum", "ATL creators", "Maroon & white"],
    weatherHint: "ATL humidity · fall homecoming",
    fanbase: "Maroon Tigers",
  },
};

export const YARD_IDS = Object.keys(YARD_THEME_PACKS) as YardId[];

export function getYardTheme(yardId: string): YardThemePack | null {
  if (yardId in YARD_THEME_PACKS) {
    return YARD_THEME_PACKS[yardId as YardId];
  }
  return null;
}

export function yardGradient(yardId: string): string {
  return getYardTheme(yardId)?.gradient ?? "from-primary to-primary/50";
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