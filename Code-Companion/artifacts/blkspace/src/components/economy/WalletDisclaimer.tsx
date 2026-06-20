import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookOpen } from "lucide-react";

export function WalletDisclaimer() {
  return (
    <Alert className="mb-6 border-primary/20 bg-muted/30">
      <BookOpen className="h-4 w-4 text-primary" />
      <AlertTitle className="text-foreground">
        Published yard economy
      </AlertTitle>
      <AlertDescription className="text-muted-foreground space-y-1.5">
        <p>
          <strong>WeixBucks</strong> are earn-only platform credits — not sold
          for cash, not investment advice. Fees and caps are listed below.
        </p>
        <p>
          <strong>BKSPC</strong> settles earned WB on Solana after eligibility
          (devnet until counsel). Future trading (DEX, perps) is a{" "}
          <strong>separate legal gate</strong> — we do not promise listings or
          profit.
        </p>
      </AlertDescription>
    </Alert>
  );
}