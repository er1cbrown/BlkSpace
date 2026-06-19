import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Scale } from "lucide-react";

export function WalletDisclaimer() {
  return (
    <Alert className="mb-6 border-amber-500/30 bg-amber-500/5">
      <Scale className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-200">
        Kalshi-style settlement — not an investment
      </AlertTitle>
      <AlertDescription className="text-muted-foreground space-y-1.5">
        <p>
          WeixBucks are earn-only platform credits (like exchange collateral,
          but not purchasable with real money). Tips and marketplace trades
          include published platform fees.
        </p>
        <p>
          BlkCoin is an optional <strong>settlement receipt</strong> for earned
          value after eligibility checks — devnet simulated until counsel
          approves mainnet. No speculative token launch.
        </p>
      </AlertDescription>
    </Alert>
  );
}