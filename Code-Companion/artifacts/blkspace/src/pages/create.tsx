import { AppShell } from "@/components/layout/AppShell";
import { PostComposer } from "@/components/social/PostComposer";
import { SendmeSharePanel } from "@/components/media/SendmeSharePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Clapperboard,
  Image,
  MessageCircle,
  Film,
  ChevronDown,
} from "lucide-react";
import { useAppCreatePost } from "@/hooks/use-app-data";
import { getCurrentHandle } from "@/lib/auth";
import {
  showEarnFromResult,
  showPostEarnCelebration,
} from "@/components/economy/EarnToast";
import { WB_EARN, KARMA_EARN } from "@/lib/earn-sources";
import { getListPostsQueryKey } from "@workspace/api-client-react";
import { loadUiPrefs } from "@/lib/ui-prefs";
import { getYardTheme } from "@/lib/yard-themes";

export default function CreatePage() {
  const queryClient = useQueryClient();
  const handle = getCurrentHandle();
  const homeYard = loadUiPrefs().homeYardId || "tsu";
  const yardName = getYardTheme(homeYard)?.school || homeYard.toUpperCase();
  const [content, setContent] = useState("");
  const [town, setTown] = useState(homeYard);
  const [mediaHashes, setMediaHashes] = useState<string[]>([]);
  const [mode, setMode] = useState<"post" | "reel" | "story">("post");
  const [showDrop, setShowDrop] = useState(false);
  const createPost = useAppCreatePost();

  const submit = () => {
    const body = content.trim();
    const media = mediaHashes.filter(Boolean);
    if (!body && media.length === 0) return;
    const postContent =
      body ||
      (mode === "reel" ? "🎬 New reel" : mode === "story" ? "📸" : "📎");
    createPost.mutate(
      {
        content: postContent,
        town_tag: town,
        media_hashes: media.length > 0 ? media : undefined,
      },
      {
        onSuccess: (result: any) => {
          setContent("");
          setMediaHashes([]);
          if (result?.earn) {
            if (mode === "post") {
              showPostEarnCelebration(result.earn);
            } else {
              showEarnFromResult(
                result.earn,
                mode === "reel"
                  ? "Reel posted to your grid"
                  : "Posted to your profile",
              );
            }
          }
          queryClient.invalidateQueries({ queryKey: ["tauri", "posts"] });
          queryClient.invalidateQueries({ queryKey: ["web", "posts"] });
          queryClient.invalidateQueries({
            queryKey: getListPostsQueryKey({ town }),
          });
        },
        onError: (e: unknown) => {
          console.error(e);
        },
      },
    );
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Clapperboard className="h-6 w-6 text-primary" />
        Create a post
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Posts go to your campus feed ({yardName}) and your profile{" "}
        <Link
          href={`/profile/${handle}`}
          className="text-primary hover:underline"
        >
          @{handle}
        </Link>
        . Text is enough — photos/files work best in the desktop app.
      </p>

      <div className="flex gap-2 mb-4">
        {(
          [
            { id: "post", label: "Post", icon: MessageCircle },
            { id: "reel", label: "Reel", icon: Film },
            { id: "story", label: "Story", icon: Image },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              mode === m.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <m.icon className="h-4 w-4" />
            {m.label}
          </button>
        ))}
      </div>

      <PostComposer
        content={content}
        onContentChange={setContent}
        selectedTown={town}
        onTownChange={setTown}
        mediaHashes={mediaHashes}
        onMediaHashesChange={setMediaHashes}
        onSubmit={submit}
        isSubmitting={createPost.isPending}
        onUploadSuccess={(earn) => showEarnFromResult(earn, "Media upload")}
        placeholder={
          mode === "reel"
            ? "Caption your reel — shows on Watch + your grid"
            : mode === "story"
              ? "24h story (ring) — coming soon, saves as post for now"
              : "What's happening on the yard?"
        }
      />

      <Card className="mt-6 border-primary/15">
        <CardHeader>
          <CardTitle className="text-sm">You earn when you post</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>
            Soft credits (WeixBucks) — not real money yet. Example: post +
            {WB_EARN.feedPost} WB.
          </p>
          <p>
            Upload media +{WB_EARN.mediaUpload} WB · likes boost others too.
          </p>
        </CardContent>
      </Card>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowDrop((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-dashed px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/40"
        >
          <span>Advanced · send a file privately (optional)</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showDrop ? "rotate-180" : ""}`}
          />
        </button>
        {showDrop && (
          <div className="mt-3">
            <SendmeSharePanel compact />
          </div>
        )}
      </div>
    </AppShell>
  );
}
