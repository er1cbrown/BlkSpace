import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Link } from "wouter";
import { Disc3, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSafeHttpUrl } from "@/lib/amalgamation-meta";
import {
  getMixtape,
  listMixtapes,
  syncMixtapes,
  type AudioMixtape,
} from "@/lib/audio-mixtapes";
import {
  breakChain,
  closeSet,
  emptyFight,
  readFight,
  runItBack,
  scoreLead,
  strikeFlow,
  writeFight,
  type FlowFight,
} from "@/lib/logos-deck-aura";
import {
  bookLoad,
  BOOK_TRADITIONS,
  canShapeAudio,
  crossfaderVolumes,
  cuesFromMixtape,
  hotCueSeconds,
  HOT_CUE_COUNT,
  lensEffect,
  LENS_NAMES,
  logosDeckBattlePath,
  scriptureLoads,
  type DeckLoad,
  type LensEffect,
  type LensName,
} from "@/lib/logos-deck-mix";
import { webGetBlobAsync } from "@/lib/media-web-store";
import { battleCallUrl, listBattles, syncBattles } from "@/lib/yard-dj-battles";
import { cn } from "@/lib/utils";

interface DeckApi {
  play: () => void;
  pause: () => void;
  cue: () => void;
  seek: (index: number) => void;
  seekTime: (seconds: number) => void;
}

interface LensGraph {
  ctx: AudioContext;
  apply: (effect: LensEffect) => void;
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  return `${minutes}:${remain.toString().padStart(2, "0")}`;
}

function connectLens(el: HTMLAudioElement): LensGraph {
  const ctx = new AudioContext();
  const source = ctx.createMediaElementSource(el);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  const delay = ctx.createDelay(1);
  const feedback = ctx.createGain();
  const wet = ctx.createGain();
  const dry = ctx.createGain();
  source.connect(filter);
  filter.connect(dry);
  filter.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  dry.connect(ctx.destination);
  wet.connect(ctx.destination);
  return {
    ctx,
    apply(effect) {
      filter.frequency.value = effect.lowpassHz ?? 20000;
      filter.Q.value = 0.7;
      delay.delayTime.value = effect.delaySec;
      feedback.gain.value = effect.feedback;
      wet.gain.value = effect.wet;
      dry.gain.value = effect.wet > 0 ? 0.85 : 1;
    },
  };
}

function useResolvedSrc(load: DeckLoad | null): {
  src: string | null;
  missing: boolean;
} {
  const [src, setSrc] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let cancel = false;
    if (!load?.playable) {
      setSrc(null);
      setMissing(false);
      return;
    }
    const raw = load.src.trim();
    if (!raw) {
      setSrc(null);
      setMissing(true);
      return;
    }
    if (
      isSafeHttpUrl(raw) ||
      raw.startsWith("data:") ||
      raw.startsWith("blob:")
    ) {
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
  }, [load]);
  return { src, missing };
}

function DeckEngine({
  src,
  volume,
  loop,
  lens,
  apiRef,
  onFrame,
  onPlaying,
}: {
  src: string;
  volume: number;
  loop: boolean;
  lens: LensName;
  apiRef: MutableRefObject<DeckApi>;
  onFrame: (position: number, duration: number) => void;
  onPlaying: (playing: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const graphRef = useRef<LensGraph | null>(null);
  const onFrameRef = useRef(onFrame);
  const onPlayingRef = useRef(onPlaying);
  onFrameRef.current = onFrame;
  onPlayingRef.current = onPlaying;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = Math.min(1, Math.max(0, volume));
    el.loop = loop;
  }, [volume, loop, src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !canShapeAudio(src)) return;
    if (lens === "flat" && !graphRef.current) return;
    if (!graphRef.current) graphRef.current = connectLens(el);
    graphRef.current.apply(lensEffect(lens));
    void graphRef.current.ctx.resume();
  }, [lens, src]);

  useEffect(() => {
    return () => {
      const graph = graphRef.current;
      graphRef.current = null;
      void graph?.ctx.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    apiRef.current = {
      play() {
        const el = audioRef.current;
        if (!el) return;
        const pending = el.play();
        if (pending && typeof pending.catch === "function") {
          void pending.catch(() => onPlayingRef.current(false));
        }
      },
      pause() {
        audioRef.current?.pause();
      },
      cue() {
        const el = audioRef.current;
        if (!el) return;
        el.pause();
        el.currentTime = 0;
        onFrameRef.current(0, el.duration || 0);
      },
      seek(index: number) {
        const el = audioRef.current;
        if (!el || !Number.isFinite(el.duration) || el.duration <= 0) {
          onFrameRef.current(0, 0);
          return;
        }
        el.currentTime = hotCueSeconds(el.duration, index);
        onFrameRef.current(el.currentTime, el.duration);
      },
      seekTime(seconds: number) {
        const el = audioRef.current;
        if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
        el.currentTime = Math.min(el.duration, Math.max(0, seconds));
        onFrameRef.current(el.currentTime, el.duration);
      },
    };
  }, [apiRef]);

  return (
    <audio
      ref={audioRef}
      src={src}
      preload="metadata"
      onPlay={() => onPlayingRef.current(true)}
      onPause={() => onPlayingRef.current(false)}
      onTimeUpdate={(event) => {
        const el = event.currentTarget;
        onFrameRef.current(el.currentTime || 0, el.duration || 0);
      }}
      onLoadedMetadata={(event) => {
        const el = event.currentTarget;
        onFrameRef.current(el.currentTime || 0, el.duration || 0);
      }}
    />
  );
}

function DeckChannel({
  side,
  load,
  volume,
  onReady,
  onPlaying,
}: {
  side: "a" | "b";
  load: DeckLoad | null;
  volume: number;
  onReady: (api: DeckApi | null) => void;
  onPlaying: (playing: boolean) => void;
}) {
  const { src, missing } = useResolvedSrc(load);
  const apiRef = useRef<DeckApi>({
    play() {},
    pause() {},
    cue() {},
    seek() {},
    seekTime() {},
  });
  const [lens, setLens] = useState<LensName>("flat");
  const [loop, setLoop] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState("");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const mode = canShapeAudio(src) ? "local" : "direct";
  const onReadyRef = useRef(onReady);
  const onPlayingRef = useRef(onPlaying);
  onReadyRef.current = onReady;
  onPlayingRef.current = onPlaying;

  useEffect(() => {
    onPlayingRef.current(playing);
  }, [playing]);

  useEffect(() => {
    setLens("flat");
    setLoop(false);
    setPlaying(false);
    setNote("");
    setPosition(0);
    setDuration(0);
  }, [load?.id]);

  useEffect(() => {
    const api: DeckApi = {
      play: () => apiRef.current.play(),
      pause: () => apiRef.current.pause(),
      cue: () => apiRef.current.cue(),
      seek: (index) => apiRef.current.seek(index),
      seekTime: (seconds) => apiRef.current.seekTime(seconds),
    };
    onReadyRef.current(api);
    return () => onReadyRef.current(null);
  }, [src]);

  const onFrame = useCallback((next: number, length: number) => {
    setPosition(next);
    if (Number.isFinite(length) && length > 0) setDuration(length);
  }, []);

  const chooseLens = (value: string) => {
    const next = lensEffect(value);
    if (next.name !== "flat" && !canShapeAudio(src)) {
      setLens("flat");
      setNote("Filter and echo stay off so this file keeps playing.");
      return;
    }
    setLens(next.name);
    setNote(next.caption);
  };

  const hot = (index: number) => {
    if (!src) return;
    if (!duration) {
      setNote("This file has not reported its length yet.");
      return;
    }
    apiRef.current.seek(index);
    setNote(`Cue ${index + 1} at ${clock(hotCueSeconds(duration, index))}.`);
  };

  return (
    <Card
      className={cn(
        side === "a" ? "border-fuchsia-500/40" : "border-sky-500/40",
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Disc3 className="w-4 h-4" />
          Deck {side.toUpperCase()}
          <span className="ml-auto text-[10px] font-normal text-muted-foreground">
            {Math.round(volume * 100)}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!load && (
          <p className="text-sm text-muted-foreground">
            Load a track or a book.
          </p>
        )}
        {load && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-fuchsia-400/90">
              {load.lane === "book" ? `${load.tradition} reading` : "Track"}
            </p>
            <p className="text-sm font-medium">{load.title}</p>
            <p className="text-xs text-muted-foreground">
              {load.lane === "book" ? load.tradition : load.source}
              {load.authorHandle ? ` · @${load.authorHandle}` : ""}
              {load.passage && load.passage !== load.title
                ? ` · ${load.passage}`
                : ""}
            </p>
          </div>
        )}
        {load && !load.playable && (
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <p className="text-sm">{load.text}</p>
            <p className="text-[11px] text-muted-foreground">
              This reading is the book on the deck. It streams as audio when a
              hosted file is loaded.
            </p>
          </div>
        )}
        {missing && (
          <p className="text-xs text-muted-foreground">
            That audio is not on this device.
          </p>
        )}
        {src && (
          <DeckEngine
            key={mode}
            src={src}
            volume={volume}
            loop={loop}
            lens={lens}
            apiRef={apiRef}
            onFrame={onFrame}
            onPlaying={setPlaying}
          />
        )}
        {load?.playable && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!src}
                onClick={() =>
                  playing ? apiRef.current.pause() : apiRef.current.play()
                }
              >
                {playing ? (
                  <Pause className="w-4 h-4 mr-1" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                {playing ? "Pause" : "Play"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!src}
                onClick={() => {
                  apiRef.current.cue();
                  setPlaying(false);
                  setPosition(0);
                }}
              >
                Cue
              </Button>
              <Button
                type="button"
                size="sm"
                variant={loop ? "default" : "outline"}
                disabled={!src}
                onClick={() => setLoop((value) => !value)}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Loop
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {clock(position)} / {clock(duration)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={duration ? Math.min(position, duration) : 0}
              aria-label={`Deck ${side.toUpperCase()} position`}
              disabled={!duration}
              className="w-full"
              onChange={(event) => {
                const seconds = Number(event.target.value);
                apiRef.current.seekTime(seconds);
                setPosition(seconds);
              }}
            />
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: HOT_CUE_COUNT }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  className="text-[10px] py-2 rounded-md border border-border/60 bg-muted/40 hover:bg-fuchsia-500/15"
                  onClick={() => hot(index)}
                >
                  Cue {index + 1}
                </button>
              ))}
            </div>
            <label className="block text-[11px] text-muted-foreground">
              Lens
              <select
                aria-label={`Deck ${side.toUpperCase()} lens`}
                value={lens}
                className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm text-foreground"
                onChange={(event) => chooseLens(event.target.value)}
              >
                {LENS_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {note && (
          <p className="text-[11px] text-muted-foreground" role="status">
            {note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadRow({
  cue,
  onA,
  onB,
}: {
  cue: DeckLoad;
  onA: () => void;
  onB: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="min-w-0 flex-1 truncate">
        {cue.title}
        {cue.authorHandle ? ` · @${cue.authorHandle}` : ""}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7"
        aria-label={`Load ${cue.title} on deck A`}
        onClick={onA}
      >
        A
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7"
        aria-label={`Load ${cue.title} on deck B`}
        onClick={onB}
      >
        B
      </Button>
    </div>
  );
}

/**
 * Two decks for records and scripture. A battle query loads the host
 * record on Deck A. Deck B is the member's pick. Voice stays the call link.
 */
export function LogosDeckBoard({
  battleId,
  mixId,
  className,
}: {
  battleId?: string | null;
  mixId?: string | null;
  className?: string;
}) {
  const [tick, setTick] = useState(0);
  const [fader, setFader] = useState(50);
  const [deckA, setDeckA] = useState<DeckLoad | null>(null);
  const [deckB, setDeckB] = useState<DeckLoad | null>(null);
  const [liveA, setLiveA] = useState(false);
  const [liveB, setLiveB] = useState(false);
  const [fight, setFight] = useState<FlowFight>(emptyFight);
  const [lastCall, setLastCall] = useState("");
  const applied = useRef("");
  const decks = useRef<{ a: DeckApi | null; b: DeckApi | null }>({
    a: null,
    b: null,
  });

  useEffect(() => {
    let cancel = false;
    void Promise.all([syncMixtapes(), syncBattles()]).then(() => {
      if (!cancel) setTick((n) => n + 1);
    });
    return () => {
      cancel = true;
    };
  }, []);

  const mixes = useMemo(() => {
    void tick;
    return listMixtapes();
  }, [tick]);
  const battles = useMemo(() => {
    void tick;
    return listBattles();
  }, [tick]);
  const scripture = useMemo(() => scriptureLoads(), []);
  const battle = battles.find((row) => row.id === battleId) || null;
  const volumes = crossfaderVolumes(fader);

  useEffect(() => {
    const token = battleId || (mixId ? `mix:${mixId}` : "");
    if (!token || applied.current === token) return;
    const id = battle?.mixId || mixId || "";
    if (!id) return;
    const mix = getMixtape(id);
    const first = mix ? cuesFromMixtape(mix)[0] : null;
    if (!first) return;
    setDeckA(first);
    applied.current = token;
  }, [battle, battleId, mixId, tick]);

  const onReadyA = useCallback((api: DeckApi | null) => {
    decks.current.a = api;
  }, []);
  const onReadyB = useCallback((api: DeckApi | null) => {
    decks.current.b = api;
  }, []);
  const fightId = battle?.id || "showcase";
  const loadsRef = useRef({ a: deckA, b: deckB });
  const playRef = useRef({ a: liveA, b: liveB, fader });
  loadsRef.current = { a: deckA, b: deckB };
  playRef.current = { a: liveA, b: liveB, fader };
  const seenFight = useRef({ id: "", a: "", b: "" });

  useEffect(() => {
    const aId = deckA?.id || "";
    const bId = deckB?.id || "";
    let next = fight;
    if (seenFight.current.id !== fightId) {
      const saved = readFight(fightId);
      next = saved
        ? {
            a: saved.a,
            b: saved.b,
            closed: saved.closed,
            winner: saved.winner,
          }
        : emptyFight();
      seenFight.current = {
        id: fightId,
        a: saved?.aLoad ?? "",
        b: saved?.bLoad ?? "",
      };
    }
    if (aId && seenFight.current.a && seenFight.current.a !== aId) {
      next = breakChain(next, "a");
    }
    if (bId && seenFight.current.b && seenFight.current.b !== bId) {
      next = breakChain(next, "b");
    }
    if (aId) seenFight.current.a = aId;
    if (bId) seenFight.current.b = bId;
    if (
      next.a.score !== fight.a.score ||
      next.a.combo !== fight.a.combo ||
      next.b.score !== fight.b.score ||
      next.b.combo !== fight.b.combo ||
      next.closed !== fight.closed
    ) {
      writeFight(fightId, next, { a: aId, b: bId });
      setFight(next);
    }
  }, [battle?.id, deckA, deckB, fight, fightId]);

  const judge = (side: "a" | "b") => {
    const loads = loadsRef.current;
    const play = playRef.current;
    const hit = strikeFlow({
      state: fight,
      side,
      load: side === "a" ? loads.a : loads.b,
      playing: side === "a" ? play.a : play.b,
      fader: play.fader,
      now: Date.now(),
    });
    const call =
      hit.judgment === "great"
        ? "Great"
        : hit.judgment === "good"
          ? "Good"
          : "Miss";
    setLastCall(`Deck ${side.toUpperCase()} · ${call}`);
    if (
      hit.state.a.score === fight.a.score &&
      hit.state.a.combo === fight.a.combo &&
      hit.state.b.score === fight.b.score &&
      hit.state.b.combo === fight.b.combo &&
      hit.state.closed === fight.closed
    ) {
      return;
    }
    writeFight(fightId, hit.state, {
      a: loads.a?.id || "",
      b: loads.b?.id || "",
    });
    setFight(hit.state);
  };

  const hostMissing = !!battle && !mixes.some((mix) => mix.id === battle.mixId);

  return (
    <div className={cn("space-y-4", className)}>
      {battle && (
        <Card className="border-fuchsia-500/30">
          <CardContent className="pt-4 space-y-2">
            <p className="text-sm font-medium">{battle.title}</p>
            <p className="text-xs text-muted-foreground">
              Deck A holds {battle.mixTitle} from @{battle.hostHandle}. Answer
              on Deck B with a record or a reading. The flow score decides the
              set. The higher score at the end wins.
            </p>
            {hostMissing && (
              <p className="text-xs text-muted-foreground">
                {battle.mixTitle} is not on this device yet.
              </p>
            )}
            <Button asChild size="sm" variant="outline">
              <a href={battleCallUrl(battle)} target="_blank" rel="noreferrer">
                Join call
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <FlowJudge
        state={fight}
        lastCall={lastCall}
        onStrike={judge}
        onClose={() => {
          const next = closeSet(fight);
          writeFight(fightId, next, {
            a: deckA?.id || "",
            b: deckB?.id || "",
          });
          setFight(next);
        }}
        onReset={() => {
          const next = runItBack();
          writeFight(fightId, next, {
            a: deckA?.id || "",
            b: deckB?.id || "",
          });
          setFight(next);
          setLastCall("");
        }}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <DeckChannel
          side="a"
          load={deckA}
          volume={volumes.a}
          onReady={onReadyA}
          onPlaying={setLiveA}
        />
        <DeckChannel
          side="b"
          load={deckB}
          volume={volumes.b}
          onReady={onReadyB}
          onPlaying={setLiveB}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-muted-foreground flex-1 min-w-[12rem]">
            Crossfader. Left is Deck A. Right is Deck B.
            <input
              type="range"
              min={0}
              max={100}
              value={fader}
              aria-label="Crossfader"
              className="mt-1 w-full"
              onChange={(event) => setFader(Number(event.target.value))}
            />
          </label>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              decks.current.a?.play();
              decks.current.b?.play();
            }}
          >
            Play both
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              decks.current.a?.pause();
              decks.current.b?.pause();
            }}
          >
            Pause both
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Center plays both at the same level. Filter and echo run only on a
          file stored on this device.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Records</h2>
          <p className="text-[11px] text-muted-foreground">
            A track streams the record, under Bermuda Boyz Records or the member
            who released it.
          </p>
          {mixes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Publish a set on Audio. It shows up here.
            </p>
          )}
          {mixes.map((mix) => (
            <RecordCrate key={mix.id} mix={mix} onA={setDeckA} onB={setDeckB} />
          ))}
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Books</h2>
          <p className="text-[11px] text-muted-foreground">
            A book streams a reading the way a track streams a record. The Bible
            shelf is one hosted set. Name a Quran, Buddhist, esoteric, or other
            reading and put it on a deck. The deck does not write the words.
          </p>
          <BookHost onA={setDeckA} onB={setDeckB} />
          {scripture.map((cue) => (
            <LoadRow
              key={cue.id}
              cue={cue}
              onA={() => setDeckA(cue)}
              onB={() => setDeckB(cue)}
            />
          ))}
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Battles</h2>
          {battles.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Host a battle from Arcade. The host set takes Deck A. The answer
              takes Deck B.
            </p>
          )}
          {battles.map((row) => (
            <div key={row.id} className="text-xs space-y-1">
              <Link
                href={logosDeckBattlePath(row.id)}
                className="font-medium underline"
              >
                {row.title}
              </Link>
              <p className="text-muted-foreground">
                @{row.hostHandle} · {row.mixTitle}
              </p>
            </div>
          ))}
          <Link href="/arcade" className="text-xs underline">
            Arcade lobby
          </Link>
        </section>
      </div>
    </div>
  );
}

function FlowColumn({ side, row }: { side: "A" | "B"; row: FlowFight["a"] }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Deck {side}</p>
        <p className="text-lg font-semibold" aria-label={`Deck ${side} combo`}>
          {row.combo}x
        </p>
      </div>
      <p
        className="text-xs text-muted-foreground"
        aria-label={`Deck ${side} score`}
      >
        {row.score}
      </p>
      <div
        role="meter"
        aria-label={`Deck ${side} flow`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={row.flow}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full",
            side === "A" ? "bg-fuchsia-500" : "bg-sky-500",
          )}
          style={{ width: `${row.flow}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">best {row.bestCombo}x</p>
    </div>
  );
}

function FlowJudge({
  state,
  lastCall,
  onStrike,
  onClose,
  onReset,
}: {
  state: FlowFight;
  lastCall: string;
  onStrike: (side: "a" | "b") => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const lead = scoreLead(state);
  const leadLine = state.closed
    ? lead === "even"
      ? "The set is a draw."
      : `Deck ${lead.toUpperCase()} wins the set.`
    : lead === "even"
      ? "The scores are even."
      : `Deck ${lead.toUpperCase()} is ahead.`;

  return (
    <Card className="border-fuchsia-500/30">
      <CardContent className="pt-4 space-y-3">
        <p className="text-sm font-medium">Flow judge</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FlowColumn side="A" row={state.a} />
          <FlowColumn side="B" row={state.b} />
        </div>
        <p className="text-sm">{leadLine}</p>
        {lastCall && (
          <p className="text-xs text-muted-foreground" role="status">
            {lastCall}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={state.closed}
            onClick={() => onStrike("a")}
          >
            Strike A
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={state.closed}
            onClick={() => onStrike("b")}
          >
            Strike B
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={state.closed}
            onClick={onClose}
          >
            Close the set
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onReset}>
            Run it back
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          A hit while the showcase is live adds to the combo. The flow meter
          rises with that chain, and a full meter doubles the hit. A name, a
          silent track, or a gap longer than 4 seconds breaks the chain. In
          front of the crossfader the hit counts as great. The higher score when
          the set closes wins. Tradition does not change the score.
        </p>
      </CardContent>
    </Card>
  );
}

function BookHost({
  onA,
  onB,
}: {
  onA: (cue: DeckLoad) => void;
  onB: (cue: DeckLoad) => void;
}) {
  const [tradition, setTradition] = useState<string>(BOOK_TRADITIONS[0]);
  const [custom, setCustom] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [swordModule, setSwordModule] = useState("KJV");

  const place = (side: "a" | "b") => {
    try {
      const name = tradition === "Other" ? custom : tradition;
      const cue = bookLoad({ tradition: name, title, text });
      if (side === "a") onA(cue);
      else onB(cue);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Name the reading.");
    }
  };

  const readSword = async () => {
    const ref = title.trim();
    if (!ref) {
      setError("Name the verse, like John 3:16.");
      return;
    }
    const params = new URLSearchParams({ module: swordModule, ref });
    try {
      const res = await fetch(`/api/logos/sword?${params}`);
      const body = await res.json().catch(() => null);
      const verse = body?.verses?.find((row: { text?: string }) =>
        row?.text?.trim(),
      );
      if (!res.ok || !body?.ok || !verse?.text) {
        setError(body?.error || "SWORD library is not on this host.");
        return;
      }
      setText(verse.text);
      if (verse.reference) setTitle(verse.reference);
      setError("");
    } catch {
      setError("SWORD library is not on this host.");
    }
  };

  return (
    <div className="space-y-2 rounded-md border p-2">
      <label className="block text-[11px] text-muted-foreground">
        Tradition
        <select
          aria-label="Tradition"
          value={tradition}
          className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm text-foreground"
          onChange={(event) => setTradition(event.target.value)}
        >
          {BOOK_TRADITIONS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {tradition === "Other" && (
        <input
          aria-label="Tradition name"
          value={custom}
          placeholder="Name the tradition"
          className="h-8 w-full rounded-md border bg-background px-2 text-sm"
          onChange={(event) => setCustom(event.target.value)}
        />
      )}
      <input
        aria-label="Reading title"
        value={title}
        placeholder="Reading name"
        className="h-8 w-full rounded-md border bg-background px-2 text-sm"
        onChange={(event) => setTitle(event.target.value)}
      />
      <textarea
        aria-label="Hosted reading"
        value={text}
        placeholder="Words you host. Leave empty to hold the name."
        className="min-h-16 w-full rounded-md border bg-background px-2 py-1 text-sm"
        onChange={(event) => setText(event.target.value)}
      />
      {tradition === "Bible" && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="SWORD module"
            value={swordModule}
            className="h-8 rounded-md border bg-background px-2 text-sm"
            onChange={(event) => setSwordModule(event.target.value)}
          >
            {["KJV", "GNT", "RVG", "SpaRV"].map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void readSword()}
          >
            Read from SWORD
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => place("a")}
        >
          Book on A
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => place("b")}
        >
          Book on B
        </Button>
      </div>
      {error && <p className="text-[11px] text-muted-foreground">{error}</p>}
    </div>
  );
}

function RecordCrate({
  mix,
  onA,
  onB,
}: {
  mix: AudioMixtape;
  onA: (cue: DeckLoad) => void;
  onB: (cue: DeckLoad) => void;
}) {
  const cues = cuesFromMixtape(mix);
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground">{mix.title}</p>
      {cues.map((cue) => (
        <LoadRow
          key={cue.id}
          cue={cue}
          onA={() => onA(cue)}
          onB={() => onB(cue)}
        />
      ))}
    </div>
  );
}
