import { Navbar } from "@/components/layout/Navbar";
import { useRoute } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Heart, Repeat2 } from "lucide-react";
import { Link } from "wouter";
import {
  useAppGetPost,
  useAppListReplies,
  useAppCreateReply,
} from "@/hooks/use-app-data";
import { SafeContent } from "@/components/ui/safe-content";
import { MediaDisplay } from "@/components/ui/media-display";
import { getCurrentHandle } from "@/lib/auth";

export default function PostPage() {
  const queryClient = useQueryClient();
  const [, params] = useRoute("/posts/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const [replyContent, setReplyContent] = useState("");

  const currentUser = getCurrentHandle();
  const { data: post, isLoading: postLoading } = useAppGetPost(id, currentUser);
  const { data: replies, isLoading: repliesLoading } = useAppListReplies(id);

  const createReply = useAppCreateReply();

  const handleReplySubmit = () => {
    if (!replyContent.trim()) return;
    createReply.mutate(
      { postId: id, content: replyContent },
      {
        onSuccess: () => {
          setReplyContent("");
          queryClient.invalidateQueries({ queryKey: ["tauri", "replies"] });
          queryClient.invalidateQueries({ queryKey: ["tauri", "post"] });
          queryClient.invalidateQueries({ queryKey: ["replies"] });
          queryClient.invalidateQueries({ queryKey: ["post"] });
        },
      },
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container max-w-2xl py-8 px-4">
        <Link href="/feed">
          <Button
            variant="ghost"
            className="mb-6 pl-0 hover:bg-transparent hover:text-primary gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Yard
          </Button>
        </Link>

        {postLoading ? (
          <div className="h-64 bg-muted/50 animate-pulse rounded-xl"></div>
        ) : post ? (
          <div className="space-y-6">
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="flex flex-row items-center gap-4">
                <Link href={`/profile/${post.authorHandle}`}>
                  <Avatar className="h-14 w-14 cursor-pointer">
                    <AvatarImage src={post.authorAvatarUrl || ""} />
                    <AvatarFallback>
                      {post.authorDisplayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <CardTitle className="text-xl">
                    <Link href={`/profile/${post.authorHandle}`}>
                      <span className="cursor-pointer hover:underline">
                        {post.authorDisplayName}
                      </span>
                    </Link>
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    @{post.authorHandle} • {post.townTag}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <SafeContent
                  text={post.content}
                  className="text-2xl leading-relaxed"
                />
                {"mediaBlobs" in post && (
                  <MediaDisplay hashes={(post as any).mediaBlobs} />
                )}
                <div className="text-sm text-muted-foreground mt-6 pt-6 border-t border-border/50">
                  {new Date(post.createdAt).toLocaleTimeString()} •{" "}
                  {new Date(post.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
              <CardFooter className="flex gap-8 py-4 border-t border-border/50 text-muted-foreground">
                <div className="flex gap-2 items-center">
                  <MessageSquare className="w-5 h-5" />{" "}
                  <span className="font-medium text-foreground">
                    {post.repliesCount}
                  </span>{" "}
                  Replies
                </div>
                <div className="flex gap-2 items-center">
                  <Repeat2 className="w-5 h-5" />{" "}
                  <span className="font-medium text-foreground">
                    {post.repostsCount}
                  </span>{" "}
                  Reposts
                </div>
                <div className="flex gap-2 items-center">
                  <Heart className="w-5 h-5" />{" "}
                  <span className="font-medium text-foreground">
                    {post.likesCount}
                  </span>{" "}
                  Likes
                </div>
              </CardFooter>
            </Card>

            <Card className="bg-muted/20 border-border/50">
              <CardContent className="pt-6 flex gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>DU</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Drop a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[80px] mb-4 bg-background"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleReplySubmit}
                      disabled={createReply.isPending || !replyContent.trim()}
                      className="rounded-full px-6"
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4 mt-8">
              {Array.isArray(replies) &&
                replies.map((reply) => (
                  <Card key={reply.id} className="border-border/50 shadow-sm">
                    <CardHeader className="py-4 flex flex-row items-start gap-4">
                      <Link href={`/profile/${reply.authorHandle}`}>
                        <Avatar className="h-10 w-10 cursor-pointer">
                          <AvatarImage src={reply.authorAvatarUrl || ""} />
                          <AvatarFallback>
                            {reply.authorDisplayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/profile/${reply.authorHandle}`}>
                            <span className="font-bold cursor-pointer hover:underline">
                              {reply.authorDisplayName}
                            </span>
                          </Link>
                          <span className="text-muted-foreground text-sm">
                            @{reply.authorHandle}
                          </span>
                          <span className="text-muted-foreground text-sm ml-auto">
                            {new Date(reply.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <SafeContent
                          text={reply.content}
                          className="mt-2 text-[15px]"
                        />
                      </div>
                    </CardHeader>
                  </Card>
                ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            Post not found.
          </div>
        )}
      </main>
    </div>
  );
}
