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
import {
  Download,
  FileText,
  FileVideo,
  Music,
  Play,
} from "lucide-react";
import {
  formatBytes,
  mediaKindFromMime,
  type MediaKind,
} from "@/lib/media-upload";
import { isWebBlobId, webGetBlob } from "@/lib/media-web-store";
import { cn } from "@/lib/utils";

interface MediaDisplayProps {
  hashes: string[];
  className?: string;
}

interface MediaItem {
  hash: string;
  src: string | null;
  info: TauriBlobInfo | null;
  loading: boolean;
  tapped: boolean;
}

const INLINE_LOAD_LIMIT = 8 * 1024 * 1024; // 8 MB auto-inline

function KindIcon({ kind, className }: { kind: MediaKind; className?: string }) {
  if (kind === "video") return <FileVideo className={className} />;
  if (kind === "audio") return <Music className={className} />;
  if (kind === "pdf" || kind === "doc") return <FileText className={className} />;
  return <Play className={className} />;
}

export function MediaDisplay({ hashes, className = "" }: MediaDisplayProps) {
  const [items, setItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (hashes.length === 0) {
      setItems([]);
      return;
    }

    // Web-session blobs (browser attach without Tauri)
    const webOnly = hashes.every((h) => isWebBlobId(h));
    if (webOnly || (!isTauri() && hashes.some((h) => isWebBlobId(h)))) {
      setItems(
        hashes.map((hash) => {
          const rec = webGetBlob(hash);
          if (!rec) {
            return {
              hash,
              src: null,
              info: null,
              loading: false,
              tapped: false,
            };
          }
          return {
            hash,
            src: rec.dataUrl,
            info: {
              hash,
              filename: rec.filename,
              mimeType: rec.mime,
              fileSize: rec.size,
              uploaderHandle: "",
              createdAt: "",
            } as TauriBlobInfo,
            loading: false,
            tapped: true,
          };
        }),
      );
      return;
    }

    if (!isTauri()) return;

    setItems(
      hashes.map((h) => ({
        hash: h,
        src: null,
        info: null,
        loading: true,
        tapped: false,
      })),
    );

    const token = getSessionToken();
    if (!token) return;

    hashes.forEach(async (hash, i) => {
      if (isWebBlobId(hash)) {
        const rec = webGetBlob(hash);
        setItems((prev) => {
          const next = [...prev];
          next[i] = rec
            ? {
                hash,
                src: rec.dataUrl,
                info: {
                  hash,
                  filename: rec.filename,
                  mimeType: rec.mime,
                  fileSize: rec.size,
                  uploaderHandle: "",
                  createdAt: "",
                } as TauriBlobInfo,
                loading: false,
                tapped: true,
              }
            : {
                hash,
                src: null,
                info: null,
                loading: false,
                tapped: false,
              };
          return next;
        });
        return;
      }

      const info = await tauriGetBlobMetadata(token, hash);
      const size = info?.fileSize ?? 0;
      const kind = mediaKindFromMime(info?.mimeType || "", info?.filename);
      const large =
        size > INLINE_LOAD_LIMIT || kind === "pdf" || kind === "doc";

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

  const download = async (item: MediaItem) => {
    const token = getSessionToken();
    if (!token || !item.info) return;
    let src = item.src;
    if (!src) {
      const b64 = await tauriGetBlobBytes(token, item.hash);
      if (!b64) return;
      src = `data:${item.info.mimeType};base64,${b64}`;
    }
    const a = document.createElement("a");
    a.href = src;
    a.download = item.info.filename || "download";
    a.click();
  };

  if (hashes.length === 0) return null;
  // Allow web blob ids without Tauri; pure tauri hashes need desktop
  if (!isTauri() && !hashes.some((h) => isWebBlobId(h))) return null;

  return (
    <div
      className={cn(
        "grid gap-2 mt-3",
        hashes.length === 1 ? "grid-cols-1" : "grid-cols-2",
        className,
      )}
    >
      {items.map((item, i) => {
        if (item.loading) {
          return (
            <Skeleton
              key={item.hash}
              className="w-full aspect-video rounded-md"
            />
          );
        }
        if (!item.info) return null;

        const { mimeType, filename, fileSize } = item.info;
        const kind = mediaKindFromMime(mimeType, filename);
        const large =
          fileSize > INLINE_LOAD_LIMIT || kind === "pdf" || kind === "doc";

        if (large && !item.tapped && !item.src) {
          return (
            <div
              key={item.hash}
              className="w-full rounded-md bg-muted/60 border border-dashed border-border/60 p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground"
            >
              <KindIcon kind={kind} className="w-8 h-8" />
              <span className="text-xs font-medium text-center line-clamp-2 px-2">
                {filename}
              </span>
              <span className="text-[10px]">
                {kind.toUpperCase()} · {formatBytes(fileSize)}
              </span>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  onClick={() => loadLarge(i)}
                >
                  {kind === "pdf" ? "Open PDF" : kind === "doc" ? "Open file" : "Load media"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1"
                  onClick={() => download(item)}
                >
                  <Download className="w-3.5 h-3.5" />
                  Save
                </Button>
              </div>
            </div>
          );
        }

        if (!item.src) return null;

        if (kind === "image" || mimeType.startsWith("image/")) {
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
        if (kind === "video" || mimeType.startsWith("video/")) {
          return (
            <video
              key={item.hash}
              src={item.src}
              controls
              className="w-full rounded-md max-h-96 bg-black"
              preload="metadata"
            >
              <source src={item.src} type={mimeType} />
            </video>
          );
        }
        if (kind === "audio" || mimeType.startsWith("audio/")) {
          return (
            <div
              key={item.hash}
              className="rounded-md border bg-muted/30 p-3 space-y-2"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Music className="w-4 h-4" />
                <span className="truncate">{filename}</span>
              </div>
              <audio src={item.src} controls className="w-full" preload="none">
                <source src={item.src} type={mimeType} />
              </audio>
            </div>
          );
        }
        if (kind === "pdf" || mimeType === "application/pdf") {
          return (
            <div key={item.hash} className="rounded-md border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/40 text-xs">
                <span className="truncate font-medium">{filename}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => download(item)}
                >
                  <Download className="w-3.5 h-3.5" />
                  Save
                </Button>
              </div>
              <iframe
                title={filename}
                src={item.src}
                className="w-full h-80 bg-background"
              />
            </div>
          );
        }

        // Generic file card
        return (
          <div
            key={item.hash}
            className="rounded-md border bg-muted/30 p-4 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-8 h-8 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{filename}</p>
                <p className="text-[10px] text-muted-foreground">
                  {mimeType} · {formatBytes(fileSize)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0 gap-1"
              onClick={() => download(item)}
            >
              <Download className="w-3.5 h-3.5" />
              Save
            </Button>
          </div>
        );
      })}
    </div>
  );
}
