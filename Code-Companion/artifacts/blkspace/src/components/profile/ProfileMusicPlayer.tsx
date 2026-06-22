import { useEffect, useRef, useState } from "react";
import { Music, Play, Pause, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProfileMusicPlayerProps {
  /** Blob/CID hash of the song. */
  hash: string | null;
  /** Resolved base64/data: URL for the audio, or null while loading. */
  src: string | null;
  /** Display name for the track (filename or fallback). */
  trackName?: string;
  /** Artist/subtitle (e.g. handle or "Profile song"). */
  subtitle?: string;
  /** Compact variant for the profile header (hidden on mobile by caller). */
  compact?: boolean;
  className?: string;
}

/**
 * Myspace-style profile song player. Renders real chrome (play/pause, seek,
 * volume, time) around an <audio> element instead of a bare HTML control.
 *
 * Visitors see the track name + a styled player; owners hear their vibe on
 * profile load (autoplay gated by browser policy — falls back to a prominent
 * play button).
 */
export function ProfileMusicPlayer({
  hash,
  src,
  trackName,
  subtitle = "Profile song",
  compact = false,
  className,
}: ProfileMusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

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
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [src]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  const toggleMute = () => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * el.duration;
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!hash) {
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

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/5 overflow-hidden",
        compact ? "w-56" : "w-full",
        className,
      )}
    >
      <audio ref={audioRef} src={src || undefined} preload="metadata" />

      <div className="flex items-center gap-3 p-3">
        <Button
          type="button"
          size="icon"
          variant="default"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={togglePlay}
          disabled={!src}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary/80 mb-0.5">
            <Music className="w-2.5 h-2.5" />
            {subtitle}
          </div>
          <div className="font-medium text-sm truncate">
            {trackName || (hash ? `${hash.slice(0, 10)}…` : "Profile song")}
          </div>
        </div>

        {!compact && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        )}
      </div>

      <div className="px-3 pb-2">
        <div
          className={cn(
            "group relative h-1.5 rounded-full bg-muted cursor-pointer",
            !src && "opacity-40 cursor-not-allowed",
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

      {!src && (
        <div className="px-3 pb-2 text-[10px] text-muted-foreground flex items-center gap-1">
          <SkipForward className="w-3 h-3" />
          {compact ? "Loading…" : "Loading track from Iroh…"}
        </div>
      )}
    </div>
  );
}
