import { useRef } from "react";
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
import { Image, MapPin, X } from "lucide-react";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import { useAppGetUser } from "@/hooks/use-app-data";
import { TOWN_OPTIONS, townLabel } from "@/lib/towns";
import { isTauri, tauriUploadBlob, type TauriEarnResult } from "@/lib/tauri-api";
import { toast } from "sonner";

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
}: PostComposerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handle = getCurrentHandle();
  const { data: user } = useAppGetUser(handle);

  const handleUploadMedia = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const token = getSessionToken();
    if (!token) {
      toast.error("Please sign in");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large (max 20MB)");
      return;
    }
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
      onMediaHashesChange([...mediaHashes, info.hash]);
      if (info.earn && (info.earn.wb > 0 || info.earn.karmaPost > 0)) {
        onUploadSuccess?.(info.earn);
      } else {
        toast.success("Media attached");
      }
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <Card className="border-primary/20 shadow-md mb-6 overflow-hidden">
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
            {mediaHashes.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {mediaHashes.map((h) => (
                  <div
                    key={h}
                    className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full"
                  >
                    <Image className="h-3 w-3" />
                    {h.slice(0, 8)}…
                    <button
                      type="button"
                      onClick={() =>
                        onMediaHashesChange(mediaHashes.filter((x) => x !== h))
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
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
                {isTauri() && (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,video/*,audio/*"
                      className="hidden"
                      onChange={handleUploadMedia}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <Button
                onClick={onSubmit}
                disabled={isSubmitting || !content.trim()}
                className="rounded-full px-5 shrink-0"
                size="sm"
              >
                Post to yard
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}