import { getCurrentHandle } from "@/lib/auth";
import { hostedPost } from "@/lib/hosted-api";

/** A public ingest. The stream key is only on the host's start response. */
export interface YardRtmpSession {
  id: string;
  yardId: string;
  hostHandle: string;
  title: string;
  createdAt: string;
  publishServer: string;
  playbackPath: string;
  live: boolean;
  streamKey?: string;
}

async function postRtmp(body: Record<string, unknown>): Promise<Response> {
  return hostedPost("/api/yards/rtmp", body);
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const json = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!res.ok || json?.ok === false) {
    throw new Error(
      typeof json?.error === "string" ? json.error : "Could not open ingest.",
    );
  }
  return json || {};
}

export async function listYardRtmp(yardId: string): Promise<YardRtmpSession[]> {
  const res = await fetch(`/api/yards/rtmp?yard=${encodeURIComponent(yardId)}`);
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as {
    sessions?: YardRtmpSession[];
  } | null;
  return Array.isArray(json?.sessions) ? json.sessions : [];
}

export async function readYardRtmp(
  id: string,
): Promise<YardRtmpSession | null> {
  const res = await fetch(`/api/yards/rtmp?id=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    session?: YardRtmpSession;
  } | null;
  return json?.session || null;
}

export async function startYardRtmp(
  yardId: string,
  title: string,
): Promise<YardRtmpSession> {
  const res = await postRtmp({
    action: "start",
    yardId,
    title,
    handle: getCurrentHandle(),
  });
  const json = await readJson(res);
  const session = json.session as YardRtmpSession | undefined;
  if (!session?.id || !session.streamKey) {
    throw new Error("Could not open ingest.");
  }
  return session;
}

export async function endYardRtmp(sessionId: string): Promise<void> {
  const res = await postRtmp({ action: "end", sessionId });
  await readJson(res);
}
