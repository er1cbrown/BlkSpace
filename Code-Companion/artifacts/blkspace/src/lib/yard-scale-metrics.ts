/**
 * Yard-level scale metrics (formal N_y-local quantities).
 * docs/theory-of-computing-scale.md · scale-matrix-complexity-compare.md
 *
 * Client estimates from local Connect + optional feed/follow samples.
 * Time/space: O(|orgs| + |opps| + |follows|) — not global O(N_u^2).
 */
import { listOpportunities, listOrgs, type ConnectOrg } from "@/lib/project-connect";
import {
  domainsForOpportunity,
  type OpportunityDomain,
} from "@/lib/opportunity-domains";

export interface YardScaleMetrics {
  yardId: string;
  /** Orgs affiliated with this yard */
  nOrgsYard: number;
  /** Open opportunities whose org is this yard (or tagged) */
  nOppsYard: number;
  /** Open opps total visible */
  nOppsVisible: number;
  /** Distinct domains present in yard opps (||support of sum f||) */
  nDomainsActive: number;
  domainHistogram: Partial<Record<OpportunityDomain, number>>;
  /** Follow sample size (proxy for local degree mass) */
  nFollowSample: number;
  /** Posts sample size if provided */
  nPostsSample: number;
  /** Rough edge proxy: follows + org memberships observed */
  edgeProxy: number;
  computedAt: string;
}

export async function computeYardScaleMetrics(opts: {
  yardId: string;
  followHandles?: string[];
  postsSampleSize?: number;
}): Promise<YardScaleMetrics> {
  const yardId = (opts.yardId || "tsu").toLowerCase();
  const [orgs, opps] = await Promise.all([listOrgs(), listOpportunities({})]);

  const orgsYard = orgs.filter(
    (o) => (o.yardId || "").toLowerCase() === yardId,
  );
  const orgById = new Map(orgs.map((o) => [o.id, o]));

  const open = opps.filter((o) => o.status === "open" || !o.status);
  const oppsYard = open.filter((o) => {
    const org = orgById.get(o.orgId);
    return (org?.yardId || "").toLowerCase() === yardId;
  });

  const hist: Partial<Record<OpportunityDomain, number>> = {};
  for (const o of oppsYard) {
    const org = orgById.get(o.orgId);
    for (const d of domainsForOpportunity(o, org)) {
      hist[d] = (hist[d] ?? 0) + 1;
    }
  }

  const follows = opts.followHandles ?? [];
  const membershipProxy = orgsYard.reduce(
    (s, o: ConnectOrg) => s + (o.memberCount || 0),
    0,
  );

  return {
    yardId,
    nOrgsYard: orgsYard.length,
    nOppsYard: oppsYard.length,
    nOppsVisible: open.length,
    nDomainsActive: Object.keys(hist).length,
    domainHistogram: hist,
    nFollowSample: follows.length,
    nPostsSample: opts.postsSampleSize ?? 0,
    edgeProxy: follows.length + membershipProxy,
    computedAt: new Date().toISOString(),
  };
}

/** One-line complexity reminder for UI / logs */
export function formatYardScaleSummary(m: YardScaleMetrics): string {
  return (
    `yard=${m.yardId} N_o=${m.nOrgsYard} N_opp=${m.nOppsYard} ` +
    `domains=${m.nDomainsActive} d̂≈${m.nFollowSample} edges~${m.edgeProxy}`
  );
}
