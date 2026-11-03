import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DrScreenProgram } from "@/components/clinyard/DrScreenProgram";
import { DR_NOTEBOOK_ID } from "@/lib/clinyard/dr-program";
import { getNotebook, NOTEBOOK_STORE } from "@/lib/homework-notebook";

describe("DR screening panel", () => {
  beforeEach(() => {
    localStorage.removeItem(NOTEBOOK_STORE);
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, "createObjectURL", {
        value: () => "blob:preview",
        configurable: true,
      });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", {
        value: () => {},
        configurable: true,
      });
    }
  });

  it("keeps scoring off until a teaching file is aimed at a GPU host", async () => {
    render(<DrScreenProgram />);
    const score = screen.getByRole("button", { name: "Score on GPU host" });
    expect((score as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/not a diagnosis/i)).toBeTruthy();
    expect(screen.getByText(/Hostinger does not run the model/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("GPU host URL"), {
      target: { value: "https://bkspc.app/api" },
    });
    expect(
      screen.getByText(/Scoring stays on Colab or the xAI GPU/i),
    ).toBeTruthy();
    expect((score as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "xAI GPU" }));
    expect(
      (screen.getByLabelText("GPU host URL") as HTMLInputElement).value,
    ).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Google Colab" }));
    expect(
      (screen.getByLabelText("GPU host URL") as HTMLInputElement).value,
    ).toBe("https://bkspc.app/api");

    fireEvent.change(screen.getByLabelText("GPU host URL"), {
      target: { value: "https://gpu.example/lab" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    const file = new File(["png"], "teaching.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Fundus image"), {
      target: { files: [file] },
    });
    expect((score as HTMLButtonElement).disabled).toBe(false);

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ classIndex: 1, confidence: 0.5 }),
    } as Response);
    fireEvent.click(score);
    expect(await screen.findByText(/Host score: 1 Mild/)).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      "https://gpu.example/lab/predict",
      expect.objectContaining({ credentials: "omit", method: "POST" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear file" }));
    expect(
      (
        screen.getByRole("button", {
          name: "Score on GPU host",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Open in LazyVim" }));
    expect(getNotebook(DR_NOTEBOOK_ID)?.title).toBe("DR screening");
    expect(
      screen
        .getByRole("link", { name: "Edit in Homework" })
        .getAttribute("href"),
    ).toBe("/ide?program=dr");
  });
});
