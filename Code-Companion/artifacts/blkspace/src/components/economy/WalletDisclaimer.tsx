import { Coins } from "lucide-react";

export function WalletDisclaimer() {
  return (
    <p className="text-sm text-muted-foreground mb-6 flex items-start gap-2">
      <Coins className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <span>
        Earn WeixBucks by posting and contributing. Spend in the shop or tip
        creators. Cash out when you&apos;re ready — save your backup code in
        Settings first.
      </span>
    </p>
  );
}