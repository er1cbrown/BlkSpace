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
import { WB_EARN } from "@/lib/earn-sources";
import { getListPostsQueryKey } from "@workspace/api-client-react";
import { loadUiPrefs } from "@/lib/ui-prefs";
import { getYardTheme } from "@/lib/yard-themes";
import { createYardStory } from "@/lib/yard-stories";
import { toast } from "sonner";

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
  const [storyPending, setStoryPending] = useState(false);
  const createPost = useAppCreatePost();

  const submit = () => {
    const body = content.trim();
    const media = mediaHashes.filter(Boolean);
    if (!body && media.length === 0) return;

    // 24h ephemeral story — local dual-mode store (not permanent feed post)
    if (mode === "story") {
      setStoryPending(true);
      try {
        createYardStory({
          content: body || "📸",
          mediaHashes: media,
          townTag: town,
        });
        setContent("");
        setMediaHashes([]);
        toast.success("Story live for 24h — see the ring on Home");
        window.dispatchEvent(new CustomEvent("blkspace-stories"));
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Could not post story");
      } finally {
        setStoryPending(false);
      }
      return;
    }

    const postContent =
      body || (mode === "reel" ? "🎬 New reel" : "📎");
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
              showEarnFromResult(result.earn, "Reel posted to your grid");
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
        isSubmitting={createPost.isPending || storyPending}
        onUploadSuccess={(earn) => showEarnFromResult(earn, "Media upload")}
        placeholder={
          mode === "reel"
            ? "Caption — video also works from Home → Video (like X)"
            : mode === "story"
              ? "24h story — appears in the Home ring, then expires"
              : "What's happening on the yard?"
        }
      />

      <Card className="mt-6 border-primary/15">
        <CardHeader>
          <CardTitle className="text-sm">
            {mode === "story"
              ? "Stories are ephemeral"
              : "You earn when you post"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          {mode === "story" ? (
            <>
              <p>
                Stories live <strong className="text-foreground">24 hours</strong>{" "}
                on this device / browser, then disappear. They do not stay on
                the permanent feed.
              </p>
              <p>No soft-credit farm on stories — keep the economy honest.</p>
            </>
          ) : (
            <>
              <p>
                Soft credits (WeixBucks) — not real money yet. Example: post +
                {WB_EARN.feedPost} WB.
              </p>
              <p>
                Upload media +{WB_EARN.mediaUpload} WB · likes boost others too.
              </p>
            </>
          )}
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
