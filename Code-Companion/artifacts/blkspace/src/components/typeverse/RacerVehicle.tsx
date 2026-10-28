import { paintHex, type RacerVehicle } from "@/lib/typeverse-race";

/**
 * Side-view racer. Paint, body, and number are the student's own.
 */
export function RacerSprite({
  vehicle,
  progress,
  label,
}: {
  vehicle: RacerVehicle;
  progress: number;
  label?: string;
}) {
  const paint = paintHex(vehicle.paint);
  const accent = paintHex(vehicle.accent);
  const width =
    vehicle.body === "bus" ? "w-24" : vehicle.body === "lowrider" ? "w-20" : vehicle.body === "bike" ? "w-12" : "w-16";
  const height = vehicle.body === "bus" ? "h-10" : vehicle.body === "lowrider" ? "h-6" : "h-8";
  const left = `${Math.round(Math.max(0, Math.min(1, progress)) * 78)}%`;
  return (
    <div className="relative h-16">
      <div className="absolute inset-x-0 bottom-3 h-1 rounded-full bg-white/15" />
      <div className="absolute bottom-3" style={{ left }}>
        <div className={`${width} ${height} relative`} aria-hidden>
          {vehicle.body === "bike" ? (
            <div
              className="absolute bottom-2 left-1 right-1 h-1.5 rounded-full"
              style={{ background: paint }}
            />
          ) : (
            <div
              className={`absolute bottom-2 left-0 right-0 ${height} rounded-md`}
              style={{ background: paint }}
            >
              <div
                className="absolute top-0.5 h-3 rounded-sm"
                style={{
                  background: accent,
                  left: vehicle.body === "bus" ? "1.25rem" : "0.4rem",
                  width: vehicle.body === "bus" ? "2.5rem" : "1.1rem",
                }}
              />
              <span className="absolute bottom-0.5 right-1 font-mono text-[9px] text-black/80">
                {String(vehicle.number).padStart(2, "0")}
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-1 h-3 w-3 rounded-full border border-black/40 bg-neutral-900" />
          <div className="absolute bottom-0 right-1 h-3 w-3 rounded-full border border-black/40 bg-neutral-900" />
        </div>
        <p className="mt-0.5 max-w-24 truncate font-mono text-[10px] text-[#d1d0c5]">
          {label || vehicle.name}
        </p>
      </div>
    </div>
  );
}
