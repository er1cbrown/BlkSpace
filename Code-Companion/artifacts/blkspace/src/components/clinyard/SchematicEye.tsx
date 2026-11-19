import {
  schematicPoints,
  type FocusPrediction,
} from "@/lib/clinyard/vision-lab";

/**
 * Reduced-eye cross-section. Object space is to the left of P.
 * Positive millimetres run toward the retina.
 */
export function SchematicEye({
  focus,
  title,
}: {
  focus: FocusPrediction;
  title: string;
}) {
  const eye = schematicPoints(focus);
  const width = 420;
  const height = 176;
  const padL = 36;
  const padR = 20;
  const axis = 86;
  const minMm = eye.anteriorFocusMm - 1.5;
  const maxMm = Math.max(eye.posteriorFocusMm, eye.retinaMm) + 1.5;
  const xOf = (mm: number) =>
    padL + ((mm - minMm) / (maxMm - minMm)) * (width - padL - padR);

  const xF = xOf(eye.anteriorFocusMm);
  const xP = xOf(eye.principalMm);
  const xN = xOf(eye.nodalMm);
  const xFp = xOf(eye.posteriorFocusMm);
  const xR = xOf(eye.retinaMm);
  const close = Math.abs(xFp - xR) < 36;

  const globeRx = Math.max(8, (xR - xP) / 2);
  const globeCx = (xP + xR) / 2;

  const rayTop = axis - 28;
  const meetsInside = xFp <= xR;
  const yOnRetina =
    rayTop + ((xR - xP) / Math.max(xFp - xP, 0.001)) * (axis - rayTop);

  const nodalStartX = xF + 6;
  const nodalStartY = axis - 34;
  const nodalSlope = (axis - nodalStartY) / Math.max(xN - nodalStartX, 0.001);
  const nodalEndY = axis + nodalSlope * (xR - xN);

  const label = [
    `Reduced eye for ${title}.`,
    "Principal plane P at 0 mm.",
    `Nodal point N at ${eye.nodalMm} mm.`,
    `Anterior focus F at ${eye.anteriorFocusMm} mm.`,
    `Posterior focus F prime at ${eye.posteriorFocusMm} mm.`,
    `Retina at ${eye.retinaMm} mm.`,
    `F prime is ${eye.gap}.`,
  ].join(" ");

  return (
    <figure className="space-y-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        className="w-full rounded-md border bg-[#f8fafc]"
      >
        <ellipse
          cx={globeCx}
          cy={axis}
          rx={globeRx}
          ry="46"
          fill="#f8e7dc"
          stroke="#9a3412"
        />
        <path
          d={`M ${xP} ${axis - 16} Q ${xP - 14} ${axis} ${xP} ${axis + 16}`}
          fill="#fdba74"
          stroke="#9a3412"
        />
        <line
          x1={xF - 8}
          y1={axis}
          x2={Math.max(xFp, xR) + 10}
          y2={axis}
          stroke="#334155"
          strokeWidth="1"
        />
        <line
          x1={xP}
          y1={axis - 48}
          x2={xP}
          y2={axis + 48}
          stroke="#334155"
          strokeDasharray="3 2"
        />
        <line
          x1={nodalStartX}
          y1={nodalStartY}
          x2={xR}
          y2={nodalEndY}
          stroke="#1d4ed8"
          strokeWidth="1.4"
        />
        {meetsInside ? (
          <polyline
            points={`${xF},${rayTop} ${xP},${rayTop} ${xFp},${axis}`}
            fill="none"
            stroke="#0f766e"
            strokeWidth="1.6"
          />
        ) : (
          <>
            <polyline
              points={`${xF},${rayTop} ${xP},${rayTop} ${xR},${yOnRetina}`}
              fill="none"
              stroke="#0f766e"
              strokeWidth="1.6"
            />
            <line
              x1={xR}
              y1={yOnRetina}
              x2={xFp}
              y2={axis}
              stroke="#0f766e"
              strokeWidth="1.6"
              strokeDasharray="4 3"
            />
          </>
        )}
        <Point x={xF} y={axis} color="#0f766e" />
        <Point x={xN} y={axis} color="#1d4ed8" />
        <Point x={xFp} y={axis} color="#0f766e" />
        <Point x={xR} y={axis} color="#9f1239" />
        <TickLabel x={xF} y={18} text="F" />
        <TickLabel x={xP} y={18} text="P" />
        <TickLabel x={xN} y={148} text="N" />
        <TickLabel x={xFp} y={close ? 18 : 148} text="F′" />
        <TickLabel x={xR} y={close ? 148 : 18} text="R" />
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        F {eye.anteriorFocusMm} mm · P {eye.principalMm} · N {eye.nodalMm} mm ·
        F′ {eye.posteriorFocusMm} mm · retina {eye.retinaMm} mm. F′ is {eye.gap}.
        The teal ray is a distant ray bent at P toward F′. The blue ray passes
        through N and does not bend. Distances are from P. Object space is to
        the left.
      </figcaption>
    </figure>
  );
}

function Point({ x, y, color }: { x: number; y: number; color: string }) {
  return <circle cx={x} cy={y} r="3.5" fill={color} />;
}

function TickLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize="12" fill="#0f172a">
      {text}
    </text>
  );
}
