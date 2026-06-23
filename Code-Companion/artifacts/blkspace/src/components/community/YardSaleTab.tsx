import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { YardSaleListings } from "@/components/economy/YardSaleListings";
import { getYardTheme } from "@/lib/yard-themes";
import { isTauri, tauriGetBkspcSettlementStatus } from "@/lib/tauri-api";
import { useTauriMarketplace } from "@/hooks/use-app-data";

interface YardSaleTabProps {
  yardId: string;
  communityName: string;
}

export function YardSaleTab({ yardId, communityName }: YardSaleTabProps) {
  const yard = getYardTheme(yardId);
  const { data: listings = [] } = useTauriMarketplace();

  const { data: settlementStatus } = useQuery({
    queryKey: ["tauri", "bkspc-settlement-status"],
    queryFn: tauriGetBkspcSettlementStatus,
    enabled: isTauri(),
  });

  return (
    <Card className={yard?.cardBorderClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Store className="w-5 h-5" />
          {communityName} Yard Sale
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Creators selling from their MyYard — mixes, themes, merch, and Logos
          Deck sets tagged to this campus.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {yard && (
          <div className="flex flex-wrap gap-2 text-xs">
            {yard.norms.map((norm) => (
              <span
                key={norm}
                className="px-2 py-1 rounded-full bg-muted/60 text-muted-foreground"
              >
                {norm}
              </span>
            ))}
          </div>
        )}

        <YardSaleListings
          listings={listings}
          yardIdFilter={yardId}
          bkspcWired={settlementStatus?.wired === true}
          emptyMessage={`No ${communityName} listings yet. List from your MyYard in Wallet → Yard Sale.`}
        />

        <Button variant="outline" size="sm" asChild>
          <Link href="/wallet">
            <Store className="w-4 h-4 mr-1" />
            List on Yard Sale
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}