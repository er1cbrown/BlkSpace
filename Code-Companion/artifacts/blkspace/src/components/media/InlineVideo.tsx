import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  claimInlineVideo,
  inlineSoundOn,
  releaseInlineVideo,
  setInlineSound,
  shouldInlinePlay,
  streamPlayerSrc,
  subscribeInlineSound,
  type InlinePlayback,
} from "@/lib/inline-video";
import { cn } from "@/lib/utils";

/**
 * Plays inside the post. The timeline starts muted when the card is on screen.
 * A profile tile stays a still. A watch page plays the card that is snapped open.
 */
export function InlineVideo({
  src,
  title,
  mode = "inline",
  active = false,
  stream = false,
}: {
  src: string;
  title: string;
  mode?: InlinePlayback;
  active?: boolean;
  stream?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const sound = useSyncExternalStore(subscribeInlineSound, inlineSoundOn, () => false);
  const shouldPlay = shouldInlinePlay({
    mode,
    visible: visible || opened,
    active,
  });

  useEffect(() => {
    if (mode !== "inline") return;
    const frame = frameRef.current;
    if (!frame || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const onScreen = entry.isIntersecting && entry.intersectionRatio >= 0.6;
        setVisible(onScreen);
        if (!onScreen) setOpened(false);
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || stream) return;
    if (!shouldPlay) {
      const stop = () => video.pause();
      video.pause();
      video.addEventListener("play", stop);
      return () => video.removeEventListener("play", stop);
    }
    video.muted = !sound;
    video.loop = video.duration > 0 && video.duration <= 90;
    const start = async () => {
      try {
        await video.play();
      } catch {
        video.muted = true;
        await video.play().catch(() => undefined);
      }
    };
    void start();
    return undefined;
  }, [shouldPlay, sound, stream, src]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) releaseInlineVideo(video);
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className={cn(
        "relative overflow-hidden bg-black",
        mode === "poster" ? "h-full w-full pointer-events-none" : "rounded-xl",
      )}
    >
      {stream ? (
        shouldPlay ? (
          <iframe
            title={title}
            src={streamPlayerSrc(src, sound)}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            className="aspect-video w-full bg-black"
          />
        ) : (
          <div
            className={cn(
              "flex w-full items-center justify-center",
              mode === "poster" ? "h-full" : "aspect-video",
            )}
          >
            {mode === "poster" ? (
              <Play className="h-10 w-10 text-white" aria-hidden />
            ) : (
              <button
                type="button"
                className="flex h-full w-full items-center justify-center"
                aria-label={`Play ${title}`}
                onClick={() => setOpened(true)}
              >
                <Play className="h-10 w-10 text-white" />
              </button>
            )}
          </div>
        )
      ) : (
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="metadata"
          muted={!sound}
          aria-label={title}
          className={cn(
            "w-full bg-black",
            mode === "poster"
              ? "h-full object-cover"
              : "aspect-video max-h-[min(28rem,70vh)] cursor-pointer object-contain",
          )}
          onPlay={() => {
            const video = videoRef.current;
            if (video) claimInlineVideo(video);
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (!video.duration) return;
            setProgress(video.currentTime / video.duration);
          }}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            video.loop = video.duration > 0 && video.duration <= 90;
          }}
          onError={() => setFailed(true)}
          onClick={() => {
            const video = videoRef.current;
            if (!video || mode === "poster") return;
            if (video.paused) {
              setOpened(true);
              void video.play().catch(() => undefined);
            } else {
              video.pause();
            }
          }}
        />
      )}
      {mode !== "poster" && (
        <>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-black/55 text-white hover:bg-black/70 hover:text-white"
            aria-label={sound ? "Mute" : "Sound on"}
            aria-pressed={sound}
            onClick={(event) => {
              event.stopPropagation();
              setInlineSound(!sound);
            }}
          >
            {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          {!stream && !playing && (
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center"
              aria-label={`Play ${title}`}
              onClick={() => {
                setOpened(true);
                const video = videoRef.current;
                if (video) void video.play().catch(() => undefined);
              }}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55">
                <Play className="h-6 w-6 text-white" />
              </span>
            </button>
          )}
          {!stream && playing && (
            <button
              type="button"
              className="absolute bottom-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/55"
              aria-label="Pause"
              onClick={() => videoRef.current?.pause()}
            >
              <Pause className="h-4 w-4 text-white" />
            </button>
          )}
          {!stream && (
            <div className="absolute bottom-0 left-0 right-0 z-10 h-1 bg-white/20">
              <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </>
      )}
      {failed && (
        <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white">
          This clip did not load.
        </p>
      )}
    </div>
  );
}
