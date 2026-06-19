import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SafeContent } from "@/components/ui/safe-content";
import { RiskBadge } from "@/components/ui/risk-badge";
import { ConsensusBadge } from "@/components/ui/consensus-badge";
import { ArrowRightLeft, ExternalLink, Radio } from "lucide-react";
import type { TauriCrossTownEvent } from "@/lib/tauri-api";

const YARDS = [
  { id: "all", label: "All yards" },
  { id: "tsu", label: "TSU" },
  { id: "howard", label: "Howard" },
  { id: "spelman", label: "Spelman" },
  { id: "famu", label: "FAMU" },
  { id: "morehouse", label: "Morehouse" },
] as const;

export function parseYardId(townTag: string): string {
  if (!townTag) return "";
  if (townTag.includes(":")) return townTag.split(":").pop() || townTag;
  return townTag.replace(/^hbcu-town-?/i, "").toLowerCase();
}

export function yardLabel(yardId: string): string {
  return YARDS.find((y) => y.id === yardId)?.label || yardId.toUpperCase();
}

export function BridgeFeed({
  events,
  isLoading,
  townFilter,
  onTownFilterChange,
  showFlagged,
}: {
  events: TauriCrossTownEvent[];
  isLoading: boolean;
  townFilter: string;
  onTownFilterChange: (town: string) => void;
  showFlagged: boolean;
}) {
  const visible = showFlagged
    ? events
    : events.filter(
        (e) => e.riskLevel !== "high" && (e.maliciousScore ?? 0) <= 0.7,
      );

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 text-sm">
        <div className="flex items-center gap-2 font-medium mb-1">
          <ArrowRightLeft className="w-4 h-4 text-primary" />
          Cross-yard Bridge
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Nostr kind-1 notes from connected relays, tagged with{" "}
          <code className="text-[10px]">hbcu-town:*</code>. Discover other HBCU
          yards without leaving your feed.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={townFilter} onValueChange={onTownFilterChange}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Filter yard" />
          </SelectTrigger>
          <SelectContent>
            {YARDS.map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">
          {visible.length} event{visible.length === 1 ? "" : "s"}
        </Badge>
        <Link href="/network">
          <Button size="sm" variant="outline" className="gap-1.5 ml-auto">
            <Radio className="w-3.5 h-3.5" />
            Relays
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-28 bg-muted/40" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground space-y-3">
            <p>No cross-yard posts yet for this filter.</p>
            <p className="text-xs">
              Connect to relays in <Link href="/network" className="text-primary underline">Network</Link>,
              publish from another yard, or wait for relay sync.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const yardId = parseYardId(item.townTag);
            return (
              <Card
                key={item.eventId}
                className="border-primary/10 hover:bg-muted/20 transition-colors"
              >
                <CardHeader className="pb-2 flex flex-row items-start gap-3">
                  <Avatar className="h-10 w-10 border border-primary/20">
                    <AvatarFallback>🌉</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-mono truncate">
                      {item.pubkey.slice(0, 10)}…{item.pubkey.slice(-4)}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {yardId && (
                        <Link href={`/communities/${yardId}`}>
                          <Badge
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-primary/10"
                          >
                            {yardLabel(yardId)} Yard
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Badge>
                        </Link>
                      )}
                      <RiskBadge
                        riskLevel={item.riskLevel}
                        maliciousScore={item.maliciousScore}
                      />
                      <ConsensusBadge
                        consensusValid={item.consensusValid}
                        consensusAgreement={item.consensusAgreement}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(
                          item.createdAtUnix * 1000,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-2">
                  <SafeContent text={item.content} className="text-[15px]" />
                </CardContent>
                <CardFooter className="pt-0 text-[10px] text-muted-foreground flex justify-between">
                  <span>
                    via {(item.relayUrl || "relay").replace("wss://", "").slice(0, 28)}
                  </span>
                  <span className="font-mono truncate max-w-[40%]">
                    {item.eventId.slice(0, 12)}…
                  </span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}