import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Scale } from "lucide-react";

export function WalletDisclaimer() {
  return (
    <Alert className="mb-6 border-amber-500/30 bg-amber-500/5">
      <Scale className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-200">
        Utility credits — not an investment
      </AlertTitle>
      <AlertDescription className="text-muted-foreground space-y-1.5">
        <p>
          WeixBucks are in-app utility credits for participating on the yard.
          They have no promised cash value and cannot be purchased.
        </p>
        <p>
          BlkCoin withdrawal is a <strong>draft</strong> devnet bridge only —
          settlement is simulated until legal counsel approves mainnet. No
          mainnet tokens are minted today.
        </p>
      </AlertDescription>
    </Alert>
  );
}