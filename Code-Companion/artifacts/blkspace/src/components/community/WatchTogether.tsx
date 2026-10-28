import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentHandle } from "@/lib/auth";
import {
  followPosition,
  pushWatchClock,
  readWatchClock,
} from "@/lib/watch-together";
import { parseWatchSource } from "@/lib/yard-room-watch";
import type { YardLiveRoom } from "@/lib/yard-live-rooms";

/**
 * One library file, one clock. The person who opened the room is the host.
 * Joiners follow that playhead. Bytes stay on the library.
 */
export function WatchTogether({ room }: { room: YardLiveRoom }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [note, setNote] = useState("");
  const me = getCurrentHandle();
  const host = room.createdBy === me;
  const parsed = parseWatchSource(room.externalUrl || "", { stored: true });
  const ticket = parsed.ok ? parsed.ticket : null;
  const playUrl = ticket?.playUrl || "";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playUrl || host) return;
    let stop = false;
    const follow = async () => {
      const clock = await readWatchClock(room.id);
      if (stop || !clock || !videoRef.current) return;
      const target = followPosition(clock, Date.now()) / 1000;
      if (Math.abs(videoRef.current.currentTime - target) > 1.5) {
        videoRef.current.currentTime = target;
      }
      if (clock.playing && videoRef.current.paused) {
        void videoRef.current.play().catch(() => {
          setNote("Press play to follow the host. This browser blocked autoplay.");
        });
      }
      if (!clock.playing && !videoRef.current.paused) videoRef.current.pause();
    };
    void follow();
    const timer = window.setInterval(() => void follow(), 2000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [host, playUrl, room.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playUrl || !host) return;
    const send = () => {
      void pushWatchClock(
        room.id,
        Math.round(video.currentTime * 1000),
        !video.paused,
      ).catch(() => {
        setNote("The clock stays on this device until the room is on the yard.");
      });
    };
    video.addEventListener("play", send);
    video.addEventListener("pause", send);
    video.addEventListener("seeked", send);
    const timer = window.setInterval(() => {
      if (!video.paused) send();
    }, 2000);
    return () => {
      video.removeEventListener("play", send);
      video.removeEventListener("pause", send);
      video.removeEventListener("seeked", send);
      window.clearInterval(timer);
    };
  }, [host, playUrl, room.id]);

  if (!parsed.ok) {
    return (
      <p className="p-6 text-sm text-muted-foreground text-center">{parsed.reason}</p>
    );
  }

  return (
    <div className="space-y-2">
      {playUrl ? (
        <video
          ref={videoRef}
          key={playUrl}
          src={playUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full h-[min(70vh,520px)] bg-black"
          aria-label={room.title}
        />
      ) : (
        <div className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {ticket?.kind === "syncplay"
              ? "Syncplay keeps the clock. This room does not pull the file."
              : ticket?.kind === "iroh"
                ? "The Full pin holds this file. This yard does not fetch it."
                : "Open the library item. A direct mp4, webm, or ogg file plays here together."}
          </p>
          {ticket?.syncplayUrl && (
            <Button asChild>
              <a href={ticket.syncplayUrl} target="_blank" rel="noopener noreferrer">
                Open Syncplay
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          )}
          {ticket?.origin && ticket.itemId && (
            <Button asChild variant="outline">
              <a
                href={`${ticket.origin}/web/index.html#!/details?id=${encodeURIComponent(ticket.itemId)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open library item
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          )}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground px-3">
        {host ? "You are the host. Joiners follow your playhead." : `Following @${room.createdBy}.`}
        {note ? ` ${note}` : ""}
      </p>
    </div>
  );
}
