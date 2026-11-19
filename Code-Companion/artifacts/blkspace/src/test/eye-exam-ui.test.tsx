import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EyeExam } from "@/components/clinyard/EyeExam";

describe("Eye exam on ClinYard", () => {
  it("shows the eye in practice and hides it until a letter is missed", () => {
    render(<EyeExam />);
    fireEvent.click(screen.getByRole("button", { name: "Practice" }));
    expect(screen.getByRole("img", { name: /posterior focus F prime/i })).toBeTruthy();
    expect(screen.getByText(/Probability of a good exam score: 98%/)).toBeTruthy();
    expect(screen.getByText(/Jayedi et al\. \(2022\)/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Exam" }));
    expect(screen.queryByRole("img", { name: /posterior focus F prime/i })).toBeNull();
    expect(screen.getByText(/The eye is hidden\. Type the letter on 20\/200/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "E" }));
    expect(screen.getByText(/letter on 20\/100/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Z" }));
    expect(screen.getByRole("img", { name: /posterior focus F prime/i })).toBeTruthy();
    expect(screen.getByText(/You cleared 20\/200/)).toBeTruthy();
  });
});
