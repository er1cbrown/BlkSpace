import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTauriGetTokenomicsPolicy } from "@/hooks/use-app-data";
import { formatFeePercent } from "@/lib/tokenomics";
import { Scale } from "lucide-react";
const FALLBACK_POLICY = {
  model: "kalshi-regulated-settlement",
  tipFeeBps: 200,
  marketplaceFeeBps: 500,
  withdrawSettlementFeeBps: 100,
  dailyEarnCapWb: 250,
  minWithdrawWb: 100,
  weeklyWithdrawCapWb: 1000,
  wbToBkspcRatio: 1000,
  bkspcSymbol: "BKSPC",
  bkspcName: "BlkSpace Settlement",
  purchasable: false,
  onChainReady: false,
};

export function TokenomicsKalshiPanel() {
  const { data: policy } = useTauriGetTokenomicsPolicy();
  const p = policy ?? FALLBACK_POLICY;

  return (
    <Card className="border-primary/10 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          Tokenomics (Kalshi-style settlement)
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3 text-muted-foreground">
        <p>
          Like{" "}
          <a
            href="https://kalshi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            Kalshi
          </a>
          : published fees, earn-only credits, settlement at withdrawal — not a
          speculative token launch. Yard events are community calendars, not
          tradable prediction contracts.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <span>Tip / send fee</span>
          <span className="font-medium text-foreground tabular-nums text-right">
            {formatFeePercent(p.tipFeeBps)}
          </span>
          <span>Marketplace fee</span>
          <span className="font-medium text-foreground tabular-nums text-right">
            {formatFeePercent(p.marketplaceFeeBps)}
          </span>
          <span>Withdrawal settlement fee</span>
          <span className="font-medium text-foreground tabular-nums text-right">
            {formatFeePercent(p.withdrawSettlementFeeBps)}
          </span>
          <span>Daily earn cap</span>
          <span className="font-medium text-foreground tabular-nums text-right">
            {p.dailyEarnCapWb} WB
          </span>
          <span>Weekly withdraw cap</span>
          <span className="font-medium text-foreground tabular-nums text-right">
            {p.weeklyWithdrawCapWb} WB
          </span>
          <span>Settlement ({p.bkspcSymbol})</span>
          <span className="font-medium text-foreground tabular-nums text-right">
            {p.wbToBkspcRatio.toLocaleString()} WB = 1 {p.bkspcSymbol}
          </span>
        </div>
        <p className="text-[10px]">
          WB {p.purchasable ? "purchasable" : "not purchasable"} · On-chain{" "}
          {p.onChainReady ? "live" : "devnet simulated until counsel"}
        </p>
      </CardContent>
    </Card>
  );
}