import { describe, expect, it } from "vitest";
import {
  exportBody,
  exportName,
  notebookIsTex,
  toQuarto,
  toTex,
  type HomeworkNotebook,
} from "@/lib/homework-notebook";

const notebook: HomeworkNotebook = {
  id: "nb_1",
  title: "Friday Lab",
  updatedAt: "2026-10-20T00:00:00.000Z",
  cells: [
    { id: "a", lang: "markdown", source: "Notes" },
    { id: "b", lang: "python", source: 'print("yard")' },
    { id: "c", lang: "r", source: "print(1 + 1)" },
  ],
};

describe("homework notebook", () => {
  it("writes quarto fences their LazyVim can open", () => {
    const text = toQuarto(notebook);
    expect(text).toContain("Notes");
    expect(text).toContain('```{python}\nprint("yard")\n```');
    expect(text).toContain("```{r}\nprint(1 + 1)\n```");
    expect(exportName(notebook)).toBe("friday-lab.qmd");
    expect(notebookIsTex(notebook)).toBe(false);
  });

  it("exports a tex-only notebook for VimTeX", () => {
    const tex: HomeworkNotebook = {
      ...notebook,
      title: "Psalm sheet",
      cells: [{ id: "t", lang: "tex", source: "\\section{Yard}" }],
    };
    expect(notebookIsTex(tex)).toBe(true);
    expect(exportName(tex)).toBe("psalm-sheet.tex");
    expect(toTex(tex)).toBe("\\section{Yard}");
    expect(exportBody(tex)).toBe("\\section{Yard}");
  });
});
