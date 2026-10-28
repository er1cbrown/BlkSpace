import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { livePlayerFor } from "@/lib/live-stream";

/**
 * Plays a yard stage inside the room. YouTube and Twitch use their players.
 * A direct file uses the video element. Other allowed links open in a tab.
 */
export function LiveStreamPlayer({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const pageHost = typeof window === "undefined" ? "localhost" : window.location.hostname;
  const model = livePlayerFor(url, pageHost);

  if (model.mode === "refuse") {
    return (
      <p className="p-6 text-sm text-muted-foreground text-center">{model.reason}</p>
    );
  }

  if (model.mode === "link") {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          This stage opens in its own tab. BlkSpace does not host that call.
        </p>
        <Button asChild>
          <a href={model.href} target="_blank" rel="noopener noreferrer">
            Open stage
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </div>
    );
  }

  if (model.mode === "file") {
    return (
      <video
        key={model.src}
        src={model.src}
        controls
        playsInline
        preload="metadata"
        className="w-full h-[min(70vh,520px)] bg-black"
        aria-label={title}
      />
    );
  }

  return (
    <iframe
      title={title}
      src={model.embedUrl}
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="w-full h-[min(70vh,520px)] bg-black"
    />
  );
}
