import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaperDesk } from "@/components/clinyard/PaperDesk";

describe("Study drills", () => {
  it("asks one paper question at a time", () => {
    render(<PaperDesk />);
    expect(screen.getByRole("img", { name: "Uppsala University seal" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Study drills" })).toBeTruthy();
    expect(screen.getByText("1 of 7 · Digital eye strain")).toBeTruthy();
    expect(screen.queryByText(/0\.10 ± 0\.04/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Severe" }));
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByText(/That matches the drill/)).toBeTruthy();
    expect(screen.getByText(/19–23/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next drill" }));
    expect(screen.getByText("2 of 7 · Retinal permeability")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mild NPDR, 0.10" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next drill" }));
    fireEvent.click(screen.getByRole("button", { name: "40°" }));
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByText(/withdrawn text peak/)).toBeTruthy();
  });
});
