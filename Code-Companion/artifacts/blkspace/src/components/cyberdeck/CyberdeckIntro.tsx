import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DECK_INTRO,
  DECK_LAYERS,
  DECK_PHASES,
  nextDeckPhase,
} from "@/lib/cyberdeck-intro";

export function CyberdeckIntro() {
  const next = nextDeckPhase();

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {DECK_INTRO.kicker}
        </p>
        <h1 className="text-3xl font-black tracking-tight">{DECK_INTRO.title}</h1>
        <p className="text-muted-foreground leading-relaxed">{DECK_INTRO.lede}</p>
        <Badge variant="outline">{DECK_INTRO.status}</Badge>
        <p className="text-sm text-muted-foreground">{DECK_INTRO.statusDetail}</p>
        <p className="text-sm">
          <Link href="/maps" className="text-primary underline-offset-4 hover:underline">
            Open the map
          </Link>
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hardware kit</CardDescription>
            <CardTitle className="text-xl">{DECK_INTRO.hardware}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pi 5, GPS module, power, and a case. A 7-inch screen sits at the top
            of that range.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Storage and spares</CardDescription>
            <CardTitle className="text-xl">{DECK_INTRO.extras}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Room for one state map extract, plus a spare antenna if the first
            module is noisy in the car.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Written in this app</CardDescription>
            <CardTitle className="text-xl">{DECK_INTRO.hours}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your time. The map draws a line when local OSRM answers. The car
            receiver is still the bench test.
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Build order</h2>
        <ol className="space-y-3">
          {DECK_LAYERS.map((layer, index) => (
            <li key={layer.id}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">
                      {index + 1}. {layer.name}
                    </CardTitle>
                    <Badge variant={layer.required ? "default" : "secondary"}>
                      {layer.required ? "Required" : "Later"}
                    </Badge>
                  </div>
                  <CardDescription>{layer.tech}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {layer.role}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Winter phases</h2>
        <ol className="space-y-3">
          {DECK_PHASES.map((phase) => {
            const current = phase.id === next.id;
            return (
              <li key={phase.id}>
                <Card className={current ? "border-primary" : undefined}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">{phase.title}</CardTitle>
                      <Badge variant={current ? "default" : "outline"}>
                        {current ? "Next" : "Later"} · {phase.hours} h
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {phase.doneWhen}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="text-sm text-muted-foreground">
        Reticulum in BlkSpace is a local note spool. It does not carry the
        route.{" "}
        <Link href="/mesh-test" className="text-primary underline-offset-4 hover:underline">
          Open the sync test
        </Link>
        .
      </p>
    </div>
  );
}
