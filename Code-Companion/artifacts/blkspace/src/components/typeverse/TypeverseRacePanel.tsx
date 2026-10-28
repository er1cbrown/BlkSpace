import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RacerSprite } from "@/components/typeverse/RacerVehicle";
import { getCurrentHandle } from "@/lib/auth";
import { loadUiPrefs } from "@/lib/ui-prefs";
import {
  correctCount,
  loadCorpus,
  verseRef,
  wordsPerMinute,
  type TypeverseModuleId,
} from "@/lib/typeverse";
import {
  DAILY_RACE_CAP,
  RACER_BODIES,
  RACER_KEY,
  RACER_PAINTS,
  RACE_DIFFICULTIES,
  YARD_RACE_PRIZE,
  cpuChars,
  defaultVehicle,
  difficultySpec,
  judgeCpuFinish,
  normalizeVehicle,
  paintHex,
  pickRaceVerse,
  prizeFor,
  readVehicle,
  trackProgress,
  vehicleLabel,
  type RaceDifficulty,
  type RacerVehicle,
} from "@/lib/typeverse-race";
import {
  createTypeverseRace,
  fetchTypeverseRace,
  finishTypeverseRace,
  joinTypeverseRace,
  listTypeverseRaces,
  reportTypeverseProgress,
  type TypeverseRace,
} from "@/lib/typeverse-races";

type Opponent = "cpu" | "yard";
type Phase = "pick" | "waiting" | "racing" | "result";

function raceId(): string {
  return `race_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Type the verse against a CPU pace or another student on this yard.
 * A clean win pays practice WeixBucks from the yard purse.
 */
export function TypeverseRacePanel({ moduleId }: { moduleId: TypeverseModuleId }) {
  const yardId = loadUiPrefs().homeYardId || "tsu";
  const [vehicle, setVehicle] = useState<RacerVehicle>(() =>
    readVehicle(
      typeof localStorage === "undefined" ? null : localStorage.getItem(RACER_KEY),
    ),
  );
  const [opponent, setOpponent] = useState<Opponent>("cpu");
  const [difficulty, setDifficulty] = useState<RaceDifficulty>("campus");
  const [phase, setPhase] = useState<Phase>("pick");
  const [race, setRace] = useState<TypeverseRace | null>(null);
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState("");
  const [paid, setPaid] = useState<number | null>(null);
  const [lobbies, setLobbies] = useState<TypeverseRace[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closed = useRef(false);

  const saveVehicle = (next: RacerVehicle) => {
    const clean = normalizeVehicle(next);
    setVehicle(clean);
    localStorage.setItem(RACER_KEY, JSON.stringify(clean));
  };

  useEffect(() => {
    if (phase !== "racing" && phase !== "waiting") return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "pick") return;
    let cancel = false;
    void listTypeverseRaces(yardId).then((rows) => {
      if (!cancel) setLobbies(rows);
    });
    return () => {
      cancel = true;
    };
  }, [phase, yardId]);

  useEffect(() => {
    if (!race || (phase !== "waiting" && phase !== "racing") || race.mode !== "yard") {
      return;
    }
    let cancel = false;
    const pull = async () => {
      const next = await fetchTypeverseRace(yardId, race.id);
      if (cancel || !next) return;
      setRace(next);
      if (phase === "waiting" && next.startedAt) setPhase("racing");
      if (next.status === "done" && next.winnerHandle && next.winnerHandle !== me()) {
        setNote(`${next.winnerHandle} finished first.`);
        setPaid(0);
        setPhase("result");
      }
    };
    const id = window.setInterval(() => void pull(), 1500);
    return () => {
      cancel = true;
      window.clearInterval(id);
    };
  }, [race, phase, yardId]);

  const verse = race?.verseText || "";
  const startMs = Date.parse(race?.startedAt || race?.createdAt || "") || now;
  const elapsed = phase === "racing" || phase === "result" ? Math.max(0, now - startMs) : 0;
  const spec = difficultySpec(race?.difficulty || difficulty);
  const correct = verse ? correctCount(typed, verse) : 0;
  const mine = trackProgress(correct, verse.length);
  const cpuPace = trackProgress(cpuChars(elapsed, spec.wpm), verse.length);
  const meHandle = me();
  const rival = race?.entries.find((entry) => entry.handle !== meHandle);
  const rivalProgress =
    race?.mode === "yard"
      ? rival?.finishedAt
        ? 1
        : trackProgress(rival?.progress || 0, verse.length)
      : cpuPace;
  const correctRef = useRef(0);
  correctRef.current = correct;

  function me() {
    return (getCurrentHandle() || "").replace(/^@/, "").toLowerCase();
  }

  async function settle(value: string, fallback: string) {
    if (!race) return;
    if (race.id === "local") {
      const local = judgeCpuFinish({
        typed: value,
        verse: race.verseText,
        elapsedMs: Date.now() - startMs,
        wpm: spec.wpm,
      });
      setPaid(0);
      setNote(`${local.reason} Sign in and join your yard to collect WeixBucks.`);
      setPhase("result");
      return;
    }
    setBusy(true);
    try {
      const result = await finishTypeverseRace({
        raceId: race.id,
        yardId,
        typed: value,
      });
      setPaid(result.paid);
      setNote(
        result.won
          ? result.paid > 0
            ? `${result.reason} ${result.paid} WeixBucks landed on this yard.`
            : `${result.reason} The daily purse of ${DAILY_RACE_CAP} WeixBucks is already used.`
          : result.reason,
      );
      setRace(result.race);
    } catch (err) {
      const local = judgeCpuFinish({
        typed: value,
        verse: race.verseText,
        elapsedMs: Date.now() - startMs,
        wpm: spec.wpm,
      });
      setPaid(0);
      setNote(
        `${err instanceof Error ? err.message : fallback} ${local.reason} WeixBucks stay on the yard desk.`,
      );
    } finally {
      setBusy(false);
      setPhase("result");
    }
  }

  useEffect(() => {
    if (phase !== "racing" || !race || !verse) return;
    if (
      race.mode === "cpu" &&
      cpuPace >= 1 &&
      typed.length < verse.length &&
      !closed.current
    ) {
      closed.current = true;
      void settle(typed, "The CPU finished first.");
    }
  }, [cpuPace, phase, race, typed, verse]);

  useEffect(() => {
    if (phase !== "racing" || !race || race.mode !== "yard") return;
    const id = window.setInterval(() => {
      void reportTypeverseProgress({
        raceId: race.id,
        yardId,
        correct: correctRef.current,
      }).catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(id);
  }, [phase, race, yardId]);

  useEffect(() => {
    if (phase === "racing") inputRef.current?.focus();
  }, [phase, race?.id]);

  const onType = (value: string) => {
    if (phase !== "racing" || !verse || closed.current) return;
    const next = value.length > verse.length ? value.slice(0, verse.length) : value;
    setTyped(next);
    if (next.length === verse.length) {
      closed.current = true;
      void settle(next, "The finish did not reach the yard.");
    }
  };

  const openRace = async (mode: Opponent) => {
    setBusy(true);
    setNote("");
    setPaid(null);
    setTyped("");
    closed.current = false;
    let picked: ReturnType<typeof pickRaceVerse> = null;
    try {
      const verses = await loadCorpus(moduleId);
      picked = pickRaceVerse(verses);
      if (!picked) {
        setNote("No verse in this set is the right length for a race.");
        return;
      }
      const created = await createTypeverseRace({
        id: raceId(),
        yardId,
        mode,
        difficulty: mode === "cpu" ? difficulty : "match",
        verseRef: verseRef(picked),
        verseText: picked.text,
        vehicle,
      });
      setRace(created);
      setPhase(created.startedAt ? "racing" : "waiting");
    } catch (err) {
      if (mode === "cpu" && picked) {
        const nowIso = new Date().toISOString();
        setRace({
          id: "local",
          yardId,
          hostHandle: "",
          mode: "cpu",
          difficulty,
          verseRef: verseRef(picked),
          verseText: picked.text,
          status: "open",
          winnerHandle: "",
          createdAt: nowIso,
          startedAt: nowIso,
          entries: [],
        });
        setPhase("racing");
        setNote(
          "This race stays on this device. Sign in and join your yard to collect WeixBucks.",
        );
        return;
      }
      setNote(
        err instanceof Error
          ? err.message
          : "Sign in and join your yard to open a race.",
      );
    } finally {
      setBusy(false);
    }
  };

  const join = async (lobby: TypeverseRace) => {
    setBusy(true);
    setNote("");
    setPaid(null);
    setTyped("");
    closed.current = false;
    try {
      const joined = await joinTypeverseRace({
        raceId: lobby.id,
        yardId,
        vehicle,
      });
      setRace(joined);
      setPhase(joined.startedAt ? "racing" : "waiting");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not join that race.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    closed.current = false;
    setRace(null);
    setTyped("");
    setPaid(null);
    setNote("");
    setPhase("pick");
  };

  const wpm = wordsPerMinute(correct, elapsed);
  const rivalVehicle = rival?.vehicle || {
    ...defaultVehicle(),
    name: race?.mode === "yard" ? rival?.handle || "Yard" : "CPU",
    paint: "night" as const,
    number: spec.wpm,
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Your racer</p>
            <p className="text-xs text-muted-foreground">{vehicleLabel(vehicle)}</p>
          </div>
          <RacerSprite vehicle={vehicle} progress={0.15} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">Name</span>
            <Input
              value={vehicle.name}
              maxLength={16}
              aria-label="Racer name"
              onChange={(e) => saveVehicle({ ...vehicle, name: e.target.value })}
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">Number</span>
            <Input
              value={String(vehicle.number)}
              inputMode="numeric"
              aria-label="Racer number"
              onChange={(e) =>
                saveVehicle({ ...vehicle, number: Number(e.target.value) || 0 })
              }
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {RACER_BODIES.map((body) => (
            <Button
              key={body.id}
              size="sm"
              variant={vehicle.body === body.id ? "default" : "outline"}
              onClick={() => saveVehicle({ ...vehicle, body: body.id })}
            >
              {body.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Paint">
          {RACER_PAINTS.map((paint) => (
            <button
              key={paint.id}
              type="button"
              aria-label={`${paint.label} paint`}
              aria-pressed={vehicle.paint === paint.id}
              className={`h-7 w-7 rounded-full border ${vehicle.paint === paint.id ? "ring-2 ring-primary" : "border-border"}`}
              style={{ background: paintHex(paint.id) }}
              onClick={() => saveVehicle({ ...vehicle, paint: paint.id })}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Accent">
          {RACER_PAINTS.map((paint) => (
            <button
              key={`accent-${paint.id}`}
              type="button"
              aria-label={`${paint.label} accent`}
              aria-pressed={vehicle.accent === paint.id}
              className={`h-5 w-5 rounded-sm border ${vehicle.accent === paint.id ? "ring-2 ring-primary" : "border-border"}`}
              style={{ background: paintHex(paint.id) }}
              onClick={() => saveVehicle({ ...vehicle, accent: paint.id })}
            />
          ))}
        </div>
      </div>

      {phase === "pick" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={opponent === "cpu" ? "default" : "outline"}
              onClick={() => setOpponent("cpu")}
            >
              Race the CPU
            </Button>
            <Button
              size="sm"
              variant={opponent === "yard" ? "default" : "outline"}
              onClick={() => setOpponent("yard")}
            >
              Race the yard
            </Button>
          </div>
          {opponent === "cpu" ? (
            <div className="flex flex-wrap gap-2">
              {RACE_DIFFICULTIES.map((row) => (
                <Button
                  key={row.id}
                  size="sm"
                  variant={difficulty === row.id ? "default" : "outline"}
                  onClick={() => setDifficulty(row.id)}
                >
                  {row.label} · {row.wpm} wpm · {row.prize} WB
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              First clean finish on this yard takes {YARD_RACE_PRIZE} WeixBucks.
              Nobody pays to enter.
            </p>
          )}
          <Button disabled={busy} onClick={() => void openRace(opponent)}>
            {busy ? "Opening…" : "Start race"}
          </Button>
          {lobbies.length > 0 ? (
            <ul className="space-y-2">
              {lobbies.map((lobby) => (
                <li
                  key={lobby.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <span>
                    @{lobby.hostHandle} · {lobby.verseRef}
                  </span>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void join(lobby)}>
                    Join
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-muted-foreground max-w-xl">
            A win pays practice WeixBucks on {yardId}, up to {DAILY_RACE_CAP} a
            day. You need 90% accuracy. These credits are not cash, and they
            do not become BKSPC or BI9.
          </p>
        </div>
      ) : null}

      {phase === "waiting" ? (
        <p className="text-sm text-muted-foreground">
          Waiting for another racer on {yardId}. The verse stays hidden until
          they join.
        </p>
      ) : null}

      {phase === "racing" || phase === "result" ? (
        <div className="rounded-xl bg-[#323437] text-[#d1d0c5] px-4 py-5 sm:px-6 space-y-3">
          <p className="font-mono text-sm text-[#646669]">
            {race?.verseRef} · {race?.mode === "yard" ? "yard race" : `${spec.label} · ${spec.wpm} wpm`}
            {paid !== null && paid > 0 ? ` · +${paid} WB` : ""}
          </p>
          <RacerSprite vehicle={vehicle} progress={mine} label={vehicleLabel(vehicle)} />
          <RacerSprite
            vehicle={rivalVehicle}
            progress={rivalProgress}
            label={race?.mode === "yard" ? rival?.handle || "Waiting" : `CPU ${spec.wpm}`}
          />
          <div className="relative min-h-24">
            <p className="font-mono text-lg leading-relaxed break-words select-none" aria-hidden>
              {verse
                ? [...verse].map((ch, i) => {
                    const show = ch === " " ? "\u00a0" : ch;
                    const cls =
                      i < typed.length
                        ? typed[i] === verse[i]
                          ? "text-[#d1d0c5]"
                          : "text-[#ca4754]"
                        : i === typed.length
                          ? "text-[#646669] border-l-2 border-[#e2b714]"
                          : "text-[#646669]";
                    return (
                      <span key={i} className={cls}>
                        {show}
                      </span>
                    );
                  })
                : "…"}
            </p>
            {phase === "racing" ? (
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => onType(e.target.value)}
                aria-label="Type the verse to race"
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent"
              />
            ) : null}
          </div>
          <div className="flex gap-6 font-mono text-[#e2b714] text-2xl">
            <div>
              <div className="text-[11px] uppercase text-[#646669]">wpm</div>
              {wpm}
            </div>
            <div>
              <div className="text-[11px] uppercase text-[#646669]">purse</div>
              {prizeFor(race?.difficulty || difficulty)}
            </div>
          </div>
        </div>
      ) : null}

      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      {phase === "result" ? (
        <Button variant="outline" onClick={reset}>
          New race
        </Button>
      ) : null}
    </div>
  );
}
