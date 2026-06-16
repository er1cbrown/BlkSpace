import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSessionToken } from "@/lib/auth";
import { isTauri, tauriFlushOfflineQueue } from "@/lib/tauri-api";

export function OfflineSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const qc = useQueryClient();
  const flushing = useRef(false);

  const flush = useMutation({
    mutationFn: () => {
      const token = getSessionToken();
      if (!token) return Promise.resolve({ synced: 0, failed: 0, remaining: 0 });
      return tauriFlushOfflineQueue(token);
    },
    onSuccess: (result) => {
      if (result.synced > 0) {
        qc.invalidateQueries({ queryKey: ["tauri"] });
        toast.success(
          `Synced ${result.synced} offline action${result.synced === 1 ? "" : "s"}`,
        );
      }
      if (result.failed > 0) {
        toast.error(
          `${result.failed} offline action${result.failed === 1 ? "" : "s"} failed to sync`,
        );
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

    tryFlush();
    window.addEventListener("online", tryFlush);
    const interval = window.setInterval(tryFlush, 60_000);

    return () => {
      window.removeEventListener("online", tryFlush);
      window.clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}