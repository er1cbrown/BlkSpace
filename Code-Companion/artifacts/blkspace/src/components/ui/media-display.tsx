import { useState, useEffect } from "react";
import {
  tauriGetBlobBytes,
  tauriGetBlobMetadata,
  isTauri,
  type TauriBlobInfo,
} from "@/lib/tauri-api";
import { getSessionToken } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaDisplayProps {
  hashes: string[];
  className?: string;
}

interface MediaItem {
  hash: string;
  src: string | null;
  info: TauriBlobInfo | null;
  loading: boolean;
}

export function MediaDisplay({ hashes, className = "" }: MediaDisplayProps) {
  const [items, setItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (!isTauri() || hashes.length === 0) return;
    setItems(
      hashes.map((h) => ({ hash: h, src: null, info: null, loading: true })),
    );

    const token = getSessionToken();
    if (!token) return;
    hashes.forEach(async (hash, i) => {
      const [b64, info] = await Promise.all([
        tauriGetBlobBytes(token, hash),
        tauriGetBlobMetadata(token, hash),
      ]);
      setItems((prev) => {
        const next = [...prev];
        next[i] = {
          hash,
          src: b64
            ? `data:${info?.mimeType ?? "application/octet-stream"};base64,${b64}`
            : null,
          info,
          loading: false,
        };
        return next;
      });
    });
  }, [hashes.join(",")]);

  if (!isTauri() || hashes.length === 0) return null;

  return (
    <div
      className={`grid gap-2 mt-3 ${hashes.length === 1 ? "grid-cols-1" : "grid-cols-2"} ${className}`}
    >
      {items.map((item) => {
        if (item.loading)
          return (
            <Skeleton
              key={item.hash}
              className="w-full aspect-video rounded-md"
            />
          );
        if (!item.src || !item.info) return null;

        const { mimeType, filename } = item.info;
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
