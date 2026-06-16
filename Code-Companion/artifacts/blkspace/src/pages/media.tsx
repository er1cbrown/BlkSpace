import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  tauriListUserBlobs,
  tauriUploadBlob,
  tauriDeleteBlob,
  tauriGetBlobBytes,
  tauriPinContent,
  tauriListPinnedContent,
  isTauri,
  type TauriBlobInfo,
} from "@/lib/tauri-api";
import { getSessionToken } from "@/lib/auth";
import { toast } from "sonner";
import { Trash2, Upload, Image, Film, Music, File, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Link } from "wouter";

function blobIcon(mime: string) {
  if (mime.startsWith("image/")) return <Image className="h-4 w-4" />;
  if (mime.startsWith("video/")) return <Film className="h-4 w-4" />;
  if (mime.startsWith("audio/")) return <Music className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

function BlobPreview({ hash, mimeType, filename }: { hash: string; mimeType: string; filename: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isTauri()) return;
    const token = getSessionToken();
    if (!token) return;
    setLoading(true);
    tauriGetBlobBytes(token, hash).then((b64) => {
      if (b64) setSrc(`data:${mimeType};base64,${b64}`);
      setLoading(false);
    });
  }, [hash, mimeType]);

  if (loading) return <Skeleton className="w-full aspect-square rounded-md" />;
  if (!src) return <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm">Unavailable</div>;

  if (mimeType.startsWith("image/")) {
    return <img src={src} alt={filename} className="w-full aspect-square object-cover rounded-md" loading="lazy" />;
  }
  if (mimeType.startsWith("video/")) {
    return <video src={src} controls className="w-full rounded-md" preload="metadata" />;
  }
  if (mimeType.startsWith("audio/")) {
    return <audio src={src} controls className="w-full" preload="none" />;
  }
  return <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm">{filename}</div>;
}

export default function MediaPage() {
  const [blobs, setBlobs] = useState<TauriBlobInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isTauri()) return;
    const token = getSessionToken();
    if (!token) return;
    tauriListUserBlobs(token).then(setBlobs).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    const token = getSessionToken();
    if (!token) return;
    tauriListPinnedContent(token).then(setPinned).catch(() => {});
  }, []);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const token = getSessionToken();
    if (!token) { toast.error("Please sign in"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large (max 20MB)"); return; }

    setUploading(true);
    try {
      const reader = new FileReader();
      const b64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const info = await tauriUploadBlob(token, b64, file.name);
      setBlobs((prev) => [info, ...prev]);
      toast.success("Uploaded!");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      toast.error(String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (hash: string) => {
    const token = getSessionToken();
    if (!token) return;
    try {
      await tauriDeleteBlob(token, hash);
      setBlobs((prev) => prev.filter((b) => b.hash !== hash));
      toast.success("Deleted");
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handlePin = async (hash: string) => {
    const token = getSessionToken();
    if (!token || !isTauri()) { toast.info("Pinning in Tauri"); return; }
    try {
      await tauriPinContent(token, hash);
      setPinned((prev) => [...prev, hash]);
      toast.success("Pinned! Earns node rewards on serves.");
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container max-w-4xl py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/feed">
            <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Feed
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              My Media
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*,audio/*"
                className="flex-1 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                onChange={handleUpload}
                disabled={uploading}
              />
              {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : blobs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No media uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {blobs.map((blob) => (
                  <Card key={blob.hash} className="overflow-hidden relative group">
                    <BlobPreview hash={blob.hash} mimeType={blob.mimeType} filename={blob.filename} />
                    <div className="p-2 space-y-1">
                      <p className="text-xs truncate flex items-center gap-1">
                        {blobIcon(blob.mimeType)}
                        {blob.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(blob.fileSize / 1024).toFixed(1)} KB
                      </p>
                      {blob.cid && (
                        <p className="text-[10px] text-muted-foreground/70 truncate font-mono" title={blob.cid}>
                          cid: {blob.cid.slice(0, 10)}…
                        </p>
                      )}
                      <Button
                        size="sm"
                        variant={pinned.includes(blob.hash) ? "secondary" : "outline"}
                        className="mt-1 h-6 text-[10px]"
                        onClick={() => handlePin(blob.hash)}
                        disabled={pinned.includes(blob.hash)}
                      >
                        {pinned.includes(blob.hash) ? "Pinned ✓" : "Pin for rewards"}
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                      onClick={() => handleDelete(blob.hash)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
