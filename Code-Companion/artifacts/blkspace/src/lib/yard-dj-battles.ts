/**
 * Yard Arcade DJ battle lobbies.
 * The call is a public Jitsi room, or a Discord/Slack/Meet link the host
 * pastes. BlkSpace does not run the voice server and does not pull audio
 * from another site. The mix is one already published on the hub.
 */
import type { AudioMixtape, MixSetKind } from "@/lib/audio-mixtapes";
import { mixSetKind } from "@/lib/audio-mixtapes";
import { getCurrentHandle } from "@/lib/auth";
import { hostedPost } from "@/lib/hosted-api";
import { isSafeExternalLiveUrl, jitsiUrl } from "@/lib/yard-live-rooms";
import type { YardLiveRoom } from "@/lib/yard-live-rooms";

export interface DjBattle {
  id: string;
  yardId: string;
  title: string;
  mixId: string;
  mixTitle: string;
  setKind: MixSetKind;
  callUrl: string;
  jitsiSlug: string;
  hostHandle: string;
  createdAt: string;
}

const LS_KEY = "blkspace_yard_dj_battles_v1";

function load(): DjBattle[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DjBattle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(rows: DjBattle[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows.slice(0, 48)));
}

function withKind(row: DjBattle): DjBattle {
  return {
    ...row,
    setKind: mixSetKind(row.setKind),
    callUrl: row.callUrl || "",
  };
}

export function listBattles(yardId?: string): DjBattle[] {
  return load()
    .map(withKind)
    .filter((row) => !yardId || yardId === "all" || row.yardId === yardId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function battleCallUrl(battle: DjBattle): string {
  if (battle.callUrl) return battle.callUrl;
  const room = { jitsiSlug: battle.jitsiSlug } as YardLiveRoom;
  return jitsiUrl(room);
}

export function hostBattle(input: {
  title: string;
  mixtape: AudioMixtape;
  callUrl?: string;
}): DjBattle {
  const title = input.title.trim();
  if (!title) throw new Error("Name the battle.");
  const callUrl = (input.callUrl || "").trim();
  if (callUrl && !isSafeExternalLiveUrl(callUrl)) {
    throw new Error("Paste a Discord, Slack, Zoom, or Meet link.");
  }
  const handle = getCurrentHandle() || "guest";
  const id = `battle_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const slug = `BkspcBattle${id.replace(/[^a-z0-9]/gi, "").slice(-12)}`;
  const battle: DjBattle = {
    id,
    yardId: input.mixtape.yardId || "tsu",
    title,
    mixId: input.mixtape.id,
    mixTitle: input.mixtape.title,
    setKind: mixSetKind(input.mixtape.setKind),
    callUrl,
    jitsiSlug: slug,
    hostHandle: handle,
    createdAt: new Date().toISOString(),
  };
  save([battle, ...load()]);
  return battle;
}

export async function syncBattles(yardId?: string): Promise<void> {
  const yard = (yardId || "").trim();
  let remote: DjBattle[] = [];
  try {
    const query =
      yard && yard !== "all" ? `?yard=${encodeURIComponent(yard)}` : "";
    const res = await fetch(`/api/yards/battles${query}`);
    if (!res.ok) return;
    const body = await res.json();
    if (!Array.isArray(body.battles)) return;
    remote = body.battles.map((row: DjBattle) => withKind(row));
  } catch {
    return;
  }
  const local = load();
  const ids = new Set(local.map((row) => row.id));
  const extra = remote.filter((row) => !ids.has(row.id));
  if (extra.length) save([...extra, ...local]);
  const seen = new Set(remote.map((row) => row.id));
  for (const battle of load()) {
    if (seen.has(battle.id)) continue;
    if (yard && yard !== "all" && battle.yardId !== yard) continue;
    try {
      await hostedPost("/api/yards/battles", battle);
    } catch {
      /* this browser keeps the lobby when the desk is closed */
    }
  }
}
