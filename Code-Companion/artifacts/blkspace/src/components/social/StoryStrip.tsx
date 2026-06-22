import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { getCurrentHandle } from "@/lib/auth";
import { useGuestMode } from "@/lib/guest-mode";
import { townGradient } from "@/lib/towns";
import {
  useTauriGetFollowing,
  useAppGetTrendingFeed,
} from "@/hooks/use-app-data";
import { isTauri } from "@/lib/tauri-api";

/**
 * Story strip — wired to real network data, not hardcoded mocks.
 *
 * Sources avatars/handles from (1) the user's following list and (2) trending
 * feed authors, so the strip reflects actual people on the yard. Each circle
 * links to the creator's profile (real stories with 24h expiry are a later
 * phase; this replaces the fake mock with honest navigation).
 */
export function StoryStrip() {
  const me = getCurrentHandle();
  const { isGuest } = useGuestMode();

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
    .filter((h) => h && h !== me);

  const authors = Array.from(new Set([...followed, ...trendingAuthors])).slice(
    0,
    10,
  );

  return (
    <div className="mb-6 -mx-1 overflow-x-auto pb-2 scrollbar-hide">
      <div className="flex gap-4 px-1 min-w-min">
        {!isGuest && (
          <Link href={`/profile/${me}`}>
            <div className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 cursor-pointer">
              <div className="w-[68px] h-[68px] rounded-full bg-gradient-to-br from-primary to-accent p-[2px]">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground truncate w-full text-center">
                Your story
              </span>
            </div>
          </Link>
        )}

        {authors.length === 0 && (
          <div className="flex items-center text-xs text-muted-foreground px-2 self-center">
            {isGuest
              ? "Follow creators to see their latest here — create an account to start."
              : isTauri()
                ? "No stories yet — follow creators or wait for trending posts."
                : "Stories appear once you follow people on the yard."}
          </div>
        )}

        {authors.map((handle, i) => (
          <Link key={handle} href={`/profile/${handle}`}>
            <div className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 cursor-pointer">
              <div
                className={`w-[68px] h-[68px] rounded-full bg-gradient-to-br ${townGradient(
                  ["tsu", "howard", "famu", "spelman", "morehouse"][i % 5],
                )} p-[2px]`}
              >
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-sm font-semibold">
                    {handle.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center capitalize">
                {handle.replace(/_/g, " ").slice(0, 12)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
