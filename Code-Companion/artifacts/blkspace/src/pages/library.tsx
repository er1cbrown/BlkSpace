import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppCreatePost } from "@/hooks/use-app-data";
import { fitImageForUpload } from "@/lib/fit-image";
import { checkWebLocalLimit } from "@/lib/media-upload";
import { webStoreFile } from "@/lib/media-web-store";
import { uploadHostedMedia } from "@/lib/remote-media";
import { loadUiPrefs } from "@/lib/ui-prefs";
import {
  loadPostedYardIds,
  readyYardPhotos,
  rememberPostedYardId,
  type YardPhotoItem,
  type YardPhotoManifest,
} from "@/lib/yard-photo-loop";
import { useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const PREPARE =
  "~/.venvs/ds/bin/python tools/yard_photo_loop.py";

async function fileFromPublish(item: YardPhotoItem): Promise<File> {
  const res = await fetch(
    `/api/yard-photos/file?name=${encodeURIComponent(item.file)}`,
  );
  if (!res.ok) throw new Error(`Could not read ${item.file}.`);
  const blob = await res.blob();
  const picked = new File([blob], item.file, { type: item.mime || "image/jpeg" });
  const file = await fitImageForUpload(picked);
  const local = checkWebLocalLimit(file);
  if (!local.ok) throw new Error(local.reason);
  return file;
}

async function storePic(file: File): Promise<string> {
  try {
    const hosted = await uploadHostedMedia(file);
    if (hosted) return hosted;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Sign in")) throw err;
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Read failed"));
    reader.readAsDataURL(file);
  });
  const saved = await webStoreFile(file, dataUrl);
  return saved.id;
}

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const createPost = useAppCreatePost();
  const town = loadUiPrefs().homeYardId || "tsu";
  const [manifest, setManifest] = useState<YardPhotoManifest | null>(null);
  const [posted, setPosted] = useState<number[]>(() => loadPostedYardIds());
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/yard-photos/manifest");
    if (!res.ok) {
      setError("The prepare list could not be loaded.");
      return;
    }
    setManifest((await res.json()) as YardPhotoManifest);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const postOne = async (item: YardPhotoItem) => {
    setBusyId(item.id);
    setError("");
    try {
      const file = await fileFromPublish(item);
      const hash = await storePic(file);
      await new Promise<void>((resolve, reject) => {
        createPost.mutate(
          {
            content: item.caption,
            town_tag: town,
            media_hashes: [hash],
          },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ["web", "posts"] });
              queryClient.invalidateQueries({ queryKey: ["web", "userPosts"] });
              resolve();
            },
            onError: (err: unknown) =>
              reject(err instanceof Error ? err : new Error("Post failed")),
          },
        );
      });
      setPosted(rememberPostedYardId(item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Post failed");
    } finally {
      setBusyId(null);
    }
  };

  const items = manifest?.items ?? [];
  const ready = readyYardPhotos(items);
  const held = items.filter((item) => item.status !== "ready");

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <ImageIcon className="h-6 w-6 text-primary" />
        Library
      </h1>
      <p className="text-sm text-muted-foreground mb-4">
        digiKam picks the photo. Darktable exports a RAW. pyvips makes the
        1600px JPEG. This page posts that file to the yard wall and your grid.
        The originals in Pictures stay where they are.
      </p>
      <Card className="mb-4">
        <CardContent className="pt-4 text-sm space-y-2">
          <p>
            In digiKam, give a photo a star, the Accepted label, or a tag you
            created. For a RAW, export a JPEG or TIFF with the same name beside
            it. Then run:
          </p>
          <code className="block text-xs bg-muted rounded px-2 py-1 overflow-x-auto">
            {PREPARE}
          </code>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            Refresh list
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      {manifest?.missing && (
        <p className="text-sm text-muted-foreground">
          No prepare list yet. Rate a photo in digiKam, then run the command
          above.
        </p>
      )}

      {manifest && !manifest.missing && ready.length === 0 && held.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing is picked. A star, the Accepted label, or a tag you created
          is what this loop publishes.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {ready.map((item) => {
          const done = posted.includes(item.id);
          return (
            <Card key={item.id}>
              <CardContent className="pt-4 space-y-2">
                <img
                  src={`/api/yard-photos/file?name=${encodeURIComponent(item.file)}`}
                  alt={item.caption}
                  className="w-full rounded-md object-cover max-h-64 bg-muted"
                />
                <p className="text-sm font-medium">{item.caption}</p>
                <p className="text-xs text-muted-foreground">
                  {item.rating > 0 ? `${item.rating} star · ` : ""}
                  {item.width}×{item.height} · {Math.ceil(item.bytes / 1024)} KB
                  {item.detail ? ` · ${item.detail}` : ""}
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={done || busyId !== null}
                  onClick={() => void postOne(item)}
                >
                  {busyId === item.id && (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  )}
                  {done ? "Posted" : "Post to the yard"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {held.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="text-sm font-semibold">Not ready to post</h2>
          {held.map((item) => (
            <p key={item.id} className="text-xs text-muted-foreground">
              {item.name}: {item.detail || item.status}
            </p>
          ))}
        </div>
      )}
    </AppShell>
  );
}
