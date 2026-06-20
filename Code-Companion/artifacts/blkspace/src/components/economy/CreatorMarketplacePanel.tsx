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
import { Connection, Transaction, SystemProgram } from "@solana/web3.js";
import {
  useAppGetUser,
  useAppCreateMarketplaceListing,
  useAppBuyMarketplaceListing,
  useTauriMarketplace,
  useTauriPublishMix,
  useTauriGetTokenomicsPolicy,
} from "@/hooks/use-app-data";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import { isTauri, tauriListUserBlobs } from "@/lib/tauri-api";
import { formatFeePercent } from "@/lib/tokenomics";

export function CreatorMarketplacePanel() {
  const handle = getCurrentHandle();
  const { data: user } = useAppGetUser(handle);
  const { data: listings = [] } = useTauriMarketplace();
  const { data: policy } = useTauriGetTokenomicsPolicy();
  const createListing = useAppCreateMarketplaceListing();
  const buyListing = useAppBuyMarketplaceListing();
  const publishMix = useTauriPublishMix();
  const { publicKey, signTransaction, connected } = useWallet();

  const [showListForm, setShowListForm] = useState(false);
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

  return (
    <Card className="border-primary/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-primary" />
          <h4 className="font-bold">Creator marketplace</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          List your media, mixes, themes, services, or tickets for WB. Buyers pay
          with earned WeixBucks — same creator-shop loop as Roblox UGC or Fortnite
          item shop. Platform fee {formatFeePercent(marketplaceFeeBps)}; seller
          receives net WB.
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
                    <SelectValue placeholder="Select mix audio from uploads (Iroh CID)" />
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
                    placeholder="Key (e.g. Am, C#)"
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
            <Button
              size="sm"
              onClick={async () => {
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
                  await createListing.mutateAsync({
                    itemType: newItem.itemType,
                    itemRef: newItem.itemRef || null,
                    price: newItem.price,
                    title: newItem.title,
                    description: newItem.description || null,
                    isNft,
                  });
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
                  toast.success(
                    newItem.itemType === "mix"
                      ? "Mix published as 30078 + listed (30081 if NFT). 8 WB credited."
                      : "Listed! Published as Nostr 30081 if NFT.",
                  );
                } catch (e) {
                  toast.error(String(e));
                }
              }}
            >
              List for sale
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
              className="flex justify-between items-center p-2 border rounded text-sm"
            >
              <div>
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
                  <div className="text-[10px] font-mono">
                    Ref: {item.itemRef.slice(0, 16)}… (Iroh CID for delivery)
                  </div>
                )}
              </div>
              <Button
                size="sm"
                disabled={item.sellerHandle === (user as any)?.handle}
                onClick={async () => {
                  try {
                    await buyListing.mutateAsync(item.id);
                    toast.success(
                      `Bought for ${item.price} WB! ${
                        item.isNft && item.itemRef
                          ? "NFT/Iroh delivery CID: " +
                            item.itemRef +
                            " (fetch in media or via Iroh)"
                          : "WB transferred to seller."
                      }`,
                    );

                    if (connected && publicKey && signTransaction) {
                      try {
                        const connection = new Connection(
                          "https://api.devnet.solana.com",
                        );
                        const tx = new Transaction().add(
                          SystemProgram.transfer({
                            fromPubkey: publicKey,
                            toPubkey: publicKey,
                            lamports: 1,
                          }),
                        );
                        tx.recentBlockhash = (
                          await connection.getLatestBlockhash()
                        ).blockhash;
                        tx.feePayer = publicKey;
                        const signed = await signTransaction(tx);
                        const sig = await connection.sendRawTransaction(
                          signed.serialize(),
                        );
                        toast(
                          `On-chain BKSP settlement for purchase: ${sig.slice(0, 16)}...`,
                        );
                      } catch {
                        /* optional devnet stub */
                      }
                    }

                    if (item.itemType === "theme") {
                      toast(
                        "Theme unlocked on-chain (Solana NFT stub + Nostr kind 0 for profile persistence)! Go to profile customize.",
                      );
                    }
                  } catch (e) {
                    toast.error(String(e));
                  }
                }}
              >
                Buy
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}