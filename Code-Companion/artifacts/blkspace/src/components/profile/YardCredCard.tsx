import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Award, Building2, CheckCircle2, Handshake, Sparkles } from "lucide-react";
import { getYardCred } from "@/lib/project-connect";

/**
 * Profile-facing Yard Cred panel (credibility layer C1.3).
 * Score is not money — gates later finance; earned via real Connect activity.
 */
export function YardCredCard({ handle }: { handle: string }) {
  const { data: cred, isLoading } = useQuery({
    queryKey: ["connect", "cred", handle],
    queryFn: () => getYardCred(handle),
    enabled: !!handle,
  });

  if (isLoading) {
    return (
      <Card className="border-primary/10">
        <CardContent className="py-8 text-sm text-muted-foreground">
          Loading Yard Cred…
        </CardContent>
      </Card>
    );
  }

  if (!cred) {
    return (
      <Card className="border-primary/10">
        <CardContent className="py-8 text-sm text-muted-foreground">
          No credibility data yet.
        </CardContent>
      </Card>
    );
  }

  const score = Math.min(100, Math.max(0, cred.score));
  const rows = [
    {
      icon: Sparkles,
      label: "Karma (posts + replies)",
      value: cred.karma,
      hint: "Up to 25 pts of Cred",
    },
    {
      icon: CheckCircle2,
      label: "Completions",
      value: cred.completions,
      hint: "Opportunity work marked done",
    },
    {
      icon: Handshake,
      label: "Endorsements",
      value: cred.endorsements,
      hint: "Lead vouches after completion",
    },
    {
      icon: Building2,
      label: "Orgs joined",
      value: cred.orgsJoined,
      hint: "Purpose orgs on Connect",
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Yard Cred
            </CardTitle>
            <Badge className="text-base px-3 py-1 bg-primary/15 text-primary border-primary/30">
              {score}
              <span className="text-muted-foreground font-normal">/100</span>
            </Badge>
          </div>
          <CardDescription>
            Portable proof for ProjectConnect — not purchasable, not convertible
            to WeixBucks or BKSPC. Used later to gate serious cash-out paths.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Composite score</span>
              <span>{score}%</span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map((r) => (
              <li
                key={r.label}
                className="rounded-lg border border-border/60 p-3 space-y-1"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <r.icon className="h-4 w-4 text-primary" />
                  {r.label}
                </div>
                <p className="text-2xl font-semibold tabular-nums">{r.value}</p>
                <p className="text-[11px] text-muted-foreground">{r.hint}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Interests expressed:{" "}
            <span className="text-foreground font-medium">{cred.interests}</span>
            {" · "}
            Daily interest caps apply (anti-spam).
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/connect">
              <Button size="sm" className="gap-1.5">
                Browse opportunities
              </Button>
            </Link>
            <Link href="/connect/me">
              <Button size="sm" variant="outline">
                My Connect
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
