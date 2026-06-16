import { AppShell } from "@/components/layout/AppShell";
import { PostComposer } from "@/components/social/PostComposer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Clapperboard, Image, MessageCircle, Film } from "lucide-react";
import { useAppCreatePost } from "@/hooks/use-app-data";
import { getCurrentHandle } from "@/lib/auth";
import { showEarnFromResult } from "@/components/economy/EarnToast";
import { WB_EARN, KARMA_EARN } from "@/lib/earn-sources";
import { getListPostsQueryKey } from "@workspace/api-client-react";

export default function CreatePage() {
  const queryClient = useQueryClient();
  const handle = getCurrentHandle();
  const [content, setContent] = useState("");
  const [town, setTown] = useState("tsu");
  const [mediaHashes, setMediaHashes] = useState<string[]>([]);
  const [mode, setMode] = useState<"post" | "reel" | "story">("post");
  const createPost = useAppCreatePost();

  const submit = () => {
    if (!content.trim() && mediaHashes.length === 0) return;
    createPost.mutate(
      {
        content: content || (mode === "reel" ? "🎬 New reel" : "📸"),
        town_tag: town,
        media_hashes: mediaHashes.length > 0 ? mediaHashes : undefined,
      },
      {
        onSuccess: (result: any) => {
          setContent("");
          setMediaHashes([]);
          if (result?.earn) {
            showEarnFromResult(
              result.earn,
              mode === "reel" ? "Reel posted to your grid" : "Posted to your profile",
            );
          }
          queryClient.invalidateQueries({ queryKey: ["tauri", "posts"] });
          queryClient.invalidateQueries({
            queryKey: getListPostsQueryKey({ town }),
          });
        },
      },
    );
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Clapperboard className="h-6 w-6 text-primary" />
        Create
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Instagram-style creation — uploads bind to{" "}
        <Link href={`/profile/${handle}`} className="text-primary hover:underline">
          @{handle}
        </Link>
        , not a global media tab.
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
          <CardTitle className="text-sm">Earn while you create</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>Post: +{WB_EARN.feedPost} WB · +{KARMA_EARN.feedPost} karma</p>
          <p>Upload: +{WB_EARN.mediaUpload} WB · +{KARMA_EARN.mediaCreation} karma</p>
          <p>Yard chat: +{WB_EARN.yardChannelPost + WB_EARN.yardEngagementBonus} WB · yard karma</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}