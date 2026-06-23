import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Users, MapPin, GraduationCap, ArrowRight } from "lucide-react";
import { useTauriGetCommunities } from "@/hooks/use-app-data";
import { isTauri, type TauriCommunity } from "@/lib/tauri-api";
import { BETA_FEATURES } from "@/lib/beta-features";
import { YARD_IDS, YARD_THEME_PACKS, yardGradient } from "@/lib/yard-themes";

const fallbackCommunities = YARD_IDS.map((id) => {
  const pack = YARD_THEME_PACKS[id];
  return {
    id,
    name: pack.name,
    school: pack.school,
    location: pack.location,
    members: id === "tsu" ? 2847 : id === "howard" ? 4521 : id === "spelman" ? 3190 : id === "famu" ? 5632 : 2904,
    posts: 1200,
    color: pack.gradient,
    mascot: pack.mascot,
    tagline: pack.tagline,
  };
});

function mapCommunity(c: TauriCommunity) {
  const pack = YARD_THEME_PACKS[c.id as keyof typeof YARD_THEME_PACKS];
  return {
    id: c.id,
    name: c.name,
    school: c.school,
    location: c.location,
    members: c.members,
    posts: Math.floor(c.members * 0.5),
    color: pack?.gradient ?? yardGradient(c.id),
    mascot: pack?.mascot,
    tagline: pack?.tagline,
  };
}

export default function CommunitiesPage() {
  const { data: tauriData } = useTauriGetCommunities();

  const communities =
    isTauri() && Array.isArray(tauriData)
      ? tauriData.map(mapCommunity)
      : fallbackCommunities;

  return (
    <AppShell wide hideRightRail>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <Users className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Yards</h1>
          {BETA_FEATURES.isWebPreview() && (
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
              Sample campuses
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-lg mb-10">
          Find your yard and connect with your people.
        </p>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Discord-style college yards. Casual hangouts with professional tools
            — channels for study, music, events, and networking.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((c) => (
            <Link key={c.id} href={`/communities/${c.id}`}>
              <Card className="group cursor-pointer overflow-hidden border-primary/5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className={`h-24 bg-gradient-to-br ${c.color}`} />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {c.name}
                        {c.mascot && (
                          <span className="text-sm font-normal">{c.mascot}</span>
                        )}
                      </CardTitle>
                      {c.tagline && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {c.tagline}
                        </p>
                      )}
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <GraduationCap className="w-3.5 h-3.5" /> {c.school}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-primary/5 text-primary text-xs"
                    >
                      {c.members.toLocaleString()} members
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-3.5 h-3.5" /> {c.location}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {c.posts.toLocaleString()} posts today
                    </span>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      Enter Yard <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
    </AppShell>
  );
}
