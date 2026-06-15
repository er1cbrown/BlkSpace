import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Users, MapPin, GraduationCap, CalendarDays, MessageSquare, Heart, Repeat2 } from "lucide-react";
import { useTauriGetCommunities } from "@/hooks/use-app-data";
import { isTauri, type TauriCommunity } from "@/lib/tauri-api";

const fallbackCommunityData: Record<string, { name: string; school: string; location: string; members: number; description: string }> = {
  tsu: { name: "TSU Yard", school: "Tennessee State University", location: "Nashville, TN", members: 2847, description: "The official TSU community. Home of the Tigers. Connect with fellow students, alumni, and Nashville locals." },
  howard: { name: "Howard Yard", school: "Howard University", location: "Washington, DC", members: 4521, description: "Howard University's digital yard. The Mecca of HBCU culture and excellence." },
  spelman: { name: "Spelman Yard", school: "Spelman College", location: "Atlanta, GA", members: 3190, description: "Spelman College community. Where Black women lead, achieve, and uplift." },
  famu: { name: "FAMU Yard", school: "Florida A&M University", location: "Tallahassee, FL", members: 5632, description: "Florida A&M — the largest HBCU by enrollment. Rattler nation stays connected." },
  morehouse: { name: "Morehouse Yard", school: "Morehouse College", location: "Atlanta, GA", members: 2904, description: "Morehouse College. Building Black men who lead with integrity and purpose." },
};

const colorMap: Record<string, string> = {
  tsu: "from-blue-600 to-blue-800",
  howard: "from-red-600 to-red-800",
  spelman: "from-green-600 to-green-800",
  famu: "from-orange-500 to-orange-700",
  morehouse: "from-purple-600 to-purple-800",
};

export default function CommunityPage() {
  const [, params] = useRoute("/communities/:id");
  const id = params?.id || "";

  const { data: tauriCommunities } = useTauriGetCommunities();

  const community = isTauri() && Array.isArray(tauriCommunities)
    ? tauriCommunities.find((c: TauriCommunity) => c.id === id)
    : fallbackCommunityData[id];

  if (!community) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container max-w-2xl py-8 px-4">
          <div className="text-center py-20 text-muted-foreground">Community not found.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container max-w-3xl py-8 px-4">
        <Link href="/communities">
          <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent hover:text-primary gap-2">
            <ArrowLeft className="w-4 h-4" /> All Communities
          </Button>
        </Link>

        <div className={`h-40 rounded-2xl bg-gradient-to-br ${colorMap[id] || "from-primary to-primary/50"} mb-6`} />

        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{community.name}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4" /> {community.school}</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {community.location}</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {community.members.toLocaleString()} members</span>
              </div>
            </div>
            <Button className="rounded-full">Join Yard</Button>
          </div>
          <p className="text-muted-foreground">{community.description}</p>
        </div>

        <Tabs defaultValue="feed">
          <TabsList className="mb-6 h-12">
            <TabsTrigger value="feed" className="text-base">Feed</TabsTrigger>
            <TabsTrigger value="members" className="text-base">Members</TabsTrigger>
            <TabsTrigger value="about" className="text-base">About</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-border/50">
                <CardHeader className="pb-2 flex flex-row items-start gap-4">
                  <Avatar className="h-10 w-10"><AvatarFallback>U{i}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="font-bold">User {i}</span>
                      <span className="text-muted-foreground font-normal text-xs">@{`user${i}`}</span>
                    </CardTitle>
                    <p className="text-sm mt-2">Check in — {community.name} is live today! 🎉</p>
                  </div>
                </CardHeader>
                <CardFooter className="pl-16 pt-2 flex gap-4 text-sm text-muted-foreground border-none">
                  <Button variant="ghost" size="sm" className="h-8 px-2 gap-1"><MessageSquare className="w-4 h-4" /> {i * 3}</Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 gap-1"><Heart className="w-4 h-4" /> {i * 7}</Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 gap-1"><Repeat2 className="w-4 h-4" /> {i}</Button>
                </CardFooter>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="members">
            <Card className="border-border/50">
              <CardContent className="p-6 text-center text-muted-foreground">
                Member list coming soon.
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about">
            <Card className="border-border/50">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm"><CalendarDays className="w-4 h-4 text-primary" /> Founded 2026</div>
                <div className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-primary" /> {community.members.toLocaleString()} members</div>
                <p className="text-muted-foreground">{community.description}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
