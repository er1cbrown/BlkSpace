/**
 * ProjectConnectBKSPC — credibility layer client.
 * Uses Tauri when available; otherwise in-memory demo store for web promo demos.
 */
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri-api";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";

export type OrgType =
  | "research"
  | "professional"
  | "club"
  | "service"
  | "peer";

export interface ConnectOrg {
  id: string;
  slug: string;
  name: string;
  orgType: string;
  yardId: string;
  description: string;
  createdBy: string;
  memberCount: number;
  opportunityCount: number;
  createdAt: string;
}

export interface ConnectOpportunity {
  id: number;
  orgId: string;
  orgName: string;
  orgType: string;
  title: string;
  description: string;
  durationText: string;
  tagsJson: string;
  status: string;
  createdBy: string;
  interestCount: number;
  createdAt: string;
}

export interface ConnectInterest {
  id: number;
  opportunityId: number;
  opportunityTitle: string;
  orgName: string;
  handle: string;
  displayName: string;
  message: string;
  skillsSnapshot: string;
  classification: string;
  /** Only set when applicant shared with org leads */
  gpa: string;
  gpaShared: boolean;
  status: string;
  createdAt: string;
  yardCred: number;
}

export interface YardCred {
  handle: string;
  score: number;
  karma: number;
  completions: number;
  endorsements: number;
  orgsJoined: number;
  interests: number;
}

export const ORG_TYPES: { id: OrgType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "research", label: "Research" },
  { id: "professional", label: "Professional" },
  { id: "club", label: "Club" },
  { id: "service", label: "Service" },
  { id: "peer", label: "Peer" },
];

// ─── Web demo store ──────────────────────────────────────

const DEMO_ORGS: ConnectOrg[] = [
  {
    id: "org_nsbe_tsu",
    slug: "nsbe-tsu",
    name: "NSBE @ TSU",
    orgType: "professional",
    yardId: "tsu",
    description:
      "National Society of Black Engineers — TSU chapter. Career prep, hackathons, peer mentorship.",
    createdBy: "demo_user",
    memberCount: 2,
    opportunityCount: 1,
    createdAt: "2026-06-01T12:00:00",
  },
  {
    id: "org_lab_ai",
    slug: "tsu-ai-lab",
    name: "TSU AI Research Lab",
    orgType: "research",
    yardId: "tsu",
    description:
      "Faculty-led research on ML, privacy, and secure systems. Open to motivated students.",
    createdBy: "demo_user",
    memberCount: 2,
    opportunityCount: 2,
    createdAt: "2026-06-01T12:00:00",
  },
  {
    id: "org_service",
    slug: "tiger-service",
    name: "Tiger Community Service Hub",
    orgType: "service",
    yardId: "tsu",
    description:
      "Volunteer projects with Nashville partners — tutoring, food drives, campus clean-ups.",
    createdBy: "jane_doe",
    memberCount: 1,
    opportunityCount: 1,
    createdAt: "2026-06-02T12:00:00",
  },
  {
    id: "org_club",
    slug: "yard-creatives",
    name: "Yard Creatives Club",
    orgType: "club",
    yardId: "tsu",
    description:
      "DJ mixes, design collabs, content nights. For-fun creator energy on the yard.",
    createdBy: "campus_king",
    memberCount: 1,
    opportunityCount: 1,
    createdAt: "2026-06-03T12:00:00",
  },
  {
    id: "org_peer",
    slug: "study-cohort",
    name: "Peer Study Cohort",
    orgType: "peer",
    yardId: "howard",
    description:
      "Cross-major study groups and project squads. Peer-led, open enrollment.",
    createdBy: "hbcustudent",
    memberCount: 1,
    opportunityCount: 1,
    createdAt: "2026-06-04T12:00:00",
  },
];

const DEMO_OPPS: ConnectOpportunity[] = [
  {
    id: 1,
    orgId: "org_lab_ai",
    orgName: "TSU AI Research Lab",
    orgType: "research",
    title: "Privacy-Preserving Financial Transactions",
    description:
      "Develop secure methods for private financial transactions using multi-party computation (MPC). Great for students interested in crypto-security research.",
    durationText: "6 months",
    tagsJson: '["research","security","MPC"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-06-10T09:00:00",
  },
  {
    id: 2,
    orgId: "org_lab_ai",
    orgName: "TSU AI Research Lab",
    orgType: "research",
    title: "Fraud Detection with ML",
    description:
      "Build machine learning solutions to detect and prevent fraud. Python + data pipelines. Join to shape safer digital payments.",
    durationText: "9 months",
    tagsJson: '["ML","python","research"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-06-11T09:00:00",
  },
  {
    id: 3,
    orgId: "org_nsbe_tsu",
    orgName: "NSBE @ TSU",
    orgType: "professional",
    title: "NSBE Region Conference Crew",
    description:
      "Help organize workshops and logistics for the regional conference. Leadership + ops experience.",
    durationText: "3 months",
    tagsJson: '["professional","leadership"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-06-12T09:00:00",
  },
  {
    id: 4,
    orgId: "org_service",
    orgName: "Tiger Community Service Hub",
    orgType: "service",
    title: "Saturday STEM Tutoring",
    description:
      "Tutor middle-school STEM in Nashville. Flexible 2-hour Saturday shifts. Community service hours available.",
    durationText: "ongoing",
    tagsJson: '["service","tutoring"]',
    status: "open",
    createdBy: "jane_doe",
    interestCount: 0,
    createdAt: "2026-06-13T09:00:00",
  },
  {
    id: 5,
    orgId: "org_club",
    orgName: "Yard Creatives Club",
    orgType: "club",
    title: "Homecoming Mix Collab",
    description:
      "Co-produce a yard mix for homecoming week. Need producers, vocalists, and cover art designers.",
    durationText: "6 weeks",
    tagsJson: '["club","music","creative"]',
    status: "open",
    createdBy: "campus_king",
    interestCount: 0,
    createdAt: "2026-06-14T09:00:00",
  },
  {
    id: 6,
    orgId: "org_peer",
    orgName: "Peer Study Cohort",
    orgType: "peer",
    title: "Algorithms Study Sprint",
    description:
      "Weekly peer sessions for interviews + class. Bring a laptop and one problem to share.",
    durationText: "8 weeks",
    tagsJson: '["peer","study"]',
    status: "open",
    createdBy: "hbcustudent",
    interestCount: 0,
    createdAt: "2026-06-15T09:00:00",
  },
];

type WebState = {
  orgs: ConnectOrg[];
  opps: ConnectOpportunity[];
  interests: ConnectInterest[];
  nextOppId: number;
  nextInterestId: number;
};

const LS_KEY = "blkspace_project_connect_v1";

function loadWeb(): WebState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as WebState;
  } catch {
    /* ignore */
  }
  return {
    orgs: structuredClone(DEMO_ORGS),
    opps: structuredClone(DEMO_OPPS),
    interests: [],
    nextOppId: 100,
    nextInterestId: 1,
  };
}

function saveWeb(s: WebState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function webCred(handle: string): YardCred {
  const s = loadWeb();
  const interests = s.interests.filter((i) => i.handle === handle).length;
  const completions = s.interests.filter(
    (i) => i.handle === handle && i.status === "completed",
  ).length;
  const orgs = s.orgs.filter((o) => o.createdBy === handle).length;
  const score = Math.min(
    100,
    Math.round(12 + completions * 18 + orgs * 10 + interests * 4),
  );
  return {
    handle,
    score,
    karma: 40,
    completions,
    endorsements: completions,
    orgsJoined: orgs,
    interests,
  };
}

// ─── Public API ──────────────────────────────────────────

export async function listOrgs(orgType?: string): Promise<ConnectOrg[]> {
  if (isTauri()) {
    return invoke("connect_list_orgs", {
      orgType: orgType && orgType !== "all" ? orgType : null,
    });
  }
  const s = loadWeb();
  if (!orgType || orgType === "all") return s.orgs;
  return s.orgs.filter((o) => o.orgType === orgType);
}

export async function getOrg(id: string): Promise<ConnectOrg | null> {
  if (isTauri()) {
    return invoke("connect_get_org", { id });
  }
  const s = loadWeb();
  return s.orgs.find((o) => o.id === id || o.slug === id) ?? null;
}

export async function createOrg(input: {
  name: string;
  orgType: string;
  yardId: string;
  description: string;
}): Promise<ConnectOrg> {
  if (isTauri()) {
    const sessionToken = getSessionToken();
    if (!sessionToken) throw new Error("Sign in to create an org");
    return invoke("connect_create_org", { sessionToken, ...input });
  }
  const s = loadWeb();
  const handle = getCurrentHandle() || "demo_user";
  const id = `org_${Date.now()}`;
  const org: ConnectOrg = {
    id,
    slug: input.name.toLowerCase().replace(/\s+/g, "-").slice(0, 40),
    name: input.name,
    orgType: input.orgType,
    yardId: input.yardId,
    description: input.description,
    createdBy: handle,
    memberCount: 1,
    opportunityCount: 0,
    createdAt: new Date().toISOString(),
  };
  s.orgs.unshift(org);
  saveWeb(s);
  return org;
}

export async function listOpportunities(opts?: {
  orgId?: string;
  orgType?: string;
}): Promise<ConnectOpportunity[]> {
  if (isTauri()) {
    return invoke("connect_list_opportunities", {
      orgId: opts?.orgId ?? null,
      orgType: opts?.orgType && opts.orgType !== "all" ? opts.orgType : null,
    });
  }
  let list = loadWeb().opps.filter((o) => o.status === "open");
  if (opts?.orgId) list = list.filter((o) => o.orgId === opts.orgId);
  if (opts?.orgType && opts.orgType !== "all") {
    list = list.filter((o) => o.orgType === opts.orgType);
  }
  return list;
}

export async function getOpportunity(
  id: number,
): Promise<ConnectOpportunity | null> {
  if (isTauri()) {
    return invoke("connect_get_opportunity", { id });
  }
  return loadWeb().opps.find((o) => o.id === id) ?? null;
}

export async function createOpportunity(input: {
  orgId: string;
  title: string;
  description: string;
  durationText: string;
  tagsJson: string;
}): Promise<ConnectOpportunity> {
  if (isTauri()) {
    const sessionToken = getSessionToken();
    if (!sessionToken) throw new Error("Sign in required");
    return invoke("connect_create_opportunity", { sessionToken, ...input });
  }
  const s = loadWeb();
  const org = s.orgs.find((o) => o.id === input.orgId);
  if (!org) throw new Error("Org not found");
  const handle = getCurrentHandle() || "demo_user";
  const opp: ConnectOpportunity = {
    id: s.nextOppId++,
    orgId: input.orgId,
    orgName: org.name,
    orgType: org.orgType,
    title: input.title,
    description: input.description,
    durationText: input.durationText,
    tagsJson: input.tagsJson,
    status: "open",
    createdBy: handle,
    interestCount: 0,
    createdAt: new Date().toISOString(),
  };
  s.opps.unshift(opp);
  org.opportunityCount += 1;
  saveWeb(s);
  return opp;
}

export async function expressInterest(input: {
  opportunityId: number;
  message: string;
  skillsSnapshot: string;
  classification: string;
  /** Only sent when user opts in and privacy allows */
  gpa?: string;
  gpaShared?: boolean;
}): Promise<ConnectInterest> {
  const share = !!input.gpaShared && !!(input.gpa && input.gpa.trim());
  const gpaVal = share ? input.gpa!.trim() : "";
  if (isTauri()) {
    const sessionToken = getSessionToken();
    if (!sessionToken) throw new Error("Sign in to apply");
    return invoke("connect_express_interest", {
      sessionToken,
      opportunityId: input.opportunityId,
      message: input.message,
      skillsSnapshot: input.skillsSnapshot,
      classification: input.classification,
      gpa: gpaVal,
      gpaShared: share,
    });
  }
  const s = loadWeb();
  const opp = s.opps.find((o) => o.id === input.opportunityId);
  if (!opp) throw new Error("Opportunity not found");
  const handle = getCurrentHandle() || "demo_user";
  const existing = s.interests.find(
    (i) => i.opportunityId === input.opportunityId && i.handle === handle,
  );
  if (existing) {
    existing.message = input.message;
    existing.skillsSnapshot = input.skillsSnapshot;
    existing.classification = input.classification;
    existing.gpa = gpaVal;
    existing.gpaShared = share;
    existing.status = "pending";
    saveWeb(s);
    return existing;
  }
  const interest: ConnectInterest = {
    id: s.nextInterestId++,
    opportunityId: opp.id,
    opportunityTitle: opp.title,
    orgName: opp.orgName,
    handle,
    displayName: handle,
    message: input.message,
    skillsSnapshot: input.skillsSnapshot,
    classification: input.classification,
    gpa: gpaVal,
    gpaShared: share,
    status: "pending",
    createdAt: new Date().toISOString(),
    yardCred: webCred(handle).score,
  };
  s.interests.unshift(interest);
  opp.interestCount += 1;
  saveWeb(s);
  return interest;
}

export async function listInterests(
  opportunityId: number,
): Promise<ConnectInterest[]> {
  if (isTauri()) {
    return invoke("connect_list_interests", { opportunityId });
  }
  return loadWeb().interests.filter((i) => i.opportunityId === opportunityId);
}

export async function listInbox(): Promise<ConnectInterest[]> {
  if (isTauri()) {
    const sessionToken = getSessionToken();
    if (!sessionToken) return [];
    return invoke("connect_inbox", { sessionToken });
  }
  const handle = getCurrentHandle() || "demo_user";
  const s = loadWeb();
  const leadOppIds = new Set(
    s.opps.filter((o) => o.createdBy === handle).map((o) => o.id),
  );
  return s.interests.filter((i) => leadOppIds.has(i.opportunityId));
}

export async function setInterestStatus(
  interestId: number,
  status: string,
): Promise<void> {
  if (isTauri()) {
    const sessionToken = getSessionToken();
    if (!sessionToken) throw new Error("Sign in required");
    await invoke("connect_set_interest_status", {
      sessionToken,
      interestId,
      status,
    });
    return;
  }
  const s = loadWeb();
  const row = s.interests.find((i) => i.id === interestId);
  if (row) row.status = status;
  saveWeb(s);
}

export async function completeInterest(
  interestId: number,
  note: string,
): Promise<void> {
  if (isTauri()) {
    const sessionToken = getSessionToken();
    if (!sessionToken) throw new Error("Sign in required");
    await invoke("connect_complete_interest", {
      sessionToken,
      interestId,
      note,
    });
    return;
  }
  const s = loadWeb();
  const row = s.interests.find((i) => i.id === interestId);
  if (row) row.status = "completed";
  saveWeb(s);
}

export async function getYardCred(handle: string): Promise<YardCred> {
  if (isTauri()) {
    return invoke("connect_yard_cred", { handle });
  }
  return webCred(handle);
}

export function parseTags(tagsJson: string): string[] {
  try {
    const v = JSON.parse(tagsJson);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
