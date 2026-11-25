import { describe, expect, it } from "vitest";
import {
  DECK_INTRO,
  DECK_LAYERS,
  DECK_PHASES,
  deckLayerOrder,
  nextDeckPhase,
} from "@/lib/cyberdeck-intro";

describe("offline deck intro", () => {
  it("keeps navigation on the offline core and the local link", () => {
    expect(deckLayerOrder()).toEqual(["offline", "local", "mesh", "cloud"]);
    expect(DECK_LAYERS.filter((layer) => layer.required).map((layer) => layer.id)).toEqual([
      "offline",
      "local",
    ]);
    const mesh = DECK_LAYERS.find((layer) => layer.id === "mesh");
    expect(mesh?.role).toMatch(/route stays on the local link/i);
    expect(mesh?.tech).not.toMatch(/OSRM/);
  });

  it("names the bench as the only next proof", () => {
    expect(DECK_PHASES.filter((phase) => phase.status === "next")).toHaveLength(1);
    expect(nextDeckPhase().id).toBe("bench");
    expect(DECK_PHASES.map((phase) => phase.id)).toEqual([
      "bench",
      "route",
      "panel",
      "query",
    ]);
    expect(DECK_PHASES.find((phase) => phase.id === "panel")?.status).toBe("later");
  });

  it("says the receiver is not connected", () => {
    expect(DECK_INTRO.status).toBe("Receiver not connected");
    expect(DECK_INTRO.statusDetail).toMatch(/does not request a route/i);
    expect(DECK_INTRO.hours).toBe("40–120 hours");
    expect(DECK_INTRO.extras).toBe("$0–$200");
  });
});
