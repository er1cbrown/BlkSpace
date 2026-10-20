import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSafeHttpUrl } from "@/lib/amalgamation-meta";
import type { AudioMixtape } from "@/lib/audio-mixtapes";
import { webGetBlobAsync } from "@/lib/media-web-store";

/**
 * One audio element for the whole mixtape. preload stays none until play
 * so a shelf of sets does not download every file.
 */
export function MixtapePlayer({
  mixtape,
  compact = false,
}: {
  mixtape: AudioMixtape;
  compact?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);
  const track = mixtape.tracks[index];

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [mixtape.id]);

  useEffect(() => {
    let cancel = false;
    const raw = track?.src || "";
    if (!raw) {
      setSrc(null);
      setMissing(true);
      return;
    }
    if (isSafeHttpUrl(raw)) {
      setSrc(raw);
      setMissing(false);
      return;
    }
    setSrc(null);
    void webGetBlobAsync(raw).then((rec) => {
      if (cancel) return;
      setSrc(rec?.dataUrl || null);
      setMissing(!rec?.dataUrl);
    });
    return () => {
      cancel = true;
    };
  }, [track?.src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!src) {
      el.removeAttribute("src");
      el.load();
      return;
    }
    if (playing) {
      void el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [playing, src]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !src) return;
    if (el.paused) {
      void el
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const goto = (next: number) => {
    if (!mixtape.tracks.length) return;
    const wrapped = (next + mixtape.tracks.length) % mixtape.tracks.length;
    setIndex(wrapped);
    setPlaying(true);
  };

  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() => goto(index - 1)}
          aria-label="Previous track"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          className="h-9 w-9"
          onClick={toggle}
          disabled={!src}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() => goto(index + 1)}
          aria-label="Next track"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {track?.title || "No tracks"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {index + 1} / {mixtape.tracks.length}
            {mixtape.priceWb > 0
              ? ` · ${mixtape.priceWb} WB edition`
              : " · free play"}
          </p>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={src || undefined}
        preload="none"
        onEnded={() => {
          if (index + 1 < mixtape.tracks.length) goto(index + 1);
          else setPlaying(false);
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      {missing && (
        <p className="text-[11px] text-muted-foreground">
          This copy is on the machine that uploaded it. An https track plays
          anywhere.
        </p>
      )}
      {!compact && (
        <ol className="text-xs space-y-1">
          {mixtape.tracks.map((row, i) => (
            <li key={row.id}>
              <button
                type="button"
                className={`text-left hover:underline ${i === index ? "text-primary" : "text-muted-foreground"}`}
                onClick={() => {
                  setIndex(i);
                  setPlaying(true);
                }}
              >
                {i + 1}. {row.title}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
