import { useState } from "react";
import { ScanEye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchematicEye } from "@/components/clinyard/SchematicEye";
import {
  GLAUCOMA_SETS,
  GRADE_CHOICES,
  OPTICS_PATH,
  cvss17Level,
  lensLine,
} from "@/lib/clinyard/optics-path";
import { cvsqBand, readScore } from "@/lib/clinyard/paper-desk";
import {
  predictFocus,
  referralGroup,
  type Glucose,
  type StudyGrade,
} from "@/lib/clinyard/vision-lab";

const GLUCOSE_CHOICES: { id: Glucose; label: string }[] = [
  { id: "normal", label: "Normal, 0 D" },
  { id: "high", label: "High, +1.5 D" },
  { id: "falling", label: "Falling, −0.75 D" },
];

function step(id: string) {
  const found = OPTICS_PATH.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown optics step: ${id}`);
  return found;
}

/** One card. The fundus picture does not drive the diopter. */
export function OpticsPath() {
  const [axialMm, setAxialMm] = useState(22.3);
  const [corneaD, setCorneaD] = useState(43);
  const [lensD, setLensD] = useState(17);
  const [glucose, setGlucose] = useState<Glucose>("normal");
  const [grade, setGrade] = useState<StudyGrade>(0);
  const [cvsqRaw, setCvsqRaw] = useState("19");
  const [cvssRaw, setCvssRaw] = useState("");

  const focus = predictFocus(axialMm, corneaD, lensD, glucose, grade);
  const cvsq = cvsqBand(readScore(cvsqRaw) ?? Number.NaN);
  const cvssScore = readScore(cvssRaw);
  const cvss = cvssScore === null ? null : cvss17Level(cvssScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ScanEye className="w-4 h-4 text-teal-500" />
          Optics path
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Fundus, schematic eye, digital eye strain, diabetic retinopathy,
          glaucoma, then cataract. Teaching practice. Not a diagnosis.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="space-y-1">
          <h3 className="text-sm font-medium">1. {step("fundus").title}</h3>
          <p className="text-sm text-muted-foreground">{step("fundus").body}</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">2. {step("schematic").title}</h3>
          <p className="text-sm text-muted-foreground">{step("schematic").body}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs text-muted-foreground">
              Axial length, mm
              <input
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
                type="number"
                min={18}
                max={30}
                step={0.1}
                value={axialMm}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) setAxialMm(Math.min(30, Math.max(18, next)));
                }}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Cornea, D
              <input
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
                type="number"
                min={30}
                max={55}
                step={0.5}
                value={corneaD}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) setCorneaD(Math.min(55, Math.max(30, next)));
                }}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Lens, D
              <input
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
                type="number"
                min={5}
                max={35}
                step={0.5}
                value={lensD}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) setLensD(Math.min(35, Math.max(5, next)));
                }}
              />
            </label>
          </div>
          <label className="block text-xs text-muted-foreground">
            Glucose preset
            <select
              className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
              value={glucose}
              onChange={(event) => setGlucose(event.target.value as Glucose)}
            >
              {GLUCOSE_CHOICES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <SchematicEye focus={focus} title="the optics path" />
          <p className="text-sm" data-testid="path-error">
            {focus.refractiveErrorD} D · {focus.state}
          </p>
          <p className="text-sm text-muted-foreground">
            {focus.where} Glucose shift {focus.osmoticD} D. The grade does not
            change this diopter.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">3. {step("strain").title}</h3>
          <p className="text-sm text-muted-foreground">{step("strain").body}</p>
          <label className="block text-xs text-muted-foreground">
            CVS-Q total
            <input
              className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
              inputMode="decimal"
              value={cvsqRaw}
              onChange={(event) => setCvsqRaw(event.target.value)}
            />
          </label>
          {cvsq && (
            <p className="text-sm">
              <span className="font-medium">{cvsq.label}.</span> {cvsq.detail}
            </p>
          )}
          <label className="block text-xs text-muted-foreground">
            CVSS-17 total
            <input
              className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
              inputMode="decimal"
              value={cvssRaw}
              onChange={(event) => setCvssRaw(event.target.value)}
            />
          </label>
          {cvss && (
            <p className="text-sm">
              <span className="font-medium">{cvss.label}.</span> {cvss.detail}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">4. {step("dr").title}</h3>
          <p className="text-sm text-muted-foreground">{step("dr").body}</p>
          <label className="block text-xs text-muted-foreground">
            Retinopathy grade
            <select
              className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
              value={grade}
              onChange={(event) => setGrade(Number(event.target.value) as StudyGrade)}
            >
              {GRADE_CHOICES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <Badge variant="secondary">{referralGroup(grade)}</Badge>
          <p className="text-sm text-muted-foreground">{focus.afterFocus}</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">5. {step("glaucoma").title}</h3>
          <p className="text-sm text-muted-foreground">{step("glaucoma").body}</p>
          <ul className="space-y-1">
            {GLAUCOMA_SETS.map((set) => (
              <li key={set.id} className="text-sm">
                <span className="font-medium">{set.title}.</span> {set.use}.
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-1">
          <h3 className="text-sm font-medium">6. {step("cataract").title}</h3>
          <p className="text-sm">{lensLine(focus.lensD, focus.osmoticD)}</p>
          <p className="text-sm text-muted-foreground">{step("cataract").body}</p>
        </section>
      </CardContent>
    </Card>
  );
}
