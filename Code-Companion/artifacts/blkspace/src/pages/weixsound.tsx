import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlbumSleeve } from "@/components/media/AlbumSleeve";
import { MixtapePlayer } from "@/components/media/MixtapePlayer";
import { listMixtapes, syncMixtapes, type AudioMixtape } from "@/lib/audio-mixtapes";
import { getCurrentHandle } from "@/lib/auth";
import { buyMarketplaceListing } from "@/lib/marketplace-escrow";
import {
  chainVerifiedSale,
  DISC_FORMATS,
  formatLabel,
  holdsVerifiedCopy,
  rememberVerifiedCopy,
  WEIXSOUND_LABEL,
  type DiscFormat,
} from "@/lib/weixsound";
import { toast } from "sonner";

/**
 * Bermuda Boyz storefront. Free play. One copy in WeixBucks.
 * No price chart and no perpetual.
 */
export default function WeixSoundPage() {
  const [tick, setTick] = useState(0);
  const [buying, setBuying] = useState("");
  const [autoId, setAutoId] = useState("");
  const [handle] = useState(getCurrentHandle);

  useEffect(() => {
    let cancel = false;
    void syncMixtapes().then(() => {
      if (!cancel) setTick((n) => n + 1);
    });
    return () => {
      cancel = true;
    };
  }, []);

  const shelves = useMemo(() => {
    void tick;
    const rows = listMixtapes().filter((row) => row.label === WEIXSOUND_LABEL);
    return DISC_FORMATS.map((format) => ({
      format,
      rows: rows.filter((row) => row.format === format),
    })).filter((shelf) => shelf.rows.length > 0);
  }, [tick]);

  const buyCopy = async (mixtape: AudioMixtape) => {
    if (!mixtape.listingId) return;
    setBuying(mixtape.id);
    try {
      const sale = await buyMarketplaceListing(mixtape.listingId);
      const receipt = sale.receipt as { copyNumber?: number; anchorStatus?: string } | undefined;
      const anchor = sale.discAnchor as { callsConvertWbToBkspc?: boolean } | null;
      const salePrice = Number(sale.amount ?? sale.price ?? mixtape.priceWb) || 0;
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
      const copyLabel = receipt?.copyNumber ? `Copy ${receipt.copyNumber}. ` : "";
      toast.success(
        verified
          ? `${copyLabel}Paid in WeixBucks. Stems and credits are on.`
          : receipt?.copyNumber
            ? `Copy ${receipt.copyNumber}. Paid in WeixBucks.`
            : "Copy bought with WeixBucks.",
      );
      if (receipt?.anchorStatus === "pending") {
        toast("The label can anchor a Solana memo later. This sale did not wait on it.");
      }
      if (anchor?.callsConvertWbToBkspc) {
        toast.error("The receipt tried to mint. That sale should be reviewed.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The copy did not sell");
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
            {WEIXSOUND_LABEL}. Play a release free. A vinyl, or any paid song
            copy, is the verified sale. The buyer then streams the stems and
            the credits. A free play stays the master. The yard keeps 5 percent.
            A public disc can link to Audius, SoundCloud, Bandcamp, or Tidal.
            There is no price chart.
          </p>
          <Link href="/audio" className="text-sm underline">
            Set the format and the split on Audio
          </Link>
        </div>
        {shelves.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No Bermuda Boyz releases on this device yet.
          </p>
        )}
        {shelves.map((shelf) => (
          <section key={shelf.format} className="space-y-3">
            <h2 className="text-lg font-semibold">{formatLabel(shelf.format as DiscFormat)}</h2>
            {shelf.rows.map((mixtape) => (
              <Card key={mixtape.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{mixtape.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {formatLabel(mixtape.format)} ·{" "}
                    {mixtape.visibility === "public" ? "public" : "yard only"} · @
                    {mixtape.authorHandle} · {mixtape.editionSize} copies ·{" "}
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
                      <a href={mixtape.storeUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">
                          Store link
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
