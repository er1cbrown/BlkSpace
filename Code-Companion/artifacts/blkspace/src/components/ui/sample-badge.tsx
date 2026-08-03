import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Honest label for demo / seed / web-preview content. */
export function SampleBadge({
  className,
  children = "Sample",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-normal text-muted-foreground border-dashed",
        className,
      )}
    >
      {children}
    </Badge>
  );
}
