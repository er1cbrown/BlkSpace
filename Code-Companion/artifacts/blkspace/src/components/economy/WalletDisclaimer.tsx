import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Store } from "lucide-react";
import { CREATOR_ECONOMY_SUMMARY, SOFT_CURRENCY, SETTLEMENT_TOKEN } from "@/lib/tokenomics";

export function WalletDisclaimer() {
  return (
    <Alert className="mb-6 border-primary/20 bg-muted/30">
      <Store className="h-4 w-4 text-primary" />
      <AlertTitle className="text-foreground">Creator marketplace economy</AlertTitle>
      <AlertDescription className="text-muted-foreground space-y-1.5">
        <p>{CREATOR_ECONOMY_SUMMARY}</p>
        <p>
          <strong>{SOFT_CURRENCY.name}</strong> — earn from activity, spend on tips and
          the creator shop. Not sold for cash.{" "}
          <strong>{SETTLEMENT_TOKEN.symbol}</strong> — optional Solana settlement when
          you withdraw earned WB (eligibility applies; devnet until legal review).
        </p>
      </AlertDescription>
    </Alert>
  );
}