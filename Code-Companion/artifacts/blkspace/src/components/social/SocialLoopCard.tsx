import { Link } from "wouter";
import {
  Bell,
  Heart,
  MessageSquare,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTauriGetNotifications } from "@/hooks/use-app-data";
import type { TauriPost } from "@/lib/tauri-api";

interface SocialLoopCardProps {
  justPosted?: Pick<TauriPost, "id" | "content" | "authorHandle"> | null;
  followingCount: number;
  selectedTown: string;
  onDismiss?: () => void;
}

function activityLabel(type: string) {
  switch (type) {
    case "reply":
      return "replied to your post";
    case "follow":
      return "followed you";
    case "repost":
      return "reposted your post";
    default:
      return "interacted with your post";
  }
}

/**
 * Keeps the social loop visible beside the composer instead of hiding replies,
 * follows, and notifications behind separate destinations.
 */
export function SocialLoopCard({
  justPosted,
  followingCount,
  selectedTown,
  onDismiss,
}: SocialLoopCardProps) {
  const { data: notifications = [] } = useTauriGetNotifications();
  const unreadCount = notifications.filter((item) => item.unread).length;
  const replyCount = notifications.filter(
    (item) => item.notificationType === "reply",
  ).length;
  const latest = notifications.slice(0, 3);

  return (
    <Card className="mb-4 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold">Your social loop</h2>
              <p className="text-xs text-muted-foreground">
                Replies, follows, and notifications stay connected to the yard.
              </p>
            </div>
          </div>
          {onDismiss && justPosted && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              aria-label="Dismiss post confirmation"
              onClick={onDismiss}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {justPosted && (
          <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Your post is live in {selectedTown.toUpperCase()}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-foreground">
                  {justPosted.content}
                </p>
              </div>
              <Link href={`/posts/${justPosted.id}`}>
                <Button size="sm" className="h-8 shrink-0 text-xs">
                  Open post
                </Button>
              </Link>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <Link
                href={`/posts/${justPosted.id}`}
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Reply
              </Link>
              <span>·</span>
              <span>People who follow you can find it now</span>
              <span>·</span>
              <Link href="/notifications" className="hover:text-primary">
                View notifications
              </Link>
            </div>
          </div>
        )}

        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border/60 bg-background/70 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> Replies
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {replyCount || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">on your posts</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/70 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <UserPlus className="h-3.5 w-3.5" /> Following
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {followingCount}
            </p>
            <p className="text-[10px] text-muted-foreground">
              people in your circle
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/70 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Bell className="h-3.5 w-3.5" /> Unread
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {unreadCount}
            </p>
            <p className="text-[10px] text-muted-foreground">social updates</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold">Latest activity</p>
            <Link
              href="/notifications"
              className="text-[11px] font-medium text-primary hover:underline"
            >
              See all
            </Link>
          </div>
          {latest.length > 0 ? (
            <div className="space-y-1.5">
              {latest.map((item) => (
                <Link
                  key={String(item.id)}
                  href="/notifications"
                  className="flex items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-muted/50"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {item.notificationType === "follow" ? (
                      <UserPlus className="h-3 w-3" />
                    ) : item.notificationType === "reply" ? (
                      <MessageSquare className="h-3 w-3" />
                    ) : (
                      <Heart className="h-3 w-3" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {item.fromDisplayName || item.fromHandle || "Someone"}
                    </span>{" "}
                    {item.message || activityLabel(item.notificationType)}
                  </span>
                  {item.unread && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Your replies, follows, and notifications will appear here as
              people interact with you.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
