import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  Download,
  FolderOpen,
  Lock,
  Package,
  Plus,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentHandle } from "@/lib/auth";
import {
  addCollectionItem,
  addShootAsset,
  createCollection,
  createShoot,
  exportShootManifest,
  grantShootAccess,
  listClientDeliveries,
  listCollectionItems,
  listCollections,
  listMyShoots,
  listShootAssets,
  publishShoot,
  purchaseShootAccess,
  type StudioCollection,
  type StudioShoot,
} from "@/lib/studio";

export function StudioPanel({
  profileHandle,
  isOwn,
}: {
  profileHandle: string;
  isOwn: boolean;
}) {
  const me = getCurrentHandle() || "demo_user";
  const [section, setSection] = useState<"portfolio" | "shoots" | "inbox">(
    "portfolio",
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Camera className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p>
          Photography / video studio: public portfolio for booking, client
          deliveries with{" "}
          <strong className="text-foreground">free grant</strong> or{" "}
          <strong className="text-foreground">paid all-in-one unlock</strong>,
          and export package.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={section === "portfolio" ? "default" : "outline"}
          onClick={() => setSection("portfolio")}
        >
          Portfolio
        </Button>
        {isOwn && (
          <Button
            size="sm"
            variant={section === "shoots" ? "default" : "outline"}
            onClick={() => setSection("shoots")}
          >
            My shoots
          </Button>
        )}
        <Button
          size="sm"
          variant={section === "inbox" ? "default" : "outline"}
          onClick={() => setSection("inbox")}
        >
          {isOwn ? "Client deliveries (mine)" : "My deliveries"}
        </Button>
      </div>
      {section === "portfolio" && (
        <PortfolioSection profileHandle={profileHandle} isOwn={isOwn} me={me} />
      )}
      {section === "shoots" && isOwn && <ShootsStudioSection me={me} />}
      {section === "inbox" && <ClientInboxSection me={me} isOwn={isOwn} />}
    </div>
  );
}

function PortfolioSection({
  profileHandle,
  isOwn,
  me,
}: {
  profileHandle: string;
  isOwn: boolean;
  me: string;
}) {
  const qc = useQueryClient();
  const { data: collections = [] } = useQuery({
    queryKey: ["studio", "collections", profileHandle, me],
    queryFn: () => listCollections(profileHandle, me),
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createCollection({ title, description: desc, visibility: "public" }),
    onSuccess: (c) => {
      toast.success("Portfolio collection created");
      setShowCreate(false);
      setSelected(c.id);
      qc.invalidateQueries({ queryKey: ["studio", "collections"] });
    },
    onError: (e) => toast.error(String(e)),
  });

  return (
    <div className="space-y-3">
      {isOwn && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New collection
          </Button>
        </div>
      )}
      {showCreate && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <Input
              placeholder="Collection title (e.g. Campus Portraits 2026)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
            />
            <Button
              size="sm"
              disabled={!title.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              Create
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid sm:grid-cols-2 gap-2">
        {collections.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`text-left border rounded-lg p-3 hover:border-primary/40 ${
              selected === c.id ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setSelected(c.id)}
          >
            <div className="font-medium text-sm flex justify-between gap-2">
              {c.title}
              <Badge variant="outline" className="text-[10px]">
                {c.itemCount} shots
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {c.description}
            </p>
          </button>
        ))}
      </div>
      {collections.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No portfolio collections yet.
          {isOwn ? " Create one to showcase your work." : ""}
        </p>
      )}
      {selected != null && (
        <CollectionDetail
          collection={collections.find((c) => c.id === selected)!}
          isOwn={isOwn}
          onChange={() =>
            qc.invalidateQueries({ queryKey: ["studio", "collections"] })
          }
        />
      )}
    </div>
  );
}

function CollectionDetail({
  collection,
  isOwn,
  onChange,
}: {
  collection: StudioCollection;
  isOwn: boolean;
  onChange: () => void;
}) {
  const { data: items = [], refetch } = useQuery({
    queryKey: ["studio", "items", collection.id],
    queryFn: () => listCollectionItems(collection.id),
  });
  const [mediaRef, setMediaRef] = useState("");
  const [caption, setCaption] = useState("");
  const [kind, setKind] = useState("photo");

  const add = useMutation({
    mutationFn: () =>
      addCollectionItem({
        collectionId: collection.id,
        mediaRef,
        caption,
        kind,
      }),
    onSuccess: () => {
      toast.success("Added to portfolio");
      setMediaRef("");
      setCaption("");
      refetch();
      onChange();
    },
    onError: (e) => toast.error(String(e)),
  });

  if (!collection) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          {collection.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="border rounded-lg p-2 text-xs space-y-1 bg-muted/30"
            >
              <Badge variant="secondary" className="text-[10px] capitalize">
                {it.kind}
              </Badge>
              <div className="font-mono text-[10px] truncate">
                {it.mediaRef}
              </div>
              <div className="text-muted-foreground line-clamp-2">
                {it.caption || "—"}
              </div>
            </div>
          ))}
        </div>
        {isOwn && (
          <div className="border rounded p-3 space-y-2">
            <p className="text-xs font-medium">
              Add shot (blob hash / CID / ref)
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={kind === "photo" ? "default" : "outline"}
                className="text-xs"
                onClick={() => setKind("photo")}
              >
                Photo
              </Button>
              <Button
                size="sm"
                variant={kind === "video" ? "default" : "outline"}
                className="text-xs"
                onClick={() => setKind("video")}
              >
                Video
              </Button>
            </div>
            <Input
              placeholder="media ref"
              value={mediaRef}
              onChange={(e) => setMediaRef(e.target.value)}
              className="font-mono text-xs"
            />
            <Input
              placeholder="Caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!mediaRef.trim() || add.isPending}
              onClick={() => add.mutate()}
            >
              Add to collection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ShootsStudioSection({ me }: { me: string }) {
  const qc = useQueryClient();
  const { data: shoots = [] } = useQuery({
    queryKey: ["studio", "my-shoots", me],
    queryFn: listMyShoots,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [client, setClient] = useState("");
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState("25");

  const create = useMutation({
    mutationFn: () =>
      createShoot({
        title,
        description: desc,
        clientHandle: client,
        clientLabel: label,
        accessMode: mode,
        priceWb: parseInt(price, 10) || 25,
      }),
    onSuccess: (s) => {
      toast.success("Shoot created — add assets then publish");
      setShowCreate(false);
      setSelected(s.id);
      qc.invalidateQueries({ queryKey: ["studio", "my-shoots"] });
    },
    onError: (e) => toast.error(String(e)),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          After a shoot: upload selects → publish delivery → grant free access
          or sell all-in-one unlock
        </p>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New shoot
        </Button>
      </div>
      {showCreate && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <Input
              placeholder="Shoot title (e.g. Senior Session · Alex)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="What is included"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Client handle (e.g. jane_doe)"
                value={client}
                onChange={(e) => setClient(e.target.value)}
              />
              <Input
                placeholder="Client label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                size="sm"
                variant={mode === "free" ? "default" : "outline"}
                onClick={() => setMode("free")}
              >
                Free distribute
              </Button>
              <Button
                size="sm"
                variant={mode === "paid" ? "default" : "outline"}
                onClick={() => setMode("paid")}
              >
                Sell all-in-one
              </Button>
              {mode === "paid" && (
                <Input
                  className="w-24 h-8"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="WB"
                />
              )}
            </div>
            <Button
              size="sm"
              disabled={!title.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              Create shoot
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="space-y-2">
        {shoots.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`w-full text-left border rounded-lg p-3 text-sm ${
              selected === s.id ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setSelected(s.id)}
          >
            <div className="font-medium flex flex-wrap gap-2 items-center">
              {s.title}
              <Badge variant="outline" className="text-[10px] capitalize">
                {s.status}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {s.accessMode === "paid" ? `${s.priceWb} WB` : "Free"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {s.clientLabel || s.clientHandle || "No client"} · {s.assetCount}{" "}
              files
            </div>
          </button>
        ))}
      </div>
      {selected != null && (
        <ShootOwnerDetail
          shoot={shoots.find((s) => s.id === selected)!}
          onChange={() => {
            qc.invalidateQueries({ queryKey: ["studio", "my-shoots"] });
            qc.invalidateQueries({ queryKey: ["studio", "assets", selected] });
          }}
        />
      )}
    </div>
  );
}

function ShootOwnerDetail({
  shoot,
  onChange,
}: {
  shoot: StudioShoot;
  onChange: () => void;
}) {
  const { data: assets = [], refetch } = useQuery({
    queryKey: ["studio", "assets", shoot.id],
    queryFn: () => listShootAssets(shoot.id),
  });
  const [mediaRef, setMediaRef] = useState("");
  const [filename, setFilename] = useState("");
  const [caption, setCaption] = useState("");
  const [kind, setKind] = useState("photo");
  const [grantTo, setGrantTo] = useState(shoot.clientHandle || "");

  const add = useMutation({
    mutationFn: () =>
      addShootAsset({
        shootId: shoot.id,
        mediaRef,
        filename: filename || mediaRef.split("/").pop() || "file",
        caption,
        kind,
      }),
    onSuccess: () => {
      toast.success("Asset added");
      setMediaRef("");
      setFilename("");
      refetch();
      onChange();
    },
    onError: (e) => toast.error(String(e)),
  });
  const publish = useMutation({
    mutationFn: () => publishShoot(shoot.id),
    onSuccess: () => {
      toast.success("Delivery published — clients can access");
      onChange();
    },
    onError: (e) => toast.error(String(e)),
  });
  const grant = useMutation({
    mutationFn: () => grantShootAccess(shoot.id, grantTo),
    onSuccess: () => {
      toast.success(`Granted all-in-one access to @${grantTo}`);
      onChange();
    },
    onError: (e) => toast.error(String(e)),
  });
  const exp = useMutation({
    mutationFn: () => exportShootManifest(shoot.id),
    onSuccess: (m) => {
      const blob = new Blob([JSON.stringify(m, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blkspace-shoot-${shoot.id}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export package downloaded");
    },
    onError: (e) => toast.error(String(e)),
  });

  if (!shoot) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="w-4 h-4" />
          {shoot.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{shoot.description}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1">
          {assets.map((a) => (
            <div
              key={a.id}
              className="flex justify-between gap-2 border rounded px-2 py-1.5 text-xs"
            >
              <span className="truncate">
                <Badge
                  variant="outline"
                  className="text-[10px] mr-1 capitalize"
                >
                  {a.kind}
                </Badge>
                {a.filename || a.mediaRef}
              </span>
              <span className="text-muted-foreground font-mono truncate max-w-[40%]">
                {a.mediaRef}
              </span>
            </div>
          ))}
          {assets.length === 0 && (
            <p className="text-xs text-muted-foreground">No assets yet.</p>
          )}
        </div>
        {shoot.status === "draft" && (
          <div className="border rounded p-3 space-y-2">
            <p className="text-xs font-medium">Upload content for client</p>
            <div className="flex gap-1">
              {(["photo", "video"] as const).map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={kind === k ? "default" : "outline"}
                  className="text-xs capitalize"
                  onClick={() => setKind(k)}
                >
                  {k}
                </Button>
              ))}
            </div>
            <Input
              className="font-mono text-xs"
              placeholder="media ref / blob hash / CID"
              value={mediaRef}
              onChange={(e) => setMediaRef(e.target.value)}
            />
            <Input
              placeholder="Filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
            <Input
              placeholder="Caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!mediaRef.trim() || add.isPending}
                onClick={() => add.mutate()}
              >
                Add file
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={publish.isPending}
                onClick={() => publish.mutate()}
              >
                Publish delivery
              </Button>
            </div>
          </div>
        )}
        {shoot.status === "delivered" && (
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              className="h-8 max-w-[160px] text-xs"
              placeholder="Grant to @handle"
              value={grantTo}
              onChange={(e) => setGrantTo(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!grantTo.trim() || grant.isPending}
              onClick={() => grant.mutate()}
            >
              <Unlock className="w-3.5 h-3.5 mr-1" />
              Grant free access
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => exp.mutate()}
              disabled={exp.isPending}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Export package
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClientInboxSection({ me, isOwn }: { me: string; isOwn: boolean }) {
  const qc = useQueryClient();
  const { data: deliveries = [] } = useQuery({
    queryKey: ["studio", "client-deliveries", me],
    queryFn: listClientDeliveries,
  });
  // Also show paid public shoots the user might unlock — own studio paid packs
  const { data: myShoots = [] } = useQuery({
    queryKey: ["studio", "my-shoots-browse", me],
    queryFn: listMyShoots,
    enabled: isOwn,
  });
  const paidBrowse = myShoots.filter(
    (s) => s.accessMode === "paid" && s.status === "delivered",
  );
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Deliveries shared with you (free grant) or unlocked with WB (all-in-one
        access).
      </p>
      <div className="space-y-2">
        {deliveries.map((s) => (
          <DeliveryCard
            key={s.id}
            shoot={s}
            selected={selected === s.id}
            onSelect={() => setSelected(s.id)}
            onChanged={() => {
              qc.invalidateQueries({
                queryKey: ["studio", "client-deliveries"],
              });
              qc.invalidateQueries({ queryKey: ["studio", "assets", s.id] });
            }}
          />
        ))}
        {deliveries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No deliveries in your inbox yet.
          </p>
        )}
      </div>
      {isOwn && paidBrowse.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-medium">
            Your paid packs (clients unlock)
          </p>
          {paidBrowse.map((s) => (
            <div key={s.id} className="text-xs border rounded p-2">
              {s.title} · {s.priceWb} WB · {s.assetCount} files ·{" "}
              {s.accessCount} unlocks
            </div>
          ))}
        </div>
      )}
      {selected != null && (
        <ClientShootView
          shootId={selected}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ["studio", "client-deliveries"] });
          }}
        />
      )}
    </div>
  );
}

function DeliveryCard({
  shoot,
  selected,
  onSelect,
  onChanged,
}: {
  shoot: StudioShoot;
  selected: boolean;
  onSelect: () => void;
  onChanged: () => void;
}) {
  const purchase = useMutation({
    mutationFn: () => purchaseShootAccess(shoot.id),
    onSuccess: (r) => {
      toast.success(
        r.alreadyHadAccess
          ? "You already have access"
          : `Unlocked · ${r.paidWb} WB · all-in-one access`,
      );
      onChanged();
    },
    onError: (e) => toast.error(String(e)),
  });

  return (
    <div
      className={`border rounded-lg p-3 text-sm space-y-2 ${
        selected ? "border-primary bg-primary/5" : ""
      }`}
    >
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="font-medium flex flex-wrap gap-2 items-center">
          {shoot.title}
          {shoot.viewerHasAccess ? (
            <Badge className="text-[10px] bg-green-600">
              <Unlock className="w-3 h-3 mr-0.5" /> Access
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              <Lock className="w-3 h-3 mr-0.5" /> Locked
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Studio @{shoot.ownerHandle} · {shoot.assetCount} files ·{" "}
          {shoot.accessMode === "paid" ? `${shoot.priceWb} WB` : "Free grant"}
        </div>
      </button>
      {!shoot.viewerHasAccess && shoot.accessMode === "paid" && (
        <Button
          size="sm"
          disabled={purchase.isPending}
          onClick={() => purchase.mutate()}
        >
          Unlock all-in-one ({shoot.priceWb} WB)
        </Button>
      )}
    </div>
  );
}

function ClientShootView({
  shootId,
  onChanged,
}: {
  shootId: number;
  onChanged: () => void;
}) {
  const {
    data: assets = [],
    error,
    isError,
  } = useQuery({
    queryKey: ["studio", "assets", shootId],
    queryFn: () => listShootAssets(shootId),
    retry: false,
  });
  const exp = useMutation({
    mutationFn: () => exportShootManifest(shootId),
    onSuccess: (m) => {
      const blob = new Blob([JSON.stringify(m, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blkspace-delivery-${shootId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export package ready");
      onChanged();
    },
    onError: (e) => toast.error(String(e)),
  });

  if (isError) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          {String(error)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Delivery contents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {assets.map((a) => (
          <div
            key={a.id}
            className="flex justify-between gap-2 text-xs border rounded px-2 py-1.5"
          >
            <span>
              <Badge variant="outline" className="text-[10px] mr-1 capitalize">
                {a.kind}
              </Badge>
              {a.filename || a.mediaRef}
              {a.caption ? ` · ${a.caption}` : ""}
            </span>
            <span className="font-mono text-muted-foreground truncate max-w-[45%]">
              {a.mediaRef}
            </span>
          </div>
        ))}
        <Button
          size="sm"
          className="mt-2"
          onClick={() => exp.mutate()}
          disabled={exp.isPending || assets.length === 0}
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          Download export package (JSON)
        </Button>
        <p className="text-[10px] text-muted-foreground">
          All-in-one access: every file in this shoot. Use mediaRef with
          BlkSpace blob APIs or your linked storage to pull full resolution.
        </p>
      </CardContent>
    </Card>
  );
}
