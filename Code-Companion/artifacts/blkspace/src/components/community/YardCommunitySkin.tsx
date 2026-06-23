import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Store, Sparkles, Lock } from "lucide-react";
import type { ResolvedCommunityYardTheme } from "@/lib/yard-themes";
import { cn } from "@/lib/utils";

interface YardCommunitySkinProps {
  theme: ResolvedCommunityYardTheme;
  communityName: string;
  className?: string;
}

/** Header strip + status for community yard skin (preview vs live). */
export function YardCommunitySkin({
  theme,
  communityName,
  className,
}: YardCommunitySkinProps) {
  const isLive = theme.skinTier === "live";

  return (
    <div className={cn("rounded-xl overflow-hidden border mb-4", theme.cardBorderClass, className)}>
      <div
        className={cn(
          "h-2 bg-gradient-to-r",
          theme.gradient,
          !isLive && "opacity-60",
        )}
      />
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-muted/20">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {isLive ? (
            <Badge className="gap-1 bg-primary/90">
              <Sparkles className="w-3 h-3" />
              Community skin live
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Lock className="w-3 h-3" />
              Preview skin
            </Badge>
          )}
          <span className="text-muted-foreground text-xs">
            {isLive
              ? `${theme.purchaseCount} campus pack${theme.purchaseCount === 1 ? "" : "s"} sold · full mesh branding`
              : `Buy a ${communityName} pack on Yard Sale to unlock colors, mascot & norms for everyone`}
          </span>
        </div>
        {!isLive && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/wallet">
              <Store className="w-3.5 h-3.5 mr-1" />
              Yard Sale
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}