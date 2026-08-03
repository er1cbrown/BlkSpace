/** Parsed MyYard profile_layout_json — personalization + modules. */

import type { CSSProperties } from "react";

export interface MyYardModules {
  logosDeck?: boolean;
  bibleNlp?: boolean;
}

export interface MyYardLogosDeckConfig {
  setTitle?: string;
  audioHash?: string | null;
  trackIds?: string[];
}

/** Banner presets (MySpace-era energy, modern defaults). */
export const BANNER_GRADIENTS = [
  { id: "sunset", label: "Sunset yard", css: "linear-gradient(135deg,#f97316,#db2777,#7c3aed)" },
  { id: "night", label: "Night out", css: "linear-gradient(135deg,#0f172a,#1e3a8a,#4c1d95)" },
  { id: "gold", label: "Gold & black", css: "linear-gradient(135deg,#111827,#b45309,#fbbf24)" },
  { id: "forest", label: "Forest", css: "linear-gradient(135deg,#064e3b,#059669,#a7f3d0)" },
  { id: "ocean", label: "Ocean", css: "linear-gradient(135deg,#0c4a6e,#0284c7,#67e8f9)" },
  { id: "rose", label: "Rose glass", css: "linear-gradient(135deg,#881337,#e11d48,#fda4af)" },
  { id: "neon", label: "Neon", css: "linear-gradient(135deg,#020617,#d946ef,#22d3ee)" },
  { id: "classic", label: "BlkSpace orange", css: "linear-gradient(135deg,#ea580c,#fb923c,#fdba74)" },
] as const;

export type BannerGradientId = (typeof BANNER_GRADIENTS)[number]["id"];

export type BgPatternId = "none" | "dots" | "grid" | "stars" | "waves";
export type FontStyleId = "system" | "serif" | "mono" | "display";
export type CardRadiusId = "sharp" | "soft" | "round";

/** Visual personalization visitors actually see. */
export interface MyYardAesthetic {
  /** Short status under the name (MySpace “mood”). */
  mood: string;
  /** Longer “About me” blurb (plain text). */
  about: string;
  bannerMode: "gradient" | "solid" | "image";
  bannerGradientId: BannerGradientId;
  bannerSolid: string;
  /** Iroh/local blob hash for banner image. */
  bannerImageHash: string | null;
  /** Web-only data URL fallback for banner. */
  bannerImageDataUrl: string | null;
  accent: string;
  bgPattern: BgPatternId;
  fontStyle: FontStyleId;
  cardRadius: CardRadiusId;
  glassHeader: boolean;
  /** Featured photo hashes (profile gallery strip). Max 8. */
  galleryHashes: string[];
  /** Web data URLs keyed by hash or temp id. */
  galleryDataUrls: Record<string, string>;
  showTopFriends: boolean;
  showMusic: boolean;
  showGallery: boolean;
  /**
   * Optional custom CSS applied to `.myyard-root` only.
   * Sanitized before save/apply — no scripts, no external imports.
   */
  customCss: string;
}

export interface MyYardLayout {
  modules?: MyYardModules;
  logosDeck?: MyYardLogosDeckConfig;
  /** Campus pack from Yard Sale purchase (`theme:yard:tsu`). */
  yardPackId?: string | null;
  aesthetic?: MyYardAesthetic;
}

export const DEFAULT_AESTHETIC: MyYardAesthetic = {
  mood: "",
  about: "",
  bannerMode: "gradient",
  bannerGradientId: "classic",
  bannerSolid: "#ea580c",
  bannerImageHash: null,
  bannerImageDataUrl: null,
  accent: "#ea580c",
  bgPattern: "none",
  fontStyle: "system",
  cardRadius: "soft",
  glassHeader: true,
  galleryHashes: [],
  galleryDataUrls: {},
  showTopFriends: true,
  showMusic: true,
  showGallery: true,
  customCss: "",
};

export const DEFAULT_MYYARD_LAYOUT: MyYardLayout = {
  modules: { logosDeck: false, bibleNlp: false },
  logosDeck: { setTitle: "Sermon set", audioHash: null, trackIds: [] },
  yardPackId: null,
  aesthetic: { ...DEFAULT_AESTHETIC },
};

const MAX_CSS_LEN = 4000;
const MAX_GALLERY = 8;

/** Strip dangerous constructs from custom CSS (MySpace energy, safer surface). */
export function sanitizeCustomCss(raw: string): string {
  let s = (raw || "").slice(0, MAX_CSS_LEN);
  s = s.replace(/@import[\s\S]*?;/gi, "");
  s = s.replace(/expression\s*\(/gi, "/*blocked*/(");
  s = s.replace(/javascript\s*:/gi, "blocked:");
  s = s.replace(/-moz-binding\s*:/gi, "blocked:");
  s = s.replace(/behavior\s*:/gi, "blocked:");
  s = s.replace(/url\s*\(\s*['"]?\s*javascript:/gi, "url(blocked:");
  s = s.replace(/<\/?script/gi, "/*script*/");
  return s;
}

export function getBannerCss(a: MyYardAesthetic): string {
  if (a.bannerMode === "solid") return a.bannerSolid || "#ea580c";
  if (a.bannerMode === "image") {
    const src = a.bannerImageDataUrl;
    if (src) return `center/cover no-repeat url(${src})`;
    // hash resolved by UI to data URL — fallback gradient
  }
  const g =
    BANNER_GRADIENTS.find((x) => x.id === a.bannerGradientId) ||
    BANNER_GRADIENTS[BANNER_GRADIENTS.length - 1];
  return g.css;
}

export function parseMyYardLayout(json: string | undefined | null): MyYardLayout {
  if (!json || json.trim() === "" || json === "{}") {
    return structuredClone(DEFAULT_MYYARD_LAYOUT);
  }
  try {
    const raw = JSON.parse(json) as MyYardLayout;
    const a = raw.aesthetic || {};
    return {
      modules: {
        logosDeck: raw.modules?.logosDeck ?? false,
        bibleNlp: raw.modules?.bibleNlp ?? false,
      },
      logosDeck: {
        setTitle: raw.logosDeck?.setTitle ?? "Sermon set",
        audioHash: raw.logosDeck?.audioHash ?? null,
        trackIds: raw.logosDeck?.trackIds ?? [],
      },
      yardPackId: raw.yardPackId ?? null,
      aesthetic: {
        ...DEFAULT_AESTHETIC,
        ...a,
        galleryHashes: Array.isArray((a as MyYardAesthetic).galleryHashes)
          ? (a as MyYardAesthetic).galleryHashes.slice(0, MAX_GALLERY)
          : [],
        galleryDataUrls:
          typeof (a as MyYardAesthetic).galleryDataUrls === "object" &&
          (a as MyYardAesthetic).galleryDataUrls
            ? (a as MyYardAesthetic).galleryDataUrls
            : {},
        customCss: sanitizeCustomCss((a as MyYardAesthetic).customCss || ""),
      },
    };
  } catch {
    return structuredClone(DEFAULT_MYYARD_LAYOUT);
  }
}

export function mergeMyYardLayout(
  current: MyYardLayout,
  patch: Partial<MyYardLayout>,
): MyYardLayout {
  return {
    modules: { ...current.modules, ...patch.modules },
    logosDeck: { ...current.logosDeck, ...patch.logosDeck },
    yardPackId:
      patch.yardPackId !== undefined ? patch.yardPackId : current.yardPackId,
    aesthetic: patch.aesthetic
      ? {
          ...DEFAULT_AESTHETIC,
          ...current.aesthetic,
          ...patch.aesthetic,
          customCss: sanitizeCustomCss(
            patch.aesthetic.customCss ??
              current.aesthetic?.customCss ??
              "",
          ),
          galleryHashes: (
            patch.aesthetic.galleryHashes ??
            current.aesthetic?.galleryHashes ??
            []
          ).slice(0, MAX_GALLERY),
        }
      : current.aesthetic
        ? { ...DEFAULT_AESTHETIC, ...current.aesthetic }
        : { ...DEFAULT_AESTHETIC },
  };
}

export function serializeMyYardLayout(layout: MyYardLayout): string {
  const next = {
    ...layout,
    aesthetic: layout.aesthetic
      ? {
          ...layout.aesthetic,
          customCss: sanitizeCustomCss(layout.aesthetic.customCss),
          galleryHashes: layout.aesthetic.galleryHashes.slice(0, MAX_GALLERY),
        }
      : undefined,
  };
  return JSON.stringify(next);
}

/** Pattern CSS for profile body background. */
export function patternStyle(id: BgPatternId): CSSProperties {
  switch (id) {
    case "dots":
      return {
        backgroundImage:
          "radial-gradient(circle, currentColor 1px, transparent 1px)",
        backgroundSize: "14px 14px",
        opacity: 1,
      };
    case "grid":
      return {
        backgroundImage:
          "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      };
    case "stars":
      return {
        backgroundImage:
          "radial-gradient(1px 1px at 10% 20%, currentColor, transparent), radial-gradient(1px 1px at 80% 40%, currentColor, transparent), radial-gradient(1.5px 1.5px at 50% 70%, currentColor, transparent)",
      };
    case "waves":
      return {
        backgroundImage:
          "repeating-linear-gradient(105deg, transparent, transparent 12px, currentColor 12px, currentColor 13px)",
      };
    default:
      return {};
  }
}
