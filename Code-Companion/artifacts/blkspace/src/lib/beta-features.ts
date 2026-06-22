import { isTauri } from "@/lib/tauri-api";

/**
 * Beta feature gates — keep the web preview focused on the core yard loop
 * (browse → post → earn) while full mesh/bridge tools stay in the desktop app.
 */
export const BETA_FEATURES = {
  /** Architecture, mesh-test, relay debug links */
  showDevTools: import.meta.env.DEV,
  /** Cross-town relay bridge — needs live Nostr mesh (Tauri) */
  showBridgeTab: () => isTauri(),
  /** Global trending across relays — Tauri-backed */
  showTrendingTab: () => isTauri(),
  /** Relay network card in sidebar */
  showRelayPanel: () => isTauri(),
  /** Web preview uses seed/sample data */
  isWebPreview: () => !isTauri(),
} as const;