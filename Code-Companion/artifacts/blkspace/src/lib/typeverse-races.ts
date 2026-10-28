/**
 * Yard-desk races for Typeverse. The purse is credited on the yard.
 * A closed desk still lets the CPU race run on this device, unpaid.
 */
import { hostedPost } from "@/lib/hosted-api";
import type { RacerVehicle } from "@/lib/typeverse-race";

export interface RaceEntry {
  handle: string;
  accuracy: number;
  progress: number;
  finishedAt: string;
  vehicle: RacerVehicle | null;
}

export interface TypeverseRace {
  id: string;
  yardId: string;
  hostHandle: string;
  mode: "cpu" | "yard";
  difficulty: string;
  verseRef: string;
  verseText: string;
  status: "open" | "done";
  winnerHandle: string;
  createdAt: string;
  startedAt: string;
  entries: RaceEntry[];
}

export interface RaceFinish {
  ok: boolean;
  won: boolean;
  paid: number;
  balance: number;
  accuracy: number;
  reason: string;
  race: TypeverseRace;
}

async function readBody(res: Response): Promise<Record<string, unknown>> {
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || body?.ok === false) {
    throw new Error(
      typeof body?.error === "string" ? body.error : "The yard desk refused that race.",
    );
  }
  return body || {};
}

export async function createTypeverseRace(input: {
  id: string;
  yardId: string;
  mode: "cpu" | "yard";
  difficulty: string;
  verseRef: string;
  verseText: string;
  vehicle: RacerVehicle;
}): Promise<TypeverseRace> {
  const res = await hostedPost("/api/yards/typeverse/races", input);
  const body = await readBody(res);
  return body.race as TypeverseRace;
}

export async function joinTypeverseRace(input: {
  raceId: string;
  yardId: string;
  vehicle: RacerVehicle;
}): Promise<TypeverseRace> {
  const res = await hostedPost("/api/yards/typeverse/races/join", input);
  const body = await readBody(res);
  return body.race as TypeverseRace;
}

export async function reportTypeverseProgress(input: {
  raceId: string;
  yardId: string;
  correct: number;
}): Promise<void> {
  const res = await hostedPost("/api/yards/typeverse/races/progress", input);
  await readBody(res);
}

export async function finishTypeverseRace(input: {
  raceId: string;
  yardId: string;
  typed: string;
}): Promise<RaceFinish> {
  const res = await hostedPost("/api/yards/typeverse/races/finish", input);
  const body = await readBody(res);
  return body as unknown as RaceFinish;
}

export async function listTypeverseRaces(yardId: string): Promise<TypeverseRace[]> {
  const res = await fetch(
    `/api/yards/typeverse/races?yard=${encodeURIComponent(yardId)}`,
  );
  if (!res.ok) return [];
  const body = (await res.json().catch(() => null)) as {
    races?: TypeverseRace[];
  } | null;
  return Array.isArray(body?.races) ? body.races : [];
}

export async function fetchTypeverseRace(
  yardId: string,
  id: string,
): Promise<TypeverseRace | null> {
  const res = await fetch(
    `/api/yards/typeverse/races?yard=${encodeURIComponent(yardId)}&id=${encodeURIComponent(id)}`,
  );
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as {
    race?: TypeverseRace;
  } | null;
  return body?.race ?? null;
}
