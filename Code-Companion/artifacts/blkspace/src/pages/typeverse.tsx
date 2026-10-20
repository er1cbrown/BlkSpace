import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareCardButton } from "@/components/social/ShareCardButton";
import {
  TYPEVERSE_MODE_KEY,
  TYPEVERSE_MODULE_KEY,
  TYPEVERSE_MODULES,
  TYPEVERSE_STREAK_KEY,
  accuracyPct,
  bumpStreak,
  correctCount,
  dailyIndex,
  foldKeys,
  loadCorpus,
  localYmd,
  moduleSpec,
  pickIndex,
  previousYmd,
  readMode,
  readModule,
  readStreak,
  verseRef,
  wordsPerMinute,
  type TypeverseMode,
  type TypeverseModuleId,
  type Verse,
} from "@/lib/typeverse";
import { ArrowLeft, Keyboard } from "lucide-react";

/**
 * typeverse on BKSPC. Same loop as the desktop typer:
 * type the verse, Tab for a new random one, Escape to restart.
 */
export default function TypeversePage() {
  const [moduleId, setModuleId] = useState<TypeverseModuleId>(() =>
    readModule(
      typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(TYPEVERSE_MODULE_KEY),
    ),
  );
  const [mode, setMode] = useState<TypeverseMode>(() =>
    readMode(
      typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(TYPEVERSE_MODE_KEY),
    ),
  );
  const [nonce, setNonce] = useState(0);
  const [target, setTarget] = useState<Verse | null>(null);
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [streak, setStreak] = useState(() =>
    readStreak(
      typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(TYPEVERSE_STREAK_KEY),
    ),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const genRef = useRef(0);

  const spec = moduleSpec(moduleId);

  useEffect(() => {
    let cancelled = false;
    const gen = ++genRef.current;
    setTyped("");
    setStartedAt(0);
    setDone(false);
    setTarget(null);
    setError("");
    setLoading(true);
    void (async () => {
      try {
        const verses = await loadCorpus(moduleId);
        if (cancelled || gen !== genRef.current) return;
        const idx =
          mode === "daily"
            ? await dailyIndex(localYmd(), spec.label, verses.length)
            : pickIndex(verses.length);
        if (cancelled || gen !== genRef.current) return;
        setTarget(verses[idx] ?? null);
        if (!verses[idx]) setError(`no verses in ${spec.label}`);
      } catch (e) {
        if (cancelled || gen !== genRef.current) return;
        setError(e instanceof Error ? e.message : `could not load ${spec.label}`);
      } finally {
        if (!cancelled && gen === genRef.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [moduleId, mode, nonce, spec.label]);

  useEffect(() => {
    if (!loading && target) inputRef.current?.focus();
  }, [loading, target, nonce, moduleId, mode]);

  useEffect(() => {
    if (!done || !target) return;
    const acc =
      typed.length > 0 ? correctCount(typed, target.text) / typed.length : 0;
    if (acc < 0.9) return;
    const today = localYmd();
    const prev = readStreak(localStorage.getItem(TYPEVERSE_STREAK_KEY));
    const next = bumpStreak(prev, today, previousYmd(today));
    if (next.count === prev.count && next.last === prev.last) return;
    localStorage.setItem(TYPEVERSE_STREAK_KEY, JSON.stringify(next));
    setStreak(next);
  }, [done, target, typed]);

  const chooseModule = (id: TypeverseModuleId) => {
    setModuleId(id);
    localStorage.setItem(TYPEVERSE_MODULE_KEY, id);
  };

  const chooseMode = (next: TypeverseMode) => {
    setMode(next);
    localStorage.setItem(TYPEVERSE_MODE_KEY, next);
    if (next === mode) setNonce((n) => n + 1);
  };

  const restart = () => {
    setTyped("");
    setStartedAt(0);
    setDone(false);
    inputRef.current?.focus();
  };

  const onType = (value: string) => {
    if (done || !target) return;
    let next = foldKeys(value);
    if (next.length > target.text.length) next = next.slice(0, target.text.length);
    if (!startedAt && next.length > 0) setStartedAt(performance.now());
    setTyped(next);
    if (next.length === target.text.length) setDone(true);
  };

  const correct = target ? correctCount(typed, target.text) : 0;
  const elapsed = startedAt ? performance.now() - startedAt : 0;
  const wpm = wordsPerMinute(correct, elapsed);
  const acc = accuracyPct(correct, typed.length);
  const refLine = target
    ? `${verseRef(target)} · ${spec.label} · ${spec.lang} · ${mode === "daily" ? "verse of the day" : "random"}`
    : loading
      ? `loading ${spec.label}…`
      : error || "…";

  return (
    <AppShell wide hideRightRail>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/arcade">
              <Button variant="ghost" size="sm" className="gap-1 pl-0">
                <ArrowLeft className="w-4 h-4" /> Arcade
              </Button>
            </Link>
            <Keyboard className="w-5 h-5 text-primary shrink-0" />
            <h1 className="text-xl font-bold font-serif tracking-tight">
              typeverse
            </h1>
            <Badge variant="secondary">BKSPC</Badge>
          </div>
          <ShareCardButton
            variant="outline"
            share={{
              kind: "hub",
              title: "typeverse",
              body: "Type a Bible verse. KJV and Reina-Valera 1909.",
              path: "/typeverse",
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {TYPEVERSE_MODULES.map((m) => (
            <Button
              key={m.id}
              size="sm"
              variant={m.id === moduleId ? "default" : "outline"}
              onClick={() => chooseModule(m.id)}
            >
              {m.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={mode === "random" ? "default" : "outline"}
            onClick={() => chooseMode("random")}
          >
            random
          </Button>
          <Button
            size="sm"
            variant={mode === "daily" ? "default" : "outline"}
            onClick={() => chooseMode("daily")}
          >
            verse of the day
          </Button>
          <Button size="sm" variant="outline" onClick={() => chooseMode("random")}>
            tab · next
          </Button>
        </div>

        <div className="rounded-xl bg-[#323437] text-[#d1d0c5] px-4 py-5 sm:px-6">
          <p className="text-sm text-[#646669] mb-3 min-h-5 font-mono" id="typeverse-ref">
            {refLine}
          </p>
          <div className="relative min-h-32">
            <p
              className="font-mono text-lg sm:text-xl leading-relaxed break-words select-none"
              aria-hidden
            >
              {target
                ? [...target.text].map((ch, i) => {
                    const show = ch === " " ? "\u00a0" : ch;
                    if (i < typed.length) {
                      const ok = typed[i] === target.text[i];
                      return (
                        <span
                          key={i}
                          className={
                            ok ? "text-[#d1d0c5]" : "text-[#ca4754] bg-[#ca475422]"
                          }
                        >
                          {show}
                        </span>
                      );
                    }
                    if (i === typed.length) {
                      return (
                        <span
                          key={i}
                          className="text-[#646669] border-l-2 border-[#e2b714]"
                        >
                          {show}
                        </span>
                      );
                    }
                    return (
                      <span key={i} className="text-[#646669]">
                        {show}
                      </span>
                    );
                  })
                : <span className="text-[#646669]">…</span>}
            </p>
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  chooseMode("random");
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  restart();
                }
              }}
              aria-label="Type the verse"
              aria-describedby="typeverse-ref"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="absolute inset-0 h-full w-full cursor-text bg-transparent text-base text-transparent caret-transparent"
            />
          </div>
          <div className="mt-5 flex gap-6 font-mono text-[#e2b714] text-2xl">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#646669]">wpm</div>
              {wpm}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#646669]">acc</div>
              {acc}%
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#646669]">streak</div>
              {streak.count}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground max-w-xl">
          Type the verse. <kbd className="font-mono">Tab</kbd> loads a new random
          verse. <kbd className="font-mono">Escape</kbd> restarts this one. A day
          counts toward the streak at 90% accuracy. {spec.notice} Greek SBLGNT and
          Reina Valera Gómez stay on the desktop typer.
        </p>
      </div>
    </AppShell>
  );
}
