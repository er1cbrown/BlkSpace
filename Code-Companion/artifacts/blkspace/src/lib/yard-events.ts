/**
 * Yard events + ticketing client (RSVP, capacity, club exclusive, guest list).
 * Tauri when available; localStorage demo for web.
 */
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri-api";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";

export interface YardEvent {
  id: number;
  communityId: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt?: string | null;
  createdBy: string;
  createdByDisplayName: string;
  rsvpCount: number;
  goingCount?: number;
  waitlistCount?: number;
  userRsvp?: string | null;
  capacity?: number | null;
  orgId?: string | null;
  orgName?: string | null;
  requiresOrgMember?: boolean;
  ticketPriceWb?: number;
  eventKind?: string;
  userTicketCode?: string | null;
  userWaitlisted?: boolean;
  userCheckedIn?: boolean;
  spotsRemaining?: number | null;
}

export interface EventGuest {
  handle: string;
  displayName: string;
  status: string;
  ticketCode?: string | null;
  paidWb: number;
  checkedIn: boolean;
  waitlisted: boolean;
  createdAt: string;
  yardCred: number;
}

export interface RsvpResult {
  rsvped: boolean;
  status: string;
  earn?: { wb?: number };
  ticketCode?: string | null;
  waitlisted?: boolean;
  paidWb?: number;
  pass?: Record<string, unknown> | null;
}

export interface OpenToCandidate {
  handle: string;
  displayName: string;
  university: string;
  town: string;
  headline: string;
  major: string;
  skills: string[];
  portfolioUrl: string;
  experience: string;
  openToWork: boolean;
  openToResearch: boolean;
  graduationYear: string;
  karma: number;
}

const STORE_KEY = "blkspace_yard_events_v1";
const OPEN_KEY = "blkspace_open_to_board_v1";

type DemoStore = {
  events: YardEvent[];
  rsvps: Record<
    string,
    {
      status: string;
      ticketCode: string;
      paidWb: number;
      waitlisted: boolean;
      checkedIn: boolean;
      handle: string;
      displayName: string;
      createdAt: string;
    }[]
  >;
  nextId: number;
};

function daysFromNow(d: number, hour = 10): string {
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(hour, 0, 0, 0);
  return x.toISOString().slice(0, 19);
}

function defaultStore(): DemoStore {
  return {
    nextId: 10,
    rsvps: {},
    events: [
      {
        id: 1,
        communityId: "tsu",
        title: "Tiger Service Day · First Campus Cleanup",
        description:
          "Club exclusive first community service. Free pass + check-in code. Join Tiger Community Service Hub on ProjectConnect if required.",
        location: "Student Center Plaza",
        startsAt: daysFromNow(5, 10),
        createdBy: "jane_doe",
        createdByDisplayName: "Jane Doe",
        rsvpCount: 0,
        goingCount: 0,
        waitlistCount: 0,
        capacity: 40,
        orgId: "org_service",
        orgName: "Tiger Community Service Hub",
        requiresOrgMember: true,
        ticketPriceWb: 0,
        eventKind: "service",
        spotsRemaining: 40,
      },
      {
        id: 2,
        communityId: "tsu",
        title: "Yard Networking Mixer (Open RSVP)",
        description:
          "Open to all yard members. Free ticket pass for door tracking.",
        location: "Kean Hall Lobby",
        startsAt: daysFromNow(3, 18),
        createdBy: "demo_user",
        createdByDisplayName: "Demo User",
        rsvpCount: 0,
        goingCount: 0,
        waitlistCount: 0,
        capacity: 100,
        ticketPriceWb: 0,
        eventKind: "career",
        requiresOrgMember: false,
        spotsRemaining: 100,
      },
      {
        id: 3,
        communityId: "tsu",
        title: "Homecoming Watch Party",
        description: "Tailgate vibes indoors with live game stream.",
        location: "Student Center Ballroom",
        startsAt: daysFromNow(10, 20),
        createdBy: "jane_doe",
        createdByDisplayName: "Jane Doe",
        rsvpCount: 0,
        goingCount: 0,
        waitlistCount: 0,
        capacity: 200,
        ticketPriceWb: 5,
        eventKind: "social",
        requiresOrgMember: false,
        spotsRemaining: 200,
      },
      {
        id: 4,
        communityId: "howard",
        title: "Style Lab Volunteer Fair",
        description: "Guest list for organizers. Optional club brand.",
        location: "Founders Library Plaza",
        startsAt: daysFromNow(6, 14),
        createdBy: "hbcustudent",
        createdByDisplayName: "HBCU Student",
        rsvpCount: 0,
        goingCount: 0,
        waitlistCount: 0,
        capacity: 30,
        orgId: "org_fashion_howard",
        orgName: "Howard Style Lab",
        requiresOrgMember: false,
        ticketPriceWb: 0,
        eventKind: "service",
        spotsRemaining: 30,
      },
    ],
  };
}

function load(): DemoStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as DemoStore;
  } catch {
    /* ignore */
  }
  const s = defaultStore();
  save(s);
  return s;
}

function save(s: DemoStore) {
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

function ticketCode(eventId: number, handle: string): string {
  let h = 2166136261;
  for (let i = 0; i < handle.length; i++) {
    h ^= handle.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `BK-E${eventId}-${(h >>> 0).toString(16).slice(0, 5).toUpperCase()}`;
}

function enrich(e: YardEvent, me: string): YardEvent {
  const list = load().rsvps[String(e.id)] || [];
  const mine = list.find((r) => r.handle === me);
  const going = list.filter(
    (r) => r.status === "going" && !r.waitlisted,
  ).length;
  const wait = list.filter(
    (r) => r.waitlisted || r.status === "waitlist",
  ).length;
  return {
    ...e,
    rsvpCount: list.length,
    goingCount: going,
    waitlistCount: wait,
    spotsRemaining: e.capacity != null ? Math.max(0, e.capacity - going) : null,
    userRsvp: mine?.status ?? null,
    userTicketCode: mine?.ticketCode ?? null,
    userWaitlisted: mine?.waitlisted ?? false,
    userCheckedIn: mine?.checkedIn ?? false,
  };
}

export async function listYardEvents(
  communityId: string,
  currentUser?: string,
): Promise<YardEvent[]> {
  if (isTauri()) {
    return invoke("list_yard_events", {
      communityId,
      currentUser: currentUser ?? null,
    });
  }
  const me = currentUser || getCurrentHandle() || "demo_user";
  return load()
    .events.filter((e) => e.communityId === communityId)
    .map((e) => enrich(e, me));
}

export async function createYardEvent(args: {
  communityId: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt?: string;
  capacity?: number | null;
  orgId?: string | null;
  requiresOrgMember?: boolean;
  ticketPriceWb?: number;
  eventKind?: string;
}): Promise<YardEvent> {
  if (isTauri()) {
    return invoke("create_yard_event", {
      sessionToken: getSessionToken() || "",
      communityId: args.communityId,
      title: args.title,
      description: args.description,
      location: args.location,
      startsAt: args.startsAt,
      endsAt: args.endsAt ?? null,
      capacity: args.capacity ?? null,
      orgId: args.orgId ?? null,
      requiresOrgMember: args.requiresOrgMember ?? false,
      ticketPriceWb: args.ticketPriceWb ?? 0,
      eventKind: args.eventKind ?? "general",
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const s = load();
  const id = s.nextId++;
  const ev: YardEvent = {
    id,
    communityId: args.communityId,
    title: args.title,
    description: args.description,
    location: args.location,
    startsAt: args.startsAt,
    endsAt: args.endsAt,
    createdBy: me,
    createdByDisplayName: me,
    rsvpCount: 0,
    goingCount: 0,
    waitlistCount: 0,
    capacity: args.capacity,
    orgId: args.orgId,
    requiresOrgMember: args.requiresOrgMember,
    ticketPriceWb: args.ticketPriceWb ?? 0,
    eventKind: args.eventKind || "general",
    spotsRemaining: args.capacity,
  };
  s.events.push(ev);
  save(s);
  return ev;
}

export async function rsvpYardEvent(
  eventId: number,
  status: "going" | "interested",
): Promise<RsvpResult> {
  if (isTauri()) {
    return invoke("rsvp_yard_event", {
      sessionToken: getSessionToken() || "",
      eventId,
      status,
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const s = load();
  const ev = s.events.find((e) => e.id === eventId);
  if (!ev) throw new Error("Event not found");

  // Demo: club exclusive still allows RSVP with warning only if no org check store
  const list = s.rsvps[String(eventId)] || [];
  const going = list.filter(
    (r) => r.status === "going" && !r.waitlisted,
  ).length;
  let finalStatus: string = status === "interested" ? "interested" : "going";
  let waitlisted = false;
  if (
    status === "going" &&
    ev.capacity != null &&
    going >= ev.capacity &&
    !list.find((r) => r.handle === me && r.status === "going" && !r.waitlisted)
  ) {
    finalStatus = "waitlist";
    waitlisted = true;
  }
  const code = ticketCode(eventId, me);
  const paid =
    finalStatus === "going" && !waitlisted ? ev.ticketPriceWb || 0 : 0;
  const existing = list.findIndex((r) => r.handle === me);
  const row = {
    status: finalStatus,
    ticketCode: code,
    paidWb: paid,
    waitlisted,
    checkedIn: false,
    handle: me,
    displayName: me,
    createdAt: new Date().toISOString(),
  };
  if (existing >= 0) list[existing] = { ...list[existing], ...row };
  else list.push(row);
  s.rsvps[String(eventId)] = list;
  save(s);
  return {
    rsvped: true,
    status: finalStatus,
    ticketCode: code,
    waitlisted,
    paidWb: paid,
    earn: { wb: 2 },
    pass: {
      type: "blkspace_event_pass_v1",
      eventId,
      ticketCode: code,
      handle: me,
      status: finalStatus,
    },
  };
}

export async function cancelYardEventRsvp(eventId: number): Promise<boolean> {
  if (isTauri()) {
    return invoke("cancel_yard_event_rsvp", {
      sessionToken: getSessionToken() || "",
      eventId,
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const s = load();
  const list = s.rsvps[String(eventId)] || [];
  s.rsvps[String(eventId)] = list.filter((r) => r.handle !== me);
  save(s);
  return true;
}

export async function listEventGuests(eventId: number): Promise<EventGuest[]> {
  if (isTauri()) {
    return invoke("list_event_guests", {
      sessionToken: getSessionToken() || "",
      eventId,
    });
  }
  const list = load().rsvps[String(eventId)] || [];
  return list.map((r) => ({
    handle: r.handle,
    displayName: r.displayName,
    status: r.status,
    ticketCode: r.ticketCode,
    paidWb: r.paidWb,
    checkedIn: r.checkedIn,
    waitlisted: r.waitlisted,
    createdAt: r.createdAt,
    yardCred: 20,
  }));
}

export async function checkInEventGuest(
  eventId: number,
  ticketOrHandle: string,
): Promise<{
  checkedIn: boolean;
  handle?: string;
  alreadyCheckedIn?: boolean;
}> {
  if (isTauri()) {
    return invoke("check_in_event_guest", {
      sessionToken: getSessionToken() || "",
      eventId,
      ticketOrHandle,
    });
  }
  const s = load();
  const list = s.rsvps[String(eventId)] || [];
  const g = list.find(
    (r) =>
      r.ticketCode === ticketOrHandle.trim() ||
      r.handle === ticketOrHandle.trim(),
  );
  if (!g) throw new Error("Guest not found for this event");
  if (g.waitlisted || g.status === "waitlist") {
    throw new Error("Guest is waitlisted — cannot check in");
  }
  if (g.status !== "going") throw new Error(`Guest status is '${g.status}'`);
  if (g.checkedIn) {
    return { checkedIn: true, alreadyCheckedIn: true, handle: g.handle };
  }
  g.checkedIn = true;
  save(s);
  return { checkedIn: true, alreadyCheckedIn: false, handle: g.handle };
}

const DEMO_OPEN: OpenToCandidate[] = [
  {
    handle: "demo_user",
    displayName: "Demo User",
    university: "Tennessee State University",
    town: "tsu",
    headline:
      "CS junior · finished summer SWE internship · seeking research + lab roles",
    major: "Computer Science",
    skills: ["Python", "Rust", "privacy", "MPC"],
    portfolioUrl: "https://github.com/example",
    experience:
      "Summer internship: built internal tools for data pipelines. Seeking fall research.",
    openToWork: true,
    openToResearch: true,
    graduationYear: "2027",
    karma: 42,
  },
  {
    handle: "hbcustudent",
    displayName: "HBCU Student",
    university: "Howard University",
    town: "howard",
    headline: "Fashion + design major · open to collabs and service clubs",
    major: "Fashion Design",
    skills: ["Adobe", "tech packs", "merch"],
    portfolioUrl: "",
    experience: "Style Lab drops and campus lookbooks.",
    openToWork: true,
    openToResearch: false,
    graduationYear: "2026",
    karma: 18,
  },
];

export async function listOpenToOpportunities(
  filter?: "all" | "work" | "research",
): Promise<OpenToCandidate[]> {
  if (isTauri()) {
    const rows = await invoke<OpenToCandidate[]>("list_open_to_opportunities", {
      sessionToken: getSessionToken() || null,
      filter: filter && filter !== "all" ? filter : null,
    });
    if (rows?.length) return rows;
  }
  // Merge demo + any local pro profiles marked open
  let board = [...DEMO_OPEN];
  try {
    const extra = localStorage.getItem(OPEN_KEY);
    if (extra) board = [...board, ...(JSON.parse(extra) as OpenToCandidate[])];
  } catch {
    /* ignore */
  }
  if (filter === "work") return board.filter((b) => b.openToWork);
  if (filter === "research") return board.filter((b) => b.openToResearch);
  return board;
}
