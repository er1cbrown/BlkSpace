/** Local map math and OSRM parsing for the offline deck. No tile host is assumed. */

export const DEFAULT_OSRM_BASE = "http://127.0.0.1:5000";
export const DEFAULT_GEOCODER_BASE = "http://127.0.0.1:8088";
export const DEFAULT_RECEIVER_URL = "http://127.0.0.1:2948/fix";
export const MAP_DRAFT_KEY = "blkspace.deck-map";
const MAX_LAT = 85.05112878;

export type LonLat = { lon: number; lat: number };

export type MapView = { center: LonLat; zoom: number };

export type MapDraft = {
  osrmBase: string;
  geocoderBase: string;
  receiverBase: string;
  tileTemplate: string;
  fromLat: string;
  fromLon: string;
  toLat: string;
  toLon: string;
};

export type DeckStep = {
  instruction: string;
  distanceM: number;
};

export type DeckRoute = {
  line: LonLat[];
  distanceM: number;
  durationS: number;
  steps: DeckStep[];
};

export type RouteResult =
  | { ok: true; route: DeckRoute }
  | { ok: false; error: string };

export function emptyMapDraft(): MapDraft {
  return {
    osrmBase: DEFAULT_OSRM_BASE,
    geocoderBase: DEFAULT_GEOCODER_BASE,
    receiverBase: DEFAULT_RECEIVER_URL,
    tileTemplate: "",
    fromLat: "",
    fromLon: "",
    toLat: "",
    toLon: "",
  };
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function loadMapDraft(storage: {
  getItem(key: string): string | null;
}): MapDraft {
  const empty = emptyMapDraft();
  try {
    const raw = storage.getItem(MAP_DRAFT_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<MapDraft>;
    return {
      osrmBase: asText(parsed.osrmBase) || empty.osrmBase,
      geocoderBase: asText(parsed.geocoderBase) || empty.geocoderBase,
      receiverBase: asText(parsed.receiverBase) || empty.receiverBase,
      tileTemplate: asText(parsed.tileTemplate),
      fromLat: asText(parsed.fromLat),
      fromLon: asText(parsed.fromLon),
      toLat: asText(parsed.toLat),
      toLon: asText(parsed.toLon),
    };
  } catch {
    return empty;
  }
}

export function clampLat(lat: number): number {
  return Math.min(MAX_LAT, Math.max(-MAX_LAT, lat));
}

export function wrapLon(lon: number): number {
  const turns = (((lon + 180) % 360) + 360) % 360;
  return turns - 180;
}

export function readPair(
  latRaw: string,
  lonRaw: string,
): LonLat | { error: string } | null {
  const latText = latRaw.trim();
  const lonText = lonRaw.trim();
  if (!latText && !lonText) return null;
  if (!latText || !lonText) {
    return { error: "Enter both latitude and longitude." };
  }
  const lat = Number(latText);
  const lon = Number(lonText);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { error: "Latitude and longitude must be numbers." };
  }
  if (lat < -90 || lat > 90) {
    return { error: "Latitude must be between -90 and 90." };
  }
  if (lon < -180 || lon > 180) {
    return { error: "Longitude must be between -180 and 180." };
  }
  return { lat, lon };
}

export function formatCoord(value: number): string {
  return value.toFixed(6);
}

export function normalizeOsrmBase(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.username || url.password) return null;
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${path === "/" ? "" : path}`;
  } catch {
    return null;
  }
}

export function osrmRouteUrl(
  base: string,
  from: LonLat,
  to: LonLat,
  via: LonLat[] = [],
): string {
  return osrmPointsUrl(base, [from, ...via, to]);
}

export function osrmPointsUrl(base: string, points: LonLat[]): string {
  const root = normalizeOsrmBase(base);
  if (!root) throw new Error("OSRM address is not an http(s) URL");
  if (points.length < 2) throw new Error("A route needs a start and an end.");
  const coord = (point: LonLat) =>
    `${point.lon.toFixed(6)},${point.lat.toFixed(6)}`;
  return `${root}/route/v1/driving/${points.map(coord).join(";")}?overview=full&geometries=geojson&steps=true`;
}

function speakModifier(modifier: string | undefined): string {
  if (!modifier) return "";
  return modifier.replace(/_/g, " ");
}

export function stepInstruction(step: {
  name?: unknown;
  maneuver?: { type?: unknown; modifier?: unknown };
}): string {
  const type = typeof step.maneuver?.type === "string" ? step.maneuver.type : "";
  const modifier =
    typeof step.maneuver?.modifier === "string"
      ? speakModifier(step.maneuver.modifier)
      : "";
  const name = typeof step.name === "string" ? step.name.trim() : "";
  if (type === "arrive") return name ? `Arrive, ${name}` : "Arrive";
  if (type === "depart") {
    const way = name ? ` on ${name}` : "";
    return modifier ? `Head ${modifier}${way}` : `Head${way}`;
  }
  if (type === "turn" || type === "end of road" || type === "fork") {
    const verb = type === "fork" ? "Keep" : "Turn";
    const way = name ? ` onto ${name}` : "";
    return modifier ? `${verb} ${modifier}${way}` : `${verb}${way}`;
  }
  const way = name ? ` on ${name}` : "";
  return modifier ? `Continue ${modifier}${way}` : `Continue${way}`;
}

function asCoord(value: unknown): LonLat | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lon = Number(value[0]);
  const lat = Number(value[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lon, lat };
}

export function parseOsrmRoute(body: unknown): RouteResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "OSRM returned a body this app could not read." };
  }
  const record = body as {
    code?: unknown;
    message?: unknown;
    routes?: unknown;
  };
  if (record.code !== "Ok") {
    if (record.code === "NoRoute") {
      return { ok: false, error: "OSRM has no driving route for those points." };
    }
    const message =
      typeof record.message === "string" && record.message.length < 180
        ? record.message
        : "OSRM did not return a route.";
    return { ok: false, error: message };
  }
  const route = Array.isArray(record.routes) ? record.routes[0] : null;
  if (!route || typeof route !== "object") {
    return { ok: false, error: "OSRM returned no line." };
  }
  const geometry = (route as { geometry?: { coordinates?: unknown } }).geometry;
  const coords = Array.isArray(geometry?.coordinates)
    ? geometry.coordinates
    : [];
  const line = coords
    .map(asCoord)
    .filter((point): point is LonLat => point !== null);
  if (line.length < 2) return { ok: false, error: "OSRM returned no line." };
  const distanceM = Number((route as { distance?: unknown }).distance);
  const durationS = Number((route as { duration?: unknown }).duration);
  const legs = (route as { legs?: unknown }).legs;
  const steps: DeckStep[] = [];
  if (Array.isArray(legs)) {
    for (const leg of legs) {
      const rawSteps = (leg as { steps?: unknown }).steps;
      if (!Array.isArray(rawSteps)) continue;
      for (const step of rawSteps) {
        if (!step || typeof step !== "object") continue;
        const distance = Number((step as { distance?: unknown }).distance);
        steps.push({
          instruction: stepInstruction(
            step as {
              name?: unknown;
              maneuver?: { type?: unknown; modifier?: unknown };
            },
          ),
          distanceM: Number.isFinite(distance) ? distance : 0,
        });
      }
    }
  }
  return {
    ok: true,
    route: {
      line,
      distanceM: Number.isFinite(distanceM) ? distanceM : 0,
      durationS: Number.isFinite(durationS) ? durationS : 0,
      steps,
    },
  };
}

type FetchLike = (
  input: string,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export async function fetchDeckRoute(
  base: string,
  from: LonLat,
  to: LonLat,
  fetchImpl: FetchLike = fetch,
): Promise<RouteResult> {
  return fetchDeckRouteThrough(base, [from, to], fetchImpl);
}

export async function fetchDeckRouteThrough(
  base: string,
  points: LonLat[],
  fetchImpl: FetchLike = fetch,
): Promise<RouteResult> {
  if (points.length < 2) {
    return { ok: false, error: "A route needs a start and an end." };
  }
  if (!normalizeOsrmBase(base)) {
    return {
      ok: false,
      error: "OSRM address must start with http:// or https://.",
    };
  }
  let response: { ok: boolean; status: number; json: () => Promise<unknown> };
  try {
    response = await fetchImpl(osrmPointsUrl(base, points));
  } catch {
    return {
      ok: false,
      error: "OSRM did not answer. Start it on the Pi, then try the route again.",
    };
  }
  if (!response.ok) {
    return { ok: false, error: `OSRM returned HTTP ${response.status}.` };
  }
  try {
    return parseOsrmRoute(await response.json());
  } catch {
    return { ok: false, error: "OSRM returned a body this app could not read." };
  }
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 1000) {
    return `${Math.max(0, Math.round(meters))} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 60) {
    return `${Math.max(0, Math.round(seconds))} s`;
  }
  return `${Math.round(seconds / 60)} min`;
}

export function worldSize(zoom: number): number {
  return 256 * 2 ** zoom;
}

export function lonToWorldX(lon: number, zoom: number): number {
  return ((wrapLon(lon) + 180) / 360) * worldSize(zoom);
}

export function latToWorldY(lat: number, zoom: number): number {
  const radians = (clampLat(lat) * Math.PI) / 180;
  const sine = Math.sin(radians);
  return (
    (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * worldSize(zoom)
  );
}

export function worldXToLon(x: number, zoom: number): number {
  return wrapLon((x / worldSize(zoom)) * 360 - 180);
}

export function worldYToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / worldSize(zoom);
  return clampLat((180 / Math.PI) * Math.atan(Math.sinh(n)));
}

export function project(
  point: LonLat,
  view: MapView,
  width: number,
  height: number,
): { x: number; y: number } {
  const cx = lonToWorldX(view.center.lon, view.zoom);
  const cy = latToWorldY(view.center.lat, view.zoom);
  return {
    x: width / 2 + (lonToWorldX(point.lon, view.zoom) - cx),
    y: height / 2 + (latToWorldY(point.lat, view.zoom) - cy),
  };
}

export function unproject(
  x: number,
  y: number,
  view: MapView,
  width: number,
  height: number,
): LonLat {
  const cx = lonToWorldX(view.center.lon, view.zoom);
  const cy = latToWorldY(view.center.lat, view.zoom);
  return {
    lon: worldXToLon(cx + (x - width / 2), view.zoom),
    lat: worldYToLat(cy + (y - height / 2), view.zoom),
  };
}

export function panByPixels(
  view: MapView,
  dx: number,
  dy: number,
  width: number,
  height: number,
): MapView {
  const next = unproject(width / 2 - dx, height / 2 - dy, view, width, height);
  return { center: next, zoom: view.zoom };
}

export function zoomBy(view: MapView, delta: number): MapView {
  const zoom = Math.min(18, Math.max(2, Math.round(view.zoom + delta)));
  return { center: view.center, zoom };
}

export function fitView(
  points: LonLat[],
  width: number,
  height: number,
  padding = 32,
): MapView {
  if (points.length === 0 || width < 16 || height < 16) {
    return { center: { lon: 0, lat: 0 }, zoom: 2 };
  }
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  for (const point of points) {
    west = Math.min(west, point.lon);
    east = Math.max(east, point.lon);
    south = Math.min(south, point.lat);
    north = Math.max(north, point.lat);
  }
  const center = { lon: (west + east) / 2, lat: (south + north) / 2 };
  if (east - west < 1e-5 && north - south < 1e-5) {
    return { center, zoom: 14 };
  }
  for (let zoom = 16; zoom >= 2; zoom -= 1) {
    const view = { center, zoom };
    const topLeft = project({ lon: west, lat: north }, view, width, height);
    const bottomRight = project({ lon: east, lat: south }, view, width, height);
    const left = Math.min(topLeft.x, bottomRight.x);
    const right = Math.max(topLeft.x, bottomRight.x);
    const top = Math.min(topLeft.y, bottomRight.y);
    const bottom = Math.max(topLeft.y, bottomRight.y);
    if (
      left >= padding &&
      top >= padding &&
      right <= width - padding &&
      bottom <= height - padding
    ) {
      return view;
    }
  }
  return { center, zoom: 2 };
}

export function graticuleStep(zoom: number): number {
  if (zoom <= 3) return 30;
  if (zoom <= 5) return 10;
  if (zoom <= 8) return 5;
  if (zoom <= 11) return 1;
  return 0.25;
}

export type MapTile = {
  z: number;
  x: number;
  y: number;
  left: number;
  top: number;
};

export function tilesForView(
  view: MapView,
  width: number,
  height: number,
): MapTile[] {
  const z = view.zoom;
  const n = 2 ** z;
  const cx = lonToWorldX(view.center.lon, z);
  const cy = latToWorldY(view.center.lat, z);
  const leftWorld = cx - width / 2;
  const topWorld = cy - height / 2;
  const x0 = Math.floor(leftWorld / 256);
  const y0 = Math.floor(topWorld / 256);
  const x1 = Math.floor((cx + width / 2) / 256);
  const y1 = Math.floor((cy + height / 2) / 256);
  const tiles: MapTile[] = [];
  for (let x = x0; x <= x1; x += 1) {
    for (let y = y0; y <= y1; y += 1) {
      if (y < 0 || y >= n) continue;
      const wrapped = ((x % n) + n) % n;
      tiles.push({
        z,
        x: wrapped,
        y,
        left: x * 256 - leftWorld,
        top: y * 256 - topWorld,
      });
    }
  }
  return tiles;
}

export function tileUrl(
  template: string,
  tile: Pick<MapTile, "z" | "x" | "y">,
): string | null {
  const trimmed = template.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  if (
    !trimmed.includes("{z}") ||
    !trimmed.includes("{x}") ||
    !trimmed.includes("{y}")
  ) {
    return null;
  }
  return trimmed
    .split("{z}")
    .join(String(tile.z))
    .split("{x}")
    .join(String(tile.x))
    .split("{y}")
    .join(String(tile.y));
}
