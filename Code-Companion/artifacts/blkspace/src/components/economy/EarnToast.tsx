import { toast } from "sonner";
import { Coins, ArrowBigUp, ShieldAlert, Gauge } from "lucide-react";

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