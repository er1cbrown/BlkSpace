/** Winter intro for the Mazda 2 offline deck. Copy only — no GPS, no route call. */

export const DECK_INTRO = {
  title: "Offline deck",
  kicker: "Mazda 2 · winter build",
  lede: "A car unit that still gives a route when the radio is off. The Pi keeps the receiver, the map tiles, and OSRM. BlkSpace draws the map after that Pi answers on the local network.",
  status: "Receiver not connected",
  statusDetail:
    "This screen does not read a GPS fix and does not request a route.",
  hardware: "$230–$420",
  extras: "$0–$200",
  hours: "40–120 hours",
} as const;

export type DeckLayerId = "offline" | "local" | "mesh" | "cloud";

export type DeckLayer = {
  id: DeckLayerId;
  name: string;
  tech: string;
  role: string;
  required: boolean;
};

export const DECK_LAYERS: readonly DeckLayer[] = [
  {
    id: "offline",
    name: "Offline core",
    tech: "gpsd, MapLibre, OSRM",
    role: "Turn-by-turn that never needs a radio.",
    required: true,
  },
  {
    id: "local",
    name: "Local link",
    tech: "UDP and TCP on the car network",
    role: "Live position and the route line between the Pi and this app.",
    required: true,
  },
  {
    id: "mesh",
    name: "Mesh",
    tech: "Reticulum text notes",
    role: "A short encrypted note when the yard link is down. The route stays on the local link.",
    required: false,
  },
  {
    id: "cloud",
    name: "Cloud",
    tech: "Starlink or HTTPS",
    role: "A fresher map extract. The deck still routes with this layer off.",
    required: false,
  },
];

export type DeckPhaseId = "bench" | "route" | "panel" | "query";

export type DeckPhase = {
  id: DeckPhaseId;
  title: string;
  hours: string;
  doneWhen: string;
  status: "next" | "later";
};

export const DECK_PHASES: readonly DeckPhase[] = [
  {
    id: "bench",
    title: "Bench the receiver",
    hours: "8–16",
    doneWhen: "gpsd prints a live latitude and longitude on the bench.",
    status: "next",
  },
  {
    id: "route",
    title: "Offline routing on the Pi",
    hours: "12–24",
    doneWhen: "A local OSRM query returns a driving route with the radio off.",
    status: "later",
  },
  {
    id: "panel",
    title: "Map panel in BlkSpace",
    hours: "16–40",
    doneWhen: "This app draws the Pi position and the route line.",
    status: "later",
  },
  {
    id: "query",
    title: "Plain query box",
    hours: "8–16",
    doneWhen: "One sentence, such as gas then home, becomes an OSRM route.",
    status: "later",
  },
];

export function nextDeckPhase(): DeckPhase {
  const next = DECK_PHASES.find((phase) => phase.status === "next");
  if (!next) throw new Error("offline deck has no next phase");
  return next;
}

export function deckLayerOrder(): DeckLayerId[] {
  return DECK_LAYERS.map((layer) => layer.id);
}
