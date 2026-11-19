import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VisionLab } from "@/components/clinyard/VisionLab";

describe("Vision lab panel", () => {
  it("runs five drawings and shows the sight picture", () => {
    render(<VisionLab />);
    const run = screen.getByRole("button", { name: "Run these five" });
    expect((run as HTMLButtonElement).disabled).toBe(true);

    for (const name of [
      "Clear disc",
      "A few dots",
      "Long eye",
      "Short eye",
      "Vitreous haze",
    ]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(name) }));
    }

    expect((run as HTMLButtonElement).disabled).toBe(false);
    expect(
      (screen.getByRole("button", { name: /Steep cornea/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.click(run);
    expect(
      screen.getByRole("img", { name: /posterior focus F prime/i }),
    ).toBeTruthy();
    expect(screen.getAllByText(/Score metadata/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("id_code").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("img", { name: /Eye test chart/i })).toHaveLength(2);
    expect(screen.getAllByText(/Probability of a good exam score: 98%/).length).toBe(
      2,
    );
    expect(screen.getByText(/Optical impairment/)).toBeTruthy();
    expect(screen.getByText(/Retinal impairment/)).toBeTruthy();
    expect(screen.getByText(/Preprocess/)).toBeTruthy();
    expect(screen.getByText(/After the teaching lens/)).toBeTruthy();
    expect(screen.getByLabelText("Presentation note")).toBeTruthy();
    expect(screen.getByText(/is a diagnosis or a glasses prescription/i)).toBeTruthy();
    expect(screen.getByText(/Dahl-Jørgensen et al\. \(1985\)/)).toBeTruthy();
    expect(screen.getAllByText(/Kizor-Akaraiwe et al\. \(2016\)/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "No" }));
    fireEvent.click(screen.getByRole("button", { name: "Check diopter" }));
    expect(screen.getByText(/That matches/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Study prompt"), {
      target: { value: "Diagnose this patient." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check prompt" }));
    expect(screen.getByText(/Rejected/)).toBeTruthy();
  });
});
