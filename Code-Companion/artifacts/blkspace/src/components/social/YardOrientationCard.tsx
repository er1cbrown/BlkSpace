import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  dismissOrientation,
  shouldShowOrientation,
  consumeJustJoined,
} from "@/lib/yard-orientation";
import { getYardTheme } from "@/lib/yard-themes";
import { loadUiPrefs } from "@/lib/ui-prefs";
import { useGuestMode } from "@/lib/guest-mode";
import {
  X,
  Home,
  Users,
  Clapperboard,
  Sparkles,
  MapPin,
} from "lucide-react";

/**
 * First-user map: where you are + three obvious next steps.
 * Dismissible; no jargon (no Iroh, sendme, MIDF, BKSPC).
 */
export function YardOrientationCard() {
  const { isGuest } = useGuestMode();
  const [visible, setVisible] = useState(false);
  const [yardId, setYardId] = useState("tsu");

  useEffect(() => {
    const just = consumeJustJoined();
    const home = just || loadUiPrefs().homeYardId || "tsu";
    setYardId(home);
    setVisible(shouldShowOrientation());
    const sync = () => setVisible(shouldShowOrientation());
    window.addEventListener("blkspace-orientation", sync);
    return () => window.removeEventListener("blkspace-orientation", sync);
  }, []);

  if (!visible) return null;

  const theme = getYardTheme(yardId);
  const school = theme?.school || theme?.name || yardId.toUpperCase();
  const mascot = theme?.mascot;

  const dismiss = () => {
    dismissOrientation();
    setVisible(false);
  };

  return (
    <Card className="mb-4 border-primary/30 bg-primary/5 shadow-sm overflow-hidden">
      <div
        className={`h-1 w-full bg-gradient-to-r ${theme?.gradient || "from-primary to-primary/60"}`}
        aria-hidden
      />
      <CardContent className="p-4 sm:p-5 relative">
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss guide"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-8 space-y-1 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            New here? Start with this
          </p>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 flex-wrap">
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            You&apos;re on{" "}
            <span className="text-primary">{school}</span>
            {mascot ? (
              <span className="text-sm font-normal text-muted-foreground">
                · {mascot}
              </span>
            ) : null}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            BlkSpace is your HBCU social feed.{" "}
            <strong className="text-foreground font-medium">Home</strong> is the
            scroll. <strong className="text-foreground font-medium">Yards</strong>{" "}
            are campuses. Post to earn soft credits (WeixBucks) — no crypto setup
            required.
          </p>
        </div>

        <ol className="grid gap-2 sm:grid-cols-3 mb-4">
          <li className="rounded-xl border bg-background/80 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs">
                1
              </span>
              <Home className="h-4 w-4 text-primary" />
              Scroll Home
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              Open the <strong>My Yard</strong> tab for your campus only.
            </p>
          </li>
          <li className="rounded-xl border bg-background/80 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs">
                2
              </span>
              <Clapperboard className="h-4 w-4 text-primary" />
              Say something
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              {isGuest
                ? "Join free, then post from Create or the box below."
                : "Use the box below or Create — text is enough."}
            </p>
          </li>
          <li className="rounded-xl border bg-background/80 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs">
                3
              </span>
              <Users className="h-4 w-4 text-primary" />
              Open your yard
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              Yards → your school for chat, events, and Live hangouts.
            </p>
          </li>
        </ol>

        <div className="flex flex-wrap gap-2 items-center">
          {!isGuest && (
            <Button
              size="sm"
              variant="default"
              className="rounded-full"
              onClick={() => {
                document
                  .getElementById("yard-composer")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Write first post
            </Button>
          )}
          {isGuest && (
            <Link href="/welcome">
              <Button size="sm" className="rounded-full">
                Join free
              </Button>
            </Link>
          )}
          <Link href={`/communities/${yardId}`}>
            <Button size="sm" variant="outline" className="rounded-full">
              Go to {school.split(" ")[0]} yard
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-muted-foreground"
            onClick={dismiss}
          >
            Got it — hide this
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
