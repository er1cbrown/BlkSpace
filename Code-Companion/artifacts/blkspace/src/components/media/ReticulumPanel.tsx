import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio } from "lucide-react";
import {
  getReticulumStatus,
  RNS_POLICY,
  type ReticulumStatus,
} from "@/lib/reticulum";

/** Optional RNS (Route B). Bundled native rnsd — never a Python sidecar. */
export function ReticulumPanel() {
  const [status, setStatus] = useState<ReticulumStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      setStatus(await getReticulumStatus());
    } catch (e) {
      setErr(String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-500" />
          Reticulum · Route B
        </CardTitle>
        <CardDescription>
          Optional hard-path mesh via bundled native rns/rnsd. Not required for
          TSU feed or Customize.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant={status?.available ? "default" : "outline"}>
            {status?.available ? "rnsd detected (not live)" : "Optional off"}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
        <p className="text-muted-foreground">
          {err ||
            (status?.available
              ? "Native rnsd binary detected; live drain/receive transport is not wired yet."
              : status?.detail) ||
            "Probing RNS bridge…"}
        </p>
        {status?.rnsd && (
          <p className="font-mono text-[11px] text-muted-foreground break-all">
            rnsd {status.rnsd}
          </p>
        )}
        {status?.install && (
          <p className="font-mono text-[11px] text-muted-foreground">
            {status.install}
          </p>
        )}
        <ul className="text-[11px] text-muted-foreground space-y-0.5">
          <li>Python sidecar: {String(RNS_POLICY.pythonSidecar)}</li>
          <li>LXMF identity store: {String(RNS_POLICY.lxmfIdentityStore)}</li>
          <li>RNode serial/BLE: {String(RNS_POLICY.rnodeSerialBle)}</li>
          <li>
            Dest hashes next to Nostr keys:{" "}
            {String(RNS_POLICY.destHashesNextToNostrKeys)}
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
