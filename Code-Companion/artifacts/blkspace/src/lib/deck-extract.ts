/** Turn an OSM XML or Overpass JSON extract into pois.json and roads.json. */

export type DeckPoi = {
  name: string;
  lat: number;
  lon: number;
  kind: string;
};

export type DeckRoad = {
  type: "Feature";
  properties: { name: string; oneway?: "yes" };
  geometry: { type: "LineString"; coordinates: [number, number][] };
};

export type DeckExtract = {
  pois: DeckPoi[];
  roads: { type: "FeatureCollection"; features: DeckRoad[] };
};

const DRIVING = new Set([
  "motorway",
  "trunk",
  "primary",
  "secondary",
  "tertiary",
  "unclassified",
  "residential",
  "living_street",
  "service",
  "motorway_link",
  "trunk_link",
  "primary_link",
  "secondary_link",
  "tertiary_link",
]);

const PLACE_KEYS = ["amenity", "shop", "tourism", "leisure", "office"];

type Pt = { lat: number; lon: number };

type NodeRec = Pt & { id: string; tags: Record<string, string> };

type WayRec = {
  nodeIds: string[];
  geometry: Pt[] | null;
  center: Pt | null;
  tags: Record<string, string>;
};

function emptyExtract(): DeckExtract {
  return { pois: [], roads: { type: "FeatureCollection", features: [] } };
}

function raw(tags: Record<string, string>, key: string): string {
  return (tags[key] ?? "").trim();
}

function lower(tags: Record<string, string>, key: string): string {
  return raw(tags, key).toLowerCase();
}

function inRange(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function asCoord(lat: unknown, lon: unknown): Pt | null {
  const latN = typeof lat === "number" ? lat : Number(lat);
  const lonN = typeof lon === "number" ? lon : Number(lon);
  if (!Number.isFinite(latN) || !Number.isFinite(lonN)) return null;
  if (!inRange(latN, lonN)) return null;
  return { lat: latN, lon: lonN };
}

function fuelName(tags: Record<string, string>): string {
  return raw(tags, "name") || raw(tags, "brand") || "Fuel";
}

function poiFromNode(node: NodeRec): DeckPoi | null {
  if (!inRange(node.lat, node.lon)) return null;
  if (lower(node.tags, "amenity") === "fuel") {
    return { name: fuelName(node.tags), lat: node.lat, lon: node.lon, kind: "fuel" };
  }
  const name = raw(node.tags, "name");
  if (!name) return null;
  if (!PLACE_KEYS.some((key) => raw(node.tags, key))) return null;
  return { name, lat: node.lat, lon: node.lon, kind: "place" };
}

function carForbidden(tags: Record<string, string>): boolean {
  if (lower(tags, "motorcar") === "no" || lower(tags, "motor_vehicle") === "no") return true;
  if (lower(tags, "access") !== "no") return false;
  return lower(tags, "motorcar") !== "yes" && lower(tags, "motor_vehicle") !== "yes";
}

function isDriving(tags: Record<string, string>): boolean {
  if (!DRIVING.has(lower(tags, "highway"))) return false;
  if (lower(tags, "area") === "yes") return false;
  return !carForbidden(tags);
}

function onewayMode(tags: Record<string, string>): "no" | "yes" | "reverse" {
  const value = lower(tags, "oneway");
  if (value === "-1") return "reverse";
  if (value === "yes" || value === "true" || value === "1") return "yes";
  return "no";
}

function dedupe(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const point of points) {
    const prev = out[out.length - 1];
    if (prev && prev.lat === point.lat && prev.lon === point.lon) continue;
    out.push(point);
  }
  return out;
}

function wayPoints(way: WayRec, nodes: Map<string, NodeRec>): Pt[] {
  if (way.nodeIds.length >= 2) {
    const resolved: Pt[] = [];
    let missing = false;
    for (const id of way.nodeIds) {
      const node = nodes.get(id);
      if (!node) {
        missing = true;
        break;
      }
      resolved.push({ lat: node.lat, lon: node.lon });
    }
    if (!missing && resolved.length >= 2) return resolved;
  }
  if (way.geometry && way.geometry.length >= 2) return way.geometry.map((point) => ({ ...point }));
  const partial: Pt[] = [];
  for (const id of way.nodeIds) {
    const node = nodes.get(id);
    if (node) partial.push({ lat: node.lat, lon: node.lon });
  }
  return partial.length >= 2 ? partial : [];
}

function centroid(points: Pt[]): Pt {
  let lat = 0;
  let lon = 0;
  for (const point of points) {
    lat += point.lat;
    lon += point.lon;
  }
  return { lat: lat / points.length, lon: lon / points.length };
}

function build(nodeList: NodeRec[], ways: WayRec[]): DeckExtract {
  const nodes = new Map<string, NodeRec>();
  for (const node of nodeList) {
    if (node.id) nodes.set(node.id, node);
  }
  const pois: DeckPoi[] = [];
  for (const node of nodeList) {
    const poi = poiFromNode(node);
    if (poi) pois.push(poi);
  }
  const features: DeckRoad[] = [];
  for (const way of ways) {
    const points = dedupe(wayPoints(way, nodes));
    if (lower(way.tags, "amenity") === "fuel") {
      const at = points.length > 0 ? centroid(points) : way.center;
      if (at && inRange(at.lat, at.lon)) {
        pois.push({ name: fuelName(way.tags), lat: at.lat, lon: at.lon, kind: "fuel" });
      }
    }
    if (!isDriving(way.tags) || points.length < 2) continue;
    const mode = onewayMode(way.tags);
    const line = mode === "reverse" ? [...points].reverse() : points;
    const properties: DeckRoad["properties"] = {
      name: raw(way.tags, "name") || "road",
    };
    if (mode !== "no") properties.oneway = "yes";
    features.push({
      type: "Feature",
      properties,
      geometry: {
        type: "LineString",
        coordinates: line.map((point) => [point.lon, point.lat]),
      },
    });
  }
  return { pois, roads: { type: "FeatureCollection", features } };
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, digits: string) =>
      String.fromCodePoint(Number.parseInt(digits, 16)),
    );
}

function attrs(head: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Za-z_:][\w:.-]*)\s*=\s*(["'])([\s\S]*?)\2/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(head))) {
    const key = match[1];
    const value = match[3];
    if (key && value !== undefined) out[key] = decodeXml(value);
  }
  return out;
}

function readElement(
  xml: string,
  start: number,
): { name: string; head: string; body: string; next: number } | null {
  if (xml[start] !== "<") return null;
  if (xml.startsWith("<!--", start)) {
    const end = xml.indexOf("-->", start + 4);
    return { name: "", head: "", body: "", next: end < 0 ? xml.length : end + 3 };
  }
  if (xml.startsWith("<?", start) || xml.startsWith("<!", start)) {
    const end = xml.indexOf(">", start + 2);
    return { name: "", head: "", body: "", next: end < 0 ? xml.length : end + 1 };
  }
  let i = start + 1;
  while (i < xml.length && /[A-Za-z0-9:_-]/.test(xml[i] ?? "")) i += 1;
  const name = xml.slice(start + 1, i);
  if (!name) return { name: "", head: "", body: "", next: start + 1 };
  const gt = xml.indexOf(">", i);
  if (gt < 0) return null;
  const selfClose = xml[gt - 1] === "/";
  const head = xml.slice(i, selfClose ? gt - 1 : gt);
  if (selfClose) return { name, head, body: "", next: gt + 1 };
  const close = `</${name}>`;
  const bodyEnd = xml.indexOf(close, gt + 1);
  if (bodyEnd < 0) return null;
  return { name, head, body: xml.slice(gt + 1, bodyEnd), next: bodyEnd + close.length };
}

function children(body: string): { name: string; attrs: Record<string, string> }[] {
  const out: { name: string; attrs: Record<string, string> }[] = [];
  let cursor = 0;
  while (cursor < body.length) {
    const start = body.indexOf("<", cursor);
    if (start < 0) break;
    const el = readElement(body, start);
    if (!el) throw new Error("Map extract XML is truncated.");
    cursor = el.next > start ? el.next : start + 1;
    if (el.name) out.push({ name: el.name, attrs: attrs(el.head) });
  }
  return out;
}

function tagsFrom(parts: { name: string; attrs: Record<string, string> }[]): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const part of parts) {
    if (part.name !== "tag") continue;
    const key = part.attrs.k?.trim();
    const value = part.attrs.v?.trim();
    if (key && value) tags[key] = value;
  }
  return tags;
}

function collectOsm(xml: string, nodes: NodeRec[], ways: WayRec[]) {
  let cursor = 0;
  while (cursor < xml.length) {
    const start = xml.indexOf("<", cursor);
    if (start < 0) break;
    const el = readElement(xml, start);
    if (!el) throw new Error("Map extract XML is truncated.");
    cursor = el.next > start ? el.next : start + 1;
    if (el.name === "node") {
      const head = attrs(el.head);
      const point = asCoord(head.lat, head.lon);
      if (!point) continue;
      nodes.push({
        id: (head.id ?? "").trim(),
        lat: point.lat,
        lon: point.lon,
        tags: tagsFrom(children(el.body)),
      });
    } else if (el.name === "way") {
      const parts = children(el.body);
      ways.push({
        nodeIds: parts
          .filter((part) => part.name === "nd")
          .map((part) => (part.attrs.ref ?? "").trim())
          .filter(Boolean),
        geometry: null,
        center: null,
        tags: tagsFrom(parts),
      });
    } else if (el.body) {
      collectOsm(el.body, nodes, ways);
    }
  }
}

export function convertOsmXml(xml: string): DeckExtract {
  const nodes: NodeRec[] = [];
  const ways: WayRec[] = [];
  collectOsm(xml, nodes, ways);
  return build(nodes, ways);
}

function asTags(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const tags: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawValue === "string" && rawValue.trim()) tags[key] = rawValue.trim();
    else if (typeof rawValue === "number" && Number.isFinite(rawValue)) tags[key] = String(rawValue);
  }
  return tags;
}

function asPointList(value: unknown): Pt[] | null {
  if (!Array.isArray(value)) return null;
  const points: Pt[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as { lat?: unknown; lon?: unknown };
    const point = asCoord(record.lat, record.lon);
    if (!point) return null;
    points.push(point);
  }
  return points;
}

export function convertOverpass(body: unknown): DeckExtract {
  const elements = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { elements?: unknown }).elements)
      ? (body as { elements: unknown[] }).elements
      : null;
  if (!elements) throw new Error("Map extract is not OSM XML or Overpass JSON.");
  const nodes: NodeRec[] = [];
  const ways: WayRec[] = [];
  for (const element of elements) {
    if (!element || typeof element !== "object") continue;
    const record = element as {
      type?: unknown;
      id?: unknown;
      lat?: unknown;
      lon?: unknown;
      tags?: unknown;
      nodes?: unknown;
      geometry?: unknown;
      center?: unknown;
    };
    const tags = asTags(record.tags);
    if (record.type === "node") {
      const point = asCoord(record.lat, record.lon);
      if (!point) continue;
      nodes.push({
        id: record.id === undefined || record.id === null ? "" : String(record.id),
        lat: point.lat,
        lon: point.lon,
        tags,
      });
    } else if (record.type === "way") {
      const centerRecord =
        record.center && typeof record.center === "object"
          ? (record.center as { lat?: unknown; lon?: unknown })
          : null;
      ways.push({
        nodeIds: Array.isArray(record.nodes)
          ? record.nodes.map((id) => String(id)).filter((id) => id && id !== "undefined")
          : [],
        geometry: asPointList(record.geometry),
        center: centerRecord ? asCoord(centerRecord.lat, centerRecord.lon) : null,
        tags,
      });
    }
  }
  return build(nodes, ways);
}

export function convertMapExtract(text: string): DeckExtract {
  let rawText = text;
  if (rawText.charCodeAt(0) === 0xfeff) rawText = rawText.slice(1);
  const trimmed = rawText.trim();
  if (!trimmed) return emptyExtract();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let body: unknown;
    try {
      body = JSON.parse(trimmed);
    } catch {
      throw new Error("Map extract is not valid Overpass JSON.");
    }
    return convertOverpass(body);
  }
  if (trimmed.startsWith("<")) return convertOsmXml(trimmed);
  throw new Error("Map extract is not OSM XML or Overpass JSON.");
}
