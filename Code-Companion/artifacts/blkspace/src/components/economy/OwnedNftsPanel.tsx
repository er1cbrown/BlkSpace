import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTauriListOwnedNfts } from "@/hooks/use-app-data";
import { isTauri } from "@/lib/tauri-api";

export function OwnedNftsPanel() {
  const { data: nfts = [], isLoading } = useTauriListOwnedNfts();

  if (!isTauri()) return null;

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your NFTs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading inventory…</p>
        ) : nfts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No NFTs yet. Buy a Yard Sale listing or mint a mix to add one.
          </p>
        ) : (
          nfts.map((nft) => (
            <div
              key={nft.mintAddress}
              className="flex items-start justify-between gap-2 rounded-md border p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{nft.title}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {nft.mintAddress}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                {nft.itemType}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}