import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { TauriEarnSummary } from "@/lib/tauri-api";
import { TrendingUp } from "lucide-react";

const TIER_NEXT_XP = [100, 400, 1200, null] as const;

/**
 * Contribution XP + tier (fair-earn progression v2).
 */
export function ProgressionCard({
  summary,
}: {
  summary?: TauriEarnSummary | null;
}) {
  const xp = summary?.contributionXp ?? 0;
  const tier = summary?.tier ?? 0;
  const label = summary?.tierLabel ?? "Newcomer";
  const cap = summary?.dailyCapWb ?? 200;
  const earned = summary?.earnedTodayWb ?? 0;
  const next = TIER_NEXT_XP[Math.min(tier, 3)];
  const prev =
    tier <= 0 ? 0 : tier === 1 ? 100 : tier === 2 ? 400 : 1200;
  const span = next == null ? 1 : next - prev;
  const into = next == null ? 1 : Math.min(1, Math.max(0, (xp - prev) / span));
  const pct = Math.round(into * 100);
  const capPct = Math.min(100, Math.round((earned / Math.max(1, cap)) * 100));

  return (
    <Card id="practice" className="border-primary/15 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Fair earn progression
          <Badge variant="secondary" className="ml-auto">
            {label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-xs text-muted-foreground">
          Contribution XP rises when you create, help, join campus life, finish
          Connect work, or sell in CreatorSpace. Same action pays less the more
          you repeat it in a day (anti-farm). Not investment advice.
        </p>
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>XP {xp.toLocaleString()}</span>
            <span>
              {next == null ? "Max tier" : `Next tier at ${next} XP`}
            </span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>
              Today {earned} / {cap} WB
            </span>
            <span>Tier daily cap</span>
          </div>
          <Progress value={capPct} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
