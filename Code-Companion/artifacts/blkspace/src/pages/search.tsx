import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Link } from "wouter";
import { Search as SearchIcon, MapPin } from "lucide-react";
import {
  useTauriSearchUsers,
  useTauriSearchPosts,
  useTauriSearchCommunities,
} from "@/hooks/use-app-data";
import { isTauri, type TauriUser, type TauriPost } from "@/lib/tauri-api";
import { MediaDisplay } from "@/components/ui/media-display";

const mockUsers = [
  { handle: "jane_doe", display: "Jane Doe", town: "TSU", followers: 342 },
  {
    handle: "campus_king",
    display: "Campus King",
    town: "Howard",
    followers: 1287,
  },
  {
    handle: "hbcustudent",
    display: "HBCU Student",
    town: "Spelman",
    followers: 891,
  },
  { handle: "alumnus_01", display: "Alumnus 01", town: "FAMU", followers: 563 },
  {
    handle: "grad_student",
    display: "Grad Student",
    town: "Morehouse",
    followers: 234,
  },
];

const mockPosts = [
  {
    id: 1,
    authorHandle: "jane_doe",
    authorDisplayName: "Jane Doe",
    content: "TSU homecoming was incredible this year!",
    townTag: "tsu",
    mediaBlobs: [] as string[],
  },
  {
    id: 2,
    authorHandle: "campus_king",
    authorDisplayName: "Campus King",
    content: "Howard Yard networking event tonight — pull up!",
    townTag: "howard",
    mediaBlobs: [] as string[],
  },
];

const mockCommunities = [
  {
    id: "tsu",
    name: "TSU Yard",
    school: "Tennessee State University",
    location: "Nashville, TN",
    members: 2847,
  },
  {
    id: "howard",
    name: "Howard Yard",
    school: "Howard University",
    location: "Washington, DC",
    members: 4521,
  },
];

function mapUser(u: TauriUser) {
  return {
    handle: u.handle,
    display: u.displayName,
    town: u.town.toUpperCase(),
    followers: u.followersCount,
  };
}

function filterMock<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  fields: (keyof T)[],
) {
  const q = query.toLowerCase();
  return items.filter((item) =>
    fields.some((f) => String(item[f]).toLowerCase().includes(q)),
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const searched = trimmed.length > 0;

  const { data: tauriUsers, isLoading: usersLoading } = useTauriSearchUsers(
    trimmed,
    searched,
  );
  const { data: tauriPosts, isLoading: postsLoading } = useTauriSearchPosts(
    trimmed,
    searched,
  );
  const { data: tauriCommunities, isLoading: communitiesLoading } =
    useTauriSearchCommunities(trimmed, searched);

  const userResults = isTauri()
    ? (tauriUsers || []).map(mapUser)
    : filterMock(mockUsers, trimmed, ["handle", "display", "town"]);

  type SearchPost = Pick<
    TauriPost,
    | "id"
    | "authorHandle"
    | "authorDisplayName"
    | "content"
    | "townTag"
    | "mediaBlobs"
  >;

  const postResults: SearchPost[] = isTauri()
    ? (tauriPosts || []).map((p) => ({
        id: p.id,
        authorHandle: p.authorHandle,
        authorDisplayName: p.authorDisplayName,
        content: p.content,
        townTag: p.townTag,
        mediaBlobs: p.mediaBlobs,
      }))
    : filterMock(mockPosts, trimmed, [
        "content",
        "authorHandle",
        "authorDisplayName",
        "townTag",
      ]);

  const communityResults = isTauri()
    ? tauriCommunities || []
    : filterMock(mockCommunities, trimmed, [
        "id",
        "name",
        "school",
        "location",
      ]);

  const hasResults =
    userResults.length > 0 ||
    postResults.length > 0 ||
    communityResults.length > 0;

  const loading =
    isTauri() && (usersLoading || postsLoading || communitiesLoading);

  return (
    <AppShell>
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
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {!searched ? (
          <div className="text-center py-20 text-muted-foreground border border-dashed rounded-2xl">
            <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Search across the entire BlkSpace network</p>
          </div>
        ) : loading ? (
          <div className="text-center py-20 text-muted-foreground">
            Searching...
          </div>
        ) : !hasResults ? (
          <div className="text-center py-20 text-muted-foreground">
            No results found for &ldquo;{query}&rdquo;
          </div>
        ) : (
          <Tabs defaultValue="users">
            <TabsList className="mb-6">
              <TabsTrigger value="users">
                Users ({userResults.length})
              </TabsTrigger>
              <TabsTrigger value="posts">
                Posts ({postResults.length})
              </TabsTrigger>
              <TabsTrigger value="communities">
                Communities ({communityResults.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="space-y-2">
              {userResults.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No users found.
                </p>
              ) : (
                userResults.map((u) => (
                  <Link key={u.handle} href={`/profile/${u.handle}`}>
                    <Card className="cursor-pointer hover:bg-muted/30 transition-colors border-border/50">
                      <CardContent className="flex items-center gap-4 py-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>{u.display.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <CardTitle className="text-base">{u.display}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            @{u.handle}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <Badge variant="outline" className="text-xs">
                            {u.town}
                          </Badge>
                          <p className="text-muted-foreground mt-1">
                            {u.followers} followers
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </TabsContent>
            <TabsContent value="posts" className="space-y-2">
              {postResults.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No posts found.
                </p>
              ) : (
                postResults.map((p) => (
                  <Link key={p.id} href={`/posts/${p.id}`}>
                    <Card className="cursor-pointer hover:bg-muted/30 transition-colors border-border/50">
                      <CardContent className="py-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {p.authorDisplayName}
                          </span>
                          <span>@{p.authorHandle}</span>
                          <Badge variant="outline" className="text-xs">
                            {p.townTag}
                          </Badge>
                        </div>
                        <p className="text-sm line-clamp-3">{p.content}</p>
                        <MediaDisplay hashes={p.mediaBlobs || []} />
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </TabsContent>
            <TabsContent value="communities" className="space-y-2">
              {communityResults.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No communities found.
                </p>
              ) : (
                communityResults.map((c) => (
                  <Link key={c.id} href={`/communities/${c.id}`}>
                    <Card className="cursor-pointer hover:bg-muted/30 transition-colors border-border/50">
                      <CardContent className="py-4">
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {c.school}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {c.location}
                          </span>
                          <span>{c.members.toLocaleString()} members</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
    </AppShell>
  );
}