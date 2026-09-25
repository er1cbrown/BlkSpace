/**
 * Deterministic WeixNet route simulator for DevOps and evaluation.
 *
 * This models the transport policy only. It does not claim to run a live
 * Nostr relay, Reticulum daemon, or Iroh/Sendme endpoint.
 */

export type WeixNetRoute = "nostr" | "reticulum" | "sendme";
export type UserConnectivityStatus =
  "online" | "limited" | "offline" | "syncing";

export type SimulationRouteState = Record<WeixNetRoute, boolean>;

export interface SimulationPhase {
  name: string;
  routes: SimulationRouteState;
  publishSocial?: string[];
  shareFiles?: string[];
  flush?: boolean;
}

export interface SimulationScenario {
  id: string;
  title: string;
  description: string;
  phases: SimulationPhase[];
}

export interface SimulationDelivery {
  recipient: string;
  kind: "social" | "file";
  id: string;
  route: WeixNetRoute;
  phase: string;
  simulatedLatencyMs: number;
}

export interface SimulationPending {
  social: string[];
  files: string[];
}

export interface SimulationPhaseResult {
  name: string;
  routes: SimulationRouteState;
  publishedSocial: string[];
  sharedFiles: string[];
  flushed: boolean;
  pendingAfter: SimulationPending;
  status: UserConnectivityStatus;
}

export interface SimulationResult {
  scenarioId: string;
  title: string;
  description: string;
  devices: string[];
  phases: SimulationPhaseResult[];
  deliveries: SimulationDelivery[];
  routesUsed: WeixNetRoute[];
  pending: SimulationPending;
  finalStatus: UserConnectivityStatus;
  socialDelivered: number;
  filesDelivered: number;
  duplicateCount: number;
}

export const WEIXNET_DEVICES = ["A", "B", "C"] as const;

const RECEIVERS = ["B", "C"] as const;

/** Synthetic values are for deterministic comparisons, not network benchmarks. */
export const SIMULATED_LATENCY_MS: Record<WeixNetRoute, number> = {
  nostr: 800,
  reticulum: 1_500,
  sendme: 1_200,
};

const ALL_UP: SimulationRouteState = {
  nostr: true,
  reticulum: true,
  sendme: true,
};

const NO_ROUTES: SimulationRouteState = {
  nostr: false,
  reticulum: false,
  sendme: false,
};

export const WEIXNET_SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: "healthy",
    title: "Healthy network",
    description:
      "Nostr carries social events and Sendme carries the content ticket.",
    phases: [
      {
        name: "normal",
        routes: { ...ALL_UP },
        publishSocial: ["social-healthy-001"],
        shareFiles: ["blkspace1.healthy-001"],
      },
    ],
  },
  {
    id: "nostr-fallback",
    title: "Nostr outage with Reticulum fallback",
    description:
      "Social events use the lightweight Reticulum path while Sendme handles the file ticket.",
    phases: [
      {
        name: "degraded",
        routes: { nostr: false, reticulum: true, sendme: true },
        publishSocial: ["social-fallback-001"],
        shareFiles: ["blkspace1.fallback-001"],
      },
    ],
  },
  {
    id: "offline-recovery",
    title: "Offline queue and recovery",
    description:
      "Both social routes and content transfer are unavailable; queued work flushes after recovery.",
    phases: [
      {
        name: "offline",
        routes: { ...NO_ROUTES },
        publishSocial: ["social-recovery-001"],
        shareFiles: ["blkspace1.recovery-001"],
      },
      {
        name: "recovery",
        routes: { ...ALL_UP },
        flush: true,
      },
    ],
  },
  {
    id: "sendme-outage",
    title: "Content-plane outage",
    description:
      "Social sync remains live while the file ticket waits for the content path to recover.",
    phases: [
      {
        name: "social-only",
        routes: { nostr: true, reticulum: true, sendme: false },
        publishSocial: ["social-file-outage-001"],
        shareFiles: ["blkspace1.file-outage-001"],
      },
      {
        name: "content-recovery",
        routes: { ...ALL_UP },
        flush: true,
      },
    ],
  },
];

function copyRoutes(routes: SimulationRouteState): SimulationRouteState {
  return { ...routes };
}

function copyPending(pending: SimulationPending): SimulationPending {
  return { social: [...pending.social], files: [...pending.files] };
}

function enqueueUnique(values: string[], value: string): void {
  if (!values.includes(value)) values.push(value);
}

function hasAnyRoute(routes: SimulationRouteState): boolean {
  return routes.nostr || routes.reticulum || routes.sendme;
}

function hasSocialRoute(routes: SimulationRouteState): boolean {
  return routes.nostr || routes.reticulum;
}

function statusFor(
  routes: SimulationRouteState,
  pending: SimulationPending,
): UserConnectivityStatus {
  if (!hasAnyRoute(routes)) return "offline";
  if (pending.social.length > 0 || pending.files.length > 0) return "syncing";
  if (routes.nostr && routes.sendme) return "online";
  return "limited";
}

function deliverSocial(
  id: string,
  phase: string,
  routes: SimulationRouteState,
  pending: SimulationPending,
  delivered: Set<string>,
  deliveries: SimulationDelivery[],
): void {
  if (delivered.has(id)) return;

  const route: WeixNetRoute | null = routes.nostr
    ? "nostr"
    : routes.reticulum
      ? "reticulum"
      : null;

  if (!route) {
    enqueueUnique(pending.social, id);
    return;
  }

  for (const recipient of RECEIVERS) {
    deliveries.push({
      recipient,
      kind: "social",
      id,
      route,
      phase,
      simulatedLatencyMs: SIMULATED_LATENCY_MS[route],
    });
  }
  delivered.add(id);
}

function deliverFile(
  id: string,
  phase: string,
  routes: SimulationRouteState,
  pending: SimulationPending,
  delivered: Set<string>,
  deliveries: SimulationDelivery[],
): void {
  if (delivered.has(id)) return;

  if (!routes.sendme) {
    enqueueUnique(pending.files, id);
    return;
  }

  for (const recipient of RECEIVERS) {
    deliveries.push({
      recipient,
      kind: "file",
      id,
      route: "sendme",
      phase,
      simulatedLatencyMs: SIMULATED_LATENCY_MS.sendme,
    });
  }
  delivered.add(id);
}

function flushPending(
  phase: string,
  routes: SimulationRouteState,
  pending: SimulationPending,
  deliveredSocial: Set<string>,
  deliveredFiles: Set<string>,
  deliveries: SimulationDelivery[],
): void {
  if (hasSocialRoute(routes)) {
    const queuedSocial = [...pending.social];
    pending.social = [];
    for (const id of queuedSocial) {
      deliverSocial(id, phase, routes, pending, deliveredSocial, deliveries);
    }
  }

  if (routes.sendme) {
    const queuedFiles = [...pending.files];
    pending.files = [];
    for (const id of queuedFiles) {
      deliverFile(id, phase, routes, pending, deliveredFiles, deliveries);
    }
  }
}

export function getSimulationScenario(scenarioId: string): SimulationScenario {
  const scenario = WEIXNET_SIMULATION_SCENARIOS.find(
    (candidate) => candidate.id === scenarioId,
  );
  if (!scenario) {
    throw new Error(
      `Unknown WeixNet simulation scenario: ${scenarioId}. Available: ${WEIXNET_SIMULATION_SCENARIOS.map(
        (candidate) => candidate.id,
      ).join(", ")}`,
    );
  }
  return scenario;
}

/**
 * Run a deterministic three-device simulation.
 *
 * Social delivery prefers Nostr, falls back to Reticulum, and queues when both
 * are unavailable. File delivery uses Sendme/Iroh and queues independently.
 */
export function runWeixNetSimulation(
  scenarioOrId: SimulationScenario | string = "healthy",
): SimulationResult {
  const scenario =
    typeof scenarioOrId === "string"
      ? getSimulationScenario(scenarioOrId)
      : scenarioOrId;
  const pending: SimulationPending = { social: [], files: [] };
  const deliveredSocial = new Set<string>();
  const deliveredFiles = new Set<string>();
  const deliveries: SimulationDelivery[] = [];
  const phases: SimulationPhaseResult[] = [];
  let duplicateCount = 0;

  for (const phase of scenario.phases) {
    const routes = copyRoutes(phase.routes);
    const publishedSocial = [...(phase.publishSocial ?? [])];
    const sharedFiles = [...(phase.shareFiles ?? [])];
    const flushed = phase.flush === true;

    for (const id of publishedSocial) {
      if (deliveredSocial.has(id)) duplicateCount += 1;
      deliverSocial(
        id,
        phase.name,
        routes,
        pending,
        deliveredSocial,
        deliveries,
      );
    }

    for (const id of sharedFiles) {
      if (deliveredFiles.has(id)) duplicateCount += 1;
      deliverFile(id, phase.name, routes, pending, deliveredFiles, deliveries);
    }

    if (flushed) {
      flushPending(
        phase.name,
        routes,
        pending,
        deliveredSocial,
        deliveredFiles,
        deliveries,
      );
    }

    phases.push({
      name: phase.name,
      routes,
      publishedSocial,
      sharedFiles,
      flushed,
      pendingAfter: copyPending(pending),
      status: statusFor(routes, pending),
    });
  }

  const routesUsed = [...new Set(deliveries.map((delivery) => delivery.route))];
  const socialDelivered = new Set(
    deliveries
      .filter((delivery) => delivery.kind === "social")
      .map((delivery) => delivery.id),
  ).size;
  const filesDelivered = new Set(
    deliveries
      .filter((delivery) => delivery.kind === "file")
      .map((delivery) => delivery.id),
  ).size;

  return {
    scenarioId: scenario.id,
    title: scenario.title,
    description: scenario.description,
    devices: [...WEIXNET_DEVICES],
    phases,
    deliveries,
    routesUsed,
    pending: copyPending(pending),
    finalStatus: statusFor(
      scenario.phases[scenario.phases.length - 1]?.routes ?? NO_ROUTES,
      pending,
    ),
    socialDelivered,
    filesDelivered,
    duplicateCount,
  };
}
