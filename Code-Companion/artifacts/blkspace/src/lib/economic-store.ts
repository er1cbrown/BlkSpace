/**
 * Local-first ledger for tips + escrow history.
 * Balance overlays sit on top of Tauri / demo wallet so UX can be optimistic.
 */
import type { HistoryItem, TipRecord } from "@/lib/economic-types";

const STORE_KEY = "blkspace_economic_ledger_v1";

export interface EconomicStore {
  tips: TipRecord[];
  history: HistoryItem[];
  /** handle → WB delta from optimistic / local economic actions */
  balances: Record<string, number>;
  queue: QueueJob[];
}

export interface QueueJob {
  id: string;
  kind: "tip" | "escrow";
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}

function empty(): EconomicStore {
  return { tips: [], history: [], balances: {}, queue: [] };
}

let memory = empty();
let loaded = false;
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(memory));
  } catch {
    /* quota / private mode */
  }
}

function hydrate() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) memory = { ...empty(), ...(JSON.parse(raw) as EconomicStore) };
  } catch {
    memory = empty();
  }
}

export function getEconomicStore(): EconomicStore {
  hydrate();
  return memory;
}

export function mutateEconomicStore(
  fn: (s: EconomicStore) => void,
): EconomicStore {
  hydrate();
  fn(memory);
  persist();
  listeners.forEach((l) => l());
  return memory;
}

export function subscribeEconomicStore(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetEconomicStoreForTests() {
  memory = empty();
  loaded = true;
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function overlayBalance(handle: string, base: number): number {
  hydrate();
  return base + (memory.balances[handle] || 0);
}

export function applyBalanceDelta(handle: string, delta: number) {
  mutateEconomicStore((s) => {
    s.balances[handle] = (s.balances[handle] || 0) + delta;
  });
}

export function upsertTip(tip: TipRecord) {
  mutateEconomicStore((s) => {
    const i = s.tips.findIndex((t) => t.id === tip.id);
    if (i >= 0) s.tips[i] = tip;
    else s.tips.unshift(tip);
  });
}

export function pushHistory(item: HistoryItem) {
  mutateEconomicStore((s) => {
    const i = s.history.findIndex((h) => h.id === item.id);
    if (i >= 0) s.history[i] = item;
    else s.history.unshift(item);
  });
}

export function enqueueJob(job: Omit<QueueJob, "attempts">) {
  mutateEconomicStore((s) => {
    s.queue.push({ ...job, attempts: 0 });
  });
}

export function dequeueJob(id: string) {
  mutateEconomicStore((s) => {
    s.queue = s.queue.filter((j) => j.id !== id);
  });
}
