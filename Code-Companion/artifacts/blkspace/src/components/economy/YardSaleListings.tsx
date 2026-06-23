import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  useAppGetUser,
  useAppBuyMarketplaceListing,
  useAppBuyMarketplaceListingBkspc,
} from "@/hooks/use-app-data";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import {
  isTauri,
  tauriGetBkspcPurchaseQuote,
} from "@/lib/tauri-api";
import {
  burnBkspcForPurchase,
  type BkspcPurchaseQuote,
} from "@/lib/bkspc-marketplace";
import { itemTypeLabel, themeLabelFromRef } from "@/lib/myyard-catalog";
import { getYardTheme } from "@/lib/yard-themes";

type Listing = {
  id: number;
  sellerHandle: string;
  itemType: string;
  itemRef?: string | null;
  price: number;
  title: string;
  description?: string | null;
  isNft?: boolean;
  nftMint?: string | null;
  townTag?: string | null;
};

interface YardSaleListingsProps {
  listings: Listing[];
  yardIdFilter?: string;
  emptyMessage?: string;
  bkspcWired?: boolean;
};

function appliedPurchaseMessage(applied: Record<string, unknown> | undefined): string | null {
  if (!applied || Object.keys(applied).length === 0) return null;
  const parts: string[] = [];
  if (applied.theme) parts.push(`Theme → ${applied.theme}`);
  if (applied.yardPackId) parts.push(`Campus pack → ${applied.yardPackId}`);
  if (applied.logosDeck) parts.push("Logos Deck enabled on your MyYard");
  if (applied.communitySkinLive && applied.communityYardPack) {
    parts.push(`Community skin live → ${applied.communityYardPack}`);
  }
  const nft = applied.nftTransferred as
    | { mintAddress?: string; onChain?: boolean }
    | undefined;
  if (nft?.mintAddress) {
    parts.push(
      nft.onChain
        ? `NFT transferred on-chain → ${nft.mintAddress.slice(0, 8)}…`
        : `NFT ownership → ${nft.mintAddress.slice(0, 8)}…`,
    );
  }
  return parts.length ? parts.join(" · ") : null;
}

export function YardSaleListings({
  listings,
  yardIdFilter,
  emptyMessage = "No listings yet.",
  bkspcWired = false,
}: YardSaleListingsProps) {
  const handle = getCurrentHandle();
  const { data: user } = useAppGetUser(handle);
  const qc = useQueryClient();
  const buyListing = useAppBuyMarketplaceListing();
  const buyListingBkspc = useAppBuyMarketplaceListingBkspc();
  const { publicKey, signTransaction, connected } = useWallet();

  const afterPurchase = (result: {
    applied?: Record<string, unknown>;
    nftTransferred?: Record<string, unknown>;
  }) => {
    qc.invalidateQueries({ queryKey: ["tauri", "user"] });
    qc.invalidateQueries({ queryKey: ["tauri", "marketplace"] });
    qc.invalidateQueries({ queryKey: ["tauri", "communities"] });
    qc.invalidateQueries({ queryKey: ["tauri", "ownedNfts"] });
    const msg = appliedPurchaseMessage(result.applied);
    if (msg) toast.success(`Applied to your MyYard: ${msg}`);
  };

  const filtered = yardIdFilter
    ? listings.filter(
        (item) =>
          (item.townTag || "tsu") === yardIdFilter ||
          item.itemRef?.includes(`yard:${yardIdFilter}`),
      )
    : listings;

  const handleBuyWithBkspc = async (item: Listing) => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Connect Phantom to pay with BKSPC");
      return;
    }
    const token = getSessionToken();
    if (!token) return;

    try {
      const quote = (await tauriGetBkspcPurchaseQuote(
        token,
        item.id,
      )) as BkspcPurchaseQuote;

      if (!quote.burnRawAmount || !quote.mint) {
        toast.error(quote.reason ?? "BKSPC settlement not wired on this build");
        return;
      }

      toast.message(`Burning ${quote.burnBkspcDisplay} BKSPC on devnet…`);
      const burnSig = await burnBkspcForPurchase(
        quote,
        publicKey,
        signTransaction,
      );

      const result = await buyListingBkspc.mutateAsync({
        listingId: item.id,
        buyerSolanaAddress: publicKey.toBase58(),
        burnTxSignature: burnSig,
      });

      afterPurchase(result as { applied?: Record<string, unknown> });
      toast.success(`Purchased with BKSPC! Tx: ${burnSig.slice(0, 16)}…`);
    } catch (e) {
      toast.error(String(e));
    }
  };

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((item) => {
        const themeName = themeLabelFromRef(item.itemRef);
        const yard = item.townTag ? getYardTheme(item.townTag) : null;

        return (
          <div
            key={item.id}
            className="flex justify-between items-center p-3 border rounded-lg text-sm gap-2"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium flex flex-wrap items-center gap-2">
                {item.title}
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {itemTypeLabel(item.itemType)}
                  {item.isNft ? " · NFT" : ""}
                </Badge>
                {yard && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {yard.mascot.split(" ")[1] ?? yard.name}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                by @{item.sellerHandle} · {item.price} WB
                {themeName ? ` · ${themeName}` : ""}
              </div>
              {item.description && (
                <div className="text-xs mt-1 text-muted-foreground">
                  {item.description}
                </div>
              )}
              {item.itemRef && item.itemType !== "theme" && (
                <div className="text-[10px] font-mono truncate mt-1">
                  Ref: {item.itemRef.slice(0, 24)}…
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button
                size="sm"
                disabled={
                  !isTauri() ||
                  item.sellerHandle === (user as { handle?: string })?.handle
                }
                onClick={async () => {
                    try {
                      const result = await buyListing.mutateAsync(item.id);
                      afterPurchase(result as { applied?: Record<string, unknown> });
                      toast.success(`Bought for ${item.price} WB!`);
                    } catch (e) {
                    toast.error(String(e));
                  }
                }}
              >
                Buy (WB)
              </Button>
              {bkspcWired && isTauri() && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    item.sellerHandle === (user as { handle?: string })?.handle ||
                    buyListingBkspc.isPending
                  }
                  onClick={() => handleBuyWithBkspc(item)}
                >
                  Buy (BKSPC)
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}