/**
 * Notebook shape taken from er1cbrown/lazyvim.
 * Python cells match the miniconda kernel. R cells match the ir kernel.
 * TeX cells are for VimTeX. The file we hand to nvim is Quarto (.qmd)
 * or a .tex file when the notebook is only TeX.
 */

export type CellLang = "python" | "r" | "markdown" | "tex";

export interface HomeworkCell {
  id: string;
  lang: CellLang;
  source: string;
}

export interface HomeworkNotebook {
  id: string;
  title: string;
  cells: HomeworkCell[];
  updatedAt: string;
}

export const NOTEBOOK_STORE = "blkspace_homework_notebooks_v1";
const MAX_CELLS = 40;
const MAX_SOURCE = 8000;

export function newCell(lang: CellLang = "python"): HomeworkCell {
  return {
    id: `cell_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    lang,
    source: "",
  };
}

function starter(): HomeworkNotebook {
  return {
    id: `nb_${Date.now().toString(36)}`,
    title: "Homework",
    updatedAt: new Date().toISOString(),
    cells: [
      {
        id: "cell_note",
        lang: "markdown",
        source:
          "Python runs on the miniconda kernel. R runs on the ir kernel. TeX compiles in LazyVim with VimTeX.",
      },
      {
        id: "cell_py",
        lang: "python",
        source: 'print("yard")',
      },
    ],
  };
}

function load(): HomeworkNotebook[] {
  try {
    const raw = localStorage.getItem(NOTEBOOK_STORE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HomeworkNotebook[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(rows: HomeworkNotebook[]) {
  localStorage.setItem(NOTEBOOK_STORE, JSON.stringify(rows.slice(0, 20)));
}

export function listNotebooks(): HomeworkNotebook[] {
  return load().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getNotebook(id: string): HomeworkNotebook | null {
  return load().find((row) => row.id === id) ?? null;
}

export function saveNotebook(notebook: HomeworkNotebook): HomeworkNotebook {
  const title = notebook.title.trim().slice(0, 80) || "Homework";
  const cells = notebook.cells.slice(0, MAX_CELLS).map((cell) => ({
    ...cell,
    source: cell.source.slice(0, MAX_SOURCE),
  }));
  const next: HomeworkNotebook = {
    ...notebook,
    title,
    cells,
    updatedAt: new Date().toISOString(),
  };
  const rows = load().filter((row) => row.id !== next.id);
  save([next, ...rows]);
  return next;
}

export function createNotebook(): HomeworkNotebook {
  return saveNotebook(starter());
}

export function fileStem(title: string): string {
  const stem = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return stem || "homework";
}

export function notebookIsTex(notebook: HomeworkNotebook): boolean {
  const filled = notebook.cells.filter((cell) => cell.source.trim());
  return filled.length > 0 && filled.every((cell) => cell.lang === "tex");
}

/** Quarto document their LazyVim opens as cells. */
export function toQuarto(notebook: HomeworkNotebook): string {
  const parts = notebook.cells.map((cell) => {
    const body = cell.source.replace(/\s+$/, "");
    if (cell.lang === "markdown") return `${body}\n`;
    const fence =
      cell.lang === "r" ? "r" : cell.lang === "tex" ? "tex" : "python";
    return "```{" + fence + "}\n" + body + "\n```\n";
  });
  return parts.join("\n");
}

/** VimTeX wants a real .tex file. */
export function toTex(notebook: HomeworkNotebook): string {
  return notebook.cells
    .filter((cell) => cell.lang === "tex")
    .map((cell) => cell.source.replace(/\s+$/, ""))
    .join("\n\n");
}

export function exportName(notebook: HomeworkNotebook): string {
  const ext = notebookIsTex(notebook) ? "tex" : "qmd";
  return `${fileStem(notebook.title)}.${ext}`;
}

export function exportBody(notebook: HomeworkNotebook): string {
  return notebookIsTex(notebook) ? toTex(notebook) : toQuarto(notebook);
}
