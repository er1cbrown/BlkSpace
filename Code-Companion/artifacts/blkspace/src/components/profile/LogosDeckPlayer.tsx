import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Disc3, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { tracksByIds } from "@/lib/logos-deck-library";
import { isTauri, tauriGetBlobBytes } from "@/lib/tauri-api";
import { getSessionToken } from "@/lib/auth";

interface LogosDeckPlayerProps {
  setTitle?: string;
  audioHash?: string | null;
  trackIds?: string[];
  readOnly?: boolean;
  className?: string;
}

/**
 * Profile card for a Logos Deck set. Mixing happens on /logosdecks.
 * A desktop blob can play here. Hot cues do not.
 */
export function LogosDeckPlayer({
  setTitle = "Logos Deck",
  audioHash,
  trackIds = [],
  readOnly = false,
  className,
}: LogosDeckPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const crate = trackIds.length > 0 ? tracksByIds(trackIds) : [];

  useEffect(() => {
    if (!isTauri() || !audioHash) {
      setAudioSrc(null);
      return;
    }
    const token = getSessionToken();
    if (!token) return;
    tauriGetBlobBytes(token, audioHash)
      .then((b64) => {
        if (b64) setAudioSrc(`data:audio/mpeg;base64,${b64}`);
      })
      .catch(() => setAudioSrc(null));
  }, [audioHash]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || !audioSrc) return;
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  };

  return (
    <Card
      className={cn(
        "border-fuchsia-500/30 bg-gradient-to-br from-purple-950/40 via-background to-background overflow-hidden",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Disc3 className="w-5 h-5 text-fuchsia-400" />
          {setTitle}
          <Badge variant="outline" className="text-[10px] font-normal ml-auto">
            Logos Deck
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {readOnly
            ? "This set opens on LogosDecks."
            : "Showcase this set on LogosDecks. A track or a reading can take a deck. The flow score decides the set."}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {audioSrc && (
          <>
            <audio
              ref={audioRef}
              src={audioSrc}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            <Button size="sm" className="rounded-full" onClick={togglePlay}>
              {playing ? (
                <Pause className="w-4 h-4 mr-1" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              {playing ? "Pause this file" : "Play this file"}
            </Button>
          </>
        )}
        {crate.length > 0 && (
          <ul className="max-h-36 overflow-y-auto space-y-2 pr-1">
            {crate.map((track) => (
              <li key={track.id} className="text-xs">
                <p className="font-medium">{track.reference}</p>
                <p className="text-muted-foreground">{track.text}</p>
              </li>
            ))}
          </ul>
        )}
        <Link href="/logosdecks">
          <Button size="sm" variant="outline">
            Open LogosDecks
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
