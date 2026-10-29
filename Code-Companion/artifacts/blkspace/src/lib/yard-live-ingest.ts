import { getCurrentHandle } from "@/lib/auth";
import { hostedPost } from "@/lib/hosted-api";

/** The yard stores SDP and ICE only. The picture stays peer to peer. */
export const LIVE_SDP_MAX = 20_000;

export interface YardLiveViewer {
  id: string;
  handle: string;
  offer: string | null;
  answer: string | null;
  hostCandidates: string[];
  viewerCandidates: string[];
}

export interface YardLiveSession {
  id: string;
  yardId: string;
  hostHandle: string;
  title: string;
  createdAt: string;
  viewers: YardLiveViewer[];
}

export function yardIceServers(): RTCIceServer[] {
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

export function liveSdpOk(value: string): boolean {
  const sdp = value.trim();
  return sdp.startsWith("v=0") && sdp.length <= LIVE_SDP_MAX;
}

async function postLive(body: Record<string, unknown>): Promise<Response> {
  return hostedPost("/api/yards/live", body);
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const json = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!res.ok || json?.ok === false) {
    throw new Error(
      typeof json?.error === "string"
        ? json.error
        : "Could not open that camera.",
    );
  }
  return json || {};
}

export async function listYardLive(yardId: string): Promise<YardLiveSession[]> {
  const res = await fetch(`/api/yards/live?yard=${encodeURIComponent(yardId)}`);
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as {
    sessions?: YardLiveSession[];
  } | null;
  return Array.isArray(json?.sessions) ? json.sessions : [];
}

export async function readYardLive(
  id: string,
): Promise<YardLiveSession | null> {
  const res = await fetch(`/api/yards/live?id=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    session?: YardLiveSession;
  } | null;
  return json?.session || null;
}

export async function startYardLive(
  yardId: string,
  title: string,
): Promise<YardLiveSession> {
  const res = await postLive({
    action: "start",
    yardId,
    title,
    handle: getCurrentHandle(),
  });
  const json = await readJson(res);
  return json.session as YardLiveSession;
}

export async function joinYardLive(sessionId: string): Promise<YardLiveViewer> {
  const res = await postLive({
    action: "join",
    sessionId,
    handle: getCurrentHandle(),
  });
  const json = await readJson(res);
  return json.viewer as YardLiveViewer;
}

export async function sendLiveOffer(
  sessionId: string,
  viewerId: string,
  sdp: string,
): Promise<void> {
  await readJson(await postLive({ action: "offer", sessionId, viewerId, sdp }));
}

export async function sendLiveAnswer(
  sessionId: string,
  viewerId: string,
  sdp: string,
): Promise<void> {
  await readJson(
    await postLive({ action: "answer", sessionId, viewerId, sdp }),
  );
}

export async function sendLiveCandidate(
  sessionId: string,
  viewerId: string,
  from: "host" | "viewer",
  candidate: RTCIceCandidateInit,
): Promise<void> {
  await readJson(
    await postLive({
      action: "candidate",
      sessionId,
      viewerId,
      from,
      candidate: JSON.stringify(candidate),
    }),
  );
}

export async function endYardLive(sessionId: string): Promise<void> {
  await readJson(await postLive({ action: "end", sessionId }));
}
