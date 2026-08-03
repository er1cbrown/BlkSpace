/**
 * Focus Mode — time + money effort management for busy underrepresented students
 * (e.g. Meharry med). Soft budgets only; not medical advice / investment advice.
 */

export type FocusPersona = "meharry_med" | "premed" | "grad_busy" | "custom";

export type FocusInterest =
  | "research"
  | "study_refresh"
  | "underrepresented_network"
  | "finance_literacy"
  | "community_service"
  | "portfolio";

export interface FocusPrefs {
  persona: FocusPersona;
  campusLabel: string;
  yardId: string;
  /** Soft cap on intentional BlkSpace minutes per week */
  weeklyMinutesBudget: number;
  /** Minutes used this week (user-logged or session ticks) */
  weeklyMinutesUsed: number;
  weekKey: string;
  /** Soft WB learn goal (not a bank) */
  weeklyWbLearnGoal: number;
  interests: FocusInterest[];
  /** Prefer low-time ProjectConnect cards (async / ≤N hrs/week tags) */
  lowBandwidthConnect: boolean;
  studyOnlyFeed: boolean;
}

const STORE = "blkspace_focus_mode_v1";

function weekKeyNow(): string {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${week}`;
}

export function defaultFocusPrefs(): FocusPrefs {
  return {
    persona: "meharry_med",
    campusLabel: "Meharry Medical College",
    yardId: "meharry",
    weeklyMinutesBudget: 90,
    weeklyMinutesUsed: 0,
    weekKey: weekKeyNow(),
    weeklyWbLearnGoal: 50,
    interests: [
      "study_refresh",
      "research",
      "underrepresented_network",
      "finance_literacy",
    ],
    lowBandwidthConnect: true,
    studyOnlyFeed: true,
  };
}

export function loadFocusPrefs(): FocusPrefs {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const p = JSON.parse(raw) as FocusPrefs;
      if (p.weekKey !== weekKeyNow()) {
        p.weekKey = weekKeyNow();
        p.weeklyMinutesUsed = 0;
        saveFocusPrefs(p);
      }
      return { ...defaultFocusPrefs(), ...p };
    }
  } catch {
    /* ignore */
  }
  const d = defaultFocusPrefs();
  saveFocusPrefs(d);
  return d;
}

export function saveFocusPrefs(p: FocusPrefs) {
  try {
    localStorage.setItem(STORE, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function logFocusMinutes(mins: number): FocusPrefs {
  const p = loadFocusPrefs();
  p.weeklyMinutesUsed = Math.max(0, p.weeklyMinutesUsed + mins);
  saveFocusPrefs(p);
  return p;
}

export function minutesRemaining(p: FocusPrefs): number {
  return Math.max(0, p.weeklyMinutesBudget - p.weeklyMinutesUsed);
}

/** Welcome / onboarding: med school → Focus Path defaults. */
export function applyMedSchoolOnboarding(opts?: {
  campusLabel?: string;
  yardId?: string;
}): FocusPrefs {
  const p = loadFocusPrefs();
  p.persona = "meharry_med";
  p.campusLabel = opts?.campusLabel || "Meharry Medical College";
  p.yardId = opts?.yardId || "meharry";
  p.lowBandwidthConnect = true;
  p.studyOnlyFeed = true;
  p.weeklyMinutesBudget = p.weeklyMinutesBudget || 90;
  p.interests = [
    "study_refresh",
    "research",
    "underrepresented_network",
    "finance_literacy",
  ];
  saveFocusPrefs(p);
  try {
    localStorage.setItem("blkspace_home_yard", p.yardId);
    localStorage.setItem("blkspace_onboarding_path", "med_focus");
  } catch {
    /* ignore */
  }
  return p;
}

export function getHomeYardId(): string {
  try {
    return localStorage.getItem("blkspace_home_yard") || loadFocusPrefs().yardId || "tsu";
  } catch {
    return "tsu";
  }
}

export function budgetPct(p: FocusPrefs): number {
  if (p.weeklyMinutesBudget <= 0) return 100;
  return Math.min(100, (p.weeklyMinutesUsed / p.weeklyMinutesBudget) * 100);
}

/** Heuristic: opportunity is "busy-student friendly" */
export function isLowBandwidthOpp(opp: {
  durationText?: string;
  description?: string;
  tagsJson?: string;
  title?: string;
}): boolean {
  const blob = `${opp.durationText || ""} ${opp.description || ""} ${opp.tagsJson || ""} ${opp.title || ""}`.toLowerCase();
  if (
    blob.includes("async") ||
    blob.includes("2-4 hr") ||
    blob.includes("2–4") ||
    blob.includes("micro") ||
    blob.includes("flex") ||
    blob.includes("low-bandwidth") ||
    blob.includes("15 min") ||
    blob.includes("30 min") ||
    blob.includes("step") ||
    blob.includes("med") ||
    blob.includes("meharry") ||
    blob.includes("clinical") ||
    blob.includes("health disparit")
  ) {
    return true;
  }
  // Short duration strings
  if (/\b(1|2|3|4)\s*(hr|hour|week)/i.test(blob)) return true;
  return false;
}

export const FOCUS_JOURNEY_STEPS = [
  {
    id: "yard",
    title: "Home yard (Meharry)",
    body: "Join your medical school yard once. Identity stays with you — not scattered GroupMes.",
    href: "/communities",
    effort: "5 min one-time",
  },
  {
    id: "study",
    title: "Study-refresh feed",
    body: "When you leave the library, open Focus → Study refresh. Med + study Hub cards only — no doomscroll of pure noise.",
    href: "/focus",
    effort: "10–20 min sessions",
  },
  {
    id: "connect",
    title: "ProjectConnect · low-bandwidth",
    body: "Express interest in async research / peer mentorship / micro-labs that respect rotations. One tap, no coffee-chat theater.",
    href: "/connect",
    effort: "2 min per interest",
  },
  {
    id: "money",
    title: "Time + money effort",
    body: "Track soft minutes on BlkSpace + learn WeixBucks / Cred / BKSPC literacy without becoming a day trader. Black dollar awareness, not casino hype.",
    href: "/wallet",
    effort: "5 min / week",
  },
  {
    id: "create",
    title: "Optional create",
    body: "Blog-space notes, Myspace-style profile, short teaching clips — only if energy remains after study.",
    href: "/hub",
    effort: "when you choose",
  },
] as const;
