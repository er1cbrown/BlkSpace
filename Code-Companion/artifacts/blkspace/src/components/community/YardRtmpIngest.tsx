import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentHandle } from "@/lib/auth";
import {
  endYardRtmp,
  listYardRtmp,
  startYardRtmp,
  type YardRtmpSession,
} from "@/lib/yard-rtmp";

function HlsVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let dead = false;
    void import("hls.js").then((mod) => {
      if (dead) return;
      const Hls = mod.default;
      if (Hls.isSupported()) {
        const hls = new Hls({ liveSyncDurationCount: 2 });
        playerRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => undefined);
        });
        return;
      }
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        void video.play().catch(() => undefined);
      }
    });
    return () => {
      dead = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="aspect-video w-full rounded-md bg-black"
      controls
      playsInline
    />
  );
}

function Playback({ src }: { src: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const res = await fetch(src, { cache: "no-store" });
      if (!stop && res.ok) setReady(true);
    };
    const timer = window.setInterval(() => {
      void tick();
    }, 1000);
    void tick();
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [src]);

  if (!ready) {
    return (
      <p className="text-xs text-muted-foreground">
        Waiting for OBS to publish.
      </p>
    );
  }
  return <HlsVideo src={src} />;
}

/**
 * OBS on this PC publishes RTMP. ffmpeg writes HLS and this yard plays it.
 * The camera path stays in the browser.
 */
export function YardRtmpIngest({ yardId }: { yardId: string }) {
  const { data: sessions = [], refetch } = useQuery({
    queryKey: ["yard", "rtmp", yardId],
    queryFn: () => listYardRtmp(yardId),
    refetchInterval: 3000,
  });
  const [title, setTitle] = useState("");
  const [hosting, setHosting] = useState<YardRtmpSession | null>(null);
  const [watching, setWatching] = useState<string | null>(null);
  const me = getCurrentHandle();

  useEffect(() => {
    if (!hosting) return;
    const id = hosting.id;
    const timer = window.setInterval(() => {
      void fetch(`/api/yards/rtmp?id=${encodeURIComponent(id)}`).then((res) => {
        if (res.status === 404) setHosting(null);
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [hosting]);

  const open = async () => {
    try {
      const session = await startYardRtmp(yardId, title.trim());
      setHosting(session);
      setWatching(session.id);
      void refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not open ingest.",
      );
    }
  };

  const close = async () => {
    if (!hosting) return;
    try {
      await endYardRtmp(hosting.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not end ingest.");
    }
    setHosting(null);
    setWatching(null);
    void refetch();
  };

  const watchingSession =
    sessions.find((session) => session.id === watching) || hosting;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Radio className="w-5 h-5 text-primary" />
          RTMP ingest
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          OBS on the computer running this yard publishes here. People on this
          yard play that publish. The camera path stays in the browser. A
          YouTube or Twitch link stays a link.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hosting && (
          <div className="flex flex-wrap gap-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Homecoming desk"
              className="h-9 max-w-xs"
              aria-label="Ingest title"
            />
            <Button type="button" size="sm" onClick={() => void open()}>
              Open ingest
            </Button>
          </div>
        )}
        {hosting?.streamKey && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">{hosting.title}</p>
            <label className="block text-[11px] text-muted-foreground">
              Server
              <Input
                readOnly
                value={hosting.publishServer}
                className="mt-1 h-8 text-xs"
                aria-label="RTMP server"
              />
            </label>
            <label className="block text-[11px] text-muted-foreground">
              Stream key
              <Input
                readOnly
                value={hosting.streamKey}
                className="mt-1 h-8 text-xs"
                aria-label="Stream key"
              />
            </label>
            <p className="text-[11px] text-muted-foreground">
              Put the server and key in OBS on the computer running this yard.
              The key stays on this screen.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void close()}
            >
              End ingest
            </Button>
          </div>
        )}
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{session.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  @{session.hostHandle}
                </p>
              </div>
              {session.hostHandle === me && hosting?.id === session.id ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void close()}
                >
                  End ingest
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setWatching(session.id)}
                >
                  Watch
                </Button>
              )}
            </div>
          ))}
        </div>
        {watchingSession && <Playback src={watchingSession.playbackPath} />}
      </CardContent>
    </Card>
  );
}
