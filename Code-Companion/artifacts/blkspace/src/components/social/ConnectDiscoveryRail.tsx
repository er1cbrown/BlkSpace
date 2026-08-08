import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Briefcase,
  Building2,
  ChevronRight,
  FlaskConical,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Sparkles,
  Users,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  listOpportunities,
  listOrgs,
  listMyInterests,
  parseTags,
  type ConnectOpportunity,
  type ConnectOrg,
} from "@/lib/project-connect";
import { useGuestMode } from "@/lib/guest-mode";
import { getCurrentHandle } from "@/lib/auth";
import {
  domainsForOpportunity,
  domainsForOrg,
  matchesDomainFilter,
  scoreDomainMatch,
  weightsFromInterestHints,
  type DomainFilter,
} from "@/lib/opportunity-domains";
import { sparseLinearScore, sortBySparseScore } from "@/lib/sparse-rank";
import {
  computeYardScaleMetrics,
  formatYardScaleSummary,
} from "@/lib/yard-scale-metrics";
import { useTauriGetFollowing } from "@/hooks/use-app-data";

const FILTERS: { id: DomainFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "fellowship", label: "Fellowship" },
  { id: "scholarship", label: "Scholarships" },
  { id: "service", label: "Service" },
  { id: "research", label: "Research" },
  { id: "finance", label: "Finance" },
  { id: "fashion", label: "Fashion" },
];

function orgIcon(t: string) {
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

/**
 * Feed → Connect bridge using domain feature vectors f + sparse ranking.
 * Theory: docs/theory-of-computing-scale.md (block-diagonal yard + w·f personas).
 */
export function ConnectDiscoveryRail({
  yardId = "tsu",
  className,
}: {
  yardId?: string;
  className?: string;
}) {
  const { isGuest } = useGuestMode();
  const handle = getCurrentHandle();
  const [filter, setFilter] = useState<DomainFilter>("all");
  const [showMetrics, setShowMetrics] = useState(false);

  const { data: orgs = [], isLoading: oLoading } = useQuery({
    queryKey: ["connect", "rail", "orgs"],
    queryFn: () => listOrgs(),
    staleTime: 60_000,
  });
  const { data: opps = [], isLoading: pLoading } = useQuery({
    queryKey: ["connect", "rail", "opps"],
    queryFn: () => listOpportunities({}),
    staleTime: 60_000,
  });
  const { data: myInterests = [] } = useQuery({
    queryKey: ["connect", "rail", "myInterests", handle],
    queryFn: () => listMyInterests(),
    enabled: !!handle && !isGuest,
    staleTime: 60_000,
  });
  const { data: remoteFollowing = [] } = useTauriGetFollowing(!isGuest);

  const followSet = useMemo(() => {
    const local: string[] = (() => {
      try {
        return JSON.parse(localStorage.getItem("blkspace_followed") || "[]");
      } catch {
        return [];
      }
    })();
    return new Set(
      [...local, ...(remoteFollowing as string[])].map((h) =>
        String(h).toLowerCase(),
      ),
    );
  }, [remoteFollowing]);

  /** Persona weights w from past interest titles (sparse). */
  const personaWeights = useMemo(() => {
    const hints = (myInterests as { opportunityTitle?: string }[]).map(
      (i) => i.opportunityTitle || "",
    );
    return weightsFromInterestHints(hints);
  }, [myInterests]);

  const orgById = useMemo(() => {
    const m = new Map<string, ConnectOrg>();
    for (const o of orgs) m.set(o.id, o);
    return m;
  }, [orgs]);

  const rankedOpps = useMemo(() => {
    const open = opps.filter((o) => o.status === "open" || !o.status);
    const filtered = open.filter((o) =>
      matchesDomainFilter(filter, o, orgById.get(o.orgId)),
    );
    return sortBySparseScore(filtered, (o) => {
      const org = orgById.get(o.orgId);
      const domains = domainsForOpportunity(o, org);
      const sameYard =
        (org?.yardId || "").toLowerCase() === yardId.toLowerCase();
      const followAffinity = followSet.has(
        (o.createdBy || org?.createdBy || "").toLowerCase(),
      );
      return sparseLinearScore({
        sameYard,
        followAffinity,
        domainScore: Object.keys(personaWeights).length
          ? scoreDomainMatch(personaWeights, domains)
          : domains.length * 0.2,
        engagement: o.interestCount || 0,
        recency: 0,
      });
    }).slice(0, 10);
  }, [opps, filter, yardId, orgById, followSet, personaWeights]);

  const rankedOrgs = useMemo(() => {
    let list = orgs.filter((o) => {
      if (filter === "all") return true;
      // Org matches if any of its domains hit filter
      const fakeOpp = {
        id: 0,
        orgId: o.id,
        orgName: o.name,
        orgType: o.orgType,
        title: o.name,
        description: o.description,
        durationText: "",
        tagsJson: "[]",
        status: "open",
        createdBy: o.createdBy,
        interestCount: 0,
        createdAt: o.createdAt,
      } as ConnectOpportunity;
      return matchesDomainFilter(filter, fakeOpp, o);
    });
    // Prefer home yard
    list = sortBySparseScore(list, (o) => {
      const domains = domainsForOrg(o);
      const sameYard = (o.yardId || "").toLowerCase() === yardId.toLowerCase();
      const followAffinity = followSet.has((o.createdBy || "").toLowerCase());
      return sparseLinearScore({
        sameYard,
        followAffinity,
        domainScore: domains.length * 0.3,
        engagement: o.opportunityCount || 0,
      });
    });
    return list.slice(0, 8);
  }, [orgs, filter, yardId, followSet]);

  const { data: scaleMetrics } = useQuery({
    queryKey: ["yard", "scale", yardId, followSet.size],
    queryFn: () =>
      computeYardScaleMetrics({
        yardId,
        followHandles: [...followSet],
      }),
    staleTime: 120_000,
  });

  const loading = oLoading || pLoading;
  const empty = !loading && rankedOrgs.length === 0 && rankedOpps.length === 0;

  return (
    <section
      className={cn(
        "mb-5 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background p-3 sm:p-4",
        className,
      )}
      aria-label="Orgs and opportunities on your yard"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Handshake className="h-4 w-4 text-primary shrink-0" />
            <h2 className="text-sm font-bold tracking-tight">
              Fellowship · orgs & opportunities
            </h2>
            <Badge
              variant="outline"
              className="text-[10px] border-primary/30 text-primary"
            >
              Connect
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            Domain features + yard-local ranking (not global FYP flood). Same
            rails for every persona — filters change weights, not the app.
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Yard scale metrics"
            onClick={() => setShowMetrics((v) => !v)}
          >
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Link href="/connect">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-0.5 text-xs"
            >
              Open Connect
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {showMetrics && scaleMetrics && (
        <div className="mb-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">
          {formatYardScaleSummary(scaleMetrics)}
          <span className="block opacity-70 mt-0.5">
            Sparse model: O(N_o + N_opp + d̂) local — not O(N_u²)
          </span>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide -mx-0.5 px-0.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium border transition-colors",
              filter === f.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/80 text-muted-foreground border-border hover:border-primary/40",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Loading orgs…
        </p>
      )}

      {empty && (
        <div className="rounded-xl border border-dashed border-border/80 p-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            No open opportunities on this domain filter. Start an org or browse
            Connect.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {!isGuest && (
              <Link href="/connect">
                <Button size="sm" className="h-8 text-xs">
                  Create org
                </Button>
              </Link>
            )}
            <Link href="/connect">
              <Button size="sm" variant="outline" className="h-8 text-xs">
                Browse Connect
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!empty && (
        <div className="space-y-3">
          {rankedOpps.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 px-0.5">
                Open opportunities
              </p>
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {rankedOpps.map((opp) => {
                  const org = orgById.get(opp.orgId);
                  const tags = parseTags(opp.tagsJson || "[]").slice(0, 2);
                  const doms = domainsForOpportunity(opp, org).slice(0, 3);
                  return (
                    <Link
                      key={opp.id}
                      href={`/connect/opportunities/${opp.id}`}
                      className="shrink-0 w-[220px] sm:w-[240px] rounded-xl border border-border/70 bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <div className="flex flex-wrap gap-0.5">
                          {doms.map((d) => (
                            <Badge
                              key={d}
                              variant="secondary"
                              className="text-[9px] font-normal capitalize"
                            >
                              {d}
                            </Badge>
                          ))}
                        </div>
                        {(opp.interestCount ?? 0) > 0 && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {opp.interestCount} interested
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold leading-snug line-clamp-2 mb-1">
                        {opp.title}
                      </p>
                      <p className="text-[10px] text-primary/90 font-medium truncate">
                        {opp.orgName}
                      </p>
                      {org?.yardId && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {org.yardId.toUpperCase()}
                        </p>
                      )}
                      {tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="text-[9px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {rankedOrgs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 px-0.5">
                Orgs on campus
              </p>
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {rankedOrgs.map((org) => {
                  const Icon = orgIcon(org.orgType);
                  return (
                    <Link
                      key={org.id}
                      href={`/connect/orgs/${org.id}`}
                      className="shrink-0 w-[160px] rounded-xl border border-border/70 bg-card p-3 hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] capitalize"
                        >
                          {org.orgType}
                        </Badge>
                      </div>
                      <p className="text-xs font-semibold line-clamp-2 leading-snug">
                        {org.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {org.opportunityCount ?? 0} opps
                        {org.yardId ? ` · ${org.yardId}` : ""}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {filter === "finance" && (
        <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-muted-foreground leading-snug">
          <strong className="text-foreground">Not a brokerage.</strong> Learn
          markets and apply to campus finance paths here. Real stock/crypto
          accounts stay with licensed firms.{" "}
          <Link href="/wallet" className="text-primary hover:underline">
            Open Learn markets →
          </Link>
        </div>
      )}

      {filter === "fashion" && (
        <div className="mt-2 rounded-lg border border-pink-500/25 bg-pink-500/5 px-3 py-2 text-[11px] text-muted-foreground leading-snug">
          <strong className="text-foreground">Campus brand path:</strong> Studio
          portfolio → Yard Sale → Connect hosts. Cross-yard (TSU → Fisk) with
          identity + escrow.{" "}
          <Link href="/wallet" className="text-primary hover:underline">
            Yard Sale →
          </Link>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        <Award className="h-3 w-3 text-primary" />
        <span>
          Completing opportunities builds{" "}
          <Link
            href={isGuest ? "/connect" : "/connect/me"}
            className="text-primary hover:underline"
          >
            Yard Cred
          </Link>
          {" · "}
          ranked by yard locality + follows + domain match
        </span>
        {!isGuest && (
          <Link href="/connect" className="ml-auto">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] gap-1 text-primary"
            >
              <GraduationCap className="h-3 w-3" />
              Start chapter org
            </Button>
          </Link>
        )}
      </div>
    </section>
  );
}
