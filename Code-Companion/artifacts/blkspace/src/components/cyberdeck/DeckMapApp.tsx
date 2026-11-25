import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeckMapCanvas } from "@/components/cyberdeck/DeckMapCanvas";
import {
  fetchDeckRoute,
  formatCoord,
  formatDistance,
  formatDuration,
  loadMapDraft,
  MAP_DRAFT_KEY,
  readPair,
  type DeckRoute,
  type LonLat,
  type MapDraft,
} from "@/lib/deck-map";
import {
  findPlace,
  loadPlaces,
  PLACES_KEY,
  routeSentence,
  savePlace,
  type ResolvedStop,
  type SavedPlace,
} from "@/lib/deck-query";
import { fetchReceiverFix } from "@/lib/deck-gps";

function pairError(result: ReturnType<typeof readPair>, label: string): string | null {
  if (result && "error" in result) return `${label}: ${result.error}`;
  return null;
}

export function DeckMapApp() {
  const [draft, setDraft] = useState<MapDraft>(() => loadMapDraft(localStorage));
  const [places, setPlaces] = useState<SavedPlace[]>(() => loadPlaces(localStorage));
  const [sentence, setSentence] = useState("");
  const [pin, setPin] = useState<"from" | "to">("from");
  const [via, setVia] = useState<LonLat[]>([]);
  const [route, setRoute] = useState<DeckRoute | null>(null);
  const [status, setStatus] = useState("No route yet.");
  const [busy, setBusy] = useState(false);
  const [deviceNote, setDeviceNote] = useState("");
  const [following, setFollowing] = useState(false);
  const [receiverLive, setReceiverLive] = useState(false);

  useEffect(() => {
    localStorage.setItem(MAP_DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    localStorage.setItem(PLACES_KEY, JSON.stringify(places));
  }, [places]);

  useEffect(() => {
    if (!following) return;
    let stop = false;
    const pull = async () => {
      const result = await fetchReceiverFix(draft.receiverBase);
      if (stop) return;
      if (!result.ok) {
        setReceiverLive(false);
        setDeviceNote(result.error);
        return;
      }
      setReceiverLive(true);
      setDraft((current) => ({
        ...current,
        fromLat: formatCoord(result.point.lat),
        fromLon: formatCoord(result.point.lon),
      }));
      setDeviceNote("This fix is from the receiver.");
    };
    void pull();
    const timer = setInterval(() => void pull(), 2000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [following, draft.receiverBase]);

  const from = useMemo(
    () => readPair(draft.fromLat, draft.fromLon),
    [draft.fromLat, draft.fromLon],
  );
  const to = useMemo(
    () => readPair(draft.toLat, draft.toLon),
    [draft.toLat, draft.toLon],
  );
  const fromPoint = from && !("error" in from) ? from : null;
  const toPoint = to && !("error" in to) ? to : null;

  const setField = (key: keyof MapDraft, value: string) => {
    if (key === "fromLat" || key === "fromLon") setFollowing(false);
    setDraft((current) => ({ ...current, [key]: value }));
    setVia([]);
    setRoute(null);
    setStatus("No route yet.");
  };

  const writePoint = (which: "from" | "to", point: LonLat) => {
    const latKey = which === "from" ? "fromLat" : "toLat";
    const lonKey = which === "from" ? "fromLon" : "toLon";
    if (which === "from") setFollowing(false);
    setDraft((current) => ({
      ...current,
      [latKey]: formatCoord(point.lat),
      [lonKey]: formatCoord(point.lon),
    }));
    setVia([]);
    setRoute(null);
    setStatus("No route yet.");
    setDeviceNote("");
  };

  const applyStops = (stops: ResolvedStop[]) => {
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!first || !last) return;
    setDraft((current) => ({
      ...current,
      fromLat: formatCoord(first.point.lat),
      fromLon: formatCoord(first.point.lon),
      toLat: formatCoord(last.point.lat),
      toLon: formatCoord(last.point.lon),
    }));
    setVia(stops.slice(1, -1).map((stop) => stop.point));
    setDeviceNote("");
  };

  const askRoute = async () => {
    const fromProblem = pairError(from, "Start");
    const toProblem = pairError(to, "End");
    if (fromProblem || toProblem || !fromPoint || !toPoint) {
      setStatus(fromProblem || toProblem || "Enter a start and an end.");
      setRoute(null);
      return;
    }
    setBusy(true);
    setVia([]);
    setStatus("Asking OSRM.");
    const result = await fetchDeckRoute(draft.osrmBase, fromPoint, toPoint);
    setBusy(false);
    if (!result.ok) {
      setRoute(null);
      setStatus(result.error);
      return;
    }
    setRoute(result.route);
    setStatus(
      `${formatDistance(result.route.distanceM)} · ${formatDuration(result.route.durationS)}`,
    );
  };

  const askSentence = async () => {
    setBusy(true);
    setStatus("Searching locally.");
    const result = await routeSentence(sentence, {
      here: fromPoint,
      places,
      geocoderBase: draft.geocoderBase,
      osrmBase: draft.osrmBase,
    });
    setBusy(false);
    if (!result.ok) {
      if (result.stops) applyStops(result.stops);
      else setVia([]);
      setRoute(null);
      setStatus(result.error);
      return;
    }
    applyStops(result.stops);
    setRoute(result.route);
    const labels = result.stops.map((stop) => stop.label).join(" → ");
    setStatus(
      `${labels} · ${formatDistance(result.route.distanceM)} · ${formatDuration(result.route.durationS)}`,
    );
  };

  const saveHome = () => {
    if (!toPoint) {
      setStatus("Set an end pin, then save it as home.");
      return;
    }
    setPlaces((current) => savePlace(current, "home", toPoint));
    setStatus("Home is saved.");
  };

  const useDevice = () => {
    if (!navigator.geolocation) {
      setDeviceNote("This device did not share a location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        writePoint("from", {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setPin("to");
        setDeviceNote(
          "This fix is from this device, not the car receiver.",
        );
      },
      () => setDeviceNote("This device did not share a location."),
    );
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[320px_1fr]">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void askRoute();
        }}
      >
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Offline deck
          </p>
          <h1 className="text-3xl font-black tracking-tight">Maps</h1>
          <p className="text-sm text-muted-foreground">
            Type a sentence such as gas then home. Home is a pin you save. Gas
            is the nearest match from local search on the Pi. OSRM draws the
            line. Follow the receiver to keep the start pin on gpsd. Reticulum
            does not carry the route.
          </p>
          <Badge variant="outline">
            {receiverLive
              ? "Receiver fix"
              : following
                ? "Waiting for the receiver"
                : "Car receiver not connected"}
          </Badge>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            Start latitude
            <Input
              id="deck-from-lat"
              value={draft.fromLat}
              onChange={(event) => setField("fromLat", event.target.value)}
              inputMode="decimal"
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            Start longitude
            <Input
              id="deck-from-lon"
              value={draft.fromLon}
              onChange={(event) => setField("fromLon", event.target.value)}
              inputMode="decimal"
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            End latitude
            <Input
              id="deck-to-lat"
              value={draft.toLat}
              onChange={(event) => setField("toLat", event.target.value)}
              inputMode="decimal"
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            End longitude
            <Input
              id="deck-to-lon"
              value={draft.toLon}
              onChange={(event) => setField("toLon", event.target.value)}
              inputMode="decimal"
            />
          </label>
        </div>

        <label className="block space-y-1 text-xs text-muted-foreground">
          Sentence
          <Input
            id="deck-sentence"
            value={sentence}
            placeholder="gas then home"
            onChange={(event) => setSentence(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void askSentence();
            }}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {findPlace(places, "home") ? "Home is saved." : "Home is not saved."}
        </p>
        <label className="block space-y-1 text-xs text-muted-foreground">
          Local search
          <Input
            id="deck-geocoder"
            value={draft.geocoderBase}
            onChange={(event) => setField("geocoderBase", event.target.value)}
            spellCheck={false}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          On the Pi: bun run extract:deck map.osm, then bun run search:fix with POI_FILE=pois.json.
        </p>
        <label className="block space-y-1 text-xs text-muted-foreground">
          Receiver
          <Input
            id="deck-receiver"
            value={draft.receiverBase}
            onChange={(event) => setField("receiverBase", event.target.value)}
            spellCheck={false}
          />
        </label>
        <label className="block space-y-1 text-xs text-muted-foreground">
          OSRM
          <Input
            id="deck-osrm"
            value={draft.osrmBase}
            onChange={(event) => setField("osrmBase", event.target.value)}
            spellCheck={false}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          On the Pi: bun run extract:deck map.osm, then bun run osrm:fix with ROADS_FILE=roads.json.
        </p>
        <label className="block space-y-1 text-xs text-muted-foreground">
          Tile template
          <Input
            id="deck-tiles"
            value={draft.tileTemplate}
            placeholder="http://127.0.0.1:8080/tiles/{z}/{x}/{y}.png"
            onChange={(event) => setField("tileTemplate", event.target.value)}
            spellCheck={false}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={pin === "from" ? "default" : "outline"}
            aria-pressed={pin === "from"}
            onClick={() => setPin("from")}
          >
            Map click sets start
          </Button>
          <Button
            type="button"
            variant={pin === "to" ? "default" : "outline"}
            aria-pressed={pin === "to"}
            onClick={() => setPin("to")}
          >
            Map click sets end
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={useDevice}>
            Use this device
          </Button>
          <Button
            type="button"
            variant={following ? "default" : "outline"}
            aria-pressed={following}
            onClick={() => setFollowing((on) => !on)}
          >
            {following ? "Stop following" : "Follow the receiver"}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Asking OSRM" : "Get route"}
          </Button>
          <Button type="button" disabled={busy} onClick={() => void askSentence()}>
            Route sentence
          </Button>
          <Button type="button" variant="outline" onClick={saveHome}>
            Save end as home
          </Button>
        </div>
        <p role="status" className="text-sm">
          {status}
        </p>
        {deviceNote ? (
          <p className="text-sm text-muted-foreground">{deviceNote}</p>
        ) : null}
        {route && route.steps.length > 0 ? (
          <ol aria-label="Turns" className="max-h-64 space-y-2 overflow-auto text-sm">
            {route.steps.map((step, index) => (
              <li key={`${step.instruction}-${index}`} className="flex justify-between gap-3">
                <span>{step.instruction}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatDistance(step.distanceM)}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        <p className="text-sm text-muted-foreground">
          <Link href="/cyberdeck" className="text-primary underline-offset-4 hover:underline">
            Back to the offline deck
          </Link>
        </p>
      </form>

      <div className="relative h-[70vh] min-h-[420px] overflow-hidden rounded-xl border bg-muted/40">
        <DeckMapCanvas
          from={fromPoint}
          to={toPoint}
          via={via}
          line={route?.line ?? []}
          tileTemplate={draft.tileTemplate}
          onPick={(point) => writePoint(pin, point)}
        />
      </div>
    </div>
  );
}
