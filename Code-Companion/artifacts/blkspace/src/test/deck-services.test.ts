import { describe, expect, it } from "vitest";
import { parseOsrmRoute, stepInstruction } from "@/lib/deck-map";
import { edgesFromGeoJSON, routeDrivingWire } from "@/lib/deck-roads";
import { searchPois } from "@/lib/deck-search";

const roads = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "North Street" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-84.39, 33.75],
          [-84.39, 33.751],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "East Street" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-84.39, 33.751],
          [-84.389, 33.751],
        ],
      },
    },
  ],
};

describe("local search and town router", () => {
  it("picks the nearer fuel stop for a gas query", () => {
    const hits = searchPois(
      [
        { name: "Far Pump", lat: 33.8, lon: -84.3, kind: "fuel" },
        { name: "Near Pump", lat: 33.7501, lon: -84.3901, kind: "fuel" },
        { name: "Library", lat: 33.75, lon: -84.39, kind: "place" },
      ],
      { q: "gas station", near: { lat: 33.75, lon: -84.39 }, limit: 1 },
    );
    expect(hits.map((hit) => hit.name)).toEqual(["Near Pump"]);
    expect(
      searchPois(
        [{ name: "Library", lat: 33.75, lon: -84.39, kind: "place" }],
        { q: "library", near: null, limit: 1 },
      ).map((hit) => hit.name),
    ).toEqual(["Library"]);
  });

  it("follows the streets around the corner instead of a straight line", () => {
    const graph = edgesFromGeoJSON(roads);
    const wire = routeDrivingWire(graph, [
      { lon: -84.39, lat: 33.75 },
      { lon: -84.389, lat: 33.751 },
    ]);
    const parsed = parseOsrmRoute(wire);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.route.line.map((point) => point.lat.toFixed(3))).toEqual([
      "33.750",
      "33.751",
      "33.751",
    ]);
    expect(parsed.route.steps.map((step) => step.instruction)).toEqual([
      "Head on North Street",
      "Turn right onto East Street",
      "Arrive, East Street",
    ]);
    expect(parsed.route.distanceM).toBeGreaterThan(100);
  });

  it("uses one instruction for a straight street with several nodes", () => {
    const graph = edgesFromGeoJSON({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "North Street" },
          geometry: {
            type: "LineString",
            coordinates: [
              [-84.39, 33.75],
              [-84.39, 33.7505],
              [-84.39, 33.751],
            ],
          },
        },
        {
          type: "Feature",
          properties: { name: "East Street" },
          geometry: {
            type: "LineString",
            coordinates: [
              [-84.39, 33.751],
              [-84.3895, 33.751],
              [-84.389, 33.751],
            ],
          },
        },
      ],
    });
    const parsed = parseOsrmRoute(
      routeDrivingWire(graph, [
        { lon: -84.39, lat: 33.75 },
        { lon: -84.389, lat: 33.751 },
      ]),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.route.line).toHaveLength(5);
    expect(parsed.route.steps.map((step) => step.instruction)).toEqual([
      "Head on North Street",
      "Turn right onto East Street",
      "Arrive, East Street",
    ]);
  });

  it("says when no roads are loaded", () => {
    const wire = routeDrivingWire(edgesFromGeoJSON({ features: [] }), [
      { lon: -84.39, lat: 33.75 },
      { lon: -84.38, lat: 33.76 },
    ]);
    expect(parseOsrmRoute(wire)).toEqual({
      ok: false,
      error: "No road file is loaded.",
    });
  });

  it("uses the shared turn wording", () => {
    expect(
      stepInstruction({
        name: "East Street",
        maneuver: { type: "turn", modifier: "right" },
      }),
    ).toBe("Turn right onto East Street");
  });
});
