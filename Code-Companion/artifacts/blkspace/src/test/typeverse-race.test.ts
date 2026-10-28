import { describe, expect, it } from "vitest";
import {
  cpuChars,
  cpuFinishMs,
  defaultVehicle,
  difficultySpec,
  judgeCpuFinish,
  minFinishMs,
  normalizeVehicle,
  pickRaceVerse,
  prizeFor,
  readVehicle,
  vehicleLabel,
} from "@/lib/typeverse-race";
import type { Verse } from "@/lib/typeverse";

const verse =
  "In the beginning God created the heaven and the earth.";

describe("typeverse racers", () => {
  it("keeps a racer's paint, body, and number", () => {
    const vehicle = normalizeVehicle({
      name: "  Nova   Lane  ",
      body: "lowrider",
      paint: "cardinal",
      accent: "gold",
      number: 120,
    });
    expect(vehicle).toEqual({
      name: "Nova Lane",
      body: "lowrider",
      paint: "cardinal",
      accent: "gold",
      number: 99,
    });
    expect(vehicleLabel(vehicle)).toBe("Nova Lane · Lowrider #99");
    expect(readVehicle("nope")).toEqual(defaultVehicle());
    expect(normalizeVehicle({ body: "jet" }).body).toBe("coupe");
  });

  it("pays more for a faster CPU and caps the yard purse", () => {
    expect(difficultySpec("cruise")).toMatchObject({ wpm: 20, prize: 4 });
    expect(difficultySpec("record").prize).toBe(16);
    expect(prizeFor("match")).toBe(12);
    expect(prizeFor("nope")).toBe(difficultySpec("campus").prize);
  });

  it("lets a clean finish beat campus pace and refuses a paste", () => {
    const elapsed = 8_000;
    expect(cpuChars(elapsed, 40)).toBeLessThan(verse.length);
    expect(minFinishMs(verse.length)).toBeLessThan(elapsed);
    expect(cpuFinishMs(verse.length, 40)).toBeGreaterThan(elapsed);
    expect(
      judgeCpuFinish({ typed: verse, verse, elapsedMs: elapsed, wpm: 40 }).beat,
    ).toBe(true);
    expect(
      judgeCpuFinish({ typed: verse, verse, elapsedMs: 400, wpm: 40 }).reason,
    ).toMatch(/faster than the race allows/);
    expect(
      judgeCpuFinish({
        typed: verse,
        verse,
        elapsedMs: cpuFinishMs(verse.length, 40) + 1,
        wpm: 40,
      }).reason,
    ).toMatch(/CPU finished first/);
    const sloppy = `${"x".repeat(verse.length - 8)}${verse.slice(-8)}`;
    expect(
      judgeCpuFinish({ typed: sloppy, verse, elapsedMs: elapsed, wpm: 40 }).beat,
    ).toBe(false);
  });

  it("picks a verse long enough to race", () => {
    const verses: Verse[] = [
      { book: "John", chapter: 11, verse: 35, text: "Jesus wept." },
      {
        book: "Genesis",
        chapter: 1,
        verse: 1,
        text: verse,
      },
    ];
    expect(pickRaceVerse(verses, () => 0.6)?.text).toBe(verse);
    expect(pickRaceVerse([{ book: "John", chapter: 11, verse: 35, text: "Jesus wept." }])).toBeNull();
  });
});