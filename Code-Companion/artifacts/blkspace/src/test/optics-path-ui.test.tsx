import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OpticsPath } from "@/components/clinyard/OpticsPath";

describe("Optics path card", () => {
  it("walks the six stations and keeps the diopter when the grade changes", () => {
    render(<OpticsPath />);
    expect(screen.getByText("Optics path")).toBeTruthy();
    for (const title of [
      "1. Fundus",
      "2. Schematic eye",
      "3. Digital eye strain",
      "4. Diabetic retinopathy",
      "5. Glaucoma",
      "6. Cataract",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    }
    expect(screen.getByText(/does not measure axial length/)).toBeTruthy();
    expect(screen.getByText("ORIGA.")).toBeTruthy();
    expect(screen.getByText("Drishti-GS.")).toBeTruthy();
    expect(screen.getByText(/no opacity grade/)).toBeTruthy();

    const error = screen.getByTestId("path-error").textContent;
    expect(screen.getByText(/Severe\./)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Retinopathy grade"), {
      target: { value: "4" },
    });
    expect(screen.getByTestId("path-error").textContent).toBe(error);
    expect(screen.getByText("Referable")).toBeTruthy();
    expect(screen.getByText(/Proliferative disease/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("CVSS-17 total"), {
      target: { value: "34" },
    });
    expect(screen.getByText(/Level 3\./)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Glucose preset"), {
      target: { value: "high" },
    });
    expect(screen.getByText(/Glucose shift 1\.5 D/)).toBeTruthy();
  });
});
