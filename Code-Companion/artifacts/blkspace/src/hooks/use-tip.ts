import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import { newEconomicId, runEconomicAction } from "@/lib/economic-action";
import {
  applyBalanceDelta,
  dequeueJob,
  enqueueJob,
  getEconomicStore,
  overlayBalance,
  pushHistory,
  upsertTip,
} from "@/lib/economic-store";
import type { EconomicPhase } from "@/lib/economic-action";
import type { TipRecord, TipStatus } from "@/lib/economic-types";
import { canTransitionTip } from "@/lib/economic-types";
import { calcPlatformFee, FEE_BPS } from "@/lib/tokenomics";
import { isTauri, tauriSendWeixBucks } from "@/lib/tauri-api";

export interface TipInput {
  toHandle: string;
  amount: number;
  message?: string;
  feeBps?: number;
  /** When false, skip the live send and stay queued (offline). Default: try live. */
  settleNow?: boolean;
}

export function tipFeeFor(amount: number, feeBps: number = FEE_BPS.tip): number {
  return calcPlatformFee(amount, feeBps);
}

function setTipStatus(id: string, status: TipStatus, extra?: Partial<TipRecord>) {
  const tip = getEconomicStore().tips.find((t) => t.id === id);
  if (!tip) return;
  if (tip.status !== status && !canTransitionTip(tip.status, status)) {
    throw new Error(`Illegal tip transition '${tip.status}' → '${status}'`);
  }
  const next: TipRecord = { ...tip, ...extra, status };
  upsertTip(next);
  pushHistory({
    id: `hist_tip_${id}`,
    kind: "tip",
    title: `Tip to @${next.toPubkey}`,
    description: next.message || "Appreciation tip",
    amount: -next.amount,
    fee: next.fee,
    status,
    createdAt: next.createdAt,
    counterparty: next.toPubkey,
  });
}

async function settleTip(tip: TipRecord, settleNow: boolean) {
  setTipStatus(tip.id, "confirmed");
  enqueueJob({
    id: tip.id,
    kind: "tip",
    payload: { to: tip.toPubkey, amount: tip.amount },
    createdAt: Date.now(),
  });

  if (!settleNow) return;

  if (isTauri()) {
    const token = getSessionToken() || "";
    await tauriSendWeixBucks(token, tip.toPubkey, tip.amount);
  }
  setTipStatus(tip.id, "settled", {
    settledAt: Date.now(),
    nostrEventId: `local:${tip.id}`,
  });
  const settled = getEconomicStore().tips.find((t) => t.id === tip.id);
  if (settled) {
    pushHistory({
      id: `hist_tip_${tip.id}`,
      kind: "tip",
      title: `Tip to @${settled.toPubkey}`,
      description: settled.message || "Appreciation tip",
      amount: -settled.amount,
      fee: settled.fee,
      status: "settled",
      createdAt: settled.createdAt,
      counterparty: settled.toPubkey,
      nostrEventId: settled.nostrEventId,
    });
  }
  dequeueJob(tip.id);
}

export function useTip(baseBalance: number) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<EconomicPhase>("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  const fromHandle = getCurrentHandle() || "demo_user";
  const balance = overlayBalance(fromHandle, baseBalance);

  const sendTip = useCallback(
    async (input: TipInput) => {
      const toHandle = input.toHandle.replace(/^@/, "").trim();
      const amount = Math.floor(input.amount);
      const feeBps = input.feeBps ?? FEE_BPS.tip;
      const fee = tipFeeFor(amount, feeBps);
      const settleNow = input.settleNow !== false && (typeof navigator === "undefined" || navigator.onLine);

      if (!toHandle) throw new Error("Recipient required");
      if (amount <= 0) throw new Error("Amount must be positive");
      if (amount > overlayBalance(fromHandle, baseBalance)) {
        throw new Error("Insufficient balance");
      }

      const tip: TipRecord = {
        id: newEconomicId("tip"),
        fromPubkey: fromHandle,
        toPubkey: toHandle,
        amount,
        fee,
        message: input.message?.trim() || undefined,
        status: "pending",
        createdAt: Date.now(),
      };

      setPhase("submitting");
      setLastError(null);

      try {
        await runEconomicAction({
          applyOptimistic: () => {
            applyBalanceDelta(fromHandle, -amount);
            applyBalanceDelta(toHandle, amount - fee);
            upsertTip(tip);
            pushHistory({
              id: `hist_tip_${tip.id}`,
              kind: "tip",
              title: `Tip to @${toHandle}`,
              description: tip.message || "Appreciation tip",
              amount: -amount,
              fee,
              status: "pending",
              createdAt: tip.createdAt,
              counterparty: toHandle,
              nostrEventId: undefined,
            });
            setPhase("optimistic");
            toast.success(`Sent ${amount} WB to @${toHandle}`);
            return tip;
          },
          persist: () => {
            /* already written in applyOptimistic via local store */
          },
          settle: async () => {
            setPhase("settling");
            await settleTip(tip, settleNow);
            setPhase(settleNow ? "settled" : "settling");
            qc.invalidateQueries({ queryKey: ["tauri", "wallet"] });
            qc.invalidateQueries({ queryKey: ["tauri", "user"] });
          },
          rollback: () => {
            applyBalanceDelta(fromHandle, amount);
            applyBalanceDelta(toHandle, -(amount - fee));
            setTipStatus(tip.id, "failed");
            setPhase("failed");
            toast.error("Tip failed — balance restored");
          },
        });
        return tip;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        setPhase("failed");
        throw e;
      }
    },
    [baseBalance, fromHandle, qc],
  );

  const retry = useCallback(
    async (tipId: string) => {
      const tip = getEconomicStore().tips.find((t) => t.id === tipId);
      if (!tip || tip.status !== "failed") return;
      await sendTip({
        toHandle: tip.toPubkey,
        amount: tip.amount,
        message: tip.message,
      });
    },
    [sendTip],
  );

  return { sendTip, retry, phase, lastError, balance, fromHandle };
}
