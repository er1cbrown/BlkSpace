import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  FACULTY_BENEFITS,
  FACULTY_JOURNEY,
  FACULTY_STACK_MAP,
  applyFacultyOnboarding,
  loadFacultyPrefs,
  logFacultyMinutes,
  saveFacultyPrefs,
  type FacultyPrefs,
} from "@/lib/faculty-desk";
import {
  createOpportunity,
  createOrg,
  listOpportunities,
  listOrgs,
  listInbox,
} from "@/lib/project-connect";
import { broadcastOpportunityToYard } from "@/lib/club-activities";
import { createYardEvent } from "@/lib/yard-events";
import { embedAmalgamationMeta } from "@/lib/amalgamation-meta";
import {
  IEEE_ETHICS_PRINCIPLES,
  NO_PHI_POLICY,
  declareInstitutionalClaim,
  hasEthicsAck,
  loadInstitutionalClaim,
} from "@/lib/identity-ethics";
import { useOpenToBoard } from "@/hooks/use-app-data";
import { getCurrentHandle } from "@/lib/auth";
import { useGuestMode } from "@/lib/guest-mode";
import { BRAND } from "@/lib/brand";
import { YARD_IDS, getYardTheme } from "@/lib/yard-themes";
import {
  ArrowRight,
  Building2,
  FlaskConical,
  GraduationCap,
  Handshake,
  Inbox,
  Loader2,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Faculty Desk — private uni / partner faculty reaching underrepresented
 * students via ProjectConnect on BlkSpace amalgamation social.
 */
export default function FacultyPage() {
  const { isGuest } = useGuestMode();
  const handle = getCurrentHandle() || "demo_user";
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState<FacultyPrefs>(() => loadFacultyPrefs());
  const [showQuickOpp, setShowQuickOpp] = useState(false);
  const [orgName, setOrgName] = useState(
    `${prefs.institution.split("(")[0].trim()} Research Bridge`,
  );
  const [oppTitle, setOppTitle] = useState("");
  const [oppDesc, setOppDesc] = useState("");
  const [duration, setDuration] = useState("2–4 hr/week · async-friendly");
  const [creating, setCreating] = useState(false);
  const [broadcastAfter, setBroadcastAfter] = useState(true);
  const [showEvent, setShowEvent] = useState(false);
  const [evTitle, setEvTitle] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [evLoc, setEvLoc] = useState("Campus / hybrid");
  const [evStart, setEvStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [evLive, setEvLive] = useState("");
  const [evBusy, setEvBusy] = useState(false);
  const [ethicsOpen, setEthicsOpen] = useState(!hasEthicsAck());

  const { data: orgs = [] } = useQuery({
    queryKey: ["connect", "orgs", "faculty"],
    queryFn: () => listOrgs("research"),
  });
  const { data: opps = [] } = useQuery({
    queryKey: ["connect", "opps", "faculty-all"],
    queryFn: () => listOpportunities({}),
  });
  const { data: inbox = [] } = useQuery({
    queryKey: ["connect", "inbox", handle],
    queryFn: () => listInbox(),
    enabled: !isGuest,
  });
  const { data: openResearch = [] } = useOpenToBoard("research");

  /** Orgs this faculty user owns — never auto-select demo seed orgs. */
  const myOrgs = useMemo(
    () => orgs.filter((o) => o.createdBy === handle),
    [orgs, handle],
  );
  /** Pipeline demos for browsing only (not for posting under). */
  const demoPipelineOrgs = useMemo(
    () =>
      orgs.filter((o) => {
        if (o.createdBy === handle) return false;
        const t = `${o.name} ${o.description} ${o.id}`.toLowerCase();
        return (
          t.includes("private") ||
          t.includes("bridge") ||
          t.includes("partner") ||
          t.includes("meharry")
        );
      }),
    [orgs, handle],
  );

  const pipelineOpps = useMemo(
    () =>
      opps
        .filter((o) => {
          const t = `${o.title} ${o.description} ${o.orgName}`.toLowerCase();
          return (
            t.includes("meharry") ||
            t.includes("hbcu") ||
            t.includes("underrepresented") ||
            t.includes("pipeline") ||
            t.includes("private") ||
            t.includes("bridge")
          );
        })
        .slice(0, 6),
    [opps],
  );

  const budgetPct = Math.min(
    100,
    (prefs.weeklyMinutesUsed / Math.max(1, prefs.weeklyMinutesBudget)) * 100,
  );

  const persist = (p: FacultyPrefs) => {
    saveFacultyPrefs(p);
    setPrefs(p);
  };

  const quickPost = async () => {
    if (isGuest) {
      toast("Create a free account to post opportunities");
      return;
    }
    if (!oppTitle.trim()) {
      toast.error("Opportunity title required");
      return;
    }
    setCreating(true);
    try {
      // Always post under an org owned by this user so Lead inbox receives interest.
      let orgId = myOrgs[0]?.id;
      if (!orgId) {
        const org = await createOrg({
          name: orgName.trim() || `${prefs.institution.split("(")[0].trim()} Lab`,
          orgType: "research",
          yardId: prefs.targetYardId || "meharry",
          description: `Faculty-led opportunities from ${prefs.institution} for underrepresented campus talent (Meharry / HBCU pipeline). ProjectConnect on ${BRAND.name}.`,
        });
        orgId = org.id;
        toast.success(`Your org created: ${org.name}`);
      }
      const opp = await createOpportunity({
        orgId,
        title: oppTitle.trim(),
        description:
          oppDesc.trim() ||
          `Open to underrepresented students (Meharry / HBCU yards). Posted via Faculty Desk.`,
        durationText: duration,
        tagsJson: JSON.stringify([
          "faculty",
          "pipeline",
          "underrepresented",
          prefs.targetYardId,
          "research",
        ]),
      });
      let broadcastNote = "";
      if (broadcastAfter) {
        try {
          await broadcastOpportunityToYard(opp.id);
          broadcastNote = " · broadcast to yard";
        } catch {
          broadcastNote = " · post live (broadcast skipped — open opp to retry)";
        }
      }
      toast.success(
        `Opportunity live · Lead inbox ready${broadcastNote}`,
      );
      setOppTitle("");
      setOppDesc("");
      setShowQuickOpp(false);
      logFacultyMinutes(5);
      setPrefs(loadFacultyPrefs());
      qc.invalidateQueries({ queryKey: ["connect"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell wide>
      <div className="space-y-6 max-w-4xl">
        <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-violet-500/10 via-background to-background p-6 space-y-3">
          <Badge className="bg-violet-500/20 text-violet-200 border-violet-500/30 gap-1">
            <GraduationCap className="w-3 h-3" />
            Faculty Desk · ProjectConnect
          </Badge>
          <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
            Meet students where they already are
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Word reached private-university faculty from{" "}
            <strong className="text-foreground">Meharry</strong> on{" "}
            {BRAND.name} — decentralized amalgamation social (feed + yards +
            Connect + soft economy). You want LinkedIn / Handshake / Discord /
            Workday-lite presence without abandoning underrepresented community.
            Post opportunities, review interest, build Cred — provide pipeline,
            reap partnership legitimacy.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{prefs.institution}</Badge>
            <Badge variant="secondary">Target yard · {prefs.targetYardId}</Badge>
            <Badge variant="secondary">
              Inbox · {Array.isArray(inbox) ? inbox.length : 0} leads
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => setShowQuickOpp(!showQuickOpp)}
              className="gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Post opportunity
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowEvent(!showEvent)}
              className="gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Host event
            </Button>
            <Link href="/connect/inbox">
              <Button size="sm" variant="outline" className="gap-1">
                <Inbox className="w-3.5 h-3.5" /> Lead inbox
              </Button>
            </Link>
            <Link href="/messages">
              <Button size="sm" variant="outline" className="gap-1">
                Secure DMs
              </Button>
            </Link>
            <Link href="/focus">
              <Button size="sm" variant="ghost">
                Student Focus Path
              </Button>
            </Link>
          </div>
        </section>

        {ethicsOpen && (
          <Card className="border-amber-600/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Med-school ethical security (required for faculty messaging)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p className="text-muted-foreground">{NO_PHI_POLICY.body}</p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                {IEEE_ETHICS_PRINCIPLES.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <strong className="text-foreground">{p.title}:</strong> {p.body}
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                onClick={() => {
                  try {
                    declareInstitutionalClaim({
                      handle: handle,
                      institution: prefs.institution,
                      role: "faculty",
                      emailDomain: "",
                      noPhiAck: true,
                      ethicalAck: true,
                    });
                    setEthicsOpen(false);
                    toast.success(
                      "Faculty ethical identity saved · handle is your ID (claim self-attested, not SSO)",
                    );
                  } catch (e) {
                    toast.error(String(e));
                  }
                }}
              >
                I acknowledge No-PHI + ethical principles
              </Button>
              {loadInstitutionalClaim(handle) && (
                <p className="text-[11px] text-primary">
                  Claim on file for @{handle}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {showEvent && (
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Host a yard event (office hours · info session · pipeline night)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Org leads whose lab targets a yard (e.g. Meharry) can host events
                there — you are part of the organization layer via ProjectConnect,
                not only “random visitor.” Still no PHI in descriptions.
              </p>
              <Input
                placeholder="Title — e.g. Faculty office hours · research pipeline"
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
              />
              <Textarea
                placeholder="Agenda (no clinical cases / PHI)"
                value={evDesc}
                onChange={(e) => setEvDesc(e.target.value)}
                rows={2}
              />
              <div className="grid sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Location"
                  value={evLoc}
                  onChange={(e) => setEvLoc(e.target.value)}
                />
                <Input
                  type="datetime-local"
                  value={evStart}
                  onChange={(e) => setEvStart(e.target.value)}
                />
              </div>
              <Input
                placeholder="Optional live URL (Twitch/YT/Discord stage)"
                value={evLive}
                onChange={(e) => setEvLive(e.target.value)}
              />
              <Button
                size="sm"
                disabled={evBusy || !evTitle.trim()}
                onClick={async () => {
                  setEvBusy(true);
                  try {
                    const yard = prefs.targetYardId || "meharry";
                    const desc = embedAmalgamationMeta(evDesc, {
                      liveUrl: evLive.trim() || undefined,
                    });
                    const startsAt = evStart.length === 16
                      ? `${evStart}:00`
                      : evStart;
                    await createYardEvent({
                      communityId: yard,
                      title: evTitle.trim(),
                      description: desc,
                      location: evLoc,
                      startsAt,
                      capacity: 40,
                      ticketPriceWb: 0,
                      eventKind: "career",
                      orgId: myOrgs[0]?.id || null,
                    });
                    toast.success(
                      `Event hosted on ${yard} yard — students can RSVP`,
                    );
                    setShowEvent(false);
                    setEvTitle("");
                    logFacultyMinutes(5);
                    setPrefs(loadFacultyPrefs());
                  } catch (e) {
                    toast.error(
                      e instanceof Error
                        ? e.message
                        : "Could not create event (join yard / org lead?)",
                    );
                  } finally {
                    setEvBusy(false);
                  }
                }}
              >
                Publish event to {prefs.targetYardId || "meharry"} yard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Time budget */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Community minutes (this week)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Soft engagement budget</span>
              <span className="tabular-nums font-medium">
                {prefs.weeklyMinutesUsed} / {prefs.weeklyMinutesBudget} min
              </span>
            </div>
            <Progress value={budgetPct} className="h-2" />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPrefs(logFacultyMinutes(10))}
              >
                Log 10 min
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <Label className="text-xs">Target yard</Label>
                <select
                  className="h-8 rounded-md border bg-background text-xs px-2"
                  value={prefs.targetYardId}
                  onChange={(e) =>
                    persist({ ...prefs, targetYardId: e.target.value })
                  }
                >
                  {YARD_IDS.map((id) => (
                    <option key={id} value={id}>
                      {getYardTheme(id)?.name || id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {showQuickOpp && (
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary" />
                Quick opportunity (Handshake-class, yard-native)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!myOrgs[0] && (
                <Input
                  placeholder="Your lab / org name (created once, you own it)"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              )}
              {myOrgs[0] && (
                <p className="text-xs text-muted-foreground">
                  Posting under your org{" "}
                  <Link
                    href={`/connect/orgs/${myOrgs[0].id}`}
                    className="text-primary font-medium hover:underline"
                  >
                    {myOrgs[0].name}
                  </Link>
                  {" · "}interests land in Lead inbox
                </p>
              )}
              {!myOrgs[0] && demoPipelineOrgs[0] && (
                <p className="text-[11px] text-muted-foreground">
                  Demo pipeline orgs exist for browsing only — your first post
                  creates <em>your</em> org so you receive applicants.
                </p>
              )}
              <Input
                placeholder="Title — e.g. Summer RA · health equity (async OK)"
                value={oppTitle}
                onChange={(e) => setOppTitle(e.target.value)}
              />
              <Textarea
                placeholder="Who should apply? Hours? Underrepresented students welcome?"
                value={oppDesc}
                onChange={(e) => setOppDesc(e.target.value)}
                rows={3}
              />
              <Input
                placeholder="Duration / time load"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={broadcastAfter}
                  onChange={(e) => setBroadcastAfter(e.target.checked)}
                />
                Broadcast to campus yard after publish (students see it in feed)
              </label>
              <Button
                disabled={creating || !oppTitle.trim()}
                onClick={quickPost}
                className="gap-1"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Publish to ProjectConnect
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Competitor map */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Why faculty heard “LinkedIn + Handshake + Discord…”
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {FACULTY_STACK_MAP.map((row) => (
              <Card key={row.competitor} className="border-primary/10">
                <CardContent className="p-3 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-muted-foreground">
                      {row.competitor}
                    </span>
                    <span className="text-primary font-medium text-right">
                      → {row.blkspace}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{row.use}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            What you provide · what you reap
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {FACULTY_BENEFITS.map((b) => (
              <Card key={b.title}>
                <CardContent className="p-3 space-y-1">
                  <p className="text-sm font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Journey */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Faculty journey</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {FACULTY_JOURNEY.map((s, i) => (
              <Link key={s.id} href={s.href}>
                <Card className="h-full hover:border-primary/40 cursor-pointer">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-primary font-mono">
                        {i + 1}. {s.title}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {s.effort}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.body}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Pipeline opps */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Handshake className="w-5 h-5 text-primary" />
              Pipeline opportunities (demo + yours)
            </h2>
            <Link href="/connect">
              <Button size="sm" variant="ghost">
                Full Connect <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {pipelineOpps.map((o) => (
              <Link key={o.id} href={`/connect/opportunities/${o.id}`}>
                <Card className="hover:border-primary/40 cursor-pointer">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">{o.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.orgName} · {o.durationText} · {o.interestCount} interested
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {pipelineOpps.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No pipeline cards yet — post one above.
              </p>
            )}
          </div>
        </section>

        {/* Talent board snippet */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Open to research (student signals)
          </h2>
          <p className="text-xs text-muted-foreground">
            Like Handshake interest flags — students toggle Open to research on
            Pro Profile.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {(openResearch || []).slice(0, 4).map((c: any) => (
              <Card key={c.handle} className="border-primary/10">
                <CardContent className="p-3 space-y-1">
                  <p className="text-sm font-medium">
                    {c.displayName}{" "}
                    <span className="text-muted-foreground">@{c.handle}</span>
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {c.headline || c.major || "—"}
                  </p>
                  <Link href={`/profile/${c.handle}`}>
                    <Button size="sm" variant="outline">
                      View profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
            {(!openResearch || openResearch.length === 0) && (
              <p className="text-sm text-muted-foreground col-span-2">
                No open-research flags yet. Students enable them on Profile → Pro.
              </p>
            )}
          </div>
        </section>

        <Card className="border-dashed">
          <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm flex items-center gap-1">
              <Building2 className="w-4 h-4" /> Honest scope
            </p>
            <p>
              Not Workday payroll, not full Indeed ATS, not Slack Enterprise. You
              get discovery + community presence + interest graph on a
              decentralized campus amalgamation where underrepresented students
              already gather (Meharry yard, HBCU yards, Focus Path).
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => {
                applyFacultyOnboarding({
                  institution: prefs.institution,
                  targetYardId: prefs.targetYardId,
                });
                toast.success("Faculty Desk prefs saved");
                setPrefs(loadFacultyPrefs());
              }}
            >
              Save faculty onboarding prefs
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
