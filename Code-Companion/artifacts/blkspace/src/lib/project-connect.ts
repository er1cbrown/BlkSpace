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
    id: "org_bmds",
    slug: "bmds-medtech",
    name: "Biomedical Data Sciences & MedTech",
    orgType: "research",
    yardId: "tsu",
    description:
      "Master's-track research: clinical data, health AI, medtech pipelines. Built for HBCU scholars moving into biomedical data sciences — and for faculty who need motivated analysts.",
    createdBy: "demo_user",
    memberCount: 1,
    opportunityCount: 3,
    createdAt: "2026-08-01T12:00:00",
  },
  {
    id: "org_weixnet",
    slug: "weixnet-portfolio",
    name: "WeixNet Portfolio Lab",
    orgType: "professional",
    yardId: "tsu",
    description:
      "Bleeding-edge social + economy experiments for underrepresented campuses. Ship real product (BlkSpace / ProjectConnect) while building a portfolio that labs and employers can verify.",
    createdBy: "demo_user",
    memberCount: 1,
    opportunityCount: 1,
    createdAt: "2026-08-01T12:00:00",
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
    id: "org_fashion_tsu",
    slug: "fashion-collective-tsu",
    name: "TSU Fashion Collective",
    orgType: "club",
    yardId: "tsu",
    description:
      "Private for-profit design club. Sell mockups, blueprints, and merch digital drops with escrow + club revenue split.",
    createdBy: "campus_king",
    memberCount: 2,
    opportunityCount: 1,
    createdAt: "2026-08-01T12:00:00",
  },
  {
    id: "org_fashion_howard",
    slug: "fashion-howard",
    name: "Howard Style Lab",
    orgType: "club",
    yardId: "howard",
    description:
      "Cross-campus fashion majors. Authenticated P2P trades with escrow — art, tech packs, digital merch.",
    createdBy: "hbcustudent",
    memberCount: 2,
    opportunityCount: 1,
    createdAt: "2026-08-01T12:00:00",
  },
  {
    id: "org_fashion_spelman",
    slug: "fashion-spelman",
    name: "Spelman Atelier",
    orgType: "club",
    yardId: "spelman",
    description:
      "Atelier + collab drops. Club-branded listings with revenue split for gallery events.",
    createdBy: "jane_doe",
    memberCount: 2,
    opportunityCount: 0,
    createdAt: "2026-08-01T12:00:00",
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
  {
    id: "org_meharry_research",
    slug: "meharry-med-research",
    name: "Meharry Medical Research Network",
    orgType: "research",
    yardId: "meharry",
    description:
      "Faculty + student research for Meharry and HBCU med scholars. Micro-hours and async options for people on rotations.",
    createdBy: "demo_user",
    memberCount: 2,
    opportunityCount: 3,
    createdAt: "2026-08-03T12:00:00",
  },
  {
    id: "org_meharry_peers",
    slug: "meharry-peer-circle",
    name: "Meharry Peer Circle",
    orgType: "peer",
    yardId: "meharry",
    description:
      "Underrepresented med students supporting each other — Step refresh, wellness, low-bandwidth mentorship.",
    createdBy: "jane_doe",
    memberCount: 2,
    opportunityCount: 2,
    createdAt: "2026-08-03T12:00:00",
  },
  {
    id: "org_snma_meharry",
    slug: "snma-meharry",
    name: "SNMA @ Meharry",
    orgType: "professional",
    yardId: "meharry",
    description:
      "Student National Medical Association chapter energy — advocacy, pipeline, professional network without LinkedIn grind.",
    createdBy: "campus_king",
    memberCount: 1,
    opportunityCount: 1,
    createdAt: "2026-08-03T12:00:00",
  },
  {
    id: "org_private_uni_bridge",
    slug: "private-uni-hbcu-bridge",
    name: "Private University · HBCU Research Bridge",
    orgType: "research",
    yardId: "meharry",
    description:
      "Faculty from a private university (Nashville region) meeting Meharry & HBCU students on BlkSpace ProjectConnect — RA roles, summer research, pipeline mentorship. Handshake energy, yard-native.",
    createdBy: "demo_user",
    memberCount: 2,
    opportunityCount: 3,
    createdAt: "2026-08-03T15:00:00",
  },
  {
    id: "org_vandy_public_health",
    slug: "partner-public-health-lab",
    name: "Partner Public Health Lab (private uni)",
    orgType: "research",
    yardId: "meharry",
    description:
      "Cross-town public health lab seeking underrepresented med/undergrad talent. Posts live where Meharry students already refresh and connect.",
    createdBy: "demo_user",
    memberCount: 1,
    opportunityCount: 2,
    createdAt: "2026-08-03T15:30:00",
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
  {
    id: 60,
    orgId: "org_fashion_tsu",
    orgName: "TSU Fashion Collective",
    orgType: "club",
    title: "Homecoming Lookbook Collab",
    description:
      "Design one digital look for TSU homecoming lookbook. Escrow-protected delivery of mockups + tech pack on Yard Sale.",
    durationText: "3 weeks",
    tagsJson: '["fashion","design","collab"]',
    status: "open",
    createdBy: "campus_king",
    interestCount: 0,
    createdAt: "2026-08-01T12:00:00",
  },
  {
    id: 61,
    orgId: "org_fashion_howard",
    orgName: "Howard Style Lab",
    orgType: "club",
    title: "Multi-Campus Drop Night",
    description:
      "Coordinate a synchronized digital merch drop across TSU / Howard / Spelman. Auth via BlkSpace identity + escrow settlement.",
    durationText: "1 month",
    tagsJson: '["fashion","merch","multi-campus"]',
    status: "open",
    createdBy: "hbcustudent",
    interestCount: 0,
    createdAt: "2026-08-01T12:00:00",
  },
  {
    id: 7,
    orgId: "org_bmds",
    orgName: "Biomedical Data Sciences & MedTech",
    orgType: "research",
    title: "Clinical NLP for Care Notes (MedTech)",
    description:
      "Pipeline for de-identified clinical notes: preprocessing, entity extraction, evaluation. Ideal for students entering biomedical data sciences. No PHI on laptops — synthetic/demo data only.",
    durationText: "1 semester",
    tagsJson: '["research","medtech","NLP","biomedical"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-08-01T10:00:00",
  },
  {
    id: 8,
    orgId: "org_bmds",
    orgName: "Biomedical Data Sciences & MedTech",
    orgType: "research",
    title: "Wearable Signal ML — Risk Stratification Prototype",
    description:
      "Explore time-series features from wearable-like synthetic signals for early risk flags. Python/pandas/sklearn. Portfolio-ready figures for medtech interviews.",
    durationText: "6 months",
    tagsJson: '["research","medtech","ML","wearables"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-08-01T11:00:00",
  },
  {
    id: 9,
    orgId: "org_bmds",
    orgName: "Biomedical Data Sciences & MedTech",
    orgType: "research",
    title: "Fairness Audit: Health Prediction Models",
    description:
      "Audit a baseline clinical risk model for subgroup performance. Document bias metrics and mitigation notes. Aligns with ethical AI + HBCU student impact narrative.",
    durationText: "4 months",
    tagsJson: '["research","fairness","health-AI"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-08-01T12:00:00",
  },
  {
    id: 70,
    orgId: "org_meharry_research",
    orgName: "Meharry Medical Research Network",
    orgType: "research",
    title: "Health Disparities Micro-Lab (async · 2–4 hr/week)",
    description:
      "Low-bandwidth research for students on rotations. Async lit review + short write-ups on community health disparities. No mandatory live meetings — check-ins by message.",
    durationText: "2–4 hr/week · flexible",
    tagsJson: '["research","meharry","async","low-bandwidth","health-disparities","med"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-08-03T10:00:00",
  },
  {
    id: 71,
    orgId: "org_meharry_research",
    orgName: "Meharry Medical Research Network",
    orgType: "research",
    title: "Clinical Data Literacy · 15-min weekly micro-sessions",
    description:
      "Short async modules on reading papers + basic stats for clinic. Built for med students who refuse a second full course load.",
    durationText: "15 min/week · async",
    tagsJson: '["research","meharry","async","15 min","med","micro"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-08-03T11:00:00",
  },
  {
    id: 72,
    orgId: "org_meharry_peers",
    orgName: "Meharry Peer Circle",
    orgType: "peer",
    title: "Step / shelf refresh buddy (text-first)",
    description:
      "Pair underrepresented med students for 2×10 min text check-ins weekly. Not a live study hall — accountability without calendar death.",
    durationText: "20 min/week · flex",
    tagsJson: '["peer","meharry","step","low-bandwidth","med"]',
    status: "open",
    createdBy: "jane_doe",
    interestCount: 0,
    createdAt: "2026-08-03T12:00:00",
  },
  {
    id: 73,
    orgId: "org_meharry_peers",
    orgName: "Meharry Peer Circle",
    orgType: "peer",
    title: "Finance literacy for med (Black dollar · soft credits)",
    description:
      "Peer circle on WeixBucks habits, Cred before coin, debt/loan awareness — underrepresented community economics without pump-and-dump culture.",
    durationText: "30 min biweekly · async notes",
    tagsJson: '["peer","meharry","finance","literacy","WB","BKSPC"]',
    status: "open",
    createdBy: "jane_doe",
    interestCount: 0,
    createdAt: "2026-08-03T13:00:00",
  },
  {
    id: 74,
    orgId: "org_snma_meharry",
    orgName: "SNMA @ Meharry",
    orgType: "professional",
    title: "Pipeline mentorship · low-bandwidth",
    description:
      "Mentor a premed for 1 async message thread / week. Builds Cred and underrepresented network density without eating clinic blocks.",
    durationText: "1 async thread/week",
    tagsJson: '["professional","meharry","mentorship","low-bandwidth"]',
    status: "open",
    createdBy: "campus_king",
    interestCount: 0,
    createdAt: "2026-08-03T14:00:00",
  },
  {
    id: 80,
    orgId: "org_private_uni_bridge",
    orgName: "Private University · HBCU Research Bridge",
    orgType: "research",
    title: "Summer RA · health equity (Meharry + HBCU students)",
    description:
      "Private-university faculty lab recruiting underrepresented students. 8–10 week summer RA with optional async prep. Apply via ProjectConnect — we meet you on BlkSpace, not only LinkedIn.",
    durationText: "Summer · ~10 hr/week",
    tagsJson: '["faculty","pipeline","meharry","hbcu","underrepresented","research","RA"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-08-03T15:00:00",
  },
  {
    id: 81,
    orgId: "org_private_uni_bridge",
    orgName: "Private University · HBCU Research Bridge",
    orgType: "research",
    title: "Semester RA · clinical informatics (async-friendly)",
    description:
      "Part-time research assistant for de-identified / synthetic clinical data projects. Flexible for Meharry rotations. Faculty provide mentorship + letter of rec pathway.",
    durationText: "1 semester · 4–6 hr/week · flex",
    tagsJson: '["faculty","pipeline","async","med","underrepresented","RA"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-08-03T15:15:00",
  },
  {
    id: 82,
    orgId: "org_private_uni_bridge",
    orgName: "Private University · HBCU Research Bridge",
    orgType: "professional",
    title: "Faculty office hours on the yard (monthly)",
    description:
      "Open office-hours thread for underrepresented students exploring research careers. Discord/Slack energy — hosted as Connect opp + yard channel presence.",
    durationText: "1 hr/month · open",
    tagsJson: '["faculty","pipeline","office-hours","underrepresented"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-08-03T15:30:00",
  },
  {
    id: 83,
    orgId: "org_vandy_public_health",
    orgName: "Partner Public Health Lab (private uni)",
    orgType: "research",
    title: "Community health disparities analysis (micro-project)",
    description:
      "Short collaborative analysis project with Meharry peers. Private uni faculty co-mentor. Low-bandwidth check-ins; publish abstract-style write-up.",
    durationText: "6 weeks · 3 hr/week",
    tagsJson: '["faculty","public-health","meharry","underrepresented","pipeline"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-08-03T16:00:00",
  },
  {
    id: 84,
    orgId: "org_vandy_public_health",
    orgName: "Partner Public Health Lab (private uni)",
    orgType: "research",
    title: "Paid intern · survey ops (Indeed-class post, yard-native)",
    description:
      "Soft listing for survey coordination support. Not Workday payroll — interest + interview off-platform if needed. Prioritize underrepresented applicants from HBCU yards.",
    durationText: "10 weeks · part-time",
    tagsJson: '["faculty","internship","pipeline","underrepresented","paid"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-08-03T16:30:00",
  },
  {
    id: 10,
    orgId: "org_weixnet",
    orgName: "WeixNet Portfolio Lab",
    orgType: "professional",
    title: "BlkSpace Campus Ambassador · Product Demo Squad",
    description:
      "Help ship promo demos of BlkSpace + ProjectConnect for HBCU yards: capture stories, run Tier 0 smoke tests, and showcase WeixNet portfolio work to partners.",
    durationText: "ongoing",
    tagsJson: '["professional","product","HBCU"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-08-01T13:00:00",
  },
];

type WebState = {
  orgs: ConnectOrg[];
  opps: ConnectOpportunity[];
  interests: ConnectInterest[];
  nextOppId: number;
  nextInterestId: number;
};

const LS_KEY = "blkspace_project_connect_v2";

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
  // Prefer existing org owned by this user with same name (idempotent re-post)
  const existing = s.orgs.find(
    (o) =>
      o.createdBy === handle &&
      o.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
  );
  if (existing) return existing;
  const id = `org_${handle}_${Date.now()}`;
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

/** Faculty / lead can post only for orgs they own (web) or created. */
export function canPostOpportunitiesForOrg(
  org: ConnectOrg | null | undefined,
  handle?: string | null,
): boolean {
  const h = handle || getCurrentHandle();
  if (!org || !h) return false;
  return org.createdBy === h;
}

function pushWebNotification(toHandle: string, fromHandle: string, message: string) {
  try {
    const key = "blkspace_web_notifications_v1";
    const prev = JSON.parse(localStorage.getItem(key) || "[]") as {
      id: number;
      userHandle: string;
      notificationType: string;
      fromHandle: string;
      message: string;
      unread: boolean;
      createdAt: string;
    }[];
    prev.unshift({
      id: Date.now(),
      userHandle: toHandle,
      notificationType: "connect_interest",
      fromHandle,
      message,
      unread: true,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export function listWebNotifications(handle?: string | null): {
  id: number;
  userHandle: string;
  notificationType: string;
  fromHandle: string;
  message: string;
  unread: boolean;
  createdAt: string;
}[] {
  try {
    const h = handle || getCurrentHandle();
    const key = "blkspace_web_notifications_v1";
    const prev = JSON.parse(localStorage.getItem(key) || "[]") as {
      id: number;
      userHandle: string;
      notificationType: string;
      fromHandle: string;
      message: string;
      unread: boolean;
      createdAt: string;
    }[];
    if (!h) return prev;
    return prev.filter((n) => n.userHandle === h);
  } catch {
    return [];
  }
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
  if (!canPostOpportunitiesForOrg(org, handle)) {
    throw new Error(
      "Only org owners/leads can post opportunities for this lab",
    );
  }
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
  // Notify faculty / opp creator
  const msg = `@${handle} expressed interest in "${opp.title}" — open Lead inbox on ProjectConnect`;
  if (opp.createdBy && opp.createdBy !== handle) {
    pushWebNotification(opp.createdBy, handle, msg);
  }
  const org = s.orgs.find((o) => o.id === opp.orgId);
  if (org?.createdBy && org.createdBy !== handle && org.createdBy !== opp.createdBy) {
    pushWebNotification(org.createdBy, handle, msg);
  }
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
  // Match Tauri: opp creator OR org owner (createdBy on org)
  const ownedOrgIds = new Set(
    s.orgs.filter((o) => o.createdBy === handle).map((o) => o.id),
  );
  const leadOppIds = new Set(
    s.opps
      .filter(
        (o) => o.createdBy === handle || ownedOrgIds.has(o.orgId),
      )
      .map((o) => o.id),
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
