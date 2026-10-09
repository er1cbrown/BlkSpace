import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { formatFeePercent, FEE_BPS, SOFT_CURRENCY } from "@/lib/tokenomics";

export function EconomyTermsCard() {
  return (
    <Card className="border-primary/10 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Economy terms
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-2">
        <p>
          <strong className="text-foreground">
            {SOFT_CURRENCY.name} ({SOFT_CURRENCY.symbol})
          </strong>{" "}
          start with one 50 WB grant for joining a yard. That grant does not
          refill, and posting does not mint more. After Yard Cred 15 inside that
          yard, the reward is that university's mark, not extra WeixBucks. Tip
          fee {formatFeePercent(FEE_BPS.tip)}. Marketplace fee{" "}
          {formatFeePercent(FEE_BPS.marketplace)}. An empty pool pays 0.
        </p>
        <p>The chain socket is not connected. No cash-out is offered.</p>
        <p>
          The sums in force are on{" "}
          <Link href="/terms" className="text-primary">
            the terms of service
          </Link>
          . BLKSHI is the finance room on this site and does not take trades.
        </p>
      </CardContent>
    </Card>
  );
}
