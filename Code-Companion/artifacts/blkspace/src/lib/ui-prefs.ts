/**
 * Per-user UI personalization — each BlkSpace instance is tailored.
 * Stored on-device (localStorage); optional sync via pro_profile_json later.
 * Note: no imports from yard-themes/myyard-catalog (avoids circular ESM graph).
 */

import { yardAccentHsl } from "@/lib/yard-colors";

/** Matches MyYard profile chrome ids without importing myyard-catalog. */
export type ProfileThemeId = "classic" | "pro" | "vibrant" | "myspace";

export type AccentPreset =
  | "brand" // BlkSpace orange
  | "yard" // follow home yard gradient primary
  | "gold"
  | "teal"
  | "violet"
  | "crimson"
  | "forest";

export type DensityId = "comfortable" | "cozy" | "compact";
export type FontScaleId = "sm" | "md" | "lg";
export type FeedLayoutId = "cards" | "compact" | "magazine";
export type NavStyleId = "full" | "icons" | "minimal";
export type RadiusId = "sharp" | "default" | "soft";

export interface UiPrefs {
  /** Home yard id from HBCU catalog */
  homeYardId: string;
  /** Profile chrome theme (MyYard) */
  profileTheme: ProfileThemeId;
  /** Accent color preset for app chrome */
  accent: AccentPreset;
  density: DensityId;
  fontScale: FontScaleId;
  feedLayout: FeedLayoutId;
  navStyle: NavStyleId;
  radius: RadiusId;
  reduceMotion: boolean;
  /** Soften gradients / high-contrast campus packs */
  calmCampusSkins: boolean;
  /** Show Focus / Faculty shortcuts in shell */
  showFocusNav: boolean;
  showFacultyNav: boolean;
  /** Default start route after login */
  startPath: "/feed" | "/hub" | "/focus" | "/communities" | "/connect";
  /** Which hub modules user pins */
  pinnedModules: {
    events: boolean;
    studio: boolean;
    clubs: boolean;
    yardSale: boolean;
    literacy: boolean;
  };
}

export const DEFAULT_UI_PREFS: UiPrefs = {
  homeYardId: "tsu",
  profileTheme: "classic",
  accent: "brand",
  density: "comfortable",
  fontScale: "md",
  feedLayout: "cards",
  navStyle: "full",
  radius: "default",
  reduceMotion: false,
  calmCampusSkins: false,
  showFocusNav: true,
  showFacultyNav: false,
  startPath: "/feed",
  pinnedModules: {
    events: true,
    studio: true,
    clubs: true,
    yardSale: true,
    literacy: true,
  },
};

const LS_KEY = "blkspace_ui_prefs_v1";

const ACCENT_HSL: Record<AccentPreset, string> = {
  brand: "22 90% 55%",
  yard: "22 90% 55%", // overridden at apply time from yard
  gold: "45 90% 50%",
  teal: "173 60% 40%",
  violet: "270 55% 52%",
  crimson: "350 70% 48%",
  forest: "150 45% 35%",
};

export { yardAccentHsl };

export function loadUiPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      const home = localStorage.getItem("blkspace_home_yard");
      return {
        ...DEFAULT_UI_PREFS,
        homeYardId: home || DEFAULT_UI_PREFS.homeYardId,
        pinnedModules: { ...DEFAULT_UI_PREFS.pinnedModules },
      };
    }
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return normalizeUiPrefs(parsed);
  } catch {
    return {
      ...DEFAULT_UI_PREFS,
      pinnedModules: { ...DEFAULT_UI_PREFS.pinnedModules },
    };
  }
}

export function saveUiPrefs(prefs: UiPrefs): void {
  const next = normalizeUiPrefs(prefs);
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  try {
    localStorage.setItem("blkspace_home_yard", next.homeYardId);
  } catch {
    /* ignore */
  }
  applyUiPrefsToDocument(next);
  try {
    window.dispatchEvent(new CustomEvent("blkspace-ui-prefs", { detail: next }));
  } catch {
    /* ignore */
  }
}

export function normalizeUiPrefs(raw: Partial<UiPrefs> | null | undefined): UiPrefs {
  const p = raw ?? {};
  const density: DensityId =
    p.density === "cozy" || p.density === "compact" ? p.density : "comfortable";
  const fontScale: FontScaleId =
    p.fontScale === "sm" || p.fontScale === "lg" ? p.fontScale : "md";
  const feedLayout: FeedLayoutId =
    p.feedLayout === "compact" || p.feedLayout === "magazine"
      ? p.feedLayout
      : "cards";
  const navStyle: NavStyleId =
    p.navStyle === "icons" || p.navStyle === "minimal" ? p.navStyle : "full";
  const radius: RadiusId =
    p.radius === "sharp" || p.radius === "soft" ? p.radius : "default";
  const accent: AccentPreset =
    p.accent && p.accent in ACCENT_HSL ? p.accent : "brand";
  const profileTheme: ProfileThemeId =
    p.profileTheme === "pro" ||
    p.profileTheme === "vibrant" ||
    p.profileTheme === "myspace"
      ? p.profileTheme
      : "classic";
  const startPath =
    p.startPath === "/hub" ||
    p.startPath === "/focus" ||
    p.startPath === "/communities" ||
    p.startPath === "/connect"
      ? p.startPath
      : "/feed";

  return {
    homeYardId:
      typeof p.homeYardId === "string" && p.homeYardId.trim()
        ? p.homeYardId.trim()
        : DEFAULT_UI_PREFS.homeYardId,
    profileTheme,
    accent,
    density,
    fontScale,
    feedLayout,
    navStyle,
    radius,
    reduceMotion: !!p.reduceMotion,
    calmCampusSkins: !!p.calmCampusSkins,
    showFocusNav: p.showFocusNav !== false,
    showFacultyNav: !!p.showFacultyNav,
    startPath,
    pinnedModules: {
      events: p.pinnedModules?.events !== false,
      studio: p.pinnedModules?.studio !== false,
      clubs: p.pinnedModules?.clubs !== false,
      yardSale: p.pinnedModules?.yardSale !== false,
      literacy: p.pinnedModules?.literacy !== false,
    },
  };
}

/** Apply CSS variables / data attributes on <html>. */
export function applyUiPrefsToDocument(prefs: UiPrefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.density = prefs.density;
  root.dataset.fontScale = prefs.fontScale;
  root.dataset.feedLayout = prefs.feedLayout;
  root.dataset.navStyle = prefs.navStyle;
  root.dataset.radius = prefs.radius;
  root.dataset.calmCampus = prefs.calmCampusSkins ? "1" : "0";
  if (prefs.reduceMotion) {
    root.dataset.reduceMotion = "1";
  } else {
    delete root.dataset.reduceMotion;
  }

  const primary =
    prefs.accent === "yard"
      ? yardAccentHsl(prefs.homeYardId)
      : ACCENT_HSL[prefs.accent];
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-ring", primary);

  const scale =
    prefs.fontScale === "sm" ? "0.92" : prefs.fontScale === "lg" ? "1.08" : "1";
  root.style.setProperty("--ui-font-scale", scale);

  const pad =
    prefs.density === "compact"
      ? "0.75"
      : prefs.density === "cozy"
        ? "0.9"
        : "1";
  root.style.setProperty("--ui-density", pad);

  const rad =
    prefs.radius === "sharp" ? "0.35rem" : prefs.radius === "soft" ? "1.15rem" : "0.75rem";
  root.style.setProperty("--ui-radius", rad);
}

export const ACCENT_OPTIONS: { id: AccentPreset; label: string; swatch: string }[] =
  [
    { id: "brand", label: "BlkSpace orange", swatch: "bg-orange-500" },
    { id: "yard", label: "Match my yard", swatch: "bg-gradient-to-r from-blue-500 to-orange-500" },
    { id: "gold", label: "Gold", swatch: "bg-amber-500" },
    { id: "teal", label: "Teal", swatch: "bg-teal-600" },
    { id: "violet", label: "Violet", swatch: "bg-violet-600" },
    { id: "crimson", label: "Crimson", swatch: "bg-rose-700" },
    { id: "forest", label: "Forest", swatch: "bg-emerald-700" },
  ];

export const DENSITY_OPTIONS: { id: DensityId; label: string; hint: string }[] = [
  { id: "comfortable", label: "Comfortable", hint: "Roomy cards & spacing" },
  { id: "cozy", label: "Cozy", hint: "Slightly tighter (Discord-like)" },
  { id: "compact", label: "Compact", hint: "Dense feed for power users" },
];

export const FONT_SCALE_OPTIONS: { id: FontScaleId; label: string }[] = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Large" },
];

export const FEED_LAYOUT_OPTIONS: { id: FeedLayoutId; label: string; hint: string }[] =
  [
    { id: "cards", label: "Cards", hint: "Default post cards" },
    { id: "compact", label: "Compact list", hint: "Timeline density" },
    { id: "magazine", label: "Magazine", hint: "Larger media, fewer posts" },
  ];
