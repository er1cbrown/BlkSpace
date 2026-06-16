import { Link } from "wouter";
import { Image, Film, Grid3X3 } from "lucide-react";
import { MediaDisplay } from "@/components/ui/media-display";
import { SafeContent } from "@/components/ui/safe-content";
import type { TauriPost } from "@/lib/tauri-api";
import type { TauriBlobInfo } from "@/lib/tauri-api";

interface ProfileGridProps {
  posts: TauriPost[];
  blobs?: TauriBlobInfo[];
  handle: string;
}

/** Instagram-style profile grid — account-bound media surface */
export function ProfileGrid({ posts, blobs = [], handle }: ProfileGridProps) {
  const mediaPosts = posts.filter((p) => p.mediaBlobs?.length > 0);
  const textPosts = posts.filter((p) => !p.mediaBlobs?.length);

  const cells: Array<
    | { type: "post"; id: number; hash?: string; preview?: string }
    | { type: "blob"; hash: string; mime: string }
  > = [
    ...mediaPosts.map((p) => ({
      type: "post" as const,
      id: p.id,
      hash: p.mediaBlobs[0],
      preview: p.content.slice(0, 60),
    })),
    ...blobs
      .filter((b) => !mediaPosts.some((p) => p.mediaBlobs.includes(b.hash)))
      .map((b) => ({ type: "blob" as const, hash: b.hash, mime: b.mimeType })),
  ];

  if (cells.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed rounded-2xl text-muted-foreground text-sm">
        <Grid3X3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
        @{handle} hasn't posted media yet. Uploads appear here — not on a separate tab.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 md:gap-1">
      {cells.map((cell, i) => {
        if (cell.type === "post") {
          return (
            <Link key={`p-${cell.id}`} href={`/posts/${cell.id}`}>
              <div className="aspect-square bg-muted relative overflow-hidden group cursor-pointer">
                {cell.hash ? (
                  <MediaDisplay hashes={[cell.hash]} className="w-full h-full object-cover" />
                ) : (
                  <div className="p-2 text-xs">
                    <SafeContent text={cell.preview ?? ""} className="line-clamp-6" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Image className="h-6 w-6 text-white" />
                </div>
              </div>
            </Link>
          );
        }
        const isVideo = cell.mime.startsWith("video/");
        return (
          <div key={`b-${cell.hash}`} className="aspect-square bg-muted relative overflow-hidden">
            <MediaDisplay hashes={[cell.hash]} className="w-full h-full object-cover" />
            <div className="absolute bottom-1 right-1">
              {isVideo ? (
                <Film className="h-4 w-4 text-white drop-shadow" />
              ) : (
                <Image className="h-4 w-4 text-white drop-shadow" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}