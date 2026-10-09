import { describe, expect, it } from "vitest";
import {
  CLINYARD_ITEMS,
  filterDrills,
  scoreChoice,
  scoreReport,
  scoreSteps,
} from "@/lib/clinyard/tasks";

describe("ClinYard drills", () => {
  it("covers the four study formats", () => {
    expect(new Set(CLINYARD_ITEMS.map((item) => item.mode))).toEqual(
      new Set(["mcq", "image_vqa", "instruction", "report"]),
    );
  });

  it("filters to one format", () => {
    expect(filterDrills(CLINYARD_ITEMS, "mcq")).toHaveLength(1);
    expect(filterDrills(CLINYARD_ITEMS, "all")).toHaveLength(4);
  });

  it("scores a choice, a step order, and a report line", () => {
    const question = CLINYARD_ITEMS.find((item) => item.mode === "mcq")!;
    const steps = CLINYARD_ITEMS.find((item) => item.mode === "instruction")!;
    const report = CLINYARD_ITEMS.find((item) => item.mode === "report")!;
    expect(scoreChoice(question, 0)).toBe(true);
    expect(scoreChoice(question, 1)).toBe(false);
    expect(scoreSteps(steps, steps.steps!)).toBe(true);
    expect(scoreSteps(steps, [...steps.steps!].reverse())).toBe(false);
    expect(
      scoreReport(
        report,
        "The heart size is normal and there is no pleural effusion.",
      ),
    ).toBe(true);
    expect(scoreReport(report, "Looks fine.")).toBe(false);
  });
});
