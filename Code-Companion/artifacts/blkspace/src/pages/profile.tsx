import { Navbar } from "@/components/layout/Navbar";
import { useRoute } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  GraduationCap,
  CalendarDays,
  Coins,
  MessageSquare,
  Heart,
  Repeat2,
  Music,
  Palette,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import {
  useAppGetUser,
  useAppGetUserPosts,
  useAppCreatePost,
  useTauriToggleFollow,
  useTauriGetFollowing,
} from "@/hooks/use-app-data";
import { SafeContent } from "@/components/ui/safe-content";
import { MediaDisplay } from "@/components/ui/media-display";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import { isTauri, tauriGetBlobBytes } from "@/lib/tauri-api";
import { toast } from "sonner";

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:handle");
  const handle = params?.handle || "";

  const currentUser = getCurrentHandle();
  const isOwnProfile = handle === currentUser || !handle;

  const { data: user, isLoading } = useAppGetUser(handle || currentUser);
  const { data: posts, isLoading: postsLoading } = useAppGetUserPosts(
    handle || currentUser,
    currentUser,
  );
  const createPost = useAppCreatePost();
  const toggleFollowMut = useTauriToggleFollow();
  const { data: remoteFollowing = [] } = useTauriGetFollowing(
    isTauri() && !isOwnProfile,
  );

  // MySpace-style customization (demo state, persists in session)
  const [profileTheme, setProfileTheme] = useState<
    "classic" | "pro" | "vibrant" | "myspace"
  >("classic");
  const [profileSong, setProfileSong] = useState<string | null>(null); // hash for audio
  const [showCustomize, setShowCustomize] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null); // for real Iroh play
  const [wallText, setWallText] = useState(""); // for visitor wall posts
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [selectedTown, setSelectedTown] = useState<string>("tsu"); // fallback for wall posts etc.

  const themeClasses = {
    classic: "border-primary/30 bg-card",
    pro: "border-slate-700 bg-slate-950 text-slate-100",
    vibrant: "border-orange-400 bg-orange-50 text-orange-950",
    myspace:
      "border-fuchsia-600 bg-gradient-to-br from-purple-900 to-black text-white border-4",
  };

  const themeLabel = {
    classic: "Classic HBCU",
    pro: "Professional Discord",
    vibrant: "Vibrant Yard",
    myspace: "MySpace Throwback",
  };

  const demoSongs = [
    { hash: "demo-mix-1", name: "Tailgate Mix 2026", artist: "Campus King" },
    {
      hash: "demo-mix-2",
      name: "Library Chill Beats",
      artist: "Spelman Sound",
    },
  ];

  const currentSong =
    demoSongs.find((s) => s.hash === profileSong) || demoSongs[0];

  useEffect(() => {
    const target = handle || currentUser;
    const saved = localStorage.getItem("blkspace_followed") || "[]";
    const local: string[] = JSON.parse(saved);
    const merged = new Set([...local, ...remoteFollowing]);
    setIsFollowing(merged.has(target));
  }, [handle, currentUser, remoteFollowing]);

  // Real Iroh audio for profile song (if profileSong is a blob hash/CID from Tauri)
  useEffect(() => {
    if (!isTauri() || !profileSong) {
      setAudioSrc(null);
      return;
    }
    const token = getSessionToken();
    if (!token) return;
    tauriGetBlobBytes(token, profileSong)
      .then((b64) => {
        if (b64) {
          // assume audio/mpeg or from blob mime, for demo
          setAudioSrc(`data:audio/mpeg;base64,${b64}`);
        }
      })
      .catch(() => setAudioSrc(null));
  }, [profileSong]);

  // Facebook-like wall posts (mock on top of real posts)
  const wallPosts = (posts || []).slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container max-w-4xl py-8 px-4">
        {isLoading ? (
          <div className="h-64 bg-muted/50 animate-pulse rounded-2xl mb-8"></div>
        ) : user ? (
          <div
            className={
              themeClasses[profileTheme] +
              " rounded-3xl overflow-hidden shadow-xl border mb-8 transition-all"
            }
          >
            {/* Header Banner (MySpace customizable feel) */}
            <div className="h-40 bg-gradient-to-r from-primary/40 via-primary/10 to-primary/40 relative">
              <div className="absolute -bottom-14 left-8 flex items-end gap-4">
                <Avatar className="h-28 w-28 border-4 border-card ring-2 ring-primary/30">
                  <AvatarImage src={user.avatarUrl || ""} />
                  <AvatarFallback className="text-4xl bg-primary/80">
                    {user.displayName?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                {profileSong && (
                  <div className="mb-3 hidden md:block">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-75 mb-1">
                      <Music className="w-3 h-3" /> NOW PLAYING ON PROFILE
                    </div>
                    <div className="font-mono text-sm">
                      {currentSong.name} — {currentSong.artist}
                    </div>
                    {audioSrc && (
                      <audio controls src={audioSrc} className="mt-1 w-48" />
                    )}
                  </div>
                )}
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                {isOwnProfile && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setShowCustomize(!showCustomize)}
                  >
                    <Palette className="w-4 h-4 mr-1" /> Customize (MySpace)
                  </Button>
                )}
                {!isOwnProfile && (
                  <Button
                    variant={isFollowing ? "secondary" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      const target = handle || currentUser;
                      const syncLocalFollow = (nowFollowing: boolean) => {
                        const saved =
                          localStorage.getItem("blkspace_followed") || "[]";
                        let f: string[] = JSON.parse(saved);
                        if (nowFollowing) {
                          if (!f.includes(target)) f.push(target);
                        } else {
                          f = f.filter((x: string) => x !== target);
                        }
                        localStorage.setItem(
                          "blkspace_followed",
                          JSON.stringify(f),
                        );
                        setIsFollowing(nowFollowing);
                      };
                      if (isTauri()) {
                        toggleFollowMut.mutate(
                          { followedHandle: target },
                          {
                            onSuccess: (nowFollowing) => {
                              syncLocalFollow(nowFollowing);
                              toast.success(
                                nowFollowing ? "Followed" : "Unfollowed",
                              );
                            },
                            onError: (e) => toast.error(String(e)),
                          },
                        );
                        return;
                      }
                      const saved =
                        localStorage.getItem("blkspace_followed") || "[]";
                      const f: string[] = JSON.parse(saved);
                      const nowFollowing = !f.includes(target);
                      syncLocalFollow(nowFollowing);
                      toast.success(nowFollowing ? "Followed" : "Unfollowed");
                    }}
                    disabled={toggleFollowMut.isPending}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
              </div>
            </div>

            <div className="pt-16 px-8 pb-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-4xl font-bold tracking-tighter">
                    {user.displayName ?? "Unknown"}
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    @{user.handle ?? "unknown"}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>{user.university}</div>
                  <div className="flex items-center gap-1 justify-end">
                    <MapPin className="w-3.5 h-3.5" /> {user.town}
                  </div>
                </div>
              </div>

              <p className="text-lg mb-4 max-w-2xl">
                {user.bio || "No bio yet. Edit to tell your story."}
              </p>

              {/* Stats like FB + WeixBucks */}
              <div className="flex flex-wrap gap-8 py-4 border-t border-b mb-6 text-sm">
                <div>
                  <span className="font-bold text-xl">
                    {user.followersCount ?? 0}
                  </span>{" "}
                  <span className="text-muted-foreground">followers</span>
                </div>
                <div>
                  <span className="font-bold text-xl">
                    {user.followingCount ?? 0}
                  </span>{" "}
                  <span className="text-muted-foreground">following</span>
                </div>
                <div className="flex-1" />
                <div className="font-bold text-primary flex items-center gap-2 text-xl">
                  <Coins className="w-5 h-5" />{" "}
                  {user.weixBucks?.toLocaleString()} WeixBucks
                </div>
              </div>

              {/* Rich Profile Tabs: Wall (FB), Posts (Twitter), Music (MySpace), Customize */}
              <Tabs defaultValue="wall" className="mt-2">
                <TabsList className="mb-4 w-full justify-start flex-wrap h-auto">
                  <TabsTrigger value="wall">Wall (Facebook)</TabsTrigger>
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                  <TabsTrigger value="music">Music (MySpace)</TabsTrigger>
                  {isOwnProfile && (
                    <TabsTrigger value="customize">Customize</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="wall" className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Write on {user.displayName}'s
                    wall (Facebook style)
                  </div>
                  {wallPosts.length > 0 ? (
                    wallPosts.map((post: any) => (
                      <Card key={post.id} className="border-border/60">
                        <CardContent className="pt-4">
                          <SafeContent text={post.content} />
                          <div className="text-xs text-muted-foreground mt-3">
                            — {post.authorDisplayName} •{" "}
                            {new Date(post.createdAt).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-sm py-8 text-center border rounded-xl">
                      No wall posts yet. Be the first!
                    </div>
                  )}

                  {/* Visitor wall composer (real chat feel on profile) */}
                  {!isOwnProfile && (
                    <div className="mt-4 border-t pt-4">
                      <div className="text-xs text-muted-foreground mb-2">
                        Write on {user.displayName}'s wall (posts as regular
                        post for demo, future: dedicated wall_posts + approval)
                      </div>
                      <Textarea
                        placeholder="Say something nice..."
                        value={wallText}
                        onChange={(e) => setWallText(e.target.value)}
                        className="mb-2"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!wallText.trim()) return;
                          createPost.mutate({
                            content: `On @${user.handle}'s wall: ${wallText}`,
                            town_tag: user.town || selectedTown || "tsu",
                          });
                          setWallText("");
                          toast.success(
                            "Posted to wall! (will appear in their posts for now)",
                          );
                        }}
                        disabled={createPost.isPending}
                      >
                        Post to Wall
                      </Button>
                    </div>
                  )}

                  {isOwnProfile && (
                    <div className="text-xs text-center text-muted-foreground mt-4">
                      Visitors can post here in a future update.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="posts">
                  <h3 className="font-semibold mb-3">Recent Posts</h3>
                  {postsLoading ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-24 bg-muted/50 rounded-xl" />
                    </div>
                  ) : Array.isArray(posts) && posts.length ? (
                    posts.slice(0, 5).map((post: any) => (
                      <Card key={post.id} className="border-border/50">
                        <CardContent className="pt-4">
                          <SafeContent
                            text={post.content}
                            className="text-[15px]"
                          />
                          <div className="flex gap-4 text-xs mt-3 text-muted-foreground">
                            <span>❤️ {post.likesCount}</span>
                            <span>💬 {post.repliesCount}</span>
                            <Link
                              href={`/posts/${post.id}`}
                              className="hover:underline"
                            >
                              View thread →
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border rounded">
                      No posts yet.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="music">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Music className="w-8 h-8 text-primary" />
                      <div>
                        <div className="font-semibold text-xl">
                          Profile Song
                        </div>
                        <div className="text-sm text-muted-foreground">
                          MySpace classic — visitors hear your vibe
                        </div>
                      </div>
                    </div>

                    <Card className="border-primary/30">
                      <CardContent className="pt-5 pb-4">
                        <div className="font-medium mb-1">
                          {currentSong.name}
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          by {currentSong.artist}
                        </div>

                        {/* Real Iroh audio if set, else demo */}
                        <div className="bg-muted/40 p-3 rounded-lg">
                          {audioSrc ? (
                            <audio controls className="w-full" src={audioSrc}>
                              Your browser does not support the audio element.
                            </audio>
                          ) : (
                            <audio
                              controls
                              className="w-full"
                              src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                            >
                              Your browser does not support the audio element.
                            </audio>
                          )}
                          <p className="text-[10px] text-center mt-2 text-muted-foreground">
                            Profile song — powered by Iroh blobs when uploaded
                          </p>
                        </div>

                        {isOwnProfile && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {demoSongs.map((song) => (
                              <Button
                                key={song.hash}
                                size="sm"
                                variant={
                                  profileSong === song.hash
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() => setProfileSong(song.hash)}
                              >
                                Set as profile song: {song.name}
                              </Button>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                toast(
                                  "Connect to your Media uploads to pick real audio",
                                )
                              }
                            >
                              Browse my media...
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {isOwnProfile && (
                  <TabsContent value="customize">
                    <Card>
                      <CardHeader>
                        <CardTitle>MySpace Customization</CardTitle>
                        <CardDescription>
                          Spend WeixBucks later to unlock more themes & layouts.
                          This is fully client-side for now.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <div className="text-sm font-medium mb-2">
                            Profile Theme
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(
                              ["classic", "pro", "vibrant", "myspace"] as const
                            ).map((t) => (
                              <Button
                                key={t}
                                variant={
                                  profileTheme === t ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setProfileTheme(t)}
                              >
                                {themeLabel[t]}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Real version will store theme + music CID on your
                          Nostr profile (or Iroh blob) and let visitors see your
                          custom page.
                        </div>
                        <Button
                          onClick={() => {
                            setProfileTheme("classic");
                            setProfileSong(null);
                            toast("Customization reset");
                          }}
                        >
                          Reset to default
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            Profile not found.
          </div>
        )}
      </main>
    </div>
  );
}
