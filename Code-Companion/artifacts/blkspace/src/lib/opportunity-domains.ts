/**
 * Structured domain features f(item) for Connect opportunities / orgs.
 * Implements the sparse feature vector from docs/theory-of-computing-scale.md
 * — N personas = different weight vectors w over the same domain basis.
 */
import type { ConnectOpportunity, ConnectOrg } from "@/lib/project-connect";
import { parseTags } from "@/lib/project-connect";

/** Canonical domain basis (columns of f). */
export const OPPORTUNITY_DOMAINS = [
  "scholarship",
  "service",
  "fellowship",
  "research",
  "finance",
  "fashion",
  "greek",
  "campus",
  "professional",
  "other",
] as const;

export type OpportunityDomain = (typeof OPPORTUNITY_DOMAINS)[number];

export type DomainFilter =
  | "all"
  | "scholarship"
  | "service"
  | "fellowship"
  | "research"
  | "finance"
  | "fashion";

const KEYWORDS: Record<OpportunityDomain, RegExp> = {
  scholarship: /scholar|grant|aid|tuition|bursar|fellowship.*fund|fund.*fellow/i,
  service: /service|volunteer|community|outreach|tutoring|clinic/i,
  fellowship: /fellowship|brother|chapter|nphc|fratern|soror|sisterhood/i,
  research: /research|lab|faculty|ra\b|paper|clinical|nlp|ml\b/i,
  finance: /financ|broker|invest|equity|stock|market|nasdaq|portfolio|accounting|cfa|budget|literacy/i,
  fashion: /fashion|merch|lookbook|photoshoot|streetwear|apparel|design|drop|brand|model|atelier|style/i,
  greek: /omega|nphc|fratern|soror|psi|phi|aka|dst|iota|kappa|sigma/i,
  campus: /yard|campus|homecoming|rsvp|event|convention|conference/i,
  professional: /professional|career|internship|mentor|ama|leadership/i,
  other: /.^/, // never primary from keywords alone
};

/** Infer domain set from free text + org type (sparse multi-hot f). */
export function inferDomainsFromText(
  text: string,
  orgType?: string,
): OpportunityDomain[] {
  const hay = text.toLowerCase();
  const out = new Set<OpportunityDomain>();

  for (const d of OPPORTUNITY_DOMAINS) {
    if (d === "other") continue;
    if (KEYWORDS[d].test(hay)) out.add(d);
  }

  if (orgType === "research") out.add("research");
  if (orgType === "service") out.add("service");
  if (orgType === "professional") out.add("professional");
  if (orgType === "peer") out.add("fellowship");
  // club is NOT auto-fashion (avoids N-persona pollution)

  if (out.size === 0) out.add("other");
  return [...out];
}

/** Domains for an opportunity (explicit field preferred, else infer). */
export function domainsForOpportunity(
  opp: ConnectOpportunity,
  org?: ConnectOrg | null,
): OpportunityDomain[] {
  const explicit = (opp as { domains?: string[] }).domains;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit.filter((d): d is OpportunityDomain =>
      (OPPORTUNITY_DOMAINS as readonly string[]).includes(d),
    );
  }
  const tags = parseTags(opp.tagsJson || "[]").join(" ");
  const text = [
    opp.title,
    opp.description,
    opp.orgName,
    opp.orgType,
    tags,
    org?.description || "",
    org?.name || "",
  ].join(" ");
  return inferDomainsFromText(text, opp.orgType || org?.orgType);
}

export function domainsForOrg(org: ConnectOrg): OpportunityDomain[] {
  return inferDomainsFromText(
    `${org.name} ${org.description} ${org.orgType} ${org.slug}`,
    org.orgType,
  );
}

/** Boolean: does f(item) have a 1 in the filter column? */
export function matchesDomainFilter(
  filter: DomainFilter,
  opp: ConnectOpportunity,
  org?: ConnectOrg | null,
): boolean {
  if (filter === "all") return true;
  const doms = domainsForOpportunity(opp, org);
  if (filter === "fellowship") {
    return (
      doms.includes("fellowship") ||
      doms.includes("professional") ||
      doms.includes("greek")
    );
  }
  return doms.includes(filter as OpportunityDomain);
}

/**
 * Sparse multi-hot vector in fixed basis order (for scoring w·f).
 * Length = |OPPORTUNITY_DOMAINS|.
 */
export function domainFeatureVector(
  domains: OpportunityDomain[],
): number[] {
  const set = new Set(domains);
  return OPPORTUNITY_DOMAINS.map((d) => (set.has(d) ? 1 : 0));
}

/** Dot product w·f (persona weights × item domains). */
export function scoreDomainMatch(
  weightByDomain: Partial<Record<OpportunityDomain, number>>,
  domains: OpportunityDomain[],
): number {
  let s = 0;
  for (const d of domains) {
    s += weightByDomain[d] ?? 0;
  }
  return s;
}

/** Build simple persona weights from recent interest tag text / yard. */
export function weightsFromInterestHints(
  hints: string[],
): Partial<Record<OpportunityDomain, number>> {
  const joined = hints.join(" ").toLowerCase();
  const w: Partial<Record<OpportunityDomain, number>> = {};
  for (const d of OPPORTUNITY_DOMAINS) {
    if (d === "other") continue;
    if (KEYWORDS[d].test(joined)) w[d] = (w[d] ?? 0) + 1.5;
  }
  return w;
}
