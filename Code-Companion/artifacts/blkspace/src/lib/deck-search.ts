/** Local place search. The Maps page calls this the same way it calls Nominatim. */

export type Poi = {
  name: string;
  lat: number;
  lon: number;
  kind: string;
};

export type PoiHit = {
  name: string;
  lat: number;
  lon: number;
};

const FUEL = new Set(["gas", "fuel", "petrol", "gas station"]);

export function metersBetween(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const radius = 6_371_000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function poisFromJson(body: unknown): Poi[] {
  if (!Array.isArray(body)) return [];
  const pois: Poi[] = [];
  for (const item of body) {
    if (!item || typeof item !== "object") continue;
    const record = item as {
      name?: unknown;
      lat?: unknown;
      lon?: unknown;
      kind?: unknown;
    };
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const lat = Number(record.lat);
    const lon = Number(record.lon);
    const kind = typeof record.kind === "string" ? record.kind.trim().toLowerCase() : "place";
    if (!name) continue;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) continue;
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) continue;
    pois.push({ name, lat, lon, kind });
  }
  return pois;
}

function isFuel(kind: string): boolean {
  return kind === "fuel" || kind === "gas" || kind === "gas station";
}

export function searchPois(
  pois: readonly Poi[],
  query: { q: string; near: { lat: number; lon: number } | null; limit: number },
): PoiHit[] {
  const q = query.q.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return [];
  const limit = Math.min(10, Math.max(1, query.limit || 1));
  const pool = FUEL.has(q)
    ? pois.filter((poi) => isFuel(poi.kind))
    : pois.filter((poi) => poi.name.toLowerCase().includes(q));
  const ranked = [...pool].sort((a, b) => {
    if (!query.near) return a.name.localeCompare(b.name);
    return metersBetween(query.near, a) - metersBetween(query.near, b);
  });
  return ranked.slice(0, limit).map((poi) => ({
    name: poi.name,
    lat: poi.lat,
    lon: poi.lon,
  }));
}
