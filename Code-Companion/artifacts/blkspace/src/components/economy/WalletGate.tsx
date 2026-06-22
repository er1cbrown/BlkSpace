import type { ReactNode } from "react";
import { useGuestMode } from "@/lib/guest-mode";
import { GuestCTA } from "@/components/social/GuestCTA";

interface WalletGateProps {
  children: ReactNode;
  compact?: boolean;
  fullPage?: boolean;
  message?: string;
}

/**
 * Render children only when the user has an identity; otherwise show the
 * "Create free account" prompt. Use `compact` for inline surfaces (composer
 * area) and `fullPage` for gated routes.
 */
export function WalletGate({
  children,
  compact,
  fullPage,
  message,
}: WalletGateProps) {
  const { isGuest } = useGuestMode();
  if (!isGuest) return <>{children}</>;
  return (
    <GuestCTA compact={compact} fullPage={fullPage} message={message} />
  );
}
