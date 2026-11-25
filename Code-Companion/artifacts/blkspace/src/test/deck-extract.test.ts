import { describe, expect, it } from "vitest";
import { convertMapExtract, convertOsmXml, convertOverpass } from "@/lib/deck-extract";
import { parseOsrmRoute } from "@/lib/deck-map";
import { edgesFromGeoJSON, routeDrivingWire } from "@/lib/deck-roads";
import { searchPois } from "@/lib/deck-search";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6">
  <node id="1" lat="33.750" lon="-84.390"/>
  <node id="2" lat="33.751" lon="-84.390"/>
  <node id="3" lat="33.751" lon="-84.389"/>
  <node id="9" lat="33.7501" lon="-84.3901">
    <tag k="amenity" v="fuel"/>
    <tag k="brand" v="Shell"/>
  </node>
  <node id="8" lat="33.752" lon="-84.388">
    <tag k="amenity" v="library"/>
    <tag k="name" v="Town Library"/>
  </node>
  <node id="7" lat="33.753" lon="-84.387">
    <tag k="amenity" v="fuel"/>
  </node>
  <node id="4" lat="33.000" lon="-84.000"/>
  <node id="5" lat="33.000" lon="-84.002"/>
  <node id="6" lat="33.002" lon="-84.000"/>
  <node id="40" lat="33.760019" lon="-84.380019"/>
  <node id="41" lat="33.760019" lon="-84.381019"/>
  <node id="20" lat="34.000" lon="-85.000"/>
  <node id="21" lat="34.001" lon="-85.000"/>
  <way id="10">
    <nd ref="1"/>
    <nd ref="2"/>
    <tag k="highway" v="residential"/>
    <tag k="name" v="North Street"/>
  </way>
  <way id="11">
    <nd ref="2"/>
    <nd ref="3"/>
    <tag k="highway" v="residential"/>
    <tag k="name" v="East Street"/>
  </way>
  <way id="12">
    <nd ref="1"/>
    <nd ref="3"/>
    <tag k="highway" v="footway"/>
    <tag k="name" v="Trail"/>
  </way>
  <way id="13">
    <nd ref="1"/>
    <nd ref="2"/>
    <tag k="highway" v="residential"/>
    <tag k="oneway" v="-1"/>
    <tag k="name" v="Back Street"/>
  </way>
  <way id="14">
    <nd ref="1"/>
    <nd ref="3"/>
    <tag k="highway" v="service"/>
    <tag k="access" v="no"/>
    <tag k="name" v="Closed"/>
  </way>
  <way id="15">
    <nd ref="20"/>
    <nd ref="21"/>
    <tag k="highway" v="residential"/>
    <tag k="motorcar" v="no"/>
    <tag k="name" v="No Cars"/>
  </way>
  <way id="16">
    <nd ref="20"/>
    <nd ref="21"/>
    <tag k="highway" v="cycleway"/>
    <tag k="name" v="Bike"/>
  </way>
  <way id="17">
    <nd ref="20"/>
    <nd ref="21"/>
    <tag k="highway" v="motorway_link"/>
    <tag k="name" v="Ramp"/>
    <tag k="oneway" v="yes"/>
  </way>
  <way id="18">
    <nd ref="4"/>
    <nd ref="5"/>
    <nd ref="6"/>
    <tag k="amenity" v="fuel"/>
    <tag k="name" v="Way Pump"/>
  </way>
  <way id="19">
    <nd ref="40"/>
    <nd ref="41"/>
    <tag k="highway" v="unclassified"/>
    <tag k="name" v="Precise Street"/>
  </way>
  <relation id="90">
    <member type="way" ref="12" role=""/>
    <tag k="type" v="route"/>
    <tag k="route" v="foot"/>
  </relation>
</osm>`;

describe("map extract", () => {
  it("keeps driving roads and fuel, then routes the corner", () => {
    const extracted = convertOsmXml(xml);
    const names = extracted.roads.features.map((feature) => feature.properties.name);
    expect(names).toEqual([
      "North Street",
      "East Street",
      "Back Street",
      "Ramp",
      "Precise Street",
    ]);
    const north = extracted.roads.features.find((feature) => feature.properties.name === "North Street");
    const east = extracted.roads.features.find((feature) => feature.properties.name === "East Street");
    expect(north?.properties.oneway).toBeUndefined();
    expect(north?.geometry.coordinates[1]).toEqual(east?.geometry.coordinates[0]);
    const back = extracted.roads.features.find((feature) => feature.properties.name === "Back Street");
    expect(back?.properties.oneway).toBe("yes");
    expect(back?.geometry.coordinates).toEqual([
      [-84.39, 33.751],
      [-84.39, 33.75],
    ]);
    const precise = extracted.roads.features.find(
      (feature) => feature.properties.name === "Precise Street",
    );
    expect(precise?.geometry.coordinates[0]).toEqual([Number("-84.380019"), Number("33.760019")]);
    expect(extracted.pois).toEqual([
      { name: "Shell", lat: 33.7501, lon: -84.3901, kind: "fuel" },
      { name: "Town Library", lat: 33.752, lon: -84.388, kind: "place" },
      { name: "Fuel", lat: 33.753, lon: -84.387, kind: "fuel" },
      {
        name: "Way Pump",
        lat: (33 + 33 + 33.002) / 3,
        lon: (-84 + -84.002 + -84) / 3,
        kind: "fuel",
      },
    ]);
    expect(
      searchPois(extracted.pois, {
        q: "gas station",
        near: { lat: 33.75, lon: -84.39 },
        limit: 1,
      }).map((hit) => hit.name),
    ).toEqual(["Shell"]);
    const parsed = parseOsrmRoute(
      routeDrivingWire(edgesFromGeoJSON(extracted.roads), [
        { lon: -84.39, lat: 33.75 },
        { lon: -84.389, lat: 33.751 },
      ]),
    );
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
  });

  it("reads the same corner from Overpass JSON", () => {
    const extracted = convertOverpass({
      elements: [
        { type: "node", id: 1, lat: 33.75, lon: -84.39 },
        { type: "node", id: 2, lat: 33.751, lon: -84.39 },
        { type: "node", id: 3, lat: 33.751, lon: -84.389 },
        {
          type: "node",
          id: 9,
          lat: 33.7501,
          lon: -84.3901,
          tags: { amenity: "fuel", brand: "Shell" },
        },
        {
          type: "way",
          id: 10,
          nodes: [1, 2],
          tags: { highway: "residential", name: "North Street" },
        },
        {
          type: "way",
          id: 11,
          nodes: [2, 3],
          tags: { highway: "residential", name: "East Street" },
        },
        {
          type: "way",
          id: 12,
          nodes: [1, 3],
          tags: { highway: "path", name: "Trail" },
        },
        {
          type: "relation",
          id: 90,
          members: [{ type: "way", ref: 12 }],
          tags: { type: "route" },
        },
        {
          type: "way",
          id: 20,
          center: { lat: 33.1, lon: -84.1 },
          tags: { amenity: "fuel", name: "Center Pump" },
        },
      ],
    });
    expect(extracted.pois.map((poi) => poi.name)).toEqual(["Shell", "Center Pump"]);
    const parsed = parseOsrmRoute(
      routeDrivingWire(edgesFromGeoJSON(extracted.roads), [
        { lon: -84.39, lat: 33.75 },
        { lon: -84.389, lat: 33.751 },
      ]),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.route.steps.map((step) => step.instruction)).toEqual([
      "Head on North Street",
      "Turn right onto East Street",
      "Arrive, East Street",
    ]);
  });

  it("sniffs XML and JSON, and rejects a file that is neither", () => {
    const fromXml = convertMapExtract(`\uFEFF${xml}`);
    expect(fromXml.roads.features.length).toBeGreaterThan(0);
    const fromJson = convertMapExtract(
      JSON.stringify({
        elements: [
          {
            type: "way",
            id: 1,
            geometry: [
              { lat: 33.75, lon: -84.39 },
              { lat: 33.751, lon: -84.39 },
            ],
            tags: { highway: "residential", name: "Geometry Street" },
          },
        ],
      }),
    );
    expect(fromJson.roads.features.map((feature) => feature.properties.name)).toEqual([
      "Geometry Street",
    ]);
    expect(convertMapExtract("   ").pois).toEqual([]);
    expect(() => convertMapExtract("not a map")).toThrow(
      "Map extract is not OSM XML or Overpass JSON.",
    );
    expect(() => convertMapExtract("{")).toThrow("Map extract is not valid Overpass JSON.");
  });
});
