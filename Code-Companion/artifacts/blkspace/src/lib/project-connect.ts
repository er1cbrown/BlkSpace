/**
 * ProjectConnectBKSPC - credibility layer client.
 * Uses Tauri when available; otherwise in-memory demo store for web promo demos.
 */
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri-api";
import {
  createHttpAuthHeader,
  getCurrentHandle,
  getSessionToken,
} from "@/lib/auth";
import { hostedPost } from "@/lib/hosted-api";
import { repairTemplateText } from "@/lib/demo-text";

export type OrgType = "research" | "professional" | "club" | "service" | "peer";

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

// --- Web demo store --------------------------------------

const DEMO_ORGS: ConnectOrg[] = [
  {
    id: "org_nsbe_tsu",
    slug: "nsbe-tsu",
    name: "NSBE @ TSU",
    orgType: "professional",
    yardId: "tsu",
    description:
      "National Society of Black Engineers, TSU chapter. Project nights, career prep, and peer mentorship.",
    createdBy: "demo_user",
    memberCount: 2,
    opportunityCount: 1,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: "org_ieee_tsu",
    slug: "ieee-tsu",
    name: "IEEE Student Branch @ TSU",
    orgType: "professional",
    yardId: "tsu",
    description:
      "Student branch for the next beta. The open cards are the checks: a yard photo, a numbered WeixSound copy, and a LogosDecks round.",
    createdBy: "demo_user",
    memberCount: 2,
    opportunityCount: 3,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: "org_meharry_research",
    slug: "meharry-med-research",
    name: "Meharry Medical Research Network",
    orgType: "research",
    yardId: "meharry",
    description:
      "Faculty and student research for Meharry scholars. Async hours for people on rotations. No patient records on the yard.",
    createdBy: "demo_user",
    memberCount: 2,
    opportunityCount: 1,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: "org_snma_meharry",
    slug: "snma-meharry",
    name: "SNMA @ Meharry",
    orgType: "professional",
    yardId: "meharry",
    description:
      "Student National Medical Association chapter. Advocacy, pipeline, and mentorship.",
    createdBy: "campus_king",
    memberCount: 1,
    opportunityCount: 1,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: "org_fisk_finance",
    slug: "fisk-investment-finance-club",
    name: "Fisk Investment & Finance Club",
    orgType: "professional",
    yardId: "fisk",
    description:
      "Markets literacy and career prep. Practice stays on WeixBucks. Real brokerage accounts stay with licensed firms. Educational only, not investment advice.",
    createdBy: "demo_user",
    memberCount: 2,
    opportunityCount: 1,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: "org_tsu_fashion_society",
    slug: "tsu-fashion-society",
    name: "TSU Fashion Society",
    orgType: "club",
    yardId: "tsu",
    description:
      "Student brands, photoshoot crews, and merch. Portfolio on MyYard. Drops list on Yard Sale in WeixBucks.",
    createdBy: "demo_user",
    memberCount: 2,
    opportunityCount: 1,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: "org_service",
    slug: "tiger-service",
    name: "Tiger Community Service Hub",
    orgType: "service",
    yardId: "tsu",
    description:
      "Volunteer projects with Nashville partners: tutoring, food drives, and campus clean-ups.",
    createdBy: "jane_doe",
    memberCount: 1,
    opportunityCount: 1,
    createdAt: "2026-10-28T12:00:00",
  },
];

const DEMO_OPPS: ConnectOpportunity[] = [
  {
    id: 11,
    orgId: "org_nsbe_tsu",
    orgName: "NSBE @ TSU",
    orgType: "professional",
    title: "NSBE project night",
    description: "Bring a campus project and find a teammate for the evening.",
    durationText: "one evening",
    tagsJson: '["professional","project"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: 12,
    orgId: "org_meharry_research",
    orgName: "Meharry Medical Research Network",
    orgType: "research",
    title: "Health disparities micro-lab",
    description: "Short async reading and a write-up. No patient records.",
    durationText: "2-4 hr/week",
    tagsJson: '["research","meharry","async"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: 13,
    orgId: "org_ieee_tsu",
    orgName: "IEEE Student Branch @ TSU",
    orgType: "professional",
    title: "Beta: post a yard photo",
    description:
      "Upload one picture on the wall. Open the post and confirm the photo loads from this yard.",
    durationText: "15 min",
    tagsJson: '["beta","wall","photo"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: 14,
    orgId: "org_ieee_tsu",
    orgName: "IEEE Student Branch @ TSU",
    orgType: "professional",
    title: "Beta: release a numbered copy",
    description:
      "On Records, publish a track. The free listen stays open. Price the numbered copy in WeixBucks only. The label reads Bermuda Boyz Records.",
    durationText: "20 min",
    tagsJson: '["beta","records","weixsound"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: 15,
    orgId: "org_ieee_tsu",
    orgName: "IEEE Student Branch @ TSU",
    orgType: "professional",
    title: "Beta: close a LogosDecks round",
    description:
      "Load two showcases, tracks or a reading you host. Build the flow meter. The higher score when the set closes wins.",
    durationText: "20 min",
    tagsJson: '["beta","logosdecks","flow"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: 16,
    orgId: "org_snma_meharry",
    orgName: "SNMA @ Meharry",
    orgType: "professional",
    title: "Pipeline mentorship",
    description: "Mentor a premed with one async message thread each week.",
    durationText: "1 thread/week",
    tagsJson: '["professional","meharry","mentorship"]',
    status: "open",
    createdBy: "campus_king",
    interestCount: 0,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: 17,
    orgId: "org_fisk_finance",
    orgName: "Fisk Investment & Finance Club",
    orgType: "professional",
    title: "Mock equity note (educational)",
    description:
      "Write a one-page note from public filings and news. Peer feedback in the club. Educational only. Not a stock recommendation or a brokerage service.",
    durationText: "2 weeks",
    tagsJson: '["finance","literacy","fisk"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: 18,
    orgId: "org_tsu_fashion_society",
    orgName: "TSU Fashion Society",
    orgType: "club",
    title: "Lookbook shoot",
    description:
      "The campus brand needs models, a shooter assist, and styling hands for a TSU lookbook. List the drop on Yard Sale in WeixBucks.",
    durationText: "1 weekend",
    tagsJson: '["fashion","lookbook","yard-sale"]',
    status: "open",
    createdBy: "demo_user",
    interestCount: 0,
    createdAt: "2026-10-28T12:00:00",
  },
  {
    id: 19,
    orgId: "org_service",
    orgName: "Tiger Community Service Hub",
    orgType: "service",
    title: "Saturday STEM tutoring",
    description:
      "Tutor middle-school STEM in Nashville. Two-hour Saturday shifts. Service hours available.",
    durationText: "ongoing",
    tagsJson: '["service","tutoring"]',
    status: "open",
    createdBy: "jane_doe",
    interestCount: 0,
    createdAt: "2026-10-28T12:00:00",
  },
];

type WebState = {
  revision: number;
  orgs: ConnectOrg[];
  opps: ConnectOpportunity[];
  interests: ConnectInterest[];
  nextOppId: number;
  nextInterestId: number;
};

const LS_KEY = "blkspace_project_connect_v2";
const SAVED_OPPS_KEY = "blkspace_project_connect_saved_v1";

function loadSavedOpportunityIds(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_OPPS_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((id): id is number => Number.isInteger(id));
  } catch {
    return [];
  }
}

const DEMO_REVISION = 2;

const RETIRED_ORG_IDS = new Set([
  "org_lab_ai",
  "org_bmds",
  "org_weixnet",
  "org_club",
  "org_fashion_tsu",
  "org_fisk_fashion_market",
  "org_fashion_howard",
  "org_fashion_spelman",
  "org_peer",
  "org_meharry_peers",
  "org_private_uni_bridge",
  "org_vandy_public_health",
  "org_opp_meharry",
]);

const RETIRED_OPP_IDS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 60, 61, 70, 71, 72, 73, 80, 81, 82, 83, 84, 90,
  91, 92, 94, 95, 97, 98, 99, 100, 101, 102,
]);

function mentionsRetiredOrg(value: string): boolean {
  return /omega\s*psi\s*phi|omega-psi-phi|org_opp_meharry/i.test(value);
}

function freshWeb(): WebState {
  return {
    revision: DEMO_REVISION,
    orgs: structuredClone(DEMO_ORGS),
    opps: structuredClone(DEMO_OPPS),
    interests: [],
    nextOppId: 200,
    nextInterestId: 1,
  };
}

function adoptDemo(prev: WebState): WebState {
  const demoOrgIds = new Set(DEMO_ORGS.map((o) => o.id));
  const demoOppIds = new Set(DEMO_OPPS.map((o) => o.id));
  const userOrgs = (prev.orgs || []).filter((o) => {
    const blob = `${o.id} ${o.slug} ${o.name} ${o.description}`;
    return (
      !demoOrgIds.has(o.id) &&
      !RETIRED_ORG_IDS.has(o.id) &&
      !mentionsRetiredOrg(blob)
    );
  });
  const userOpps = (prev.opps || []).filter((p) => {
    const blob = `${p.orgId} ${p.orgName} ${p.title} ${p.description}`;
    return (
      !demoOppIds.has(p.id) &&
      !RETIRED_OPP_IDS.has(p.id) &&
      !mentionsRetiredOrg(blob)
    );
  });
  const kept = new Set<number>([
    ...DEMO_OPPS.map((o) => o.id),
    ...userOpps.map((p) => p.id),
  ]);
  const interests = (prev.interests || []).filter(
    (i) =>
      kept.has(i.opportunityId) &&
      !mentionsRetiredOrg(`${i.orgName} ${i.opportunityTitle} ${i.message}`),
  );
  return {
    revision: DEMO_REVISION,
    orgs: [...structuredClone(DEMO_ORGS), ...userOrgs],
    opps: [...structuredClone(DEMO_OPPS), ...userOpps],
    interests,
    nextOppId: Math.max(prev.nextOppId || 200, 200),
    nextInterestId: Math.max(prev.nextInterestId || 1, 1),
  };
}

function loadWeb(): WebState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const repaired = repairTemplateText(raw);
      const stored = JSON.parse(repaired) as WebState;
      const stale =
        stored.revision !== DEMO_REVISION ||
        (stored.orgs || []).some((o) =>
          mentionsRetiredOrg(`${o.id} ${o.slug} ${o.name}`),
        ) ||
        (stored.opps || []).some((p) =>
          mentionsRetiredOrg(`${p.orgId} ${p.orgName} ${p.title}`),
        );
      if (stale) {
        const next = adoptDemo(stored);
        saveWeb(next);
        return next;
      }
      if (repaired !== raw) saveWeb(stored);
      return stored;
    }
  } catch {
    /* ignore */
  }
  const next = freshWeb();
  saveWeb(next);
  return next;
}

async function connectGet(path: string): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || body.ok === false) return null;
    return body;
  } catch {
    return null;
  }
}

async function connectPost(
  path: string,
  body: unknown,
): Promise<Record<string, any>> {
  const res = await hostedPost(path, body);
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || "Could not save that to the yard.");
  }
  return json;
}

function signedOut(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  return message.includes("Sign in again");
}

async function connectGetSigned(
  path: string,
): Promise<Record<string, any> | null> {
  try {
    const authorization = createHttpAuthHeader(path, "GET", "");
    const res = await fetch(path, { headers: { authorization } });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || body.ok === false) return null;
    return body;
  } catch {
    return null;
  }
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

// --- Public API ------------------------------------------

export async function listOrgs(orgType?: string): Promise<ConnectOrg[]> {
  if (isTauri()) {
    return invoke("connect_list_orgs", {
      orgType: orgType && orgType !== "all" ? orgType : null,
    });
  }
  const query =
    orgType && orgType !== "all" ? `?type=${encodeURIComponent(orgType)}` : "";
  const remote = await connectGet(`/api/connect/orgs${query}`);
  if (Array.isArray(remote?.orgs)) return remote.orgs as ConnectOrg[];
  const s = loadWeb();
  if (!orgType || orgType === "all") return s.orgs;
  return s.orgs.filter((o) => o.orgType === orgType);
}

export async function getOrg(id: string): Promise<ConnectOrg | null> {
  if (isTauri()) {
    return invoke("connect_get_org", { id });
  }
  const remote = await connectGet(
    `/api/connect/org?id=${encodeURIComponent(id)}`,
  );
  if (remote?.org) return remote.org as ConnectOrg;
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
  try {
    const saved = await connectPost("/api/connect/org", input);
    return saved.org as ConnectOrg;
  } catch (err) {
    if (!signedOut(err)) throw err;
  }
  const s = loadWeb();
  const handle = getCurrentHandle();
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
  const params = new URLSearchParams();
  if (opts?.orgId) params.set("orgId", opts.orgId);
  if (opts?.orgType && opts.orgType !== "all") params.set("type", opts.orgType);
  const query = params.toString();
  const remote = await connectGet(
    `/api/connect/opportunities${query ? `?${query}` : ""}`,
  );
  if (Array.isArray(remote?.opportunities)) {
    return remote.opportunities as ConnectOpportunity[];
  }
  let list = loadWeb().opps.filter((o) => o.status === "open");
  if (opts?.orgId) list = list.filter((o) => o.orgId === opts.orgId);
  if (opts?.orgType && opts.orgType !== "all") {
    list = list.filter((o) => o.orgType === opts.orgType);
  }
  return list;
}

export function listSavedOpportunityIds(): number[] {
  return loadSavedOpportunityIds();
}

export function isOpportunitySaved(id: number): boolean {
  return loadSavedOpportunityIds().includes(id);
}

/** Toggle a local bookmark; saves are device-local until account sync exists. */
export function toggleSavedOpportunity(id: number): boolean {
  const saved = loadSavedOpportunityIds();
  const next = saved.includes(id)
    ? saved.filter((savedId) => savedId !== id)
    : [id, ...saved];
  try {
    localStorage.setItem(SAVED_OPPS_KEY, JSON.stringify(next));
  } catch {
    /* Ignore storage quota/private-mode failures. */
  }
  return next.includes(id);
}

export async function getOpportunity(
  id: number,
): Promise<ConnectOpportunity | null> {
  if (isTauri()) {
    return invoke("connect_get_opportunity", { id });
  }
  const remote = await connectGet(
    `/api/connect/opportunity?id=${encodeURIComponent(String(id))}`,
  );
  if (remote?.opportunity) return remote.opportunity as ConnectOpportunity;
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

function pushWebNotification(
  toHandle: string,
  fromHandle: string,
  message: string,
) {
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
  try {
    const saved = await connectPost("/api/connect/opportunity", input);
    return saved.opportunity as ConnectOpportunity;
  } catch (err) {
    if (!signedOut(err)) throw err;
  }
  const s = loadWeb();
  const org = s.orgs.find((o) => o.id === input.orgId);
  if (!org) throw new Error("Org not found");
  const handle = getCurrentHandle();
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
  try {
    const saved = await connectPost("/api/connect/interest", {
      ...input,
      gpa: gpaVal,
      gpaShared: share,
    });
    return saved.interest as ConnectInterest;
  } catch (err) {
    if (!signedOut(err)) throw err;
  }
  const s = loadWeb();
  const opp = s.opps.find((o) => o.id === input.opportunityId);
  if (!opp) throw new Error("Opportunity not found");
  const handle = getCurrentHandle();
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
  const msg = `@${handle} expressed interest in "${opp.title}" - open Lead inbox on ProjectConnect`;
  if (opp.createdBy && opp.createdBy !== handle) {
    pushWebNotification(opp.createdBy, handle, msg);
  }
  const org = s.orgs.find((o) => o.id === opp.orgId);
  if (
    org?.createdBy &&
    org.createdBy !== handle &&
    org.createdBy !== opp.createdBy
  ) {
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
  const remote = await connectGet(
    `/api/connect/interests?opportunityId=${encodeURIComponent(String(opportunityId))}`,
  );
  if (Array.isArray(remote?.interests))
    return remote.interests as ConnectInterest[];
  return loadWeb().interests.filter((i) => i.opportunityId === opportunityId);
}

export async function listInbox(): Promise<ConnectInterest[]> {
  if (isTauri()) {
    const sessionToken = getSessionToken();
    if (!sessionToken) return [];
    return invoke("connect_inbox", { sessionToken });
  }
  const remote = await connectGetSigned("/api/connect/inbox");
  if (Array.isArray(remote?.interests))
    return remote.interests as ConnectInterest[];
  const handle = getCurrentHandle();
  const s = loadWeb();
  // Match Tauri: opp creator OR org owner (createdBy on org)
  const ownedOrgIds = new Set(
    s.orgs.filter((o) => o.createdBy === handle).map((o) => o.id),
  );
  const leadOppIds = new Set(
    s.opps
      .filter((o) => o.createdBy === handle || ownedOrgIds.has(o.orgId))
      .map((o) => o.id),
  );
  return s.interests.filter((i) => leadOppIds.has(i.opportunityId));
}

/** Applicant-side dashboard data for the web/local demo store. */
export async function listMyInterests(): Promise<ConnectInterest[]> {
  if (isTauri()) {
    const sessionToken = getSessionToken();
    if (!sessionToken) return [];
    return invoke("connect_my_interests", { sessionToken });
  }
  const remote = await connectGetSigned("/api/connect/my-interests");
  if (Array.isArray(remote?.interests))
    return remote.interests as ConnectInterest[];
  const handle = getCurrentHandle();
  return loadWeb().interests.filter((i) => i.handle === handle);
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
  try {
    await connectPost("/api/connect/interest/status", { interestId, status });
    return;
  } catch (err) {
    if (!signedOut(err)) throw err;
  }
  const s = loadWeb();
  const row = s.interests.find((i) => i.id === interestId);
  if (!row) return;
  const handle = getCurrentHandle();
  const opp = s.opps.find((item) => item.id === row.opportunityId);
  const org = opp && s.orgs.find((item) => item.id === opp.orgId);
  if (!opp || !org || (opp.createdBy !== handle && org.createdBy !== handle)) {
    throw new Error("Only organization leads can update application status");
  }
  row.status = status === "rejected" ? "declined" : status;
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
  try {
    await connectPost("/api/connect/interest/status", {
      interestId,
      status: "completed",
    });
    return;
  } catch (err) {
    if (!signedOut(err)) throw err;
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
  const remote = await connectGet(
    `/api/connect/cred?handle=${encodeURIComponent(handle)}`,
  );
  if (remote?.cred) return remote.cred as YardCred;
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

/**
 * Rank opportunities by tag/skill overlap (C0 matching polish).
 * Higher score = better fit for the applicant's skill tokens.
 */
export function scoreOpportunityMatch(
  opp: ConnectOpportunity,
  skillTokens: string[],
): number {
  if (!skillTokens.length) return 0;
  const hay = [
    opp.title,
    opp.description,
    opp.orgName,
    opp.orgType,
    ...parseTags(opp.tagsJson || "[]"),
  ]
    .join(" ")
    .toLowerCase();
  let hits = 0;
  for (const raw of skillTokens) {
    const t = raw.trim().toLowerCase();
    if (t.length >= 2 && hay.includes(t)) hits += 1;
  }
  // Prefer open roles slightly when tied
  const openBoost = opp.status === "open" ? 0.25 : 0;
  return hits + openBoost;
}

/** Sort opportunities for a student: match score desc, then recency. */
export function sortOpportunitiesByMatch(
  opps: ConnectOpportunity[],
  skillTokens: string[],
): ConnectOpportunity[] {
  return [...opps].sort((a, b) => {
    const sb = scoreOpportunityMatch(b, skillTokens);
    const sa = scoreOpportunityMatch(a, skillTokens);
    if (sb !== sa) return sb - sa;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}
