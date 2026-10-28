import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSafeHttpUrl } from "@/lib/amalgamation-meta";
import {
  isVerseSrc,
  verseLabel,
  type AudioMixtape,
} from "@/lib/audio-mixtapes";
import { webGetBlobAsync } from "@/lib/media-web-store";
import { streamMetadata, type StemLane } from "@/lib/weixsound";

/**
 * One audio element for the whole mixtape. preload stays none until play
 * so a shelf of sets does not download every file.
 */
export function MixtapePlayer({
  mixtape,
  compact = false,
  pro = false,
  autoPlay = false,
}: {
  mixtape: AudioMixtape;
  compact?: boolean;
  /** Artist or verified buyer: credits and stem lanes. */
  pro?: boolean;
  /** Start the owned copy after a sale. The browser can still block it. */
  autoPlay?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [lane, setLane] = useState<"master" | StemLane>("master");
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);
  const [verseLine, setVerseLine] = useState("");
  const track = mixtape.tracks[index];
  const stem = track?.stems?.find((row) => row.lane === lane);
  const playSrc = lane === "master" || !stem ? track?.src || "" : stem.src;
  const meta = streamMetadata({
    title: mixtape.title,
    authorHandle: mixtape.authorHandle,
    format: mixtape.format,
    credits: mixtape.credits,
    label: mixtape.label,
    tracks: mixtape.tracks,
    index,
  });

  useEffect(() => {
    setIndex(0);
    setLane("master");
    setPlaying(autoPlay);
  }, [mixtape.id, autoPlay]);

  useEffect(() => {
    let cancel = false;
    const raw = playSrc;
    if (isVerseSrc(raw)) {
      setSrc(null);
      setMissing(false);
      setVerseLine(verseLabel(raw));
      return;
    }
    setVerseLine("");
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
  }, [playSrc]);

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
            {meta.artist} · {meta.release} · {meta.format} · {meta.trackNumber} /{" "}
            {meta.trackCount}
            {lane !== "master" ? ` · ${lane}` : ""}
          </p>
        </div>
      </div>
      {pro && (
        <p className="text-[11px] text-muted-foreground">
          {meta.label}
          {meta.credits ? ` · ${meta.credits}` : ""}
          {mixtape.splits?.length
            ? ` · ${mixtape.splits.map((row) => `${row.handle} ${row.percent}`).join(", ")} · yard 5`
            : ""}
        </p>
      )}
      {pro && (track?.stems?.length || 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant={lane === "master" ? "default" : "outline"}
            className="h-7 text-[11px]"
            onClick={() => {
              setLane("master");
              setPlaying(true);
            }}
          >
            Master
          </Button>
          {track?.stems?.map((row) => (
            <Button
              key={row.id}
              type="button"
              size="sm"
              variant={lane === row.lane ? "default" : "outline"}
              className="h-7 text-[11px]"
              onClick={() => {
                setLane(row.lane);
                setPlaying(true);
              }}
            >
              {row.lane}
            </Button>
          ))}
        </div>
      )}
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
      {verseLine && (
        <p className="text-[11px] text-muted-foreground">
          {verseLine}. This row is the verse, not an audio file.
        </p>
      )}
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
