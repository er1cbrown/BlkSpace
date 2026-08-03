import { useEffect, useId, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Music,
  Paperclip,
  X,
} from "lucide-react";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import { useAppGetUser } from "@/hooks/use-app-data";
import { TOWN_OPTIONS, townLabel } from "@/lib/towns";
import { isTauri, tauriUploadBlob, type TauriEarnResult } from "@/lib/tauri-api";
import { toast } from "sonner";
import {
  MEDIA_ACCEPT,
  type PendingAttach,
  fileToBase64,
  formatBytes,
  isAllowedUpload,
  kindLabel,
  mediaKindFromFile,
} from "@/lib/media-upload";
import { isWebBlobId, webDeleteBlob, webStoreFile } from "@/lib/media-web-store";
import { cn } from "@/lib/utils";

interface PostComposerProps {
  content: string;
  onContentChange: (value: string) => void;
  selectedTown: string;
  onTownChange: (town: string) => void;
  mediaHashes: string[];
  onMediaHashesChange: (hashes: string[]) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  placeholder?: string;
  onUploadSuccess?: (earn: TauriEarnResult) => void;
  maxFiles?: number;
}

function KindIcon({ kind }: { kind: PendingAttach["kind"] }) {
  const cls = "h-4 w-4 shrink-0";
  switch (kind) {
    case "image":
      return <ImageIcon className={cls} />;
    case "video":
      return <Film className={cls} />;
    case "audio":
      return <Music className={cls} />;
    case "pdf":
    case "doc":
      return <FileText className={cls} />;
    default:
      return <Paperclip className={cls} />;
  }
}

export function PostComposer({
  content,
  onContentChange,
  selectedTown,
  onTownChange,
  mediaHashes,
  onMediaHashesChange,
  onSubmit,
  isSubmitting = false,
  placeholder = "What's happening on the yard?",
  onUploadSuccess,
  maxFiles = 6,
}: PostComposerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const prevHashCount = useRef(mediaHashes.length);
  const handle = getCurrentHandle();
  const { data: user } = useAppGetUser(handle);
  const [pending, setPending] = useState<PendingAttach[]>([]);
  const [uploading, setUploading] = useState(false);

  // Push ready hashes to parent (never clear pending from here)
  useEffect(() => {
    const ready = pending
      .filter((p) => p.status === "ready" && p.hash)
      .map((p) => p.hash);
    const same =
      ready.length === mediaHashes.length &&
      ready.every((h, i) => h === mediaHashes[i]);
    if (!same) onMediaHashesChange(ready);
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only clear previews when parent goes non-empty → empty (successful post)
  useEffect(() => {
    const prev = prevHashCount.current;
    prevHashCount.current = mediaHashes.length;
    if (prev > 0 && mediaHashes.length === 0 && pending.length > 0) {
      pending.forEach((p) => {
        if (p.previewUrl.startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
        if (p.hash && isWebBlobId(p.hash)) webDeleteBlob(p.hash);
      });
      setPending([]);
    }
  }, [mediaHashes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      // revoke only on unmount via ref snapshot
    };
  }, []);

  const removeAt = (index: number) => {
    setPending((prev) => {
      const item = prev[index];
      if (item?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
      if (item?.hash && isWebBlobId(item.hash)) webDeleteBlob(item.hash);
      return prev.filter((_, i) => i !== index);
    });
  };

  const openPicker = () => {
    const el = fileRef.current;
    if (!el) {
      toast.error("File picker unavailable — refresh the page");
      return;
    }
    el.value = "";
    el.click();
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    const room = maxFiles - pending.length;
    if (room <= 0) {
      toast.error(`Max ${maxFiles} files per post`);
      return;
    }
    const batch = list.slice(0, room);
    if (list.length > room) {
      toast.message(`Only ${room} more file(s) allowed on this post`);
    }

    const tauri = isTauri();
    const token = getSessionToken();
    if (tauri && !token) {
      toast.error("Sign in to attach files in the desktop app");
      return;
    }

    setUploading(true);
    for (const file of batch) {
      const check = isAllowedUpload(file);
      if (!check.ok) {
        toast.error(`${file.name}: ${check.reason}`);
        continue;
      }

      const kind = mediaKindFromFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPending((prev) => [
        ...prev,
        {
          previewUrl,
          hash: "",
          filename: file.name,
          kind,
          mime: file.type || "application/octet-stream",
          size: file.size,
          status: "uploading",
        },
      ]);

      try {
        if (tauri && token) {
          const b64 = await fileToBase64(file);
          const info = await tauriUploadBlob(token, b64, file.name);
          setPending((prev) =>
            prev.map((p) =>
              p.previewUrl === previewUrl
                ? { ...p, hash: info.hash, status: "ready" as const }
                : p,
            ),
          );
          if (info.earn && (info.earn.wb > 0 || info.earn.karmaPost > 0)) {
            onUploadSuccess?.(info.earn);
          } else {
            toast.success(`${file.name} attached`);
          }
        } else {
          // Browser: local session store (no Tauri IPC)
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = () => reject(r.error);
            r.readAsDataURL(file);
          });
          const id = webStoreFile(file, dataUrl);
          setPending((prev) =>
            prev.map((p) =>
              p.previewUrl === previewUrl
                ? { ...p, hash: id, status: "ready" as const }
                : p,
            ),
          );
          toast.success(`${file.name} attached (browser session)`);
        }
      } catch (e) {
        setPending((prev) =>
          prev.map((p) =>
            p.previewUrl === previewUrl
              ? {
                  ...p,
                  status: "error" as const,
                  error: e instanceof Error ? e.message : String(e),
                }
              : p,
          ),
        );
        toast.error(
          `${file.name}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) void uploadFiles(e.target.files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
  };

  const canPost =
    (content.trim().length > 0 ||
      pending.some((p) => p.status === "ready")) &&
    !pending.some((p) => p.status === "uploading") &&
    !isSubmitting &&
    !uploading;

  return (
    <Card
      className="border-primary/20 shadow-md mb-6 overflow-hidden"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={onDrop}
    >
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-secondary" />
      <CardContent className="pt-5 pb-4">
        <div className="flex gap-3">
          <Avatar className="h-11 w-11 border-2 border-primary/25 shrink-0">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className="bg-primary/15 text-primary font-bold">
              {user?.displayName?.charAt(0) ?? handle.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-semibold text-sm">
                {user?.displayName ?? handle}
              </span>
              <Badge variant="outline" className="text-[10px] h-5">
                {townLabel(user?.town ?? selectedTown)}
              </Badge>
            </div>
            <Textarea
              placeholder={placeholder}
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className="min-h-[88px] mb-3 border-none resize-none focus-visible:ring-0 text-base p-0 bg-transparent"
            />

            {pending.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {pending.map((p, i) => (
                  <div
                    key={p.previewUrl}
                    className={cn(
                      "relative rounded-xl border overflow-hidden bg-muted/40",
                      p.status === "error" && "border-destructive/50",
                    )}
                  >
                    {p.kind === "image" ? (
                      <img
                        src={p.previewUrl}
                        alt={p.filename}
                        className="w-full h-28 object-cover"
                      />
                    ) : p.kind === "video" ? (
                      <video
                        src={p.previewUrl}
                        className="w-full h-28 object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="h-28 flex flex-col items-center justify-center gap-1 p-2 text-center">
                        <KindIcon kind={p.kind} />
                        <span className="text-[11px] font-medium line-clamp-2">
                          {p.filename}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {kindLabel(p.kind)} · {formatBytes(p.size)}
                        </span>
                      </div>
                    )}
                    {p.status === "uploading" && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 border flex items-center justify-center z-10"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 px-1.5 py-0.5 bg-background/80 text-[10px] truncate">
                      {p.status === "ready"
                        ? kindLabel(p.kind)
                        : p.status === "error"
                          ? "Failed"
                          : "Uploading…"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-border/50 gap-2">
              <div className="flex items-center gap-1 min-w-0">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={selectedTown} onValueChange={onTownChange}>
                  <SelectTrigger className="w-[130px] h-8 border-none bg-muted/50 text-xs">
                    <SelectValue placeholder="Town" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOWN_OPTIONS.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Always in DOM; label+button both open picker */}
                <input
                  id={inputId}
                  ref={fileRef}
                  type="file"
                  accept={MEDIA_ACCEPT}
                  multiple
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 shrink-0 text-xs cursor-pointer"
                  disabled={uploading || pending.length >= maxFiles}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openPicker();
                  }}
                  title="Photo, video, audio, PDF, docs"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {uploading ? "Uploading…" : "Attach"}
                  </span>
                </Button>
              </div>
              <Button
                onClick={onSubmit}
                disabled={!canPost}
                className="rounded-full px-5 shrink-0"
                size="sm"
              >
                {isSubmitting ? "Posting…" : "Post to yard"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Photos · video · audio · PDF · docs — drag & drop or Attach · up
              to {maxFiles} files
              {!isTauri() && " · browser session (desktop for permanent store)"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
