import { useSyncExternalStore } from "react";
import {
  getEconomicStore,
  overlayBalance,
  subscribeEconomicStore,
  type EconomicStore,
} from "@/lib/economic-store";
import { getCurrentHandle } from "@/lib/auth";

export function useEconomicLedger(): EconomicStore {
  return useSyncExternalStore(
    subscribeEconomicStore,
    getEconomicStore,
    getEconomicStore,
  );
}

export function useOptimisticBalance(baseBalance: number): number {
  const handle = getCurrentHandle() || "demo_user";
  useEconomicLedger();
  return overlayBalance(handle, baseBalance);
}
