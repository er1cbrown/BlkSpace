import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SafeContent } from "@/components/ui/safe-content";
import { MediaDisplay } from "@/components/ui/media-display";

export type ExpandablePost = {
  id?: number | string;
  content?: string;
  authorHandle?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  townTag?: string;
  createdAt?: string;
  mediaBlobs?: string[];
  likesCount?: number;
  repliesCount?: number;
  repostsCount?: number;
};

/** The post, larger, laid over the yard. Close returns to the same place. */
export function PostExpand({
  post,
  onClose,
}: {
  post: ExpandablePost;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const name = post.authorDisplayName || post.authorHandle || "Yard";
  const when = post.createdAt ? new Date(post.createdAt) : null;
  const whenLabel =
    when && !Number.isNaN(when.getTime()) ? when.toLocaleString() : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8"
      role="presentation"
      onClick={onClose}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-label="Post"
        className="relative mt-4 w-full max-w-xl rounded-2xl bg-background p-5 text-foreground shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-muted"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-start gap-3 pr-10">
          <Avatar className="h-11 w-11 border border-primary/20">
            <AvatarImage src={post.authorAvatarUrl || ""} />
            <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold leading-tight">{name}</p>
            <p className="text-xs text-muted-foreground">
              {post.authorHandle ? `@${post.authorHandle}` : "Yard"}
              {post.townTag ? ` · ${post.townTag}` : ""}
              {whenLabel ? ` · ${whenLabel}` : ""}
            </p>
          </div>
        </div>
        {post.content ? (
          <SafeContent
            text={post.content}
            className="mt-4 text-[17px] leading-snug"
          />
        ) : null}
        {post.mediaBlobs && post.mediaBlobs.length > 0 ? (
          <MediaDisplay hashes={post.mediaBlobs} className="mt-3" />
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/60 pt-3 text-sm text-muted-foreground">
          <span>{post.repliesCount || 0} replies</span>
          <span>{post.repostsCount || 0} reposts</span>
          <span>{post.likesCount || 0} likes</span>
          {post.id != null && post.id !== "" ? (
            <Link
              href={`/posts/${post.id}`}
              className="ml-auto font-medium text-primary hover:underline"
              onClick={onClose}
            >
              Open thread
            </Link>
          ) : null}
        </div>
      </article>
    </div>,
    document.body,
  );
}
