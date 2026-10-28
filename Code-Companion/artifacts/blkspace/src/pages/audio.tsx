import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlbumSleeve } from "@/components/media/AlbumSleeve";
import { MixtapePlayer } from "@/components/media/MixtapePlayer";
import { useGuestMode } from "@/lib/guest-mode";
import {
  audioFileOk,
  coverFileOk,
  listMixtapes,
  markMixtapeListed,
  mixtapeListingArgs,
  publishMixtape,
  syncMixtapes,
  verseTrackSrc,
  type MixSetKind,
  type MixtapeTrack,
} from "@/lib/audio-mixtapes";
import {
  formatLabel,
  STEM_LANES,
  WEIXSOUND_LABEL,
  type DiscFormat,
  type ReleaseVisibility,
  type StemLane,
} from "@/lib/weixsound";
import { trackSrcOk } from "@/lib/audio-mixtapes";
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
  const [setKind, setSetKind] = useState<MixSetKind>("songs");
  const [verseRef, setVerseRef] = useState("");
  const [tracks, setTracks] = useState<MixtapeTrack[]>([]);
  const [cover, setCover] = useState("");
  const [credits, setCredits] = useState("");
  const [format, setFormat] = useState<DiscFormat>("single");
  const [visibility, setVisibility] = useState<ReleaseVisibility>("yard");
  const [storeUrl, setStoreUrl] = useState("");
  const [splitsText, setSplitsText] = useState("");
  const [masterId, setMasterId] = useState("");
  const [rightsAttested, setRightsAttested] = useState(false);
  const [stemLane, setStemLane] = useState<StemLane>("vocals");
  const [stemUrl, setStemUrl] = useState("");
  const [stemFor, setStemFor] = useState(0);
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

  const addCoverFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const problem = coverFileOk(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readFile(file);
      const saved = await webStoreFile(file, dataUrl);
      setCover(saved.id);
      if (!saved.synced) {
        toast("Cover saved on this device. Other phones need an https link.");
      }
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

  const addVerse = () => {
    try {
      const src = verseTrackSrc(verseRef);
      setTracks((cur) =>
        [
          ...cur,
          {
            id: `verse_${cur.length}`,
            title: src.slice(6),
            src,
          },
        ].slice(0, 12),
      );
      setVerseRef("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "That verse did not parse",
      );
    }
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
        setKind,
        cover,
        credits,
        format,
        visibility: setKind === "songs" ? visibility : "yard",
        storeUrl,
        splitsText,
        masterId,
        rightsAttested: setKind === "songs" && rightsAttested,
      });
      setTitle("");
      setBody("");
      setTracks([]);
      setCover("");
      setCredits("");
      setStoreUrl("");
      setSplitsText("");
      setMasterId("");
      setRightsAttested(false);
      setStemUrl("");
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
            Publish a song mix, a verse mix, or a Logos Deck. {WEIXSOUND_LABEL}{" "}
            is the license stamped on the disc. You stay the artist. The sleeve
            works like a vinyl or a CD: artwork on the front, credits and the
            track list on the back. A priced set is a numbered campus copy paid
            in WeixBucks. The names on the sleeve are who gets paid. The yard
            keeps 5 percent. Buying a Logos Deck turns that set on for the
            buyer. It is not a chain NFT, and passing a copy pays the sleeve
            again.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>MySpace — one song on your page.</span>
            <span>SoundCloud / YouTube — a list that plays in order.</span>
            <span>Newgrounds — you own the file, the yard can list it.</span>
          </div>
          <Link href="/weixsound" className="text-sm underline">
            {WEIXSOUND_LABEL} on WeixSound
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Publish a set</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <select
              aria-label="Set kind"
              value={setKind}
              onChange={(event) => setSetKind(event.target.value as MixSetKind)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="songs">Song mix</option>
              <option value="verses">Verse mix</option>
              <option value="logos">Logos Deck</option>
            </select>
            <select
              aria-label="Disc format"
              value={format}
              onChange={(event) => setFormat(event.target.value as DiscFormat)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="single">Single</option>
              <option value="vinyl">Vinyl</option>
              <option value="ep">EP</option>
              <option value="mixtape">Mixtape</option>
              <option value="album">Album / LP</option>
              <option value="cd">CD</option>
            </select>
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
            <Textarea
              placeholder="Credits for the back of the sleeve"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              rows={2}
              aria-label="Credits"
            />
            <p className="text-xs text-muted-foreground">
              Licensed {WEIXSOUND_LABEL}. The split below is the artist pay.
            </p>
            <Textarea
              placeholder="Splits, one per line: handle percent. Empty gives you 95. The yard keeps 5."
              value={splitsText}
              onChange={(e) => setSplitsText(e.target.value)}
              rows={2}
              aria-label="Splits"
            />
            <Input
              placeholder="Master id, when a CD uses the same audio as an album"
              value={masterId}
              onChange={(e) => setMasterId(e.target.value)}
              aria-label="Master id"
            />
            {setKind === "songs" && (
              <div className="space-y-2">
                <select
                  aria-label="Who can open this disc"
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(event.target.value as ReleaseVisibility)
                  }
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="yard">Yard only</option>
                  <option value="public">Public link</option>
                </select>
                <Input
                  placeholder="https:// store link (Audius, SoundCloud, Bandcamp, Tidal)"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  aria-label="Store link"
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rightsAttested}
                    onChange={(event) =>
                      setRightsAttested(event.target.checked)
                    }
                  />
                  I hold the rights to this recording
                </label>
                <p className="text-[11px] text-muted-foreground">
                  A vinyl, and any paid song copy, records a yard receipt. A
                  Solana memo can be anchored later and does not mint. The buyer
                  then streams the stems and the credits. A free play stays the
                  master.
                </p>
              </div>
            )}
            {cover.startsWith("web_") ? (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Cover saved on this device.</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setCover("")}
                >
                  Remove cover
                </Button>
              </div>
            ) : (
              <Input
                placeholder="https:// link to cover art"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                aria-label="Cover art link"
              />
            )}
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
              aria-label="Cover image"
              onChange={(e) => {
                void addCoverFile(e.target.files);
                e.target.value = "";
              }}
            />
            <Input
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.webm"
              multiple
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {setKind !== "songs" && (
              <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                <Input
                  placeholder="Verse, like Isaiah 53:5"
                  value={verseRef}
                  onChange={(event) => setVerseRef(event.target.value)}
                  aria-label="Verse reference"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVerse}
                >
                  Add verse
                </Button>
              </div>
            )}
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
              <div className="space-y-2">
                <ul className="text-xs text-muted-foreground space-y-1">
                  {tracks.map((track) => (
                    <li key={track.id}>
                      {track.title}
                      {track.stems?.length
                        ? ` · ${track.stems.map((stem) => stem.lane).join(", ")}`
                        : ""}
                    </li>
                  ))}
                </ul>
                <div className="grid sm:grid-cols-[auto_auto_1fr_auto] gap-2">
                  <select
                    aria-label="Stem track"
                    value={stemFor}
                    onChange={(event) => setStemFor(Number(event.target.value))}
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    {tracks.map((track, index) => (
                      <option key={track.id} value={index}>
                        {track.title}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Stem lane"
                    value={stemLane}
                    onChange={(event) =>
                      setStemLane(event.target.value as StemLane)
                    }
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    {STEM_LANES.map((lane) => (
                      <option key={lane} value={lane}>
                        {lane}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="https:// stem file"
                    value={stemUrl}
                    onChange={(event) => setStemUrl(event.target.value)}
                    aria-label="Stem link"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!trackSrcOk(stemUrl)) {
                        toast.error("A stem needs an https audio file.");
                        return;
                      }
                      setTracks((cur) =>
                        cur.map((track, index) =>
                          index === stemFor
                            ? {
                                ...track,
                                stems: [
                                  ...(track.stems || []).filter(
                                    (stem) => stem.lane !== stemLane,
                                  ),
                                  {
                                    id: `${stemLane}_${track.id}`,
                                    lane: stemLane,
                                    src: stemUrl.trim(),
                                  },
                                ].slice(0, 4),
                              }
                            : track,
                        ),
                      );
                      setStemUrl("");
                    }}
                  >
                    Add stem
                  </Button>
                </div>
              </div>
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
                  {formatLabel(mixtape.format)} ·{" "}
                  {mixtape.setKind === "logos"
                    ? "Logos Deck"
                    : mixtape.setKind === "verses"
                      ? "Verse mix"
                      : "Song mix"}{" "}
                  · {mixtape.label} ·{" "}
                  {mixtape.visibility === "public" ? "public" : "yard"} · @
                  {mixtape.authorHandle} · {mixtape.editionSize} copies ·{" "}
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
                <p className="text-xs text-muted-foreground">
                  {mixtape.splits
                    .map((row) => `${row.handle} ${row.percent}`)
                    .join(" · ")}{" "}
                  · yard 5{mixtape.storeUrl ? ` · ${mixtape.storeUrl}` : ""}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <AlbumSleeve mixtape={mixtape} />
                  <div className="min-w-0 flex-1">
                    <MixtapePlayer mixtape={mixtape} pro />
                  </div>
                </div>
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
