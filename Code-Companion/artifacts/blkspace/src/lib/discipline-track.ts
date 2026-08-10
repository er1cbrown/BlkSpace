/**
 * Discipline tracks for "BKSPC University" — reorder Hub, pin modules, and
 * emphasize pathways without shipping separate apps per major.
 * See docs/features/bkspc-university-vision.md
 */

import type { HubTopic } from "@/lib/content-hub";

export type DisciplineTrack =
  | "general"
  | "social"
  | "finance"
  | "creative"
  | "research"
  | "faculty";

export type DisciplineStartPath =
  | "/feed"
  | "/hub"
  | "/focus"
  | "/communities"
  | "/connect";

export type DisciplinePinnedModules = {
  events: boolean;
  studio: boolean;
  clubs: boolean;
  yardSale: boolean;
  literacy: boolean;
};

export interface DisciplineTrackMeta {
  id: DisciplineTrack;
  label: string;
  short: string;
  blurb: string;
  /** Hub topic order (first = highest priority) */
  hubTopicOrder: HubTopic[];
  /** Default domain filter hint for Connect rail */
  connectDomainHint: string;
  showFacultyNav: boolean;
  showFocusNav: boolean;
  pinnedModules: DisciplinePinnedModules;
  /** Suggested start path after open */
  startPath: DisciplineStartPath;
}

export const DISCIPLINE_TRACKS: DisciplineTrackMeta[] = [
  {
    id: "general",
    label: "General campus",
    short: "Balanced",
    blurb: "Culture, study, and discovery — no single major skin.",
    hubTopicOrder: [
      "culture",
      "study",
      "live",
      "pro",
      "music",
      "fashion",
      "chess",
      "gaming",
      "systems",
      "med",
    ],
    connectDomainHint: "all",
    showFacultyNav: false,
    showFocusNav: true,
    pinnedModules: {
      events: true,
      studio: true,
      clubs: true,
      yardSale: true,
      literacy: true,
    },
    startPath: "/feed",
  },
  {
    id: "social",
    label: "Campus life · your yard",
    short: "Your yard",
    blurb:
      "People, clubs, fashion energy, and nights out — not living in someone else's finance tab. Same app; your track.",
    hubTopicOrder: [
      "culture",
      "live",
      "fashion",
      "music",
      "gaming",
      "chess",
      "study",
      "pro",
      "systems",
      "med",
    ],
    connectDomainHint: "all",
    showFacultyNav: false,
    showFocusNav: true,
    pinnedModules: {
      events: true,
      studio: true,
      clubs: true,
      yardSale: true,
      literacy: false,
    },
    startPath: "/feed",
  },
  {
    id: "finance",
    label: "Finance & literacy",
    short: "Finance",
    blurb:
      "Markets 101 and professional pathways first — not day trading in-app.",
    hubTopicOrder: [
      "pro",
      "study",
      "culture",
      "chess",
      "live",
      "music",
      "fashion",
      "gaming",
      "systems",
      "med",
    ],
    connectDomainHint: "finance",
    showFacultyNav: false,
    showFocusNav: true,
    pinnedModules: {
      events: true,
      studio: false,
      clubs: true,
      yardSale: false,
      literacy: true,
    },
    startPath: "/wallet",
  },
  {
    id: "creative",
    label: "Creative & fashion",
    short: "Creative",
    blurb:
      "Studio, fashion drops, music, and Yard Sale — creator-first. Build your look and list, not only watch a wallet.",
    hubTopicOrder: [
      "fashion",
      "music",
      "live",
      "culture",
      "pro",
      "gaming",
      "systems",
      "chess",
      "study",
      "med",
    ],
    connectDomainHint: "fashion",
    showFacultyNav: false,
    showFocusNav: false,
    pinnedModules: {
      events: true,
      studio: true,
      clubs: true,
      yardSale: true,
      literacy: false,
    },
    startPath: "/hub",
  },
  {
    id: "research",
    label: "Research & med",
    short: "Research",
    blurb:
      "Study + med refresh + Connect research — Focus Path friendly for busy scholars.",
    hubTopicOrder: [
      "med",
      "study",
      "pro",
      "systems",
      "culture",
      "live",
      "chess",
      "music",
      "fashion",
      "gaming",
    ],
    connectDomainHint: "research",
    showFacultyNav: false,
    showFocusNav: true,
    pinnedModules: {
      events: true,
      studio: false,
      clubs: true,
      yardSale: false,
      literacy: true,
    },
    startPath: "/focus",
  },
  {
    id: "faculty",
    label: "Faculty & partners",
    short: "Faculty",
    blurb:
      "Lead inbox, portfolio review, and professional shelf — not student casino UX.",
    hubTopicOrder: [
      "pro",
      "med",
      "study",
      "systems",
      "culture",
      "live",
      "chess",
      "music",
      "fashion",
      "gaming",
    ],
    connectDomainHint: "research",
    showFacultyNav: true,
    showFocusNav: false,
    pinnedModules: {
      events: true,
      studio: true,
      clubs: false,
      yardSale: false,
      literacy: true,
    },
    startPath: "/connect",
  },
];

const TRACK_BY_ID = Object.fromEntries(
  DISCIPLINE_TRACKS.map((t) => [t.id, t]),
) as Record<DisciplineTrack, DisciplineTrackMeta>;

export function isDisciplineTrack(v: unknown): v is DisciplineTrack {
  return (
    v === "general" ||
    v === "social" ||
    v === "finance" ||
    v === "creative" ||
    v === "research" ||
    v === "faculty"
  );
}

export function getDisciplineTrack(
  id: DisciplineTrack | string | undefined | null,
): DisciplineTrackMeta {
  if (id && isDisciplineTrack(id)) return TRACK_BY_ID[id];
  return TRACK_BY_ID.general;
}

/** Reorder hub topic cards by track priority; unknown topics appended. */
export function orderHubTopicsForTrack<T extends { id: HubTopic }>(
  topics: T[],
  track: DisciplineTrack | string | undefined | null,
): T[] {
  const meta = getDisciplineTrack(track);
  const rank = new Map(meta.hubTopicOrder.map((id, i) => [id, i]));
  return [...topics].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id)! : 999;
    const rb = rank.has(b.id) ? rank.get(b.id)! : 999;
    return ra - rb;
  });
}

/**
 * Apply track defaults onto UI prefs-shaped objects (modules, nav flags,
 * optional start path). Avoids importing ui-prefs (circular ESM).
 */
export function applyDisciplineToUiPrefs<
  T extends {
    disciplineTrack?: DisciplineTrack;
    showFacultyNav?: boolean;
    showFocusNav?: boolean;
    pinnedModules?: DisciplinePinnedModules;
    startPath?: DisciplineStartPath;
  },
>(
  prefs: T,
  track: DisciplineTrack,
  opts?: { setStartPath?: boolean },
): T {
  const meta = getDisciplineTrack(track);
  return {
    ...prefs,
    disciplineTrack: track,
    showFacultyNav: meta.showFacultyNav,
    showFocusNav: meta.showFocusNav,
    pinnedModules: { ...meta.pinnedModules },
    startPath: opts?.setStartPath ? meta.startPath : prefs.startPath,
  };
}

/** Uplift copy for Connect / wallet surfaces by track. */
export function disciplineUpliftLine(track: DisciplineTrack): string {
  switch (track) {
    case "finance":
      return "Learn markets · build Cred · then optional settlement — never buy rank.";
    case "social":
      return "Your yard: clubs, posts, nights, fashion energy — not only someone else's finance grind.";
    case "creative":
      return "Create, list, tip creators. Spend funds people — not ads.";
    case "research":
      return "Research interest → completion → Cred. Time is scarce; paths stay low-bandwidth.";
    case "faculty":
      return "Meet students where they are. Endorse delivery. Cred before coin.";
    default:
      return "Uplift the yard: gatherings, creators, and pathways — not attention extraction.";
  }
}

/** Partner / non-finance campus life — see use-case-her-yard-path.md */
export const YOUR_YARD_TRACK: DisciplineTrack = "social";

export function isYourYardOrientedTrack(
  track: DisciplineTrack | string | undefined | null,
): boolean {
  return track === "social" || track === "creative" || track === "general";
}
