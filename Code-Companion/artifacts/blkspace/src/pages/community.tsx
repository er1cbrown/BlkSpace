import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft,
  Users,
  MapPin,
  GraduationCap,
  CalendarDays,
  MessageSquare,
  Heart,
  Repeat2,
  Send,
  Store,
} from "lucide-react";
import {
  useTauriGetCommunities,
  useTauriListChannels,
  useTauriListPostsForChannel,
  useAppCreatePost,
  useAppListPosts,
  useTauriJoinYard,
  useTauriIsYardMember,
} from "@/hooks/use-app-data";
import { getCurrentHandle } from "@/lib/auth";
import { showEarnFromResult } from "@/components/economy/EarnToast";
import { YardEventsPanel } from "@/components/community/YardEventsPanel";
import { YardMembersPanel } from "@/components/community/YardMembersPanel";
import { YardSaleTab } from "@/components/community/YardSaleTab";
import { YardLiveRooms } from "@/components/community/YardLiveRooms";
import {
  ClubActivitiesPanel,
  StudyHourHint,
} from "@/components/community/ClubActivitiesPanel";
import { getYardTheme, resolveCommunityYardTheme } from "@/lib/yard-themes";
import { getHbcu, hbcuLocation, searchHbcus } from "@/lib/hbcu-catalog";
import { YardCommunitySkin } from "@/components/community/YardCommunitySkin";
import { SafeContent } from "@/components/ui/safe-content";
import { RiskBadge } from "@/components/ui/risk-badge";
import { SignatureBadge } from "@/components/ui/signature-badge";
import { ExperimentalMessagingWarning } from "@/components/ui/experimental-messaging-warning";
import {
  isTauri,
  type TauriCommunity,
  tauriCreateChannel,
  tauriCreateReply,
  tauriListReplies,
  type TauriPost,
} from "@/lib/tauri-api";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import { useRequiresWallet } from "@/hooks/use-requires-wallet";
import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type CommunityView = {
  id: string;
  name: string;
  school: string;
  location: string;
  members: number;
  description: string;
  packActive?: boolean;
  purchaseCount?: number;
  color?: string;
};

/** Resolve any catalog HBCU (albany-st, tsu, …) — not just 5 hard-coded yards. */
function resolveCommunityFromCatalog(rawId: string): CommunityView | null {
  if (!rawId) return null;
  const id = decodeURIComponent(rawId).trim().toLowerCase();

  let hbcu = getHbcu(id);
  // Fuzzy: "albany", "albany state", "albany-state" → albany-st
  if (!hbcu) {
    const hits = searchHbcus(id.replace(/-/g, " "));
    hbcu = hits[0] ?? null;
  }
  if (!hbcu) {
    const hits = searchHbcus(id);
    hbcu = hits.find((h) => h.id === id || h.shortName.toLowerCase().includes(id)) ?? hits[0] ?? null;
  }
  if (!hbcu) return null;

  const theme = getYardTheme(hbcu.id);
  return {
    id: hbcu.id,
    name: hbcu.yardLabel,
    school: hbcu.school,
    location: hbcuLocation(hbcu),
    members: 0,
    description:
      theme?.tagline ||
      `${hbcu.shortName} — ${hbcu.control} HBCU · est. ${hbcu.founded}. Join the yard and post.`,
    packActive: false,
    purchaseCount: 0,
    color: theme?.gradient,
  };
}

export default function CommunityPage() {
  const [, params] = useRoute("/communities/:id");
  const id = params?.id || "";
  const [activeChannel, setActiveChannel] = useState("#general");
  const [activeTab, setActiveTab] = useState("chat");
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [postReplies, setPostReplies] = useState<Record<number, any[]>>({});

  const { data: tauriCommunities } = useTauriGetCommunities();
  // Normalize route param early (albany-st, Albany%20State, etc.)
  const routeYardKey = (id || "").trim().toLowerCase();

  const { data: tauriChannelsData } = useTauriListChannels(routeYardKey);
  const { data: tauriChannelPosts = [] } = useTauriListPostsForChannel(
    activeChannel.replace(/^#/, "").replace(/-hall$/, ""),
  ); // id e.g. "general" or "study" from channel name
  const yardKeyForFeed = routeYardKey || "tsu";
  const { data: yardFeedPosts = [] } = useAppListPosts(
    yardKeyForFeed,
    getCurrentHandle(),
    !isTauri(),
  );
  const createPost = useAppCreatePost();
  const joinYard = useTauriJoinYard();
  const { requireWallet } = useRequiresWallet();
  const { data: isMember = false, refetch: refetchMember } =
    useTauriIsYardMember(routeYardKey);
  const qc = useQueryClient();

  const handleCreateChannel = async () => {
    const nm = prompt("New channel name (e.g. #projects or projects)");
    if (!nm || !nm.trim()) return;
    const token = getSessionToken();
    if (!token) {
      toast.error("Sign in required");
      return;
    }
    try {
      await tauriCreateChannel(token, yardId || id, nm.trim());
      qc.invalidateQueries({ queryKey: ["tauri", "channels", yardId || id] });
      toast.success("Channel created");
    } catch (e) {
      toast.error(String(e));
    }
  };

  // Load replies for threaded nesting in channel chat (scoped to these posts)
  useEffect(() => {
    if (!isTauri() || !tauriChannelPosts || tauriChannelPosts.length === 0)
      return;
    const load = async () => {
      const newR: Record<number, any[]> = {};
      for (const p of tauriChannelPosts) {
        try {
          const reps = await tauriListReplies(p.id);
          newR[p.id] = reps || [];
        } catch {
          newR[p.id] = [];
        }
      }
      setPostReplies(newR);
    };
    load();
  }, [tauriChannelPosts]);

  const submitChannelPost = (text: string) => {
    if (!requireWallet("post in yard channels")) return;
    const channelId = activeChannel.replace(/^#/, "").replace(/-hall$/, "");
    createPost.mutate(
      {
        content: text.trim(),
        town_tag: yardId || id,
        channel_id: channelId,
      },
      {
        onSuccess: (result: any) => {
          setDraft("");
          if (result?.earn) {
            showEarnFromResult(result.earn, `Posted to ${activeChannel}`);
          } else {
            toast.success(`Posted to ${activeChannel}`);
          }
          qc.invalidateQueries({
            queryKey: ["tauri", "channelPosts", channelId],
          });
          qc.invalidateQueries({ queryKey: ["web", "posts"] });
          qc.invalidateQueries({ queryKey: ["web", "user"] });
        },
        onError: (e: unknown) => toast.error(String(e)),
      },
    );
  };

  const handleReply = async (postId: number) => {
    if (!requireWallet("reply in yard channels")) return;
    const text = prompt("Reply text:");
    if (!text || !text.trim()) return;
    const token = getSessionToken();
    if (!token) {
      toast.error("Sign in");
      return;
    }
    try {
      const result = await tauriCreateReply(token, postId, text.trim());
      qc.invalidateQueries({
        queryKey: [
          "tauri",
          "channelPosts",
          activeChannel.replace(/^#/, "").replace(/-hall$/, ""),
        ],
      });
      qc.invalidateQueries({ queryKey: ["tauri", "posts"] });
      const reps = await tauriListReplies(postId);
      setPostReplies((prev) => ({ ...prev, [postId]: reps || [] }));
      if (result.earn) {
        showEarnFromResult(result.earn, "Reply posted");
      } else {
        toast.success("Reply posted");
      }
    } catch (e) {
      toast.error(String(e));
    }
  };

  const community: CommunityView | null = useMemo(() => {
    const key = (id || "").trim().toLowerCase();
    if (!key) return null;

    // 1) Live Tauri communities (full hbcus table when seeded)
    if (isTauri() && Array.isArray(tauriCommunities)) {
      const hit = tauriCommunities.find(
        (c: TauriCommunity) => c.id.toLowerCase() === key,
      );
      if (hit) {
        return {
          id: hit.id,
          name: hit.name,
          school: hit.school,
          location: hit.location,
          members: hit.members,
          description: hit.description,
          packActive: hit.packActive,
          purchaseCount: hit.purchaseCount,
          color: hit.color,
        };
      }
    }

    // 2) Full HBCU catalog (Albany State = albany-st, etc.)
    return resolveCommunityFromCatalog(key);
  }, [id, tauriCommunities]);

  // Canonical id for membership / posts (catalog may fuzzy-match)
  const yardId = community?.id || id;

  // Real channels when in Tauri (from DB via list_channels); default set for every HBCU
  const channels =
    isTauri() && tauriChannelsData && tauriChannelsData.length > 0
      ? tauriChannelsData.map((c: any) => c.name)
      : [
          "#general",
          "#events",
          "#music",
          "#study-hall",
          "#networking",
          "#market",
        ];

  if (!community) {
    return (
      <AppShell>
        <div className="text-center py-20 space-y-3 px-4">
          <p className="text-muted-foreground">
            Yard not found for <code className="text-xs">{id || "—"}</code>
          </p>
          <p className="text-sm text-muted-foreground">
            Pick a school from the Yards directory (e.g. Albany State →{" "}
            <code className="text-xs">albany-st</code>).
          </p>
          <Link href="/communities">
            <Button variant="outline" className="mt-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Yards
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  // Real channel posts (Tauri) or live yard feed posts (web userspace)
  const channelPosts =
    isTauri() && tauriChannelPosts.length > 0
      ? tauriChannelPosts.map((p: TauriPost) => ({
          id: p.id,
          user: p.authorDisplayName || p.authorHandle,
          handle: p.authorHandle,
          content: p.content,
          raw: p,
          time: p.createdAt
            ? new Date(p.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "now",
          reactions: p.likesCount || 0,
        }))
      : (yardFeedPosts as any[]).map((p) => ({
          id: p.id,
          user: p.authorDisplayName || p.authorHandle,
          handle: p.authorHandle,
          content: p.content,
          raw: p,
          time: p.createdAt
            ? new Date(p.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "now",
          reactions: p.likesCount || 0,
        }));

  const tauriCommunity =
    isTauri() && Array.isArray(tauriCommunities)
      ? tauriCommunities.find(
          (c: TauriCommunity) => c.id.toLowerCase() === yardId.toLowerCase(),
        )
      : undefined;
  const packActive =
    tauriCommunity?.packActive ?? community.packActive ?? false;
  const purchaseCount =
    tauriCommunity?.purchaseCount ?? community.purchaseCount ?? 0;
  const yardTheme = resolveCommunityYardTheme(
    yardId,
    packActive,
    purchaseCount,
  );

  return (
    <AppShell fullWidth hideRightRail>
        <Link href="/communities">
          <Button
            variant="ghost"
            className="mb-4 pl-0 hover:bg-transparent hover:text-primary gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> All Yards
          </Button>
        </Link>

        {yardTheme && (
          <YardCommunitySkin
            theme={yardTheme}
            communityName={community.name}
          />
        )}

        <div className="flex items-start gap-4 mb-6">
          <div
            className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${yardTheme?.gradient ?? "from-primary to-primary/50"} flex-shrink-0 flex items-center justify-center text-3xl shadow-lg ${
              yardTheme?.skinTier === "preview" ? "opacity-70 saturate-50" : ""
            }`}
          >
            {yardTheme?.mascot.split(" ")[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {community.name}{" "}
                  {yardTheme && (
                    <span className="text-lg font-normal text-muted-foreground">
                      {yardTheme.mascot}
                    </span>
                  )}
                </h1>
                {yardTheme && (
                  <p className={`text-sm mt-1 ${yardTheme.accentClass}`}>
                    {yardTheme.tagline}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-4 h-4" /> {community.school}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {community.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />{" "}
                    {community.members.toLocaleString()} members
                  </span>
                </div>
              </div>
              <Button
                className="rounded-full px-8"
                variant={isMember ? "secondary" : "default"}
                disabled={joinYard.isPending || isMember}
                onClick={() => {
                  if (!requireWallet("join yards")) return;
                  joinYard.mutate(yardId, {
                    onSuccess: (result: any) => {
                      void refetchMember();
                      qc.invalidateQueries({ queryKey: ["web", "yardMember"] });
                      qc.invalidateQueries({ queryKey: ["web", "user"] });
                      if (result.joined && result.earn) {
                        showEarnFromResult(
                          result.earn,
                          `Joined ${community.name}`,
                        );
                      } else {
                        toast.success(`You're in ${community.name}`);
                      }
                    },
                    onError: (e) => toast.error(String(e)),
                  });
                }}
              >
                {isMember ? "Joined ✓" : "Join Yard"}
              </Button>
            </div>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {community.description}
            </p>
            {yardTheme && yardTheme.skinTier === "live" && (
              <div className="flex flex-wrap gap-2 mt-3">
                {yardTheme.norms.map((norm) => (
                  <Badge key={norm} variant="secondary" className="text-xs font-normal">
                    {norm}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs font-normal">
                  {yardTheme.weatherHint}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Discord-style Channels Sidebar */}
          <div className="lg:col-span-3">
            <Card className={yardTheme?.cardBorderClass ?? "border-primary/10"}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 text-sm">
                  {channels.map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setActiveChannel(ch)}
                      className={`w-full text-left px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors ${activeChannel === ch ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50 text-muted-foreground"}`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCreateChannel}
                  className="mt-2 w-full text-left px-3 py-1 text-xs rounded-md hover:bg-primary/10 text-primary flex items-center gap-1"
                >
                  + Create channel
                </button>
                <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
                  This yard supports structured casual chat + professional
                  networking. Voice channels coming in future update.
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4 border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    if (!requireWallet("create yard events")) return;
                    setActiveTab("events");
                    setCreateEventOpen(true);
                  }}
                >
                  📅 Create Event
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setActiveTab("members")}
                >
                  👥 Manage Roles
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setActiveTab("yard-sale")}
                >
                  <Store className="w-4 h-4 mr-1" /> Yard Sale
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
                <TabsTrigger value="chat">{activeChannel} Chat</TabsTrigger>
                <TabsTrigger value="live">Live</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="clubs">Clubs</TabsTrigger>
                <TabsTrigger value="yard-sale">Yard Sale</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
              </TabsList>

              <TabsContent value="live">
                <YardLiveRooms
                  yardId={yardId}
                  communityName={community.name}
                />
              </TabsContent>

              <TabsContent value="chat">
                <Card>
                  <CardHeader className="pb-2 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-lg">
                        {activeChannel} — {community.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Casual + focused discussion for the yard
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {channelPosts.length} messages
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[520px] overflow-auto pr-2">
                    {channelPosts.map((post, idx) => (
                      <div
                        key={idx}
                        className="flex gap-3 border-l-2 border-primary/30 pl-3"
                      >
                        <Avatar className="h-9 w-9 mt-0.5">
                          <AvatarFallback>{post.user[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-semibold">{post.user}</span>
                            <span className="text-xs text-muted-foreground">
                              @{post.handle} · {post.time}
                            </span>
                            {post.raw && (
                              <>
                                <RiskBadge
                                  riskLevel={post.raw.riskLevel}
                                  maliciousScore={post.raw.maliciousScore}
                                />
                                {post.raw.nostrEventId && (
                                  <SignatureBadge eventId={post.raw.nostrEventId} />
                                )}
                              </>
                            )}
                          </div>
                          <SafeContent
                            text={post.content}
                            className="text-[15px] leading-snug mt-0.5"
                          />
                          <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                            <button
                              onClick={() => handleReply(post.id)}
                              className="hover:text-primary flex items-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Reply
                            </button>
                            <button className="hover:text-primary flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5" /> {post.reactions}
                            </button>
                          </div>
                          {/* Threaded replies nested under this channel post */}
                          {postReplies[post.id] &&
                            postReplies[post.id].length > 0 && (
                              <div className="ml-4 mt-2 border-l pl-2 space-y-2 text-sm opacity-90">
                                {postReplies[post.id].map(
                                  (rep: any, ri: number) => (
                                    <div key={ri} className="flex gap-2">
                                      <Avatar className="h-6 w-6 mt-0.5">
                                        <AvatarFallback>
                                          {
                                            (rep.authorDisplayName ||
                                              rep.authorHandle ||
                                              "R")[0]
                                          }
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <span className="font-medium text-xs">
                                          @{rep.authorHandle}
                                        </span>
                                        <SafeContent
                                          text={rep.content}
                                          className="text-xs leading-snug"
                                        />
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                    {channelPosts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No posts in this channel yet. Be the first!
                      </p>
                    )}
                  </CardContent>
                  <div className="p-4 border-t">
                    <ExperimentalMessagingWarning className="mb-3" />
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-muted/50 rounded-full px-4 py-2 text-sm outline-none"
                        placeholder={`Message ${activeChannel}`}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && draft.trim()) {
                            submitChannelPost(draft);
                          }
                        }}
                        disabled={createPost.isPending}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!draft.trim()) return;
                          submitChannelPost(draft);
                        }}
                        disabled={createPost.isPending || !draft.trim()}
                      >
                        {createPost.isPending ? "Sending..." : "Send"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Messages saved to channel (channel_id persisted). In Tauri
                      + relays: will also publish as kind 1 with town tag.
                    </p>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="members">
                <YardMembersPanel
                  communityId={yardId}
                  communityName={community.name}
                  isMember={isMember}
                />
              </TabsContent>

              <TabsContent value="events">
                <div className="space-y-3">
                  <StudyHourHint />
                  <YardEventsPanel
                    communityId={yardId}
                    communityName={community.name}
                    isMember={isMember}
                    createDialogOpen={createEventOpen}
                    onCreateDialogOpenChange={setCreateEventOpen}
                  />
                </div>
              </TabsContent>

              <TabsContent value="clubs">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      Clubs · reading · tournaments
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Anime book groups, gaming brackets, study kits, faculty
                      channels — without live streaming.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ClubActivitiesPanel communityId={yardId} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="yard-sale">
                <YardSaleTab yardId={yardId} communityName={community.name} />
              </TabsContent>

              <TabsContent value="about">
                <Card className={yardTheme?.cardBorderClass}>
                  <CardContent className="p-6 space-y-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" /> Founded
                      2026 — Digital twin of the physical yard
                    </div>
                    <div>{community.description}</div>
                    {yardTheme && (
                      <div className="space-y-2 pt-2">
                        <div>
                          <strong>Fanbase:</strong> {yardTheme.fanbase}
                        </div>
                        <div>
                          <strong>Campus vibe:</strong> {yardTheme.norms.join(" · ")}
                        </div>
                        <div>
                          <strong>Weather:</strong> {yardTheme.weatherHint}
                        </div>
                      </div>
                    )}
                    <div className="pt-4 border-t">
                      <strong>Casual rules:</strong> Keep it fun, respectful,
                      and HBCU-proud. Professional networking welcome in
                      #networking. MyYards on this mesh can look different —
                      campus theme ≠ your personal creator space.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
    </AppShell>
  );
}
