import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SchematicEye } from "@/components/clinyard/SchematicEye";
import {
  FALLING_GLUCOSE_NOTE,
  REFERRAL_NOTE,
} from "@/lib/clinyard/reading-notes";
import {
  LAB_SIZE,
  STUDY_PLATES,
  correctedSight,
  examChart,
  presentationBrief,
  runLab,
  scoreStudyPrompt,
  sightDrills,
  toggleStudyPlate,
  towerFor,
  type FundusPlate,
  type LabReport,
  type LesionMark,
  type PlateReadout,
  type SightView,
} from "@/lib/clinyard/vision-lab";

const CHART_ROWS = [
  { line: "20/200", letters: "E", px: 36 },
  { line: "20/100", letters: "F P", px: 26 },
  { line: "20/70", letters: "T O Z", px: 20 },
  { line: "20/40", letters: "L P E D", px: 15 },
  { line: "20/30", letters: "P E C F D", px: 12 },
  { line: "20/20", letters: "D E F P O T", px: 10 },
];

function FundusDrawing({
  lesions,
  title,
}: {
  lesions: LesionMark;
  title: string;
}) {
  return (
    <svg viewBox="0 0 160 160" role="img" aria-label={title} className="w-full">
      <rect width="160" height="160" fill="#120c09" />
      <circle cx="80" cy="80" r="58" fill="#c4552a" />
      <circle cx="80" cy="80" r="58" fill="#7a1f16" opacity="0.35" />
      <path
        d="M78 80 C90 62 112 58 128 64 M78 80 C92 96 114 104 126 98"
        fill="none"
        stroke="#f0c1a0"
        strokeWidth="2"
      />
      <circle cx="62" cy="78" r="10" fill="#f3d7b0" stroke="#e7b48a" />
      {lesions !== "none" && (
        <>
          <circle cx="96" cy="70" r="2" fill="#7a1020" />
          <circle cx="104" cy="86" r="2" fill="#7a1020" />
          <circle cx="90" cy="96" r="1.6" fill="#7a1020" />
        </>
      )}
      {(lesions === "moderate" || lesions === "severe" || lesions === "proliferative") && (
        <circle cx="108" cy="74" r="5" fill="#5c1020" opacity="0.85" />
      )}
      {(lesions === "severe" || lesions === "proliferative") && (
        <>
          <circle cx="70" cy="108" r="4" fill="#4a0c18" />
          <circle cx="112" cy="100" r="3.5" fill="#4a0c18" />
          <circle cx="100" cy="52" r="3" fill="#4a0c18" />
        </>
      )}
      {lesions === "proliferative" && (
        <>
          <path
            d="M108 74 C116 66 124 70 128 62"
            fill="none"
            stroke="#f2e1a0"
            strokeWidth="1.4"
          />
          <circle cx="88" cy="84" r="14" fill="#1a0a08" opacity="0.45" />
        </>
      )}
    </svg>
  );
}

function Scene({
  label,
  text,
  blur,
  haze,
  blotches,
}: {
  label: string;
  text: string;
  blur: number;
  haze: number;
  blotches: boolean;
}) {
  return (
    <figure className="space-y-1">
      <figcaption className="text-xs text-muted-foreground">
        {label} · blur {blur.toFixed(1)} px
      </figcaption>
      <div className="relative h-24 overflow-hidden rounded-md border bg-[#e7eef2]">
        <div
          className="flex h-full items-center justify-center text-3xl font-black tracking-[0.3em] text-[#14202b]"
          style={{ filter: `blur(${blur}px)` }}
        >
          {text}
        </div>
        <div
          className="pointer-events-none absolute inset-0 bg-[#c4552a]"
          style={{ opacity: haze }}
        />
        {blotches && (
          <>
            <span className="absolute left-6 top-4 h-6 w-6 rounded-full bg-[#2a0a08]/80" />
            <span className="absolute bottom-3 right-8 h-8 w-10 rounded-full bg-[#1a0806]/70" />
          </>
        )}
      </div>
    </figure>
  );
}

function EyeChart({ sight, label }: { sight: SightView; label: string }) {
  const chart = examChart(sight);
  const percent = Math.round(chart.goodScoreP * 100);
  return (
    <figure className="space-y-1">
      <figcaption className="text-xs text-muted-foreground">
        {label} · last line {chart.lastLine} · blur {sight.distantBlurPx.toFixed(1)} px
      </figcaption>
      <div
        className="relative overflow-hidden rounded-md border bg-white"
        role="img"
        aria-label={`Eye test chart. Probability of a good exam score ${percent} percent. Last line ${chart.lastLine}.`}
      >
        <div className="space-y-1 px-2 py-2">
          {CHART_ROWS.map((row) => (
            <div key={row.line} className="flex items-center justify-between gap-2">
              <span
                className="font-black tracking-[0.25em] text-black"
                style={{
                  fontSize: row.px,
                  filter: `blur(${sight.distantBlurPx}px)`,
                }}
              >
                {row.letters}
              </span>
              <span
                className={`text-[10px] ${row.line === chart.lastLine ? "font-semibold text-teal-700" : "text-slate-500"}`}
              >
                {row.line}
                {row.line === chart.lastLine ? " last" : ""}
              </span>
            </div>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-0 bg-[#c4552a]"
          style={{ opacity: sight.haze }}
        />
        {sight.blotches && (
          <>
            <span className="pointer-events-none absolute left-6 top-6 h-6 w-6 rounded-full bg-[#2a0a08]/80" />
            <span className="pointer-events-none absolute bottom-8 right-10 h-8 w-10 rounded-full bg-[#1a0806]/70" />
          </>
        )}
      </div>
      <p className="text-sm">
        Probability of a good exam score: {percent}%. {chart.note}
      </p>
    </figure>
  );
}

function ScoreField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PlateRow({
  readout,
  active,
  onPick,
}: {
  readout: PlateReadout;
  active: boolean;
  onPick: () => void;
}) {
  const { focus } = readout;
  return (
    <button
      type="button"
      onClick={onPick}
      className={`w-full rounded-lg border p-3 text-left ${active ? "border-teal-500" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">
          {readout.plate.title}{" "}
          <span className="text-muted-foreground">{readout.plate.id}</span>
        </p>
        <Badge variant="secondary">
          {readout.grade} {readout.gradeName}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        id_code {readout.score.idCode} · diagnosis {readout.score.diagnosis} ·
        level {readout.score.level} · {readout.group}
      </p>
      <p className="text-xs text-muted-foreground">
        {focus.state} · {focus.refractiveErrorD} D · F′ {focus.focusMm} mm ·
        retina {focus.retinaMm} mm · F′ is {readout.score.gap}
      </p>
    </button>
  );
}

function PlatePicker({
  plate,
  on,
  locked,
  onToggle,
}: {
  plate: FundusPlate;
  on: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={locked}
      onClick={onToggle}
      className={`rounded-lg border p-2 text-left disabled:opacity-40 ${on ? "border-teal-500" : ""}`}
    >
      <FundusDrawing lesions={plate.lesions} title={plate.title} />
      <p className="mt-1 text-sm font-medium">{plate.title}</p>
      <p className="text-xs text-muted-foreground">{plate.id}</p>
    </button>
  );
}

/**
 * Study module. Pick five drawings, run the same service on each, then
 * show the sight picture for one of them.
 */
export function VisionLab() {
  const [selected, setSelected] = useState<string[]>([]);
  const [report, setReport] = useState<LabReport | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [promptResult, setPromptResult] = useState<{
    ok: boolean;
    teach: string;
  } | null>(null);
  const [drillChoice, setDrillChoice] = useState<Record<string, number | null>>(
    {},
  );
  const [drillChecked, setDrillChecked] = useState<
    Record<string, boolean | null>
  >({});

  const full = selected.length >= LAB_SIZE;
  const active =
    report?.plates.find((plate) => plate.plate.id === activeId) ??
    report?.plates[0];

  const clearDrills = () => {
    setPromptResult(null);
    setDrillChoice({});
    setDrillChecked({});
  };

  const toggle = (id: string) => {
    setReport(null);
    setActiveId(null);
    setError(null);
    clearDrills();
    setSelected((current) => toggleStudyPlate(current, id));
  };

  const run = () => {
    try {
      const next = runLab(selected);
      setReport(next);
      setActiveId(next.plates[0]?.plate.id ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4 text-teal-500" />
          Vision lab
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pick five original fundus drawings. Each plate runs the same five
          services: preprocess, severity, label map, vergence, and the sight
          picture. The products are the score metadata (APTOS diagnosis and
          the five-class level), the schematic eye (P, N, F, F′, R), and a
          distant eye chart with the probability of a good exam score. Then the
          lab shows the picture after
          a teaching lens, scores two sight questions, and rejects a prompt that
          asks for a diagnosis.
          The first service crops the drawing the way the EfficientNet-B5
          notebook does, applies Ben Graham, and rounds a teaching regression
          to a grade. This page does
          not load those weights. The screening card below is the route that
          posts a file to a GPU host.
          None of this is a diagnosis or a glasses prescription.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            1 · Study set · {selected.length} of {LAB_SIZE}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STUDY_PLATES.map((plate) => {
              const on = selected.includes(plate.id);
              return (
                <PlatePicker
                  key={plate.id}
                  plate={plate}
                  on={on}
                  locked={full && !on}
                  onToggle={() => toggle(plate.id)}
                />
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">{FALLING_GLUCOSE_NOTE}</p>
          <Button type="button" onClick={run} disabled={!full}>
            Run these five
          </Button>
          {error && <p className="text-sm text-amber-700">{error}</p>}
        </section>

        {report && active && (
          <>
            <section className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                2 · Score metadata · five plates
              </p>
              <div className="space-y-2">
                {report.plates.map((plate) => (
                  <PlateRow
                    key={plate.plate.id}
                    readout={plate}
                    active={plate.plate.id === active.plate.id}
                    onPick={() => {
                      setActiveId(plate.plate.id);
                      clearDrills();
                    }}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                3 · {active.plate.title} · the same five services
              </p>
              <p className="text-sm">{active.plate.drawing}</p>
              {active.plate.id === "plate-g" && (
                <p className="text-sm text-muted-foreground">{FALLING_GLUCOSE_NOTE}</p>
              )}
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Score metadata
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-4">
                  <ScoreField label="id_code" value={active.score.idCode} />
                  <ScoreField label="diagnosis" value={String(active.score.diagnosis)} />
                  <ScoreField label="b5 score" value={String(active.b5.regression)} />
                  <ScoreField label="b5 grade" value={String(active.b5.rounded)} />
                  <ScoreField label="level" value={String(active.score.level)} />
                  <ScoreField label="class" value={active.score.className} />
                  <ScoreField label="referral" value={active.score.referral} />
                  <ScoreField label="field" value={active.score.field} />
                  <ScoreField label="glucose" value={active.score.glucose} />
                  <ScoreField
                    label="axial_mm"
                    value={String(active.score.axialMm)}
                  />
                  <ScoreField
                    label="cornea_D"
                    value={String(active.score.corneaD)}
                  />
                  <ScoreField label="lens_D" value={String(active.score.lensD)} />
                </dl>
                <p className="text-xs text-muted-foreground">
                  Class mass{" "}
                  {active.score.classMass
                    .map((mass, index) => `${index}:${mass.toFixed(2)}`)
                    .join("  ")}
                </p>
                <p className="text-xs text-muted-foreground">{active.score.note}</p>
                <p className="text-xs text-muted-foreground">{active.score.medium}</p>
              </div>
              <SchematicEye focus={active.focus} title={active.plate.title} />
              <p className="text-sm">
                Optical impairment: F′ is {active.score.gap} (
                {active.score.focusMinusRetinaMm} mm from the retina). P{" "}
                {active.score.principalMm} mm, N {active.score.nodalMm} mm, F{" "}
                {active.score.anteriorFocusMm} mm, F′{" "}
                {active.score.posteriorFocusMm} mm, R {active.score.retinaMm} mm.
              </p>
              <p className="text-sm">
                Retinal impairment: {active.score.retinal}. {active.focus.afterFocus}
              </p>
              <p className="text-sm">
                The distant eye chart uses this F′–R gap. A good exam score is
                the 20/30 line. Probability on this plate:{" "}
                {Math.round(examChart(active.sight).goodScoreP * 100)}%.
              </p>
              <ol className="space-y-2">
                {towerFor(active).map((step, index) => (
                  <li key={step.id} className="rounded-md border p-2">
                    <p className="text-sm font-medium">
                      {index + 1}. {step.service}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.from}</p>
                    <p className="text-sm">{step.output}</p>
                  </li>
                ))}
              </ol>
              <p className="text-sm text-muted-foreground">
                {active.focus.afterFocus} {active.focus.correction} About{" "}
                {(active.focus.airCorneaReflectance * 100).toFixed(1)}% of a
                straight-on ray reflects at the air-cornea surface. A{" "}
                {active.focus.snell.airDegrees}° ray in air is{" "}
                {active.focus.snell.corneaDegrees}° inside the cornea.
              </p>
            </section>

            <section className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                4 · Eye test chart
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <EyeChart sight={active.sight} label="Distant eye chart" />
                <Scene
                  label="Near card"
                  text="opt"
                  blur={active.sight.nearBlurPx}
                  haze={active.sight.haze}
                  blotches={active.sight.blotches}
                />
              </div>
              <p className="text-sm">{active.sight.mitigation}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                After the teaching lens
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <EyeChart
                  sight={correctedSight(active.sight)}
                  label="Distant eye chart"
                />
                <Scene
                  label="Near card"
                  text="opt"
                  blur={correctedSight(active.sight).nearBlurPx}
                  haze={correctedSight(active.sight).haze}
                  blotches={correctedSight(active.sight).blotches}
                />
              </div>
              <p className="text-sm">{correctedSight(active.sight).mitigation}</p>
            </section>

            <section className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                5 · Drills on this plate
              </p>
              {sightDrills(active).map((drill) => (
                <div key={drill.id} className="space-y-2">
                  <p className="text-sm">{drill.prompt}</p>
                  <div className="flex flex-wrap gap-2">
                    {drill.choices.map((choice, index) => (
                      <Button
                        key={choice}
                        type="button"
                        size="sm"
                        variant={drillChoice[drill.id] === index ? "default" : "outline"}
                        onClick={() =>
                          setDrillChoice((current) => ({
                            ...current,
                            [drill.id]: index,
                          }))
                        }
                      >
                        {choice}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const picked = drillChoice[drill.id];
                      if (picked === undefined || picked === null) return;
                      setDrillChecked((current) => ({
                        ...current,
                        [drill.id]: picked === drill.answerIndex,
                      }));
                    }}
                  >
                    Check {drill.id === "which-blur" ? "blur" : "diopter"}
                  </Button>
                  {drillChecked[drill.id] !== undefined &&
                    drillChecked[drill.id] !== null && (
                      <p
                        className={
                          drillChecked[drill.id]
                            ? "text-sm text-teal-600"
                            : "text-sm text-amber-700"
                        }
                      >
                        {drillChecked[drill.id] ? "That matches." : "Not yet."}{" "}
                        {drill.teach}
                      </p>
                    )}
                </div>
              ))}
              <div className="space-y-2">
                <p className="text-sm">
                  Write one study sentence. Include the grade and the refractive
                  error. A prompt that asks for a diagnosis, a prescription, or
                  an identifier is rejected.
                </p>
                <Textarea
                  aria-label="Study prompt"
                  value={prompt}
                  onChange={(event) => {
                    setPrompt(event.target.value);
                    setPromptResult(null);
                  }}
                  placeholder="Grade 2 on this teaching plate, refractive error -6.13 D."
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPromptResult(scoreStudyPrompt(prompt))}
                >
                  Check prompt
                </Button>
                {promptResult && (
                  <p
                    className={
                      promptResult.ok
                        ? "text-sm text-teal-600"
                        : "text-sm text-amber-700"
                    }
                  >
                    {promptResult.ok ? "Accepted." : "Rejected."}{" "}
                    {promptResult.teach}
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                6 · The five as a set
              </p>
              <p className="text-sm">
                Grades 0–4: {report.gradeCounts.join(", ")}. Referable plates:{" "}
                {report.referable} of {report.n}. Mean refractive error{" "}
                {report.meanErrorD} D.
              </p>
              <p className="text-sm text-muted-foreground">{report.comparison}</p>
              <p className="text-sm text-muted-foreground">{report.setScore}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">
                    Score metadata and schematic-eye points for the five plates
                  </caption>
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="py-1 pr-2 font-medium">id_code</th>
                      <th className="py-1 pr-2 font-medium">diagnosis</th>
                      <th className="py-1 pr-2 font-medium">level</th>
                      <th className="py-1 pr-2 font-medium">referral</th>
                      <th className="py-1 pr-2 font-medium">F′</th>
                      <th className="py-1 pr-2 font-medium">R</th>
                      <th className="py-1 pr-2 font-medium">gap</th>
                      <th className="py-1 font-medium">P(good)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.plates.map((plate) => (
                      <tr key={plate.score.idCode} className="border-t">
                        <td className="py-1 pr-2">{plate.score.idCode}</td>
                        <td className="py-1 pr-2">{plate.score.diagnosis}</td>
                        <td className="py-1 pr-2">{plate.score.level}</td>
                        <td className="py-1 pr-2">{plate.score.referral}</td>
                        <td className="py-1 pr-2">{plate.score.posteriorFocusMm}</td>
                        <td className="py-1 pr-2">{plate.score.retinaMm}</td>
                        <td className="py-1 pr-2">{plate.score.gap}</td>
                        <td className="py-1">
                          {Math.round(examChart(plate.sight).goodScoreP * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-muted-foreground">{REFERRAL_NOTE}</p>
              </div>
              <Textarea
                aria-label="Presentation note"
                readOnly
                value={presentationBrief(report)}
                className="min-h-36 text-xs"
              />
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
