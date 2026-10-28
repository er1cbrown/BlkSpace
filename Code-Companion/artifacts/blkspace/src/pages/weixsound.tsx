import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlbumSleeve } from "@/components/media/AlbumSleeve";
import { MixtapePlayer } from "@/components/media/MixtapePlayer";
import {
  listMixtapes,
  syncMixtapes,
  type AudioMixtape,
} from "@/lib/audio-mixtapes";
import { getCurrentHandle } from "@/lib/auth";
import {
  buyCopyPass,
  buyMarketplaceListing,
  listCopyPasses,
  listMyCopies,
  offerCopyPass,
  type CopyPass,
} from "@/lib/marketplace-escrow";
import {
  chainVerifiedSale,
  formatLabel,
  holdsVerifiedCopy,
  rememberVerifiedCopy,
  WEIXSOUND_LABEL,
} from "@/lib/weixsound";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

/**
 * Yard record shop. Every member releases under their own name.
 * Free play. One numbered copy in WeixBucks. Passing a copy pays the sleeve.
 */
export default function WeixSoundPage() {
  const [tick, setTick] = useState(0);
  const [buying, setBuying] = useState("");
  const [autoId, setAutoId] = useState("");
  const [handle] = useState(getCurrentHandle);
  const [passes, setPasses] = useState<CopyPass[]>([]);
  const [mine, setMine] = useState<CopyPass[]>([]);
  const [ask, setAsk] = useState<Record<string, string>>({});

  const refresh = async () => {
    await syncMixtapes();
    const [board, copies] = await Promise.all([
      listCopyPasses(),
      listMyCopies().catch(() => [] as CopyPass[]),
    ]);
    setPasses(board);
    setMine(copies);
    setTick((n) => n + 1);
  };

  useEffect(() => {
    let cancel = false;
    void refresh().catch(() => {
      if (!cancel) setTick((n) => n + 1);
    });
    return () => {
      cancel = true;
    };
  }, []);

  const shelves = useMemo(() => {
    void tick;
    const rows = listMixtapes();
    const artists = [
      ...new Set(rows.map((row) => row.authorHandle || "artist")),
    ];
    return artists.map((artist) => ({
      artist,
      rows: rows.filter((row) => (row.authorHandle || "artist") === artist),
    }));
  }, [tick]);

  const buyCopy = async (mixtape: AudioMixtape) => {
    if (!mixtape.listingId) return;
    setBuying(mixtape.id);
    try {
      const sale = await buyMarketplaceListing(mixtape.listingId);
      const receipt = sale.receipt as
        { copyNumber?: number; anchorStatus?: string } | undefined;
      const anchor = sale.discAnchor as {
        callsConvertWbToBkspc?: boolean;
      } | null;
      const salePrice =
        Number(sale.amount ?? sale.price ?? mixtape.priceWb) || 0;
      const verified =
        sale.status !== "funds_locked" &&
        (receipt?.anchorStatus === "pending" ||
          chainVerifiedSale({
            setKind: mixtape.setKind,
            format: mixtape.format,
            priceWb: Math.max(mixtape.priceWb, salePrice),
          }));
      if (verified) {
        rememberVerifiedCopy(mixtape.id);
        setAutoId(mixtape.id);
      }
      const copyLabel = receipt?.copyNumber
        ? `Copy ${receipt.copyNumber}. `
        : "";
      toast.success(
        verified
          ? `${copyLabel}Paid in WeixBucks. Stems and credits are on.`
          : receipt?.copyNumber
            ? `Copy ${receipt.copyNumber}. Paid in WeixBucks.`
            : "Copy bought with WeixBucks.",
      );
      if (receipt?.anchorStatus === "pending") {
        toast(
          "The label can anchor a Solana memo later. This sale did not wait on it.",
        );
      }
      if (anchor?.callsConvertWbToBkspc) {
        toast.error("The receipt tried to mint. That sale should be reviewed.");
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The copy did not sell");
    } finally {
      setBuying("");
    }
  };

  const passCopy = async (listingId: number, mixtapeId: string) => {
    if (listingId < 1) {
      toast.error("Buy the copy on this yard before passing it");
      return;
    }
    const price = Number.parseInt(ask[mixtapeId] || "", 10);
    if (!Number.isInteger(price) || price < 1) {
      toast.error("Set a whole WeixBucks price of at least 1");
      return;
    }
    setBuying(mixtapeId);
    try {
      await offerCopyPass(listingId, price);
      toast.success("Offered. A sale pays the people on the sleeve, not you.");
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "The copy was not offered",
      );
    } finally {
      setBuying("");
    }
  };

  const takeCopy = async (offer: CopyPass) => {
    setBuying(`pass-${offer.listingId}`);
    try {
      const sale = await buyCopyPass(offer.listingId, offer.holder);
      if (sale.passed) rememberVerifiedCopy(offer.itemRef);
      toast.success(
        `Copy ${sale.copyNumber || offer.copyNumber}. Paid the sleeve ${sale.amount} WB.`,
      );
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "The copy was not passed",
      );
    } finally {
      setBuying("");
    }
  };

  return (
    <AppShell wide>
      <div className="space-y-6 max-w-3xl">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-serif">WeixSound</h1>
          <p className="text-sm text-muted-foreground">
            {WEIXSOUND_LABEL} is the license on every disc. The artist is the
            member who released it. Play a release free. A priced copy is a
            numbered disc paid in WeixBucks. The names on the sleeve are paid,
            and the yard keeps 5 percent. Passing a copy pays that sleeve again.
            There is no price chart and no promise the next price is higher. A
            public disc can link to Audius, SoundCloud, Bandcamp, or Tidal.
          </p>
          <Link href="/audio" className="text-sm underline">
            Set the format and the split on Audio
          </Link>
        </div>
        {shelves.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No {WEIXSOUND_LABEL} releases on this device yet.
          </p>
        )}
        {shelves.map((shelf) => (
          <section key={shelf.artist} className="space-y-3">
            <h2 className="text-lg font-semibold">@{shelf.artist}</h2>
            {shelf.rows.map((mixtape) => (
              <Card key={mixtape.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{mixtape.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {WEIXSOUND_LABEL} · {formatLabel(mixtape.format)} ·{" "}
                    {mixtape.visibility === "public" ? "public" : "yard only"} ·
                    @{mixtape.authorHandle} · {mixtape.editionSize} copies ·{" "}
                    {mixtape.priceWb > 0 ? `${mixtape.priceWb} WB` : "free"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {mixtape.splits
                      .map((row) => `${row.handle} ${row.percent}`)
                      .join(" · ")}{" "}
                    · yard 5
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <AlbumSleeve mixtape={mixtape} />
                    <div className="min-w-0 flex-1">
                      <MixtapePlayer
                        mixtape={mixtape}
                        pro={
                          holdsVerifiedCopy(mixtape.id) ||
                          mixtape.authorHandle === handle
                        }
                        autoPlay={autoId === mixtape.id}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mixtape.listingId ? (
                      <Button
                        size="sm"
                        disabled={buying === mixtape.id}
                        onClick={() => void buyCopy(mixtape)}
                      >
                        Buy one copy
                      </Button>
                    ) : (
                      <Link href="/audio">
                        <Button size="sm" variant="outline">
                          List the copy on Audio
                        </Button>
                      </Link>
                    )}
                    {mixtape.storeUrl && (
                      <a
                        href={mixtape.storeUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button size="sm" variant="outline">
                          Store link
                        </Button>
                      </a>
                    )}
                    {passes
                      .filter(
                        (row) =>
                          row.itemRef === mixtape.id && row.holder !== handle,
                      )
                      .map((offer) => (
                        <Button
                          key={`${offer.listingId}-${offer.copyNumber}`}
                          size="sm"
                          variant="outline"
                          disabled={buying === `pass-${offer.listingId}`}
                          onClick={() => void takeCopy(offer)}
                        >
                          Take copy {offer.copyNumber} · {offer.askWb} WB
                        </Button>
                      ))}
                  </div>
                  {(mine.some((row) => row.itemRef === mixtape.id) ||
                    (holdsVerifiedCopy(mixtape.id) && mixtape.listingId)) && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        inputMode="numeric"
                        className="h-8 w-28"
                        placeholder="Pass price"
                        aria-label={`Pass price for ${mixtape.title}`}
                        value={ask[mixtape.id] || ""}
                        onChange={(event) =>
                          setAsk((current) => ({
                            ...current,
                            [mixtape.id]: event.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={buying === mixtape.id}
                        onClick={() =>
                          void passCopy(
                            mine.find((row) => row.itemRef === mixtape.id)
                              ?.listingId ||
                              mixtape.listingId ||
                              0,
                            mixtape.id,
                          )
                        }
                      >
                        Pass this copy
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
