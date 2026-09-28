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
          are earn-only soft currency for the yard and creator shop — not
          investment advice and not purchasable with cash.{" "}
          <strong className="text-foreground">Yard Cred</strong> is reliability
          (ProjectConnect).{" "}
          <strong className="text-foreground">BKSPC</strong> is the only
          creator cash-out of earned WeixBucks, at the published ratio, on
          Solana devnet until a funded mint exists.{" "}
          <strong className="text-foreground">BI9</strong> is a separate
          HyperEVM asset — earning WeixBucks does not mint or convert into it.
          You hold identity keys; the app never holds settlement longer than
          escrow. Save your recovery phrase in Settings before you care about
          balances.
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
