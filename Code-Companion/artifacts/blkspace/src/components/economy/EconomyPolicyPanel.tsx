import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTauriGetTokenomicsPolicy } from "@/hooks/use-app-data";
import { formatFeePercent } from "@/lib/tokenomics";
import { BookOpen } from "lucide-react";

const FALLBACK_POLICY = {
  model: "blkspace-published",
  uniformModel: "creator-marketplace",
  softCurrencySymbol: "WB",
  softCurrencyName: "WeixBucks",
  marketplaceEnabled: true,
  tipFeeBps: 200,
  marketplaceFeeBps: 500,
  withdrawSettlementFeeBps: 100,
  dailyEarnCapWb: 250,
  minWithdrawWb: 100,
  weeklyWithdrawCapWb: 1000,
  wbToBkspcRatio: 1000,
  bkspcSymbol: "BKSPC",
  bkspcName: "BKSPC",
  midfThrottleThreshold: 0.7,
  wbPurchasable: false,
  bkspcTradableAfterCounsel: true,
  treasuryMintOnly: true,
  onChainReady: false,
  neverRules: [] as string[],
};

export function EconomyPolicyPanel() {
  const { data: policy } = useTauriGetTokenomicsPolicy();
  const p = policy ?? FALLBACK_POLICY;

  return (
    <Card className="border-primary/10 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Published economy policy
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3 text-muted-foreground">
        <p>
          <strong className="text-foreground">Creator marketplace</strong> model — earn{" "}
          {p.softCurrencySymbol}, spend in the shop, optional {p.bkspcSymbol} settlement
          after eligibility. Same class of economy as Roblox or Fortnite; fees and caps
          are published below.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <span>Model</span>
          <span className="font-medium text-foreground text-right">
            {p.uniformModel}
          </span>
          <span>Creator shop</span>
          <span className="font-medium text-foreground text-right">
            {p.marketplaceEnabled ? "Enabled" : "Off"}
          </span>
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
            {p.dailyEarnCapWb} {p.softCurrencySymbol}
          </span>
          <span>MIDF earn pause</span>
          <span className="font-medium text-foreground tabular-nums text-right">
            score &gt; {p.midfThrottleThreshold}
          </span>
          <span>Settlement ({p.bkspcSymbol})</span>
          <span className="font-medium text-foreground tabular-nums text-right">
            {p.wbToBkspcRatio.toLocaleString()} {p.softCurrencySymbol} = 1 {p.bkspcSymbol}
          </span>
          <span>Treasury mint</span>
          <span className="font-medium text-foreground text-right">
            {p.treasuryMintOnly ? "Only after WB debit" : "—"}
          </span>
        </div>
        {p.neverRules && p.neverRules.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-foreground mb-1">Platform rules</p>
            <ul className="text-[10px] space-y-0.5 list-disc pl-4">
              {p.neverRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[10px]">
          {p.softCurrencyName} {p.wbPurchasable ? "purchasable" : "earn-only"} · On-chain{" "}
          {p.onChainReady ? "live" : "devnet until legal review"}
        </p>
      </CardContent>
    </Card>
  );
}