import { describe, expect, it } from "vitest";
import {
  getSimulationScenario,
  runWeixNetSimulation,
  WEIXNET_DEVICES,
  WEIXNET_SIMULATION_SCENARIOS,
} from "@/lib/weixnet-route-simulator";

describe("WeixNet route simulator", () => {
  it("uses three devices and the A/B/S transport planes", () => {
    expect(WEIXNET_DEVICES).toEqual(["A", "B", "C"]);
    expect(WEIXNET_SIMULATION_SCENARIOS.map((scenario) => scenario.id)).toEqual(
      ["healthy", "nostr-fallback", "offline-recovery", "sendme-outage"],
    );
  });

  it("uses Nostr for social and Sendme for files when healthy", () => {
    const result = runWeixNetSimulation("healthy");

    expect(result.finalStatus).toBe("online");
    expect(result.routesUsed).toEqual(["nostr", "sendme"]);
    expect(result.socialDelivered).toBe(1);
    expect(result.filesDelivered).toBe(1);
    expect(result.pending).toEqual({ social: [], files: [] });
    expect(result.duplicateCount).toBe(0);
  });

  it("falls back to Reticulum for lightweight social events", () => {
    const result = runWeixNetSimulation("nostr-fallback");

    expect(result.finalStatus).toBe("limited");
    expect(result.routesUsed).toEqual(["reticulum", "sendme"]);
    expect(
      result.deliveries.filter((delivery) => delivery.kind === "social"),
    ).toHaveLength(2);
    expect(result.pending.social).toEqual([]);
  });

  it("queues while offline and flushes once without duplicates", () => {
    const result = runWeixNetSimulation("offline-recovery");

    expect(result.phases[0].status).toBe("offline");
    expect(result.phases[0].pendingAfter).toEqual({
      social: ["social-recovery-001"],
      files: ["blkspace1.recovery-001"],
    });
    expect(result.phases[1].status).toBe("online");
    expect(result.finalStatus).toBe("online");
    expect(result.routesUsed).toEqual(["nostr", "sendme"]);
    expect(result.socialDelivered).toBe(1);
    expect(result.filesDelivered).toBe(1);
    expect(result.pending).toEqual({ social: [], files: [] });
    expect(result.duplicateCount).toBe(0);
  });

  it("keeps file delivery independent from social fallback", () => {
    const result = runWeixNetSimulation("sendme-outage");

    expect(result.routesUsed).toEqual(["nostr", "sendme"]);
    expect(result.phases[0].pendingAfter.files).toEqual([
      "blkspace1.file-outage-001",
    ]);
    expect(result.phases[1].pendingAfter.files).toEqual([]);
    expect(result.filesDelivered).toBe(1);
  });

  it("rejects unknown scenarios with the available IDs", () => {
    expect(() => getSimulationScenario("missing")).toThrow(
      /healthy, nostr-fallback, offline-recovery, sendme-outage/,
    );
  });
});
