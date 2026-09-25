import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSessionToken } from "@/lib/auth";
import {
  isTauri,
  tauriFlushOfflineQueue,
  tauriSyncPortfolioOnce,
  tauriSyncSocialOnce,
  type TauriPortfolioSyncResult,
  type TauriSocialSyncResult,
} from "@/lib/tauri-api";

interface FlushResult {
  synced: number;
  failed: number;
  remaining: number;
  nostrSynced: number;
  nostrFailed: number;
  nostrPending: number;
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
      social: TauriSocialSyncResult | null;
    }> => {
      const token = getSessionToken();
      if (!token)
        return {
          offline: {
            synced: 0,
            failed: 0,
            remaining: 0,
            nostrSynced: 0,
            nostrFailed: 0,
            nostrPending: 0,
          },
          hosted: null,
          social: null,
        };
      const offline = await tauriFlushOfflineQueue(token);
      let hosted: TauriPortfolioSyncResult | null = null;
      try {
        hosted = await tauriSyncPortfolioOnce(token);
      } catch (error) {
        // Hosted sync is optional/best-effort; local offline actions remain safe.
        console.warn("BlkSpace hosted sync deferred", error);
      }
      let social: TauriSocialSyncResult | null = null;
      try {
        social = await tauriSyncSocialOnce(token);
      } catch (error) {
        console.warn("BlkSpace social sync deferred", error);
      }
      return { offline, hosted, social };
    },
    onSuccess: ({ offline, hosted, social }) => {
      if (offline.synced > 0) {
        qc.invalidateQueries({ queryKey: ["tauri"] });
        toast.success(
          `Replayed ${offline.synced} queued action${offline.synced === 1 ? "" : "s"}`,
        );
      }
      if (offline.failed > 0) {
        toast.error(
          `${offline.failed} offline action${offline.failed === 1 ? "" : "s"} failed to sync`,
        );
      }
      if (offline.nostrSynced > 0) {
        toast.success(
          `Published ${offline.nostrSynced} queued Nostr event${offline.nostrSynced === 1 ? "" : "s"}`,
        );
      }
      if (offline.nostrFailed > 0) {
        toast.message(
          `${offline.nostrFailed} Nostr event${offline.nostrFailed === 1 ? "" : "s"} will retry with the same event id.`,
        );
      }
      if (offline.nostrPending > 0 && offline.nostrSynced === 0) {
        toast.message(
          `${offline.nostrPending} Nostr event${offline.nostrPending === 1 ? "" : "s"} saved locally and waiting for a relay.`,
        );
      }
      if (hosted && hosted.failed > 0) {
        toast.message(
          `${hosted.failed} hosted post${hosted.failed === 1 ? "" : "s"} will retry when the service is available.`,
        );
      }
      if (social && social.failed > 0) {
        toast.message(
          `${social.failed} social action${social.failed === 1 ? "" : "s"} will retry when the service is available.`,
        );
      }
      if (
        social &&
        (social.cached > 0 ||
          social.pushed > 0 ||
          social.notifications > 0 ||
          social.replies > 0 ||
          social.following > 0)
      ) {
        qc.invalidateQueries({ queryKey: ["tauri", "posts"] });
        qc.invalidateQueries({ queryKey: ["tauri", "hosted-posts"] });
        qc.invalidateQueries({ queryKey: ["tauri", "notifications"] });
        qc.invalidateQueries({ queryKey: ["tauri", "replies"] });
        qc.invalidateQueries({ queryKey: ["tauri", "following"] });
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
