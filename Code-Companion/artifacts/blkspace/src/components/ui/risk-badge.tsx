import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShieldAlert, ShieldCheck, Shield } from "lucide-react";

export type RiskLevel = "low" | "medium" | "high" | "unknown";

interface RiskBadgeProps {
  riskLevel?: RiskLevel | string | null;
  maliciousScore?: number | null;
  className?: string;
}

export function RiskBadge({
  riskLevel,
  maliciousScore,
  className = "",
}: RiskBadgeProps) {
  const level = (riskLevel?.toLowerCase() ?? "low") as RiskLevel;
  const score = maliciousScore ?? 0;

  if (level === "low" && score <= 0.4) return null;

  const icon =
    level === "high" ? (
      <ShieldAlert className="w-3 h-3" />
    ) : level === "medium" ? (
      <Shield className="w-3 h-3" />
    ) : (
      <ShieldCheck className="w-3 h-3" />
    );

  const label =
    level === "high"
      ? "High risk"
      : level === "medium"
        ? "Medium risk"
        : level === "unknown"
          ? "Risk unknown"
          : "Low risk";

  const variant =
    level === "high"
      ? "destructive"
      : level === "medium"
        ? "outline"
        : "secondary";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant} className={`text-xs gap-1 ${className}`}>
          {icon}
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          MIDF score: {(score * 100).toFixed(0)}% — used to rank and filter feed
          content.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}