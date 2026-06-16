import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Heart, MessageSquare, Share2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SafeContent } from "@/components/ui/safe-content";
import { MediaDisplay } from "@/components/ui/media-display";
import { RiskBadge } from "@/components/ui/risk-badge";
import { SignatureBadge } from "@/components/ui/signature-badge";
import { KarmaBadge } from "@/components/economy/KarmaBadge";
import type { TauriPost } from "@/lib/tauri-api";

interface WatchFeedProps {
  posts: TauriPost[];
  authorKarma?: Record<string, { post: number; comment: number }>;
  onLike?: (postId: number) => void;
}

/** TikTok-style vertical full-screen scroll */
export function WatchFeed({ posts, authorKarma = {}, onLike }: WatchFeedProps) {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const videoPosts = posts.filter(
    (p) => p.mediaBlobs?.length > 0 || p.content.length < 280,
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const h = el.clientHeight || 1;
      const i = Math.round(el.scrollTop / h);
      setIndex(Math.min(i, Math.max(0, videoPosts.length - 1)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [videoPosts.length]);

  if (videoPosts.length === 0) {
    return (
      <div className="h-[70vh] flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-2xl">
        Upload a reel or short clip to seed your Watch feed
      </div>
    );
  }

  const current = videoPosts[index];

  return (
    <div className="relative -mx-4 md:-mx-0">
      <div
        ref={containerRef}
        className="h-[72vh] overflow-y-scroll snap-y snap-mandatory scrollbar-hide rounded-2xl"
      >
        {videoPosts.map((post) => {
          const karma = authorKarma[post.authorHandle];
          return (
            <div
              key={post.id}
              className="h-[72vh] snap-start relative flex flex-col justify-end bg-gradient-to-b from-muted/30 to-background border-b border-border/40"
            >
              <div className="absolute inset-0 flex items-center justify-center p-4">
                {post.mediaBlobs?.length > 0 ? (
                  <MediaDisplay hashes={post.mediaBlobs} className="max-h-full max-w-full rounded-xl" />
                ) : (
                  <SafeContent
                    text={post.content}
                    className="text-2xl font-semibold text-center max-w-md leading-snug"
                  />
                )}
              </div>

              <div className="relative z-10 p-4 bg-gradient-to-t from-background via-background/90 to-transparent">
                <div className="flex items-end gap-3">
                  <Link href={`/profile/${post.authorHandle}`}>
                    <Avatar className="h-11 w-11 border-2 border-primary/30">
                      <AvatarFallback>
                        {post.authorDisplayName?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-bold truncate">@{post.authorHandle}</p>
                      <RiskBadge
                        riskLevel={post.riskLevel}
                        maliciousScore={post.maliciousScore}
                      />
                      {post.nostrEventId && (
                        <SignatureBadge eventId={post.nostrEventId} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{post.townTag} yard</p>
                    {post.mediaBlobs?.length === 0 && (
                      <SafeContent text={post.content} className="text-sm mt-1 line-clamp-2" />
                    )}
                  </div>
                  {karma && (
                    <KarmaBadge
                      postKarma={karma.post}
                      commentKarma={karma.comment}
                      compact
                    />
                  )}
                </div>
              </div>

              <div className="absolute right-3 bottom-28 flex flex-col gap-3 z-20">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-background/60"
                  onClick={() => onLike?.(post.id)}
                >
                  <Heart className={`h-5 w-5 ${post.liked ? "fill-destructive text-destructive" : ""}`} />
                </Button>
                <span className="text-[10px] text-center">{post.likesCount}</span>
                <Link href={`/posts/${post.id}`}>
                  <Button variant="ghost" size="icon" className="rounded-full bg-background/60">
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="rounded-full bg-background/60">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 z-30 rounded-full bg-background/70"
        onClick={() => setMuted(!muted)}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>

      <div className="flex justify-center gap-1 mt-2">
        {videoPosts.slice(0, 8).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all ${i === index ? "w-4 bg-primary" : "w-1 bg-muted-foreground/30"}`}
          />
        ))}
      </div>
    </div>
  );
}