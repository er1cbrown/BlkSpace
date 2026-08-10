/**
 * ProjectB (XK20) = ProjectBlackSpaceFighters
 *
 * Super BlkSpace Fighters series — three Flash-nostalgia homebrew titles on Yard Arcade.
 *
 *   YDB1  Yard Day Brawl 1.0           — Newgrounds Rumble *class* (least cast)
 *   XQ5D  Super BlkSpace Fighters 2.0  — Super Smash Flash *class* (platformer depth)
 *   5DXQ  SBF Tag 3.0                  — Capoeira Fighter *craft* + 2XKO-style tag
 *                                         (HBCU mascot staples, expansion pack)
 *
 * Mechanical lineage only. NOT NG/Nintendo/CF/Riot assets.
 * Play = Yard Arcade WASM/homebrew — not ROMs.
 * Full series vision: docs/features/super-blkspace-fighters-series.md
 */

import { createYardEvent, type YardEvent } from "@/lib/yard-events";
import {
  createTournament,
  type Tournament,
} from "@/lib/club-activities";
import { embedAmalgamationMeta } from "@/lib/amalgamation-meta";
import { grantLeagueBadge } from "@/lib/yard-spirit";
import { injectHubItemsIfAbsent, type HubItem } from "@/lib/content-hub";
import type { PrizeLadder } from "@/lib/tournament-prizes";

/** Codename ProjectB */
export const PROJECT_B = "ProjectB";
/** Internal series id */
export const PROJECT_B_ID = "XK20";
/** Full series name */
export const PROJECT_BLACK_SPACE_FIGHTERS = "ProjectBlackSpaceFighters";
/**
 * @deprecated Prefer per-game ids. Historically pointed at 2.0 (XQ5D).
 * Game 3 product id is 5DXQ (corrected).
 */
export const PROJECT_BLACK_SPACE_FIGHTERS_ID = "XQ5D";

/** Game 1 product id — Yard Day Brawl 1.0 */
export const PRODUCT_ID_YARD_DAY_BRAWL = "YDB1";
/** Game 2 product id — Super BlkSpace Fighters 2.0 (Smash Flash class) */
export const PRODUCT_ID_SBF_2 = "XQ5D";
/** Game 3 product id — SBF Tag 3.0 (Capoeira craft + tag expansion) */
export const PRODUCT_ID_SBF_TAG_3 = "5DXQ";

export type SbfSeriesEntry = {
  productId: string;
  version: string;
  title: string;
  nostalgiaClass: string;
  castNote: string;
  headline: string;
};

/** Ordered Super BlkSpace Fighters trilogy */
export const SBF_SERIES: readonly SbfSeriesEntry[] = [
  {
    productId: PRODUCT_ID_YARD_DAY_BRAWL,
    version: "1.0",
    title: "Yard Day Brawl",
    nostalgiaClass: "Newgrounds Rumble class",
    castNote: "Least characters — campus archetypes only",
    headline: "Arena brawler · club night chaos · soft WB brackets",
  },
  {
    productId: PRODUCT_ID_SBF_2,
    version: "2.0",
    title: "Super BlkSpace Fighters",
    nostalgiaClass: "Super Smash Flash class",
    castNote: "More characters · better platforming",
    headline: "% KO platform fighter · deeper specials · yard stages",
  },
  {
    productId: PRODUCT_ID_SBF_TAG_3,
    version: "3.0",
    title: "Super BlkSpace Fighters: Tag",
    nostalgiaClass: "Capoeira Fighter craft + 2XKO-style tag + MUGEN host energy",
    castNote: "Staple HBCU-inspired mascots (original designs) + series vets",
    headline:
      "Culture movement kits · tag/assist · full expansion-pack download",
  },
] as const;

/** Player-facing series title */
export const SUPER_BLKSPACE_FIGHTERS = "Super BlkSpace Fighters";
/** Short UI tag */
export const SBF_SHORT = "SBF";
/** Game 1 display name */
export const YARD_DAY_BRAWL_TITLE = "Yard Day Brawl";
/** @deprecated alias — series title; prefer YARD_DAY_BRAWL_TITLE for 1.0 */
export const YARD_DAY_BRAWL_NAME = SUPER_BLKSPACE_FIGHTERS;

/** Umbrella identity */
export const PROJECT_B_EQUATION =
  "ProjectB(XK20) = ProjectBlackSpaceFighters";

/** Per-title product lines */
export const SBF_PRODUCT_LINES =
  "YDB1→Yard Day Brawl 1.0 · XQ5D→SBF 2.0 · 5DXQ→SBF Tag 3.0";

/** Online connectivity target — Tough Love Arena class (design; not shipped) */
export const SBF_NETPLAY_TARGET =
  "Rollback netplay (GGPO-class): WeixNet lobby/signaling + P2P inputs — not Nostr-per-frame. " +
  "See docs/features/sbf-rollback-netplay.md";

export const YARD_DAY_BRAWL_SCOPE =
  `${PROJECT_B_EQUATION} · ${SBF_PRODUCT_LINES}. ` +
  "HBCU fighters trilogy: Flash nostalgia classes (Rumble → Smash Flash → Capoeira/tag). " +
  "Original roster only — not NG icons, not Nintendo, not Capoeira Fighter assets, not Riot. " +
  "Host = Club modes + brackets + soft WB + Arcade homebrew/WASM. " +
  `Online target: ${SBF_NETPLAY_TARGET}`;

/** Original fighters — campus archetypes, not NG icons */
export const BRAWL_FIGHTERS = [
  {
    id: "tiger_scout",
    name: "Tiger Scout",
    blurb: "First-year energy. Fast dash, weak specials.",
    yard: "tsu",
  },
  {
    id: "lab_rat",
    name: "Lab Rat",
    blurb: "STEM grind. Projectiles of coffee and late-night code.",
    yard: "tsu",
  },
  {
    id: "yard_dj",
    name: "Yard DJ",
    blurb: "Profile song main. Soundwave pokes, crowd buffs.",
    yard: "howard",
  },
  {
    id: "fashion_fox",
    name: "Fashion Fox",
    blurb: "Yard Sale flex. Style counters and drip armor.",
    yard: "howard",
  },
  {
    id: "focus_med",
    name: "Focus Med",
    blurb: "Meharry path. Steady blocks, clutch heals, no PHI jokes.",
    yard: "meharry",
  },
  {
    id: "connect_lead",
    name: "Connect Lead",
    blurb: "ProjectConnect energy. Tag-team assist from alumni ghost.",
    yard: "tsu",
  },
  {
    id: "arcade_kid",
    name: "Arcade Kid",
    blurb: "Yard Newgrounds jammer. Chaos specials, short hop.",
    yard: "fisk",
  },
  {
    id: "mod_marshal",
    name: "Mod Marshal",
    blurb: "Yard mod. Ban hammer (soft), slow but heavy.",
    yard: "tsu",
  },
] as const;

/** Original stages — campus places, not Portal/Madness sets */
export const BRAWL_STAGES = [
  {
    id: "student_center",
    name: "Student Center Plaza",
    blurb: "Open mid, food-court hazards (soft).",
  },
  {
    id: "library_stacks",
    name: "Library Stacks",
    blurb: "Tight corridors, quiet-zone stun.",
  },
  {
    id: "quad_night",
    name: "Quad at Night",
    blurb: "Wide stage, homecoming lights.",
  },
  {
    id: "lab_bench",
    name: "Open Lab Bench",
    blurb: "Platforms = tables, spill zones.",
  },
  {
    id: "yard_sale_row",
    name: "Yard Sale Row",
    blurb: "Merch stalls as soft walls.",
  },
  {
    id: "mesh_roof",
    name: "Mesh Roof Node",
    blurb: "Sci-fi Wi‑Fi dish stage — WeixNet lore.",
  },
] as const;

export type BrawlModeId = "story" | "versus" | "survival" | "challenge";

export const BRAWL_MODES: {
  id: BrawlModeId;
  label: string;
  blurb: string;
  eventKind: string;
}[] = [
  {
    id: "story",
    label: "Story",
    blurb: "Solo path: welcome → club trials → Yard Day finale (narrative posts).",
    eventKind: "tournament",
  },
  {
    id: "versus",
    label: "Versus",
    blurb: "1v1 or free-for-all bracket. Report scores; multi-round auto-advance.",
    eventKind: "tournament",
  },
  {
    id: "survival",
    label: "Survival",
    blurb: "Wave challenge — how many club bots can you outlast? Soft WB by wave.",
    eventKind: "social",
  },
  {
    id: "challenge",
    label: "Challenge",
    blurb: "Medal-style goals (no-damage, time attack) for spirit badges.",
    eventKind: "club",
  },
];

export const YARD_DAY_BRAWL_LADDER: PrizeLadder = {
  firstWb: 100,
  secondWb: 40,
  thirdCosmeticId: "badge_yard_day_brawl",
  freeClothingTitle: "ProjectB / SBF · Free spirit tee claim",
  freeClothingBlurb:
    "Podium free campus clothing claim (0 WB Yard Sale). ProjectB(XK20)=ProjectBlackSpaceFighters · YDB1/XQ5D/5DXQ. Pickup on yard — not USD shipping. Original IP only.",
};

export interface YardDayBrawlInput {
  communityId: string;
  mode?: BrawlModeId;
  title?: string;
  /** Homebrew WASM/static brawl or placeholder jam URL */
  playUrl?: string;
  liveUrl?: string;
  clubChannel?: string;
  ticketPriceWb?: number;
  capacity?: number;
  prizeWb?: number;
  maxPlayers?: number;
  startsAt?: string;
  stageId?: string;
}

export interface YardDayBrawlResult {
  event: YardEvent;
  tournament: Tournament;
  mode: BrawlModeId;
  stageId: string;
}

function defaultStartsAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(19, 0, 0, 0);
  return d.toISOString().slice(0, 19);
}

/**
 * Host a Yard Day Brawl pack: event + tournament + spectator meta.
 * Explicitly original — no Newgrounds character names in payload.
 */
export async function hostYardDayBrawl(
  input: YardDayBrawlInput,
): Promise<YardDayBrawlResult> {
  const mode = input.mode || "versus";
  const modeMeta = BRAWL_MODES.find((m) => m.id === mode) || BRAWL_MODES[1];
  const stage =
    BRAWL_STAGES.find((s) => s.id === input.stageId) || BRAWL_STAGES[0];
  const title =
    input.title?.trim() ||
    `${SUPER_BLKSPACE_FIGHTERS} · ${modeMeta.label} · ${stage.name}`;

  // Prefer Arcade / homebrew jam URL — never claim NG Rumble / Flash ROM
  const playUrl =
    input.playUrl?.trim() ||
    "https://webassembly.github.io/wabt/demo/";
  const liveUrl = input.liveUrl?.trim() || "";
  const clubChannel = input.clubChannel?.trim() || "#sbf-watch";
  const prizeWb = Math.max(
    0,
    Math.floor(input.prizeWb ?? YARD_DAY_BRAWL_LADDER.firstWb),
  );
  const ticket = Math.max(0, Math.floor(input.ticketPriceWb ?? 3));
  const capacity = input.capacity ?? 32;
  const maxPlayers = input.maxPlayers ?? 16;
  const startsAt = input.startsAt || defaultStartsAt();

  const roster = BRAWL_FIGHTERS.map((f) => f.name).join(", ");
  const body = [
    `${PROJECT_B_EQUATION}`,
    `${SBF_PRODUCT_LINES}`,
    `${SUPER_BLKSPACE_FIGHTERS} series night — Flash nostalgia classes, all original BlkSpace.`,
    `Hosting shell: ${YARD_DAY_BRAWL_TITLE} (${PRODUCT_ID_YARD_DAY_BRAWL}) / SBF 2.0 (${PRODUCT_ID_SBF_2}). Tag 3.0 id ${PRODUCT_ID_SBF_TAG_3}.`,
    `Mode: ${modeMeta.label}. ${modeMeta.blurb}`,
    `Stage: ${stage.name}. ${stage.blurb}`,
    `Fighters: ${roster}.`,
    "Mechanical lineage only: Rumble / Smash Flash / Capoeira+tag *classes* — never those games' assets.",
    "Play: club homebrew / WASM jam (Flash *feel*, modern web). Report scores on the bracket.",
    "Prizes: soft WB + SBF spirit pin + optional free clothing claim.",
    `Spectator hub: ${clubChannel}.`,
  ].join("\n\n");

  const description = embedAmalgamationMeta(body, {
    playUrl,
    liveUrl: liveUrl || undefined,
    clubChannel,
    prizeWb: prizeWb > 0 ? prizeWb : undefined,
  });

  const event = await createYardEvent({
    communityId: input.communityId,
    title,
    description,
    location: `Virtual / club · stage: ${stage.name}`,
    startsAt,
    capacity,
    ticketPriceWb: ticket,
    eventKind: modeMeta.eventKind,
    requiresOrgMember: false,
  });

  const tournament = await createTournament({
    communityId: input.communityId,
    title,
    gameTitle: SUPER_BLKSPACE_FIGHTERS,
    description,
    maxPlayers,
    prizeText: `1st ${YARD_DAY_BRAWL_LADDER.firstWb} WB · 2nd ${YARD_DAY_BRAWL_LADDER.secondWb} WB · 3rd free SBF series pin · clothing claim`,
    prizeWb,
    eventId: event.id,
  });

  grantLeagueBadge("badge_yard_day_brawl");

  return { event, tournament, mode, stageId: stage.id };
}

export function onYardDayBrawlEnter(): void {
  grantLeagueBadge("badge_yard_day_brawl");
}

/** Seed Arcade — ProjectB trilogy (YDB1 / XQ5D / 5DXQ) */
export function ensureYardDayBrawlArcadeSeed(): void {
  try {
    const flag = "blkspace_projectb_series_seed_v2";
    if (localStorage.getItem(flag)) return;
    const now = Date.now();
    const seriesBlurb = SBF_SERIES.map(
      (g) =>
        `${g.productId} ${g.title} ${g.version} — ${g.nostalgiaClass}. ${g.castNote}. ${g.headline}`,
    ).join("\n");
    const seeds: HubItem[] = [
      {
        id: `sbf_seed_${now}`,
        topic: "gaming",
        kind: "playable",
        title: `${SUPER_BLKSPACE_FIGHTERS} series · ${PROJECT_B} jam slot`,
        body: [
          PROJECT_B_EQUATION,
          SBF_PRODUCT_LINES,
          seriesBlurb,
          "Original fighters: Tiger Scout, Lab Rat, Yard DJ… → mascot staples in 5DXQ.",
          "Host from Club → ProjectB · SBF. Plug WASM/homebrew here.",
          "Mechanical lineage only — not NG/SSF/CF/2XKO assets.",
          "[[size:tier0]]",
        ].join("\n"),
        mediaUrl: "https://webassembly.github.io/wabt/demo/",
        authorHandle: "yard_arcade",
        authorDisplayName: "Yard Arcade",
        yardId: "tsu",
        createdAt: new Date(now - 600_000).toISOString(),
        earnHint: "Free · XK20 · YDB1 · XQ5D · 5DXQ",
      },
      {
        id: `sbf_tag_seed_${now}`,
        topic: "gaming",
        kind: "playable",
        title: `SBF Tag 3.0 · ${PRODUCT_ID_SBF_TAG_3} expansion slot`,
        body: [
          `Product id ${PRODUCT_ID_SBF_TAG_3} — Capoeira Fighter *craft* + 2XKO-style tag.`,
          "Full expansion-pack download class [[size:full]] when binary ships.",
          "HBCU-inspired mascot staples (original designs) + tag/assist.",
          "MUGEN-style host energy on WeixNet — our packs only.",
          "[[size:full]]",
        ].join("\n"),
        mediaUrl: "https://webassembly.github.io/wabt/demo/",
        authorHandle: "yard_arcade",
        authorDisplayName: "Yard Arcade",
        yardId: "tsu",
        createdAt: new Date(now - 500_000).toISOString(),
        earnHint: "Full pack · 5DXQ · tag expansion",
      },
    ];
    injectHubItemsIfAbsent(seeds);
    localStorage.setItem(flag, "1");
  } catch {
    /* ignore */
  }
}
