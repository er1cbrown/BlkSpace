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
 * Yard people strip — real network data only (no mock avatars).
 *
 * Avatars/handles come from (1) following list and (2) trending feed authors.
 * Circles link to profiles. True 24h ephemeral "stories" media is deferred
 * (amalgamation P0: real stories later; never show fake people).
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
                You
              </span>
            </div>
          </Link>
        )}

        {authors.length === 0 && (
          <div className="flex items-center text-xs text-muted-foreground px-2 self-center">
            {isGuest
              ? "Follow creators to see people here — create an account to start."
              : isTauri()
                ? "No one here yet — follow creators or wait for trending posts."
                : "People appear once you follow others on the yard."}
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
