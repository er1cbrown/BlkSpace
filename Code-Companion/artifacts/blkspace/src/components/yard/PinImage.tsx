import { useEffect, useState } from "react";
import { isSafeHttpUrl } from "@/lib/amalgamation-meta";
import { webGetBlobAsync } from "@/lib/media-web-store";

/** One photo for a pin. Remote links load directly. Uploads stay in IndexedDB. */
export function PinImage({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isSafeHttpUrl(src)) {
      setUrl(src);
      return;
    }
    let cancel = false;
    setUrl(null);
    void webGetBlobAsync(src).then((rec) => {
      if (!cancel) setUrl(rec?.dataUrl || null);
    });
    return () => {
      cancel = true;
    };
  }, [src]);

  if (!url) {
    return (
      <div className="aspect-[3/4] bg-muted text-[11px] text-muted-foreground grid place-items-center px-2 text-center">
        Photo stays on the device that pinned it
      </div>
    );
  }

  return (
    <img src={url} alt={alt} className="w-full h-auto block" loading="lazy" />
  );
}
