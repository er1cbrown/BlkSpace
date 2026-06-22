import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Coins,
  Radio,
  TrendingUp,
  UserPlus,
  MapPin,
  Settings,
  Code2,
  Trophy,
} from "lucide-react";
import { getCurrentHandle } from "@/lib/auth";
import { useAppGetUser, useAppGetTrendingFeed } from "@/hooks/use-app-data";
import { townGradient, townLabel } from "@/lib/towns";
import { isTauri } from "@/lib/tauri-api";
import { BETA_FEATURES } from "@/lib/beta-features";

import { SEED_SUGGESTED_PEOPLE } from "@/lib/seed-content";

export function YardSidebar() {
  const handle = getCurrentHandle();
  const { data: user } = useAppGetUser(handle);
  const { data: trending = [] } = useAppGetTrendingFeed(handle);

  const town = user?.town ?? "tsu";
  const wb = user?.weixBucks ?? 0;

  return (
    <aside className="space-y-4 sticky top-4">
      <Card className="overflow-hidden border-primary/15 shadow-md">
        <div className={`h-16 bg-gradient-to-br ${townGradient(town)}`} />
        <CardHeader className="pb-2 -mt-8">
          <div className="flex items-end gap-3">
            <Avatar className="h-14 w-14 border-2 border-background shadow-md">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {user?.displayName?.charAt(0) ?? handle.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1 min-w-0">
              <CardTitle className="text-base truncate">
                {user?.displayName ?? handle}
              </CardTitle>
              <p className="text-xs text-muted-foreground">@{handle}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {townLabel(town)}
            </span>
            <Badge variant="secondary" className="gap-1 font-semibold">
              <Coins className="w-3.5 h-3.5 text-accent" />
              {wb.toLocaleString()} WB
            </Badge>
          </div>
          <Link href="/wallet">
            <Button variant="outline" size="sm" className="w-full">
              My Earnings
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            People on the yard
            {!isTauri() && (
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                Sample
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {SEED_SUGGESTED_PEOPLE.filter((p) => p.handle !== handle)
            .slice(0, 3)
            .map((p) => (
              <Link key={p.handle} href={`/profile/${p.handle}`}>
                <div className="flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {p.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {townLabel(p.town)}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0 h-7 text-xs">
                    View
                  </Button>
                </div>
              </Link>
            ))}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            Trending on the yard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(trending as { authorHandle?: string; content?: string; likesCount?: number }[])
            .slice(0, 3)
            .map((post, i) => (
              <div
                key={i}
                className="text-sm p-2 rounded-lg bg-muted/30 border border-border/40"
              >
                <p className="font-medium text-xs text-primary">
                  @{post.authorHandle}
                </p>
                <p className="text-muted-foreground line-clamp-2 mt-0.5">
                  {post.content}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {post.likesCount ?? 0} likes
                </p>
              </div>
            ))}
          {trending.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">
              Post something — you might trend across yards.
            </p>
          )}
        </CardContent>
      </Card>

      {BETA_FEATURES.showRelayPanel() && (
        <Card className="border-border/60 bg-secondary/20">
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Radio className="w-4 h-4 text-primary" />
              <span>Relay network</span>
            </div>
            <Link href="/relays">
              <Button size="sm" variant="secondary">
                Relays
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card className="border-orange-500/20">
        <CardContent className="p-4">
          <Link href="/leaderboard">
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Trophy className="w-4 h-4 text-orange-500" />
              Karma leaderboard
            </Button>
          </Link>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Karma ≠ WeixBucks — reputation only
          </p>
        </CardContent>
      </Card>

      <div className="px-1 space-y-1 text-xs text-muted-foreground">
        <Link href="/settings" className="flex items-center gap-2 hover:text-foreground">
          <Settings className="w-3.5 h-3.5" />
          Settings
        </Link>
        {BETA_FEATURES.showDevTools && (
          <>
            <Link href="/architecture" className="flex items-center gap-2 hover:text-foreground">
              <Code2 className="w-3.5 h-3.5" />
              Stack (dev)
            </Link>
            <Link href="/mesh-test" className="flex items-center gap-2 hover:text-foreground">
              <Code2 className="w-3.5 h-3.5" />
              Sync test (dev)
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}