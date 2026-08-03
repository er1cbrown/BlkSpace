import { useLocation } from "wouter";
import { toast } from "sonner";
import { useGuestMode } from "@/lib/guest-mode";

/**
 * Gate write/actions behind a Nostr identity. Call `requireWallet(action)` in
 * handlers; it returns false and prompts signup when the user is browsing as a
 * guest, so the caller can bail before mutating.
 */
export function useRequiresWallet() {
  const { isGuest } = useGuestMode();
  const [, navigate] = useLocation();

  const requireWallet = (action: string): boolean => {
    if (!isGuest) return true;
    toast.error(`Create a free account to ${action}.`, {
      description: "Guests can browse — posting needs a handle.",
      action: {
        label: "Join free",
        onClick: () => navigate("/welcome"),
      },
      duration: 6000,
    });
    return false;
  };

  return { hasWallet: !isGuest, isGuest, requireWallet };
}
