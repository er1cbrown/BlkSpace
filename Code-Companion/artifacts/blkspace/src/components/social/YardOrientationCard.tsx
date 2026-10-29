import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import {
  dismissOrientation,
  shouldShowOrientation,
  consumeJustJoined,
} from "@/lib/yard-orientation";
import { getYardTheme } from "@/lib/yard-themes";
import { loadUiPrefs } from "@/lib/ui-prefs";
import { useGuestMode } from "@/lib/guest-mode";
import { X, MapPin } from "lucide-react";

/** One dismissible line for the home yard. */
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
    <Card className="mb-3 border-primary/20 bg-primary/5 shadow-none">
      <CardContent className="flex items-center gap-3 p-3">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 truncate text-sm">
          You&apos;re on <span className="font-medium">{school}</span>
          {mascot ? (
            <span className="text-muted-foreground"> · {mascot}</span>
          ) : null}
        </p>
        <Link
          href={isGuest ? "/welcome" : `/communities/${yardId}`}
          className="shrink-0 text-sm text-primary hover:underline"
        >
          {isGuest ? "Join" : "Open yard"}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss guide"
        >
          <X className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}
