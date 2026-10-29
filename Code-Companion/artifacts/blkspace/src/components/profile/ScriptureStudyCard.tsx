import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BOOK_TRADITIONS } from "@/lib/logos-deck-mix";
import { LOGOS_DECK_DEMO_CRATE } from "@/lib/logos-deck-library";
import {
  noteOverlap,
  readScriptureNote,
  SCRIPTURE_TAGS,
  studyPassage,
  writeScriptureNote,
  type ShelfStudy,
} from "@/lib/scripture-study";

const SWORD_MODULES = ["KJV", "GNT", "RVG", "SpaRV"] as const;

function traditionFields(value: string): { tradition: string; custom: string } {
  if ((BOOK_TRADITIONS as readonly string[]).includes(value)) {
    return { tradition: value, custom: "" };
  }
  return { tradition: "Other", custom: value };
}

export function ScriptureStudyCard({
  handle,
  readOnly = false,
}: {
  handle: string;
  readOnly?: boolean;
}) {
  const [passage, setPassage] = useState("John 3:16");
  const [tradition, setTradition] = useState("Bible");
  const [custom, setCustom] = useState("");
  const [hosted, setHosted] = useState("");
  const [study, setStudy] = useState<ShelfStudy>(() =>
    studyPassage("John 3:16"),
  );
  const [swordModule, setSwordModule] =
    useState<(typeof SWORD_MODULES)[number]>("KJV");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (readOnly) return;
    const note = readScriptureNote(handle);
    if (!note) return;
    const fields = traditionFields(note.tradition);
    setPassage(note.passage);
    setTradition(fields.tradition);
    setCustom(fields.custom);
    setHosted(note.text);
    setStudy(studyPassage(note.passage));
  }, [handle, readOnly]);

  const openShelf = (reference: string) => {
    const next = studyPassage(reference);
    setPassage(next.reference || reference);
    setStudy(next);
    setNotice("");
  };

  const label = tradition === "Other" ? custom : tradition;
  const overlap = noteOverlap(label, hosted, study);

  const readSword = async () => {
    const ref = passage.trim();
    if (!ref) {
      setNotice("Name the verse, like John 3:16.");
      return;
    }
    const params = new URLSearchParams({ module: swordModule, ref });
    try {
      const res = await fetch(`/api/logos/sword?${params}`);
      const body = await res.json().catch(() => null);
      const verse = body?.verses?.find((row: { text?: string }) =>
        row?.text?.trim(),
      );
      if (!res.ok || !body?.ok || !verse?.text) {
        setNotice(body?.error || "SWORD library is not on this host.");
        return;
      }
      setHosted(String(verse.text).slice(0, 4000));
      if (verse.reference) setPassage(String(verse.reference));
      setNotice("Filled from the SWORD library on this host.");
    } catch {
      setNotice("SWORD library is not on this host.");
    }
  };

  const keep = () => {
    const saved = writeScriptureNote(handle, {
      passage: study.reference || passage,
      tradition: label,
      text: hosted,
    });
    setNotice(
      saved.passage ? "Kept on this browser." : "Name a passage first.",
    );
  };

  return (
    <Card className="mb-6 border-dashed border-primary/30">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center gap-2 font-medium text-sm">
          <BookOpen className="w-4 h-4 text-primary" />
          Scripture study
        </div>
        <p className="text-xs text-muted-foreground">
          Opt-in. The shelf holds six verses. Shared words are the overlap
          between those lines. A reading you host stays on this card, off the
          feed, off the MIDF score, and off WeixBucks.
        </p>
        <div className="flex flex-wrap gap-2">
          {SCRIPTURE_TAGS.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Passage"
            value={passage}
            disabled={readOnly}
            placeholder="John 3:16"
            className="h-8 min-w-40 flex-1 rounded-md border bg-background px-2 text-sm"
            onChange={(event) => setPassage(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openShelf(passage)}
          >
            Open on the shelf
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {LOGOS_DECK_DEMO_CRATE.map((row) => (
            <Button
              key={row.id}
              type="button"
              size="sm"
              variant={
                study.reference === row.reference ? "secondary" : "ghost"
              }
              className="h-7 px-2 text-xs"
              onClick={() => openShelf(row.reference)}
            >
              {row.reference}
            </Button>
          ))}
        </div>

        <p className="text-sm">{study.text}</p>
        {study.onShelf && study.links.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Cross-refs on this shelf
            </p>
            {study.links.map((link) => (
              <div
                key={link.reference}
                className="rounded-md border px-2 py-1.5"
              >
                <button
                  type="button"
                  className="text-sm font-medium text-primary"
                  onClick={() => openShelf(link.reference)}
                >
                  {link.reference}
                </button>
                <p className="text-xs text-muted-foreground">{link.text}</p>
                <p className="text-[11px] text-muted-foreground">
                  {link.shared.length > 0
                    ? `Shared words: ${link.shared.join(", ")}`
                    : "No shared words on this shelf."}
                </p>
              </div>
            ))}
          </div>
        )}
        {!study.onShelf && (
          <p className="text-[11px] text-muted-foreground">
            This shelf has six verses. It does not write the rest.
          </p>
        )}

        {!readOnly && (
          <div className="space-y-2">
            <label className="block text-[11px] text-muted-foreground">
              Tradition
              <select
                aria-label="Tradition"
                value={tradition}
                className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm text-foreground"
                onChange={(event) => setTradition(event.target.value)}
              >
                {BOOK_TRADITIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            {tradition === "Other" && (
              <input
                aria-label="Tradition name"
                value={custom}
                placeholder="Name the tradition"
                className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                onChange={(event) => setCustom(event.target.value)}
              />
            )}
            <textarea
              aria-label="Hosted reading"
              value={hosted}
              placeholder="Words you host. Leave empty to hold the name."
              className="min-h-16 w-full rounded-md border bg-background px-2 py-1 text-sm"
              onChange={(event) => setHosted(event.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {overlap.tradition} is a label.
              {study.onShelf
                ? overlap.shared.length > 0
                  ? ` Shared words with the shelf: ${overlap.shared.join(", ")}.`
                  : " No shared words with the shelf."
                : " The shelf does not hold this passage."}
            </p>
            {tradition === "Bible" && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="SWORD module"
                  value={swordModule}
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  onChange={(event) =>
                    setSwordModule(
                      event.target.value as (typeof SWORD_MODULES)[number],
                    )
                  }
                >
                  {SWORD_MODULES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void readSword()}
                >
                  Read from SWORD
                </Button>
              </div>
            )}
            <Button type="button" size="sm" variant="outline" onClick={keep}>
              Keep on this browser
            </Button>
          </div>
        )}
        {notice && (
          <p className="text-[11px] text-muted-foreground">{notice}</p>
        )}
      </CardContent>
    </Card>
  );
}
