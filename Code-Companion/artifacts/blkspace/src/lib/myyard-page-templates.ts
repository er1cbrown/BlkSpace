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
  | "tribute-gold";

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
];
