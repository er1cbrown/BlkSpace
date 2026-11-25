/** Plain sentences for the offline deck. Search is local. OSRM still draws the line. */

import {
  fetchDeckRouteThrough,
  normalizeOsrmBase,
  type DeckRoute,
  type LonLat,
} from "@/lib/deck-map";

export const PLACES_KEY = "blkspace.deck-places";

export type SavedPlace = { name: string; point: LonLat };

export type QueryStop =
  | { kind: "here" }
  | { kind: "saved"; name: "home" }
  | { kind: "search"; query: string }
  | { kind: "place"; name: string; query: string };

export type ResolvedStop = { label: string; point: LonLat };

type FetchLike = (
  input: string,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const HERE = new Set(["here", "me", "start", "this device"]);
const GAS = new Set(["gas", "fuel", "petrol", "gas station"]);

export function placeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseRouteSentence(
  text: string,
): { stops: QueryStop[] } | { error: string } {
  let raw = text.trim().replace(/\s+/g, " ");
  if (!raw) return { error: "Enter a sentence such as gas then home." };
  const explicitFrom = /^from\s+/i.test(raw);
  raw = raw.replace(/^from\s+/i, "");
  const parts = raw
    .split(/\s+then\s+/i)
    .map((part) => part.replace(/^(to|via)\s+/i, "").trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { error: "Enter a sentence such as gas then home." };
  }
  const stops = parts.map(classifyStop);
  if (!explicitFrom && stops[0]?.kind !== "here") {
    stops.unshift({ kind: "here" });
  }
  if (stops.length < 2) {
    return { error: "Name two stops, such as gas then home." };
  }
  return { stops };
}

function classifyStop(part: string): QueryStop {
  const key = placeName(part);
  if (HERE.has(key)) return { kind: "here" };
  if (GAS.has(key)) return { kind: "search", query: "gas station" };
  if (key === "home") return { kind: "saved", name: "home" };
  return { kind: "place", name: key, query: part.trim() };
}

export function loadPlaces(storage: {
  getItem(key: string): string | null;
}): SavedPlace[] {
  try {
    const raw = storage.getItem(PLACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const places: SavedPlace[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const record = item as { name?: unknown; point?: { lat?: unknown; lon?: unknown } };
      const name = typeof record.name === "string" ? placeName(record.name) : "";
      const lat = Number(record.point?.lat);
      const lon = Number(record.point?.lon);
      if (!name) continue;
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) continue;
      if (!Number.isFinite(lon) || lon < -180 || lon > 180) continue;
      places.push({ name, point: { lat, lon } });
    }
    return places;
  } catch {
    return [];
  }
}

export function savePlace(
  places: readonly SavedPlace[],
  name: string,
  point: LonLat,
): SavedPlace[] {
  const key = placeName(name);
  if (!key) return [...places];
  const next = places.filter((place) => place.name !== key);
  next.push({ name: key, point });
  return next;
}

export function findPlace(
  places: readonly SavedPlace[],
  name: string,
): SavedPlace | null {
  const key = placeName(name);
  return places.find((place) => place.name === key) ?? null;
}

export function nominatimSearchUrl(
  base: string,
  query: string,
  near: LonLat | null,
): string | null {
  const root = normalizeOsrmBase(base);
  if (!root) return null;
  const url = new URL(`${root}/search`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);
  if (near) {
    url.searchParams.set("lat", near.lat.toFixed(6));
    url.searchParams.set("lon", near.lon.toFixed(6));
  }
  return url.toString();
}

export function parseNominatimHit(
  body: unknown,
  query: string,
): { ok: true; point: LonLat; label: string } | { ok: false; error: string } {
  if (!Array.isArray(body) || body.length === 0) {
    return { ok: false, error: `No local match for ${query}.` };
  }
  const hit = body[0];
  if (!hit || typeof hit !== "object") {
    return { ok: false, error: `No local match for ${query}.` };
  }
  const record = hit as { lat?: unknown; lon?: unknown; display_name?: unknown };
  const lat = Number(record.lat);
  const lon = Number(record.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, error: `No local match for ${query}.` };
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { ok: false, error: `No local match for ${query}.` };
  }
  const display =
    typeof record.display_name === "string" ? record.display_name.split(",")[0]?.trim() : "";
  return {
    ok: true,
    point: { lat, lon },
    label: display || query,
  };
}

async function searchLocal(
  base: string,
  query: string,
  near: LonLat | null,
  fetchImpl: FetchLike,
): Promise<{ ok: true; point: LonLat; label: string } | { ok: false; error: string }> {
  const url = nominatimSearchUrl(base, query, near);
  if (!url) {
    return {
      ok: false,
      error: "Local search address must start with http:// or https://.",
    };
  }
  try {
    const response = await fetchImpl(url);
    if (!response.ok) {
      return { ok: false, error: `Local search returned HTTP ${response.status}.` };
    }
    return parseNominatimHit(await response.json(), query);
  } catch {
    return {
      ok: false,
      error: "Local search did not answer. Start it on the Pi, then try the sentence again.",
    };
  }
}

export async function resolveRouteSentence(
  text: string,
  args: {
    here: LonLat | null;
    places: readonly SavedPlace[];
    geocoderBase: string;
    fetchImpl?: FetchLike;
  },
): Promise<{ ok: true; stops: ResolvedStop[] } | { ok: false; error: string }> {
  const parsed = parseRouteSentence(text);
  if ("error" in parsed) return parsed;
  for (const stop of parsed.stops) {
    if (stop.kind === "here" && !args.here) {
      return {
        ok: false,
        error: "Set a start, or use this device, before a sentence that begins here.",
      };
    }
    if (stop.kind === "saved" && !findPlace(args.places, stop.name)) {
      return { ok: false, error: "Save a home pin first." };
    }
  }
  const fetchImpl = args.fetchImpl ?? fetch;
  const stops: ResolvedStop[] = [];
  for (const stop of parsed.stops) {
    if (stop.kind === "here") {
      if (!args.here) {
        return {
          ok: false,
          error: "Set a start, or use this device, before a sentence that begins here.",
        };
      }
      stops.push({ label: "here", point: args.here });
      continue;
    }
    if (stop.kind === "saved") {
      const place = findPlace(args.places, stop.name);
      if (!place) return { ok: false, error: "Save a home pin first." };
      stops.push({ label: "home", point: place.point });
      continue;
    }
    if (stop.kind === "place") {
      const saved = findPlace(args.places, stop.name);
      if (saved) {
        stops.push({ label: saved.name, point: saved.point });
        continue;
      }
    }
    const near = args.here ?? stops[stops.length - 1]?.point ?? null;
    const found = await searchLocal(args.geocoderBase, stop.query, near, fetchImpl);
    if (!found.ok) return found;
    stops.push({ label: found.label, point: found.point });
  }
  return { ok: true, stops };
}

export async function routeSentence(
  text: string,
  args: {
    here: LonLat | null;
    places: readonly SavedPlace[];
    geocoderBase: string;
    osrmBase: string;
    fetchImpl?: FetchLike;
  },
): Promise<
  | { ok: true; stops: ResolvedStop[]; route: DeckRoute }
  | { ok: false; error: string; stops?: ResolvedStop[] }
> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const resolved = await resolveRouteSentence(text, args);
  if (!resolved.ok) return resolved;
  const routed = await fetchDeckRouteThrough(
    args.osrmBase,
    resolved.stops.map((stop) => stop.point),
    fetchImpl,
  );
  if (!routed.ok) return { ok: false, error: routed.error, stops: resolved.stops };
  return { ok: true, stops: resolved.stops, route: routed.route };
}
