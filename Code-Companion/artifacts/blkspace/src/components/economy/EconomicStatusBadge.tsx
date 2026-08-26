import { Badge } from "@/components/ui/badge";
import {
  ESCROW_STATUS_LABEL,
  TIP_STATUS_LABEL,
  type EconomicBadgeStatus,
} from "@/lib/economic-types";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  idle: "bg-muted text-muted-foreground",
  submitting: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  optimistic: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  confirmed: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  settling: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  settled: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  failed: "bg-destructive/15 text-destructive",
  listed: "bg-muted text-muted-foreground",
  matched: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  funds_locked: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  delivered: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  released: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  dispute: "bg-destructive/15 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

function labelFor(status: EconomicBadgeStatus): string {
  if (status in TIP_STATUS_LABEL) {
    return TIP_STATUS_LABEL[status as keyof typeof TIP_STATUS_LABEL];
  }
  if (status in ESCROW_STATUS_LABEL) {
    return ESCROW_STATUS_LABEL[status as keyof typeof ESCROW_STATUS_LABEL];
  }
  if (status === "optimistic") return "Sent";
  if (status === "settling") return "Settling…";
  if (status === "submitting") return "Sending…";
  return status;
}

export function EconomicStatusBadge({
  status,
  className,
}: {
  status: EconomicBadgeStatus | string;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[10px] border-0",
        TONE[status] || "bg-muted text-muted-foreground",
        className,
      )}
    >
      {labelFor(status as EconomicBadgeStatus)}
    </Badge>
  );
}
