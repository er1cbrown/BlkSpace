import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hostedPost } from "@/lib/hosted-api";
import { markWalletEnabled } from "@/lib/lab-gate";
import { formatFeePercent } from "@/lib/tokenomics";
import { toast } from "sonner";

type TermsDoc = {
  version: string;
  tipFeeBps: number;
  marketplaceFeeBps: number;
  dailyCapWb: number;
  genesisWb: number;
  joinGrantWb: number;
  yardCredGate: number;
  emptyPoolPays: number;
  chainSocket: string;
  cashOut: boolean;
  blkshiTrades: boolean;
  rules: string[];
};

export default function TermsPage() {
  const [doc, setDoc] = useState<TermsDoc | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let stop = false;
    fetch("/api/terms")
      .then((res) => res.json())
      .then((body) => {
        if (!stop) setDoc(body);
      })
      .catch(() => {
        if (!stop) toast.error("Terms could not be loaded.");
      });
    return () => {
      stop = true;
    };
  }, []);

  const accept = async () => {
    if (!doc) return;
    const res = await hostedPost("/api/portfolio/terms", {
      version: doc.version,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(
        body.error || "Sign in and register a handle before accepting.",
      );
      return;
    }
    markWalletEnabled();
    setAccepted(true);
    toast.success("Terms accepted. The practice wallet is on.");
  };

  return (
    <AppShell>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Terms of service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Version {doc?.version || "…"}. This page is the record of the sums
            in force.
          </p>
          {doc && (
            <ul className="space-y-1 text-muted-foreground">
              <li>
                Tip fee {formatFeePercent(doc.tipFeeBps)}. Marketplace fee{" "}
                {formatFeePercent(doc.marketplaceFeeBps)}.
              </li>
              <li>
                Joining a yard grants {doc.joinGrantWb} WB once in that yard.
                Genesis {doc.genesisWb} WB. An empty pool pays{" "}
                {doc.emptyPoolPays}.
              </li>
              <li>
                Yard Cred is counted inside that yard. At {doc.yardCredGate},
                that university's mark is granted and the balance does not
                increase.
              </li>
              <li>
                WeixBucks are not cash. They do not convert to SOL, HYPE, BI9,
                or dollars.
              </li>
              <li>
                Chain socket: {doc.chainSocket}. Cash-out offered:{" "}
                {doc.cashOut ? "yes" : "no"}.
              </li>
              <li>BLKSHI takes trades: {doc.blkshiTrades ? "yes" : "no"}.</li>
              {doc.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={accept} disabled={!doc || accepted}>
              {accepted ? "Accepted" : "Accept and enable the practice wallet"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/blkshi">Open BLKSHI</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
