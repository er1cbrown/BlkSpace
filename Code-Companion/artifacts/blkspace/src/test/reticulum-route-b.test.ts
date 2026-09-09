import { describe, expect, it } from "vitest";
import { CONNECTIVITY_ROUTES } from "@/lib/secure-connectivity-routes";
import { RNS_INSTALL_HINT, RNS_POLICY } from "@/lib/reticulum";
import { skeletonRoutes } from "@/lib/mesh-skeleton";

describe("Route B RNS policy", () => {
  const routeB = CONNECTIVITY_ROUTES.find((r) => r.id === "B");

  it("uses bundled native rns/rnsd, not a Python bridge", () => {
    expect(routeB?.transport.toLowerCase()).toContain("bundled native");
    expect(routeB?.transport.toLowerCase()).not.toContain("python");
    expect(RNS_INSTALL_HINT.toLowerCase()).toContain("do not pip");
    expect(RNS_INSTALL_HINT.toLowerCase()).not.toMatch(/^pip install rns/);
  });

  it("keeps RNS spool off Nostr keys and forbids LXMF / RNode", () => {
    expect(routeB?.localStore.toLowerCase()).toContain("never next to nostr keys");
    expect(routeB?.neverUseFor).toMatch(/Python sidecar/);
    expect(routeB?.neverUseFor).toMatch(/LXMF identity store/);
    expect(routeB?.neverUseFor).toMatch(/RNode serial\/BLE/);
    expect(routeB?.neverUseFor).toMatch(/dest hashes beside keys/);
    expect(RNS_POLICY).toEqual({
      pythonSidecar: false,
      lxmfIdentityStore: false,
      rnodeSerialBle: false,
      destHashesNextToNostrKeys: false,
    });
  });

  it("stays a parallel route in the mesh skeleton", () => {
    expect(skeletonRoutes().map((r) => r.id)).toEqual(["A", "B", "C"]);
    expect(skeletonRoutes()[1].transport.toLowerCase()).not.toContain("python");
  });
});
