import { describe, expect, it } from "vitest";
import {
  BEARING,
  BREAK_RULE,
  EXAM_QUESTIONS,
  IRIS_SETS,
  PERMEABILITY,
  STUDY_DRILLS,
  cvsqBand,
  cvss17Inside,
  examRowInRange,
  formatClock,
  nextBreak,
  readScore,
  scoreStudyDrill,
} from "@/lib/clinyard/paper-desk";

describe("paper desk scores", () => {
  it("places a CVS-Q total in the review bands", () => {
    expect(readScore("")).toBeNull();
    expect(readScore("no")).toBeNull();
    expect(cvsqBand(-1)).toBeNull();
    expect(cvsqBand(0)?.id).toBe("under");
    expect(cvsqBand(5)?.id).toBe("under");
    expect(cvsqBand(6)?.id).toBe("mild");
    expect(cvsqBand(12)?.id).toBe("mild");
    expect(cvsqBand(13)?.id).toBe("moderate");
    expect(cvsqBand(18)?.id).toBe("moderate");
    expect(cvsqBand(19)?.id).toBe("severe");
    expect(cvsqBand(23)?.id).toBe("severe");
    expect(cvsqBand(24)?.id).toBe("above");
  });

  it("keeps CVSS17 inside 17 to 53", () => {
    expect(cvss17Inside(16)).toBe(false);
    expect(cvss17Inside(17)).toBe(true);
    expect(cvss17Inside(53)).toBe(true);
    expect(cvss17Inside(54)).toBe(false);
  });

  it("ticks the 20-20-20 block from work into the look-away", () => {
    expect(formatClock(BREAK_RULE.workSeconds)).toBe("20:00");
    expect(formatClock(BREAK_RULE.lookSeconds)).toBe("0:20");
    expect(nextBreak("work", 1)).toEqual({ phase: "work", secondsLeft: 0, done: false });
    expect(nextBreak("work", 0)).toEqual({
      phase: "look",
      secondsLeft: BREAK_RULE.lookSeconds,
      done: false,
    });
    expect(nextBreak("look", 0).done).toBe(true);
  });

  it("keeps permeability means in the published order", () => {
    expect(PERMEABILITY.map((group) => group.mean)).toEqual([0.04, 0.07, 0.1]);
    expect(PERMEABILITY.map((group) => group.n)).toEqual([7, 22, 7]);
  });

  it("teaches the corrected bearing and keeps every exam median inside its range", () => {
    expect(BEARING.correctedPeakDeg).toBe(40);
    expect(BEARING.withdrawnBodyPeakDeg).toBe(65);
    expect(BEARING.withdrawnFigurePeakDeg).toBe(60);
    for (const question of EXAM_QUESTIONS) {
      for (const row of question.rows) {
        expect(examRowInRange(row)).toBe(true);
      }
    }
    const imaging = EXAM_QUESTIONS.find((question) => question.id === "p1");
    expect(imaging?.rows.filter((row) => row.abovePass).map((row) => row.model)).toEqual(["o1"]);
  });

  it("keeps the published iris training counts", () => {
    expect(IRIS_SETS.map((row) => row.train)).toEqual([6183, 9909, 14880]);
    expect(IRIS_SETS.map((row) => row.selected)).toEqual([229, 367, 2480]);
  });

  it("asks one scored question per paper", () => {
    expect(STUDY_DRILLS).toHaveLength(7);
    expect(new Set(STUDY_DRILLS.map((drill) => drill.id)).size).toBe(7);
    const strain = STUDY_DRILLS[0];
    expect(strain.choices[strain.answerIndex]).toBe(cvsqBand(19)?.label);
    expect(scoreStudyDrill(strain, strain.answerIndex)).toBe(true);
    expect(scoreStudyDrill(strain, 0)).toBe(false);
    const bearing = STUDY_DRILLS.find((drill) => drill.id === "bearing");
    expect(bearing?.choices[bearing.answerIndex]).toBe("40°");
  });
});
