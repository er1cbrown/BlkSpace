/**
 * Secure connectivity — three independent routes, one end goal.
 *
 *   A · Social mesh     Nostr + town tags + local Turso cache
 *   B · Resilient mesh  Optional Reticulum (RNS) — hard path / offline notes
 *   C · Play mesh       P2P + rollback (TLA class) — design locked; engines later
 *
 * They must NOT share one pipe. Results from C re-enter A as signed events.
 * Turso is local memory for A — never "in the mesh."
 *
 * Docs: docs/features/secure-connectivity-three-routes.md
 * Rollback: docs/features/sbf-rollback-netplay.md
 * RNS: docs/implementation/RETICULUM_INTEGRATION.md
 */

import { isTauri } from "@/lib/tauri-api";
import {
  getIntranetStatus,
  type IntranetStatus,
} from "@/lib/hbcu-intranet";
import { getReticulumStatus, type ReticulumStatus } from "@/lib/reticulum";
import {
  PROJECT_B_EQUATION,
  SBF_NETPLAY_TARGET,
  SBF_PRODUCT_LINES,
} from "@/lib/yard-day-brawl";

/** Route identifiers — stable product language */
export type ConnectivityRouteId = "A" | "B" | "C";

export type RouteRuntimeStatus =
  | "live"
  | "partial"
  | "unavailable"
  | "vision"
  | "web_only";

export interface ConnectivityRouteDef {
  id: ConnectivityRouteId;
  codename: string;
  title: string;
  endGoalSlice: string;
  transport: string;
  localStore: string;
  neverUseFor: string;
  docsPath: string;
}

export const CONNECTIVITY_ROUTES: readonly ConnectivityRouteDef[] = [
  {
    id: "A",
    codename: "social",
    title: "Social mesh",
    endGoalSlice: "Host nights · chat · Connect · feed · match results into cache",
    transport: "Nostr WebSocket relays · town / intranet tags",
    localStore: "Embedded Turso / SQLite (per device — not a mesh peer)",
    neverUseFor: "60 Hz fight inputs · LoRa group spam as primary chat",
    docsPath: "docs/architecture-blueprint.md",
  },
  {
    id: "B",
    codename: "resilient",
    title: "Resilient mesh",
    endGoalSlice: "Hard-path notes · yard announce when easy net fails",
    transport: "Optional Reticulum (RNS) via Python bridge",
    localStore: "RNS identity separate; BlkSpace still Nostr keys for social",
    neverUseFor: "Default feed · rollback · requiring rns on Tier 0",
    docsPath: "docs/implementation/RETICULUM_INTEGRATION.md",
  },
  {
    id: "C",
    codename: "play",
    title: "Play mesh",
    endGoalSlice: "Fair-feeling online fights (Tough Love Arena class)",
    transport: "P2P later · N1 local GGPO-class trainer shipped (/rollback)",
    localStore: "RAM sim state only; result event → Route A → Turso",
    neverUseFor: "Nostr-per-frame · Turso-per-punch · RNS as netcode",
    docsPath: "docs/features/sbf-rollback-netplay.md",
  },
] as const;

export const SECURE_CONNECTIVITY_GOAL =
  "Secure campus connectivity: signed social (A) + optional hard path (B) + fair play link (C). Three lanes, one product.";

export const SECURE_CONNECTIVITY_EQUATION =
  "Route A ∥ Route B ∥ Route C → secure WeixNet connectivity";

export interface RouteStatusSnapshot {
  id: ConnectivityRouteId;
  def: ConnectivityRouteDef;
  status: RouteRuntimeStatus;
  label: string;
  detail: string;
  metrics: Record<string, string | number | boolean>;
}

export interface ThreeRouteSnapshot {
  goal: string;
  equation: string;
  isDesktop: boolean;
  routes: RouteStatusSnapshot[];
  social: IntranetStatus | null;
  resilient: ReticulumStatus | null;
  at: string;
}

function routeDef(id: ConnectivityRouteId): ConnectivityRouteDef {
  return CONNECTIVITY_ROUTES.find((r) => r.id === id)!;
}

/** Probe all three routes (best-effort; never throws). */
export async function probeThreeRoutes(): Promise<ThreeRouteSnapshot> {
  const desktop = isTauri();
  let social: IntranetStatus | null = null;
  let resilient: ReticulumStatus | null = null;

  try {
    social = await getIntranetStatus();
  } catch {
    social = null;
  }
  try {
    resilient = await getReticulumStatus();
  } catch {
    resilient = {
      ok: false,
      available: false,
      reason: "probe_error",
      detail: "Could not probe Reticulum bridge",
    };
  }

  const routeA: RouteStatusSnapshot = (() => {
    const def = routeDef("A");
    if (!desktop) {
      return {
        id: "A",
        def,
        status: "web_only" as const,
        label: "Web preview",
        detail:
          "Social mesh is full on desktop (Nostr + Turso). Web uses preview userspace — not multi-device truth.",
        metrics: {
          desktop: false,
          model: social?.model || "web_preview",
        },
      };
    }
    if (social?.connected) {
      return {
        id: "A",
        def,
        status: "live" as const,
        label: "Live",
        detail: `Intranet connected · ${social.relayCount} relay(s) · Turso is local cache only.`,
        metrics: {
          relayCount: social.relayCount,
          subscriptions: social.subscriptions?.length ?? 0,
          hasIntranetTag: social.hasIntranetTag,
        },
      };
    }
    return {
      id: "A",
      def,
      status: "partial" as const,
      label: "Partial",
      detail:
        social?.description ||
        "Join HBCU intranet / connect relays on Mesh Test → Sync. Local Turso still works offline.",
      metrics: {
        relayCount: social?.relayCount ?? 0,
        connected: false,
      },
    };
  })();

  const routeB: RouteStatusSnapshot = (() => {
    const def = routeDef("B");
    if (!resilient) {
      return {
        id: "B",
        def,
        status: "unavailable" as const,
        label: "Unknown",
        detail: "No status from bridge",
        metrics: {},
      };
    }
    if (resilient.available) {
      return {
        id: "B",
        def,
        status: "live" as const,
        label: "Available",
        detail:
          resilient.detail ||
          "RNS bridge up — optional hard path. Not required for feed.",
        metrics: {
          available: true,
          reason: resilient.reason,
          python: resilient.python || "",
        },
      };
    }
    if (!desktop) {
      return {
        id: "B",
        def,
        status: "web_only" as const,
        label: "Desktop only",
        detail: resilient.detail || "Install desktop app + pip install rns for lab.",
        metrics: { reason: resilient.reason },
      };
    }
    return {
      id: "B",
      def,
      status: "unavailable" as const,
      label: "Optional off",
      detail:
        resilient.detail ||
        resilient.reason ||
        "pip install rns for lab mesh. Tier 0 OK without it.",
      metrics: {
        available: false,
        reason: resilient.reason,
        install: resilient.install || "pip install rns",
      },
    };
  })();

  const routeC: RouteStatusSnapshot = {
    id: "C",
    def: routeDef("C"),
    status: "partial",
    label: "N1 trainer",
    detail: `${SBF_NETPLAY_TARGET} Local rollback lab at /rollback. Series: ${SBF_PRODUCT_LINES}. ${PROJECT_B_EQUATION}.`,
    metrics: {
      n1LocalTrainer: true,
      netplayWan: false,
      controlPlane: "Route A (lobby / results)",
      dataPlane: "Local GGPO-class predict/rollback",
      path: "/rollback",
    },
  };

  return {
    goal: SECURE_CONNECTIVITY_GOAL,
    equation: SECURE_CONNECTIVITY_EQUATION,
    isDesktop: desktop,
    routes: [routeA, routeB, routeC],
    social,
    resilient,
    at: new Date().toISOString(),
  };
}

export function statusBadgeVariant(
  s: RouteRuntimeStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (s) {
    case "live":
      return "default";
    case "partial":
    case "web_only":
      return "secondary";
    case "vision":
      return "outline";
    case "unavailable":
      return "outline";
    default:
      return "outline";
  }
}
