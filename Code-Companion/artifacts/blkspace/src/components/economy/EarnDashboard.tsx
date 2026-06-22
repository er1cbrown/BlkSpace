import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EARN_CATEGORIES, type EarnCategory } from "@/lib/earn-sources";
import { EARN_PATHS } from "@/lib/earn-sources";
import { TrendingUp, Sparkles, Users, Zap, Server } from "lucide-react";
import { isTauri, type TauriWalletTx } from "@/lib/tauri-api";

const CATEGORY_ICON: Record<EarnCategory, typeof TrendingUp> = {
  creation: Sparkles,
  community: Users,
  engagement: Zap,
  node: Server,
};

/** Map a tx description to an earn category for bucketing. */
function categorize(description: string): EarnCategory {
  const d = description.toLowerCase();
  if (d.includes("upload") || d.includes("media") || d.includes("post") || d.includes("reel")) {
    if (d.includes("yard") || d.includes("channel")) return "community";
    return "creation";
  }
  if (d.includes("rsvp") || d.includes("event")) return "community";
  if (d.includes("yard") || d.includes("channel") || d.includes("join")) return "community";
  if (d.includes("node") || d.includes("pin") || d.includes("relay") || d.includes("serve")) return "node";
  if (d.includes("like") || d.includes("reply") || d.includes("wall")) return "engagement";
  return "creation";
}

interface EarnDashboardProps {
  /** Raw wallet transactions (Tauri) — empty in web preview. */
  transactions?: TauriWalletTx[] | null;
  /** Earned-today total (already computed by caller). */
  earnedToday: number;
  /** Daily cap (default 250). */
  dailyCap?: number;
}

/**
 * Creator earn dashboard — surfaces *how* a user earned, not just a total.
 * Buckets earn transactions by category (creation / community / engagement /
 * node) and shows progress toward the daily cap.
 */
export function EarnDashboard({
  transactions,
  earnedToday,
  dailyCap = 250,
}: EarnDashboardProps) {
  const earnTx = (transactions || []).filter((tx) => tx.txType === "earn");

  const byCategory: Record<EarnCategory, { count: number; total: number }> = {
    creation: { count: 0, total: 0 },
    community: { count: 0, total: 0 },
    engagement: { count: 0, total: 0 },
    node: { count: 0, total: 0 },
  };
  for (const tx of earnTx) {
    const cat = categorize(tx.description || "");
    byCategory[cat].count += 1;
    byCategory[cat].total += tx.amount;
  }

  const capPct = Math.min(100, (earnedToday / dailyCap) * 100);
  const hasRealData = isTauri() && earnTx.length > 0;

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Earn dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Daily cap progress */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Today's earn (cap {dailyCap} WB)</span>
            <span className="font-medium tabular-nums">
              {earnedToday.toLocaleString()} / {dailyCap}
            </span>
          </div>
          <Progress value={capPct} className="h-2" />
        </div>

        {/* Category breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(EARN_CATEGORIES) as EarnCategory[]).map((cat) => {
            const Icon = CATEGORY_ICON[cat];
            const { count, total } = byCategory[cat];
            return (
              <div
                key={cat}
                className="rounded-lg border border-border/60 p-3 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="w-3.5 h-3.5" />
                  {EARN_CATEGORIES[cat].label}
                </div>
                <div className="text-lg font-bold tabular-nums">
                  +{total.toLocaleString()} WB
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {hasRealData
                    ? `${count} action${count === 1 ? "" : "s"}`
                    : "No activity yet"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Nominal rates reference */}
        <div className="pt-2 border-t border-border/60">
          <p className="text-[10px] text-muted-foreground mb-2">
            How to earn more — nominal rates (MIDF-throttled, 250 WB/day cap):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {EARN_PATHS.slice(0, 6).map((row) => (
              <span
                key={row.action}
                className="inline-flex items-center gap-1 text-[10px] rounded-full bg-muted px-2 py-0.5"
              >
                {row.action} <span className="font-semibold">+{row.wb}</span>
              </span>
            ))}
          </div>
        </div>

        {!hasRealData && (
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Start posting, uploading, and joining yards to fill your dashboard.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
