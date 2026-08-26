import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  FOCUS_JOURNEY_STEPS,
  budgetPct,
  isLowBandwidthOpp,
  loadFocusPrefs,
  logFocusMinutes,
  minutesRemaining,
  saveFocusPrefs,
  type FocusPrefs,
} from "@/lib/focus-mode";
import { listHubItems } from "@/lib/content-hub";
import {
  expressInterest,
  listOpportunities,
  getYardCred,
} from "@/lib/project-connect";
import { getCurrentHandle } from "@/lib/auth";
import { useGuestMode } from "@/lib/guest-mode";
import { LITERACY_PRINCIPLES } from "@/lib/earn-literacy";
import { BRAND } from "@/lib/brand";
import { isSafeHttpUrl } from "@/lib/amalgamation-meta";
import {
  ArrowRight,
  Clock,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  Layers,
  Sparkles,
  Wallet,
  ExternalLink,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Focus Path — Meharry med / busy underrepresented student.
 * Efficient ProjectConnect + study-refresh media + time/money effort.
 */
export default function FocusPage() {
  const { isGuest } = useGuestMode();
  const handle = getCurrentHandle() || "demo_user";
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState<FocusPrefs>(() => loadFocusPrefs());
  const [budgetEdit, setBudgetEdit] = useState(
    String(prefs.weeklyMinutesBudget),
  );

  const { data: opps = [] } = useQuery({
    queryKey: ["connect", "opps", "focus"],
    queryFn: () => listOpportunities({}),
  });
  const { data: cred } = useQuery({
    queryKey: ["connect", "cred", handle],
    queryFn: () => getYardCred(handle),
  });

  const studyItems = useMemo(() => {
    const all = listHubItems("all");
    return all
      .filter(
        (i) => i.topic === "med" || i.topic === "study" || i.topic === "pro",
      )
      .slice(0, 8);
  }, [prefs.studyOnlyFeed]);

  const connectCards = useMemo(() => {
    let list = opps.filter((o) => o.status === "open");
    if (prefs.lowBandwidthConnect) {
      const low = list.filter(isLowBandwidthOpp);
      list = low.length ? low : list;
    }
    // Prefer meharry / med / research
    list = [...list].sort((a, b) => {
      const score = (o: typeof a) => {
        const t = `${o.title} ${o.orgName} ${o.description}`.toLowerCase();
        let s = 0;
        if (t.includes("meharry")) s += 5;
        if (t.includes("med") || t.includes("clinical") || t.includes("health"))
          s += 3;
        if (o.orgType === "research") s += 2;
        if (isLowBandwidthOpp(o)) s += 2;
        return s;
      };
      return score(b) - score(a);
    });
    return list.slice(0, 5);
  }, [opps, prefs.lowBandwidthConnect]);

  const express = useMutation({
    mutationFn: (opportunityId: number) =>
      expressInterest({
        opportunityId,
        message:
          "Low-bandwidth interest from Focus Path — med/rotations-aware. Prefer async or micro-hours.",
        skillsSnapshot:
          "med student · underrepresented network · Meharry-aware",
        classification: "graduate",
        gpa: "",
        gpaShared: false,
      }),
    onSuccess: () => {
      toast.success("Interest sent in ~2 min — no coffee-chat required");
      logFocusMinutes(2);
      setPrefs(loadFocusPrefs());
      qc.invalidateQueries({ queryKey: ["connect"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remaining = minutesRemaining(prefs);
  const pct = budgetPct(prefs);

  const persist = (next: FocusPrefs) => {
    saveFocusPrefs(next);
    setPrefs(next);
  };

  return (
    <AppShell wide>
      <div className="space-y-6 max-w-4xl">
        {/* Hero */}
        <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 space-y-3">
          <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
            <HeartPulse className="w-3 h-3" />
            Focus Path · Med / busy campus
          </Badge>
          <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
            Meharry energy. Efficient {BRAND.name}.
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            You want underrepresented network connection through{" "}
            <strong className="text-foreground">ProjectConnect</strong>, a feed
            that still refreshes school when you&apos;re off campus, and{" "}
            <strong className="text-foreground">time + money effort</strong>{" "}
            management — not eight apps, not coin casino theater. Soft{" "}
            <strong className="text-foreground">WeixBucks</strong>,{" "}
            <strong className="text-foreground">Yard Cred</strong>, and gated{" "}
            <strong className="text-foreground">BKSPC</strong> literacy when you
            have five minutes — not when you&apos;re in clinic.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{prefs.campusLabel}</Badge>
            <Badge variant="secondary">Yard · {prefs.yardId}</Badge>
            {cred && (
              <Badge variant="secondary">
                Cred ·{" "}
                <span className="text-primary font-bold">{cred.score}</span>
              </Badge>
            )}
          </div>
        </section>

        {/* Time + money effort */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-primary/15">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Time effort (this week)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  Soft BKSPC minutes
                </span>
                <span className="font-medium tabular-nums">
                  {prefs.weeklyMinutesUsed} / {prefs.weeklyMinutesBudget} min
                </span>
              </div>
              <Progress value={pct} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {remaining} min left in your intentional budget. Protect
                rotations — log sessions when you show up here on purpose.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const p = logFocusMinutes(10);
                    setPrefs(p);
                    toast.message("Logged 10 min Focus session");
                  }}
                >
                  Log 10 min
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const p = logFocusMinutes(20);
                    setPrefs(p);
                    toast.message("Logged 20 min study-refresh");
                  }}
                >
                  Log 20 min study
                </Button>
              </div>
              <div className="flex items-end gap-2 pt-1">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Weekly budget (minutes)</Label>
                  <Input
                    type="number"
                    value={budgetEdit}
                    onChange={(e) => setBudgetEdit(e.target.value)}
                    className="h-8"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const n = Math.max(30, parseInt(budgetEdit, 10) || 90);
                    persist({ ...prefs, weeklyMinutesBudget: n });
                    toast.success(`Budget set to ${n} min/week`);
                  }}
                >
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/15">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                Money effort (literacy, not FOMO)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <p>
                Underrepresented communities deserve{" "}
                <strong className="text-foreground">economics education</strong>{" "}
                that respects the Black dollar, soft campus credits (
                {BRAND.softCurrency}), and optional coin rights ({BRAND.symbol})
                — without forcing you to day-trade during boards.
              </p>
              <ul className="space-y-2">
                {LITERACY_PRINCIPLES.slice(0, 3).map((p) => (
                  <li
                    key={p.title}
                    className="border-l-2 border-primary/30 pl-2"
                  >
                    <span className="font-medium text-foreground">
                      {p.title}.
                    </span>{" "}
                    {p.body}
                  </li>
                ))}
              </ul>
              <Link href="/wallet">
                <Button size="sm" variant="outline" className="gap-1 w-full">
                  Open Earnings · How to Earn
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Toggles */}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="low-bw"
                checked={prefs.lowBandwidthConnect}
                onCheckedChange={(v) =>
                  persist({ ...prefs, lowBandwidthConnect: v })
                }
              />
              <Label htmlFor="low-bw" className="text-sm">
                Low-bandwidth ProjectConnect (async / micro-hours first)
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="study-only"
                checked={prefs.studyOnlyFeed}
                onCheckedChange={(v) => persist({ ...prefs, studyOnlyFeed: v })}
              />
              <Label htmlFor="study-only" className="text-sm">
                Prefer study / med Hub refresh
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Journey */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            How you use {BRAND.name} without burning out
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {FOCUS_JOURNEY_STEPS.map((s, i) => (
              <Link key={s.id} href={s.href}>
                <Card className="h-full hover:border-primary/40 transition-colors cursor-pointer">
                  <CardContent className="p-4 space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-xs text-primary font-mono">
                        {i + 1}. {s.title}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {s.effort}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {s.body}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Study refresh */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Study refresh (away from school, still school)
            </h2>
            <Link href="/hub">
              <Button size="sm" variant="ghost" className="gap-1">
                Full Hub <Layers className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Myspace energy for identity, blogspace for notes, YTspace for short
            lessons — filtered so your off-duty scroll still feeds boards /
            clinical curiosity.
          </p>
          <div className="space-y-2">
            {studyItems.map((item) => (
              <Card key={item.id} className="border-primary/10">
                <CardContent className="p-3 space-y-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="outline" className="text-[10px]">
                      {item.topic}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {item.kind}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.body}
                  </p>
                  {item.mediaUrl && isSafeHttpUrl(item.mediaUrl) && (
                    <a
                      href={item.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-xs text-primary gap-1 items-center"
                      onClick={() => {
                        logFocusMinutes(5);
                        setPrefs(loadFocusPrefs());
                      }}
                    >
                      Open resource <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
            {studyItems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No med/study Hub cards yet — publish one when you have energy,
                or seed will appear on first Hub visit.
              </p>
            )}
          </div>
        </section>

        {/* ProjectConnect efficient */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              ProjectConnect · underrepresented network (low effort)
            </h2>
            <Link href="/connect">
              <Button size="sm" variant="ghost">
                Full Connect
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            You want peers and labs who get HBCU / Meharry life — without a full
            LinkedIn campaign. Express interest in micro-hours or async work.
            Cred grows from real follow-through later, not from spam.
          </p>
          <div className="space-y-2">
            {connectCards.map((opp) => (
              <Card key={opp.id} className="border-primary/10">
                <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize"
                      >
                        {opp.orgType}
                      </Badge>
                      {isLowBandwidthOpp(opp) && (
                        <Badge className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                          low-bandwidth
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground truncate">
                        {opp.orgName}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-snug">
                      {opp.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {opp.description}
                    </p>
                    <p className="text-[11px] text-primary/90">
                      {opp.durationText}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/connect/opportunities/${opp.id}`}>
                      <Button size="sm" variant="outline">
                        Details
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      disabled={isGuest || express.isPending}
                      onClick={() => {
                        if (isGuest) {
                          toast("Create a free account to express interest");
                          return;
                        }
                        express.mutate(opp.id);
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      Express (~2 min)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {connectCards.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No open opportunities loaded — open Connect to browse.
              </p>
            )}
          </div>
        </section>

        <Card className="border-dashed border-primary/30 bg-muted/20">
          <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm">
              What this is not
            </p>
            <p>
              Not a replacement for rotations, Anki, or official Meharry
              systems. Not financial advice. {BRAND.symbol} is gated settlement
              literacy — soft {BRAND.softCurrencySymbol} teaches habits first.
              You stay efficient by using Focus Path as a{" "}
              <strong className="text-foreground">
                timer + filter + Connect rail
              </strong>
              , not a second full-time job.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
