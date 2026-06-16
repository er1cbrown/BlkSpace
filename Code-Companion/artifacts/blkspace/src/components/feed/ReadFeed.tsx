import { Link } from "wouter";
import { Heart, MessageSquare, Repeat2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SafeContent } from "@/components/ui/safe-content";
import { KarmaBadge } from "@/components/economy/KarmaBadge";
import { RiskBadge } from "@/components/ui/risk-badge";
import { SignatureBadge } from "@/components/ui/signature-badge";
import type { TauriPost } from "@/lib/tauri-api";

interface ReadFeedProps {
  posts: TauriPost[];
  authorKarma?: Record<string, { post: number; comment: number }>;
  onLike?: (postId: number) => void;
  onRepost?: (postId: number) => void;
}

/** Threads / Twitter text-first feed */
export function ReadFeed({ posts, authorKarma = {}, onLike, onRepost }: ReadFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm border border-dashed rounded-2xl">
        No threads yet — post something short and spicy
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const karma = authorKarma[post.authorHandle];
        const text = post.content;

        return (
          <Card key={post.id} className="border-border/50 hover:bg-muted/20 transition-colors">

            <CardHeader className="pb-2 flex flex-row gap-3">
              <Link href={`/profile/${post.authorHandle}`}>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{post.authorDisplayName?.charAt(0)}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm">{post.authorDisplayName}</span>
                  <span className="text-muted-foreground text-sm">@{post.authorHandle}</span>
                  {karma && (
                    <KarmaBadge postKarma={karma.post} commentKarma={karma.comment} compact />
                  )}
                  <RiskBadge
                    riskLevel={post.riskLevel}
                    maliciousScore={post.maliciousScore}
                  />
                  {post.nostrEventId && <SignatureBadge eventId={post.nostrEventId} />}
                </div>
                <span className="text-xs text-primary">{post.townTag}</span>
              </div>
            </CardHeader>
            <CardContent className="pl-[3.25rem] pt-0">
              <Link href={`/posts/${post.id}`}>
                <SafeContent text={text} className="text-[17px] leading-snug cursor-pointer hover:underline decoration-primary/30" />
              </Link>
            </CardContent>
            <CardFooter className="pl-[3.25rem] gap-4 text-muted-foreground text-sm py-2">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => onLike?.(post.id)}>
                <Heart className={`h-4 w-4 ${post.liked ? "fill-destructive text-destructive" : ""}`} />
                {post.likesCount}
              </Button>
              <Link href={`/posts/${post.id}`}>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  {post.repliesCount}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => onRepost?.(post.id)}
              >
                <Repeat2 className="h-4 w-4" />
                {post.repostsCount}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}