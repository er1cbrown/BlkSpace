import { isTauri } from "@/lib/tauri-api";

const tier0Lite =
  import.meta.env.VITE_TIER0_LITE === "true" ||
  import.meta.env.VITE_TIER0_LITE === "1";

/**
 * Beta feature gates — keep the web preview focused on the core yard loop
 * (browse → post → earn) while full mesh/bridge tools stay in the desktop app.
 *
 * Tier 0 lite (`VITE_TIER0_LITE=1` or `pnpm build:tier0`) hides mesh-heavy UI
 * and reduces feed IPC on low-end devices.
 */
export const BETA_FEATURES = {
  /** Production tier0 build or explicit env — yard shell only */
  tier0Lite,
  /** Architecture, mesh-test, relay debug links */
  showDevTools: import.meta.env.DEV && !tier0Lite,
  /** Cross-town relay bridge — needs live Nostr mesh (Tauri) */
  showBridgeTab: () => isTauri() && !tier0Lite,
  /** Global trending across relays — Tauri-backed */
  showTrendingTab: () => isTauri() && !tier0Lite,
  /** Relay network card in sidebar */
  showRelayPanel: () => isTauri() && !tier0Lite,
  /** Sidebar trending widget (extra IPC on feed routes) */
  showSidebarTrending: () => !tier0Lite,
  /** Web preview uses seed/sample data */
  isWebPreview: () => !isTauri(),
} as const;