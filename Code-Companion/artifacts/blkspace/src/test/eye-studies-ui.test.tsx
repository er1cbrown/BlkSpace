import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EyeStudies } from "@/components/clinyard/EyeStudies";

describe("Eye studies desk", () => {
  it("shows every study and which ones stay on a GPU host", () => {
    render(<EyeStudies />);
    expect(screen.getByText("Eye studies")).toBeTruthy();
    for (const title of [
      "APTOS starter",
      "APTOS and EyePACS look",
      "Referable or not",
      "Five-class EfficientNet",
      "EfficientNet-B5 regression",
      "PyTorch yes or no",
      "Schematic eye",
    ]) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.getAllByText("GPU host")).toHaveLength(6);
    expect(screen.getByText("This browser")).toBeTruthy();
    expect(screen.getByText(/class 0 on the APTOS scale means no DR/i)).toBeTruthy();
    expect(screen.getByText(/Smith-Morris \(2006\)/)).toBeTruthy();
  });
});
