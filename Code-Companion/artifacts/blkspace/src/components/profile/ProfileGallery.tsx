import { useEffect, useState } from "react";
import { getSessionToken } from "@/lib/auth";
import { isTauri, tauriGetBlobBytes } from "@/lib/tauri-api";
import type { MyYardAesthetic } from "@/lib/myyard-layout";
import { ImageIcon } from "lucide-react";

interface Props {
  aesthetic: MyYardAesthetic;
  emptyHint?: string;
}

/**
 * Featured photo strip on public MyYard — multimedia first impression.
 */
export function ProfileGallery({ aesthetic, emptyHint }: Props) {
  const [srcs, setSrcs] = useState<Record<string, string>>({});

  useEffect(() => {
    const urls = { ...aesthetic.galleryDataUrls };
    setSrcs(urls);
    if (!isTauri()) return;
    const token = getSessionToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      for (const hash of aesthetic.galleryHashes) {
        if (urls[hash]) continue;
        try {
          const b64 = await tauriGetBlobBytes(token, hash);
          if (b64 && !cancelled) {
            setSrcs((prev) => ({
              ...prev,
              [hash]: `data:image/jpeg;base64,${b64}`,
            }));
          }
        } catch {
          /* skip */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aesthetic.galleryHashes, aesthetic.galleryDataUrls]);

  if (!aesthetic.showGallery) return null;

  const keys =
    aesthetic.galleryHashes.length > 0
      ? aesthetic.galleryHashes
      : Object.keys(aesthetic.galleryDataUrls);

  if (keys.length === 0) {
    if (!emptyHint) return null;
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground mb-6">
        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-primary myyard-accent-text" />
        Photos
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {keys.map((k) => {
          const src = srcs[k] || aesthetic.galleryDataUrls[k];
          return (
            <div
              key={k}
              className="aspect-square rounded-xl overflow-hidden border bg-muted/40"
            >
              {src ? (
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full animate-pulse bg-muted" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
