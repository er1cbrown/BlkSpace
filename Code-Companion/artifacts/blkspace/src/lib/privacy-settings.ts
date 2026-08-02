/**
 * GPA & Connect privacy preferences.
 * Default: GPA private — never shown on public profile; only attached to
 * ProjectConnect applications when visibility is connect_leads|public AND
 * the applicant opts in on that apply.
 */

export type GpaVisibility = "private" | "connect_leads" | "public";

export interface PrivacySettings {
  /** Stored as string for form binding; empty = not set */
  gpa: string;
  /**
   * private — never share, hide from profile & applications
   * connect_leads — may share with opportunity leads when applying (opt-in)
   * public — may show on pro profile; applications still require opt-in share
   */
  gpaVisibility: GpaVisibility;
  /** When true and visibility allows, pre-check "share GPA" on Connect apply */
  shareGpaOnApplyDefault: boolean;
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  gpa: "",
  gpaVisibility: "private",
  shareGpaOnApplyDefault: false,
};

const LS_KEY = "blkspace_privacy_settings_v1";

export function loadPrivacySettings(): PrivacySettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_PRIVACY };
    const parsed = JSON.parse(raw) as Partial<PrivacySettings>;
    return {
      ...DEFAULT_PRIVACY,
      ...parsed,
      gpaVisibility: normalizeVisibility(parsed.gpaVisibility),
    };
  } catch {
    return { ...DEFAULT_PRIVACY };
  }
}

export function savePrivacySettings(settings: PrivacySettings): void {
  const next: PrivacySettings = {
    gpa: sanitizeGpa(settings.gpa),
    gpaVisibility: normalizeVisibility(settings.gpaVisibility),
    shareGpaOnApplyDefault: !!settings.shareGpaOnApplyDefault,
  };
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}

export function normalizeVisibility(v: unknown): GpaVisibility {
  if (v === "connect_leads" || v === "public" || v === "private") return v;
  return "private";
}

/** Accept 0–4.0 style values; empty ok */
export function sanitizeGpa(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 4.5) return "";
  return (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, (m) =>
    m.includes(".") ? m.replace(/0+$/, "").replace(/\.$/, "") : m,
  );
}

export function formatGpaDisplay(gpa: string): string {
  const s = sanitizeGpa(gpa);
  return s || "—";
}

export function canShareGpaOnConnect(settings: PrivacySettings): boolean {
  return (
    settings.gpaVisibility !== "private" &&
    !!sanitizeGpa(settings.gpa)
  );
}

export function canShowGpaOnPublicProfile(settings: PrivacySettings): boolean {
  return settings.gpaVisibility === "public" && !!sanitizeGpa(settings.gpa);
}

/** Merge privacy fields from pro_profile_json if present (Tauri users). */
export function mergePrivacyFromProJson(
  base: PrivacySettings,
  proJson?: string | null,
): PrivacySettings {
  if (!proJson) return base;
  try {
    const p = JSON.parse(proJson) as Record<string, unknown>;
    const privacy = (p.privacy ?? p) as Partial<PrivacySettings> & {
      gpa?: string;
      gpaVisibility?: GpaVisibility;
    };
    return {
      gpa:
        typeof privacy.gpa === "string"
          ? privacy.gpa
          : base.gpa,
      gpaVisibility: normalizeVisibility(
        privacy.gpaVisibility ?? base.gpaVisibility,
      ),
      shareGpaOnApplyDefault:
        typeof privacy.shareGpaOnApplyDefault === "boolean"
          ? privacy.shareGpaOnApplyDefault
          : base.shareGpaOnApplyDefault,
    };
  } catch {
    return base;
  }
}

/** Embed privacy into pro profile JSON without wiping other fields. */
export function embedPrivacyInProJson(
  proJson: string | undefined,
  privacy: PrivacySettings,
): string {
  let base: Record<string, unknown> = {};
  try {
    if (proJson) base = JSON.parse(proJson) as Record<string, unknown>;
  } catch {
    base = {};
  }
  return JSON.stringify({
    ...base,
    gpa: sanitizeGpa(privacy.gpa),
    gpaVisibility: privacy.gpaVisibility,
    shareGpaOnApplyDefault: privacy.shareGpaOnApplyDefault,
    privacy: {
      gpa: sanitizeGpa(privacy.gpa),
      gpaVisibility: privacy.gpaVisibility,
      shareGpaOnApplyDefault: privacy.shareGpaOnApplyDefault,
    },
  });
}

export const GPA_VISIBILITY_HELP: Record<GpaVisibility, string> = {
  private:
    "GPA stays only on this device settings. Never on your public profile. Cannot attach to ProjectConnect applications.",
  connect_leads:
    "GPA is not public. You may opt in to share it with an opportunity’s org leads when you apply.",
  public:
    "GPA may appear on your professional profile. Applications still require an explicit opt-in to attach GPA.",
};
