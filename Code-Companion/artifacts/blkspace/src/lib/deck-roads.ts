/** Town-sized driving router. Same JSON shape the Maps page already reads from OSRM. */

import { metersBetween } from "./deck-search";

export type LonLat = { lon: number; lat: number };

type Node = { id: string; point: LonLat };

type Link = { to: string; meters: number; name: string };

const SNAP_METERS = 500;

function nodeId(point: LonLat): string {
  return `${point.lon.toFixed(5)},${point.lat.toFixed(5)}`;
}

function asPoint(value: unknown): LonLat | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lon = Number(value[0]);
  const lat = Number(value[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lon, lat };
}

export function edgesFromGeoJSON(body: unknown): {
  nodes: Map<string, Node>;
  links: Map<string, Link[]>;
} {
  const nodes = new Map<string, Node>();
  const links = new Map<string, Link[]>();
  const features = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { features?: unknown }).features)
      ? (body as { features: unknown[] }).features
      : [];
  const add = (from: Node, to: Node, name: string) => {
    const list = links.get(from.id) ?? [];
    list.push({ to: to.id, meters: metersBetween(from.point, to.point), name });
    links.set(from.id, list);
  };
  for (const feature of features) {
    if (!feature || typeof feature !== "object") continue;
    const record = feature as {
      geometry?: { type?: unknown; coordinates?: unknown };
      properties?: { name?: unknown; oneway?: unknown };
    };
    if (record.geometry?.type !== "LineString") continue;
    const coords = Array.isArray(record.geometry.coordinates)
      ? record.geometry.coordinates
      : [];
    const name =
      typeof record.properties?.name === "string" && record.properties.name.trim()
        ? record.properties.name.trim()
        : "road";
    const oneway = record.properties?.oneway === "yes" || record.properties?.oneway === true;
    const points = coords
      .map(asPoint)
      .filter((point): point is LonLat => point !== null);
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const next = points[i];
      if (!prev || !next) continue;
      const a = { id: nodeId(prev), point: prev };
      const b = { id: nodeId(next), point: next };
      if (a.id === b.id) continue;
      nodes.set(a.id, a);
      nodes.set(b.id, b);
      add(a, b, name);
      if (!oneway) add(b, a, name);
    }
  }
  return { nodes, links };
}

function nearest(nodes: Map<string, Node>, point: LonLat): Node | null {
  let best: Node | null = null;
  let bestMeters = SNAP_METERS;
  for (const node of nodes.values()) {
    const meters = metersBetween(
      { lat: point.lat, lon: point.lon },
      { lat: node.point.lat, lon: node.point.lon },
    );
    if (meters <= bestMeters) {
      best = node;
      bestMeters = meters;
    }
  }
  return best;
}

function bearing(a: LonLat, b: LonLat): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function turnModifier(before: number, after: number): string {
  let delta = after - before;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  if (Math.abs(delta) < 35) return "straight";
  return delta > 0 ? "right" : "left";
}

function shortest(
  links: Map<string, Link[]>,
  from: string,
  to: string,
): { id: string; name: string; meters: number }[] | null {
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, { id: string; name: string; meters: number }>();
  const waiting = new Set<string>([from]);
  while (waiting.size > 0) {
    let current = "";
    let currentDist = Infinity;
    for (const id of waiting) {
      const weight = dist.get(id) ?? Infinity;
      if (weight < currentDist) {
        current = id;
        currentDist = weight;
      }
    }
    if (!current || currentDist === Infinity) break;
    waiting.delete(current);
    if (current === to) break;
    for (const link of links.get(current) ?? []) {
      const next = currentDist + link.meters;
      if (next < (dist.get(link.to) ?? Infinity)) {
        dist.set(link.to, next);
        prev.set(link.to, { id: current, name: link.name, meters: link.meters });
        waiting.add(link.to);
      }
    }
  }
  if (from !== to && !prev.has(to)) return null;
  const hops: { id: string; name: string; meters: number }[] = [];
  let cursor = to;
  while (cursor !== from) {
    const step = prev.get(cursor);
    if (!step) return null;
    hops.push({ id: cursor, name: step.name, meters: step.meters });
    cursor = step.id;
  }
  hops.reverse();
  return hops;
}

export function routeDrivingWire(
  graph: { nodes: Map<string, Node>; links: Map<string, Link[]> },
  points: LonLat[],
): unknown {
  if (graph.nodes.size === 0) {
    return { code: "Error", message: "No road file is loaded." };
  }
  if (points.length < 2) {
    return { code: "Error", message: "A route needs a start and an end." };
  }
  const snapped: Node[] = [];
  for (const point of points) {
    const node = nearest(graph.nodes, point);
    if (!node) return { code: "Error", message: "No road near the start." };
    snapped.push(node);
  }
  const coordinates: [number, number][] = [];
  const steps: {
    distance: number;
    name: string;
    maneuver: { type: string; modifier?: string };
  }[] = [];
  let distance = 0;
  const first = snapped[0];
  if (!first) return { code: "Error", message: "No road near the start." };
  coordinates.push([first.point.lon, first.point.lat]);
  for (let leg = 1; leg < snapped.length; leg += 1) {
    const start = snapped[leg - 1];
    const end = snapped[leg];
    if (!start || !end) continue;
    const hops = shortest(graph.links, start.id, end.id);
    if (!hops) return { code: "NoRoute" };
    let previousBearing: number | null = null;
    for (const hop of hops) {
      const node = graph.nodes.get(hop.id);
      if (!node) continue;
      const fromPoint = coordinates[coordinates.length - 1];
      if (!fromPoint) continue;
      const from = { lon: fromPoint[0], lat: fromPoint[1] };
      const head = bearing(from, node.point);
      const modifier =
        previousBearing === null ? undefined : turnModifier(previousBearing, head);
      const prior = steps[steps.length - 1];
      if (prior && modifier === "straight" && prior.name === hop.name) {
        prior.distance += hop.meters;
      } else {
        steps.push({
          distance: hop.meters,
          name: hop.name,
          maneuver: {
            type: steps.length === 0 ? "depart" : modifier && modifier !== "straight" ? "turn" : "continue",
            ...(modifier ? { modifier } : {}),
          },
        });
      }
      previousBearing = head;
      distance += hop.meters;
      coordinates.push([node.point.lon, node.point.lat]);
    }
  }
  const last = snapped[snapped.length - 1];
  steps.push({
    distance: 0,
    name: steps[steps.length - 1]?.name ?? "",
    maneuver: { type: "arrive" },
  });
  if (coordinates.length < 2 && last) {
    coordinates.push([last.point.lon, last.point.lat]);
  }
  return {
    code: "Ok",
    routes: [
      {
        distance,
        duration: distance / 13.89,
        geometry: { type: "LineString", coordinates },
        legs: [{ steps }],
      },
    ],
  };
}
