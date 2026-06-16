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

const fallbackCommunities = [
  {
    id: "tsu",
    name: "TSU Yard",
    school: "Tennessee State University",
    location: "Nashville, TN",
    members: 2847,
    posts: 1243,
    color: "from-blue-600 to-blue-800",
  },
  {
    id: "howard",
    name: "Howard Yard",
    school: "Howard University",
    location: "Washington, DC",
    members: 4521,
    posts: 2891,
    color: "from-red-600 to-red-800",
  },
  {
    id: "spelman",
    name: "Spelman Yard",
    school: "Spelman College",
    location: "Atlanta, GA",
    members: 3190,
    posts: 1876,
    color: "from-green-600 to-green-800",
  },
  {
    id: "famu",
    name: "FAMU Yard",
    school: "Florida A&M University",
    location: "Tallahassee, FL",
    members: 5632,
    posts: 3421,
    color: "from-orange-500 to-orange-700",
  },
  {
    id: "morehouse",
    name: "Morehouse Yard",
    school: "Morehouse College",
    location: "Atlanta, GA",
    members: 2904,
    posts: 1567,
    color: "from-purple-600 to-purple-800",
  },
];

const colorMap: Record<string, string> = {
  tsu: "from-blue-600 to-blue-800",
  howard: "from-red-600 to-red-800",
  spelman: "from-green-600 to-green-800",
  famu: "from-orange-500 to-orange-700",
  morehouse: "from-purple-600 to-purple-800",
};

function mapCommunity(c: TauriCommunity) {
  return {
    id: c.id,
    name: c.name,
    school: c.school,
    location: c.location,
    members: c.members,
    posts: Math.floor(c.members * 0.5),
    color: colorMap[c.id] || "from-primary to-primary/50",
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
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Communities</h1>
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
                        {c.name}{" "}
                        <span className="text-xs text-muted-foreground">
                          Yard
                        </span>
                      </CardTitle>
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
