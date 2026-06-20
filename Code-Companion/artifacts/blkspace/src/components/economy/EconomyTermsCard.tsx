import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "lucide-react";
import { formatFeePercent, FEE_BPS, SOFT_CURRENCY, SETTLEMENT_TOKEN } from "@/lib/tokenomics";

export function EconomyTermsCard() {
  return (
    <Card className="border-primary/10 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Economy terms (read once)
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-2">
        <p>
          <strong className="text-foreground">{SOFT_CURRENCY.name} ({SOFT_CURRENCY.symbol})</strong>{" "}
          — soft currency. Earn from creating and participating. Spend on tips and the
          creator marketplace. Not sold for cash. Daily cap 250 WB.
        </p>
        <p>
          <strong className="text-foreground">Creator marketplace</strong> — list and sell
          your work for WB. Platform fee {formatFeePercent(FEE_BPS.marketplace)} on
          purchases. Same UGC shop loop as other creator apps.
        </p>
        <p>
          <strong className="text-foreground">Karma</strong> — reputation only. Never
          spendable or convertible to WB.
        </p>
        <p>
          <strong className="text-foreground">{SETTLEMENT_TOKEN.symbol}</strong> — optional
          Solana settlement when you withdraw earned WB (eligibility applies). Devnet
          today. On-chain trading requires future legal review — not guaranteed.
        </p>
        <p>
          Tip fee {formatFeePercent(FEE_BPS.tip)}. Dispute earn pauses or withdraw denials
          with the appeal form below.
        </p>
      </CardContent>
    </Card>
  );
}