/**
 * Faculty Desk — private-university / HBCU faculty on ProjectConnect.
 * Where underrepresented students already are (Meharry + HBCU yards).
 * Analog map: LinkedIn · Handshake · Discord · Workday/Indeed · GroupMe/Slack.
 */

export type FacultyAffiliation =
  | "private_university"
  | "hbcu_faculty"
  | "industry_partner"
  | "other";

export interface FacultyPrefs {
  roleLabel: string;
  institution: string;
  affiliation: FacultyAffiliation;
  /** Primary yard to broadcast into (often meharry / tsu for Nashville pipeline) */
  targetYardId: string;
  department: string;
  /** Soft weekly minutes for community engagement */
  weeklyMinutesBudget: number;
  weeklyMinutesUsed: number;
  weekKey: string;
  wantsPipeline: boolean;
  wantsResearchAssistants: boolean;
  wantsServicePartners: boolean;
}

const STORE = "blkspace_faculty_desk_v1";

function weekKeyNow(): string {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${week}`;
}

export function defaultFacultyPrefs(): FacultyPrefs {
  return {
    roleLabel: "Faculty",
    institution: "Private University (Nashville region)",
    affiliation: "private_university",
    targetYardId: "meharry",
    department: "Biomedical / Public Health",
    weeklyMinutesBudget: 60,
    weeklyMinutesUsed: 0,
    weekKey: weekKeyNow(),
    wantsPipeline: true,
    wantsResearchAssistants: true,
    wantsServicePartners: true,
  };
}

export function loadFacultyPrefs(): FacultyPrefs {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const p = JSON.parse(raw) as FacultyPrefs;
      if (p.weekKey !== weekKeyNow()) {
        p.weekKey = weekKeyNow();
        p.weeklyMinutesUsed = 0;
        saveFacultyPrefs(p);
      }
      return { ...defaultFacultyPrefs(), ...p };
    }
  } catch {
    /* ignore */
  }
  const d = defaultFacultyPrefs();
  saveFacultyPrefs(d);
  return d;
}

export function saveFacultyPrefs(p: FacultyPrefs) {
  try {
    localStorage.setItem(STORE, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function applyFacultyOnboarding(opts?: {
  institution?: string;
  targetYardId?: string;
  department?: string;
}): FacultyPrefs {
  const p = loadFacultyPrefs();
  p.affiliation = "private_university";
  p.institution = opts?.institution || p.institution;
  p.targetYardId = opts?.targetYardId || "meharry";
  p.department = opts?.department || p.department;
  p.wantsPipeline = true;
  p.wantsResearchAssistants = true;
  saveFacultyPrefs(p);
  try {
    localStorage.setItem("blkspace_onboarding_path", "faculty_desk");
    localStorage.setItem("blkspace_home_yard", p.targetYardId);
    setFacultyBadge(true, p.institution);
  } catch {
    /* ignore */
  }
  return p;
}

const BADGE_KEY = "blkspace_faculty_badge_v1";

export type FacultyBadge = {
  enabled: boolean;
  institution: string;
  selfAttested: boolean;
  at: string;
};

export function setFacultyBadge(enabled: boolean, institution?: string) {
  const badge: FacultyBadge = {
    enabled,
    institution: institution || loadFacultyPrefs().institution,
    selfAttested: true,
    at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(BADGE_KEY, JSON.stringify(badge));
  } catch {
    /* ignore */
  }
}

export function getFacultyBadge(forHandle?: string | null): FacultyBadge | null {
  try {
    // Self-attested badge is device-local for current user only
    const me = localStorage.getItem("blkspace_handle");
    if (forHandle && me && forHandle !== me) return null;
    const raw = localStorage.getItem(BADGE_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as FacultyBadge;
    return b.enabled ? b : null;
  } catch {
    return null;
  }
}

export function logFacultyMinutes(mins: number): FacultyPrefs {
  const p = loadFacultyPrefs();
  p.weeklyMinutesUsed = Math.max(0, p.weeklyMinutesUsed + mins);
  saveFacultyPrefs(p);
  return p;
}

/** Competitor feature → BlkSpace surface (honest mapping). */
export const FACULTY_STACK_MAP = [
  {
    competitor: "LinkedIn",
    blkspace: "Pro profiles · Yard Cred · endorsements",
    use: "Find underrepresented talent with portable identity, not cold InMail spam.",
  },
  {
    competitor: "Handshake",
    blkspace: "ProjectConnect opportunities + express interest",
    use: "Post research / intern / RA roles where Meharry & HBCU students already live.",
  },
  {
    competitor: "Indeed / Workday (lite)",
    blkspace: "Open roles as Connect opps (soft apply, not ATS)",
    use: "Discovery + interest graph — not full HRIS payroll.",
  },
  {
    competitor: "Discord / Slack / GroupMe",
    blkspace: "Yards · channels · secure handle DMs · faculty broadcast",
    use: "Be in the community fabric; DMs are handle-to-handle with No-PHI ethics — not hospital email.",
  },
  {
    competitor: "Campus career portal",
    blkspace: "Yard broadcast + lead inbox",
    use: "Push one opportunity to the yard feed; manage interested students in inbox.",
  },
] as const;

export const FACULTY_BENEFITS = [
  {
    title: "Pipeline to underrepresented talent",
    body: "Meharry + HBCU yards concentrate students private universities often miss on LinkedIn alone.",
  },
  {
    title: "Low-friction posting",
    body: "Create org → post opportunity → broadcast to yard. Students express interest in minutes.",
  },
  {
    title: "Lead inbox",
    body: "See who expressed interest, skills snapshot, optional GPA (privacy-gated).",
  },
  {
    title: "Cred & reputation",
    body: "Completions and endorsements build Yard Cred — signal good partners for future funding / collabs.",
  },
  {
    title: "Community legitimacy",
    body: "Show up where culture lives (feed, Hub, events) — not extractive drive-by recruiting only.",
  },
  {
    title: "Soft economy literacy",
    body: "Students learn WeixBucks / Cred / gated BKSPC. Faculty model ethical opportunity, not coin hype.",
  },
] as const;

export const FACULTY_JOURNEY = [
  {
    id: "join",
    title: "Stand where the community is",
    body: "Create a research/professional org tied to Meharry or an HBCU yard. Optional: join yard as faculty ally.",
    href: "/connect",
    effort: "10 min",
  },
  {
    id: "post",
    title: "Post an opportunity",
    body: "RA, summer research, pipeline mentorship, clinical data literacy — mark duration as low-bandwidth when possible.",
    href: "/faculty",
    effort: "5 min",
  },
  {
    id: "broadcast",
    title: "Broadcast to yard",
    body: "Push to Meharry / TSU feed so students see it without hunting Handshake.",
    href: "/connect",
    effort: "1 min",
  },
  {
    id: "inbox",
    title: "Review interest",
    body: "Lead inbox: reply, complete engagements, grow Cred.",
    href: "/connect/inbox",
    effort: "ongoing",
  },
  {
    id: "talent",
    title: "Open-to board",
    body: "Scan students who flagged Open to research / work on Pro Profile.",
    href: "/connect",
    effort: "5 min / week",
  },
] as const;
