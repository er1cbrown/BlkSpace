import { describe, expect, it, vi } from "vitest";
import {
  fetchDeckRoute,
  fitView,
  formatDistance,
  formatDuration,
  loadMapDraft,
  osrmRouteUrl,
  parseOsrmRoute,
  project,
  readPair,
  stepInstruction,
  tileUrl,
  tilesForView,
  unproject,
} from "@/lib/deck-map";

const sample = {
  code: "Ok",
  routes: [
    {
      distance: 1200,
      duration: 180,
      geometry: {
        type: "LineString",
        coordinates: [
          [-84.39, 33.75],
          [-84.38, 33.76],
        ],
      },
      legs: [
        {
          steps: [
            {
              distance: 1100,
              name: "Peachtree Street",
              maneuver: { type: "depart", modifier: "right" },
            },
            {
              distance: 100,
              name: "Peachtree Street",
              maneuver: { type: "arrive" },
            },
          ],
        },
      ],
    },
  ],
};

describe("deck map", () => {
  it("builds an OSRM URL with longitude first", () => {
    expect(
      osrmRouteUrl(
        "http://127.0.0.1:5000/",
        { lon: -84.39, lat: 33.75 },
        { lon: -84.38, lat: 33.76 },
      ),
    ).toBe(
      "http://127.0.0.1:5000/route/v1/driving/-84.390000,33.750000;-84.380000,33.760000?overview=full&geometries=geojson&steps=true",
    );
  });

  it("rejects a pair that is only half filled", () => {
    expect(readPair("33.7", "")).toEqual({
      error: "Enter both latitude and longitude.",
    });
    expect(readPair("91", "10")).toEqual({
      error: "Latitude must be between -90 and 90.",
    });
    expect(readPair("", "")).toBeNull();
  });

  it("reads a driving line and refuses a missing route", () => {
    const parsed = parseOsrmRoute(sample);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.route.line).toEqual([
      { lon: -84.39, lat: 33.75 },
      { lon: -84.38, lat: 33.76 },
    ]);
    expect(parsed.route.steps[0]?.instruction).toBe(
      "Head right on Peachtree Street",
    );
    expect(parsed.route.steps[1]?.instruction).toBe("Arrive, Peachtree Street");
    expect(formatDistance(parsed.route.distanceM)).toBe("1.2 km");
    expect(formatDuration(parsed.route.durationS)).toBe("3 min");
    expect(parseOsrmRoute({ code: "NoRoute" })).toEqual({
      ok: false,
      error: "OSRM has no driving route for those points.",
    });
  });

  it("speaks a turn onto the named road", () => {
    expect(
      stepInstruction({
        name: "Memorial Drive",
        maneuver: { type: "turn", modifier: "left" },
      }),
    ).toBe("Turn left onto Memorial Drive");
  });

  it("projects the center of the view back onto itself", () => {
    const view = { center: { lon: -84.388, lat: 33.749 }, zoom: 12 };
    const pixel = project(view.center, view, 800, 480);
    expect(pixel.x).toBeCloseTo(400, 4);
    expect(pixel.y).toBeCloseTo(240, 4);
    const back = unproject(pixel.x, pixel.y, view, 800, 480);
    expect(back.lon).toBeCloseTo(view.center.lon, 4);
    expect(back.lat).toBeCloseTo(view.center.lat, 4);
  });

  it("fits two city points inside the padded frame", () => {
    const view = fitView(
      [
        { lon: -84.39, lat: 33.75 },
        { lon: -84.37, lat: 33.77 },
      ],
      800,
      480,
    );
    expect(view.zoom).toBeGreaterThan(2);
    const west = project({ lon: -84.39, lat: 33.77 }, view, 800, 480);
    const east = project({ lon: -84.37, lat: 33.75 }, view, 800, 480);
    expect(west.x).toBeGreaterThanOrEqual(32);
    expect(east.x).toBeLessThanOrEqual(768);
  });

  it("builds a local tile URL and ignores a template with no tokens", () => {
    expect(
      tileUrl("http://127.0.0.1:8080/tiles/{z}/{x}/{y}.png", {
        z: 12,
        x: 3,
        y: 4,
      }),
    ).toBe("http://127.0.0.1:8080/tiles/12/3/4.png");
    expect(tileUrl("http://127.0.0.1:8080/tile.png", { z: 1, x: 0, y: 0 })).toBeNull();
    const tiles = tilesForView(
      { center: { lon: 0, lat: 0 }, zoom: 2 },
      256,
      256,
    );
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.every((tile) => tile.z === 2)).toBe(true);
  });

  it("does not call the network when OSRM is unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    const result = await fetchDeckRoute(
      "http://127.0.0.1:5000",
      { lon: -84.39, lat: 33.75 },
      { lon: -84.38, lat: 33.76 },
      fetchImpl,
    );
    expect(result).toEqual({
      ok: false,
      error: "OSRM did not answer. Start it on the Pi, then try the route again.",
    });
    expect(
      await fetchDeckRoute(
        "ftp://127.0.0.1:5000",
        { lon: 0, lat: 0 },
        { lon: 1, lat: 1 },
        fetchImpl,
      ),
    ).toEqual({
      ok: false,
      error: "OSRM address must start with http:// or https://.",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("drops a stored draft that is not JSON", () => {
    expect(loadMapDraft({ getItem: () => "{" }).osrmBase).toBe(
      "http://127.0.0.1:5000",
    );
  });
});
