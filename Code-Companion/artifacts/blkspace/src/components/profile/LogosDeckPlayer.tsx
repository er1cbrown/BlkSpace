import { useEffect, useRef, useState } from "react";
import {
  Disc3,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  BookOpen,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  LOGOS_DECK_DEMO_CRATE,
  crossRefsFor,
  tracksByIds,
  type LogosDeckTrack,
} from "@/lib/logos-deck-library";
import { isTauri, tauriGetBlobBytes } from "@/lib/tauri-api";
import { getSessionToken } from "@/lib/auth";
import { toast } from "sonner";

interface LogosDeckPlayerProps {
  setTitle?: string;
  audioHash?: string | null;
  trackIds?: string[];
  readOnly?: boolean;
  className?: string;
}

type DeckSide = "a" | "b";

export function LogosDeckPlayer({
  setTitle = "Logos Deck",
  audioHash,
  trackIds = [],
  readOnly = false,
  className,
}: LogosDeckPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [deckA, setDeckA] = useState<LogosDeckTrack>(LOGOS_DECK_DEMO_CRATE[0]);
  const [deckB, setDeckB] = useState<LogosDeckTrack>(LOGOS_DECK_DEMO_CRATE[2]);
  const [activeDeck, setActiveDeck] = useState<DeckSide>("a");
  const [playing, setPlaying] = useState(false);
  const [loopRoll, setLoopRoll] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [syncRefs, setSyncRefs] = useState<LogosDeckTrack[]>([]);

  const crate =
    trackIds.length > 0
      ? tracksByIds(trackIds)
      : LOGOS_DECK_DEMO_CRATE;

  const activeTrack = activeDeck === "a" ? deckA : deckB;

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

  useEffect(() => {
    setSyncRefs(crossRefsFor(activeTrack).slice(0, 3));
  }, [activeTrack]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [audioSrc]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (el && audioSrc) {
      if (el.paused) el.play().catch(() => {});
      else el.pause();
      return;
    }
    setPlaying((p) => !p);
  };

  const loadToDeck = (track: LogosDeckTrack, side: DeckSide) => {
    if (side === "a") setDeckA(track);
    else setDeckB(track);
    setActiveDeck(side);
  };

  const hotCues = [
    "Speaker",
    "Audience",
    "Promise",
    "Command",
    "Echo OT",
    "Gospel turn",
    "Law lens",
    "Grace lens",
  ];

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
          Scripture as DJ library — Hermeneutical Sync suggests cross-references
          as you load verses.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {audioSrc && <audio ref={audioRef} src={audioSrc} loop={loopRoll} />}

        <div className="grid md:grid-cols-2 gap-3">
          {(["a", "b"] as const).map((side) => {
            const track = side === "a" ? deckA : deckB;
            const isActive = activeDeck === side;
            return (
              <div
                key={side}
                className={cn(
                  "rounded-xl border p-3 transition-all cursor-pointer",
                  isActive
                    ? "border-fuchsia-500/60 bg-fuchsia-500/10 ring-1 ring-fuchsia-500/30"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40",
                )}
                onClick={() => setActiveDeck(side)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-fuchsia-400/90">
                    Deck {side.toUpperCase()}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {track.spm} SPM
                  </Badge>
                </div>
                <div className="font-semibold text-sm">{track.reference}</div>
                <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {track.text}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="outline" className="text-[9px]">
                    {track.genre}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">
                    {track.theologicalKey}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="rounded-full" onClick={togglePlay}>
            {playing ? (
              <Pause className="w-4 h-4 mr-1" />
            ) : (
              <Play className="w-4 h-4 mr-1" />
            )}
            {playing ? "Pause" : audioSrc ? "Play mix" : "Cue verse"}
          </Button>
          <Button
            size="sm"
            variant={loopRoll ? "default" : "outline"}
            onClick={() => setLoopRoll((v) => !v)}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Loop roll
          </Button>
          {!readOnly && (
            <span className="text-[10px] text-muted-foreground">
              {audioHash ? "Iroh audio on Deck A" : "Demo crate — upload via Yard Sale"}
            </span>
          )}
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Hermeneutical Sync
          </div>
          <div className="flex flex-wrap gap-2">
            {syncRefs.map((ref) => (
              <Button
                key={ref.id}
                size="sm"
                variant="outline"
                className="text-xs h-8"
                onClick={() => loadToDeck(ref, activeDeck === "a" ? "b" : "a")}
              >
                {ref.reference}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Hot cues
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {hotCues.map((label, i) => (
              <button
                key={label}
                type="button"
                className="text-[9px] py-2 px-1 rounded-md bg-muted/50 hover:bg-fuchsia-500/20 border border-border/50 transition-colors"
                onClick={() =>
                  toast.message(`${label} @ ${activeTrack.reference}`)
                }
              >
                {i + 1}. {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Crate
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {crate.map((track) => (
              <button
                key={track.id}
                type="button"
                className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-muted/60 flex justify-between gap-2"
                onClick={() => loadToDeck(track, activeDeck)}
              >
                <span className="font-medium truncate">{track.reference}</span>
                <span className="text-muted-foreground shrink-0">
                  {track.author}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t">
          <Volume2 className="w-3 h-3" />
          Filter: covenantal lens · Reverb: canonical echo (NT → OT)
        </div>
      </CardContent>
    </Card>
  );
}