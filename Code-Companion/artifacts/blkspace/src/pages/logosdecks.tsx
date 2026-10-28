import { useMemo } from "react";
import { Link, useSearch } from "wouter";
import { Disc3 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LogosDeckBoard } from "@/components/logos/LogosDeckBoard";

/**
 * LogosDecks showcase. A track and a book each take a deck.
 * A battle is two showcases. The flow score decides the set.
 */
export default function LogosDecksPage() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const battleId = params.get("battle");
  const mixId = params.get("mix");

  return (
    <AppShell wide>
      <div className="space-y-6 max-w-5xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Disc3 className="w-6 h-6 text-fuchsia-400" />
            <h1 className="text-2xl font-bold font-serif">LogosDecks</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            LogosDecks is the showcase for one member or a battle of many. A
            track streams a record, under Bermuda Boyz Records or that
            member&apos;s own name. A book streams a reading the same way:
            Bible, Quran, Buddhist, esoteric, or other truth media that member
            hosts. Two decks face each other. Each clean hit builds a combo and
            the flow meter. A full meter doubles the hit. The higher score when
            the set closes wins. Tradition does not change the score. The deck
            does not write the reading.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/audio" className="text-sm underline">
              Publish a set
            </Link>
            <Link href="/weixsound" className="text-sm underline">
              WeixSound
            </Link>
            <Link href="/arcade" className="text-sm underline">
              Battle lobby
            </Link>
          </div>
        </div>
        <LogosDeckBoard battleId={battleId} mixId={mixId} />
      </div>
    </AppShell>
  );
}
