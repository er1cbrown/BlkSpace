import React, { useState, useMemo, Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PostComposer } from "@/components/social/PostComposer";

const StoryStrip = React.lazy(() =>
  import("@/components/social/StoryStrip").then((m) => ({
    default: m.StoryStrip,
  })),
);
const ConnectDiscoveryRail = React.lazy(() =>
  import("@/components/social/ConnectDiscoveryRail").then((m) => ({
    default: m.ConnectDiscoveryRail,
  })),
);
const WatchFeed = React.lazy(() =>
  import("@/components/feed/WatchFeed").then((m) => ({
    default: m.WatchFeed,
  })),
);
const ReadFeed = React.lazy(() =>
  import("@/components/feed/ReadFeed").then((m) => ({
    default: m.ReadFeed,
  })),
);
const BridgeFeed = React.lazy(() =>
  import("@/components/feed/BridgeFeed").then((m) => ({
    default: m.BridgeFeed,
  })),
);
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, MessageSquare, Repeat2, MoreHorizontal } from "lucide-react";
import { ShareCardButton } from "@/components/social/ShareCardButton";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SafeContent } from "@/components/ui/safe-content";
import { TrustChip } from "@/components/ui/trust-chip";
import { MediaDisplay } from "@/components/ui/media-display";
import { BLoader } from "@/components/brand/BLoader";
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
} from "@/hooks/use-feed-data";
import { getCurrentHandle } from "@/lib/auth";
import { useGuestMode } from "@/lib/guest-mode";
import { useRequiresWallet } from "@/hooks/use-requires-wallet";
import { GuestCTA } from "@/components/social/GuestCTA";
import { isTauri, type TauriCrossTownEvent } from "@/lib/tauri-api";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BETA_FEATURES } from "@/lib/beta-features";
import { getHomeYardId, loadFocusPrefs } from "@/lib/focus-mode";
import { HeartPulse, GraduationCap, Briefcase, BookOpen } from "lucide-react";
import { YardOrientationCard } from "@/components/social/YardOrientationCard";
import { markFirstPostDone } from "@/lib/yard-orientation";
import { getYardTheme } from "@/lib/yard-themes";
import { rankBlogFypPosts, isHighRiskPost } from "@/lib/blog-fyp";
import { loadUiPrefs } from "@/lib/ui-prefs";
import {
  disciplineUpliftLine,
  getDisciplineTrack,
} from "@/lib/discipline-track";

/** Primary product tabs — BKSPC University feed IA */
type FeedTab =
  | "following"
  | "local"
  | "blog"
  | "connect"
  | "watch"
  | "bridge"
  | "trending"
  /** legacy alias mapped to blog */
  | "read";

export default function FeedPage() {
  const queryClient = useQueryClient();
  const { isGuest } = useGuestMode();
  const { requireWallet } = useRequiresWallet();
  const [activeTab, setActiveTab] = useState<FeedTab>(() =>
    BETA_FEATURES.tier0Lite ? "local" : "local",
  );
  const [selectedTown, setSelectedTown] = useState(
    () => getHomeYardId() || "tsu",
  );
  const focusPrefs = useMemo(() => {
    try {
      return loadFocusPrefs();
    } catch {
      return null;
    }
  }, []);
  const uiPrefs = useMemo(() => {
    try {
      return loadUiPrefs();
    } catch {
      return null;
    }
  }, []);
  const discipline = getDisciplineTrack(uiPrefs?.disciplineTrack);
  const [content, setContent] = useState("");
  const [mediaHashes, setMediaHashes] = useState<string[]>([]);
  const [showFlagged] = useState(false);
  const [bridgeTownFilter, setBridgeTownFilter] = useState("all");
  const [localFollowed, setLocalFollowed] = useState<string[]>(() => {
    const saved = localStorage.getItem("blkspace_followed") || "[]";
    return JSON.parse(saved);
  });

  const needsLocalPosts = [
    "watch",
    "read",
    "blog",
    "following",
    "local",
  ].includes(activeTab);
  const needsTrending = ["watch", "read", "blog", "trending"].includes(
    activeTab,
  );
  const needsFollowing =
    activeTab === "following" || activeTab === "blog" || activeTab === "watch";
  const needsBridge = activeTab === "bridge" && BETA_FEATURES.showBridgeTab();

  const { data: remoteFollowing = [] } = useTauriGetFollowing(needsFollowing);
  const followedHandles = Array.from(
    new Set([...(localFollowed || []), ...(remoteFollowing || [])]),
  );

  const {
    data: localPosts,
    isLoading: localLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAppListPosts(selectedTown, getCurrentHandle(), needsLocalPosts);
  const { data: trendingFeed, isLoading: trendingLoading } =
    useAppGetTrendingFeed(getCurrentHandle(), needsTrending);
  const bridgeTownArg =
    bridgeTownFilter === "all" ? undefined : bridgeTownFilter;
  const { data: crossTownFeed, isLoading: crossTownLoading } =
    useTauriCombinedFeed(bridgeTownArg, needsBridge);
  const createPost = useAppCreatePost();
  const toggleLike = useAppToggleLike();
  const sendWeixBucks = useAppSendWeixBucks();
  const repostPost = useTauriRepostPost();
  const { data: followingReposts = [] } = useTauriFollowingReposts(
    needsFollowing && isTauri() && followedHandles.length > 0,
  );

  const feedPanelFallback = (
    <div className="py-16 flex justify-center">
      <BLoader label="Loading feed" size="md" />
    </div>
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

  // Blog FYP: text-first sparse rank (yard + follow + substance) — never paid rank
  const blogFypPosts = useMemo(
    () =>
      rankBlogFypPosts(
        [...(trendingFeed || []), ...(localPosts || [])] as any[],
        {
          homeYardId: selectedTown,
          followedHandles: followedHandles,
          limit: 24,
        },
      ),
    [trendingFeed, localPosts, selectedTown, followedHandles],
  );

  const fypRankScore = (p: {
    likesCount?: number;
    engagementQuality?: number;
    maliciousScore?: number;
  }) =>
    (p.likesCount || 0) *
    (p.engagementQuality || 1) *
    (1 - (p.maliciousScore || 0));

  const isHighRisk = isHighRiskPost;

  // Watch FYP: engagement × quality × (1 − MIDF); demote high-risk posts
  const fypPosts = [...(trendingFeed || []), ...(localPosts || [])]
    .filter((p: any) => !isHighRisk(p))
    .sort((a: any, b: any) => fypRankScore(b) - fypRankScore(a))
    .slice(0, 12)
    .map((p: any) => ({ ...p }));

  const handleSubmit = () => {
    if (!requireWallet("post")) return;
    const body = content.trim();
    const media = mediaHashes.filter(Boolean);
    if (!body && media.length === 0) {
      toast.error("Write something or attach a file first");
      return;
    }
    // Media-only: send a short caption so backends never see empty body
    const postContent = body || (media.length > 0 ? "📎" : "");
    const offline = isTauri() && !navigator.onLine;
    createPost.mutate(
      {
        content: postContent,
        town_tag: selectedTown,
        media_hashes: media.length > 0 ? media : undefined,
      },
      {
        onSuccess: (result: any) => {
          setContent("");
          setMediaHashes([]);
          markFirstPostDone();
          if (offline) {
            toast.success("Post queued — will sync when you're back online");
          } else if (result?.earn) {
            showPostEarnCelebration(result.earn);
          } else {
            toast.success("Posted to the yard");
          }
          // Stay on My Yard so the new post is visible
          setActiveTab("local");
          queryClient.invalidateQueries({ queryKey: ["tauri", "user"] });
          queryClient.invalidateQueries({ queryKey: ["tauri", "posts"] });
          queryClient.invalidateQueries({ queryKey: ["web", "posts"] });
          queryClient.invalidateQueries({
            queryKey: getListPostsQueryKey({ town: selectedTown }),
          });
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          toast.error(msg || "Could not post — try again");
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
          if (result?.liked) {
            toast.success("Liked");
          } else if (result?.liked === false) {
            toast.message("Unliked");
          }
          if (
            result?.liked &&
            result?.authorEarn?.wb > 0 &&
            result?.authorHandle
          ) {
            showEarnFromResult(
              result.authorEarn,
              `@${result.authorHandle} earned from your like`,
            );
          }
          queryClient.invalidateQueries({ queryKey: ["tauri", "posts"] });
          queryClient.invalidateQueries({ queryKey: ["tauri", "user"] });
          queryClient.invalidateQueries({ queryKey: ["web", "posts"] });
          queryClient.invalidateQueries({ queryKey: ["web", "user"] });
          queryClient.invalidateQueries({
            queryKey: getListPostsQueryKey({ town: selectedTown }),
          });
        },
        onError: (e: unknown) => toast.error(String(e)),
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
          toast.success(
            `Tipped @${item.authorHandle} 5 WeixBucks (creator transfer — not rank)`,
          );
          // Refresh feeds; tips never purchase FYP rank
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

  // Select data source: Following · Yard · Blog FYP · Connect (+ Watch secondary)
  let posts: any[] = [];
  let isLoading = false;

  if (activeTab === "watch") {
    posts = fypPosts;
    isLoading = trendingLoading || localLoading;
  } else if (activeTab === "blog" || activeTab === "read") {
    posts = blogFypPosts;
    isLoading = trendingLoading || localLoading;
  } else if (activeTab === "following") {
    posts = filterFlagged(followingPosts as any[]);
    isLoading = localLoading;
  } else if (activeTab === "local") {
    posts = filterFlagged(localPosts || []);
    isLoading = localLoading;
  } else if (activeTab === "connect") {
    posts = [];
    isLoading = false;
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
        ? "Caption your video..."
        : activeTab === "blog" || activeTab === "read"
          ? "Write a yard note or blog-style post..."
          : "What's happening on the yard?";

  const showBridge = BETA_FEATURES.showBridgeTab();
  const showTrending = BETA_FEATURES.showTrendingTab();

  const yardTheme = getYardTheme(selectedTown);
  const yardLabel =
    yardTheme?.school || yardTheme?.name || selectedTown.toUpperCase();

  return (
    <AppShell>
      <YardOrientationCard />

      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Home</h1>
          <p className="text-xs text-muted-foreground">
            Feed for{" "}
            <Link
              href={`/communities/${selectedTown}`}
              className="text-primary font-medium hover:underline"
            >
              {yardLabel}
            </Link>
            {" · "}
            <span className="text-muted-foreground">
              Following · Yard · Blog FYP · Connect
            </span>
            {uiPrefs?.disciplineTrack &&
              uiPrefs.disciplineTrack !== "general" && (
                <>
                  {" · "}
                  <span className="text-primary/90 font-medium">
                    {discipline.short} track
                  </span>
                </>
              )}
          </p>
        </div>
      </div>

      {(focusPrefs?.persona === "meharry_med" ||
        focusPrefs?.studyOnlyFeed ||
        selectedTown === "meharry") && (
        <Card className="mb-4 border-teal-500/30 bg-teal-500/5">
          <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="space-y-0.5 text-sm">
              <p className="font-medium flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-teal-500" />
                Focus Path active
              </p>
              <p className="text-xs text-muted-foreground">
                Study tools on — open Focus when you need quiet mode.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/focus">
                <Button size="sm" variant="default" className="gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Open Focus
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      <Tabs
        defaultValue="local"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FeedTab)}
        className="mb-6"
      >
        <p className="text-[11px] text-muted-foreground mb-2">
          {activeTab === "local"
            ? `My Yard — only ${yardLabel}`
            : activeTab === "blog" || activeTab === "read"
              ? "Blog FYP — ranked notes & essays (rank is not for sale)"
              : activeTab === "following"
                ? "Following — people you follow (chrono)"
                : activeTab === "connect"
                  ? "Connect — research, fellowships, faculty paths → Cred"
                  : activeTab === "watch"
                    ? "Watch — video-first scroll"
                    : activeTab === "bridge"
                      ? "Bridge — other campuses (advanced)"
                      : "Trending across the network"}
        </p>

        <TabsList className="grid w-full mb-2 h-11 grid-cols-4">
          <TabsTrigger
            value="following"
            className="text-xs sm:text-sm font-bold"
          >
            Following
          </TabsTrigger>
          <TabsTrigger value="local" className="text-xs sm:text-sm font-bold">
            Yard
          </TabsTrigger>
          <TabsTrigger value="blog" className="text-xs sm:text-sm font-bold">
            Blog FYP
          </TabsTrigger>
          <TabsTrigger value="connect" className="text-xs sm:text-sm font-bold">
            Connect
          </TabsTrigger>
        </TabsList>

        {/* Secondary discovery surfaces */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "watch" ? "default" : "outline"}
            className="h-7 text-[11px]"
            onClick={() => setActiveTab("watch")}
          >
            Watch
          </Button>
          {showBridge && (
            <Button
              type="button"
              size="sm"
              variant={activeTab === "bridge" ? "default" : "outline"}
              className="h-7 text-[11px]"
              onClick={() => setActiveTab("bridge")}
            >
              Bridge
            </Button>
          )}
          {showTrending && (
            <Button
              type="button"
              size="sm"
              variant={activeTab === "trending" ? "default" : "outline"}
              className="h-7 text-[11px]"
              onClick={() => setActiveTab("trending")}
            >
              Trending
            </Button>
          )}
          <Link href="/settings">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] text-muted-foreground"
            >
              Discipline: {discipline.short}
            </Button>
          </Link>
        </div>

        {(activeTab === "watch" ||
          activeTab === "blog" ||
          activeTab === "read") && (
          <Suspense fallback={null}>
            <StoryStrip />
          </Suspense>
        )}

        {activeTab === "connect" && (
          <Card className="mb-4 border-primary/25 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Briefcase className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">
                    Pathways, not ad slots
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {disciplineUpliftLine(discipline.id)} Interest → completion
                    → Yard Cred. Spend (when you do) should buy tickets and
                    access to people — never rank.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/connect">
                  <Button size="sm" className="gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    Open ProjectConnect
                  </Button>
                </Link>
                <Link href="/faculty">
                  <Button size="sm" variant="outline" className="gap-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Faculty Desk
                  </Button>
                </Link>
                <Link href="/wallet">
                  <Button size="sm" variant="outline" className="gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Literacy
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "connect" && (
          <Suspense fallback={null}>
            <ConnectDiscoveryRail yardId={selectedTown} />
          </Suspense>
        )}

        {activeTab !== "bridge" &&
          activeTab !== "connect" &&
          (isGuest ? (
            <GuestCTA
              compact
              message="Create a free account to post, share media, and start earning WeixBucks on your yard."
            />
          ) : (
            <>
              {/* Desktop: inline composer */}
              <div className="hidden md:block" id="yard-composer">
                <PostComposer
                  content={content}
                  onContentChange={setContent}
                  selectedTown={selectedTown}
                  onTownChange={setSelectedTown}
                  mediaHashes={mediaHashes}
                  onMediaHashesChange={setMediaHashes}
                  onSubmit={handleSubmit}
                  isSubmitting={createPost.isPending}
                  onUploadSuccess={(earn) =>
                    showEarnFromResult(earn, "Media upload")
                  }
                  placeholder={composerPlaceholder}
                />
              </div>
              {/* Mobile: FAB → modal composer */}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="md:hidden fixed right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center text-2xl font-light"
                    style={{ bottom: "5.5rem" }}
                    aria-label="Create post"
                  >
                    +
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
                    onUploadSuccess={(earn) =>
                      showEarnFromResult(earn, "Media upload")
                    }
                    placeholder={composerPlaceholder}
                  />
                </DialogContent>
              </Dialog>
            </>
          ))}

        <TabsContent value="following" />
        <TabsContent value="local" />
        <TabsContent value="blog" />
        <TabsContent value="connect" />
        <TabsContent value="watch" />
        {showBridge && <TabsContent value="bridge" />}
        {showTrending && <TabsContent value="trending" />}
      </Tabs>

      {activeTab === "connect" ? null : activeTab === "bridge" ? (
        <Suspense fallback={feedPanelFallback}>
          <BridgeFeed
            events={crossTownFeed || []}
            isLoading={crossTownLoading}
            townFilter={bridgeTownFilter}
            onTownFilterChange={setBridgeTownFilter}
            showFlagged={showFlagged}
          />
        </Suspense>
      ) : isLoading ? (
        feedPanelFallback
      ) : activeTab === "watch" ? (
        <Suspense fallback={feedPanelFallback}>
          <WatchFeed posts={posts} onLike={handleLike} />
        </Suspense>
      ) : activeTab === "blog" || activeTab === "read" ? (
        <Suspense fallback={feedPanelFallback}>
          <ReadFeed posts={posts} onLike={handleLike} onRepost={handleRepost} />
        </Suspense>
      ) : (
        <div className="space-y-4">
          {!Array.isArray(posts) && (
            <div className="text-center py-12 text-muted-foreground">
              Could not load posts. Check your connection and try again.
            </div>
          )}
          {Array.isArray(posts) && posts.length === 0 && (
            <div className="text-center py-14 px-6 rounded-2xl border border-dashed border-border/60 bg-muted/20">
              <p className="text-lg font-semibold text-foreground mb-2">
                {activeTab === "following"
                  ? "Your circle is quiet"
                  : activeTab === "blog" || activeTab === "read"
                    ? "No blog-style posts yet"
                    : "The yard is quiet"}
              </p>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                {activeTab === "following"
                  ? "Follow people from Search or Yards — their posts show up here."
                  : activeTab === "blog" || activeTab === "read"
                    ? "Write a longer yard note. Blog FYP ranks substance + yard locality — not paid boosts."
                    : "Be the first to post today. Students earn WeixBucks for showing up."}
              </p>
              {isGuest ? (
                <Link href="/welcome">
                  <Button>Create free account</Button>
                </Link>
              ) : (
                <Button onClick={() => setActiveTab("local")}>
                  Post to my yard
                </Button>
              )}
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
                  style={{
                    contentVisibility: "auto",
                    containIntrinsicSize: "180px",
                  }}
                >
                  {isRepost && (
                    <div className="px-4 pt-3 text-xs text-green-500 flex items-center gap-1.5">
                      <Repeat2 className="w-3 h-3" />{" "}
                      {(item as any)._reposterDisplayName ||
                        (item as any)._reposterHandle}{" "}
                      reposted
                    </div>
                  )}
                  <CardHeader className="pb-2 flex flex-row items-start gap-3">
                    <Avatar className="h-10 w-10 border border-primary/20">
                      <AvatarFallback>
                        {isCrossTown
                          ? "B"
                          : (item as any).authorDisplayName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-bold truncate">
                          {isCrossTown
                            ? `${crossTownItem.pubkey.slice(0, 8)}…`
                            : (item as any).authorDisplayName}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal">
                          {new Date(
                            item.createdAt ||
                              crossTownItem.createdAtUnix * 1000,
                          ).toLocaleDateString()}
                        </span>
                        <div className="ml-auto">
                          <TrustChip
                            riskLevel={
                              isCrossTown
                                ? crossTownItem.riskLevel
                                : (item as any).riskLevel
                            }
                            maliciousScore={
                              isCrossTown
                                ? crossTownItem.maliciousScore
                                : (item as any).maliciousScore
                            }
                            nostrEventId={
                              isCrossTown
                                ? crossTownItem.eventId
                                : (item as any).nostrEventId
                            }
                            consensusValid={
                              isCrossTown
                                ? crossTownItem.consensusValid
                                : undefined
                            }
                            consensusAgreement={
                              isCrossTown
                                ? crossTownItem.consensusAgreement
                                : undefined
                            }
                          />
                        </div>
                      </CardTitle>
                      <div className="text-xs text-muted-foreground flex gap-1.5 items-center mt-0.5">
                        {!isCrossTown && (
                          <span>@{(item as any).authorHandle}</span>
                        )}
                        {!isCrossTown && <span>·</span>}
                        <span className="text-primary font-medium">
                          {isCrossTown
                            ? crossTownItem.townTag || "yard"
                            : (item as any).townTag}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pl-[3.25rem] pb-2">
                    <SafeContent
                      text={displayContent}
                      className="text-[15px] sm:text-[16px] leading-snug"
                    />
                    <MediaDisplay hashes={(item as any).mediaBlobs || []} />
                  </CardContent>
                  <CardFooter className="pl-[3.25rem] pt-1 flex gap-1 sm:gap-4 text-sm text-muted-foreground border-none">
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
                    <ShareCardButton
                      size="icon"
                      className="h-8 w-8"
                      share={{
                        kind: "post",
                        body: String(item.content || displayContent || ""),
                        authorHandle: item.authorHandle,
                        yardId: item.townTag || selectedTown,
                        path: `/posts/${item.id}`,
                      }}
                    />
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
                          Tip creator (5 WB)
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
          {hasNextPage &&
            (activeTab === "local" ||
              activeTab === "following" ||
              activeTab === "trending") && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage ? "Loading…" : "Load more posts"}
                </Button>
              </div>
            )}
        </div>
      )}
    </AppShell>
  );
}
