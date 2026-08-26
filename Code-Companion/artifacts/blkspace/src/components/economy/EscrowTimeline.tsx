import { ESCROW_STATUS_LABEL, type EscrowEvent } from "@/lib/economic-types";
import { toCanonicalEscrowStatus } from "@/lib/economic-types";

export function EscrowTimeline({ events }: { events: EscrowEvent[] }) {
  if (!events.length) return null;
  return (
    <ol className="space-y-1 border-l border-border/60 pl-3">
      {events.map((ev, i) => {
        const canonical = toCanonicalEscrowStatus(ev.status);
        const label = ESCROW_STATUS_LABEL[canonical] || ev.status;
        return (
          <li key={`${ev.at}-${i}`} className="text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground">{label}</span>
            {" · "}
            {new Date(ev.at).toLocaleString()}
            {" · "}@{ev.by}
            {ev.note ? ` · ${ev.note}` : ""}
          </li>
        );
      })}
    </ol>
  );
}
