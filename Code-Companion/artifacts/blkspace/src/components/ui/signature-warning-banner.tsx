import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { isTauri, tauriVerifyNostrEventById } from "@/lib/tauri-api";

interface SignatureWarningBannerProps {
  eventId?: string | null;
}

/** Prominent warning when a cached Nostr event fails Schnorr verification. */
export function SignatureWarningBanner({ eventId }: SignatureWarningBannerProps) {
  const id = eventId?.trim();

  const { data, isLoading } = useQuery({
    queryKey: ["tauri", "sigVerify", "banner", id],
    queryFn: () => tauriVerifyNostrEventById(id!),
    enabled: isTauri() && !!id,
    staleTime: 60_000,
  });

  if (!isTauri() || !id || isLoading || data?.valid || data?.status === "unknown") {
    return null;
  }

  return (
    <div
      className="flex gap-2 items-start text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 mb-4"
      role="alert"
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">Unverified Nostr signature</p>
        <p className="text-xs text-muted-foreground mt-1">
          {data?.message ??
            "This post's signature could not be verified. Treat content as untrusted."}
        </p>
      </div>
    </div>
  );
}