import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isSafeHttpUrl } from "@/lib/amalgamation-meta";
import { isVerseSrc, verseLabel, type AudioMixtape } from "@/lib/audio-mixtapes";
import { webGetBlobAsync } from "@/lib/media-web-store";

/**
 * Digital jacket. Front is the cover. Back is the credits and the track list,
 * the same two faces a vinyl or CD carries.
 */
export function AlbumSleeve({
  mixtape,
  compact = false,
}: {
  mixtape: AudioMixtape;
  compact?: boolean;
}) {
  const [back, setBack] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setBack(false);
  }, [mixtape.id]);

  useEffect(() => {
    let cancel = false;
    const cover = (mixtape.cover || "").trim();
    if (!cover) {
      setSrc(null);
      return;
    }
    if (isSafeHttpUrl(cover)) {
      setSrc(cover);
      return;
    }
    setSrc(null);
    void webGetBlobAsync(cover).then((rec) => {
      if (!cancel) setSrc(rec?.dataUrl || null);
    });
    return () => {
      cancel = true;
    };
  }, [mixtape.cover]);

  const width = compact ? "w-36" : "w-full max-w-[280px]";

  return (
    <div className={width}>
      <div className="aspect-square overflow-hidden rounded-md border border-border bg-neutral-950 text-white">
        {back ? (
          <div className="flex h-full flex-col bg-neutral-100 p-3 text-neutral-900">
            <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Credits
            </p>
            <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[11px] leading-snug">
              {mixtape.credits.trim() || "No credits on this sleeve."}
            </p>
            <ol className="mt-2 flex-1 space-y-0.5 overflow-auto text-[11px]">
              {mixtape.tracks.map((track, index) => (
                <li key={track.id} className="flex gap-2">
                  <span className="w-4 shrink-0 tabular-nums text-neutral-500">
                    {index + 1}
                  </span>
                  <span className="truncate">
                    {isVerseSrc(track.src) ? verseLabel(track.src) : track.title}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : src ? (
          <img
            src={src}
            alt={`${mixtape.title} cover`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col justify-end p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">
              BlkSpace
            </p>
            <p className={`font-serif leading-tight ${compact ? "text-sm" : "text-2xl"}`}>
              {mixtape.title}
            </p>
            <p className="mt-1 text-[11px] text-white/70">@{mixtape.authorHandle}</p>
          </div>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2 h-7 w-full text-[11px]"
        aria-pressed={back}
        onClick={() => setBack((open) => !open)}
      >
        {back ? "Front · artwork" : "Back · credits and tracks"}
      </Button>
    </div>
  );
}
