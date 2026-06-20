import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTauriGetTokenomicsPolicy } from "@/hooks/use-app-data";
import { formatFeePercent } from "@/lib/tokenomics";
import { BookOpen } from "lucide-react";

const FALLBACK_POLICY = {
  model: "blkspace-published",
  tipFeeBps: 200,
  marketplaceFeeBps: 500,
  withdrawSettlementFeeBps: 100,
  dailyEarnCapWb: 250,
  minWithdrawWb: 100,
  weeklyWithdrawCapWb: 1000,
  wbToBkspcRatio: 1000,
  bkspcSymbol: "BKSPC",
  bkspcName: "BlkSpace Settlement",
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
          BlkSpace runs a <strong className="text-foreground">published</strong>{" "}
          earn-and-spend economy on the yard. WB is not sold for cash. BKSPC is
          minted only from earned WB after eligibility — tradable on Solana only
          if counsel approves (DEX / perps are a separate gate, not promised
          today).
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
          <span>MIDF earn pause</span>
          <span className="font-medium text-foreground tabular-nums text-right">
            score &gt; {p.midfThrottleThreshold}
          </span>
          <span>Settlement ({p.bkspcSymbol})</span>
          <span className="font-medium text-foreground tabular-nums text-right">
            {p.wbToBkspcRatio.toLocaleString()} WB = 1 {p.bkspcSymbol}
          </span>
          <span>Treasury mint</span>
          <span className="font-medium text-foreground text-right">
            {p.treasuryMintOnly ? "Only after WB debit" : "—"}
          </span>
        </div>
        {p.neverRules && p.neverRules.length > 0 && (
          <ul className="text-[10px] space-y-0.5 list-disc pl-4">
            {p.neverRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        )}
        <p className="text-[10px]">
          WB {p.wbPurchasable ? "purchasable" : "not purchasable"} · On-chain{" "}
          {p.onChainReady ? "live" : "devnet simulated until counsel"}
        </p>
      </CardContent>
    </Card>
  );
}