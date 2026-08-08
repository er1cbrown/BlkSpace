import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Clock } from "lucide-react";
import { getCurrentHandle } from "@/lib/auth";
import { useGuestMode } from "@/lib/guest-mode";
import { townGradient } from "@/lib/towns";
import {
  useTauriGetFollowing,
  useAppGetTrendingFeed,
} from "@/hooks/use-app-data";
import { isTauri } from "@/lib/tauri-api";
import {
  formatStoryTtl,
  listActiveStories,
  listStoriesForAuthor,
  listStoryAuthors,
  type YardStory,
} from "@/lib/yard-stories";
import { cn } from "@/lib/utils";

/**
 * Yard people strip + real 24h stories.
 *
 * - Story ring when the author has an unexpired story (local dual-mode store).
 * - People without stories still appear from following / trending (no fake users).
 * - Create path: /create with Story mode.
 */
export function StoryStrip() {
  const me = getCurrentHandle();
  const { isGuest } = useGuestMode();
  const [tick, setTick] = useState(0);
  const [viewerHandle, setViewerHandle] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    const onStories = () => setTick((t) => t + 1);
    window.addEventListener("blkspace-stories", onStories);
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => {
      window.removeEventListener("blkspace-stories", onStories);
      window.clearInterval(id);
    };
  }, []);

  const storyAuthors = useMemo(() => listStoryAuthors(), [tick]);
  const storyHandleSet = useMemo(
    () => new Set(storyAuthors.map((a) => a.handle)),
    [storyAuthors],
  );

  const { data: remoteFollowing = [] } = useTauriGetFollowing();
  const localFollowing: string[] = (() => {
    try {
      return JSON.parse(localStorage.getItem("blkspace_followed") || "[]");
    } catch {
      return [];
    }
  })();
  const followed = Array.from(
    new Set([...localFollowing, ...(remoteFollowing as string[])]),
  ).filter((h) => h && h !== me);

  const { data: trending = [] } = useAppGetTrendingFeed(me);
  const trendingAuthors = (trending as any[])
    .map((p) => p.authorHandle)
    .filter((h: string) => h && h !== me);

  /** Story authors first, then other network people. */
  const people = useMemo(() => {
    const fromStories = storyAuthors.map((a) => a.handle);
    const rest = Array.from(new Set([...followed, ...trendingAuthors])).filter(
      (h) => !storyHandleSet.has(h),
    );
    return [...fromStories, ...rest].slice(0, 12);
  }, [storyAuthors, followed, trendingAuthors, storyHandleSet]);

  const viewerStories: YardStory[] = viewerHandle
    ? listStoriesForAuthor(viewerHandle)
    : [];
  const activeStory = viewerStories[viewerIndex] ?? null;

  const openStories = (handle: string) => {
    const stories = listStoriesForAuthor(handle);
    if (stories.length === 0) return;
    setViewerHandle(handle);
    setViewerIndex(0);
  };

  const advance = () => {
    if (!viewerHandle) return;
    if (viewerIndex + 1 < viewerStories.length) {
      setViewerIndex((i) => i + 1);
      return;
    }
    setViewerHandle(null);
    setViewerIndex(0);
  };

  const myHasStory = me ? storyHandleSet.has(me) : false;
  const activeCount = listActiveStories().length;

  return (
    <>
      <div className="mb-6 -mx-1 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-4 px-1 min-w-min">
          {!isGuest && (
            <Link href="/create">
              <div className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 cursor-pointer">
                <div
                  className={cn(
                    "w-[68px] h-[68px] rounded-full p-[2px]",
                    myHasStory
                      ? "bg-gradient-to-br from-primary via-accent to-primary"
                      : "bg-gradient-to-br from-primary to-accent",
                  )}
                >
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground truncate w-full text-center">
                  {myHasStory ? "Your story" : "Add story"}
                </span>
              </div>
            </Link>
          )}

          {people.length === 0 && (
            <div className="flex items-center text-xs text-muted-foreground px-2 self-center">
              {isGuest
                ? "Follow creators to see people here — create an account to post a 24h story."
                : isTauri()
                  ? activeCount === 0
                    ? "No stories yet — post a 24h story from Create → Story."
                    : "No one here yet — follow creators or wait for trending posts."
                  : "Post a Story from Create, or follow others on the yard."}
            </div>
          )}

          {people.map((handle, i) => {
            const hasStory = storyHandleSet.has(handle);
            const authorMeta = storyAuthors.find((a) => a.handle === handle);
            const label = (authorMeta?.displayName || handle)
              .replace(/_/g, " ")
              .slice(0, 12);
            const ring = hasStory
              ? "bg-gradient-to-br from-fuchsia-500 via-primary to-amber-400"
              : `bg-gradient-to-br ${townGradient(
                  ["tsu", "howard", "famu", "spelman", "morehouse"][i % 5],
                )}`;

            if (hasStory) {
              return (
                <button
                  key={handle}
                  type="button"
                  className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 cursor-pointer bg-transparent border-0 p-0"
                  onClick={() => openStories(handle)}
                >
                  <div className={cn("w-[68px] h-[68px] rounded-full p-[2px]", ring)}>
                    <Avatar className="w-full h-full border-2 border-background">
                      <AvatarImage src="" />
                      <AvatarFallback className="text-sm font-semibold">
                        {handle.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-[11px] font-medium truncate w-full text-center capitalize">
                    {label}
                  </span>
                </button>
              );
            }

            return (
              <Link key={handle} href={`/profile/${handle}`}>
                <div className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 cursor-pointer">
                  <div className={cn("w-[68px] h-[68px] rounded-full p-[2px]", ring)}>
                    <Avatar className="w-full h-full border-2 border-background">
                      <AvatarImage src="" />
                      <AvatarFallback className="text-sm font-semibold">
                        {handle.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-[11px] font-medium truncate w-full text-center capitalize">
                    {label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <Dialog
        open={!!viewerHandle && !!activeStory}
        onOpenChange={(open) => {
          if (!open) {
            setViewerHandle(null);
            setViewerIndex(0);
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-primary/30">
          {activeStory && (
            <div className="relative min-h-[320px] bg-gradient-to-b from-background to-muted/40 flex flex-col">
              <div className="flex gap-1 p-2">
                {viewerStories.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      i <= viewerIndex ? "bg-primary" : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <DialogHeader className="px-4 pt-1 pb-2 text-left">
                <DialogTitle className="text-sm font-semibold flex items-center justify-between gap-2">
                  <Link
                    href={`/profile/${activeStory.authorHandle}`}
                    className="hover:underline"
                  >
                    @{activeStory.authorHandle}
                  </Link>
                  <span className="text-[11px] font-normal text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatStoryTtl(activeStory)}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <button
                type="button"
                className="flex-1 px-4 pb-4 text-left w-full min-h-[200px]"
                onClick={advance}
              >
                {activeStory.mediaDataUrls[0] ? (
                  <img
                    src={activeStory.mediaDataUrls[0]}
                    alt=""
                    className="w-full max-h-56 object-cover rounded-xl mb-3"
                  />
                ) : null}
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {activeStory.content}
                </p>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Yard · {activeStory.townTag} · tap to continue · gone in 24h
                </p>
              </button>

              <div className="flex justify-end gap-2 px-4 pb-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/profile/${activeStory.authorHandle}`}>
                    Profile
                  </Link>
                </Button>
                <Button size="sm" onClick={advance}>
                  {viewerIndex + 1 < viewerStories.length ? "Next" : "Close"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
