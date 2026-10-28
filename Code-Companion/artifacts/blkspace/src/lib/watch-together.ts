/**
 * Shared clock for a watch room. The host publishes the playhead.
 * Joiners follow it. The yard does not move the video bytes.
 */

import { hostedPost } from "@/lib/hosted-api";
import { createHttpAuthHeader } from "@/lib/auth";

export interface WatchClock {
  positionMs: number;
  playing: boolean;
  updatedAt: string;
  hostHandle: string;
}

export function followPosition(
  clock: Pick<WatchClock, "positionMs" | "playing" | "updatedAt">,
  nowMs: number,
): number {
  const base = Math.max(0, Math.floor(clock.positionMs) || 0);
  if (!clock.playing) return base;
  const stamp = Date.parse(clock.updatedAt);
  if (!Number.isFinite(stamp)) return base;
  return base + Math.max(0, nowMs - stamp);
}

export async function pushWatchClock(
  roomId: string,
  positionMs: number,
  playing: boolean,
): Promise<void> {
  const res = await hostedPost("/api/yards/rooms/watch", {
    roomId,
    positionMs: Math.max(0, Math.round(positionMs)),
    playing,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || "The watch clock did not save.");
  }
}

export async function readWatchClock(roomId: string): Promise<WatchClock | null> {
  const path = `/api/yards/rooms/watch?room=${encodeURIComponent(roomId)}`;
  try {
    const res = await fetch(path, {
      headers: { authorization: createHttpAuthHeader(path, "GET", "") },
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body?.clock) return null;
    return {
      positionMs: Number(body.clock.positionMs) || 0,
      playing: body.clock.playing === true,
      updatedAt: String(body.clock.updatedAt || ""),
      hostHandle: String(body.clock.hostHandle || ""),
    };
  } catch {
    return null;
  }
}
