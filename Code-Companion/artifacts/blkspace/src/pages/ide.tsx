import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createNotebook,
  exportBody,
  exportName,
  getNotebook,
  listNotebooks,
  newCell,
  saveNotebook,
  type CellLang,
  type HomeworkNotebook,
} from "@/lib/homework-notebook";
import {
  isTauri,
  tauriOpenNotebookInLazyVim,
  tauriRunHomeworkCell,
} from "@/lib/tauri-api";
import { toast } from "sonner";

const LANGS: { id: CellLang; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "r", label: "R" },
  { id: "markdown", label: "Note" },
  { id: "tex", label: "TeX" },
];

function download(name: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function cellExt(lang: CellLang): string {
  if (lang === "python") return "py";
  if (lang === "r") return "r";
  if (lang === "tex") return "tex";
  return "md";
}

/**
 * Web editor for the LazyVim homework stack.
 * The site edits and downloads Quarto or TeX. The Full app can run a cell
 * and open the same file in nvim.
 */
export default function IdePage() {
  const desktop = isTauri();
  const [tick, setTick] = useState(0);
  const notebooks = useMemo(() => {
    void tick;
    return listNotebooks();
  }, [tick]);
  const [activeId, setActiveId] = useState<string | null>(
    notebooks[0]?.id ?? null,
  );
  const notebook = (activeId && getNotebook(activeId)) || notebooks[0] || null;
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<string | null>(null);

  const openNew = () => {
    const created = createNotebook();
    setActiveId(created.id);
    setTick((n) => n + 1);
  };

  const update = (next: HomeworkNotebook) => {
    const saved = saveNotebook(next);
    setActiveId(saved.id);
    setTick((n) => n + 1);
  };

  const runCell = async (id: string, lang: CellLang, source: string) => {
    if (!desktop) {
      setRunning(id);
      try {
        const res = await fetch("/api/homework/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lang, source }),
        });
        const body = await res.json();
        setOutputs((prev) => ({
          ...prev,
          [id]: res.ok ? body.output || "(no output)" : body.error || "Run failed",
        }));
      } catch (err) {
        setOutputs((prev) => ({
          ...prev,
          [id]: err instanceof Error ? err.message : String(err),
        }));
      } finally {
        setRunning(null);
      }
      return;
    }
    if (lang !== "python" && lang !== "r") {
      toast("Notes and TeX open in LazyVim. Python and R run here.");
      return;
    }
    setRunning(id);
    try {
      const text = await tauriRunHomeworkCell(lang, source);
      setOutputs((prev) => ({ ...prev, [id]: text || "(no output)" }));
    } catch (err) {
      setOutputs((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setRunning(null);
    }
  };

  const openNvim = async () => {
    if (!notebook) return;
    const name = exportName(notebook);
    const body = exportBody(notebook);
    if (!desktop) {
      download(name, body);
      toast("Downloaded. Open that file in LazyVim.");
      return;
    }
    try {
      const path = await tauriOpenNotebookInLazyVim(notebook.title, name, body);
      toast.success(`Opened ${path}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <AppShell wide>
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Homework</h1>
          <p className="text-sm text-muted-foreground">
            Same stack as github.com/er1cbrown/lazyvim. Python uses the
            miniconda kernel. R uses the ir kernel. TeX is for VimTeX. This page
            edits the cells. The Full app runs Python and R, and opens the file
            in Neovim.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {notebooks.map((row) => (
            <Button
              key={row.id}
              size="sm"
              variant={notebook?.id === row.id ? "default" : "outline"}
              onClick={() => setActiveId(row.id)}
            >
              {row.title}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={openNew}>
            New notebook
          </Button>
        </div>

        {!notebook ? (
          <Button onClick={openNew}>Start a notebook</Button>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                aria-label="Notebook title"
                value={notebook.title}
                onChange={(e) => update({ ...notebook, title: e.target.value })}
              />
              <Button variant="outline" onClick={() => void openNvim()}>
                {desktop ? "Open in LazyVim" : "Download for LazyVim"}
              </Button>
            </div>
            {notebook.cells.map((cell, index) => (
              <div key={cell.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="text-xs text-muted-foreground">
                    Cell {index + 1}
                    <select
                      className="ml-2 rounded-md border bg-background px-2 py-1 text-xs"
                      aria-label={`Language for cell ${index + 1}`}
                      value={cell.lang}
                      onChange={(e) => {
                        const lang = e.target.value as CellLang;
                        update({
                          ...notebook,
                          cells: notebook.cells.map((row) =>
                            row.id === cell.id ? { ...row, lang } : row,
                          ),
                        });
                      }}
                    >
                      {LANGS.map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(cell.lang === "python" || cell.lang === "r") && (
                    <Button
                      size="sm"
                      disabled={running === cell.id}
                      onClick={() =>
                        void runCell(cell.id, cell.lang, cell.source)
                      }
                    >
                      {running === cell.id ? "Running…" : "Run"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      download(`cell-${index + 1}.${cellExt(cell.lang)}`, cell.source)
                    }
                  >
                    Download .{cellExt(cell.lang)}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      update({
                        ...notebook,
                        cells: notebook.cells.filter((row) => row.id !== cell.id),
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
                <Textarea
                  aria-label={`Source for cell ${index + 1}`}
                  value={cell.source}
                  rows={cell.lang === "markdown" ? 3 : 6}
                  className="font-mono text-sm"
                  onChange={(e) =>
                    update({
                      ...notebook,
                      cells: notebook.cells.map((row) =>
                        row.id === cell.id
                          ? { ...row, source: e.target.value }
                          : row,
                      ),
                    })
                  }
                />
                {outputs[cell.id] && (
                  <pre className="text-xs whitespace-pre-wrap rounded-md bg-muted p-2">
                    {outputs[cell.id]}
                  </pre>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                update({
                  ...notebook,
                  cells: [...notebook.cells, newCell("python")],
                })
              }
            >
              Add cell
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
