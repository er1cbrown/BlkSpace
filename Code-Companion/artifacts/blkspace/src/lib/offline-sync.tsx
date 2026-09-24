import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSessionToken } from "@/lib/auth";
import {
  isTauri,
  tauriFlushOfflineQueue,
  tauriSyncPortfolioOnce,
  type TauriPortfolioSyncResult,
} from "@/lib/tauri-api";

interface FlushResult {
  synced: number;
  failed: number;
  remaining: number;
}

export function OfflineSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const qc = useQueryClient();
  const flushing = useRef(false);

  const flush = useMutation({
    mutationFn: async (): Promise<{
      offline: FlushResult;
      hosted: TauriPortfolioSyncResult | null;
    }> => {
      const token = getSessionToken();
      if (!token)
        return {
          offline: { synced: 0, failed: 0, remaining: 0 },
          hosted: null,
        };
      const offline = await tauriFlushOfflineQueue(token);
      let hosted: TauriPortfolioSyncResult | null = null;
      try {
        hosted = await tauriSyncPortfolioOnce(token);
      } catch (error) {
        // Hosted sync is optional/best-effort; local offline actions remain safe.
        console.warn("BlkSpace hosted sync deferred", error);
      }
      return { offline, hosted };
    },
    onSuccess: ({ offline, hosted }) => {
      if (offline.synced > 0) {
        qc.invalidateQueries({ queryKey: ["tauri"] });
        toast.success(
          `Synced ${offline.synced} offline action${offline.synced === 1 ? "" : "s"}`,
        );
      }
      if (offline.failed > 0) {
        toast.error(
          `${offline.failed} offline action${offline.failed === 1 ? "" : "s"} failed to sync`,
        );
      }
      if (hosted && hosted.failed > 0) {
        toast.message(
          `${hosted.failed} hosted post${hosted.failed === 1 ? "" : "s"} will retry when the service is available.`,
        );
      }
      if (hosted && (hosted.cached > 0 || hosted.pushed > 0)) {
        qc.invalidateQueries({ queryKey: ["tauri", "posts"] });
        qc.invalidateQueries({ queryKey: ["tauri", "hosted-posts"] });
      }
    },
  });

  useEffect(() => {
    if (!isTauri()) return;

    const tryFlush = () => {
      if (!navigator.onLine || !getSessionToken() || flushing.current) return;
      flushing.current = true;
      flush.mutate(undefined, {
        onSettled: () => {
          flushing.current = false;
        },
      });
    };
    const onIdentity = () => window.setTimeout(tryFlush, 250);

    // Defer first flush so feed IPC wins the race on cold boot.
    const startupDelay = window.setTimeout(tryFlush, 3_000);
    window.addEventListener("online", tryFlush);
    window.addEventListener("blkspace:identity", onIdentity);
    const interval = window.setInterval(tryFlush, 60_000);

    return () => {
      window.clearTimeout(startupDelay);
      window.removeEventListener("online", tryFlush);
      window.removeEventListener("blkspace:identity", onIdentity);
      window.clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}
