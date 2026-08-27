/**
 * React-side page templates for MyYard (Myspace diversity without raw CSS first).
 * Visual + audio nuance can layer on later; these set the aesthetic skeleton.
 */
import {
  DEFAULT_AESTHETIC,
  type MyYardAesthetic,
} from "@/lib/myyard-layout";
import type { ProfileThemeId } from "@/lib/myyard-catalog";

export type PageTemplateId =
  | "campus-wall"
  | "myspace-night"
  | "threads-clean"
  | "portal-neon"
  | "tribute-gold"
  | "y2k-glitter"
  | "cyber-yard";

export const MYYARD_PAGE_TEMPLATES: {
  id: PageTemplateId;
  label: string;
  blurb: string;
  theme: ProfileThemeId;
  aesthetic: Partial<MyYardAesthetic>;
}[] = [
  {
    id: "campus-wall",
    label: "Campus wall",
    blurb: "Facebook-yard: banner, photos, talk",
    theme: "classic",
    aesthetic: {
      ...DEFAULT_AESTHETIC,
      bannerGradientId: "classic",
      accent: "#ea580c",
      fontStyle: "system",
      bgPattern: "none",
      cardRadius: "soft",
    },
  },
  {
    id: "myspace-night",
    label: "MyYard night",
    blurb: "Glitter energy, song on, stars",
    theme: "myspace",
    aesthetic: {
      ...DEFAULT_AESTHETIC,
      bannerGradientId: "neon",
      accent: "#e879f9",
      fontStyle: "display",
      bgPattern: "stars",
      cardRadius: "round",
      showMusic: true,
    },
  },
  {
    id: "threads-clean",
    label: "Clean notes",
    blurb: "Threads-style type, quiet page",
    theme: "pro",
    aesthetic: {
      ...DEFAULT_AESTHETIC,
      bannerMode: "solid",
      bannerSolid: "#0f172a",
      accent: "#38bdf8",
      fontStyle: "serif",
      bgPattern: "none",
      cardRadius: "sharp",
      glassHeader: false,
    },
  },
  {
    id: "portal-neon",
    label: "Portal neon",
    blurb: "Newgrounds upload energy",
    theme: "vibrant",
    aesthetic: {
      ...DEFAULT_AESTHETIC,
      bannerGradientId: "gold",
      accent: "#fbbf24",
      fontStyle: "mono",
      bgPattern: "grid",
      cardRadius: "sharp",
    },
  },
  {
    id: "tribute-gold",
    label: "Tribute gold",
    blurb: "Quiet memorial page — song, photos, wall notes",
    theme: "classic",
    aesthetic: {
      ...DEFAULT_AESTHETIC,
      bannerGradientId: "gold",
      accent: "#b45309",
      fontStyle: "serif",
      bgPattern: "none",
      cardRadius: "soft",
      glassHeader: true,
      showMusic: true,
      showGallery: true,
      mood: "In loving memory",
    },
  },
  {
    id: "y2k-glitter",
    label: "Y2K glitter",
    blurb: "Pimp pack: sparkle, glow name, ticker mood",
    theme: "myspace",
    aesthetic: {
      ...DEFAULT_AESTHETIC,
      bannerGradientId: "neon",
      accent: "#f472b6",
      fontStyle: "display",
      bgPattern: "stars",
      cardRadius: "round",
      showMusic: true,
      fx: "glitter",
      cursorPack: "sparkle",
      textFx: "glow",
      bannerMotion: "pulse",
      marqueeMood: true,
      pimpPackId: "y2k-glitter",
    },
  },
  {
    id: "cyber-yard",
    label: "Cyber yard",
    blurb: "Pimp pack: scanlines, mono, neon outline",
    theme: "vibrant",
    aesthetic: {
      ...DEFAULT_AESTHETIC,
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
      pimpPackId: "cyber-yard",
    },
  },
];
