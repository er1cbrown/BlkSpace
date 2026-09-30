import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { NO_PHI_POLICY } from "@/lib/identity-ethics";
import {
  CLINYARD_ITEMS,
  DRILL_MODES,
  filterDrills,
  scoreChoice,
  scoreReport,
  scoreSteps,
  type DrillMode,
} from "@/lib/clinyard/tasks";
import { HeartPulse } from "lucide-react";

/**
 * Offline study desk. Four short drills a browser can score.
 * ClinFusion weights are not loaded.
 */
export default function ClinyardPage() {
  const [mode, setMode] = useState<DrillMode | "all">("all");
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [report, setReport] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [attempted, setAttempted] = useState(0);

  const items = useMemo(() => filterDrills(CLINYARD_ITEMS, mode), [mode]);
  const item = items[index] ?? items[0];

  const resetAnswer = () => {
    setChoice(null);
    setPicked([]);
    setReport("");
    setChecked(null);
  };

  const check = () => {
    if (!item || checked !== null) return;
    let ok = false;
    if (item.mode === "mcq" || item.mode === "image_vqa") {
      if (choice === null) return;
      ok = scoreChoice(item, choice);
    } else if (item.mode === "instruction") {
      ok = scoreSteps(item, picked);
    } else {
      ok = scoreReport(item, report);
    }
    setChecked(ok);
    setAttempted((n) => n + 1);
    if (ok) setCorrectCount((n) => n + 1);
  };

  const next = () => {
    resetAnswer();
    setIndex((n) => (n + 1) % items.length);
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-teal-500" />
            ClinYard
          </h1>
          <Badge variant="secondary">
            {correctCount}/{attempted} this visit
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Four practice drills for pre-med, med, and nursing study. They run in
          this browser. ClinFusion, the open medical model these formats come
          from, is not loaded here.
        </p>
        <Card className="border-amber-500/30">
          <CardContent className="pt-4 text-sm">
            <p className="font-medium">{NO_PHI_POLICY.title}</p>
            <p className="text-muted-foreground mt-1">{NO_PHI_POLICY.body}</p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {DRILL_MODES.map((chip) => (
            <Button
              key={chip.id}
              size="sm"
              variant={mode === chip.id ? "default" : "outline"}
              onClick={() => {
                setMode(chip.id);
                setIndex(0);
                resetAnswer();
              }}
            >
              {chip.label}
            </Button>
          ))}
        </div>

        {item && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{item.prompt}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {item.organ} · {item.hardness}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.imageAsset && (
                <img
                  src={item.imageAsset}
                  alt="Teaching chest drawing with letters A and B"
                  className="w-full max-w-sm rounded-lg border"
                />
              )}
              {item.choices && (
                <div className="space-y-2">
                  {item.choices.map((label, i) => (
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
              )}
              {item.steps && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Your order: {picked.join(" → ") || "none yet"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.steps
                      .filter((step) => !picked.includes(step))
                      .map((step) => (
                        <Button
                          key={step}
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            checked === null && setPicked((list) => [...list, step])
                          }
                        >
                          {step}
                        </Button>
                      ))}
                  </div>
                </div>
              )}
              {item.mode === "report" && (
                <Textarea
                  value={report}
                  onChange={(event) => setReport(event.target.value)}
                  placeholder="One sentence. Include heart and effusion."
                  disabled={checked !== null}
                />
              )}
              {checked !== null && (
                <p className={checked ? "text-sm text-teal-600" : "text-sm text-amber-700"}>
                  {checked ? "That matches the drill." : "Not yet."} {item.modelAnswer}
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={check} disabled={checked !== null}>
                  Check
                </Button>
                <Button variant="outline" onClick={next}>
                  Next drill
                </Button>
                <Link href="/focus">
                  <Button variant="ghost">Focus</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
