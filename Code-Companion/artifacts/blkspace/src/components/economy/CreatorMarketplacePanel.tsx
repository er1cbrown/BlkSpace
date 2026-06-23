import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import {
  useAppGetUser,
  useAppCreateMarketplaceListing,
  useAppBuyMarketplaceListing,
  useAppBuyMarketplaceListingBkspc,
  useTauriMarketplace,
  useTauriPublishMix,
  useTauriGetTokenomicsPolicy,
  useTauriMintMixNft,
} from "@/hooks/use-app-data";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import {
  isTauri,
  tauriListUserBlobs,
  tauriGetBkspcPurchaseQuote,
  tauriGetBkspcSettlementStatus,
} from "@/lib/tauri-api";
import { formatFeePercent } from "@/lib/tokenomics";
import {
  burnBkspcForPurchase,
  type BkspcPurchaseQuote,
} from "@/lib/bkspc-marketplace";

export function CreatorMarketplacePanel() {
  const handle = getCurrentHandle();
  const { data: user } = useAppGetUser(handle);
  const { data: listings = [] } = useTauriMarketplace();
  const { data: policy } = useTauriGetTokenomicsPolicy();
  const createListing = useAppCreateMarketplaceListing();
  const buyListing = useAppBuyMarketplaceListing();
  const buyListingBkspc = useAppBuyMarketplaceListingBkspc();
  const publishMix = useTauriPublishMix();
  const mintNft = useTauriMintMixNft();
  const { publicKey, signTransaction, connected } = useWallet();

  const { data: settlementStatus } = useQuery({
    queryKey: ["tauri", "bkspc-settlement-status"],
    queryFn: tauriGetBkspcSettlementStatus,
    enabled: isTauri(),
  });

  const bkspcWired = settlementStatus?.wired === true;

  const [showListForm, setShowListForm] = useState(false);
  const [mintNftOnList, setMintNftOnList] = useState(true);
  const [newItem, setNewItem] = useState({
    itemType: "media",
    itemRef: "",
    price: 10,
    title: "",
    description: "",
    bpm: undefined as number | undefined,
    key: "",
    tracklist: "",
  });
  const [userMedia, setUserMedia] = useState<any[]>([]);

  const marketplaceFeeBps = policy?.marketplaceFeeBps ?? 500;

  useEffect(() => {
    if (isTauri()) {
      const token = getSessionToken();
      if (token) {
        tauriListUserBlobs(token)
          .then(setUserMedia)
          .catch(() => {});
      }
    }
  }, []);

  const handleListItem = async () => {
    if (!newItem.title || newItem.price <= 0) {
      toast.error("Title and positive price required");
      return;
    }
    const isNft =
      (newItem.itemType === "media" || newItem.itemType === "mix") &&
      !!newItem.itemRef;

    try {
      if (newItem.itemType === "mix" && newItem.itemRef) {
        await publishMix.mutateAsync({
          cid: newItem.itemRef,
          title: newItem.title,
          bpm: newItem.bpm,
          key: newItem.key || undefined,
          tracklist: newItem.tracklist || undefined,
        });
      }

      const listingId = await createListing.mutateAsync({
        itemType: newItem.itemType,
        itemRef: newItem.itemRef || null,
        price: newItem.price,
        title: newItem.title,
        description: newItem.description || null,
        isNft,
      });

      if (
        isNft &&
        mintNftOnList &&
        connected &&
        publicKey &&
        newItem.itemRef
      ) {
        const minted = await mintNft.mutateAsync({
          recipientSolanaAddress: publicKey.toBase58(),
          cid: newItem.itemRef,
          title: newItem.title,
          itemType: newItem.itemType,
          listingId,
        });
        toast.success(
          minted.simulated
            ? `Listed + simulated NFT mint (${minted.mintAddress.slice(0, 12)}…)`
            : `Listed + Metaplex NFT minted on devnet: ${minted.mintAddress.slice(0, 12)}…`,
        );
      } else {
        toast.success(
          newItem.itemType === "mix"
            ? "Mix published (30078) + listed. Connect wallet to mint NFT."
            : isNft
              ? "Listed! Connect wallet to mint Metaplex NFT."
              : "Listed for sale.",
        );
      }

      setShowListForm(false);
      setNewItem({
        itemType: "media",
        itemRef: "",
        price: 10,
        title: "",
        description: "",
        bpm: undefined,
        key: "",
        tracklist: "",
      });
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleBuyWithBkspc = async (item: any) => {
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

      await buyListingBkspc.mutateAsync({
        listingId: item.id,
        buyerSolanaAddress: publicKey.toBase58(),
        burnTxSignature: burnSig,
      });

      toast.success(
        `Purchased with BKSPC burn! ${
          item.isNft && item.itemRef
            ? `NFT/Iroh CID: ${item.itemRef.slice(0, 16)}…`
            : "Seller credited net WB."
        } Tx: ${burnSig.slice(0, 16)}…`,
      );
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <Card className="border-primary/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-primary" />
          <h4 className="font-bold">Creator marketplace</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          List media, mixes, themes, or tickets. Pay with earned WB or burn BKSPC
          on devnet when settlement is wired. Platform fee{" "}
          {formatFeePercent(marketplaceFeeBps)}.
          {bkspcWired ? (
            <span className="text-primary"> BKSPC devnet: active.</span>
          ) : (
            <span> BKSPC burns require `bkspc-devnet` build + manifest.</span>
          )}
        </p>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowListForm(!showListForm)}
          className="mb-3"
        >
          {showListForm ? "Cancel" : "List new item"}
        </Button>

        {showListForm && (
          <div className="space-y-2 mb-4 p-3 border rounded">
            <Select
              value={newItem.itemType}
              onValueChange={(v) => setNewItem({ ...newItem, itemType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="media">Media (photo/video/audio)</SelectItem>
                <SelectItem value="mix">Mix (DJ mix w/ metadata + 30078)</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="theme">Theme</SelectItem>
                <SelectItem value="ticket">Event ticket</SelectItem>
              </SelectContent>
            </Select>
            {newItem.itemType === "media" && isTauri() && (
              <Select
                value={newItem.itemRef}
                onValueChange={(v) =>
                  setNewItem({
                    ...newItem,
                    itemRef: v,
                    title:
                      userMedia.find((m: any) => m.hash === v)?.filename || "",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your media" />
                </SelectTrigger>
                <SelectContent>
                  {userMedia.map((m: any) => (
                    <SelectItem key={m.hash} value={m.hash}>
                      {m.filename} ({(m.fileSize / 1024).toFixed(0)}KB)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {newItem.itemType === "mix" && isTauri() && (
              <>
                <Select
                  value={newItem.itemRef}
                  onValueChange={(v) =>
                    setNewItem({
                      ...newItem,
                      itemRef: v,
                      title:
                        userMedia.find((m: any) => m.hash === v)?.filename || "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mix audio (Iroh CID)" />
                  </SelectTrigger>
                  <SelectContent>
                    {userMedia.map((m: any) => (
                      <SelectItem key={m.hash} value={m.hash}>
                        {m.filename} ({(m.fileSize / 1024).toFixed(0)}KB)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="BPM (e.g. 140)"
                    type="number"
                    value={newItem.bpm ?? ""}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        bpm: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                  <Input
                    placeholder="Key (e.g. Am)"
                    value={newItem.key}
                    onChange={(e) => setNewItem({ ...newItem, key: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Tracklist (comma separated)"
                  value={newItem.tracklist}
                  onChange={(e) =>
                    setNewItem({ ...newItem, tracklist: e.target.value })
                  }
                />
              </>
            )}
            <Input
              placeholder="Title"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            />
            <Input
              placeholder="Price (WB)"
              type="number"
              value={newItem.price}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  price: parseInt(e.target.value) || 10,
                })
              }
            />
            <Textarea
              placeholder="Description"
              value={newItem.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNewItem({ ...newItem, description: e.target.value })
              }
            />
            {(newItem.itemType === "media" || newItem.itemType === "mix") &&
              newItem.itemRef && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={mintNftOnList}
                    onChange={(e) => setMintNftOnList(e.target.checked)}
                  />
                  Mint Metaplex NFT on devnet when wallet connected
                </label>
              )}
            <Button
              size="sm"
              onClick={handleListItem}
              disabled={createListing.isPending || mintNft.isPending}
            >
              {createListing.isPending || mintNft.isPending
                ? "Listing…"
                : "List for sale"}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {listings.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No listings yet. Be the first creator on the yard shop.
            </p>
          )}
          {listings.map((item: any) => (
            <div
              key={item.id}
              className="flex justify-between items-center p-2 border rounded text-sm gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {item.title}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({item.itemType}
                    {item.isNft ? ", NFT" : ""})
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  by @{item.sellerHandle} • {item.price} WB
                </div>
                {item.description && (
                  <div className="text-xs">{item.description}</div>
                )}
                {item.itemRef && (
                  <div className="text-[10px] font-mono truncate">
                    CID: {item.itemRef.slice(0, 20)}…
                  </div>
                )}
                {item.nftMint && (
                  <div className="text-[10px] font-mono truncate text-primary">
                    NFT: {item.nftMint.slice(0, 20)}…
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  size="sm"
                  disabled={item.sellerHandle === (user as any)?.handle}
                  onClick={async () => {
                    try {
                      await buyListing.mutateAsync(item.id);
                      toast.success(
                        `Bought for ${item.price} WB! ${
                          item.isNft && item.itemRef
                            ? "Delivery CID: " + item.itemRef.slice(0, 16) + "…"
                            : "WB transferred to seller."
                        }`,
                      );
                    } catch (e) {
                      toast.error(String(e));
                    }
                  }}
                >
                  Buy (WB)
                </Button>
                {bkspcWired && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      item.sellerHandle === (user as any)?.handle ||
                      buyListingBkspc.isPending
                    }
                    onClick={() => handleBuyWithBkspc(item)}
                  >
                    Buy (BKSPC)
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}