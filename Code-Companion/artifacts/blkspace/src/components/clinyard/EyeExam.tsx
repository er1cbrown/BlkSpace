import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchematicEye } from "@/components/clinyard/SchematicEye";
import { GLUCOSE_NOTE } from "@/lib/clinyard/reading-notes";
import {
  STUDY_PLATES,
  examChart,
  predictFocus,
  sightView,
  type FocusPrediction,
  type Glucose,
  type SightView,
  type StudyGrade,
} from "@/lib/clinyard/vision-lab";

const ROWS: { line: string; letters: string[]; px: number }[] = [
  { line: "20/200", letters: ["E"], px: 36 },
  { line: "20/100", letters: ["F", "P"], px: 26 },
  { line: "20/70", letters: ["T", "O", "Z"], px: 20 },
  { line: "20/40", letters: ["L", "P", "E", "D"], px: 15 },
  { line: "20/30", letters: ["P", "E", "C", "F", "D"], px: 12 },
  { line: "20/20", letters: ["D", "E", "F", "P", "O", "T"], px: 10 },
];

const SLOAN = ["C", "D", "E", "F", "L", "N", "O", "P", "T", "Z"] as const;

const PROMPTS = ROWS.flatMap((row) =>
  row.letters.map((letter) => ({ line: row.line, letter })),
);

type Screen = "menu" | "practice" | "exam" | "result";

interface Draft {
  title: string;
  axialMm: number;
  corneaD: number;
  lensD: number;
  glucose: Glucose;
  grade: StudyGrade;
}

function draftFromPlate(index: number): Draft {
  const plate = STUDY_PLATES[index] ?? STUDY_PLATES[0];
  return {
    title: plate.title,
    axialMm: plate.axialMm,
    corneaD: plate.corneaD,
    lensD: plate.lensD,
    glucose: plate.glucose,
    grade: plate.grade,
  };
}

function clamp(n: number, lo: number, hi: number, digits: number): number {
  const m = 10 ** digits;
  return Math.round(Math.min(hi, Math.max(lo, n)) * m) / m;
}

function nextGlucose(glucose: Glucose): Glucose {
  if (glucose === "normal") return "high";
  if (glucose === "high") return "falling";
  return "normal";
}

function clearedLine(correct: number): string | null {
  let seen = 0;
  let line: string | null = null;
  for (const row of ROWS) {
    if (correct >= seen + row.letters.length) {
      line = row.line;
      seen += row.letters.length;
    } else {
      break;
    }
  }
  return line;
}

function ChartFace({
  sight,
  cursor,
}: {
  sight: SightView;
  cursor: number | null;
}) {
  let index = 0;
  return (
    <div className="relative overflow-hidden rounded-md border bg-white">
      <div className="space-y-1 px-2 py-2">
        {ROWS.map((row) => (
          <div key={row.line} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              {row.letters.map((letter) => {
                const here = index;
                index += 1;
                const current = cursor === here;
                return (
                  <span
                    key={`${row.line}-${here}`}
                    className={current ? "border-b-2 border-teal-600" : ""}
                  >
                    <span
                      className="inline-block font-black text-black"
                      style={{
                        fontSize: row.px,
                        filter: `blur(${sight.distantBlurPx}px)`,
                      }}
                    >
                      {letter}
                    </span>
                  </span>
                );
              })}
            </span>
            <span className="text-[10px] text-slate-500">{row.line}</span>
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
  );
}

/**
 * Playable teaching exam on the ClinYard page.
 * The diopter comes from vergence. The grade does not enter that equation.
 */
export function EyeExam() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [draft, setDraft] = useState<Draft>(() => draftFromPlate(0));
  const [cursor, setCursor] = useState(0);
  const [correct, setCorrect] = useState(0);

  const focus: FocusPrediction = predictFocus(
    draft.axialMm,
    draft.corneaD,
    draft.lensD,
    draft.glucose,
    draft.grade,
  );
  const sight = sightView(focus.refractiveErrorD, draft.grade);
  const chart = examChart(sight);
  const percent = Math.round(chart.goodScoreP * 100);
  const prompt = PROMPTS[cursor];

  const answer = (letter: string) => {
    if (screen !== "exam" || !prompt) return;
    if (letter === prompt.letter) {
      const next = cursor + 1;
      setCorrect((n) => n + 1);
      setCursor(next);
      if (next >= PROMPTS.length) setScreen("result");
    } else {
      setScreen("result");
    }
  };

  useEffect(() => {
    if (screen !== "exam") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const letter = event.key.toUpperCase();
      if ((SLOAN as readonly string[]).includes(letter)) answer(letter);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const startPractice = () => {
    setDraft(draftFromPlate(0));
    setScreen("practice");
  };

  const startExam = () => {
    setDraft(draftFromPlate(Math.floor(Math.random() * STUDY_PLATES.length)));
    setCursor(0);
    setCorrect(0);
    setScreen("exam");
  };

  const playerLine = clearedLine(correct) ?? "no line";
  const same = clearedLine(correct) === chart.lastLine;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4 text-teal-500" />
          Eye exam simulator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Read the distant chart through this teaching eye. Practice shows the
          schematic eye. The exam hides it until you miss a letter or finish
          the chart. Teaching model. Not a diagnosis and not a glasses
          prescription.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setScreen("menu")}>
            Menu
          </Button>
          <Button type="button" size="sm" onClick={startPractice}>
            Practice
          </Button>
          <Button type="button" size="sm" onClick={startExam}>
            Exam
          </Button>
        </div>

        {screen === "menu" && (
          <p className="text-sm">
            Practice moves the eye and watches the chart smear. Exam asks you
            to type the marked letter. Sloan letters: C D E F L N O P T Z.
          </p>
        )}

        {screen === "practice" && (
          <div className="space-y-2">
            <p className="text-sm">
              {draft.title}. Axial {draft.axialMm.toFixed(1)} mm, cornea{" "}
              {draft.corneaD.toFixed(1)} D, lens {draft.lensD.toFixed(1)} D,{" "}
              glucose {draft.glucose}, grade {draft.grade}.{" "}
              {focus.refractiveErrorD.toFixed(2)} D {focus.state}. F′ is{" "}
              {focus.focusMinusRetinaMm.toFixed(2)} mm from the retina.
            </p>
            <p className="text-sm">
              Probability of a good exam score: {percent}%. Last line{" "}
              {chart.lastLine}.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((eye) => ({
                    ...eye,
                    title: "Practice eye",
                    axialMm: clamp(eye.axialMm - 0.1, 18, 30, 1),
                  }))
                }
              >
                Axial shorter
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((eye) => ({
                    ...eye,
                    title: "Practice eye",
                    axialMm: clamp(eye.axialMm + 0.1, 18, 30, 1),
                  }))
                }
              >
                Axial longer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((eye) => ({
                    ...eye,
                    title: "Practice eye",
                    lensD: clamp(eye.lensD + 0.5, 5, 35, 1),
                  }))
                }
              >
                Lens up
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((eye) => ({
                    ...eye,
                    title: "Practice eye",
                    lensD: clamp(eye.lensD - 0.5, 5, 35, 1),
                  }))
                }
              >
                Lens down
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((eye) => ({
                    ...eye,
                    title: "Practice eye",
                    corneaD: clamp(eye.corneaD - 0.5, 30, 55, 1),
                  }))
                }
              >
                Cornea flatter
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((eye) => ({
                    ...eye,
                    title: "Practice eye",
                    corneaD: clamp(eye.corneaD + 0.5, 30, 55, 1),
                  }))
                }
              >
                Cornea steeper
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((eye) => ({
                    ...eye,
                    title: "Practice eye",
                    glucose: nextGlucose(eye.glucose),
                  }))
                }
              >
                Glucose
              </Button>
              <p className="w-full text-sm text-muted-foreground">{GLUCOSE_NOTE}</p>
              {([0, 1, 2, 3, 4] as StudyGrade[]).map((grade) => (
                <Button
                  key={grade}
                  type="button"
                  size="sm"
                  variant={draft.grade === grade ? "default" : "outline"}
                  onClick={() =>
                    setDraft((eye) => ({ ...eye, title: "Practice eye", grade }))
                  }
                >
                  Grade {grade}
                </Button>
              ))}
            </div>
            <SchematicEye focus={focus} title={draft.title} />
            <ChartFace sight={sight} cursor={null} />
          </div>
        )}

        {screen === "exam" && prompt && (
          <div className="space-y-2">
            <p className="text-sm">
              The eye is hidden. Type the letter on {prompt.line}. Letters
              correct: {correct}. A miss ends the exam and opens the eye.
            </p>
            <ChartFace sight={sight} cursor={cursor} />
            <div className="flex flex-wrap gap-2">
              {SLOAN.map((letter) => (
                <Button
                  key={letter}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => answer(letter)}
                >
                  {letter}
                </Button>
              ))}
            </div>
          </div>
        )}

        {screen === "result" && (
          <div className="space-y-2">
            <p className="text-sm">
              {draft.title}. You cleared {playerLine}. Model last line{" "}
              {chart.lastLine}. Probability of a good exam score: {percent}%.
            </p>
            <p className="text-sm">
              {focus.refractiveErrorD.toFixed(2)} D {focus.state}.{" "}
              {focus.where}{" "}
              {same
                ? "Your read matches the model cutoff."
                : "Your read and the model cutoff differ. Blur, haze, and grade-4 blotches move the last clear line."}
            </p>
            <SchematicEye focus={focus} title={draft.title} />
            <ChartFace sight={sight} cursor={null} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
