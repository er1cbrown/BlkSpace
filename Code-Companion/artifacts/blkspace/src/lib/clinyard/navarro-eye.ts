/**
 * Navarro wide-angle eye and the Gullstrand-LeGrand pair, as recorded
 * by Visisipy. This file does not raytrace and does not load OpticStudio.
 * The teaching plates keep their own axial lengths and diopter buttons.
 *
 * Navarro surfaces and the 589.3 nm indices: Escudero-Sanz and Navarro,
 * JOSA A 16(8), 1881–1891 (1999). Gullstrand-LeGrand: Le Grand and El Hage,
 * Physiological Optics (1980), as tabulated in Visisipy.
 */

export interface EyeSurface {
  name: string;
  /** Millimetres. A missing radius is a flat stop. */
  radiusMm: number | null;
  asphericity: number | null;
  /** Distance to the next surface. The retina has none. */
  thicknessMm: number;
}

export interface IndexRow {
  /** Nanometres. */
  wavelengthNm: number;
  cornea: number;
  aqueous: number;
  lens: number;
  vitreous: number;
  /** The schematic eye already uses this row for cornea and vitreous. */
  usedByLab: boolean;
}

/** Visisipy NavarroGeometry. Pupil thickness is 0, so it does not add length. */
export const NAVARRO_SURFACES: readonly EyeSurface[] = [
  { name: "Cornea front", radiusMm: 7.72, asphericity: -0.26, thicknessMm: 0.55 },
  { name: "Cornea back", radiusMm: 6.5, asphericity: 0, thicknessMm: 3.05 },
  { name: "Pupil", radiusMm: null, asphericity: null, thicknessMm: 0 },
  { name: "Lens front", radiusMm: 10.2, asphericity: -3.1316, thicknessMm: 4 },
  { name: "Lens back", radiusMm: -6, asphericity: -1, thicknessMm: 16.3203 },
  { name: "Retina", radiusMm: -12, asphericity: 0, thicknessMm: 0 },
];

export const NAVARRO_PUPIL_SEMI_MM = 1.348;

/** NavarroMaterials458, 543, 589, and 633. */
export const NAVARRO_INDICES: readonly IndexRow[] = [
  { wavelengthNm: 458, cornea: 1.3828, aqueous: 1.3445, lens: 1.4292, vitreous: 1.3428, usedByLab: false },
  { wavelengthNm: 543, cornea: 1.3777, aqueous: 1.3391, lens: 1.4222, vitreous: 1.3377, usedByLab: false },
  { wavelengthNm: 589.3, cornea: 1.376, aqueous: 1.3374, lens: 1.42, vitreous: 1.336, usedByLab: true },
  { wavelengthNm: 632.8, cornea: 1.3747, aqueous: 1.336, lens: 1.4183, vitreous: 1.3347, usedByLab: false },
];

export interface GullstrandState {
  name: "unaccommodated" | "accommodated";
  corneaFrontRadiusMm: number;
  aqueousMm: number;
  lensFrontRadiusMm: number;
  lensThicknessMm: number;
  lensBackRadiusMm: number;
  vitreousMm: number;
  corneaThicknessMm: number;
  lensIndex: number;
  corneaIndex: number;
  aqueousIndex: number;
  vitreousIndex: number;
}

/** Visisipy GullstrandLeGrandGeometry. Axial length is the same in both states. */
export const GULLSTRAND: readonly GullstrandState[] = [
  {
    name: "unaccommodated",
    corneaFrontRadiusMm: 7.8,
    corneaThicknessMm: 0.55,
    aqueousMm: 3.05,
    lensFrontRadiusMm: 10.2,
    lensThicknessMm: 4,
    lensBackRadiusMm: -6,
    vitreousMm: 16.59655,
    corneaIndex: 1.3771,
    aqueousIndex: 1.3374,
    lensIndex: 1.42,
    vitreousIndex: 1.336,
  },
  {
    name: "accommodated",
    corneaFrontRadiusMm: 7.8,
    corneaThicknessMm: 0.55,
    aqueousMm: 2.65,
    lensFrontRadiusMm: 6,
    lensThicknessMm: 4.5,
    lensBackRadiusMm: -5.5,
    vitreousMm: 16.49655,
    corneaIndex: 1.3771,
    aqueousIndex: 1.3374,
    lensIndex: 1.427,
    vitreousIndex: 1.336,
  },
];

/** Sum of the thicknesses, matching Visisipy EyeGeometry.axial_length. */
export function axialLengthMm(surfaces: readonly { thicknessMm: number }[]): number {
  return surfaces.reduce((sum, surface) => sum + surface.thicknessMm, 0);
}

export function gullstrandAxialMm(state: GullstrandState): number {
  return (
    state.corneaThicknessMm +
    state.aqueousMm +
    state.lensThicknessMm +
    state.vitreousMm
  );
}

/**
 * Power of the cornea front surface in air, (n − 1) / R, with R in metres.
 * This is not the cornea diopter on the teaching plates.
 */
export function frontSurfacePowerD(index: number, radiusMm: number): number {
  if (radiusMm === 0) throw new Error("radius must not be zero");
  return ((index - 1) * 1000) / radiusMm;
}
