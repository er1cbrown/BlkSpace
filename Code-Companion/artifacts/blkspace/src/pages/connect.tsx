/**
 * ProjectConnectBKSPC — credibility hub for promo demos.
 * Browse orgs/opportunities, apply, lead inbox.
 */
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase,
  Bookmark,
  BookmarkCheck,
  Building2,
  CheckCircle2,
  FlaskConical,
  Handshake,
  HeartHandshake,
  Inbox,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useGuestMode } from "@/lib/guest-mode";
import { GuestCTA } from "@/components/social/GuestCTA";
import { useOpenToBoard } from "@/hooks/use-app-data";
import { broadcastOpportunityToYard } from "@/lib/club-activities";
import {
  ORG_TYPES,
  completeInterest,
  canPostOpportunitiesForOrg,
  createOpportunity,
  createOrg,
  expressInterest,
  getOrg,
  getOpportunity,
  getYardCred,
  listInbox,
  listOpportunities,
  listSavedOpportunityIds,
  listOrgs,
  parseTags,
  setInterestStatus,
  toggleSavedOpportunity,
  type ConnectOpportunity,
  type OrgType,
} from "@/lib/project-connect";
import { getCurrentHandle } from "@/lib/auth";
import {
  canShareGpaOnConnect,
  loadPrivacySettings,
} from "@/lib/privacy-settings";
import { cn } from "@/lib/utils";

function typeIcon(t: string) {
  switch (t) {
    case "research":
      return FlaskConical;
    case "professional":
      return Briefcase;
    case "service":
      return HeartHandshake;
    case "club":
      return Sparkles;
    case "peer":
      return Users;
    default:
      return Building2;
  }
}

function typeBadgeClass(t: string) {
  switch (t) {
    case "research":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "professional":
      return "bg-violet-500/15 text-violet-300 border-violet-500/30";
    case "service":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "club":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "peer":
      return "bg-pink-500/15 text-pink-300 border-pink-500/30";
    default:
      return "";
  }
}

export default function ConnectPage() {
  const [loc] = useLocation();
  // /connect, /connect/orgs/:id, /connect/opportunities/:id, /connect/inbox
  const parts = loc.replace(/\/$/, "").split("/").filter(Boolean);
  // parts[0] === 'connect'
  if (parts[1] === "orgs" && parts[2]) {
    return <OrgDetailPage orgId={parts[2]} />;
  }
  if (parts[1] === "opportunities" && parts[2]) {
    return <OpportunityDetailPage oppId={Number(parts[2])} />;
  }
  if (parts[1] === "inbox") {
    return <InboxPage />;
  }
  return <ConnectHub />;
}

function ConnectHub() {
  const [filter, setFilter] = useState<string>("research");
  const [q, setQ] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<number[]>(listSavedOpportunityIds);
  const [showCreate, setShowCreate] = useState(false);
  const handle = getCurrentHandle();
  const { isGuest } = useGuestMode();
  const qc = useQueryClient();

  const { data: orgs = [], isLoading: oLoading } = useQuery({
    queryKey: ["connect", "orgs", filter],
    queryFn: () => listOrgs(filter === "all" ? undefined : filter),
  });
  const { data: opps = [], isLoading: pLoading } = useQuery({
    queryKey: ["connect", "opps", filter],
    queryFn: () =>
      listOpportunities({
        orgType: filter === "all" ? undefined : filter,
      }),
  });
  const { data: cred } = useQuery({
    queryKey: ["connect", "cred", handle],
    queryFn: () => getYardCred(handle || "demo_user"),
    enabled: !!handle || true,
  });

  const filteredOpps = useMemo(() => {
    if (!q.trim()) return opps;
    const qq = q.toLowerCase();
    return opps.filter(
      (o) =>
        o.title.toLowerCase().includes(qq) ||
        o.description.toLowerCase().includes(qq) ||
        o.orgName.toLowerCase().includes(qq),
    );
  }, [opps, q]);

  const visibleOpps = savedOnly
    ? filteredOpps.filter((opp) => savedIds.includes(opp.id))
    : filteredOpps;

  return (
    <AppShell wide>
      <div className="space-y-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
          <div className="relative z-10 max-w-2xl space-y-3">
            <Badge className="bg-primary/20 text-primary border-primary/30">
              ProjectConnectBKSPC · Credibility layer
            </Badge>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
              Research first. Build <span className="text-primary">Cred</span>.
              Then earn.
            </h1>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              ProjectConnectBKSPC — research labs, medtech/biomedical data, pro
              chapters, clubs, and service hubs for underrepresented campuses.
              Express interest, get endorsed, grow Yard Cred.{" "}
              <strong className="text-foreground">
                BKSPC (BlkSpace Coin) stays gated
              </strong>{" "}
              until credibility is real — soft WeixBucks today, settlement
              later.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/focus">
                <Button variant="secondary" size="sm" className="gap-1.5">
                  <Sparkles className="h-4 w-4" /> Focus Path · med / busy
                </Button>
              </Link>
              <Link href="/faculty">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FlaskConical className="h-4 w-4" /> Faculty Desk
                </Button>
              </Link>
              <Link href="/connect/inbox">
                <Button variant="default" size="sm" className="gap-1.5">
                  <Inbox className="h-4 w-4" /> Lead inbox
                </Button>
              </Link>
              {!isGuest && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowCreate((v) => !v)}
                >
                  <Plus className="h-4 w-4" /> Create org
                </Button>
              )}
              {cred && (
                <Badge variant="secondary" className="text-sm px-3 py-1.5">
                  Your Yard Cred ·{" "}
                  <span className="text-primary font-bold">{cred.score}</span>
                </Badge>
              )}
            </div>
          </div>
        </section>

        {showCreate && !isGuest && (
          <CreateOrgForm
            onDone={() => {
              setShowCreate(false);
              qc.invalidateQueries({ queryKey: ["connect"] });
            }}
          />
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {ORG_TYPES.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="text-xs sm:text-sm"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex w-full sm:w-auto gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search opportunities…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant={savedOnly ? "default" : "outline"}
              className="shrink-0 gap-1.5"
              onClick={() => setSavedOnly((value) => !value)}
            >
              <Bookmark className="h-4 w-4" />
              Saved{savedIds.length ? ` · ${savedIds.length}` : ""}
            </Button>
          </div>
        </div>

        {/* Orgs strip */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Organizations
          </h2>
          {oLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {orgs.map((org) => {
                const Icon = typeIcon(org.orgType);
                return (
                  <Link key={org.id} href={`/connect/orgs/${org.id}`}>
                    <Card className="h-full hover:border-primary/40 transition-colors cursor-pointer">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base leading-snug">
                            {org.name}
                          </CardTitle>
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "w-fit text-[10px] uppercase",
                            typeBadgeClass(org.orgType),
                          )}
                        >
                          {org.orgType}
                        </Badge>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground line-clamp-2">
                        {org.description}
                      </CardContent>
                      <CardFooter className="text-xs text-muted-foreground gap-3">
                        <span>{org.memberCount} members</span>
                        <span>{org.opportunityCount} open</span>
                        {org.yardId && (
                          <span className="text-primary">@{org.yardId}</span>
                        )}
                      </CardFooter>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Opportunities */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" /> Open opportunities
          </h2>
          {pLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : visibleOpps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {savedOnly
                ? "No saved opportunities match this filter."
                : "No open opportunities for this filter."}
            </p>
          ) : (
            <div className="space-y-3">
              {visibleOpps.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  saved={savedIds.includes(opp.id)}
                  onToggleSaved={(id) => {
                    const isSaved = toggleSavedOpportunity(id);
                    setSavedIds(listSavedOpportunityIds());
                    toast.success(
                      isSaved ? "Opportunity saved" : "Removed from saved",
                    );
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <OpenToTalentBoard />
      </div>
    </AppShell>
  );
}

function OpenToTalentBoard() {
  const [boardFilter, setBoardFilter] = useState<"all" | "work" | "research">(
    "all",
  );
  const { data: candidates = [], isLoading } = useOpenToBoard(boardFilter);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" /> Open to work & research
        </h2>
        <div className="flex gap-1">
          {(["all", "work", "research"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={boardFilter === f ? "default" : "outline"}
              className="text-xs capitalize"
              onClick={() => setBoardFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Students who toggled Open to work / Open to research on Pro Profile
        (post-internship outreach for labs and orgs).
      </p>
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No open signals yet. Students: Profile → Pro → enable open flags.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {candidates.map((c) => (
            <Card key={c.handle} className="border-primary/10">
              <CardHeader className="pb-2">
                <div className="flex justify-between gap-2">
                  <CardTitle className="text-base">
                    {c.displayName}{" "}
                    <span className="text-muted-foreground font-normal text-sm">
                      @{c.handle}
                    </span>
                  </CardTitle>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {c.openToWork && (
                      <Badge className="bg-green-600 text-[10px]">Work</Badge>
                    )}
                    {c.openToResearch && (
                      <Badge className="bg-blue-600 text-[10px]">
                        Research
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-xs">
                  {c.major || "—"} · {c.university || c.town} · Class of{" "}
                  {c.graduationYear || "—"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium leading-snug">
                  {c.headline || "No headline"}
                </p>
                {c.experience && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {c.experience}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(c.skills) ? c.skills : [])
                    .slice(0, 6)
                    .map((s: string) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {s}
                      </Badge>
                    ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Link href={`/profile/${c.handle}`}>
                    <Button size="sm" variant="outline">
                      View profile
                    </Button>
                  </Link>
                  {c.portfolioUrl && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={c.portfolioUrl} target="_blank" rel="noreferrer">
                        Portfolio
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function OpportunityCard({
  opp,
  saved,
  onToggleSaved,
}: {
  opp: ConnectOpportunity;
  saved?: boolean;
  onToggleSaved?: (id: number) => void;
}) {
  const tags = parseTags(opp.tagsJson);
  const isSaved = saved ?? false;
  return (
    <Link href={`/connect/opportunities/${opp.id}`}>
      <Card className="hover:border-primary/40 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <CardTitle className="text-base md:text-lg">
                {opp.title}
              </CardTitle>
              {onToggleSaved && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  aria-label={
                    isSaved ? "Unsave opportunity" : "Save opportunity"
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleSaved(opp.id);
                  }}
                >
                  {isSaved ? (
                    <BookmarkCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase",
                typeBadgeClass(opp.orgType),
              )}
            >
              {opp.orgType}
            </Badge>
          </div>
          <CardDescription>
            {opp.orgName}
            {opp.durationText ? ` · ${opp.durationText}` : ""}
            {opp.interestCount > 0 ? ` · ${opp.interestCount} interested` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {opp.description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CreateOrgForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<OrgType>("club");
  const [yardId, setYardId] = useState("tsu");
  const [description, setDescription] = useState("");
  const mut = useMutation({
    mutationFn: () => createOrg({ name, orgType, yardId, description }),
    onSuccess: () => {
      toast.success("Org created");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card className="border-primary/25">
      <CardHeader>
        <CardTitle className="text-base">Create organization</CardTitle>
        <CardDescription>
          Clubs, labs, service hubs, pro chapters — dedicated pages beyond
          yards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {ORG_TYPES.filter((t) => t.id !== "all").map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={orgType === t.id ? "default" : "outline"}
              onClick={() => setOrgType(t.id as OrgType)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Yard id (tsu, howard, …)"
          value={yardId}
          onChange={(e) => setYardId(e.target.value)}
        />
        <Textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <Button
          disabled={!name.trim() || mut.isPending}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Create"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function OrgDetailPage({ orgId }: { orgId: string }) {
  const { isGuest } = useGuestMode();
  const qc = useQueryClient();
  const { data: org, isLoading } = useQuery({
    queryKey: ["connect", "org", orgId],
    queryFn: () => getOrg(orgId),
  });
  const { data: opps = [] } = useQuery({
    queryKey: ["connect", "opps", orgId],
    queryFn: () => listOpportunities({ orgId }),
    enabled: !!org,
  });
  const [showOpp, setShowOpp] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [duration, setDuration] = useState("3 months");

  const createMut = useMutation({
    mutationFn: () =>
      createOpportunity({
        orgId,
        title,
        description: desc,
        durationText: duration,
        tagsJson: JSON.stringify([org?.orgType || "general"]),
      }),
    onSuccess: () => {
      toast.success("Opportunity posted");
      setShowOpp(false);
      setTitle("");
      setDesc("");
      qc.invalidateQueries({ queryKey: ["connect"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <AppShell>
        <Loader2 className="h-8 w-8 animate-spin mx-auto mt-20 text-muted-foreground" />
      </AppShell>
    );
  }
  if (!org) {
    return (
      <AppShell>
        <p className="text-center mt-20 text-muted-foreground">
          Org not found.
        </p>
        <div className="text-center mt-4">
          <Link href="/connect">
            <Button variant="outline">Back to Connect</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const Icon = typeIcon(org.orgType);
  const me = getCurrentHandle();
  const canPost = !isGuest && canPostOpportunitiesForOrg(org, me);

  return (
    <AppShell wide>
      <div className="space-y-6">
        <Link href="/connect">
          <Button variant="ghost" size="sm">
            ← Connect
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/15 p-3">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1 min-w-0">
                <CardTitle className="text-2xl font-serif">
                  {org.name}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={typeBadgeClass(org.orgType)}
                  >
                    {org.orgType}
                  </Badge>
                  {org.yardId && (
                    <Badge variant="secondary">Yard · {org.yardId}</Badge>
                  )}
                </div>
                <CardDescription className="text-sm pt-1">
                  {org.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardFooter className="gap-2 flex-wrap">
            {canPost && (
              <Button size="sm" onClick={() => setShowOpp((v) => !v)}>
                <Plus className="h-4 w-4 mr-1" /> Post opportunity
              </Button>
            )}
            {!isGuest && !canPost && (
              <p className="text-xs text-muted-foreground">
                Only org owners/leads can post roles here. Create your lab from{" "}
                <Link href="/faculty" className="text-primary hover:underline">
                  Faculty Desk
                </Link>
                .
              </p>
            )}
          </CardFooter>
        </Card>

        {showOpp && canPost && (
          <Card className="border-primary/25">
            <CardHeader>
              <CardTitle className="text-base">New opportunity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
              <Input
                placeholder="Duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <Button
                disabled={!title.trim() || !desc.trim() || createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                Publish
              </Button>
            </CardContent>
          </Card>
        )}

        <h2 className="text-lg font-semibold">Open opportunities</h2>
        <div className="space-y-3">
          {opps.map((o) => (
            <OpportunityCard key={o.id} opp={o} />
          ))}
          {opps.length === 0 && (
            <p className="text-sm text-muted-foreground">No open posts yet.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function OpportunityDetailPage({ oppId }: { oppId: number }) {
  const { isGuest } = useGuestMode();
  const qc = useQueryClient();
  const { data: opp, isLoading } = useQuery({
    queryKey: ["connect", "opp", oppId],
    queryFn: () => getOpportunity(oppId),
  });
  const [message, setMessage] = useState("");
  const [skills, setSkills] = useState("");
  const [classification, setClassification] = useState("Junior");
  const privacy = loadPrivacySettings();
  const canShareGpa = canShareGpaOnConnect(privacy);
  const [shareGpa, setShareGpa] = useState(
    () => canShareGpa && privacy.shareGpaOnApplyDefault,
  );

  const applyMut = useMutation({
    mutationFn: () =>
      expressInterest({
        opportunityId: oppId,
        message,
        skillsSnapshot: skills,
        classification,
        gpa: shareGpa && canShareGpa ? privacy.gpa : "",
        gpaShared: shareGpa && canShareGpa,
      }),
    onSuccess: () => {
      toast.success(
        shareGpa && canShareGpa
          ? "Interest sent — GPA shared with org leads only"
          : "Interest sent — GPA not shared",
      );
      qc.invalidateQueries({ queryKey: ["connect"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const broadcastMut = useMutation({
    mutationFn: () => broadcastOpportunityToYard(oppId),
    onSuccess: () => {
      toast.success(
        "Broadcast to yard feed — students see this opportunity in announcements",
      );
      qc.invalidateQueries({ queryKey: ["tauri", "posts"] });
    },
    onError: (e: Error) => toast.error(e.message || String(e)),
  });

  if (isLoading) {
    return (
      <AppShell>
        <Loader2 className="h-8 w-8 animate-spin mx-auto mt-20" />
      </AppShell>
    );
  }
  if (!opp) {
    return (
      <AppShell>
        <p className="text-center mt-20 text-muted-foreground">Not found</p>
      </AppShell>
    );
  }

  const tags = parseTags(opp.tagsJson);

  return (
    <AppShell wide>
      <div className="space-y-6 max-w-2xl">
        <Link href="/connect">
          <Button variant="ghost" size="sm">
            ← Connect
          </Button>
        </Link>
        <div className="space-y-2">
          <Badge variant="outline" className={typeBadgeClass(opp.orgType)}>
            {opp.orgType}
          </Badge>
          <h1 className="font-serif text-3xl font-bold">{opp.title}</h1>
          <p className="text-muted-foreground">
            <Link
              href={`/connect/orgs/${opp.orgId}`}
              className="text-primary hover:underline"
            >
              {opp.orgName}
            </Link>
            {opp.durationText ? ` · ${opp.durationText}` : ""}
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {opp.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
            {!isGuest && (
              <Button
                size="sm"
                variant="outline"
                disabled={broadcastMut.isPending}
                onClick={() => broadcastMut.mutate()}
              >
                {broadcastMut.isPending
                  ? "Broadcasting…"
                  : "Broadcast to campus yard"}
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground">
              Faculty/org members: push scholarships, research, and internships
              to the yard feed so all students see them.
            </p>
          </CardContent>
        </Card>

        {isGuest ? (
          <GuestCTA />
        ) : (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">I&apos;m interested</CardTitle>
              <CardDescription>
                Builds credibility — not money. Leads review applicants before
                finance layers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Classification (e.g. Junior, Senior, Master's)"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
              />
              <Textarea
                placeholder="Skills & experience (short)"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                rows={2}
              />
              <Textarea
                placeholder="Why you? (message to the lead)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />

              <div className="rounded-lg border border-border/60 p-3 space-y-2 text-sm">
                <p className="font-medium">GPA privacy</p>
                {privacy.gpaVisibility === "private" || !privacy.gpa ? (
                  <p className="text-muted-foreground text-xs">
                    GPA is private or not set.{" "}
                    <Link href="/settings" className="text-primary underline">
                      Settings → Privacy
                    </Link>{" "}
                    to store GPA and allow sharing with Connect leads.
                  </p>
                ) : (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={shareGpa}
                      onChange={(e) => setShareGpa(e.target.checked)}
                    />
                    <span>
                      Share my GPA ({privacy.gpa}) with{" "}
                      <strong>this opportunity&apos;s org leads only</strong>.
                      Not public on your profile unless you chose Public in
                      settings.
                    </span>
                  </label>
                )}
              </div>

              <Button
                className="w-full sm:w-auto"
                disabled={applyMut.isPending}
                onClick={() => applyMut.mutate()}
              >
                {applyMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Handshake className="h-4 w-4 mr-2" /> Express interest
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function InboxPage() {
  const { isGuest } = useGuestMode();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["connect", "inbox"],
    queryFn: listInbox,
    enabled: !isGuest,
  });

  if (isGuest) {
    return (
      <AppShell>
        <GuestCTA fullPage />
      </AppShell>
    );
  }

  return (
    <AppShell wide>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/connect">
              <Button variant="ghost" size="sm">
                ← Connect
              </Button>
            </Link>
            <h1 className="font-serif text-2xl font-bold mt-2 flex items-center gap-2">
              <Inbox className="h-6 w-6 text-primary" /> Lead inbox
            </h1>
            <p className="text-sm text-muted-foreground">
              Applicants for opportunities you lead — accept, reject, or mark
              complete (+ endorsement).
            </p>
          </div>
        </div>

        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No applicants yet. Post an opportunity on an org you own, or apply
              as a student on the demo seed.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <CardTitle className="text-base">
                      {item.displayName}{" "}
                      <span className="text-muted-foreground font-normal text-sm">
                        @{item.handle}
                      </span>
                    </CardTitle>
                    <Badge variant="secondary">Cred {item.yardCred}</Badge>
                  </div>
                  <CardDescription>
                    {item.opportunityTitle} · {item.orgName}
                    {item.classification ? ` · ${item.classification}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {item.skillsSnapshot && (
                    <p>
                      <span className="text-muted-foreground">Skills: </span>
                      {item.skillsSnapshot}
                    </p>
                  )}
                  {item.gpaShared && item.gpa ? (
                    <p>
                      <span className="text-muted-foreground">
                        GPA (shared):{" "}
                      </span>
                      <span className="font-medium">{item.gpa}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      GPA not shared by applicant
                    </p>
                  )}
                  {item.message && (
                    <p className="text-muted-foreground italic">
                      &ldquo;{item.message}&rdquo;
                    </p>
                  )}
                  <Badge variant="outline">{item.status}</Badge>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={async () => {
                      await setInterestStatus(item.id, "accepted");
                      toast.success("Accepted — open secure DM by handle");
                      qc.invalidateQueries({ queryKey: ["connect"] });
                      window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/messages?to=${encodeURIComponent(item.handle)}`;
                    }}
                  >
                    Accept · Message @{item.handle}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await setInterestStatus(item.id, "rejected");
                      toast.message("Marked rejected");
                      qc.invalidateQueries({ queryKey: ["connect"] });
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    onClick={async () => {
                      await completeInterest(
                        item.id,
                        "Great work on the yard.",
                      );
                      toast.success("Completed + endorsement — Cred boost");
                      qc.invalidateQueries({ queryKey: ["connect"] });
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Complete + endorse
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
