import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendmeLaneCard } from "@/components/weixnet/SendmeLaneCard";

type LaneStatus = {
  chainSocket: string;
  nostr?: { reachable?: boolean; relays?: { url: string; ok: boolean }[] };
  bi9?: { reachable?: boolean; chainId?: number | null; contract?: string };
  bkspc?: {
    reachable?: boolean;
    health?: string;
    cluster?: string;
    mint?: string;
  };
  iroh?: { relayHttp?: boolean; localNode?: boolean; detail?: string };
  sendme?: { installed?: boolean; detail?: string };
  rns?: {
    installed?: boolean;
    localTcp?: boolean;
    listen?: string;
    detail?: string;
  };
  lane?: { social?: string; file?: string; detail?: string };
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
            error instanceof Error
              ? error.message
              : "Status route did not answer.",
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
            <p>
              Joining a yard grants 50 WB once, in that yard only. After Yard
              Cred 15 there, the yard grants that university's mark and does not
              mint more WeixBucks. A tip still pays the published fee into the
              yard pool. An empty pool pays 0.
            </p>
            <p>
              Yard Cred is reputation. It is not spendable and it does not
              convert into WeixBucks.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Two coins, still closed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              WeixBucks are practice points inside the yard. They are not cash,
              and you cannot buy them.
            </p>
            <p>
              BKSPC is the settlement coin on Solana. When a funded mint exists,
              1,000 earned WeixBucks can settle as 1 BKSPC. Cash-out is closed
              while the mint address is empty. BKSPC does not turn back into
              WeixBucks.
            </p>
            <p>
              BI9 is a separate coin on HyperEVM. WeixBucks do not convert into
              BI9. The contract address is empty on this build, and the mint cap
              stays 0. An empty address is not something you can buy.
            </p>
            <p>
              BlkSpace will not ask you to send SOL, HYPE, or dollars to a
              personal wallet to “finish the coin.” A stranger who says the
              chart is about to explode, and who cannot show who is allowed to
              mint more, is how a rug pull takes the money you sent.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Learn the real markets</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Stocks, bonds, futures, and options are contracts. You can lose
              the money you put in. This yard does not place those trades and it
              does not promise a profit.
            </p>
            <p>
              Read the basics at{" "}
              <a
                className="underline"
                href="https://www.investor.gov/introduction-investing/investing-basics"
                target="_blank"
                rel="noreferrer"
              >
                Investor.gov
              </a>{" "}
              and{" "}
              <a
                className="underline"
                href="https://www.cftc.gov/LearnAndProtect"
                target="_blank"
                rel="noreferrer"
              >
                the CFTC Learn and Protect page
              </a>
              . Coinbase Learn is a reading room for the assets a brokerage
              lists. It is not a buy button inside BKSPC.
            </p>
            <p>
              <a
                className="underline"
                href="https://www.coinbase.com/learn"
                target="_blank"
                rel="noreferrer"
              >
                Coinbase Learn
              </a>
            </p>
            <p>
              Grants, scholarships, internships, and sponsorships pay for work
              and study. They do not depend on a coin price. Those leads live on
              Connect.
            </p>
            <Button variant="outline" asChild>
              <Link href="/connect">Open Connect</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chain socket</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              Orders, leverage, and cash-out stay closed. A reachable read
              socket is not a funded mint.
            </p>
            {statusError ? <p>{statusError}</p> : null}
            {status ? (
              <ul className="space-y-1">
                <li>
                  WeixNet relays: {relayUp} of {relayTotal} answered. Text lane:{" "}
                  {status.lane?.social || "unknown"}. File lane:{" "}
                  {status.lane?.file || "unknown"}.
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
                  {status.bkspc?.reachable
                    ? status.bkspc.health || "ok"
                    : "down"}
                  . Mint address is empty, so cash-out stays closed.
                </li>
                <li>
                  Iroh: relay HTTPS{" "}
                  {status.iroh?.relayHttp ? "answered" : "silent"}.{" "}
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
        <SendmeLaneCard fileLane={status?.lane?.file} />
      </div>
    </AppShell>
  );
}
