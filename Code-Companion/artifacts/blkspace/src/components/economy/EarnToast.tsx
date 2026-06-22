import { toast } from "sonner";
import { Coins, ArrowBigUp, ShieldAlert, Gauge, PartyPopper } from "lucide-react";

const FIRST_POST_KEY = "blkspace_first_post_done";

export interface EarnToastInput {
  wb?: number;
  wbNominal?: number;
  karmaPost?: number;
  karmaComment?: number;
  reason: string;
  throttled?: boolean;
  dailyCapLimited?: boolean;
}

export function showEarnToast(opts: EarnToastInput) {
  const wb = opts.wb ?? 0;
  const wbNominal = opts.wbNominal ?? wb;
  const karma = (opts.karmaPost ?? 0) + (opts.karmaComment ?? 0);
  const throttled = opts.throttled ?? false;
  const dailyCapLimited = opts.dailyCapLimited ?? false;

  if (wb === 0 && karma === 0) {
    if (dailyCapLimited) {
      toast.warning(opts.reason, {
        description: `Daily earn cap reached (250 WB/day) — +0 WB of ${wbNominal} attempted`,
        icon: <Gauge className="h-4 w-4 text-amber-500" />,
      });
      return;
    }
    if (throttled) {
      toast.warning(opts.reason, {
        description: "Reward throttled — MIDF score high",
        icon: <ShieldAlert className="h-4 w-4 text-amber-500" />,
      });
      return;
    }
    return;
  }

  const parts: string[] = [];
  if (wb > 0) parts.push(`+${wb} WB`);
  if (karma > 0) parts.push(`+${karma} karma`);

  let description = parts.join(" · ");
  if (dailyCapLimited && wb < wbNominal) {
    description = `${description} (partial — daily cap, ${wbNominal - wb} WB clipped)`;
  } else if (throttled && wb === 0) {
    description = `${description} (WB throttled — MIDF score high)`;
  }

  toast.success(opts.reason, {
    description,
    icon:
      wb > 0 ? (
        <Coins className="h-4 w-4 text-primary" />
      ) : (
        <ArrowBigUp className="h-4 w-4 text-orange-500" />
      ),
  });
}

export function showEarnFromResult(
  earn: {
    wb: number;
    wbNominal?: number;
    karmaPost: number;
    karmaComment: number;
    throttled: boolean;
    dailyCapLimited?: boolean;
  },
  reason: string,
) {
  showEarnToast({
    wb: earn.wb,
    wbNominal: earn.wbNominal ?? earn.wb,
    karmaPost: earn.karmaPost,
    karmaComment: earn.karmaComment,
    throttled: earn.throttled,
    dailyCapLimited: earn.dailyCapLimited,
    reason,
  });
}

/** First-post dopamine hit — beta onboarding celebration. */
export function showPostEarnCelebration(
  earn: {
    wb: number;
    wbNominal?: number;
    karmaPost: number;
    karmaComment: number;
    throttled: boolean;
    dailyCapLimited?: boolean;
  },
) {
  const isFirst =
    typeof window !== "undefined" && !localStorage.getItem(FIRST_POST_KEY);

  if (isFirst) {
    localStorage.setItem(FIRST_POST_KEY, "true");
    const wb = earn.wb > 0 ? earn.wb : 50;
    const karma = earn.karmaPost + earn.karmaComment;
    toast.success("Welcome to the yard! 🎉", {
      description: `You earned ${wb} WeixBucks${karma > 0 ? ` · +${karma} karma` : ""} · You're on the TSU leaderboard`,
      icon: <PartyPopper className="h-4 w-4 text-primary" />,
      duration: 8000,
    });
    return;
  }

  showEarnFromResult(earn, "Post created");
}