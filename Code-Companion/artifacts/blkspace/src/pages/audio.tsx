import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MixtapePlayer } from "@/components/media/MixtapePlayer";
import { useGuestMode } from "@/lib/guest-mode";
import {
  audioFileOk,
  listMixtapes,
  markMixtapeListed,
  mixtapeListingArgs,
  publishMixtape,
  syncMixtapes,
  type MixtapeTrack,
} from "@/lib/audio-mixtapes";
import { createMarketplaceListing } from "@/lib/marketplace-escrow";
import { webStoreFile } from "@/lib/media-web-store";
import { Headphones } from "lucide-react";
import { toast } from "sonner";

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Audio shelf. One song is the MySpace profile track. A mixtape is the
 * SoundCloud / YouTube list. Listing it is a Newgrounds-style drop priced
 * in WeixBucks on BlkCore, not a chain NFT.
 */
export default function AudioPage() {
  const { isGuest } = useGuestMode();
  const [tick, setTick] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [price, setPrice] = useState("0");
  const [edition, setEdition] = useState("10");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [tracks, setTracks] = useState<MixtapeTrack[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    void syncMixtapes().then(() => {
      if (!cancel) setTick((n) => n + 1);
    });
    return () => {
      cancel = true;
    };
  }, []);

  const mixtapes = useMemo(() => {
    void tick;
    return listMixtapes();
  }, [tick]);

  const signIn = () => {
    toast("Create a free account to publish audio", {
      action: {
        label: "Sign up",
        onClick: () => {
          window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/welcome`;
        },
      },
    });
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const next: MixtapeTrack[] = [];
      for (const file of Array.from(files)) {
        const problem = audioFileOk(file);
        if (problem) {
          toast.error(problem);
          continue;
        }
        const dataUrl = await readFile(file);
        const saved = await webStoreFile(file, dataUrl);
        next.push({
          id: saved.id,
          title: file.name.replace(/\.[^.]+$/, ""),
          src: saved.id,
        });
        if (!saved.synced) {
          toast("Saved on this device. Other phones need an https link.", {
            description: saved.syncError,
          });
        }
      }
      setTracks((cur) => [...cur, ...next].slice(0, 12));
    } finally {
      setBusy(false);
    }
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    setTracks((cur) =>
      [
        ...cur,
        {
          id: `url_${cur.length}_${url.slice(-8)}`,
          title: linkTitle.trim() || "Linked track",
          src: url,
        },
      ].slice(0, 12),
    );
    setLinkTitle("");
    setLinkUrl("");
  };

  const publish = () => {
    if (isGuest) {
      signIn();
      return;
    }
    try {
      publishMixtape({
        title,
        body,
        tracks,
        priceWb: Number.parseInt(price, 10) || 0,
        editionSize: Number.parseInt(edition, 10) || 1,
      });
      setTitle("");
      setBody("");
      setTracks([]);
      setTick((n) => n + 1);
      void syncMixtapes().then(() => setTick((n) => n + 1));
      toast.success("On the hub. Play it from Music.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish");
    }
  };

  const listEdition = async (id: string) => {
    if (isGuest) {
      signIn();
      return;
    }
    const mixtape = listMixtapes().find((row) => row.id === id);
    if (!mixtape) return;
    if (mixtape.priceWb < 1) {
      toast.error("Set a price of at least 1 WB before listing");
      return;
    }
    try {
      const listingId = await createMarketplaceListing(
        mixtapeListingArgs(mixtape),
      );
      markMixtapeListed(id, listingId);
      setTick((n) => n + 1);
      toast.success("Listed on Yard Sale as a BlkCore edition");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Yard Sale did not save it",
      );
    }
  };

  return (
    <AppShell wide>
      <div className="space-y-6 max-w-3xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Headphones className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif">Audio</h1>
            <Badge variant="outline">BlkCore</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Put a song or a mixtape on the hub. People play it here. A priced
            set can sit on Yard Sale as a BlkCore edition (a copy count in
            WeixBucks). That is not a Solana NFT, and BLKSHI does not take the
            trade.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>MySpace — one song on your page.</span>
            <span>SoundCloud / YouTube — a list that plays in order.</span>
            <span>Newgrounds — you own the file, the yard can list it.</span>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Publish a set</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Who is this for, and do you own the recording?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                inputMode="numeric"
                placeholder="Price WB (0 = free)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-label="Price in WeixBucks"
              />
              <Input
                inputMode="numeric"
                placeholder="Edition size"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                aria-label="Edition size"
              />
            </div>
            <Input
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.webm"
              multiple
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-2">
              <Input
                placeholder="Track name"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
              />
              <Input
                placeholder="https:// link to an audio file"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLink}
              >
                Add link
              </Button>
            </div>
            {tracks.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1">
                {tracks.map((track) => (
                  <li key={track.id}>{track.title}</li>
                ))}
              </ul>
            )}
            <Button
              size="sm"
              disabled={busy || !title.trim()}
              onClick={publish}
            >
              Publish to hub
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {mixtapes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No sets on this device yet.
            </p>
          )}
          {mixtapes.map((mixtape) => (
            <Card key={mixtape.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{mixtape.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  @{mixtape.authorHandle} · {mixtape.editionSize} copies ·{" "}
                  {mixtape.priceWb > 0 ? `${mixtape.priceWb} WB` : "free"}
                  {mixtape.listingId
                    ? ` · Yard Sale #${mixtape.listingId}`
                    : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {mixtape.body && (
                  <p className="text-sm text-muted-foreground">
                    {mixtape.body}
                  </p>
                )}
                <MixtapePlayer mixtape={mixtape} />
                <div className="flex flex-wrap gap-2">
                  <Link href="/hub">
                    <Button size="sm" variant="outline">
                      Open hub
                    </Button>
                  </Link>
                  {!mixtape.listingId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void listEdition(mixtape.id)}
                    >
                      List on Yard Sale
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
