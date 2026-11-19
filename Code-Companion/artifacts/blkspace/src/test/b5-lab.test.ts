import { describe, expect, it } from "vitest";
import {
  benGrahamByte,
  cropGray,
  teachingField,
  type RgbImage,
} from "@/lib/clinyard/b5-lab";

describe("EfficientNet-B5 steps in the lab", () => {
  it("mixes a pixel the way addWeighted does", () => {
    expect(benGrahamByte(100, 80)).toBe(208);
    expect(benGrahamByte(0, 255)).toBe(0);
    expect(benGrahamByte(255, 0)).toBe(255);
  });

  it("crops the dark ring and leaves an all-dark frame alone", () => {
    const field = teachingField({ id: "plate-a", grade: 0 }, 16);
    const cropped = cropGray(field, 7);
    expect(cropped.width).toBeLessThan(field.width);
    expect(cropped.height).toBeLessThan(field.height);

    const dark: RgbImage = { width: 2, height: 2, data: new Uint8Array(12) };
    expect(cropGray(dark, 7)).toBe(dark);
  });
});
