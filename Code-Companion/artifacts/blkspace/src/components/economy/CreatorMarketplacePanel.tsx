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
import { Store } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import {
  useAppGetUser,
  useAppCreateMarketplaceListing,
  useTauriMarketplace,
  useTauriPublishMix,
  useTauriGetTokenomicsPolicy,
  useTauriMintMixNft,
} from "@/hooks/use-app-data";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import {
  isTauri,
  tauriListUserBlobs,
  tauriGetBkspcSettlementStatus,
} from "@/lib/tauri-api";
import { formatFeePercent } from "@/lib/tokenomics";
import {
  MYARD_PROFILE_THEMES,
  YARD_PACK_THEMES,
  YARD_SALE_ITEM_TYPES,
} from "@/lib/myyard-catalog";
import { YARD_IDS, YARD_THEME_PACKS } from "@/lib/yard-themes";
import { YardSaleListings } from "@/components/economy/YardSaleListings";

const ALL_THEME_OPTIONS = [...MYARD_PROFILE_THEMES, ...YARD_PACK_THEMES];

export function CreatorMarketplacePanel() {
  const handle = getCurrentHandle();
  const { data: user } = useAppGetUser(handle);
  const { data: listings = [] } = useTauriMarketplace();
  const { data: policy } = useTauriGetTokenomicsPolicy();
  const createListing = useAppCreateMarketplaceListing();
  const publishMix = useTauriPublishMix();
  const mintNft = useTauriMintMixNft();
  const { publicKey, connected } = useWallet();

  const { data: settlementStatus } = useQuery({
    queryKey: ["tauri", "bkspc-settlement-status"],
    queryFn: tauriGetBkspcSettlementStatus,
    enabled: isTauri(),
  });

  const bkspcWired = settlementStatus?.wired === true;
  const defaultTown =
    (user as { town?: string })?.town?.toLowerCase() || "tsu";

  const [showListForm, setShowListForm] = useState(false);
  const [mintNftOnList, setMintNftOnList] = useState(true);
  const [townTag, setTownTag] = useState(defaultTown);
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
    if ((user as { town?: string })?.town) {
      setTownTag((user as { town?: string }).town!.toLowerCase());
    }
  }, [user]);

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
    if (newItem.itemType === "theme" && !newItem.itemRef) {
      toast.error("Select a theme pack to list");
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

      const itemRef =
        newItem.itemRef && newItem.itemRef !== "__none__"
          ? newItem.itemRef
          : null;

      const listingId = await createListing.mutateAsync({
        itemType: newItem.itemType,
        itemRef,
        price: newItem.price,
        title: newItem.title,
        description: newItem.description || null,
        isNft,
        townTag,
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
            : newItem.itemType === "logos-deck"
              ? "Logos Deck set listed on Yard Sale."
              : isNft
                ? "Listed! Connect wallet to mint Metaplex NFT."
                : "Listed on Yard Sale.",
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

  return (
    <Card className="border-primary/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Store className="w-5 h-5 text-primary" />
          <h4 className="font-bold">Yard Sale</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Sell from your MyYard — media, DJ mixes, theme packs, Logos Deck sets,
          merch, or tickets. Pay with earned WB or burn BKSPC on devnet when
          settlement is wired. Platform fee{" "}
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
              onValueChange={(v) =>
                setNewItem({ ...newItem, itemType: v, itemRef: "" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YARD_SALE_ITEM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={townTag} onValueChange={setTownTag}>
              <SelectTrigger>
                <SelectValue placeholder="Campus yard tag" />
              </SelectTrigger>
              <SelectContent>
                {YARD_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {YARD_THEME_PACKS[id].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {newItem.itemType === "theme" && (
              <Select
                value={newItem.itemRef}
                onValueChange={(v) => {
                  const opt = ALL_THEME_OPTIONS.find((t) => t.itemRef === v);
                  setNewItem({
                    ...newItem,
                    itemRef: v,
                    title: opt?.label ?? newItem.title,
                    description:
                      ("description" in (opt || {})
                        ? (opt as { description?: string }).description
                        : undefined) ?? newItem.description,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select theme pack" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_THEME_OPTIONS.map((t) => (
                    <SelectItem key={t.itemRef} value={t.itemRef}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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
                        userMedia.find((m: any) => m.hash === v)?.filename ||
                        "",
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

            {newItem.itemType === "logos-deck" && isTauri() && (
              <Select
                value={newItem.itemRef}
                onValueChange={(v) =>
                  setNewItem({
                    ...newItem,
                    itemRef: v,
                    title:
                      userMedia.find((m: any) => m.hash === v)?.filename ||
                      "Logos Deck set",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional audio / sermon set (Iroh CID)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No audio yet (metadata only)</SelectItem>
                  {userMedia.map((m: any) => (
                    <SelectItem key={m.hash} value={m.hash}>
                      {m.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        <YardSaleListings
          listings={listings}
          bkspcWired={bkspcWired}
          emptyMessage="No listings yet. Be the first creator on the Yard Sale."
        />
      </CardContent>
    </Card>
  );
}