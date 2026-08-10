/**
 * Three-route secure connectivity panel — Mesh Test.
 * No product AI. Probes A (social) · B (RNS) · C (play/rollback design).
 */
import { useCallback, useEffect, useState } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  probeThreeRoutes,
  statusBadgeVariant,
  SECURE_CONNECTIVITY_EQUATION,
  type ThreeRouteSnapshot,
  type RouteStatusSnapshot,
} from "@/lib/secure-connectivity-routes";
import {
  Network,
  Radio,
  Swords,
  RefreshCw,
  Shield,
  Database,
  ArrowRight,
} from "lucide-react";

function RouteIcon({ id }: { id: string }) {
  if (id === "A") return <Network className="w-4 h-4 text-primary" />;
  if (id === "B") return <Radio className="w-4 h-4 text-cyan-500" />;
  return <Swords className="w-4 h-4 text-orange-500" />;
}

function RouteCard({ route }: { route: RouteStatusSnapshot }) {
  return (
    <Card className="border-border/80 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <RouteIcon id={route.id} />
            <span className="font-mono text-xs opacity-70">{route.id}</span>
            {route.def.title}
          </CardTitle>
          <Badge variant={statusBadgeVariant(route.status)}>{route.label}</Badge>
        </div>
        <CardDescription className="text-xs">{route.def.endGoalSlice}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <p className="text-muted-foreground">{route.detail}</p>
        <div className="rounded-md bg-muted/40 p-2 space-y-1 font-mono text-[10px]">
          <p>
            <span className="text-muted-foreground">Transport:</span>{" "}
            {route.def.transport}
          </p>
          <p>
            <span className="text-muted-foreground">Local:</span>{" "}
            {route.def.localStore}
          </p>
          <p>
            <span className="text-muted-foreground">Never:</span>{" "}
            {route.def.neverUseFor}
          </p>
        </div>
        {Object.keys(route.metrics).length > 0 && (
          <ul className="text-[10px] text-muted-foreground space-y-0.5">
            {Object.entries(route.metrics).map(([k, v]) => (
              <li key={k}>
                <span className="font-mono">{k}</span>: {String(v)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function SecureConnectivityRoutesPanel() {
  const [snap, setSnap] = useState<ThreeRouteSnapshot | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      setSnap(await probeThreeRoutes());
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      <Alert className="border-primary/30 bg-primary/5">
        <Shield className="w-4 h-4" />
        <AlertTitle className="text-sm">Secure connectivity · 3 routes</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground space-y-1">
          <p className="font-mono text-[11px] text-foreground/90">
            {SECURE_CONNECTIVITY_EQUATION}
          </p>
          <p>
            {snap?.goal ||
              "Three independent lanes → one campus connectivity goal. No product AI."}
          </p>
          <p className="flex items-center gap-1 flex-wrap">
            <Database className="w-3 h-3" />
            Turso = per-device memory for Route A —{" "}
            <strong className="text-foreground">not</strong> a mesh peer.
          </p>
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" onClick={() => void refresh()} disabled={busy} className="gap-1">
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
          {busy ? "Probing…" : "Probe routes"}
        </Button>
        <Badge variant="outline">
          {snap?.isDesktop ? "Desktop" : "Web"}
        </Badge>
        {snap?.at && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {snap.at}
          </span>
        )}
        <Link href="/rollback">
          <Button size="sm" variant="outline" className="gap-1">
            Rollback lab · C <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
        <Link href="/arcade">
          <Button size="sm" variant="ghost" className="gap-1">
            Arcade
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {(snap?.routes || []).map((r) => (
          <RouteCard key={r.id} route={r} />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">How they meet</CardTitle>
          <CardDescription className="text-xs">
            Same end goal — different wires
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">A</strong> finds people, hosts
            club nights, stores results in local Turso after signed events.
          </p>
          <p>
            <strong className="text-foreground">B</strong> (optional) carries
            yard notes when the easy path is gone — never required for login.
          </p>
          <p>
            <strong className="text-foreground">C</strong> will carry fight
            inputs P2P with rollback; lobby + winner still go through{" "}
            <strong className="text-foreground">A</strong>.
          </p>
          <p className="pt-1">
            Open tabs: <span className="font-mono">Sync</span> (A) ·{" "}
            <span className="font-mono">Reticulum</span> (B) · ProjectB Club /
            Arcade (C host shell).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
