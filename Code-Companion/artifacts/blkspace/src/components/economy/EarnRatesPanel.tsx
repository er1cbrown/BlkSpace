import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EARN_PATHS } from "@/lib/earn-sources";
import { Coins } from "lucide-react";

export function EarnRatesPanel() {
  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" />
          Earn rates (nominal)
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <p className="text-muted-foreground mb-3">
          Aligned with <code className="text-[10px]">db.rs</code> +{" "}
          <code className="text-[10px]">reward-formulas.md</code>. Actual earn
          may be throttled (MIDF) or capped at 250 WB/day.
        </p>
        <div className="divide-y divide-border/60">
          {EARN_PATHS.map((row) => (
            <div
              key={row.action}
              className="flex justify-between gap-2 py-1.5 first:pt-0"
            >
              <span className="text-muted-foreground">{row.action}</span>
              <span className="font-medium tabular-nums shrink-0">
                +{row.wb} WB
                {row.karma > 0 ? ` · +${row.karma} karma` : ""}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}