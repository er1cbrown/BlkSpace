/**
 * Advanced MyYard "pimp" layer — look only.
 * Music stays on the Music tab. No remote CSS URLs. No scripts.
 */

import type {
  MyYardAesthetic,
  MyYardBannerMotionId,
  MyYardCursorId,
  MyYardFxId,
  MyYardTextFxId,
} from "@/lib/myyard-layout";

export type {
  MyYardBannerMotionId,
  MyYardCursorId,
  MyYardFxId,
  MyYardTextFxId,
};

export const MYYARD_FX: { id: MyYardFxId; label: string; blurb: string }[] = [
  { id: "none", label: "None", blurb: "Clean page" },
  { id: "sparkle", label: "Sparkle", blurb: "Soft stars over the card" },
  { id: "glitter", label: "Glitter", blurb: "Y2K shine without remote GIFs" },
  { id: "scanlines", label: "Scanlines", blurb: "CRT / late-night lab" },
  { id: "grain", label: "Grain", blurb: "Zine / underground paper" },
  { id: "vhs", label: "VHS", blurb: "Warp + chromatic fringe" },
];

export const MYYARD_CURSORS: { id: MyYardCursorId; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "sparkle", label: "Sparkle pointer" },
  { id: "cross", label: "Crosshair" },
  { id: "neon", label: "Neon dot" },
];

export const MYYARD_TEXT_FX: { id: MyYardTextFxId; label: string }[] = [
  { id: "none", label: "Plain" },
  { id: "glow", label: "Glow" },
  { id: "chrome", label: "Chrome" },
  { id: "outline", label: "Outline" },
];

export const MYYARD_BANNER_MOTION: {
  id: MyYardBannerMotionId;
  label: string;
}[] = [
  { id: "still", label: "Still" },
  { id: "pan", label: "Slow pan" },
  { id: "pulse", label: "Pulse" },
];

export const MYYARD_CSS_HOOKS = [
  ".myyard-root",
  ".myyard-banner",
  ".myyard-name",
  ".myyard-mood",
  ".myyard-about",
  ".myyard-player",
  ".myyard-accent-text",
  "var(--myyard-accent)",
] as const;

export interface MyYardCssSnippet {
  id: string;
  label: string;
  css: string;
}

/** One-click safe CSS. No url(https), no @import. */
export const MYYARD_CSS_SNIPPETS: MyYardCssSnippet[] = [
  {
    id: "neon-name",
    label: "Neon name",
    css: `.myyard-name {
  letter-spacing: -0.04em;
  text-shadow: 0 0 8px var(--myyard-accent), 0 0 24px var(--myyard-accent);
}`,
  },
  {
    id: "sticky-about",
    label: "Sticky-note about",
    css: `.myyard-about {
  background: #fde68a;
  color: #111827;
  padding: 0.85rem 1rem;
  transform: rotate(-1.2deg);
  box-shadow: 4px 6px 0 rgba(0,0,0,0.15);
  border-radius: 2px;
}`,
  },
  {
    id: "player-chrome",
    label: "Chrome player",
    css: `.myyard-player {
  border: 2px solid var(--myyard-accent) !important;
  box-shadow: 0 0 0 1px #000, 0 0 22px color-mix(in oklab, var(--myyard-accent) 55%, transparent);
  border-radius: 1.25rem;
}`,
  },
  {
    id: "banner-stripe",
    label: "Banner stripe",
    css: `.myyard-banner {
  box-shadow: inset 0 -10px 0 var(--myyard-accent);
}`,
  },
  {
    id: "mood-ticker",
    label: "Mood ticker CSS",
    css: `.myyard-mood {
  font-family: ui-monospace, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}`,
  },
  {
    id: "link-hot",
    label: "Hot links",
    css: `a {
  color: var(--myyard-accent);
  text-decoration: underline wavy;
}`,
  },
];

export interface MyYardPimpPack {
  id: string;
  label: string;
  blurb: string;
  patch: Partial<MyYardAesthetic>;
  css: string;
}

export const MYYARD_PIMP_PACKS: MyYardPimpPack[] = [
  {
    id: "y2k-glitter",
    label: "Y2K glitter",
    blurb: "Pink chrome, sparkle, round cards — 2006 energy",
    patch: {
      bannerGradientId: "neon",
      accent: "#f472b6",
      fontStyle: "display",
      bgPattern: "stars",
      cardRadius: "round",
      glassHeader: true,
      showMusic: true,
      fx: "glitter",
      cursorPack: "sparkle",
      textFx: "glow",
      bannerMotion: "pulse",
      marqueeMood: true,
      pimpPackId: "y2k-glitter",
    },
    css: `.myyard-name { text-transform: lowercase; }
.myyard-player { border-radius: 999px; }`,
  },
  {
    id: "cyber-yard",
    label: "Cyber yard",
    blurb: "Scanlines, grid, neon mint — lab after dark",
    patch: {
      bannerGradientId: "night",
      accent: "#22d3ee",
      fontStyle: "mono",
      bgPattern: "grid",
      cardRadius: "sharp",
      glassHeader: false,
      fx: "scanlines",
      cursorPack: "neon",
      textFx: "outline",
      bannerMotion: "pan",
      marqueeMood: false,
      pimpPackId: "cyber-yard",
    },
    css: `.myyard-name { font-variant: small-caps; letter-spacing: 0.12em; }
.myyard-banner { filter: contrast(1.1) saturate(1.2); }`,
  },
  {
    id: "vapor-wave",
    label: "Vapor wave",
    blurb: "Slow pan, waves, chrome type",
    patch: {
      bannerGradientId: "rose",
      accent: "#e879f9",
      fontStyle: "serif",
      bgPattern: "waves",
      cardRadius: "soft",
      fx: "vhs",
      cursorPack: "default",
      textFx: "chrome",
      bannerMotion: "pan",
      marqueeMood: true,
      pimpPackId: "vapor-wave",
    },
    css: `.myyard-mood { opacity: 0.9; }`,
  },
  {
    id: "underground-zine",
    label: "Underground zine",
    blurb: "Grain, sharp edges, photocopier energy",
    patch: {
      bannerMode: "solid",
      bannerSolid: "#111111",
      accent: "#fbbf24",
      fontStyle: "mono",
      bgPattern: "none",
      cardRadius: "sharp",
      glassHeader: false,
      fx: "grain",
      cursorPack: "cross",
      textFx: "outline",
      bannerMotion: "still",
      marqueeMood: false,
      pimpPackId: "underground-zine",
    },
    css: `.myyard-name { text-transform: uppercase; }
.myyard-about { border-left: 4px solid var(--myyard-accent); padding-left: 0.75rem; }`,
  },
  {
    id: "gold-front",
    label: "Gold front",
    blurb: "Sunday best — glow name, still banner",
    patch: {
      bannerGradientId: "gold",
      accent: "#fbbf24",
      fontStyle: "serif",
      bgPattern: "none",
      cardRadius: "soft",
      glassHeader: true,
      fx: "sparkle",
      cursorPack: "sparkle",
      textFx: "glow",
      bannerMotion: "still",
      marqueeMood: false,
      pimpPackId: "gold-front",
    },
    css: `.myyard-banner { box-shadow: inset 0 -8px 0 #111; }`,
  },
];

export function applyPimpPack(
  current: MyYardAesthetic,
  pack: MyYardPimpPack,
): MyYardAesthetic {
  return {
    ...current,
    ...pack.patch,
    customCss: pack.css.trim(),
    pimpPackId: pack.id,
  };
}

export function appendSnippet(
  currentCss: string,
  snippet: MyYardCssSnippet,
): string {
  const stamp = `/* snippet:${snippet.id} */`;
  if ((currentCss || "").includes(stamp)) return currentCss;
  const block = `${stamp}\n${snippet.css.trim()}\n`;
  return currentCss?.trim() ? `${currentCss.trim()}\n\n${block}` : block;
}

/** Engine CSS for structured FX — not user-authored, so not sanitized as a blob. */
export const MYYARD_FX_ENGINE_CSS = `
.myyard-root[data-myyard] .myyard-fx {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 4;
  overflow: hidden;
  border-radius: inherit;
}
.myyard-root[data-myyard-fx="sparkle"] .myyard-fx,
.myyard-root[data-myyard-fx="glitter"] .myyard-fx {
  background-image:
    radial-gradient(1.5px 1.5px at 12% 18%, #fff, transparent),
    radial-gradient(1px 1px at 72% 34%, #fff, transparent),
    radial-gradient(2px 2px at 40% 78%, #fff, transparent),
    radial-gradient(1px 1px at 88% 62%, #fff, transparent);
  animation: myyard-twinkle 3.6s linear infinite;
  opacity: 0.55;
}
.myyard-root[data-myyard-fx="glitter"] .myyard-fx {
  mix-blend-mode: screen;
  opacity: 0.7;
}
.myyard-root[data-myyard-fx="scanlines"] .myyard-fx {
  background: repeating-linear-gradient(
    to bottom,
    transparent 0 2px,
    rgba(0,0,0,0.22) 2px 3px
  );
  opacity: 0.45;
}
.myyard-root[data-myyard-fx="grain"] .myyard-fx {
  background-image: repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0 1px, transparent 1px 3px);
  opacity: 0.35;
}
.myyard-root[data-myyard-fx="vhs"] .myyard-fx {
  box-shadow: inset 3px 0 0 rgba(255,0,80,0.25), inset -3px 0 0 rgba(0,255,255,0.2);
  animation: myyard-vhs 2.8s steps(2, end) infinite;
}
.myyard-root[data-myyard-text="glow"] .myyard-name {
  text-shadow: 0 0 10px var(--myyard-accent), 0 0 28px var(--myyard-accent);
}
.myyard-root[data-myyard-text="outline"] .myyard-name {
  -webkit-text-stroke: 1px var(--myyard-accent);
  color: transparent;
  paint-order: stroke fill;
}
.myyard-root[data-myyard-text="chrome"] .myyard-name {
  background: linear-gradient(180deg, #fff, var(--myyard-accent), #111);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.myyard-root[data-myyard-banner="pan"] .myyard-banner {
  background-size: 140% 140%;
  animation: myyard-pan 18s ease-in-out infinite alternate;
}
.myyard-root[data-myyard-banner="pulse"] .myyard-banner {
  animation: myyard-pulse 4.5s ease-in-out infinite;
}
.myyard-root[data-myyard-marquee="on"] .myyard-mood {
  display: block;
  overflow: hidden;
  white-space: nowrap;
}
.myyard-root[data-myyard-marquee="on"] .myyard-mood span {
  display: inline-block;
  padding-left: 100%;
  animation: myyard-marquee 12s linear infinite;
}
.myyard-root[data-myyard-cursor="cross"] { cursor: crosshair; }
.myyard-root[data-myyard-cursor="sparkle"] { cursor: cell; }
.myyard-root[data-myyard-cursor="neon"] { cursor: alias; }
@keyframes myyard-twinkle { to { transform: translateY(-6px); } }
@keyframes myyard-pan { to { background-position: 80% 40%; } }
@keyframes myyard-pulse { 50% { filter: brightness(1.12) saturate(1.15); } }
@keyframes myyard-vhs { 50% { transform: translateX(1px); } }
@keyframes myyard-marquee { from { transform: translateX(0); } to { transform: translateX(-100%); } }
@media (prefers-reduced-motion: reduce) {
  .myyard-root[data-myyard] .myyard-fx,
  .myyard-root[data-myyard] .myyard-banner,
  .myyard-root[data-myyard] .myyard-mood span {
    animation: none !important;
  }
}
`;
