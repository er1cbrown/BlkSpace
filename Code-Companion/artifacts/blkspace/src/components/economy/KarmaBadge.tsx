import { Badge } from "@/components/ui/badge";
import { ArrowBigUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface KarmaBadgeProps {
  postKarma?: number;
  commentKarma?: number;
  compact?: boolean;
  className?: string;
}

export function KarmaBadge({
  postKarma = 0,
  commentKarma = 0,
  compact = false,
  className,
}: KarmaBadgeProps) {
  const total = postKarma + commentKarma;
  if (total <= 0 && compact) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-orange-600 border-orange-500/30 bg-orange-500/5",
        className,
      )}
      title={`Post karma: ${postKarma} · Comment karma: ${commentKarma}`}
    >
      <ArrowBigUp className="h-3 w-3" />
      {compact ? total : `${total} karma`}
    </Badge>
  );
}