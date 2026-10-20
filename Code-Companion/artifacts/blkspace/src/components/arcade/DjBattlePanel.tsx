import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Headphones, Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MixtapePlayer } from "@/components/media/MixtapePlayer";
import { getMixtape, listMixtapes, syncMixtapes } from "@/lib/audio-mixtapes";
import { useGuestMode } from "@/lib/guest-mode";
import {
  battleCallUrl,
  hostBattle,
  listBattles,
  syncBattles,
} from "@/lib/yard-dj-battles";

const KIND_LABEL = {
  songs: "Song mix",
  verses: "Verse mix",
  logos: "Logos Deck",
} as const;

/**
 * Host a lobby around a mix that is already on the hub.
 * Join opens the call. The mix plays from files or links the publisher owns.
 */
export function DjBattlePanel({ yardId }: { yardId: string }) {
  const { isGuest } = useGuestMode();
  const [tick, setTick] = useState(0);
  const [title, setTitle] = useState("");
  const [mixId, setMixId] = useState("");
  const [callUrl, setCallUrl] = useState("");

  useEffect(() => {
    let cancel = false;
    void Promise.all([syncMixtapes(), syncBattles(yardId)]).then(() => {
      if (!cancel) setTick((n) => n + 1);
    });
    return () => {
      cancel = true;
    };
  }, [yardId]);

  const mixes = useMemo(() => {
    void tick;
    return listMixtapes().filter(
      (mix) => yardId === "all" || mix.yardId === yardId,
    );
  }, [tick, yardId]);
  const battles = useMemo(() => {
    void tick;
    return listBattles(yardId);
  }, [tick, yardId]);

  const host = () => {
    if (isGuest) {
      toast("Create a free account to host a battle");
      return;
    }
    const mixtape = mixes.find((mix) => mix.id === mixId) || mixes[0];
    if (!mixtape) {
      toast.error("Publish a mix on Audio first.");
      return;
    }
    try {
      hostBattle({
        title: title.trim() || `${mixtape.title} battle`,
        mixtape,
        callUrl,
      });
      setTitle("");
      setCallUrl("");
      setTick((n) => n + 1);
      void syncBattles(yardId).then(() => setTick((n) => n + 1));
      toast.success("Lobby is open. Join the call and play the mix.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not open the lobby",
      );
    }
  };

  return (
    <Card className="border-fuchsia-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Radio className="w-4 h-4 text-fuchsia-400" />
          DJ battle
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Host a lobby for a song mix, a verse mix, or a Logos Deck. The call is
          Jitsi, or a Discord or Slack link you paste. People in the lobby play
          the same published set. BlkSpace does not run the voice server.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="Battle name"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Battle name"
          />
          <select
            aria-label="Mix to battle"
            value={mixId}
            onChange={(event) => setMixId(event.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">
              {mixes.length
                ? "Pick a published mix"
                : "No mixes on this yard yet"}
            </option>
            {mixes.map((mix) => (
              <option key={mix.id} value={mix.id}>
                {KIND_LABEL[mix.setKind]} — {mix.title}
              </option>
            ))}
          </select>
        </div>
        <Input
          placeholder="Optional Discord or Slack link"
          value={callUrl}
          onChange={(event) => setCallUrl(event.target.value)}
          aria-label="Call link"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={host}>
            Host lobby
          </Button>
          <Link href="/audio">
            <Button size="sm" variant="outline" className="gap-1">
              <Headphones className="w-3.5 h-3.5" />
              Publish a mix
            </Button>
          </Link>
        </div>
        <div className="space-y-3">
          {battles.map((battle) => {
            const mix = getMixtape(battle.mixId);
            return (
              <div key={battle.id} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{battle.title}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {KIND_LABEL[battle.setKind]} · @{battle.hostHandle}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {battle.mixTitle}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={battleCallUrl(battle)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" variant="outline">
                      Join call
                    </Button>
                  </a>
                </div>
                {mix ? <MixtapePlayer mixtape={mix} compact /> : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
