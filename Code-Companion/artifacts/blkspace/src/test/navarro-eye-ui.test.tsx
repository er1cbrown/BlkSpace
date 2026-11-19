import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NavarroEye } from "@/components/clinyard/NavarroEye";

describe("Navarro card", () => {
  it("shows the Visisipy default eye without replacing the plates", () => {
    render(<NavarroEye />);
    expect(screen.getByText("Navarro wide-angle eye")).toBeTruthy();
    expect(screen.getByText(/Escudero-Sanz and Navarro \(1999\)/)).toBeTruthy();
    expect(screen.getByText(/23\.9203 mm/)).toBeTruthy();
    expect(screen.getAllByText(/589\.3/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("24.19655").length).toBe(2);
    expect(screen.getByText("unaccommodated")).toBeTruthy();
    expect(screen.getByText("accommodated")).toBeTruthy();
    expect(screen.getByText(/teaching plates/i)).toBeTruthy();
  });
});
