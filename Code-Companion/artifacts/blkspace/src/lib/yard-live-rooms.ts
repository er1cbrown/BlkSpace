/**
 * Discord/Slack-style live rooms per yard.
 * Connectivity: Jitsi Meet (public, no server) or external stage URL (Discord/Zoom/YT).
 * Not TikTok-style broadcast ingest.
 */

import { getCurrentHandle } from "@/lib/auth";

export type LiveRoomKind = "stage" | "voice" | "external";

export interface YardLiveRoom {
  id: string;
  yardId: string;
  title: string;
  kind: LiveRoomKind;
  /** Optional external Discord/Zoom/YT/etc. */
  externalUrl?: string;
  /** Jitsi room slug (auto for stage/voice) */
  jitsiSlug: string;
  createdBy: string;
  createdAt: string;
  /** Soft presence handles (same device set) */
  present: string[];
}

const LS_KEY = "blkspace_yard_live_rooms_v1";

function loadAll(): YardLiveRoom[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as YardLiveRoom[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function saveAll(rooms: YardLiveRoom[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rooms.slice(0, 200)));
}

export function listLiveRooms(yardId: string): YardLiveRoom[] {
  return loadAll()
    .filter((r) => r.yardId === yardId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24) || "room"
  );
}

export function jitsiUrl(room: YardLiveRoom): string {
  // Public Jitsi — Discord-like free A/V without running SFU
  return `https://meet.jit.si/${encodeURIComponent(room.jitsiSlug)}`;
}

export function createLiveRoom(input: {
  yardId: string;
  title: string;
  kind: LiveRoomKind;
  externalUrl?: string;
}): YardLiveRoom {
  const title = input.title.trim() || "Yard stage";
  const id = `live_${Date.now().toString(36)}`;
  const handle = getCurrentHandle();
  const jitsiSlug = `BkspcYard${slugify(input.yardId)}${slugify(title)}${id.slice(-4)}`;
  const room: YardLiveRoom = {
    id,
    yardId: input.yardId,
    title,
    kind: input.kind,
    externalUrl: input.externalUrl?.trim() || undefined,
    jitsiSlug,
    createdBy: handle,
    createdAt: new Date().toISOString(),
    present: [handle],
  };
  saveAll([room, ...loadAll()]);
  return room;
}

export function deleteLiveRoom(roomId: string) {
  saveAll(loadAll().filter((r) => r.id !== roomId));
}

export function joinLiveRoom(roomId: string): YardLiveRoom | null {
  const handle = getCurrentHandle();
  const rooms = loadAll();
  const i = rooms.findIndex((r) => r.id === roomId);
  if (i < 0) return null;
  const room = rooms[i]!;
  if (!room.present.includes(handle)) {
    room.present = [...room.present, handle].slice(0, 50);
  }
  rooms[i] = room;
  saveAll(rooms);
  return room;
}

export function leaveLiveRoom(roomId: string): void {
  const handle = getCurrentHandle();
  const rooms = loadAll().map((r) => {
    if (r.id !== roomId) return r;
    return { ...r, present: r.present.filter((h) => h !== handle) };
  });
  saveAll(rooms);
}

export function isSafeExternalLiveUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    // Allow common stage hosts
    const host = u.hostname.toLowerCase();
    return (
      host.includes("discord") ||
      host.includes("zoom.") ||
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("twitch.tv") ||
      host.includes("meet.google") ||
      host.includes("meet.jit.si") ||
      host.includes("teams.microsoft") ||
      host.endsWith(".edu")
    );
  } catch {
    return false;
  }
}
