import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  copyShareCard,
  type ShareCardInput,
} from "@/lib/share-card";
import { cn } from "@/lib/utils";

type Props = {
  share: ShareCardInput;
  label?: string;
  size?: "sm" | "default" | "icon";
  variant?: "ghost" | "outline" | "secondary" | "default";
  className?: string;
};

/**
 * One-tap share card: copies yard post / hub / playable text for X, Discord, SMS.
 * No OAuth — user pastes externally.
 */
export function ShareCardButton({
  share,
  label = "Share",
  size = "sm",
  variant = "ghost",
  className,
}: Props) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    try {
      await copyShareCard(share);
      setCopied(true);
      toast.success("Share card copied — paste to X, Discord, or Messages");
      window.setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not copy share card");
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(
        size === "icon" ? "h-8 w-8 p-0" : "h-8 px-2 gap-1.5",
        className,
      )}
      onClick={() => void onShare()}
      aria-label="Copy share card"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <Share2 className="w-4 h-4" />
      )}
      {size !== "icon" && (
        <span className="text-xs">{copied ? "Copied" : label}</span>
      )}
    </Button>
  );
}
