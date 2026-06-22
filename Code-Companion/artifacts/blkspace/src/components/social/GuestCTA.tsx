import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";

interface GuestCTAProps {
  /** Compact inline variant (replaces composer). */
  compact?: boolean;
  /** Full-page variant (replaces a gated route). */
  fullPage?: boolean;
  message?: string;
}

/**
 * Shown to anonymous (guest) users in place of write surfaces. Replaces the
 * post composer, gated routes, and action buttons with a single, non-intrusive
 * path to create a free account.
 */
export function GuestCTA({
  compact = false,
  fullPage = false,
  message = "You're browsing as a guest. Create a free account to post, like, follow, upload media, and start earning WeixBucks.",
}: GuestCTAProps) {
  const body = (
    <div
      className={
        compact
          ? "flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5"
          : "flex flex-col items-center text-center gap-4 max-w-md mx-auto"
      }
    >
      {!compact && (
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
      )}
      <p
        className={
          compact
            ? "text-sm text-muted-foreground flex-1 min-w-0"
            : "text-muted-foreground"
        }
      >
        {message}
      </p>
      <div className={compact ? "flex items-center gap-2 shrink-0" : "flex flex-col sm:flex-row gap-3 w-full sm:w-auto"}>
        <Link href="/welcome">
          <Button className="rounded-full" size={compact ? "sm" : "default"}>
            Create free account
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" className="rounded-full" size={compact ? "sm" : "default"}>
            Sign in
          </Button>
        </Link>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <Card className="border-primary/20 shadow-md max-w-lg w-full">
          <CardContent className="pt-8 pb-8">{body}</CardContent>
        </Card>
      </div>
    );
  }

  if (compact) {
    return <Card className="border-primary/20 mb-6"><CardContent className="py-3">{body}</CardContent></Card>;
  }

  return body;
}
