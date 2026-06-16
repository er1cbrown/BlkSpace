import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { isTauri, tauriVerifyNostrEventById } from "@/lib/tauri-api";

interface SignatureBadgeProps {
  eventId?: string | null;
  className?: string;
}

export function SignatureBadge({ eventId, className = "" }: SignatureBadgeProps) {
  const id = eventId?.trim();

  const { data, isLoading } = useQuery({
    queryKey: ["tauri", "sigVerify", id],
    queryFn: () => tauriVerifyNostrEventById(id!),
    enabled: isTauri() && !!id,
    staleTime: 60_000,
  });

  if (!isTauri() || !id) return null;

  if (isLoading) {
    return (
      <Badge variant="outline" className={`text-xs gap-1 ${className}`}>
        <ShieldQuestion className="w-3 h-3" />
        Verifying…
      </Badge>
    );
  }

  const valid = data?.valid;
  const status = data?.status ?? "unknown";
  const message = data?.message;

  const icon = valid ? (
    <ShieldCheck className="w-3 h-3" />
  ) : status === "unknown" ? (
    <ShieldQuestion className="w-3 h-3" />
  ) : (
    <ShieldAlert className="w-3 h-3" />
  );

  const label = valid
    ? "Sig verified"
    : status === "unknown"
      ? "Sig unknown"
      : status === "expired"
        ? "Sig expired"
        : "Sig invalid";

  const variant = valid
    ? "default"
    : status === "unknown"
      ? "outline"
      : "destructive";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant} className={`text-xs gap-1 ${className}`}>
          {icon}
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs text-xs font-mono">
          {message || `Event ${id.slice(0, 8)}…`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}