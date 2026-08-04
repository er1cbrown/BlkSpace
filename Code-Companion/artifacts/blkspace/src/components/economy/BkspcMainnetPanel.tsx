import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Shield, Coins, AlertTriangle } from "lucide-react";
import { BRAND } from "@/lib/brand";
import {
  BKSPC_GATES_COPY,
  explorerTokenUrl,
  formatWbToBkspc,
  getBkspcConfig,
  saveBkspcOperatorConfig,
  type SolanaCluster,
} from "@/lib/bkspc-config";
import { toast } from "sonner";

/**
 * BKSPC settlement panel — mainnet-ready config + Cred gates.
 * Does not invent a mint; operators set mint after real launch.
 */
export function BkspcMainnetPanel({
  wbBalance = 0,
  className,
}: {
  wbBalance?: number;
  className?: string;
}) {
  const [cfg, setCfg] = useState(() => getBkspcConfig());
  const [mintDraft, setMintDraft] = useState(cfg.mint);
  const [clusterDraft, setClusterDraft] = useState<SolanaCluster>(cfg.cluster);
  const [showOps, setShowOps] = useState(false);

  const applyOps = () => {
    const next = saveBkspcOperatorConfig({
      cluster: clusterDraft,
      mint: mintDraft,
    });
    setCfg(next);
    toast.success(
      next.isMainnet
        ? "Using Solana mainnet-beta for BKSPC explorer links"
        : "Using Solana devnet",
    );
    // Reload so wallet adapter picks cluster on next mount if needed
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <Coins className="w-4 h-4 text-primary" />
          {BRAND.symbol} settlement
          <Badge variant={cfg.isMainnet ? "default" : "secondary"}>
            {cfg.isMainnet ? "mainnet-beta" : "devnet"}
          </Badge>
          {cfg.isMintConfigured ? (
            <Badge
              variant="outline"
              className="text-emerald-600 border-emerald-600/40"
            >
              mint set
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-600/40"
            >
              mint not set
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground text-xs leading-relaxed">
          Soft {BRAND.softCurrency} stay in-app. {BRAND.symbol} (
          {BRAND.coinName}) is optional Solana settlement after Cred gates — not
          a casino pitch.
        </p>

        <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
          <p className="font-medium text-xs">Your soft balance → estimate</p>
          <p className="text-lg font-bold">
            {wbBalance.toLocaleString()} WB{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ≈ {formatWbToBkspc(wbBalance)} {cfg.symbol}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            Ratio {cfg.ratio.toLocaleString()} WB = 1 {cfg.symbol} (published)
          </p>
        </div>

        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {BKSPC_GATES_COPY.map((line) => (
            <li key={line} className="flex gap-2">
              <Shield className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              {line}
            </li>
          ))}
        </ul>

        {cfg.isMintConfigured ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <a
                href={explorerTokenUrl(cfg.mint, cfg.cluster)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Explorer
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
            {cfg.pumpfunUrl && (
              <Button size="sm" variant="secondary" className="gap-1.5" asChild>
                <a
                  href={cfg.pumpfunUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  pump.fun
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            )}
            <p className="w-full text-[10px] font-mono text-muted-foreground break-all">
              {cfg.mint}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Mainnet mint not configured
              </p>
              <p className="text-muted-foreground mt-1">
                After counsel + pump.fun (or other) launch, set{" "}
                <code className="text-[10px]">VITE_BKSPC_MINT</code> or use
                operator fields below. Withdraw still requires Yard Cred gates
                in the desktop app.
              </p>
            </div>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setShowOps((v) => !v)}
        >
          {showOps ? "Hide" : "Show"} operator network settings
        </Button>

        {showOps && (
          <div className="space-y-3 border rounded-xl p-3 bg-card">
            <p className="text-[11px] text-muted-foreground">
              Beta ops only — reloads explorer links. Env vars override on next
              build.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Solana cluster</Label>
              <Select
                value={clusterDraft}
                onValueChange={(v) => setClusterDraft(v as SolanaCluster)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="devnet">devnet (safe default)</SelectItem>
                  <SelectItem value="mainnet-beta">
                    mainnet-beta (real SOL fees)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{cfg.symbol} mint address</Label>
              <Input
                value={mintDraft}
                onChange={(e) => setMintDraft(e.target.value)}
                placeholder="Paste mint after launch…"
                className="font-mono text-xs h-9"
              />
            </div>
            <Button type="button" size="sm" onClick={applyOps}>
              Save network settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
