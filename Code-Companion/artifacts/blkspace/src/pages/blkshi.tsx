import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LaneStatus = {
  chainSocket: string;
  nostr?: { reachable?: boolean; relays?: { url: string; ok: boolean }[] };
  bi9?: { reachable?: boolean; chainId?: number | null; contract?: string };
  bkspc?: { reachable?: boolean; health?: string; cluster?: string; mint?: string };
  iroh?: { relayHttp?: boolean; localNode?: boolean; detail?: string };
  sendme?: { installed?: boolean; detail?: string };
  rns?: { installed?: boolean; detail?: string };
};

export default function BlkshiPage() {
  const [status, setStatus] = useState<LaneStatus | null>(null);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    let cancel = false;
    fetch("/api/weixnet/status")
      .then(async (res) => {
        if (!res.ok) throw new Error("Status route did not answer.");
        return (await res.json()) as LaneStatus;
      })
      .then((body) => {
        if (!cancel) setStatus(body);
      })
      .catch((error: unknown) => {
        if (!cancel) {
          setStatusError(
            error instanceof Error ? error.message : "Status route did not answer.",
          );
        }
      });
    return () => {
      cancel = true;
    };
  }, []);

  const relayUp = status?.nostr?.relays?.filter((row) => row.ok).length ?? 0;
  const relayTotal = status?.nostr?.relays?.length ?? 0;

  return (
    <AppShell>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">BLKSHI</h1>
        <p className="text-sm text-muted-foreground">
          The finance room on bkspc.app. It sits next to the yard. It is not a
          separate website, a prediction book, or a price chart.
        </p>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Practice ledger</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Joining a yard grants 50 WB once, in that yard only. After Yard Cred 15 there, the yard grants that university's mark and does not mint more WeixBucks. A tip still pays the published fee into the yard pool. An empty pool pays 0.</p>
            <p>Yard Cred is reputation. It is not spendable and it does not convert into WeixBucks.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chain socket</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>Orders, leverage, and cash-out stay closed. A reachable read socket is not a funded mint.</p>
            {statusError ? <p>{statusError}</p> : null}
            {status ? (
              <ul className="space-y-1">
                <li>
                  WeixNet relays: {relayUp} of {relayTotal} answered.
                </li>
                <li>
                  BI9: HyperEVM{" "}
                  {status.bi9?.reachable
                    ? `chain ${status.bi9.chainId} answered`
                    : "did not answer"}
                  . Contract address is empty on this build.
                </li>
                <li>
                  BKSPC coin: Solana {status.bkspc?.cluster} health{" "}
                  {status.bkspc?.reachable ? status.bkspc.health || "ok" : "down"}
                  . Mint address is empty, so cash-out stays closed.
                </li>
                <li>
                  Iroh: relay HTTPS {status.iroh?.relayHttp ? "answered" : "silent"}.{" "}
                  {status.iroh?.detail}
                </li>
                <li>Sendme: {status.sendme?.detail}</li>
                <li>RNS: {status.rns?.detail}</li>
              </ul>
            ) : statusError ? null : (
              <p>Checking sockets…</p>
            )}
            <Button variant="outline" asChild>
              <Link href="/terms">Read the terms</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
