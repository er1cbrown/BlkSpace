import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { hasIdentity } from "@/lib/auth";

interface GuestModeContextValue {
  /** True when the user has no Nostr identity / wallet (anonymous browser). */
  isGuest: boolean;
  /** True when the user has created/loaded an identity. */
  hasWallet: boolean;
  /** Re-read identity state after manual changes. */
  refresh: () => void;
}

const GuestModeContext = createContext<GuestModeContextValue>({
  isGuest: false,
  hasWallet: true,
  refresh: () => {},
});

export function GuestModeProvider({ children }: { children: ReactNode }) {
  const [hasWallet, setHasWallet] = useState<boolean>(() => hasIdentity());

  const refresh = useCallback(() => setHasWallet(hasIdentity()), []);

  useEffect(() => {
    const handler = () => setHasWallet(hasIdentity());
    window.addEventListener("blkspace:identity", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("blkspace:identity", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return (
    <GuestModeContext.Provider
      value={{ isGuest: !hasWallet, hasWallet, refresh }}
    >
      {children}
    </GuestModeContext.Provider>
  );
}

export function useGuestMode() {
  return useContext(GuestModeContext);
}
