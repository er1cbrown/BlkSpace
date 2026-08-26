import { KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { privilegesForCred } from "@/lib/yard-cred-privileges";

export function SelfCustodyCard({ yardCred = 0 }: { yardCred?: number }) {
  const p = privilegesForCred(yardCred);
  return (
    <Card className="mb-6 border-primary/15">
      <CardContent className="p-4 flex gap-3">
        <KeyRound className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="text-sm font-medium text-foreground">You hold the keys</p>
          <p>
            Identity is your Nostr keys + recovery phrase. WeixBucks spend with
            those keys. BKSPC cash-out is optional and goes to{" "}
            <span className="text-foreground">your</span> wallet — the app never
            holds settlement longer than escrow.
          </p>
          <p>
            Yard Cred {p.score} · {p.tier} · tip fee{" "}
            {(p.effectiveTipFeeBps / 100).toFixed(p.effectiveTipFeeBps % 100 === 0 ? 0 : 1)}
            % · listings up to {p.listingMaxWb} WB ·{" "}
            {p.bkspcPath ? "BKSPC path open" : "BKSPC locked until Cred 15"} ·{" "}
            {p.settlement} settlement
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
