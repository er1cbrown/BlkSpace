/**
 * Ethical identity & med-school security posture for BlkSpace.
 *
 * Handles are already the primary identity (Nostr keys + handle).
 * Institutional affiliation is a *claim with levels* — not fake SSO.
 * Real campus SSO / IEEE formal audit remain process work outside the app.
 */

export type InstitutionalRole =
  "faculty" | "student" | "staff" | "partner" | "other";

export type ClaimLevel =
  /** User asserted role; no external check */
  | "self_attested"
  /** User declared institutional email domain (stored; not cryptographically verified) */
  | "domain_declared"
  /** Reserved for future real IdP / registrar proof */
  | "institution_verified";

export interface InstitutionalClaim {
  handle: string;
  institution: string;
  role: InstitutionalRole;
  /** e.g. meharry.edu — declared only unless claimLevel upgrades */
  emailDomain: string;
  claimLevel: ClaimLevel;
  noPhiAck: boolean;
  ethicalAck: boolean;
  contactPreferHandle: boolean;
  /** Optional mailto for org-lead contact only — never public without consent */
  contactEmailMasked: boolean;
  contactEmail: string;
  at: string;
}

const CLAIM_KEY = "blkspace_institutional_claim_v1";
const ETHICS_KEY = "blkspace_ethics_ack_v1";

export const NO_PHI_POLICY = {
  title: "No PHI / clinical secrets on BKSPC",
  body: "BKSPC is not a covered entity EMR and is not HIPAA-certified clinical messaging. Never send patient names, MRNs, diagnoses, images, or identifiable health data. Use official hospital systems for clinical work. Violations may result in blocks and account review.",
} as const;

export const IEEE_ETHICS_PRINCIPLES = [
  {
    id: "public",
    title: "Public interest & non-maleficence",
    body: "Design prioritizes student and patient safety over engagement hacks. No dark patterns for coin FOMO in med contexts.",
  },
  {
    id: "honesty",
    title: "Honesty about capabilities",
    body: "Self-attested faculty tags are labeled. Domain claims are declared, not SSO-verified, until a real IdP is wired. Link-out live is not native streaming.",
  },
  {
    id: "privacy",
    title: "Privacy & data minimization",
    body: "Handles and keys are primary identity. GPA and email share only with explicit opt-in to org leads. Soft WeixBucks are not tradable investment advice.",
  },
  {
    id: "fairness",
    title: "Fairness for underrepresented communities",
    body: "ProjectConnect and Focus Path reduce gatekeeping. Faculty pipeline tools must not extract talent without reciprocal mentorship and Cred accountability.",
  },
  {
    id: "transparency",
    title: "Transparency & accountability",
    body: "Interest, DMs, and event hosts leave audit-friendly trails (who messaged whom, no content logging of PHI). Users can block and report.",
  },
  {
    id: "security",
    title: "Security ethics",
    body: "Sessions rate-limited. Org posting is owner/lead only. DMs require ethical + no-PHI acknowledgement. Experimental crypto DMs are labeled unsafe for sensitive data.",
  },
] as const;

export function loadInstitutionalClaim(
  handle?: string | null,
): InstitutionalClaim | null {
  try {
    const raw = localStorage.getItem(CLAIM_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as InstitutionalClaim;
    if (handle && c.handle && c.handle !== handle) return null;
    return c;
  } catch {
    return null;
  }
}

export function saveInstitutionalClaim(claim: InstitutionalClaim) {
  localStorage.setItem(CLAIM_KEY, JSON.stringify(claim));
  if (claim.role === "faculty") {
    try {
      localStorage.setItem(
        "blkspace_faculty_badge_v1",
        JSON.stringify({
          enabled: true,
          institution: claim.institution,
          selfAttested: claim.claimLevel === "self_attested",
          at: claim.at,
        }),
      );
    } catch {
      /* ignore */
    }
  }
}

export function declareInstitutionalClaim(input: {
  handle: string;
  institution: string;
  role: InstitutionalRole;
  emailDomain?: string;
  contactEmail?: string;
  noPhiAck: boolean;
  ethicalAck: boolean;
}): InstitutionalClaim {
  if (!input.noPhiAck || !input.ethicalAck) {
    throw new Error("You must acknowledge No-PHI and ethical principles");
  }
  const domain = (input.emailDomain || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  const claim: InstitutionalClaim = {
    handle: input.handle,
    institution: input.institution.trim(),
    role: input.role,
    emailDomain: domain,
    claimLevel: domain ? "domain_declared" : "self_attested",
    noPhiAck: true,
    ethicalAck: true,
    contactPreferHandle: true,
    contactEmailMasked: true,
    contactEmail: (input.contactEmail || "").trim(),
    at: new Date().toISOString(),
  };
  saveInstitutionalClaim(claim);
  localStorage.setItem(ETHICS_KEY, JSON.stringify({ at: claim.at, ok: true }));
  return claim;
}

export function claimLevelLabel(level: ClaimLevel): string {
  switch (level) {
    case "self_attested":
      return "Self-attested";
    case "domain_declared":
      return "Domain declared (not SSO)";
    case "institution_verified":
      return "Institution verified";
    default:
      return level;
  }
}

export function hasEthicsAck(): boolean {
  try {
    const raw = localStorage.getItem(ETHICS_KEY);
    return !!raw && JSON.parse(raw).ok === true;
  } catch {
    return false;
  }
}
