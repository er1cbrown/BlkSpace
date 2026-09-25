import { AlertTriangle } from "lucide-react";

/** Shown near yard/DM-style inputs — direct messaging is experimental and local. */
export function ExperimentalMessagingWarning({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex gap-2 items-start text-[11px] text-amber-200/90 bg-amber-950/20 border border-amber-600/25 rounded-lg px-3 py-2 ${className}`}
      role="note"
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
      <p>
        <strong className="font-semibold">Experimental messaging.</strong> Direct
        messages are currently handle-based and stored locally; they are not
        NIP-44 encrypted. Do not use them for sensitive content. Yard channel
        posts are public to relay subscribers.
      </p>
    </div>
  );
}
