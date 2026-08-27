import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { tapeIsPlaylist } from "@/lib/myyard-layout";

const VOL_LS = "blkspace_myyard_volume";

export type TapeTrack = {
  id: string;
  src: string | null;
  name?: string;
};

interface ProfileMusicPlayerProps {
  /** Lead / current blob hash (single-song path). */
  hash: string | null;
  /** Resolved URL for `hash` when no `tracks` list is passed. */
  src: string | null;
  trackName?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
  /**
   * Full tape. Playlist chrome + skip + auto-advance only if length > 1.
   * One track = same as a single song.
   */
  tracks?: TapeTrack[];
  /** Ask the parent to resolve `src` for a hash (lazy load). */
  onNeedTrack?: (id: string) => void;
}

function readStoredVolume(): number {
  try {
    const n = Number(localStorage.getItem(VOL_LS));
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  } catch {
    /* ignore */
  }
  return 0.8;
}

/**
 * Myspace-style player. Volume is always real. Skip/playlist only run when
 * a tape with 2+ tracks is available.
 */
export function ProfileMusicPlayer({
  hash,
  src,
  trackName,
  subtitle = "Profile song",
  compact = false,
  className,
  tracks: tracksProp,
  onNeedTrack,
}: ProfileMusicPlayerProps) {
  const tracks = useMemo<TapeTrack[]>(() => {
    if (tracksProp && tracksProp.length > 0) return tracksProp;
    if (hash) return [{ id: hash, src, name: trackName }];
    return [];
  }, [tracksProp, hash, src, trackName]);

  const hasPlaylist = tapeIsPlaylist(tracks.map((t) => t.id));
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(readStoredVolume);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const safeIndex = tracks.length === 0 ? 0 : Math.min(index, tracks.length - 1);
  const active = tracks[safeIndex];
  const activeSrc = active?.src ?? null;

  useEffect(() => {
    if (index >= tracks.length) setIndex(0);
  }, [tracks.length, index]);

  useEffect(() => {
    if (active?.id && !active.src) onNeedTrack?.(active.id);
  }, [active?.id, active?.src, onNeedTrack]);

  useEffect(() => {
    const el = audioRef.current;
    if (el && activeSrc) {
      el.load();
      el.volume = muted ? 0 : volume;
      if (playing) el.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when src identity changes
  }, [activeSrc]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setCurrent(el.currentTime);
      setDuration(el.duration || 0);
      setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      if (!hasPlaylist) {
        setPlaying(false);
        return;
      }
      setIndex((i) => (i + 1) % tracks.length);
      setPlaying(true);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [hasPlaylist, tracks.length, activeSrc]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  const skip = (dir: -1 | 1) => {
    if (!hasPlaylist) return;
    setIndex((i) => (i + dir + tracks.length) % tracks.length);
    setPlaying(true);
  };

  const setVol = (v: number) => {
    const next = Math.min(1, Math.max(0, v));
    setVolume(next);
    try {
      localStorage.setItem(VOL_LS, String(next));
    } catch {
      /* ignore */
    }
    if (next > 0 && muted) setMuted(false);
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!active) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <Music className="w-4 h-4" />
        No profile song set
      </div>
    );
  }

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * el.duration;
  };

  return (
    <div
      className={cn(
        "myyard-player rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/5 overflow-hidden",
        compact ? "w-56" : "w-full",
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={activeSrc || undefined}
        preload="metadata"
        playsInline
      />

      <div className="flex items-center gap-2 p-3">
        {hasPlaylist && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => skip(-1)}
            aria-label="Previous track"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          variant="default"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={togglePlay}
          disabled={!activeSrc}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </Button>
        {hasPlaylist && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => skip(1)}
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary/80 mb-0.5">
            <Music className="w-2.5 h-2.5" />
            {hasPlaylist
              ? `Tape ${safeIndex + 1}/${tracks.length}`
              : subtitle}
          </div>
          <div className="font-medium text-sm truncate">
            {active.name || `${active.id.slice(0, 10)}…`}
          </div>
        </div>
      </div>

      <div className="px-3 pb-2">
        <div
          className={cn(
            "group relative h-1.5 rounded-full bg-muted cursor-pointer",
            !activeSrc && "opacity-40 cursor-not-allowed",
          )}
          onClick={seek}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular-nums">
          <span>{fmt(current)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      <div className={cn("flex items-center gap-2 px-3 pb-3", compact && "pt-0")}>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
        >
          {muted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[muted ? 0 : volume]}
          onValueChange={(v) => setVol(v[0] ?? 0)}
          className="flex-1"
          aria-label="Volume"
        />
        <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">
          {Math.round((muted ? 0 : volume) * 100)}
        </span>
      </div>

      {hasPlaylist && !compact && (
        <ol className="border-t border-border/50 max-h-36 overflow-y-auto text-xs">
          {tracks.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                className={cn(
                  "w-full text-left px-3 py-1.5 truncate hover:bg-primary/10",
                  i === safeIndex && "bg-primary/15 font-medium",
                )}
                onClick={() => {
                  setIndex(i);
                  setPlaying(true);
                }}
              >
                {i + 1}. {t.name || t.id.slice(0, 10)}
              </button>
            </li>
          ))}
        </ol>
      )}

      {!activeSrc && (
        <div className="px-3 pb-2 text-[10px] text-muted-foreground">
          Loading track…
        </div>
      )}
    </div>
  );
}
