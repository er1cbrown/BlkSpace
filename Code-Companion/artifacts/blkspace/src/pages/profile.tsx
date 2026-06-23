import { AppShell } from "@/components/layout/AppShell";
import { useRoute } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { useState, useEffect, useMemo, useRef } from "react";
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
  Store,
  BookOpen,
  Disc3,
} from "lucide-react";
import { Link } from "wouter";
import {
  useAppGetUser,
  useAppGetUserPosts,
  useAppCreatePost,
  useTauriToggleFollow,
  useTauriGetFollowing,
  useTauriUpdateProfileCustomization,
} from "@/hooks/use-app-data";
import { SafeContent } from "@/components/ui/safe-content";
import { MediaDisplay } from "@/components/ui/media-display";
import { getCurrentHandle, getSessionToken, getStoredPubkey } from "@/lib/auth";
import { useGuestMode } from "@/lib/guest-mode";
import { useRequiresWallet } from "@/hooks/use-requires-wallet";
import {
  isTauri,
  tauriGetBlobBytes,
  tauriListUserBlobs,
  type TauriBlobInfo,
} from "@/lib/tauri-api";
import { toast } from "sonner";
import { ProfileGrid } from "@/components/profile/ProfileGrid";
import { ProfileRelayList } from "@/components/profile/ProfileRelayList";
import { TopFriends, type TopFriend } from "@/components/profile/TopFriends";
import { ProProfileTab } from "@/components/profile/ProProfileTab";
import { ProfileMusicPlayer } from "@/components/profile/ProfileMusicPlayer";
import { KarmaBadge } from "@/components/economy/KarmaBadge";
import {
  useTauriUpdateProProfile,
  useTauriUpdateTopFriends,
  useTauriListWallPosts,
  useTauriCreateWallPost,
  useTauriApproveWallPost,
} from "@/hooks/use-app-data";
import { showEarnFromResult } from "@/components/economy/EarnToast";
import { Badge } from "@/components/ui/badge";

type ThemeKey = "classic" | "pro" | "vibrant" | "myspace";

function themeKeyFromId(id: number): ThemeKey {
  if (id === 1) return "pro";
  if (id === 2) return "vibrant";
  if (id === 3) return "myspace";
  return "classic";
}

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:handle");
  const handle = params?.handle || "";

  const { isGuest } = useGuestMode();
  const { requireWallet } = useRequiresWallet();
  const currentUser = getCurrentHandle();
  const isOwnProfile = !isGuest && (handle === currentUser || !handle);

  const { data: user, isLoading } = useAppGetUser(handle || currentUser);
  const { data: posts, isLoading: postsLoading } = useAppGetUserPosts(
    handle || currentUser,
    currentUser,
  );
  const createPost = useAppCreatePost();
  const toggleFollowMut = useTauriToggleFollow();
  const updateCustomization = useTauriUpdateProfileCustomization();
  const updateProProfile = useTauriUpdateProProfile();
  const updateTopFriends = useTauriUpdateTopFriends();
  const { data: wallPostsApi = [] } = useTauriListWallPosts(handle || currentUser);
  const createWallPost = useTauriCreateWallPost();
  const approveWallPost = useTauriApproveWallPost();
  const { data: remoteFollowing = [] } = useTauriGetFollowing(
    isTauri() && !isOwnProfile,
  );

  const [profileTheme, setProfileTheme] = useState<ThemeKey>("classic");
  const [profileSong, setProfileSong] = useState<string | null>(null);
  const [audioBlobs, setAudioBlobs] = useState<TauriBlobInfo[]>([]);
  const [profileTab, setProfileTab] = useState("grid");
  const profileTabsRef = useRef<HTMLDivElement>(null);
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
    myspace: "MyYard Classic",
  };

  const currentSongBlob = audioBlobs.find((b) => b.hash === profileSong);

  const profilePubkey = useMemo(() => {
    const fromUser = user?.pubkey?.trim() ?? "";
    if (fromUser.length === 64) return fromUser;
    if (isOwnProfile) {
      const stored = getStoredPubkey()?.trim() ?? "";
      if (stored.length === 64) return stored;
    }
    return "";
  }, [user?.pubkey, isOwnProfile]);

  useEffect(() => {
    if (!user) return;
    setProfileTheme(themeKeyFromId((user as any).themeId ?? 0));
    const mh = (user as any).musicHash as string | undefined;
    setProfileSong(mh && mh.length > 0 ? mh : null);
  }, [user]);

  useEffect(() => {
    if (!isTauri()) return;
    const token = getSessionToken();
    if (!token) return;
    tauriListUserBlobs(token)
      .then((blobs) =>
        setAudioBlobs(blobs.filter((b) => b.mimeType.startsWith("audio/"))),
      )
      .catch(() => setAudioBlobs([]));
  }, [isOwnProfile, user?.handle]);

  const saveCustomization = (theme: ThemeKey, music: string | null) => {
    setProfileTheme(theme);
    setProfileSong(music);
    if (!isTauri()) {
      toast.success("Saved locally (web preview mode)");
      return;
    }
    updateCustomization.mutate(
      { theme, musicHash: music || "" },
      {
        onSuccess: () =>
          toast.success("Profile theme & music saved to DB + Nostr kind 0"),
        onError: (e) => toast.error(String(e)),
      },
    );
  };

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

  const topFriends: TopFriend[] = (() => {
    try {
      return JSON.parse((user as any)?.topFriendsJson || "[]");
    } catch {
      return [];
    }
  })();

  const pendingWallPosts = isTauri()
    ? wallPostsApi.filter((p) => !p.approved)
    : [];
  const approvedWallPosts = isTauri()
    ? wallPostsApi.filter((p) => p.approved)
    : wallPostsApi.length > 0
      ? wallPostsApi
      : (posts || []).slice(0, 3);

  return (
    <AppShell wide>
        {isLoading ? (
          <div className="h-64 bg-muted/50 animate-pulse rounded-2xl mb-8"></div>
        ) : user ? (
          <div
            className={
              themeClasses[profileTheme] +
              " rounded-3xl overflow-hidden shadow-xl border mb-8 transition-all"
            }
          >
            {/* Header Banner (MyYard customizable feel) */}
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
                    <ProfileMusicPlayer
                      hash={profileSong}
                      src={audioSrc}
                      trackName={
                        currentSongBlob?.filename ||
                        (profileSong ? `${profileSong.slice(0, 8)}…` : "Profile song")
                      }
                      subtitle="Now playing"
                      compact
                    />
                  </div>
                )}
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                {isOwnProfile && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setProfileTab("customize");
                      profileTabsRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                  >
                    <Palette className="w-4 h-4 mr-1" /> Customize MyYard
                  </Button>
                )}
                {!isOwnProfile && (
                  <Button
                    variant={isFollowing ? "secondary" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      if (!requireWallet("follow creators")) return;
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
                  {user.weixBucks?.toLocaleString()} WB
                </div>
                <KarmaBadge
                  postKarma={(user as any).postKarma ?? 0}
                  commentKarma={(user as any).commentKarma ?? 0}
                />
              </div>

              <ProfileRelayList
                pubkey={profilePubkey}
                isOwnProfile={isOwnProfile}
                displayName={user.displayName ?? user.handle ?? "User"}
              />

              <div className="mb-6">
                <TopFriends
                  friends={topFriends}
                  editable={isOwnProfile}
                  onEdit={() => {
                    const handles = prompt(
                      "Top friends (comma handles)",
                      topFriends.map((f) => f.handle).join(","),
                    );
                    if (!handles) return;
                    const next = handles.split(",").map((h, i) => ({
                      handle: h.trim(),
                      label: h.trim().split("_")[0] || `Friend ${i + 1}`,
                    }));
                    if (isTauri()) {
                      updateTopFriends.mutate(JSON.stringify(next));
                    }
                    toast.success("Top friends updated");
                  }}
                />
              </div>

              <div ref={profileTabsRef}>
              <Tabs
                value={profileTab}
                onValueChange={setProfileTab}
                className="mt-2"
              >
                <TabsList className="mb-4 w-full justify-start flex-wrap h-auto">
                  <TabsTrigger value="grid">Grid (IG)</TabsTrigger>
                  <TabsTrigger value="wall">Wall (FB)</TabsTrigger>
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                  <TabsTrigger value="pro">Pro</TabsTrigger>
                  <TabsTrigger value="music">Music</TabsTrigger>
                  {isOwnProfile && (
                    <TabsTrigger value="customize">MyYard</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="grid">
                  <ProfileGrid
                    posts={(posts as any) || []}
                    handle={user.handle}
                  />
                </TabsContent>

                <TabsContent value="pro">
                  <ProProfileTab
                    initialJson={(user as any).proProfileJson}
                    isOwn={isOwnProfile}
                    onSave={(json) => {
                      if (isTauri()) updateProProfile.mutate(json);
                      else toast.success("Saved locally (web preview)");
                    }}
                  />
                </TabsContent>

                <TabsContent value="wall" className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Write on {user.displayName}'s
                    wall (Facebook style)
                  </div>

                  {isOwnProfile && isTauri() && pendingWallPosts.length > 0 && (
                    <div className="space-y-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        Pending approval ({pendingWallPosts.length})
                      </p>
                      {pendingWallPosts.map((post) => (
                        <Card
                          key={post.id}
                          className="border-amber-500/20 bg-background/80"
                        >
                          <CardContent className="pt-4">
                            <SafeContent text={post.content} />
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                              <span className="text-xs text-muted-foreground">
                                @{post.authorHandle} •{" "}
                                {new Date(post.createdAt).toLocaleDateString()}
                              </span>
                              <Button
                                size="sm"
                                disabled={approveWallPost.isPending}
                                onClick={() =>
                                  approveWallPost.mutate(post.id, {
                                    onSuccess: (result) => {
                                      if (result.approved && result.earn) {
                                        showEarnFromResult(
                                          result.earn,
                                          "Wall post approved",
                                        );
                                      }
                                    },
                                    onError: (e) => toast.error(String(e)),
                                  })
                                }
                              >
                                Approve
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {approvedWallPosts.length > 0 ? (
                    approvedWallPosts.map((post: any) => (
                      <Card key={post.id} className="border-border/60">
                        <CardContent className="pt-4">
                          <SafeContent text={post.content} />
                          <div className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                            <span>
                              — {post.authorDisplayName ?? post.authorHandle} •{" "}
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                            {post.approved === false && (
                              <Badge variant="outline" className="text-[10px]">
                                Pending
                              </Badge>
                            )}
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
                  {!isOwnProfile && !isGuest && (
                    <div className="mt-4 border-t pt-4">
                      <div className="text-xs text-muted-foreground mb-2">
                        Write on {user.displayName}'s wall — posts await owner
                        approval before appearing publicly.
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
                          if (isTauri()) {
                            createWallPost.mutate(
                              {
                                wallOwner: handle || currentUser,
                                content: wallText.trim(),
                              },
                              {
                                onSuccess: (result) => {
                                  setWallText("");
                                  if (result.wallPost.approved && result.earn) {
                                    showEarnFromResult(
                                      result.earn,
                                      "Wall post published",
                                    );
                                  } else {
                                    toast.success(
                                      "Wall post submitted — awaiting approval",
                                    );
                                  }
                                },
                              },
                            );
                            return;
                          }
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

                  {isOwnProfile && pendingWallPosts.length === 0 && (
                    <div className="text-xs text-center text-muted-foreground mt-4">
                      Visitors can write on your wall — you approve before they
                      go live.
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
                          MyYard classic — visitors hear your vibe
                        </div>
                      </div>
                    </div>

                    <Card className="border-primary/30">
                      <CardContent className="pt-5 pb-4">
                        <div className="font-medium mb-1">
                          {currentSongBlob?.filename ||
                            (profileSong ? "Uploaded track" : "No song set")}
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          {profileSong
                            ? `hash ${profileSong.slice(0, 12)}…`
                            : "Upload audio on Media to set your profile song"}
                        </div>

                        {/* Real Iroh audio if set, else demo */}
                        <div className="bg-muted/40 p-3 rounded-lg">
                          <ProfileMusicPlayer
                            hash={profileSong}
                            src={audioSrc}
                            trackName={
                              currentSongBlob?.filename ||
                              (profileSong ? "Uploaded track" : null) ||
                              "Demo track"
                            }
                            subtitle={
                              profileSong
                                ? "Your profile song"
                                : "Demo — upload to set yours"
                            }
                          />
                          <p className="text-[10px] text-center mt-2 text-muted-foreground">
                            Profile song — powered by Iroh blobs when uploaded
                          </p>
                        </div>

                        {isOwnProfile && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {audioBlobs.length === 0 ? (
                              <p className="text-sm text-muted-foreground w-full">
                                Upload audio on the Media page to set a profile
                                song.
                              </p>
                            ) : (
                              audioBlobs.map((blob) => (
                                <Button
                                  key={blob.hash}
                                  size="sm"
                                  variant={
                                    profileSong === blob.hash
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    saveCustomization(profileTheme, blob.hash)
                                  }
                                  disabled={updateCustomization.isPending}
                                >
                                  {profileSong === blob.hash ? "✓ " : ""}
                                  {blob.filename}
                                </Button>
                              ))
                            )}
                            {profileSong && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  saveCustomization(profileTheme, null)
                                }
                                disabled={updateCustomization.isPending}
                              >
                                Clear profile song
                              </Button>
                            )}
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
                        <CardTitle>MyYard</CardTitle>
                        <CardDescription>
                          Your creator space — themes, music, and optional
                          modules. Visitors browse your Grid; you sell from Yard
                          Sale in Wallet.
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
                                onClick={() =>
                                  saveCustomization(t, profileSong)
                                }
                                disabled={updateCustomization.isPending}
                              >
                                {themeLabel[t]}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 pt-2 border-t">
                          <div className="text-sm font-medium">
                            Yard modules (opt-in)
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Each creator chooses what appears on their MyYard.
                            Campus yards stay independent — TSU norms ≠ your
                            personal modules.
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Card className="border-dashed border-primary/30">
                              <CardContent className="pt-4 pb-4 space-y-2">
                                <div className="flex items-center gap-2 font-medium text-sm">
                                  <Disc3 className="w-4 h-4 text-primary" />
                                  Logos Deck
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Scripture mixes & sermon sets — DJ-style deck
                                  for your yard. Phase 5; publish mixes via Yard
                                  Sale today.
                                </p>
                                <Badge variant="outline" className="text-[10px]">
                                  Coming — opt-in
                                </Badge>
                              </CardContent>
                            </Card>
                            <Card className="border-dashed border-primary/30">
                              <CardContent className="pt-4 pb-4 space-y-2">
                                <div className="flex items-center gap-2 font-medium text-sm">
                                  <BookOpen className="w-4 h-4 text-primary" />
                                  Bible NLP
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  On-device study tags & verse tools — separate
                                  from FYP; never injected without consent.
                                </p>
                                <Badge variant="outline" className="text-[10px]">
                                  Coming — opt-in
                                </Badge>
                              </CardContent>
                            </Card>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/wallet">
                              <Store className="w-4 h-4 mr-1" />
                              Open Yard Sale (sell from MyYard)
                            </Link>
                          </Button>
                        </div>

                        <Button
                          onClick={() => saveCustomization("classic", null)}
                          disabled={updateCustomization.isPending}
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
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            Profile not found.
          </div>
        )}
    </AppShell>
  );
}
