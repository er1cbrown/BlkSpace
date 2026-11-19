import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";
import {
  GULLSTRAND,
  NAVARRO_INDICES,
  NAVARRO_PUPIL_SEMI_MM,
  NAVARRO_SURFACES,
  axialLengthMm,
  frontSurfacePowerD,
  gullstrandAxialMm,
} from "@/lib/clinyard/navarro-eye";

function mm(value: number, digits = 4): string {
  return value.toFixed(digits);
}

/**
 * Reference card for the Navarro eye Visisipy uses as its default.
 * The teaching plates are not rebuilt from these surfaces.
 */
export function NavarroEye() {
  const axial = axialLengthMm(NAVARRO_SURFACES);
  const front = NAVARRO_SURFACES[0];
  const row = NAVARRO_INDICES.find((item) => item.usedByLab);
  const frontPower =
    front.radiusMm !== null && row
      ? frontSurfacePowerD(row.cornea, front.radiusMm)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4 text-teal-500" />
          Navarro wide-angle eye
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Escudero-Sanz and Navarro (1999), the default eye in Visisipy.
          Axial length is the sum of the surface thicknesses, {mm(axial)} mm.
          The pupil semi-diameter is {NAVARRO_PUPIL_SEMI_MM} mm and its
          thickness is 0. This card does not raytrace. The teaching plates
          keep their own lengths and diopter buttons.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Navarro surfaces in millimetres</caption>
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-1 pr-2 font-medium">Surface</th>
                <th className="py-1 pr-2 font-medium">Radius</th>
                <th className="py-1 pr-2 font-medium">Asphericity</th>
                <th className="py-1 font-medium">Thickness</th>
              </tr>
            </thead>
            <tbody>
              {NAVARRO_SURFACES.map((surface) => (
                <tr key={surface.name} className="border-t">
                  <td className="py-1 pr-2">{surface.name}</td>
                  <td className="py-1 pr-2">
                    {surface.radiusMm === null ? "stop" : mm(surface.radiusMm, 2)}
                  </td>
                  <td className="py-1 pr-2">
                    {surface.asphericity === null ? "none" : surface.asphericity}
                  </td>
                  <td className="py-1">{mm(surface.thicknessMm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {frontPower !== null && row && (
          <p className="text-sm text-muted-foreground">
            At {row.wavelengthNm} nm the cornea index is {row.cornea} and the
            vitreous index is {row.vitreous}. Those two numbers are the ones
            in the schematic eye. The cornea front surface in air is{" "}
            {frontPower.toFixed(2)} D. Aqueous {row.aqueous} and lens {row.lens}{" "}
            are on this card only. The plate button labeled 43 D is a teaching
            power, not this surface.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Navarro refractive index by wavelength</caption>
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-1 pr-2 font-medium">nm</th>
                <th className="py-1 pr-2 font-medium">Cornea</th>
                <th className="py-1 pr-2 font-medium">Aqueous</th>
                <th className="py-1 pr-2 font-medium">Lens</th>
                <th className="py-1 font-medium">Vitreous</th>
              </tr>
            </thead>
            <tbody>
              {NAVARRO_INDICES.map((item) => (
                <tr key={item.wavelengthNm} className="border-t">
                  <td className="py-1 pr-2">
                    {item.wavelengthNm}
                    {item.usedByLab ? " lab" : ""}
                  </td>
                  <td className="py-1 pr-2">{item.cornea}</td>
                  <td className="py-1 pr-2">{item.aqueous}</td>
                  <td className="py-1 pr-2">{item.lens}</td>
                  <td className="py-1">{item.vitreous}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          Gullstrand-LeGrand, also in Visisipy, keeps the same axial length
          when the eye accommodates. The lens front radius and the aqueous
          depth change. Lens index moves from 1.42 to 1.427.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Gullstrand-LeGrand accommodation</caption>
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-1 pr-2 font-medium">State</th>
                <th className="py-1 pr-2 font-medium">Axial</th>
                <th className="py-1 pr-2 font-medium">Aqueous</th>
                <th className="py-1 pr-2 font-medium">Lens front</th>
                <th className="py-1 font-medium">Lens thick</th>
              </tr>
            </thead>
            <tbody>
              {GULLSTRAND.map((state) => (
                <tr key={state.name} className="border-t">
                  <td className="py-1 pr-2">{state.name}</td>
                  <td className="py-1 pr-2">{mm(gullstrandAxialMm(state), 5)}</td>
                  <td className="py-1 pr-2">{mm(state.aqueousMm, 2)}</td>
                  <td className="py-1 pr-2">{mm(state.lensFrontRadiusMm, 1)}</td>
                  <td className="py-1">{mm(state.lensThicknessMm, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
