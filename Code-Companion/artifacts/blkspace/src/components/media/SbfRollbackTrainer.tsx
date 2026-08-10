/**
 * SBF Rollback Trainer — N1 local GGPO-class training (Route C).
 * P1: WASD/Arrows + J/Space attack · P2: dummy or arrows+Enter
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  RollbackSession,
  SBF_ROLLBACK_BUILD_ID,
  SBF_ROLLBACK_FPS,
  STAGE_H,
  STAGE_W,
  GROUND_Y,
  dummyInput,
  inputsFromKeys,
  replayFromLog,
  stateChecksum,
  type GameState,
} from "@/lib/sbf-rollback-core";
import { SBF_NETPLAY_TARGET, PRODUCT_ID_YARD_DAY_BRAWL } from "@/lib/yard-day-brawl";
import { Swords, RefreshCw, Shield, Play, Pause } from "lucide-react";

type OppMode = "dummy" | "p2keys";

function draw(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  scale: number,
): void {
  const W = STAGE_W * scale;
  const H = STAGE_H * scale;
  ctx.fillStyle = s.hitFlash > 0 ? "#1a1020" : "#0c1220";
  ctx.fillRect(0, 0, W, H);

  // stage
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, GROUND_Y * scale, W, H - GROUND_Y * scale);
  ctx.strokeStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y * scale);
  ctx.lineTo(W, GROUND_Y * scale);
  ctx.stroke();

  const body = (x: number, y: number, facing: number, color: string, atk: number) => {
    const px = x * scale;
    const py = y * scale;
    ctx.fillStyle = color;
    ctx.fillRect(px - 10 * scale, py - 28 * scale, 20 * scale, 28 * scale);
    if (atk > 0) {
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(
        px + facing * 12 * scale - 4 * scale,
        py - 20 * scale,
        14 * scale,
        8 * scale,
      );
    }
  };

  body(s.p0.x, s.p0.y, s.p0.facing, "#38bdf8", s.p0.atkActive);
  body(s.p1.x, s.p1.y, s.p1.facing, "#f97316", s.p1.atkActive);

  // HP bars
  const bar = (x: number, hp: number, color: string) => {
    ctx.fillStyle = "#334155";
    ctx.fillRect(x, 8 * scale, 100 * scale, 8 * scale);
    ctx.fillStyle = color;
    ctx.fillRect(x, 8 * scale, hp * scale, 8 * scale);
  };
  bar(12 * scale, s.p0.hp, "#38bdf8");
  bar((STAGE_W - 112) * scale, s.p1.hp, "#f97316");

  ctx.fillStyle = "#94a3b8";
  ctx.font = `${10 * scale}px monospace`;
  ctx.fillText(`f ${s.frame}`, (STAGE_W / 2 - 12) * scale, 16 * scale);
}

export function SbfRollbackTrainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<RollbackSession | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef(0);
  const accRef = useRef(0);
  const lastRef = useRef(0);

  const [running, setRunning] = useState(false);
  const [latency, setLatency] = useState(4);
  const [opp, setOpp] = useState<OppMode>("dummy");
  const [stats, setStats] = useState({
    frame: 0,
    rollbacks: 0,
    lastRollbackDepth: 0,
    predictedFrames: 0,
    p0hp: 100,
    p1hp: 100,
  });
  const [verifyMsg, setVerifyMsg] = useState("");

  const scale = 2;

  const ensureSession = useCallback(() => {
    if (!sessionRef.current) {
      sessionRef.current = new RollbackSession({
        localSeat: 0,
        latencyFrames: latency,
        seed: 1,
      });
    }
    return sessionRef.current;
  }, [latency]);

  const reset = useCallback(() => {
    const s = new RollbackSession({
      localSeat: 0,
      latencyFrames: latency,
      seed: 1,
    });
    sessionRef.current = s;
    setStats({
      frame: 0,
      rollbacks: 0,
      lastRollbackDepth: 0,
      predictedFrames: 0,
      p0hp: 100,
      p1hp: 100,
    });
    setVerifyMsg("");
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx, s.state, scale);
  }, [latency]);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    lastRef.current = performance.now();
    accRef.current = 0;
    const stepMs = 1000 / SBF_ROLLBACK_FPS;

    const loop = (now: number) => {
      const dt = now - lastRef.current;
      lastRef.current = now;
      accRef.current += dt;
      const session = ensureSession();
      let guard = 0;
      while (accRef.current >= stepMs && guard < 5) {
        accRef.current -= stepMs;
        guard += 1;
        const local = inputsFromKeys(keysRef.current, "p1");
        const remote =
          opp === "dummy"
            ? dummyInput(session.state, 1)
            : inputsFromKeys(keysRef.current, "p2");
        const st = session.tick(local, remote);
        setStats({
          frame: session.stats.frame,
          rollbacks: session.stats.rollbacks,
          lastRollbackDepth: session.stats.lastRollbackDepth,
          predictedFrames: session.stats.predictedFrames,
          p0hp: st.p0.hp,
          p1hp: st.p1.hp,
        });
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) draw(ctx, st, scale);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, opp, ensureSession]);

  const verify = () => {
    const session = ensureSession();
    const r = session.verifyReplay();
    const again = replayFromLog(session.inputLog, 1);
    setVerifyMsg(
      r.ok
        ? `Replay OK · checksum ${r.live} · frames ${session.inputLog.length}`
        : `MISMATCH live=${r.live} replay=${r.replay} (again=${again.checksum})`,
    );
  };

  return (
    <div className="space-y-4">
      <Alert className="border-orange-500/40 bg-orange-500/5">
        <Swords className="w-4 h-4 text-orange-500" />
        <AlertTitle className="text-sm">
          Rollback trainer · N1 · {PRODUCT_ID_YARD_DAY_BRAWL}
        </AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground space-y-1">
          <p className="font-mono text-[10px]">{SBF_ROLLBACK_BUILD_ID}</p>
          <p>Route C data plane — GGPO-class predict / rollback / resim on this device.</p>
          <p className="text-foreground/80">{SBF_NETPLAY_TARGET}</p>
          <p>
            <strong className="text-foreground">P1:</strong> A/D or ←/→ · W/↑ jump ·
            J/Space attack ·{" "}
            <strong className="text-foreground">P2:</strong> dummy or ←/→/↑/Enter
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Swords className="w-4 h-4" />
            Yard Day Brawl · rollback lab
          </CardTitle>
          <CardDescription className="text-xs">
            Artificial remote latency forces predictions — watch rollbacks tick up
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-center rounded-lg overflow-hidden border border-border bg-black">
            <canvas
              ref={canvasRef}
              width={STAGE_W * scale}
              height={STAGE_H * scale}
              className="max-w-full"
              tabIndex={0}
            />
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Fake lag (frames)</Label>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={latency}
                onChange={(e) => {
                  setRunning(false);
                  setLatency(parseInt(e.target.value, 10) || 0);
                }}
              >
                {[0, 2, 4, 6, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}f (~{Math.round((n * 1000) / 60)}ms one-way)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Opponent</Label>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={opp}
                onChange={(e) => setOpp(e.target.value as OppMode)}
              >
                <option value="dummy">Training dummy</option>
                <option value="p2keys">P2 keys (same keyboard)</option>
              </select>
            </div>
            <Button
              size="sm"
              className="gap-1"
              onClick={() => setRunning((r) => !r)}
            >
              {running ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Fight
                </>
              )}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={reset}>
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </Button>
            <Button size="sm" variant="secondary" onClick={verify}>
              Verify replay
            </Button>
            <Link href="/mesh-test">
              <Button size="sm" variant="ghost">
                3 Routes
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">frame {stats.frame}</Badge>
            <Badge variant={stats.rollbacks > 0 ? "default" : "secondary"}>
              rollbacks {stats.rollbacks}
            </Badge>
            <Badge variant="outline">last depth {stats.lastRollbackDepth}</Badge>
            <Badge variant="outline">preds {stats.predictedFrames}</Badge>
            <Badge variant="outline">P0 HP {stats.p0hp}</Badge>
            <Badge variant="outline">P1 HP {stats.p1hp}</Badge>
            <Badge variant="secondary">checksum seed</Badge>
          </div>

          {verifyMsg && (
            <Alert>
              <Shield className="w-4 h-4" />
              <AlertTitle className="text-sm">N1 replay check</AlertTitle>
              <AlertDescription className="text-xs font-mono">
                {verifyMsg}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
