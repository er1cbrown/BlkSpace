import { describe, expect, it, vi } from "vitest";
import {
  loadPlaces,
  nominatimSearchUrl,
  parseRouteSentence,
  resolveRouteSentence,
  routeSentence,
  savePlace,
} from "@/lib/deck-query";

const here = { lon: -84.39, lat: 33.75 };
const home = { lon: -84.3, lat: 33.8 };

describe("route sentences", () => {
  it("reads gas then home as here, a gas search, and the saved home pin", () => {
    expect(parseRouteSentence("gas then home")).toEqual({
      stops: [
        { kind: "here" },
        { kind: "search", query: "gas station" },
        { kind: "saved", name: "home" },
      ],
    });
    expect(parseRouteSentence("from work then home")).toEqual({
      stops: [
        { kind: "place", name: "work", query: "work" },
        { kind: "saved", name: "home" },
      ],
    });
    expect(parseRouteSentence("")).toEqual({
      error: "Enter a sentence such as gas then home.",
    });
  });

  it("refuses home before any search when the pin is missing", async () => {
    const fetchImpl = vi.fn();
    const result = await resolveRouteSentence("gas then home", {
      here,
      places: [],
      geocoderBase: "http://127.0.0.1:8088",
      fetchImpl,
    });
    expect(result).toEqual({ ok: false, error: "Save a home pin first." });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("asks local search near here, then OSRM through the gas stop", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("/search")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { lat: "33.755", lon: "-84.385", display_name: "Shell, Atlanta" },
          ],
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          code: "Ok",
          routes: [
            {
              distance: 5000,
              duration: 600,
              geometry: {
                coordinates: [
                  [here.lon, here.lat],
                  [-84.385, 33.755],
                  [home.lon, home.lat],
                ],
              },
              legs: [],
            },
          ],
        }),
      };
    });
    const result = await routeSentence("Gas then home", {
      here,
      places: [{ name: "home", point: home }],
      geocoderBase: "http://127.0.0.1:8088/",
      osrmBase: "http://127.0.0.1:5000",
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stops.map((stop) => stop.label)).toEqual(["here", "Shell", "home"]);
    const search = String(fetchImpl.mock.calls[0]?.[0]);
    expect(search).toContain("/search?");
    expect(search).toContain("q=gas+station");
    expect(search).toContain("lat=33.750000");
    expect(search).toContain("lon=-84.390000");
    const route = String(fetchImpl.mock.calls[1]?.[0]);
    expect(route).toContain(
      "-84.390000,33.750000;-84.385000,33.755000;-84.300000,33.800000",
    );
    expect(
      nominatimSearchUrl("notaurl", "gas station", null),
    ).toBeNull();
  });

  it("keeps a saved work pin off the geocoder", async () => {
    const fetchImpl = vi.fn();
    const places = savePlace([], "work", { lon: -84.2, lat: 33.7 });
    const result = await resolveRouteSentence("from work then home", {
      here,
      places: savePlace(places, "home", home),
      geocoderBase: "http://127.0.0.1:8088",
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stops.map((stop) => stop.point.lon)).toEqual([-84.2, home.lon]);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(loadPlaces({ getItem: () => "{" })).toEqual([]);
  });
});
