import { describe, expect, it, vi } from "vitest";
import {
  exportBody,
  listNotebooks,
  NOTEBOOK_STORE,
  saveNotebook,
} from "@/lib/homework-notebook";
import {
  DR_NOTEBOOK_ID,
  drPredictUrl,
  drProgramNotebook,
  ensureDrProgramNotebook,
  parseDrResponse,
  requestDrScore,
  toPercentPy,
} from "@/lib/clinyard/dr-program";

describe("DR screening program", () => {
  it("writes a local percent .py for the LazyVim jupytext keymap", () => {
    const notebook = drProgramNotebook();
    expect(notebook.id).toBe(DR_NOTEBOOK_ID);
    expect(notebook.cells.length).toBeGreaterThan(3);
    for (const cell of notebook.cells) {
      expect(cell.source.length).toBeLessThanOrEqual(8000);
    }
    const note = notebook.cells[0].source;
    expect(note).toContain("Space pc");
    expect(note).toContain("jupytext --to ipynb");
    expect(note).toContain("LazyVim");
    expect(note).toContain("Hostinger");
    expect(note).toContain("not a medical device");
    const py = toPercentPy(notebook);
    expect(py).toContain("# %% [markdown]");
    expect(py).toContain("# %%\n");
    expect(py).toContain("name: miniconda");
    expect(py).toContain("efficientnet_b0");
    expect(py).not.toContain("```");
    const body = exportBody(notebook);
    expect(body).toContain("```{python}");
  });

  it("opens one DR notebook in Homework", () => {
    localStorage.removeItem(NOTEBOOK_STORE);
    const first = ensureDrProgramNotebook();
    saveNotebook({ ...first, title: "edited" });
    const second = ensureDrProgramNotebook();
    expect(second.id).toBe(first.id);
    expect(second.title).toBe("edited");
    expect(
      listNotebooks().filter((row) => row.id === DR_NOTEBOOK_ID),
    ).toHaveLength(1);
  });

  it("accepts a GPU https host and refuses the website", () => {
    const allowed = drPredictUrl("https://tunnel.example/app");
    expect(allowed.ok).toBe(true);
    if (allowed.ok)
      expect(allowed.url).toBe("https://tunnel.example/app/predict");
    const ready = drPredictUrl("https://gpu.example/predict");
    expect(ready.ok).toBe(true);
    if (ready.ok) expect(ready.url).toBe("https://gpu.example/predict");
    expect(drPredictUrl("http://gpu.example").ok).toBe(false);
    expect(drPredictUrl("https://bkspc.app/predict").ok).toBe(false);
    expect(drPredictUrl("https://yard.hostinger.com/predict").ok).toBe(false);
    expect(drPredictUrl("https://api.x.ai/v1").ok).toBe(false);
    expect(drPredictUrl("https://user:pw@gpu.example").ok).toBe(false);
  });

  it("reads a 0–4 score and posts the file only to that host", async () => {
    expect(
      parseDrResponse({ classIndex: 2, confidence: 0.8, label: "Moderate" }),
    ).toEqual({
      classIndex: 2,
      confidence: 0.8,
      label: "Moderate",
    });
    expect(parseDrResponse({ classIndex: 9, confidence: 0.2 })).toBeNull();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ classIndex: 1, confidence: 0.5 }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const score = await requestDrScore(
      "https://gpu.example",
      new Blob(["img"]),
      "secret",
    );
    expect(score.classIndex).toBe(1);
    expect(score.label).toBe("Mild");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://gpu.example/predict");
    expect(init.credentials).toBe("omit");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer secret",
    );
    expect(init.body).toBeInstanceOf(FormData);
    vi.unstubAllGlobals();
  });
});
