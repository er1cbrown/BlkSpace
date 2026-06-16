import { useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowBigUp, Trophy, Coins } from "lucide-react";
import { useTauriGetKarmaLeaderboard } from "@/hooks/use-app-data";
import { KarmaBadge } from "@/components/economy/KarmaBadge";
import { TOWN_OPTIONS } from "@/lib/towns";
import { isTauri } from "@/lib/tauri-api";

export default function LeaderboardPage() {
  const [yard, setYard] = useState<string>("all");
  const { data: entries = [], isLoading } = useTauriGetKarmaLeaderboard(
    yard === "all" ? undefined : yard,
    25,
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-orange-500" />
            Karma Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Reddit-style reputation — separate from{" "}
            <Link href="/wallet" className="text-primary hover:underline">
              WeixBucks (WB)
            </Link>
            , which you spend. Karma cannot be bought or tipped.
          </p>
        </div>
        <Select value={yard} onValueChange={setYard}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All yards" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All yards</SelectItem>
            {TOWN_OPTIONS.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-orange-500/20 mb-6">
        <CardContent className="py-4 text-sm text-muted-foreground flex gap-6 flex-wrap">
          <span className="flex items-center gap-2">
            <ArrowBigUp className="h-4 w-4 text-orange-500" />
            Karma = visibility & trust (post + comment)
          </span>
          <span className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            WB = spendable currency (tips, boosts, shop)
          </span>
        </CardContent>
      </Card>

      {!isTauri() && (
        <p className="text-sm text-muted-foreground mb-4">
          Leaderboard requires the Tauri desktop app.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl">
          No karma yet — post and engage in yards to climb the board.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const total = entry.postKarma + entry.commentKarma;
            return (
              <Card
                key={entry.handle}
                className="border-border/50 hover:bg-muted/20 transition-colors"
              >
                <CardHeader className="py-3 flex flex-row items-center gap-4">
                  <span
                    className={`text-lg font-bold w-8 text-center ${
                      idx < 3 ? "text-orange-500" : "text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      <Link
                        href={`/profile/${entry.handle}`}
                        className="hover:text-primary hover:underline"
                      >
                        {entry.displayName}
                      </Link>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      @{entry.handle} · {entry.town}
                    </p>
                  </div>
                  <KarmaBadge
                    postKarma={entry.postKarma}
                    commentKarma={entry.commentKarma}
                  />
                  <Badge variant="secondary" className="tabular-nums">
                    {total} total
                  </Badge>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}