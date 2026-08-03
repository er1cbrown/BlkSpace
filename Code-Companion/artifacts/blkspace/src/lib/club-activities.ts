/**
 * Club templates, reading circles, tournaments, faculty broadcast.
 * Tauri when available; localStorage demo for web.
 */
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri-api";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";

export interface ClubTemplate {
  id: string;
  name: string;
  description: string;
  channels: string[];
  suggestedEventKind: string;
}

export interface ReadingCircle {
  id: number;
  communityId: string;
  orgId?: string | null;
  title: string;
  mediaType: string;
  description: string;
  currentWork: string;
  currentChapter: string;
  createdBy: string;
  memberCount: number;
  entryCount: number;
  createdAt: string;
}

export interface ReadingEntry {
  id: number;
  circleId: number;
  handle: string;
  displayName: string;
  entryType: string;
  title: string;
  body: string;
  mediaRef: string;
  chapterLabel: string;
  createdAt: string;
}

export interface Tournament {
  id: number;
  communityId: string;
  eventId?: number | null;
  title: string;
  gameTitle: string;
  description: string;
  status: string;
  maxPlayers: number;
  prizeText: string;
  prizeWb: number;
  createdBy: string;
  entrantCount: number;
  createdAt: string;
}

export interface TournamentMatch {
  id: number;
  tournamentId: number;
  round: number;
  matchIndex: number;
  playerA?: string | null;
  playerB?: string | null;
  scoreA: number;
  scoreB: number;
  winner?: string | null;
  status: string;
  channelNote: string;
  updatedAt: string;
}

const STORE = "blkspace_club_activities_v1";

type Demo = {
  applied: Record<string, string[]>;
  circles: ReadingCircle[];
  entries: ReadingEntry[];
  tournaments: Tournament[];
  entrants: Record<number, string[]>;
  matches: TournamentMatch[];
  nextCircle: number;
  nextEntry: number;
  nextTour: number;
  nextMatch: number;
};

const TEMPLATES: ClubTemplate[] = [
  {
    id: "anime",
    name: "Anime / Manga Club",
    description:
      "Book groups, weekly reads, share & publish fan works / manga pages.",
    channels: ["general", "this-week-read", "manga-publish", "watch-party", "recs"],
    suggestedEventKind: "club",
  },
  {
    id: "gaming",
    name: "Gaming / Esports",
    description:
      "Tournaments, brackets, 1v1 match notes, prizes & merch hooks.",
    channels: ["general", "lfg", "tournament", "match-reports", "merch-drops"],
    suggestedEventKind: "social",
  },
  {
    id: "study",
    name: "Study / Wellness",
    description: "Midterm decompression, focus hours, peer accountability.",
    channels: ["general", "focus-hours", "resources", "debrief"],
    suggestedEventKind: "study",
  },
  {
    id: "faculty",
    name: "Faculty / Department",
    description: "Scholarships, research, internships relayed to the yard.",
    channels: [
      "announcements",
      "scholarships",
      "research",
      "internships",
      "office-hours",
    ],
    suggestedEventKind: "career",
  },
  {
    id: "chess",
    name: "Chess / Strategy Club",
    description:
      "Campus chess: lessons on Content Hub, Lichess/OTB play links, brackets + prize WB, coach portfolios.",
    channels: [
      "general",
      "lessons",
      "lfg-otb",
      "tournament",
      "analysis",
      "coach-board",
    ],
    suggestedEventKind: "social",
  },
  {
    id: "creators",
    name: "Creators / Media Collective",
    description:
      "Amalgamation media kit — drops, live link-outs, portfolio shares, collabs.",
    channels: [
      "general",
      "drops",
      "live-links",
      "collabs",
      "feedback",
      "monetize",
    ],
    suggestedEventKind: "social",
  },
  {
    id: "med",
    name: "Med / Meharry Focus",
    description:
      "Rotations-aware: async study refresh, low-bandwidth research, wellness, SNMA energy — not a second LMS.",
    channels: [
      "general",
      "study-refresh",
      "research-async",
      "wellness",
      "pipeline",
      "finance-lite",
    ],
    suggestedEventKind: "study",
  },
];

function defaultDemo(): Demo {
  return {
    applied: {
      tsu: ["anime", "gaming", "study"],
      meharry: ["med", "study"],
    },
    circles: [
      {
        id: 1,
        communityId: "tsu",
        orgId: "org_club",
        title: "Tiger Anime Club · Weekly Read",
        mediaType: "manga",
        description: "Share chapter thoughts, publish fan pages, drop recs.",
        currentWork: "One Piece (re-read arcs)",
        currentChapter: "Ch. 550+",
        createdBy: "campus_king",
        memberCount: 2,
        entryCount: 2,
        createdAt: new Date().toISOString(),
      },
    ],
    entries: [
      {
        id: 1,
        circleId: 1,
        handle: "campus_king",
        displayName: "Campus King",
        entryType: "rec",
        title: "Why we're starting with Marineford",
        body: "Peak stakes arc — discuss character writing this week.",
        mediaRef: "",
        chapterLabel: "Ch. 550+",
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        circleId: 1,
        handle: "demo_user",
        displayName: "Demo User",
        entryType: "publish",
        title: "Fan panel: Luffy gear sketch",
        body: "Original panel practice — feedback welcome.",
        mediaRef: "art:luffy-sketch",
        chapterLabel: "OC page 1",
        createdAt: new Date().toISOString(),
      },
    ],
    tournaments: [
      {
        id: 1,
        communityId: "tsu",
        title: "TSU Friday Night Fighters",
        gameTitle: "Street Fighter 6",
        description:
          "Single-elim campus cup. Report scores in #match-reports. Prizes + merch on Yard Sale.\n[[live:https://www.twitch.tv/]]",
        status: "open",
        maxPlayers: 8,
        prizeText: "1st: 50 WB + sticker pack · 2nd: 20 WB",
        prizeWb: 50,
        createdBy: "demo_user",
        entrantCount: 4,
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        communityId: "tsu",
        title: "HBCU Chess Classic · R1",
        gameTitle: "Chess",
        description:
          "Campus cup. Play on Lichess or OTB; report scores here. Lessons on Content Hub.\n[[play:https://lichess.org/]]",
        status: "open",
        maxPlayers: 16,
        prizeText: "1st: 80 WB · 2nd: 40 WB · coach shout-out",
        prizeWb: 80,
        createdBy: "campus_king",
        entrantCount: 3,
        createdAt: new Date().toISOString(),
      },
    ],
    entrants: {
      1: ["demo_user", "campus_king", "jane_doe", "hbcustudent"],
      2: ["campus_king", "demo_user", "jane_doe"],
    },
    matches: [],
    nextCircle: 2,
    nextEntry: 3,
    nextTour: 3,
    nextMatch: 1,
  };
}

function load(): Demo {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return JSON.parse(raw) as Demo;
  } catch {
    /* ignore */
  }
  const d = defaultDemo();
  save(d);
  return d;
}

function save(d: Demo) {
  localStorage.setItem(STORE, JSON.stringify(d));
}

export async function listClubTemplates(): Promise<ClubTemplate[]> {
  if (isTauri()) return invoke("list_club_templates");
  return TEMPLATES;
}

export async function applyClubTemplate(
  communityId: string,
  templateId: string,
): Promise<{ channelsCreated: string[]; name: string }> {
  if (isTauri()) {
    return invoke("apply_club_template", {
      sessionToken: getSessionToken() || "",
      communityId,
      templateId,
    });
  }
  const d = load();
  const list = d.applied[communityId] || [];
  if (!list.includes(templateId)) {
    list.push(templateId);
    d.applied[communityId] = list;
    save(d);
  }
  const t = TEMPLATES.find((x) => x.id === templateId);
  return {
    channelsCreated: t?.channels || [],
    name: t?.name || templateId,
  };
}

export async function listAppliedClubTemplates(
  communityId: string,
): Promise<string[]> {
  if (isTauri()) {
    return invoke("list_applied_club_templates", { communityId });
  }
  return load().applied[communityId] || [];
}

export async function listReadingCircles(
  communityId: string,
): Promise<ReadingCircle[]> {
  if (isTauri()) return invoke("list_reading_circles", { communityId });
  return load().circles.filter((c) => c.communityId === communityId);
}

export async function createReadingCircle(args: {
  communityId: string;
  title: string;
  mediaType: string;
  description: string;
  currentWork: string;
  orgId?: string | null;
}): Promise<ReadingCircle> {
  if (isTauri()) {
    return invoke("create_reading_circle", {
      sessionToken: getSessionToken() || "",
      ...args,
      orgId: args.orgId ?? null,
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const d = load();
  const c: ReadingCircle = {
    id: d.nextCircle++,
    communityId: args.communityId,
    orgId: args.orgId,
    title: args.title,
    mediaType: args.mediaType,
    description: args.description,
    currentWork: args.currentWork,
    currentChapter: "",
    createdBy: me,
    memberCount: 1,
    entryCount: 0,
    createdAt: new Date().toISOString(),
  };
  d.circles.unshift(c);
  save(d);
  return c;
}

export async function joinReadingCircle(circleId: number): Promise<void> {
  if (isTauri()) {
    await invoke("join_reading_circle", {
      sessionToken: getSessionToken() || "",
      circleId,
    });
    return;
  }
  const d = load();
  const c = d.circles.find((x) => x.id === circleId);
  if (c) c.memberCount += 1;
  save(d);
}

export async function setReadingCurrent(
  circleId: number,
  work: string,
  chapter: string,
): Promise<void> {
  if (isTauri()) {
    await invoke("set_reading_current", {
      sessionToken: getSessionToken() || "",
      circleId,
      work,
      chapter,
    });
    return;
  }
  const d = load();
  const c = d.circles.find((x) => x.id === circleId);
  if (c) {
    c.currentWork = work;
    c.currentChapter = chapter;
  }
  save(d);
}

export async function addReadingEntry(args: {
  circleId: number;
  entryType: string;
  title: string;
  body: string;
  mediaRef: string;
  chapterLabel: string;
}): Promise<ReadingEntry> {
  if (isTauri()) {
    return invoke("add_reading_entry", {
      sessionToken: getSessionToken() || "",
      ...args,
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const d = load();
  const e: ReadingEntry = {
    id: d.nextEntry++,
    circleId: args.circleId,
    handle: me,
    displayName: me,
    entryType: args.entryType,
    title: args.title,
    body: args.body,
    mediaRef: args.mediaRef,
    chapterLabel: args.chapterLabel,
    createdAt: new Date().toISOString(),
  };
  d.entries.unshift(e);
  const c = d.circles.find((x) => x.id === args.circleId);
  if (c) c.entryCount += 1;
  save(d);
  return e;
}

export async function listReadingEntries(
  circleId: number,
): Promise<ReadingEntry[]> {
  if (isTauri()) return invoke("list_reading_entries", { circleId });
  return load().entries.filter((e) => e.circleId === circleId);
}

export async function listTournaments(
  communityId: string,
): Promise<Tournament[]> {
  if (isTauri()) return invoke("list_tournaments", { communityId });
  return load().tournaments.filter((t) => t.communityId === communityId);
}

export async function createTournament(args: {
  communityId: string;
  title: string;
  gameTitle: string;
  description: string;
  maxPlayers: number;
  prizeText: string;
  prizeWb: number;
  eventId?: number | null;
}): Promise<Tournament> {
  if (isTauri()) {
    return invoke("create_tournament", {
      sessionToken: getSessionToken() || "",
      ...args,
      eventId: args.eventId ?? null,
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const d = load();
  const t: Tournament = {
    id: d.nextTour++,
    communityId: args.communityId,
    eventId: args.eventId,
    title: args.title,
    gameTitle: args.gameTitle,
    description: args.description,
    status: "open",
    maxPlayers: args.maxPlayers,
    prizeText: args.prizeText,
    prizeWb: args.prizeWb,
    createdBy: me,
    entrantCount: 1,
    createdAt: new Date().toISOString(),
  };
  d.tournaments.unshift(t);
  d.entrants[t.id] = [me];
  save(d);
  return t;
}

export async function registerTournament(
  tournamentId: number,
): Promise<{ registered: boolean }> {
  if (isTauri()) {
    return invoke("register_tournament", {
      sessionToken: getSessionToken() || "",
      tournamentId,
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const d = load();
  const list = d.entrants[tournamentId] || [];
  if (!list.includes(me)) {
    list.push(me);
    d.entrants[tournamentId] = list;
    const t = d.tournaments.find((x) => x.id === tournamentId);
    if (t) t.entrantCount = list.length;
    save(d);
  }
  return { registered: true };
}

export async function listTournamentEntrants(
  tournamentId: number,
): Promise<{ handle: string; displayName: string; seed: number }[]> {
  if (isTauri()) {
    return invoke("list_tournament_entrants", { tournamentId });
  }
  return (load().entrants[tournamentId] || []).map((h, i) => ({
    handle: h,
    displayName: h,
    seed: i + 1,
  }));
}

export async function generateTournamentBracket(
  tournamentId: number,
): Promise<TournamentMatch[]> {
  if (isTauri()) {
    return invoke("generate_tournament_bracket", {
      sessionToken: getSessionToken() || "",
      tournamentId,
    });
  }
  const d = load();
  let entrants = [...(d.entrants[tournamentId] || [])];
  if (entrants.length < 2) throw new Error("Need at least 2 entrants");
  let n = 2;
  while (n < entrants.length) n *= 2;
  while (entrants.length < n) entrants.push("");
  d.matches = d.matches.filter((m) => m.tournamentId !== tournamentId);
  const out: TournamentMatch[] = [];
  for (let i = 0; i < entrants.length; i += 2) {
    const a = entrants[i] || null;
    const b = entrants[i + 1] || null;
    const m: TournamentMatch = {
      id: d.nextMatch++,
      tournamentId,
      round: 1,
      matchIndex: i / 2,
      playerA: a,
      playerB: b,
      scoreA: 0,
      scoreB: 0,
      winner: a && !b ? a : b && !a ? b : null,
      status: a && b ? "pending" : "bye",
      channelNote:
        a && b
          ? `1v1: @${a} vs @${b} — report score in #match-reports`
          : `Bye → @${a || b}`,
      updatedAt: new Date().toISOString(),
    };
    out.push(m);
    d.matches.push(m);
  }
  const t = d.tournaments.find((x) => x.id === tournamentId);
  if (t) t.status = "active";
  save(d);
  return out;
}

export async function listTournamentMatches(
  tournamentId: number,
): Promise<TournamentMatch[]> {
  if (isTauri()) return invoke("list_tournament_matches", { tournamentId });
  return load().matches.filter((m) => m.tournamentId === tournamentId);
}

export async function reportTournamentMatch(
  matchId: number,
  scoreA: number,
  scoreB: number,
): Promise<TournamentMatch> {
  if (isTauri()) {
    return invoke("report_tournament_match", {
      sessionToken: getSessionToken() || "",
      matchId,
      scoreA,
      scoreB,
    });
  }
  if (scoreA === scoreB) throw new Error("Scores cannot be tied");
  const d = load();
  const m = d.matches.find((x) => x.id === matchId);
  if (!m) throw new Error("Match not found");
  m.scoreA = scoreA;
  m.scoreB = scoreB;
  m.winner = scoreA > scoreB ? m.playerA : m.playerB;
  m.status = "complete";
  m.channelNote = `Final ${scoreA}-${scoreB} · winner @${m.winner}`;
  m.updatedAt = new Date().toISOString();
  save(d);
  return m;
}

export async function broadcastOpportunityToYard(
  opportunityId: number,
): Promise<unknown> {
  if (isTauri()) {
    return invoke("broadcast_opportunity_to_yard", {
      sessionToken: getSessionToken() || "",
      opportunityId,
    });
  }
  // Web: stash a feed-like notice
  const key = "blkspace_broadcast_notices_v1";
  const prev = JSON.parse(localStorage.getItem(key) || "[]") as unknown[];
  prev.unshift({
    opportunityId,
    at: new Date().toISOString(),
    by: getCurrentHandle() || "demo_user",
  });
  localStorage.setItem(key, JSON.stringify(prev.slice(0, 20)));
  return { ok: true };
}
