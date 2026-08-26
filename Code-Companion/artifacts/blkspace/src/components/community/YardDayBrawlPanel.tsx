import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BRAWL_FIGHTERS,
  BRAWL_MODES,
  BRAWL_STAGES,
  YARD_DAY_BRAWL_LADDER,
  SUPER_BLKSPACE_FIGHTERS,
  PROJECT_B,
  PROJECT_B_ID,
  PROJECT_BLACK_SPACE_FIGHTERS,
  PROJECT_B_EQUATION,
  SBF_PRODUCT_LINES,
  SBF_SERIES,
  PRODUCT_ID_YARD_DAY_BRAWL,
  PRODUCT_ID_SBF_2,
  PRODUCT_ID_SBF_TAG_3,
  ensureYardDayBrawlArcadeSeed,
  hostYardDayBrawl,
  onYardDayBrawlEnter,
  type BrawlModeId,
} from "@/lib/yard-day-brawl";
import { useGuestMode } from "@/lib/guest-mode";
import { Shield, Swords, Users, MapPin, Zap } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { describeLadder } from "@/lib/tournament-prizes";

/**
 * ProjectB (XK20) = ProjectBlackSpaceFighters
 * Series: YDB1 · XQ5D · 5DXQ — Flash nostalgia trilogy host UI.
 */
export function YardDayBrawlPanel({ communityId }: { communityId: string }) {
  const { isGuest } = useGuestMode();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<BrawlModeId>("versus");
  const [stageId, setStageId] = useState(BRAWL_STAGES[0].id);
  const [ticketPrice, setTicketPrice] = useState("3");
  const [prizeWb, setPrizeWb] = useState(String(YARD_DAY_BRAWL_LADDER.firstWb));
  const [playUrl, setPlayUrl] = useState(
    "https://webassembly.github.io/wabt/demo/",
  );
  const [clubChannel, setClubChannel] = useState("#sbf-watch");

  useEffect(() => {
    ensureYardDayBrawlArcadeSeed();
  }, []);

  const host = async () => {
    if (isGuest) {
      toast("Create an account to host ProjectB / Super BKSPC Fighters");
      return;
    }
    setBusy(true);
    try {
      const r = await hostYardDayBrawl({
        communityId,
        mode,
        stageId,
        ticketPriceWb: parseInt(ticketPrice, 10) || 0,
        prizeWb: parseInt(prizeWb, 10) || 0,
        playUrl,
        clubChannel,
      });
      onYardDayBrawlEnter();
      toast.success(
        `${SUPER_BLKSPACE_FIGHTERS} (${PROJECT_B_ID} · ${PRODUCT_ID_YARD_DAY_BRAWL}) · event #${r.event.id}`,
      );
      await qc.invalidateQueries({ queryKey: ["yard-events"] });
      await qc.invalidateQueries({ queryKey: ["club", "tours", communityId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert className="border-orange-500/40 bg-gradient-to-r from-orange-500/10 via-fuchsia-500/10 to-cyan-500/10">
        <Zap className="w-4 h-4 text-orange-500" />
        <AlertTitle className="text-sm font-bold tracking-tight">
          {SUPER_BLKSPACE_FIGHTERS}
        </AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground space-y-1">
          <p className="font-mono text-[11px] text-foreground/90">
            {PROJECT_B_EQUATION}
          </p>
          <p className="text-foreground/90 font-medium">
            {PROJECT_B} · {PROJECT_B_ID} → {PROJECT_BLACK_SPACE_FIGHTERS}
          </p>
          <p className="font-mono text-[10px]">{SBF_PRODUCT_LINES}</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {SBF_SERIES.map((g) => (
              <li key={g.productId}>
                <span className="font-mono text-foreground/90">{g.productId}</span>{" "}
                {g.title} {g.version} — {g.nostalgiaClass}
              </li>
            ))}
          </ul>
          <p>
            Host shell for{" "}
            <span className="font-mono">{PRODUCT_ID_YARD_DAY_BRAWL}</span> /{" "}
            <span className="font-mono">{PRODUCT_ID_SBF_2}</span>. Tag expansion{" "}
            <span className="font-mono">{PRODUCT_ID_SBF_TAG_3}</span> later.
          </p>
          <p className="font-medium text-orange-600/90 dark:text-orange-400/90">
            Mechanical lineage only — not NG / Nintendo / CF / Riot assets
          </p>
          <p>Prize ladder: {describeLadder(YARD_DAY_BRAWL_LADDER)}</p>
        </AlertDescription>
      </Alert>

      <Card className="border-primary/30 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-orange-500 via-fuchsia-500 to-cyan-400" />
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            Host {SUPER_BLKSPACE_FIGHTERS} night
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Series club night (YDB1 shell) — Story · Versus · Survival · Challenge.
            Tickets, bracket, spectator hub, soft prizes. Flash-*feel* WASM jam.
            Full 2.0 / 5DXQ engines ship as Arcade homebrew packs later.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Mode</Label>
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as BrawlModeId)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAWL_MODES.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {BRAWL_MODES.find((m) => m.id === mode)?.blurb}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Stage
              </Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAWL_STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Ticket WB</Label>
              <Input
                type="number"
                min={0}
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Soft prize pot WB</Label>
              <Input
                type="number"
                min={0}
                value={prizeWb}
                onChange={(e) => setPrizeWb(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Play URL (WASM / homebrew Flash-*feel* jam)
            </Label>
            <Input
              value={playUrl}
              onChange={(e) => setPlayUrl(e.target.value)}
              placeholder="https://… your fighter build — not NG Rumble"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Spectator hub channel</Label>
            <Input
              value={clubChannel}
              onChange={(e) => setClubChannel(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => void host()}>
              {busy ? "Hosting…" : "Publish ProjectB night"}
            </Button>
            <Link href="/arcade">
              <Button size="sm" variant="outline">
                Yard Arcade
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Select your fighter (original)
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Campus archetypes — pick a main for flair (bracket is handle-based
            until a full engine ships).
          </p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2">
          {BRAWL_FIGHTERS.map((f) => (
            <div
              key={f.id}
              className="rounded-lg border border-border/60 p-2 text-xs hover:border-primary/40 transition-colors"
            >
              <div className="font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-orange-500" />
                {f.name}
              </div>
              <p className="text-muted-foreground mt-0.5">{f.blurb}</p>
              <Badge variant="outline" className="mt-1 text-[10px]">
                {f.yard}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
