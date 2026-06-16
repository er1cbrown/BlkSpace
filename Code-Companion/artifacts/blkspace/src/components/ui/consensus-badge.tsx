import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link2, Link2Off } from "lucide-react";

interface ConsensusBadgeProps {
  consensusValid?: boolean;
  consensusAgreement?: number;
  className?: string;
}

export function ConsensusBadge({
  consensusValid,
  consensusAgreement,
  className = "",
}: ConsensusBadgeProps) {
  if (consensusValid === undefined) return null;

  const pct = Math.round((consensusAgreement ?? 0) * 100);
  const icon = consensusValid ? (
    <Link2 className="w-3 h-3" />
  ) : (
    <Link2Off className="w-3 h-3" />
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={consensusValid ? "default" : "destructive"}
          className={`text-xs gap-1 ${className}`}
        >
          {icon}
          {consensusValid ? "Relay consensus" : "No consensus"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {consensusValid
            ? `≥2 relays agree on this event (${pct}% hash agreement).`
            : "Fewer than 2 relays agree — hidden from The Bridge."}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}