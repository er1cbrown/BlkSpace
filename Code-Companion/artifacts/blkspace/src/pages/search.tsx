import { Navbar } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Link } from "wouter";
import { Search as SearchIcon, MapPin } from "lucide-react";
import { useTauriListUsers } from "@/hooks/use-app-data";
import { isTauri, type TauriUser } from "@/lib/tauri-api";

const mockUsers = [
  { handle: "jane_doe", display: "Jane Doe", town: "TSU", followers: 342 },
  { handle: "campus_king", display: "Campus King", town: "Howard", followers: 1287 },
  { handle: "hbcustudent", display: "HBCU Student", town: "Spelman", followers: 891 },
  { handle: "alumnus_01", display: "Alumnus 01", town: "FAMU", followers: 563 },
  { handle: "grad_student", display: "Grad Student", town: "Morehouse", followers: 234 },
];

function mapUser(u: TauriUser) {
  return {
    handle: u.handle,
    display: u.displayName,
    town: u.town.toUpperCase(),
    followers: u.followersCount,
  };
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const { data: tauriUsers } = useTauriListUsers();

  const searchPool = isTauri() && Array.isArray(tauriUsers) ? tauriUsers.map(mapUser) : mockUsers;
  const results = query
    ? searchPool.filter(u => u.handle.includes(query.toLowerCase()) || u.display.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container max-w-2xl py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <SearchIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Search</h1>
        </div>

        <div className="relative mb-8">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search users, posts, communities..."
            className="pl-12 h-14 text-lg rounded-2xl border-primary/20"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearched(true); }}
          />
        </div>

        {!searched ? (
          <div className="text-center py-20 text-muted-foreground border border-dashed rounded-2xl">
            <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Search across the entire BlkSpace network</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No results found for "{query}"</div>
        ) : (
          <Tabs defaultValue="users">
            <TabsList className="mb-6">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="communities">Communities</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="space-y-2">
              {results.map(u => (
                <Link key={u.handle} href={`/profile/${u.handle}`}>
                  <Card className="cursor-pointer hover:bg-muted/30 transition-colors border-border/50">
                    <CardContent className="flex items-center gap-4 py-4">
                      <Avatar className="h-12 w-12"><AvatarFallback>{u.display.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-base">{u.display}</CardTitle>
                        <p className="text-sm text-muted-foreground">@{u.handle}</p>
                      </div>
                      <div className="text-right text-sm">
                        <Badge variant="outline" className="text-xs">{u.town}</Badge>
                        <p className="text-muted-foreground mt-1">{u.followers} followers</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </TabsContent>
            <TabsContent value="posts">
              <div className="text-center py-12 text-muted-foreground">Post search coming soon.</div>
            </TabsContent>
            <TabsContent value="communities">
              <div className="text-center py-12 text-muted-foreground">Community search coming soon.</div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
