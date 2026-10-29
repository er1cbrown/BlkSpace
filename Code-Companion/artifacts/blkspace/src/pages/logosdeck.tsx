import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isTauri, tauriReadScripture } from "@/lib/tauri-api";
import { Layers, Play, Pause, Plus, Trash2 } from "lucide-react";

type DeckItem = { ref: string; text: string };

const STORAGE_KEY = "blkspace.logosdeck.v1";

export default function LogosDeckPage() {
  const [ref, setRef] = useState("John 3:16");
  const [deck, setDeck] = useState<DeckItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
    } catch {
      /* ignore */
    }
  }, [deck]);

  useEffect(() => {
    if (!playing || deck.length === 0) return;
    const id = window.setInterval(() => {
      setCursor((c) => (c + 1) % deck.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [playing, deck.length]);

  const addVerse = async () => {
    setLoading(true);
    setError("");
    try {
      let text = "";
      if (isTauri()) {
        const out = await tauriReadScripture(ref, "KJV", "auto", false, false);
        try {
          const json = JSON.parse(out);
          text =
            json?.sword?.KJV ||
            json?.sword?.KJV?.text ||
            JSON.stringify(json?.sword || {});
        } catch {
          text = out;
        }
      } else {
        const res = await fetch(
          `https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`,
        );
        const body = await res.json();
        text = body?.text || JSON.stringify(body);
      }
      setDeck((d) => [...d, { ref, text: String(text).trim() }]);
      setRef("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const remove = (i: number) =>
    setDeck((d) => d.filter((_, idx) => idx !== i));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Layers className="h-6 w-6" /> LogosDeck — Scripture upon Scripture
        </h1>
        <p className="text-sm text-muted-foreground">
          Build a deck line by line. Music crossover comes later.
        </p>
        <div className="flex gap-2">
          <Input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="John 3:16"
          />
          <Button onClick={addVerse} disabled={loading || !ref.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            {loading ? "Adding..." : "Add"}
          </Button>
        </div>
        {error && <pre className="text-red-500 whitespace-pre-wrap">{error}</pre>}
        <div className="flex gap-2">
          <Button onClick={() => setPlaying((p) => !p)} disabled={deck.length === 0}>
            {playing ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {playing ? "Pause" : "Play Deck"}
          </Button>
          <Button variant="outline" onClick={() => { setDeck([]); setCursor(0); setPlaying(false); }} disabled={deck.length === 0}>
            Clear
          </Button>
        </div>
        {playing && deck.length > 0 && (
          <div className="border-2 border-primary rounded p-4">
            <div className="text-xs text-muted-foreground mb-1">
              Now: {cursor + 1} / {deck.length}
            </div>
            <div className="font-semibold text-sm">{deck[cursor].ref}</div>
            <div className="text-sm whitespace-pre-wrap">{deck[cursor].text}</div>
          </div>
        )}
        <div className="space-y-3">
          {deck.map((item, i) => (
            <div
              key={i}
              className="border rounded p-3 flex gap-3 items-start"
            >
              <span className="font-mono text-xs text-muted-foreground mt-1">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="font-semibold text-sm">{item.ref}</div>
                <div className="text-sm whitespace-pre-wrap">{item.text}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {deck.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No verses yet. Add one above.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
