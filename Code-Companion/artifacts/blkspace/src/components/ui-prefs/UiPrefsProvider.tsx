import { useEffect, type ReactNode } from "react";
import { applyUiPrefsToDocument, loadUiPrefs } from "@/lib/ui-prefs";

/** Applies stored UI prefs on mount so every session is tailored. */
export function UiPrefsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyUiPrefsToDocument(loadUiPrefs());
  }, []);

  return <>{children}</>;
}
