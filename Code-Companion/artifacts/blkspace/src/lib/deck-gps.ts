/** Read a gpsd TPV, or the local bridge that serves one, as a start pin. */

import { normalizeOsrmBase, type LonLat } from "@/lib/deck-map";

export type ReceiverFix =
  | { ok: true; point: LonLat }
  | { ok: false; error: string };

type FetchLike = (
  input: string,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export function parseReceiverFix(body: unknown): ReceiverFix {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Receiver returned a body this app could not read." };
  }
  const record = body as {
    class?: unknown;
    mode?: unknown;
    lat?: unknown;
    lon?: unknown;
  };
  if (record.class !== undefined && record.class !== "TPV") {
    return { ok: false, error: "Receiver has no fix yet." };
  }
  if (record.mode !== undefined) {
    const mode = Number(record.mode);
    if (!Number.isFinite(mode) || mode < 2) {
      return { ok: false, error: "Receiver has no fix yet." };
    }
  }
  const lat = Number(record.lat);
  const lon = Number(record.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, error: "Receiver has no fix yet." };
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { ok: false, error: "Receiver has no fix yet." };
  }
  return { ok: true, point: { lat, lon } };
}

export async function fetchReceiverFix(
  url: string,
  fetchImpl: FetchLike = fetch,
): Promise<ReceiverFix> {
  const endpoint = normalizeOsrmBase(url);
  if (!endpoint) {
    return {
      ok: false,
      error: "Receiver address must start with http:// or https://.",
    };
  }
  try {
    const response = await fetchImpl(endpoint);
    if (!response.ok) {
      return { ok: false, error: `Receiver returned HTTP ${response.status}.` };
    }
    return parseReceiverFix(await response.json());
  } catch {
    return {
      ok: false,
      error: "Receiver did not answer. Run the gpsd bridge on the Pi, then follow again.",
    };
  }
}
