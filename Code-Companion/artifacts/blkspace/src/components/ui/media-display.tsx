import { useState, useEffect } from "react";
import {
  tauriGetBlobBytes,
  tauriGetBlobMetadata,
  isTauri,
  type TauriBlobInfo,
} from "@/lib/tauri-api";
import { getSessionToken } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Play, FileVideo } from "lucide-react";

interface MediaDisplayProps {
  hashes: string[];
  className?: string;
}

interface MediaItem {
  hash: string;
  src: string | null;
  info: TauriBlobInfo | null;
  loading: boolean;
  /** User tapped "load" on a large blob — fetch full bytes. */
  tapped: boolean;
}

/** Blobs larger than this are not auto-loaded inline (keeps the feed fast). */
const INLINE_LOAD_LIMIT = 8 * 1024 * 1024; // 8 MB

export function MediaDisplay({ hashes, className = "" }: MediaDisplayProps) {
  const [items, setItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (!isTauri() || hashes.length === 0) return;
    setItems(
      hashes.map((h) => ({ hash: h, src: null, info: null, loading: true, tapped: false })),
    );

    const token = getSessionToken();
    if (!token) return;

    // Fetch metadata first (cheap), then bytes only for small blobs.
    hashes.forEach(async (hash, i) => {
      const info = await tauriGetBlobMetadata(token, hash);
      const size = info?.fileSize ?? 0;
      const large = size > INLINE_LOAD_LIMIT;

      setItems((prev) => {
        const next = [...prev];
        next[i] = {
          hash,
          src: null,
          info,
          loading: large ? false : true,
          tapped: false,
        };
        return next;
      });

      // Auto-load only small media inline; large media waits for a tap.
      if (large) return;

      const b64 = await tauriGetBlobBytes(token, hash);
      setItems((prev) => {
        const next = [...prev];
        next[i] = {
          hash,
          src: b64
            ? `data:${info?.mimeType ?? "application/octet-stream"};base64,${b64}`
            : null,
          info,
          loading: false,
          tapped: false,
        };
        return next;
      });
    });
  }, [hashes.join(",")]);

  const loadLarge = async (i: number) => {
    const token = getSessionToken();
    if (!token) return;
    setItems((prev) => {
      const next = [...prev];
      if (next[i]) next[i].loading = true;
      return next;
    });
    const hash = items[i]?.hash;
    if (!hash) return;
    const b64 = await tauriGetBlobBytes(token, hash);
    setItems((prev) => {
      const next = [...prev];
      next[i] = {
        ...next[i],
        src: b64
          ? `data:${next[i].info?.mimeType ?? "application/octet-stream"};base64,${b64}`
          : null,
        loading: false,
        tapped: true,
      };
      return next;
    });
  };

  if (!isTauri() || hashes.length === 0) return null;

  return (
    <div
      className={`grid gap-2 mt-3 ${hashes.length === 1 ? "grid-cols-1" : "grid-cols-2"} ${className}`}
    >
      {items.map((item, i) => {
        if (item.loading)
          return (
            <Skeleton
              key={item.hash}
              className="w-full aspect-video rounded-md"
            />
          );
        if (!item.info) return null;

        const { mimeType, filename, fileSize } = item.info;
        const large = fileSize > INLINE_LOAD_LIMIT;

        // Large media: show a tap-to-load placeholder so the feed doesn't block.
        if (large && !item.tapped) {
          return (
            <button
              key={item.hash}
              type="button"
              onClick={() => loadLarge(i)}
              className="w-full aspect-video rounded-md bg-muted/60 border border-dashed border-border/60 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted transition-colors"
            >
              {mimeType.startsWith("video/") ? (
                <FileVideo className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8" />
              )}
              <span className="text-xs font-medium">
                Tap to load {mimeType.startsWith("video/") ? "video" : "media"}
              </span>
              <span className="text-[10px]">
                {(fileSize / 1024 / 1024).toFixed(1)} MB
              </span>
            </button>
          );
        }
        if (!item.src) return null;

        if (mimeType.startsWith("image/")) {
          return (
            <img
              key={item.hash}
              src={item.src}
              alt={filename}
              className="w-full rounded-md object-cover max-h-96"
              loading="lazy"
            />
          );
        }
        if (mimeType.startsWith("video/")) {
          return (
            <video
              key={item.hash}
              src={item.src}
              controls
              className="w-full rounded-md max-h-96"
              preload="metadata"
            >
              <source src={item.src} type={mimeType} />
            </video>
          );
        }
        if (mimeType.startsWith("audio/")) {
          return (
            <audio
              key={item.hash}
              src={item.src}
              controls
              className="w-full mt-2"
              preload="none"
            >
              <source src={item.src} type={mimeType} />
            </audio>
          );
        }
        return null;
      })}
    </div>
  );
}
