import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EconomicStatusBadge } from "@/components/economy/EconomicStatusBadge";
import { useEconomicLedger } from "@/hooks/use-economic-ledger";
import type { HistoryItem, HistoryKind } from "@/lib/economic-types";

export interface LegacyTxRow {
  id: string | number;
  user: string;
  amount: number;
  description: string;
  time: string;
  balance?: number;
}

function fromLegacy(tx: LegacyTxRow): HistoryItem {
  return {
    id: `legacy_${tx.id}`,
    kind: "tip",
    title: tx.user,
    description: `${tx.description} • ${tx.time}`,
    amount: tx.amount,
    status: "settled",
    createdAt: 0,
  };
}

type Filter = "all" | HistoryKind | "open" | "failed";

export function TransactionHistory({
  fallback = [],
}: {
  fallback?: LegacyTxRow[];
}) {
  const ledger = useEconomicLedger();
  const [filter, setFilter] = useState<Filter>("all");
  const items =
    ledger.history.length > 0
      ? ledger.history
      : fallback.map(fromLegacy);

  const visible = useMemo(() => {
    return items.filter((tx) => {
      if (filter === "all") return true;
      if (filter === "tip" || filter === "escrow") return tx.kind === filter;
      if (filter === "failed") return tx.status === "failed" || tx.status === "dispute";
      if (filter === "open") {
        return (
          tx.status === "pending" ||
          tx.status === "confirmed" ||
          tx.status === "funds_locked" ||
          tx.status === "delivered" ||
          tx.status === "matched"
        );
      }
      return true;
    });
  }, [items, filter]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "tip", label: "Tips" },
    { id: "escrow", label: "Escrow" },
    { id: "open", label: "Open" },
    { id: "failed", label: "Failed" },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2 px-2">
        {filters.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "ghost"}
            className="h-7 text-[11px]"
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 px-2">
          No matching activity. Tips and escrow both land here.
        </p>
      ) : (
        <div className="space-y-1">
          {visible.map((tx) => (
            <Card
              key={tx.id}
              className="border-0 shadow-none rounded-none border-b border-border/30 last:border-0"
            >
              <CardContent className="flex items-center justify-between py-4 px-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-full ${tx.amount > 0 ? "bg-green-500/10" : "bg-destructive/10"}`}
                  >
                    {tx.amount > 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tx.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.description}
                      {tx.kind === "escrow" ? " · Escrow" : ""}
                    </p>
                    {typeof tx.fee === "number" && tx.fee > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {tx.fee} WB fee removed from circulation
                      </p>
                    )}
                    {tx.nostrEventId && (
                      <p className="text-[10px] font-mono truncate text-muted-foreground">
                        Nostr {tx.nostrEventId}
                      </p>
                    )}
                    {tx.solanaSignature && (
                      <p className="text-[10px] font-mono truncate text-muted-foreground">
                        Solana {tx.solanaSignature}
                      </p>
                    )}
                    {typeof tx.yardCredDelta === "number" &&
                      tx.yardCredDelta !== 0 && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          Yard Cred {tx.yardCredDelta > 0 ? "+" : ""}
                          {tx.yardCredDelta}
                        </p>
                      )}
                  </div>
                </div>
                <div className="text-right space-y-1 shrink-0">
                  <p
                    className={`text-sm font-bold ${tx.amount > 0 ? "text-green-500" : "text-destructive"}`}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount} WB
                  </p>
                  <EconomicStatusBadge status={tx.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
