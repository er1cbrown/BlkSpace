/**
 * Content Hub — amalgamation media shelf for underrepresented networks.
 * Topics (chess, fashion, study, music, pro, culture) host uploads / links
 * students share for culture + literacy + future earn paths.
 * localStorage demo; Tauri can mirror via posts later.
 */
import { getCurrentHandle, getCurrentDisplayName } from "@/lib/auth";

export type HubTopic =
  | "chess"
  | "fashion"
  | "study"
  | "med"
  | "music"
  | "pro"
  | "culture"
  | "live"
  | "gaming";

export type HubItemKind = "post" | "video" | "article" | "stream" | "portfolio" | "lesson";

export interface HubItem {
  id: string;
  topic: HubTopic;
  kind: HubItemKind;
  title: string;
  body: string;
  /** Optional external watch / play / portfolio URL */
  mediaUrl: string;
  authorHandle: string;
  authorDisplayName: string;
  yardId: string;
  createdAt: string;
  /** Soft earn education tags — not auto-paid yet */
  earnHint: string;
}

const STORE = "blkspace_content_hub_v1";

export const HUB_TOPICS: {
  id: HubTopic;
  label: string;
  blurb: string;
  earnAngle: string;
}[] = [
  {
    id: "chess",
    label: "Chess & strategy",
    blurb: "Lessons, match recaps, campus tournaments, coach reels.",
    earnAngle: "Host events · teach · content · prize WB",
  },
  {
    id: "fashion",
    label: "Fashion & design",
    blurb: "Looks, tech packs, yard-sale drops.",
    earnAngle: "List on Yard Sale · tips · collabs",
  },
  {
    id: "study",
    label: "Study & wellness",
    blurb: "Midterm hours, notes, decompress sessions.",
    earnAngle: "Host study events · share resources",
  },
  {
    id: "med",
    label: "Med & health",
    blurb: "Meharry / HBCU med refresh, clinical curiosity, peer teaching (not a school LMS).",
    earnAngle: "Micro teaching · research interest · Cred",
  },
  {
    id: "music",
    label: "Music & mixes",
    blurb: "Profile songs, DJ drops, show recaps.",
    earnAngle: "Uploads · tips · merch",
  },
  {
    id: "pro",
    label: "Pro / portfolio",
    blurb: "Resumes, studio work, research posters.",
    earnAngle: "Connect opps · Studio paid unlock",
  },
  {
    id: "culture",
    label: "Culture & yard life",
    blurb: "HBCU energy, memes, homecoming, MADE vibes.",
    earnAngle: "Posts · engagement · brand collabs",
  },
  {
    id: "live",
    label: "Live & watch parties",
    blurb: "Link-out streams (Twitch, YT, IG, Discord stage).",
    earnAngle: "Host live · RSVP earn · tips later",
  },
  {
    id: "gaming",
    label: "Gaming",
    blurb: "Brackets, VODs, LFG, merch.",
    earnAngle: "Tournaments · content · merch",
  },
];

function seed(): HubItem[] {
  const now = Date.now();
  return [
    {
      id: `hub_${now}_1`,
      topic: "chess",
      kind: "lesson",
      title: "HBCU Chess Night · London System crash course",
      body: "15-min intro for club newcomers. Pair over the board or Lichess arena — report scores on the yard tournament board.",
      mediaUrl: "https://lichess.org/learn",
      authorHandle: "campus_king",
      authorDisplayName: "Campus King",
      yardId: "tsu",
      createdAt: new Date(now - 86400000).toISOString(),
      earnHint: "Teach → Cred · host tournament → prize WB path",
    },
    {
      id: `hub_${now}_2`,
      topic: "live",
      kind: "stream",
      title: "Watch party · Friday fighters (link-out)",
      body: "We don't host native live yet — drop your Twitch/YT/Discord stage link and the yard gathers here.",
      mediaUrl: "https://www.twitch.tv/",
      authorHandle: "demo_user",
      authorDisplayName: "Demo User",
      yardId: "tsu",
      createdAt: new Date(now - 3600000).toISOString(),
      earnHint: "RSVP + community posts earn soft WB",
    },
    {
      id: `hub_${now}_3`,
      topic: "pro",
      kind: "portfolio",
      title: "Studio drop · summer internship lookbook",
      body: "Portfolio shots from ProjectConnect + Studio free grant for peers, paid unlock for clients.",
      mediaUrl: "",
      authorHandle: "jane_doe",
      authorDisplayName: "Jane Doe",
      yardId: "howard",
      createdAt: new Date(now - 7200000).toISOString(),
      earnHint: "Studio unlock · Connect opportunities",
    },
    {
      id: `hub_${now}_4`,
      topic: "fashion",
      kind: "post",
      title: "Tech pack teaser · yard sale this week",
      body: "Fashion majors: list mockups with escrow. Club split when org co-sells.",
      mediaUrl: "",
      authorHandle: "hbcustudent",
      authorDisplayName: "HBCU Student",
      yardId: "tsu",
      createdAt: new Date(now - 10800000).toISOString(),
      earnHint: "Yard Sale fees + Cred before coin",
    },
    {
      id: `hub_${now}_5`,
      topic: "med",
      kind: "lesson",
      title: "Meharry Focus · 12-min Step-style physiology refresh",
      body: "Off-duty scroll that still serves boards. Peer-taught micro-lesson — not official curriculum. Pair with Focus Path time budget.",
      mediaUrl: "",
      authorHandle: "campus_king",
      authorDisplayName: "Campus King",
      yardId: "meharry",
      createdAt: new Date(now - 5400000).toISOString(),
      earnHint: "Teach peers → Cred · optional WB later",
    },
    {
      id: `hub_${now}_6`,
      topic: "med",
      kind: "article",
      title: "Health disparities journal club (async)",
      body: "Read one abstract, leave one takeaway. Built for rotations — no mandatory live hour.",
      mediaUrl: "",
      authorHandle: "jane_doe",
      authorDisplayName: "Jane Doe",
      yardId: "meharry",
      createdAt: new Date(now - 9000000).toISOString(),
      earnHint: "ProjectConnect research interest · low-bandwidth",
    },
  ];
}

function load(): HubItem[] {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const parsed = JSON.parse(raw) as HubItem[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  const s = seed();
  save(s);
  return s;
}

function save(items: HubItem[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(items.slice(0, 200)));
  } catch {
    /* ignore */
  }
}

export function listHubItems(topic?: HubTopic | "all"): HubItem[] {
  const items = load().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  if (!topic || topic === "all") return items;
  return items.filter((i) => i.topic === topic);
}

export function publishHubItem(input: {
  topic: HubTopic;
  kind: HubItemKind;
  title: string;
  body: string;
  mediaUrl?: string;
  yardId?: string;
  earnHint?: string;
}): HubItem {
  const title = input.title.trim();
  if (!title) throw new Error("Title required");
  const handle = getCurrentHandle() || "guest";
  const item: HubItem = {
    id: `hub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    topic: input.topic,
    kind: input.kind,
    title,
    body: input.body.trim(),
    mediaUrl: (input.mediaUrl || "").trim(),
    authorHandle: handle,
    authorDisplayName: getCurrentDisplayName() || handle,
    yardId: input.yardId || "tsu",
    createdAt: new Date().toISOString(),
    earnHint:
      input.earnHint ||
      HUB_TOPICS.find((t) => t.id === input.topic)?.earnAngle ||
      "Create · engage · build Cred",
  };
  const next = [item, ...load()];
  save(next);
  return item;
}

export function hubTopicLabel(id: HubTopic): string {
  return HUB_TOPICS.find((t) => t.id === id)?.label || id;
}
