/**
 * Typeverse Racers. A verse is the track. The CPU types at a fixed pace,
 * or another student on the same yard races the same verse.
 * WeixBucks for a win are practice credits, capped per day, and not cash.
 */

import {
  accuracyPct,
  correctCount,
  foldKeys,
  pickIndex,
  type Verse,
} from "@/lib/typeverse";

export const RACER_KEY = "blkspace_typeverse_racer_v1";
export const MIN_VERSE_CHARS = 40;
export const MAX_VERSE_CHARS = 280;
export const RACE_ACCURACY = 90;
export const MAX_RACE_WPM = 250;
export const DAILY_RACE_CAP = 40;
export const YARD_RACE_PRIZE = 12;

export const RACER_BODIES = [
  { id: "coupe", label: "Coupe" },
  { id: "lowrider", label: "Lowrider" },
  { id: "bus", label: "Bus" },
  { id: "bike", label: "Bike" },
] as const;

export const RACER_PAINTS = [
  { id: "gold", label: "Gold", hex: "#e2b714" },
  { id: "yard", label: "Yard green", hex: "#1f7a4d" },
  { id: "night", label: "Night", hex: "#1c1c1f" },
  { id: "cream", label: "Cream", hex: "#f3efe2" },
  { id: "cardinal", label: "Cardinal", hex: "#8f1d2c" },
  { id: "royal", label: "Royal", hex: "#243e8b" },
] as const;

export const RACE_DIFFICULTIES = [
  { id: "cruise", label: "Cruise", wpm: 20, prize: 4 },
  { id: "campus", label: "Campus", wpm: 40, prize: 8 },
  { id: "yard", label: "Yard", wpm: 60, prize: 12 },
  { id: "record", label: "Record", wpm: 90, prize: 16 },
] as const;

export type RacerBody = (typeof RACER_BODIES)[number]["id"];
export type RacerPaint = (typeof RACER_PAINTS)[number]["id"];
export type RaceDifficulty = (typeof RACE_DIFFICULTIES)[number]["id"];

export interface RacerVehicle {
  name: string;
  body: RacerBody;
  paint: RacerPaint;
  accent: RacerPaint;
  number: number;
}

export function defaultVehicle(): RacerVehicle {
  return { name: "Yard", body: "coupe", paint: "gold", accent: "night", number: 9 };
}

function bodyOf(value: unknown): RacerBody {
  return RACER_BODIES.some((row) => row.id === value)
    ? (value as RacerBody)
    : "coupe";
}

function paintOf(value: unknown, fallback: RacerPaint): RacerPaint {
  return RACER_PAINTS.some((row) => row.id === value)
    ? (value as RacerPaint)
    : fallback;
}

export function normalizeVehicle(raw: Partial<RacerVehicle> | null): RacerVehicle {
  const base = defaultVehicle();
  const name = String(raw?.name || base.name)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
  const number = Math.floor(Number(raw?.number));
  return {
    name: name || base.name,
    body: bodyOf(raw?.body),
    paint: paintOf(raw?.paint, base.paint),
    accent: paintOf(raw?.accent, base.accent),
    number: Number.isFinite(number) ? Math.max(0, Math.min(99, number)) : base.number,
  };
}

export function readVehicle(raw: string | null): RacerVehicle {
  if (!raw) return defaultVehicle();
  try {
    return normalizeVehicle(JSON.parse(raw) as Partial<RacerVehicle>);
  } catch {
    return defaultVehicle();
  }
}

export function paintHex(id: string): string {
  return RACER_PAINTS.find((row) => row.id === id)?.hex ?? "#e2b714";
}

export function vehicleLabel(vehicle: RacerVehicle): string {
  const body = RACER_BODIES.find((row) => row.id === vehicle.body)?.label ?? "Coupe";
  const num = String(vehicle.number).padStart(2, "0");
  return `${vehicle.name} · ${body} #${num}`;
}

export function difficultySpec(id: string) {
  return RACE_DIFFICULTIES.find((row) => row.id === id) ?? RACE_DIFFICULTIES[1];
}

export function prizeFor(kind: string): number {
  if (kind === "match") return YARD_RACE_PRIZE;
  return difficultySpec(kind).prize;
}

/** Characters a steady typer has completed after elapsedMs. */
export function cpuChars(elapsedMs: number, wpm: number): number {
  if (elapsedMs <= 0 || wpm <= 0) return 0;
  return (wpm * 5 * elapsedMs) / 60_000;
}

export function cpuFinishMs(length: number, wpm: number): number {
  if (length <= 0 || wpm <= 0) return 0;
  return (length * 60_000) / (wpm * 5);
}

export function minFinishMs(length: number): number {
  return cpuFinishMs(length, MAX_RACE_WPM);
}

export function trackProgress(done: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(1, done / length));
}

export function judgeCpuFinish(input: {
  typed: string;
  verse: string;
  elapsedMs: number;
  wpm: number;
}): { accuracy: number; beat: boolean; reason: string } {
  const typed = input.typed;
  const verse = input.verse;
  const accuracy = accuracyPct(correctCount(typed, verse), typed.length);
  if (typed.length !== verse.length) {
    if (input.elapsedMs >= cpuFinishMs(verse.length, input.wpm)) {
      return { accuracy, beat: false, reason: "The CPU finished first." };
    }
    return { accuracy, beat: false, reason: "Finish the verse." };
  }
  if (accuracy < RACE_ACCURACY) {
    return { accuracy, beat: false, reason: "Accuracy under 90%." };
  }
  if (input.elapsedMs < minFinishMs(verse.length)) {
    return {
      accuracy,
      beat: false,
      reason: "That finish is faster than the race allows.",
    };
  }
  if (input.elapsedMs >= cpuFinishMs(verse.length, input.wpm)) {
    return { accuracy, beat: false, reason: "The CPU finished first." };
  }
  return { accuracy, beat: true, reason: "You beat the CPU." };
}

/** A race verse is long enough to be a track and short enough to finish. */
export function pickRaceVerse(
  verses: Verse[],
  rng: () => number = Math.random,
): Verse | null {
  if (!verses.length) return null;
  for (let i = 0; i < 40; i++) {
    const verse = verses[pickIndex(verses.length, rng)];
    const text = foldKeys(verse.text);
    if (text.length >= MIN_VERSE_CHARS && text.length <= MAX_VERSE_CHARS) {
      return { ...verse, text };
    }
  }
  return null;
}
