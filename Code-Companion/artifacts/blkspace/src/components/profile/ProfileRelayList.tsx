import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTauriFetchUserRelayList } from "@/hooks/use-app-data";
import { isTauri } from "@/lib/tauri-api";
import { Wifi } from "lucide-react";
import { Link } from "wouter";

const RELAY_PREVIEW_LIMIT = 6;

interface ProfileRelayListProps {
  pubkey: string;
  isOwnProfile: boolean;
  displayName: string;
}

export function ProfileRelayList({
  pubkey,
  isOwnProfile,
  displayName,
}: ProfileRelayListProps) {
  const [expanded, setExpanded] = useState(false);
  const {
    data: relays,
    isLoading,
    isFetching,
    refetch,
    isError,
    error,
  } = useTauriFetchUserRelayList(pubkey);

  if (!isTauri() || pubkey.length !== 64) {
    return null;
  }

  const relayList = relays ?? [];
  const hasMore = relayList.length > RELAY_PREVIEW_LIMIT;
  const visibleRelays = expanded
    ? relayList
    : relayList.slice(0, RELAY_PREVIEW_LIMIT);

  return (
    <div className="mb-6 rounded-xl border border-primary/15 bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            {isOwnProfile ? "Your relays" : `${displayName}'s relays`} (NIP-65)
          </h3>
          {relayList.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {relayList.length} relay{relayList.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Loading…" : "Refresh from network"}
          </Button>
          {isOwnProfile && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/relays">Manage</Link>
            </Button>
          )}
        </div>
      </div>

      {!isOwnProfile && (
        <p className="text-[11px] text-muted-foreground mb-2 font-mono">
          pubkey {pubkey.slice(0, 8)}…{pubkey.slice(-8)}
        </p>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load relays"}
        </p>
      )}

      {isLoading && relayList.length === 0 && (
        <p className="text-sm text-muted-foreground">Loading relay list…</p>
      )}

      {relayList.length > 0 ? (
        <>
          <ul className="space-y-1.5 font-mono text-xs max-h-48 overflow-y-auto pr-1">
            {visibleRelays.map((url) => (
              <li
                key={url}
                className="break-all rounded-md bg-background/60 px-2 py-1 border"
              >
                {url}
              </li>
            ))}
          </ul>
          {hasMore && (
            <Button
              variant="link"
              size="sm"
              className="mt-2 h-auto p-0 text-xs"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? "Show fewer"
                : `Show all ${relayList.length} relays`}
            </Button>
          )}
        </>
      ) : (
        !isLoading &&
        !isFetching && (
          <p className="text-sm text-muted-foreground">
            {isOwnProfile
              ? "No relay list found — connect on the Relays page and publish NIP-65."
              : "No public relay list found for this user on connected relays."}
          </p>
        )
      )}
    </div>
  );
}