import { AppShell } from "@/components/layout/AppShell";
import { PostComposer } from "@/components/social/PostComposer";
import { StoryStrip } from "@/components/social/StoryStrip";
import { WatchFeed } from "@/components/feed/WatchFeed";
import { ReadFeed } from "@/components/feed/ReadFeed";
import { BridgeFeed } from "@/components/feed/BridgeFeed";
import { KarmaBadge } from "@/components/economy/KarmaBadge";
import {
  showPostEarnCelebration,
  showEarnFromResult,
} from "@/components/economy/EarnToast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart, MessageSquare, Repeat2, MoreHorizontal, BadgeCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SafeContent } from "@/components/ui/safe-content";
import { SignatureBadge } from "@/components/ui/signature-badge";
import { RiskBadge } from "@/components/ui/risk-badge";
import { ConsensusBadge } from "@/components/ui/consensus-badge";
import { MediaDisplay } from "@/components/ui/media-display";
import { getListPostsQueryKey } from "@workspace/api-client-react";
import {
  useAppListPosts,
  useAppGetTrendingFeed,
  useAppCreatePost,
  useAppToggleLike,
  useTauriCombinedFeed,
  useAppSendWeixBucks,
  useTauriGetFollowing,
  useTauriRepostPost,
  useTauriFollowingReposts,
} from "@/hooks/use-app-data";
import { getCurrentHandle } from "@/lib/auth";
import { useGuestMode } from "@/lib/guest-mode";
import { useRequiresWallet } from "@/hooks/use-requires-wallet";
import { GuestCTA } from "@/components/social/GuestCTA";
import { isTauri, type TauriCrossTownEvent } from "@/lib/tauri-api";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function FeedPage() {
  const queryClient = useQueryClient();
  const { isGuest } = useGuestMode();
  const { requireWallet } = useRequiresWallet();
  const [activeTab, setActiveTab] = useState("watch");
  const [selectedTown, setSelectedTown] = useState("tsu");
  const [content, setContent] = useState("");
  const [mediaHashes, setMediaHashes] = useState<string[]>([]);
  const [showFlagged, setShowFlagged] = useState(false);
  const [bridgeTownFilter, setBridgeTownFilter] = useState("all");
  const [expandedBadges, setExpandedBadges] = useState<Record<number | string, boolean>>({});
  const [localFollowed, setLocalFollowed] = useState<string[]>(() => {
    const saved = localStorage.getItem("blkspace_followed") || "[]";
    return JSON.parse(saved);
  });
  // Real kind 3 for feeds: load follows from backend (which can be backed by kind 3 relay query in future)
  const { data: remoteFollowing = [] } = useTauriGetFollowing();
  const followedHandles = Array.from(
    new Set([...(localFollowed || []), ...(remoteFollowing || [])]),
  );

  const { data: localPosts, isLoading: localLoading } = useAppListPosts(
    selectedTown,
    getCurrentHandle(),
  );
  const { data: trendingFeed, isLoading: trendingLoading } =
    useAppGetTrendingFeed(getCurrentHandle());
  const bridgeTownArg =
    bridgeTownFilter === "all" ? undefined : bridgeTownFilter;
  const { data: crossTownFeed, isLoading: crossTownLoading } =
    useTauriCombinedFeed(
      activeTab === "bridge" ? bridgeTownArg : selectedTown,
    );
  const createPost = useAppCreatePost();
  const toggleLike = useAppToggleLike();
  const sendWeixBucks = useAppSendWeixBucks();
  const repostPost = useTauriRepostPost();
  const { data: followingReposts = [] } = useTauriFollowingReposts(
    isTauri() && followedHandles.length > 0,
  );

  const followingPosts = useMemo(() => {
    const posts = (localPosts || [])
      .filter((p: any) => followedHandles.includes(p.authorHandle))
      .map((p: any) => ({
        ...p,
        _feedKind: "post" as const,
        _sortAt: p.createdAt,
      }));
    const reposts = followingReposts.map((r) => ({
      ...r.post,
      _feedKind: "repost" as const,
      _sortAt: r.repostedAt,
      _reposterHandle: r.reposterHandle,
      _reposterDisplayName: r.reposterDisplayName,
    }));
    return [...posts, ...reposts]
      .sort(
        (a: any, b: any) =>
          new Date(b._sortAt).getTime() - new Date(a._sortAt).getTime(),
      )
      .slice(0, 12);
  }, [localPosts, followedHandles, followingReposts]);

  const fypRankScore = (p: {
    likesCount?: number;
    engagementQuality?: number;
    maliciousScore?: number;
  }) =>
    (p.likesCount || 0) *
    (p.engagementQuality || 1) *
    (1 - (p.maliciousScore || 0));

  const isHighRisk = (p: {
    riskLevel?: string;
    maliciousScore?: number;
  }) =>
    p.riskLevel === "high" || (p.maliciousScore ?? 0) > 0.7;

  // FYP: rank by engagement × quality × (1 − MIDF); demote high-risk posts
  const fypPosts = [...(trendingFeed || []), ...(localPosts || [])]
    .filter((p: any) => !isHighRisk(p))
    .sort(
      (a: any, b: any) => fypRankScore(b) - fypRankScore(a),
    )
    .slice(0, 12)
    .map((p: any) => ({ ...p }));

  const handleSubmit = () => {
    if (!requireWallet("post")) return;
    if (!content.trim()) return;
    const offline = isTauri() && !navigator.onLine;
    createPost.mutate(
      {
        content,
        town_tag: selectedTown,
        media_hashes: mediaHashes.length > 0 ? mediaHashes : undefined,
      },
      {
        onSuccess: (result: any) => {
          setContent("");
          setMediaHashes([]);
          if (offline) {
            toast.success("Post queued — will sync when you're back online");
          } else if (result?.earn) {
            showPostEarnCelebration(result.earn);
          }
          queryClient.invalidateQueries({ queryKey: ["tauri", "user"] });
          queryClient.invalidateQueries({ queryKey: ["tauri", "posts"] });
          queryClient.invalidateQueries({
            queryKey: getListPostsQueryKey({ town: selectedTown }),
          });
        },
      },
    );
  };

  const handleLike = (postId: number) => {
    if (!requireWallet("like posts")) return;
    toggleLike.mutate(
      { postId },
      {
        onSuccess: (result: any) => {
          if (result?.liked && result?.authorEarn?.wb > 0 && result?.authorHandle) {
            showEarnFromResult(
              result.authorEarn,
              `@${result.authorHandle} earned from your like`,
            );
          }
          queryClient.invalidateQueries({ queryKey: ["tauri", "posts"] });
          queryClient.invalidateQueries({ queryKey: ["tauri", "user"] });
          queryClient.invalidateQueries({
            queryKey: getListPostsQueryKey({ town: selectedTown }),
          });
        },
      },
    );
  };

  const handleRepost = (postId: number) => {
    if (!requireWallet("repost")) return;
    if (!isTauri()) {
      toast("Repost requires the Tauri app");
      return;
    }
    repostPost.mutate(postId, {
      onSuccess: (result) => {
        if (result.reposted) {
          toast.success("Reposted to your followers");
        } else {
          toast.info("You already reposted this");
        }
        queryClient.invalidateQueries({ queryKey: ["tauri", "posts"] });
      },
      onError: (e) => toast.error(String(e)),
    });
  };

  const handleBoost = (item: any) => {
    if (!requireWallet("boost posts")) return;
    if (!item?.authorHandle) {
      toast.error("Cannot boost this post");
      return;
    }
    sendWeixBucks.mutate(
      { toHandle: item.authorHandle, amount: 5 },
      {
        onSuccess: () => {
          toast.success(`Boosted @${item.authorHandle} with 5 WeixBucks!`);
          // Refresh feeds to reflect any engagement/quality updates
          queryClient.invalidateQueries({ queryKey: ["tauri", "posts"] });
          queryClient.invalidateQueries({
            queryKey: getListPostsQueryKey({ town: selectedTown }),
          });
          queryClient.invalidateQueries({ queryKey: ["tauri", "trending"] });
        },
        onError: (e) => toast.error(String(e)),
      },
    );
  };

  const filterFlagged = (list: any[]) =>
    showFlagged ? list : list.filter((p: any) => !isHighRisk(p));

  // Select data source based on tab for Twitter (Following) + IG FYP (For You) + classic local
  let posts: any[] = [];
  let isLoading = false;

  if (activeTab === "watch" || activeTab === "read") {
    posts = fypPosts;
    isLoading = trendingLoading || localLoading;
  } else if (activeTab === "following") {
    posts = filterFlagged(followingPosts as any[]);
    isLoading = localLoading;
  } else if (activeTab === "local") {
    posts = filterFlagged(localPosts || []);
    isLoading = localLoading;
  } else if (activeTab === "bridge") {
    posts = [];
    isLoading = crossTownLoading;
  } else {
    posts = filterFlagged(trendingFeed || []);
    isLoading = trendingLoading;
  }

  const composerPlaceholder =
    activeTab === "following"
      ? "Share with your people..."
      : activeTab === "watch"
        ? "Caption your reel — TikTok FYP"
        : activeTab === "read"
          ? "Short thread — Twitter / Threads style"
          : "What's happening on the yard?";

  return (
    <AppShell>
      <Tabs
        defaultValue="watch"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          {(activeTab === "following" ||
            activeTab === "local" ||
            activeTab === "trending" ||
            activeTab === "bridge") && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showFlagged}
                onChange={(e) => setShowFlagged(e.target.checked)}
                className="rounded border-border"
              />
              Show flagged content (MIDF &gt; 0.7)
            </label>
          )}
        </div>

        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-6 mb-4 h-11">
          <TabsTrigger value="watch" className="text-xs sm:text-sm font-bold">
            Watch
          </TabsTrigger>
          <TabsTrigger value="read" className="text-xs sm:text-sm font-bold">
            Read
          </TabsTrigger>
          <TabsTrigger value="following" className="text-xs sm:text-sm font-bold">
            Following
          </TabsTrigger>
          <TabsTrigger value="bridge" className="text-xs sm:text-sm font-bold">
            Bridge
          </TabsTrigger>
          <TabsTrigger value="local" className="text-xs sm:text-sm font-bold hidden sm:flex">
            Local
          </TabsTrigger>
          <TabsTrigger
            value="trending"
            className="text-xs sm:text-sm font-bold hidden lg:flex"
          >
            Trending
          </TabsTrigger>
        </TabsList>

        {(activeTab === "watch" || activeTab === "read") && <StoryStrip />}

        {activeTab !== "bridge" &&
          (isGuest ? (
            <GuestCTA
              compact
              message="Create a free account to post, share media, and start earning WeixBucks on your yard."
            />
          ) : (
            <>
              {/* Desktop: inline composer */}
              <div className="hidden md:block">
                <PostComposer
                  content={content}
                  onContentChange={setContent}
                  selectedTown={selectedTown}
                  onTownChange={setSelectedTown}
                  mediaHashes={mediaHashes}
                  onMediaHashesChange={setMediaHashes}
                  onSubmit={handleSubmit}
                  isSubmitting={createPost.isPending}
                  onUploadSuccess={(earn) => showEarnFromResult(earn, "Media upload")}
                  placeholder={composerPlaceholder}
                />
              </div>
              {/* Mobile: FAB → modal composer */}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="md:hidden fixed right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center"
                    style={{ bottom: "5.5rem" }}
                    aria-label="Create post"
                  >
                    <Heart className="w-6 h-6 rotate-45" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>New post</DialogTitle>
                  </DialogHeader>
                  <PostComposer
                    content={content}
                    onContentChange={setContent}
                    selectedTown={selectedTown}
                    onTownChange={setSelectedTown}
                    mediaHashes={mediaHashes}
                    onMediaHashesChange={setMediaHashes}
                    onSubmit={handleSubmit}
                    isSubmitting={createPost.isPending}
                    onUploadSuccess={(earn) => showEarnFromResult(earn, "Media upload")}
                    placeholder={composerPlaceholder}
                  />
                </DialogContent>
              </Dialog>
            </>
          ))}

          <TabsContent value="watch">
            <div className="bg-accent/10 text-accent-foreground p-3 rounded-xl mb-4 text-xs font-medium border border-accent/20">
              TikTok Watch — vertical FYP ranked by engagement × quality
            </div>
          </TabsContent>

          <TabsContent value="read">
            <div className="bg-primary/10 text-primary p-3 rounded-xl mb-4 text-xs font-medium border border-primary/20">
              Threads / Twitter Read — text-first discovery feed
            </div>
          </TabsContent>

          <TabsContent value="following">
            <div className="bg-primary/10 text-primary-foreground p-4 rounded-xl mb-6 text-sm font-medium border border-primary/20">
              Following — Twitter-style chronological feed from accounts you
              follow. Pure, unfiltered from your circle.
            </div>
          </TabsContent>

          <TabsContent value="local">
            <div className="bg-secondary/30 p-4 rounded-xl mb-6 text-sm">
              Your local yard feed. Focused on{" "}
              <strong>{selectedTown.toUpperCase()}</strong> community posts.
            </div>
          </TabsContent>

          <TabsContent value="bridge" />

          <TabsContent value="trending">
            <div className="bg-accent/10 text-accent-foreground p-4 rounded-xl mb-6 text-sm font-medium border border-accent/20">
              Showing the most active discussions across all connected yards and
              relays.
            </div>
          </TabsContent>
        </Tabs>

        {activeTab === "bridge" ? (
          <BridgeFeed
            events={crossTownFeed || []}
            isLoading={crossTownLoading}
            townFilter={bridgeTownFilter}
            onTownFilterChange={setBridgeTownFilter}
            showFlagged={showFlagged}
          />
        ) : isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-40 bg-muted/50"></Card>
            ))}
          </div>
        ) : activeTab === "watch" ? (
          <WatchFeed posts={posts} onLike={handleLike} />
        ) : activeTab === "read" ? (
          <ReadFeed
            posts={posts}
            onLike={handleLike}
            onRepost={handleRepost}
          />
        ) : (
          <div className="space-y-4">
            {!Array.isArray(posts) && (
              <div className="text-center py-12 text-muted-foreground">
                Could not load posts. Check your connection and try again.
              </div>
            )}
            {Array.isArray(posts) && posts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {activeTab === "bridge"
                  ? "No cross-town events found. Connect to relays and subscribe to towns in the Network tab."
                  : activeTab === "following"
                    ? "No posts from people you follow yet. Follow more yards or post something!"
                    : "No posts yet. Be the first to spark the conversation!"}
              </div>
            )}
            {Array.isArray(posts) &&
              posts.map((item: any) => {
                const isCrossTown = "pubkey" in item && "eventId" in item;
                const crossTownItem = item as TauriCrossTownEvent;
                const isRepost = item._feedKind === "repost";
                const displayContent = item.content;

                return (
                  <Card
                    key={item.id}
                    className="hover:bg-muted/30 transition-colors border-border/50"
                    style={{ contentVisibility: "auto", containIntrinsicSize: "180px" }}
                  >
                    {isRepost && (
                      <div className="px-4 pt-3 text-xs text-green-500 flex items-center gap-1.5">
                        <Repeat2 className="w-3 h-3" />{" "}
                        {(item as any)._reposterDisplayName ||
                          (item as any)._reposterHandle}{" "}
                        reposted
                      </div>
                    )}
                    <CardHeader className="pb-2 flex flex-row items-start gap-4">
                      <Avatar className="h-12 w-12 border border-primary/20">
                        <AvatarFallback>
                          {isCrossTown
                            ? "🌉"
                            : (item as any).authorDisplayName?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-base flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-bold">
                            {isCrossTown
                              ? `${crossTownItem.pubkey.slice(0, 8)}…${crossTownItem.pubkey.slice(-4)}`
                              : (item as any).authorDisplayName}
                          </span>
                          <div className="flex items-center gap-1.5 ml-auto">
                            {(isCrossTown || (!isCrossTown && (item as any).nostrEventId)) && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedBadges((p) => ({
                                    ...p,
                                    [item.id]: !p[item.id],
                                  }))
                                }
                                className="text-muted-foreground hover:text-primary transition-colors"
                                aria-label="Security verification"
                              >
                                <BadgeCheck className="w-4 h-4" />
                              </button>
                            )}
                            {expandedBadges[item.id] && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {!isCrossTown && (
                                  <RiskBadge
                                    riskLevel={(item as any).riskLevel}
                                    maliciousScore={(item as any).maliciousScore}
                                  />
                                )}
                                {isCrossTown && (
                                  <>
                                    <RiskBadge
                                      riskLevel={crossTownItem.riskLevel}
                                      maliciousScore={crossTownItem.maliciousScore}
                                    />
                                    <ConsensusBadge
                                      consensusValid={crossTownItem.consensusValid}
                                      consensusAgreement={
                                        crossTownItem.consensusAgreement
                                      }
                                    />
                                  </>
                                )}
                                {!isCrossTown && (item as any).nostrEventId && (
                                  <SignatureBadge
                                    eventId={(item as any).nostrEventId}
                                  />
                                )}
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                item.createdAt ||
                                  crossTownItem.createdAtUnix * 1000,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </CardTitle>
                        <div className="text-sm text-muted-foreground flex gap-2 items-center mt-1">
                          {isCrossTown && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              ⛓️{" "}
                              {crossTownItem.relayUrl
                                ?.replace("wss://", "")
                                .slice(0, 20)}
                            </span>
                          )}
                          {!isCrossTown && (
                            <span>@{(item as any).authorHandle}</span>
                          )}
                          <span>•</span>
                          <span className="text-primary font-medium">
                            {isCrossTown
                              ? crossTownItem.townTag || "unknown"
                              : (item as any).townTag}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pl-20 pb-2">
                      <SafeContent
                        text={displayContent}
                        className="text-[17px]"
                      />
                      <MediaDisplay hashes={(item as any).mediaBlobs || []} />
                    </CardContent>
                    <CardFooter className="pl-20 pt-2 flex gap-6 text-sm text-muted-foreground border-none">
                      <Link href={`/posts/${item.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 gap-2 hover:text-primary hover:bg-primary/10"
                        >
                          <MessageSquare className="w-4 h-4" />{" "}
                          {(item as any).repliesCount || 0}
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 gap-2 hover:text-green-500 hover:bg-green-500/10"
                        onClick={() =>
                          !isCrossTown && handleRepost(Number(item.id))
                        }
                        disabled={isCrossTown || repostPost.isPending}
                      >
                        <Repeat2 className="w-4 h-4" /> {item.repostsCount || 0}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 gap-2 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleLike(item.id)}
                      >
                        <Heart
                          className={`w-4 h-4 ${item.liked ? "fill-current text-destructive" : ""}`}
                        />{" "}
                        {item.likesCount || 0}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:text-foreground"
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleBoost(item)}
                            disabled={isCrossTown}
                          >
                            <Repeat2 className="w-3.5 h-3.5 mr-2" />
                            Boost (5 WB)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {isCrossTown && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          Synced from relay
                        </span>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
          </div>
        )}
    </AppShell>
  );
}
