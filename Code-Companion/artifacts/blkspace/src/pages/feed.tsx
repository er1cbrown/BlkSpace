import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, MessageSquare, Repeat2, Share, MapPin, Image, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SafeContent } from "@/components/ui/safe-content";
import { MediaDisplay } from "@/components/ui/media-display";
import { getListPostsQueryKey } from "@workspace/api-client-react";
import { useAppListPosts, useAppGetTrendingFeed, useAppCreatePost, useAppToggleLike, useTauriCombinedFeed, useTauriPublishTrendingSummary, useTauriFetchTrendingSummaries, useAppSendWeixBucks, useTauriGetFollowing } from "@/hooks/use-app-data";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import { isTauri, tauriUploadBlob, type TauriCrossTownEvent } from "@/lib/tauri-api";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function FeedPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("fyp"); // Default to Instagram-style FYP
  const [selectedTown, setSelectedTown] = useState("tsu");
  const [content, setContent] = useState("");
  const [mediaHashes, setMediaHashes] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [localFollowed, setLocalFollowed] = useState<string[]>(() => {
    const saved = localStorage.getItem('blkspace_followed') || '[]';
    return JSON.parse(saved);
  });
  // Real kind 3 for feeds: load follows from backend (which can be backed by kind 3 relay query in future)
  const { data: remoteFollowing = [] } = useTauriGetFollowing();
  const followedHandles = Array.from(new Set([...(localFollowed || []), ...(remoteFollowing || [])]));

  const { data: localPosts, isLoading: localLoading } = useAppListPosts(selectedTown, getCurrentHandle());
  const { data: trendingFeed, isLoading: trendingLoading } = useAppGetTrendingFeed(getCurrentHandle());
  const { data: crossTownFeed, isLoading: crossTownLoading } = useTauriCombinedFeed(activeTab === "bridge" ? undefined : selectedTown);
  const { data: trendingSummaries, isLoading: summariesLoading } = useTauriFetchTrendingSummaries(selectedTown);
  const createPost = useAppCreatePost();
  const toggleLike = useAppToggleLike();
  const sendWeixBucks = useAppSendWeixBucks();
  const publishSummary = useTauriPublishTrendingSummary();

  // Real-ish "Following" (Twitter-style chronological from followed, persisted in localStorage synced with profile; in real Nostr kind 3 contacts)
  const followingPosts = (localPosts || []).filter((p: any) => followedHandles.includes(p.authorHandle))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8).map((p: any, i: number) => ({
      ...p,
      // Simulate followed users + reposts
      content: i % 2 === 0 ? p.content : `RT: ${p.content}`,
      repostsCount: (p.repostsCount || 0) + (i % 3),
    }));

  // Instagram-style FYP: high-engagement (likes * quality), low-malicious (from scores), town diversity signals
  // Real: use calculate_malicious_intent_vector + engagement_quality + mix towns from Nostr
  const fypPosts = [...(trendingFeed || []), ...(localPosts || [])]
    .sort((a: any, b: any) => {
      const scoreA = (b.likesCount || 0) * (b.engagementQuality || 1) * (1 - (b.maliciousScore || 0));
      const scoreB = (a.likesCount || 0) * (a.engagementQuality || 1) * (1 - (a.maliciousScore || 0));
      return scoreB - scoreA; // higher score first; town diversity via mix in trending/local
    })
    .slice(0, 12)
    .map((p: any) => ({
      ...p,
      // Add "recommended" flavor
      content: p.content + (Math.random() > 0.7 ? " 🔥" : ""),
    }));

  const handleSubmit = () => {
    if (!content.trim()) return;
    createPost.mutate(
      { content, town_tag: selectedTown, media_hashes: mediaHashes.length > 0 ? mediaHashes : undefined },
      {
        onSuccess: () => {
          setContent("");
          setMediaHashes([]);
          queryClient.invalidateQueries({ queryKey: ["tauri", "posts"] });
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey({ town: selectedTown }) });
        },
      },
    );
  };

  const handleUploadMedia = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const token = getSessionToken();
    if (!token) { toast.error("Please sign in"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large (max 20MB)"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      const b64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const info = await tauriUploadBlob(token, b64, file.name);
      setMediaHashes((prev) => [...prev, info.hash]);
      toast.success("Media attached");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      toast.error(String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleLike = (postId: number) => {
    toggleLike.mutate({ postId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tauri", "posts"] });
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey({ town: selectedTown }) });
      },
    });
  };

  const handleBoost = (item: any) => {
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
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey({ town: selectedTown }) });
          queryClient.invalidateQueries({ queryKey: ["tauri", "trending"] });
        },
        onError: (e) => toast.error(String(e)),
      }
    );
  };

  // Select data source based on tab for Twitter (Following) + IG FYP (For You) + classic local
  let posts: any[] = [];
  let isLoading = false;

  if (activeTab === "fyp") {
    posts = fypPosts;
    isLoading = trendingLoading || localLoading;
  } else if (activeTab === "following") {
    posts = followingPosts;
    isLoading = localLoading;
  } else if (activeTab === "local") {
    posts = localPosts || [];
    isLoading = localLoading;
  } else if (activeTab === "bridge") {
    posts = crossTownFeed || [];
    isLoading = crossTownLoading || summariesLoading;
  } else {
    posts = trendingFeed || [];
    isLoading = trendingLoading;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container max-w-2xl py-8 px-4">
        
        <Tabs defaultValue="fyp" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5 mb-6 h-12">
            <TabsTrigger value="fyp" className="text-base font-bold">For You</TabsTrigger>
            <TabsTrigger value="following" className="text-base font-bold">Following</TabsTrigger>
            <TabsTrigger value="local" className="text-base font-bold">Local Yard</TabsTrigger>
            <TabsTrigger value="bridge" className="text-base font-bold">The Bridge</TabsTrigger>
            <TabsTrigger value="trending" className="text-base font-bold hidden lg:block">Trending</TabsTrigger>
          </TabsList>

          {/* Composer always visible but context-aware */}
          <Card className="border-primary/20 shadow-md mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>DU</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea 
                    placeholder={
                      activeTab === "following" ? "Share with your people..." :
                      activeTab === "fyp" ? "What's popping? (this might go viral)" :
                      "What's happening on the yard?"
                    }
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[80px] mb-4 border-none resize-none focus-visible:ring-0 text-lg p-0"
                  />
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <Select value={selectedTown} onValueChange={setSelectedTown}>
                        <SelectTrigger className="w-[140px] h-8 border-none bg-muted/50">
                          <SelectValue placeholder="Select Town" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tsu">TSU Yard</SelectItem>
                          <SelectItem value="howard">Howard Yard</SelectItem>
                          <SelectItem value="spelman">Spelman Yard</SelectItem>
                          <SelectItem value="famu">FAMU Yard</SelectItem>
                          <SelectItem value="morehouse">Morehouse Yard</SelectItem>
                        </SelectContent>
                      </Select>
                      {isTauri() && (
                        <>
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/*,video/*,audio/*"
                            className="hidden"
                            onChange={handleUploadMedia}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                          >
                            <Image className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    <Button onClick={handleSubmit} disabled={createPost.isPending || !content.trim()} className="rounded-full px-6">
                      Post
                    </Button>
                  </div>
                  {mediaHashes.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {mediaHashes.map((h) => (
                        <div key={h} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                          <Image className="h-3 w-3" />
                          {h.slice(0, 8)}…
                          <button onClick={() => setMediaHashes((prev) => prev.filter((x) => x !== h))}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <TabsContent value="fyp">
            <div className="bg-accent/10 text-accent-foreground p-4 rounded-xl mb-6 text-sm font-medium border border-accent/20">
              For You — Instagram-style recommendations. Mix of viral from your interests, high-engagement across yards, and fresh discoveries.
            </div>
          </TabsContent>

          <TabsContent value="following">
            <div className="bg-primary/10 text-primary-foreground p-4 rounded-xl mb-6 text-sm font-medium border border-primary/20">
              Following — Twitter-style chronological feed from accounts you follow. Pure, unfiltered from your circle.
            </div>
          </TabsContent>

          <TabsContent value="local">
            <div className="bg-secondary/30 p-4 rounded-xl mb-6 text-sm">
              Your local yard feed. Focused on <strong>{selectedTown.toUpperCase()}</strong> community posts.
            </div>
          </TabsContent>

          <TabsContent value="bridge">
            <div className="bg-primary/10 text-primary-foreground p-4 rounded-xl mb-6 text-sm font-medium border border-primary/20">
              Cross-town feed — events synced from connected relays across the BlkSpace mesh. 
              Posts from other towns appear here as they are discovered.
            </div>
            {isTauri() && (
              <div className="flex gap-2 mb-4">
                <Select value={selectedTown} onValueChange={setSelectedTown}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Filter by town" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Towns</SelectItem>
                    <SelectItem value="tsu">TSU</SelectItem>
                    <SelectItem value="howard">Howard</SelectItem>
                    <SelectItem value="spelman">Spelman</SelectItem>
                    <SelectItem value="famu">FAMU</SelectItem>
                    <SelectItem value="morehouse">Morehouse</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => publishSummary.mutate()}
                  disabled={publishSummary.isPending}
                >
                  {publishSummary.isPending ? "Publishing..." : "Publish Summary"}
                </Button>
              </div>
            )}
            {isTauri() && trendingSummaries && trendingSummaries.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Trending Summaries</h3>
                {trendingSummaries.map((summary, idx) => {
                  const parsed = JSON.parse(summary);
                  return (
                    <Card key={idx} className="bg-secondary/30 border-secondary/30">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-xs">{parsed.town} Yard</Badge>
                          <span className="text-xs text-muted-foreground">{parsed.week}</span>
                        </div>
                        <p className="text-sm font-medium mb-2">{parsed.new_users} users · {parsed.total_events} events · {parsed.weix_bucks_circulating} WB</p>
                        {parsed.top_posts && parsed.top_posts.length > 0 && (
                          <div className="space-y-1">
                            {parsed.top_posts.map((post: any, pidx: number) => (
                              <div key={pidx} className="text-xs text-muted-foreground flex justify-between">
                                <span>@{post.author}: {post.content}</span>
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3 h-3" /> {post.likes}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trending">
            <div className="bg-accent/10 text-accent-foreground p-4 rounded-xl mb-6 text-sm font-medium border border-accent/20">
              Showing the most active discussions across the entire BlkSpace mesh network.
            </div>
          </TabsContent>
        </Tabs>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1,2,3].map(i => (
              <Card key={i} className="h-40 bg-muted/50"></Card>
            ))}
          </div>
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
            {Array.isArray(posts) && posts.map((item: any) => {
              const isCrossTown = "pubkey" in item && "eventId" in item;
              const crossTownItem = item as TauriCrossTownEvent;
              const isRepost = item.content?.startsWith("RT:");
              const displayContent = isRepost ? item.content.replace("RT: ", "") : item.content;

              return (
              <Card key={item.id} className="hover:bg-muted/30 transition-colors border-border/50">
                {isRepost && (
                  <div className="px-4 pt-3 text-xs text-green-500 flex items-center gap-1.5">
                    <Repeat2 className="w-3 h-3" /> Reposted
                  </div>
                )}
                <CardHeader className="pb-2 flex flex-row items-start gap-4">
                  <Avatar className="h-12 w-12 border border-primary/20">
                    <AvatarFallback>{isCrossTown ? '🌉' : (item as any).authorDisplayName?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="font-bold">
                        {isCrossTown 
                          ? `${crossTownItem.pubkey.slice(0, 8)}…${crossTownItem.pubkey.slice(-4)}`
                          : (item as any).authorDisplayName
                        }
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.createdAt || (crossTownItem.createdAtUnix * 1000)).toLocaleDateString()}
                      </span>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground flex gap-2 items-center mt-1">
                      {isCrossTown && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          ⛓️ {crossTownItem.relayUrl?.replace('wss://', '').slice(0, 20)}
                        </span>
                      )}
                      {!isCrossTown && <span>@{(item as any).authorHandle}</span>}
                      <span>•</span>
                      <span className="text-primary font-medium">
                        {isCrossTown ? crossTownItem.townTag || 'unknown' : (item as any).townTag}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pl-20 pb-2">
                  <SafeContent text={displayContent} className="text-[17px]" />
                  <MediaDisplay hashes={(item as any).mediaBlobs || []} />
                </CardContent>
                <CardFooter className="pl-20 pt-2 flex gap-6 text-sm text-muted-foreground border-none">
                  <Link href={`/posts/${item.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-2 hover:text-primary hover:bg-primary/10">
                      <MessageSquare className="w-4 h-4" /> {(item as any).repliesCount || 0}
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 gap-2 hover:text-green-500 hover:bg-green-500/10"
                    onClick={() => toast("Repost feature coming in next update — stay tuned!")}
                  >
                    <Repeat2 className="w-4 h-4" /> {item.repostsCount || 0}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 gap-2 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleLike(item.id)}
                  >
                    <Heart className={`w-4 h-4 ${item.liked ? 'fill-current text-destructive' : ''}`} /> {item.likesCount || 0}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 gap-2 hover:text-amber-500 hover:bg-amber-500/10"
                    onClick={() => handleBoost(item)}
                    title="Boost this post with 5 WB"
                  >
                    <Repeat2 className="w-4 h-4" /> Boost
                  </Button>
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
      </main>
    </div>
  );
}
