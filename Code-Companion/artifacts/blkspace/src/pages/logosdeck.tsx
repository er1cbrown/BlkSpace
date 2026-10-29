import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isTauri, tauriReadScripture } from "@/lib/tauri-api";
import { Layers, Play, Pause, Plus, Trash2, ArrowUp, ArrowDown, Download } from "lucide-react";

type DeckItem = { ref: string; text: string; note?: string };

const COMFORT_VERSES = [
  "Psalm 23:1",
  "Matthew 11:28",
  "John 14:27",
  "Philippians 4:7",
  "Isaiah 41:10",
];

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
  const [audioUrl, setAudioUrl] = useState("");
  const [reflection, setReflection] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [savedDecks, setSavedDecks] = useState<Record<string, DeckItem[]>>(() => {
    try {
      const raw = localStorage.getItem("blkspace.logosdecks.saved.v1");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
    } catch {
      /* ignore */
    }
  }, [deck]);

  useEffect(() => {
    try {
      localStorage.setItem("blkspace.logosdecks.saved.v1", JSON.stringify(savedDecks));
    } catch {
      /* ignore */
    }
  }, [savedDecks]);

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


  const saveNamed = () => {
    const name = deckName.trim();
    if (!name || deck.length === 0) return;
    setSavedDecks((d) => ({ ...d, [name]: deck }));
    setDeckName("");
  };

  const loadNamed = (name: string) => {
    const d = savedDecks[name];
    if (d) {
      setDeck(d);
      setCursor(0);
      setPlaying(false);
    }
  };

  const deleteNamed = (name: string) => {
    setSavedDecks((d) => {
      const next = { ...d };
      delete next[name];
      return next;
    });
  };


  const remove = (i: number) =>
    setDeck((d) => d.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setDeck((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const exportDeck = () => {
    const text = deck.map((item, i) => `${i + 1}. ${item.ref}\n${item.text}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "logosdeck.txt";
    a.click();
    URL.revokeObjectURL(url);
  };


  const loadComfortDeck = async () => {
    setLoading(true);
    setError("");
    const items: DeckItem[] = [];
    for (const r of COMFORT_VERSES) {
      try {
        let text = "";
        if (isTauri()) {
          const out = await tauriReadScripture(r, "KJV", "auto", false, false);
          try {
            const json = JSON.parse(out);
            text = json?.sword?.KJV || JSON.stringify(json?.sword || {});
          } catch {
            text = out;
          }
        } else {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(r)}?translation=kjv`);
          const body = await res.json();
          text = body?.text || JSON.stringify(body);
        }
        items.push({ ref: r, text: String(text).trim(), note: "Comfort" });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    setDeck(items);
    setCursor(0);
    setPlaying(false);
    setLoading(false);
  };

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
          <Button variant="outline" onClick={exportDeck} disabled={deck.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button variant="outline" onClick={loadComfortDeck} disabled={loading}>
            Comfort Deck
          </Button>
          <Button variant="outline" onClick={() => setReflection((r) => !r)} disabled={deck.length === 0}>
            {reflection ? "Exit Reflection" : "Reflection Mode"}
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
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm font-semibold">Saved decks</div>
          <div className="flex gap-2">
            <Input
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Deck name"
            />
            <Button onClick={saveNamed} disabled={!deckName.trim() || deck.length === 0}>
              Save
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(savedDecks).map((name) => (
              <div key={name} className="flex items-center gap-1 border rounded px-2 py-1">
                <button className="text-sm" onClick={() => loadNamed(name)}>
                  {name}
                </button>
                <button
                  className="text-xs text-muted-foreground"
                  onClick={() => deleteNamed(name)}
                  aria-label={`Delete ${name}`}
                >
                  ×
                </button>
              </div>
            ))}
            {Object.keys(savedDecks).length === 0 && (
              <span className="text-xs text-muted-foreground">No saved decks yet.</span>
            )}
          </div>
        </div>
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm font-semibold">Beat / music (crossover)</div>
          <Input
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            placeholder="Audio URL (mp3/wav)"
          />
          {audioUrl && <audio controls src={audioUrl} className="w-full" />}
        </div>
        {reflection && deck.length > 0 && (
          <div className="border-2 border-primary rounded p-6 text-center space-y-3">
            <div className="text-xs text-muted-foreground">
              {cursor + 1} / {deck.length}
            </div>
            <div className="text-xl font-semibold">{deck[cursor].ref}</div>
            <div className="text-base whitespace-pre-wrap">{deck[cursor].text}</div>
            {deck[cursor].note && (
              <div className="text-sm text-muted-foreground">{deck[cursor].note}</div>
            )}
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
                <input
                  className="mt-1 w-full text-xs border rounded px-2 py-1 bg-transparent"
                  placeholder="Lyric/hymn note (bridge to music)"
                  value={item.note || ""}
                  onChange={(e) =>
                    setDeck((d) =>
                      d.map((x, idx) =>
                        idx === i ? { ...x, note: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === deck.length - 1}>
                <ArrowDown className="h-4 w-4" />
              </Button>
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
