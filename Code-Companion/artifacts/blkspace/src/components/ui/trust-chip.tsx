import { useState } from "react";
import { BadgeCheck, ChevronDown } from "lucide-react";
import { RiskBadge } from "@/components/ui/risk-badge";
import { SignatureBadge } from "@/components/ui/signature-badge";
import { ConsensusBadge } from "@/components/ui/consensus-badge";
import { cn } from "@/lib/utils";

/**
 * Collapsed security signal — one quiet chip; expand for risk/sig/consensus.
 * Keeps feed cards content-first.
 */
export function TrustChip({
  riskLevel,
  maliciousScore,
  nostrEventId,
  consensusValid,
  consensusAgreement,
  className,
}: {
  riskLevel?: string | null;
  maliciousScore?: number | null;
  nostrEventId?: string | null;
  consensusValid?: boolean;
  consensusAgreement?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasAnything =
    riskLevel ||
    nostrEventId ||
    consensusValid !== undefined ||
    (maliciousScore != null && maliciousScore > 0);

  if (!hasAnything) return null;

  const quiet =
    (!riskLevel || riskLevel === "low") &&
    (maliciousScore == null || maliciousScore < 0.3);

  return (
    <div className={cn("inline-flex flex-col items-end gap-1", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] transition-colors",
          "text-muted-foreground hover:text-primary hover:bg-primary/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-expanded={open}
        aria-label="Trust details"
      >
        <BadgeCheck
          className={cn(
            "h-3.5 w-3.5",
            quiet ? "text-primary/80" : "text-amber-500",
          )}
        />
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="flex flex-wrap items-center gap-1 justify-end max-w-[220px]">
          {(riskLevel || maliciousScore != null) && (
            <RiskBadge riskLevel={riskLevel} maliciousScore={maliciousScore} />
          )}
          {consensusValid !== undefined && (
            <ConsensusBadge
              consensusValid={!!consensusValid}
              consensusAgreement={consensusAgreement ?? 0}
            />
          )}
          {nostrEventId && <SignatureBadge eventId={nostrEventId} />}
        </div>
      )}
    </div>
  );
}
