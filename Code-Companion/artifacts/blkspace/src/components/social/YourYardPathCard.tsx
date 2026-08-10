/**
 * "Not just finance — your yard" onboarding card.
 * For students (often partners/friends) who see others live in wallet/finance.
 * Sets social or creative discipline track; never product AI.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  applyDisciplineToUiPrefs,
  YOUR_YARD_TRACK,
  isYourYardOrientedTrack,
  type DisciplineTrack,
} from "@/lib/discipline-track";
import { loadUiPrefs, saveUiPrefs } from "@/lib/ui-prefs";
import { Heart, Sparkles, Users, X, Gamepad2, Store } from "lucide-react";

const DISMISS_KEY = "blkspace_your_yard_path_v1";

export function YourYardPathCard() {
  const [visible, setVisible] = useState(false);
  const [onFinance, setOnFinance] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") {
        setVisible(false);
        return;
      }
    } catch {
      /* ignore */
    }
    const prefs = loadUiPrefs();
    setOnFinance(prefs.disciplineTrack === "finance");
    // Show if finance-heavy, or never oriented to your-yard tracks yet
    setVisible(
      prefs.disciplineTrack === "finance" ||
        !isYourYardOrientedTrack(prefs.disciplineTrack),
    );
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  const chooseTrack = useCallback((track: DisciplineTrack) => {
    const next = applyDisciplineToUiPrefs(loadUiPrefs(), track, {
      setStartPath: true,
    });
    saveUiPrefs(next);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <Card className="mb-4 border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500/10 via-orange-500/5 to-cyan-500/10 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-orange-400 to-cyan-400" />
      <CardContent className="p-4 space-y-3 relative">
        <button
          type="button"
          className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-2 pr-8">
          <Heart className="w-5 h-5 text-fuchsia-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold tracking-tight">
              Not just finance —{" "}
              <span className="text-fuchsia-600 dark:text-fuchsia-400">
                your yard
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {onFinance
                ? "If someone else lives in literacy and wallet mode, you still get a full campus life — clubs, look, posts, nights. Same BlkSpace; your track isn't their grind."
                : "Finance is one room. Your room is people, creative energy, and belonging — soft WB only when you choose tickets or drops."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1"
            onClick={() => chooseTrack(YOUR_YARD_TRACK)}
          >
            <Users className="w-3.5 h-3.5" />
            Campus life track
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1"
            onClick={() => chooseTrack("creative")}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Creative & fashion
          </Button>
          <Link href="/communities">
            <Button size="sm" variant="outline" className="gap-1">
              <Users className="w-3.5 h-3.5" />
              Clubs
            </Button>
          </Link>
          <Link href="/hub">
            <Button size="sm" variant="outline" className="gap-1">
              <Store className="w-3.5 h-3.5" />
              Hub
            </Button>
          </Link>
          <Link href="/arcade">
            <Button size="sm" variant="ghost" className="gap-1">
              <Gamepad2 className="w-3.5 h-3.5" />
              Arcade
            </Button>
          </Link>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Change anytime: Settings → discipline track. Soft economy optional —
          never required to belong.
        </p>
      </CardContent>
    </Card>
  );
}
