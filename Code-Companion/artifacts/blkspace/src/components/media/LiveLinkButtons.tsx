import { ExternalLink, Radio, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSafeHttpUrl, parseAmalgamationMeta } from "@/lib/amalgamation-meta";

/** Surface live / external-play links from description meta tags. */
export function LiveLinkButtons({
  description,
  className,
}: {
  description?: string | null;
  className?: string;
}) {
  const { liveUrl, playUrl } = parseAmalgamationMeta(description);
  if (!liveUrl && !playUrl) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className || ""}`}>
      {liveUrl && isSafeHttpUrl(liveUrl) && (
        <Button size="sm" variant="default" className="gap-1.5" asChild>
          <a href={liveUrl} target="_blank" rel="noopener noreferrer">
            <Radio className="w-3.5 h-3.5" />
            Watch live
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </Button>
      )}
      {playUrl && isSafeHttpUrl(playUrl) && (
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <a href={playUrl} target="_blank" rel="noopener noreferrer">
            <Swords className="w-3.5 h-3.5" />
            Play / board
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </Button>
      )}
    </div>
  );
}

export function CleanDescription({
  description,
  className,
}: {
  description?: string | null;
  className?: string;
}) {
  const { text } = parseAmalgamationMeta(description);
  if (!text) return null;
  return <p className={className}>{text}</p>;
}
