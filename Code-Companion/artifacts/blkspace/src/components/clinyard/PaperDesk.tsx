import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { STUDY_DRILLS, scoreStudyDrill } from "@/lib/clinyard/paper-desk";

const SEAL = "/images/clinyard/uppsala-seal.png";

/**
 * One study question at a time. The seven papers are the source.
 * The desk does not diagnose or train a model.
 */
export function PaperDesk() {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState<boolean | null>(null);
  const drill = STUDY_DRILLS[index] ?? STUDY_DRILLS[0];

  const check = () => {
    if (checked !== null || choice === null) return;
    setChecked(scoreStudyDrill(drill, choice));
  };

  const next = () => {
    setChoice(null);
    setChecked(null);
    setIndex((n) => (n + 1) % STUDY_DRILLS.length);
  };

  return (
    <Card aria-labelledby="paper-desk-title">
      <CardHeader>
        <div className="flex items-center gap-3">
          <img
            src={SEAL}
            alt="Uppsala University seal"
            className="h-10 w-10 shrink-0 rounded-full bg-black object-contain"
          />
          <div>
            <h2 id="paper-desk-title" className="text-base font-semibold leading-none tracking-tight">
              Study drills
            </h2>
            <p className="text-xs text-muted-foreground">
              {index + 1} of {STUDY_DRILLS.length} · {drill.title}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{drill.prompt}</p>
        <div className="space-y-2">
          {drill.choices.map((label, i) => (
            <Button
              key={label}
              variant={choice === i ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => checked === null && setChoice(i)}
            >
              {label}
            </Button>
          ))}
        </div>
        {checked !== null && (
          <p className={checked ? "text-sm text-teal-600" : "text-sm text-amber-700"}>
            {checked ? "That matches the drill." : "Not yet."} {drill.explain}
          </p>
        )}
        <div className="flex gap-2">
          <Button onClick={check} disabled={checked !== null || choice === null}>
            Check
          </Button>
          <Button variant="outline" onClick={next}>
            Next drill
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
