/**
 * Flow judge for a LogosDecks showcase.
 * A combo counts clean hits in a row, the way a rhythm game counts consistency.
 * The flow meter rises with that chain. The higher score when the set closes wins.
 * Tradition does not change the points.
 */
import { HOSTED_READING, type DeckLoad } from "@/lib/logos-deck-mix";

export const FLOW_MAX = 100;
export const FLOW_PER_COMBO = 8;
/** A longer gap than this breaks the chain before the next hit. */
export const FLOW_GAP_MS = 4000;
export const HIT_GREAT = 300;
export const HIT_GOOD = 100;

const FLOW_STORE = "blkspace_logos_flow_v1";

export type HitJudgment = "great" | "good" | "miss";

export interface SideFlow {
  score: number;
  combo: number;
  bestCombo: number;
  /** 0 to 100. Full flow doubles a hit. */
  flow: number;
  lastHitAt: number;
}

export interface FlowFight {
  a: SideFlow;
  b: SideFlow;
  closed: boolean;
  winner: "a" | "b" | "even" | null;
}

export interface StoredFight extends FlowFight {
  aLoad: string;
  bLoad: string;
}

export interface FlowHit {
  state: FlowFight;
  judgment: HitJudgment;
}

export function emptySide(): SideFlow {
  return { score: 0, combo: 0, bestCombo: 0, flow: 0, lastHitAt: 0 };
}

export function emptyFight(): FlowFight {
  return { a: emptySide(), b: emptySide(), closed: false, winner: null };
}

/** A reading with hosted words is live on the deck. A track is live while it plays. */
export function showcaseLive(load: DeckLoad | null, playing: boolean): boolean {
  if (!load) return false;
  if (load.playable && playing) return true;
  return load.lane === "book" && !!load.text && load.text !== HOSTED_READING;
}

/** 0 favors A, 100 favors B, 50 means both are in front. */
export function sideInFront(fader: number, side: "a" | "b"): boolean {
  const raw = Number(fader);
  const t = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 50;
  if (side === "a") return t <= 50;
  return t >= 50;
}

export function flowFromCombo(combo: number): number {
  const n = Math.max(0, Math.floor(Number(combo) || 0));
  return Math.min(FLOW_MAX, n * FLOW_PER_COMBO);
}

/** A full flow meter doubles the hit. Combo 1 is only a small bump. */
export function hitScore(judgment: "great" | "good", combo: number): number {
  const base = judgment === "great" ? HIT_GREAT : HIT_GOOD;
  return Math.round(base * (1 + flowFromCombo(combo) / FLOW_MAX));
}

function cleanSide(row: Partial<SideFlow> | undefined): SideFlow {
  const score = Math.max(0, Math.floor(Number(row?.score) || 0));
  const combo = Math.max(0, Math.floor(Number(row?.combo) || 0));
  const bestCombo = Math.max(combo, Math.floor(Number(row?.bestCombo) || 0));
  return {
    score,
    combo,
    bestCombo,
    flow: flowFromCombo(combo),
    lastHitAt: Math.max(0, Math.floor(Number(row?.lastHitAt) || 0)),
  };
}

function setSide(state: FlowFight, side: "a" | "b", row: SideFlow): FlowFight {
  return side === "a" ? { ...state, a: row } : { ...state, b: row };
}

export function scoreLead(state: FlowFight): "a" | "b" | "even" {
  if (state.closed && state.winner) return state.winner;
  if (state.a.score === state.b.score) return "even";
  return state.a.score > state.b.score ? "a" : "b";
}

/** Swapping the showcase breaks the chain. The score stays. */
export function breakChain(state: FlowFight, side: "a" | "b"): FlowFight {
  if (state.closed) return state;
  const row = state[side];
  return setSide(state, side, { ...row, combo: 0, flow: 0, lastHitAt: 0 });
}

export function strikeFlow(input: {
  state: FlowFight;
  side: "a" | "b";
  load: DeckLoad | null;
  playing: boolean;
  fader: number;
  now: number;
}): FlowHit {
  if (input.state.closed) {
    return { state: input.state, judgment: "miss" };
  }
  const now = Math.max(0, Math.floor(Number(input.now) || 0));
  const row = input.state[input.side];
  if (!showcaseLive(input.load, input.playing)) {
    return {
      judgment: "miss",
      state: setSide(input.state, input.side, {
        ...row,
        combo: 0,
        flow: 0,
        lastHitAt: now,
      }),
    };
  }
  let combo = row.combo;
  if (row.lastHitAt > 0 && now - row.lastHitAt > FLOW_GAP_MS) combo = 0;
  combo += 1;
  const judgment: HitJudgment = sideInFront(input.fader, input.side)
    ? "great"
    : "good";
  const next: SideFlow = {
    score: row.score + hitScore(judgment, combo),
    combo,
    bestCombo: Math.max(row.bestCombo, combo),
    flow: flowFromCombo(combo),
    lastHitAt: now,
  };
  return { judgment, state: setSide(input.state, input.side, next) };
}

/** The higher score wins. An even score is a draw. */
export function closeSet(state: FlowFight): FlowFight {
  if (state.closed) return state;
  const winner = scoreLead(state);
  return { ...state, closed: true, winner };
}

export function runItBack(): FlowFight {
  return emptyFight();
}

export function readFight(id: string): StoredFight | null {
  const key = id.trim() || "showcase";
  try {
    const raw = localStorage.getItem(FLOW_STORE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, StoredFight>;
    const row = parsed?.[key];
    if (!row || typeof row !== "object") return null;
    const open: FlowFight = {
      a: cleanSide(row.a),
      b: cleanSide(row.b),
      closed: false,
      winner: null,
    };
    const state = row.closed ? closeSet(open) : open;
    return {
      ...state,
      aLoad: typeof row.aLoad === "string" ? row.aLoad : "",
      bLoad: typeof row.bLoad === "string" ? row.bLoad : "",
    };
  } catch {
    return null;
  }
}

export function writeFight(
  id: string,
  state: FlowFight,
  loads: { a: string; b: string },
): StoredFight {
  const key = id.trim() || "showcase";
  const next: StoredFight = {
    a: cleanSide(state.a),
    b: cleanSide(state.b),
    closed: state.closed,
    winner: state.closed ? scoreLead(state) : null,
    aLoad: loads.a,
    bLoad: loads.b,
  };
  let all: Record<string, StoredFight> = {};
  try {
    const raw = localStorage.getItem(FLOW_STORE);
    const parsed = raw ? (JSON.parse(raw) as Record<string, StoredFight>) : {};
    if (parsed && typeof parsed === "object") all = parsed;
  } catch {
    all = {};
  }
  all[key] = next;
  localStorage.setItem(FLOW_STORE, JSON.stringify(all));
  return next;
}
