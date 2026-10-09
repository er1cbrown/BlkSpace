import { Coins } from "lucide-react";
import { Link } from "wouter";

/**
 * Four-pillar framing: practice credits → reliability → literacy → settlement.
 * See docs/features/four-pillar-economy.md
 */
export function WalletDisclaimer() {
  return (
    <div className="text-sm text-muted-foreground mb-6 space-y-2">
      <p className="flex items-start gap-2">
        <Coins className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>
          <strong className="text-foreground">
            Practice credits (WeixBucks)
          </strong>{" "}
          move only from a balance someone already holds. Posting does not mint
          them, and they are not purchasable with cash.{" "}
          <strong className="text-foreground">Yard Cred</strong> is reliability
          (ProjectConnect), not spendable credit.{" "}
          <strong className="text-foreground">Cash-out</strong> is not offered.
          The chain socket is not connected.{" "}
          <strong className="text-foreground">BI9</strong> is a separate asset —
          holding WeixBucks does not mint or convert into it. You hold identity
          keys; the app never holds settlement longer than escrow. Save your
          recovery phrase in Settings before you care about balances.
        </span>
      </p>
      <p className="text-xs pl-6">
        Learn how brokerages and markets work under{" "}
        <Link
          href="/wallet"
          className="text-primary underline-offset-2 hover:underline"
        >
          Learn markets
        </Link>{" "}
        — BKSPC is not a brokerage.
      </p>
    </div>
  );
}
