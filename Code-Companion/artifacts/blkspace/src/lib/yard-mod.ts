/**
 * Yard moderation for the browser app.
 * Founder mods can hide posts, ban handles, and move the daily earn cap
 * inside a fixed band so a mod cannot starve the yard or open a farm.
 */

import { createHttpAuthHeader, getCurrentHandle, hasWebKey } from "@/lib/auth";
import { hostedPost } from "@/lib/hosted-api";
import { getHomeYardId } from "@/lib/focus-mode";
import {
  EARN_CAP_DEFAULT,
  EARN_CAP_MAX,
  EARN_CAP_MIN,
  EARN_CAP_STEP,
  clampEarnCap,
} from "@/lib/midf";

export {
  EARN_CAP_DEFAULT,
  EARN_CAP_MAX,
  EARN_CAP_MIN,
  EARN_CAP_STEP,
  clampEarnCap,
};

export const FOUNDER_MODS = ["er1cbrown"] as const;

const CAP_KEY = "blkspace_earn_cap_v1";
const REPORTS_KEY = "blkspace_reports_v1";
const HIDDEN_KEY = "blkspace_hidden_posts_v1";
const BANS_KEY = "blkspace_bans_v1";

export type ReportReason = "spam" | "harassment" | "scam" | "other";

export interface YardReport {
  id: string;
  postId: number;
  authorHandle: string;
  reporterHandle: string;
  reason: ReportReason;
  createdAt: string;
  status: "open" | "hidden" | "dismissed" | "banned";
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("blkspace-mod"));
}

export function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, "").trim().toLowerCase();
}

export function isYardMod(handle = getCurrentHandle()): boolean {
  return (FOUNDER_MODS as readonly string[]).includes(normalizeHandle(handle));
}

export function getEarnCap(): number {
  const stored = Number(localStorage.getItem(CAP_KEY));
  if (!stored) return EARN_CAP_DEFAULT;
  return clampEarnCap(stored);
}

export function setEarnCap(value: number): number {
  if (!isYardMod()) throw new Error("Only a yard mod can change the earn cap");
  const next = clampEarnCap(value);
  localStorage.setItem(CAP_KEY, String(next));
  window.dispatchEvent(new Event("blkspace-mod"));
  shareLater("/api/yards/mod/cap", { yardId: getHomeYardId(), capWb: next });
  return next;
}

export function listReports(): YardReport[] {
  return readJson<YardReport[]>(REPORTS_KEY, []);
}

export function listOpenReports(): YardReport[] {
  return listReports().filter((r) => r.status === "open");
}

export function reportPost(input: {
  postId: number;
  authorHandle: string;
  reason?: ReportReason;
}): YardReport {
  const reporter = normalizeHandle(getCurrentHandle());
  const reports = listReports();
  const duplicate = reports.find(
    (r) =>
      r.postId === input.postId &&
      r.reporterHandle === reporter &&
      r.status === "open",
  );
  if (duplicate) return duplicate;
  const report: YardReport = {
    id: `rep_${Date.now().toString(36)}`,
    postId: input.postId,
    authorHandle: normalizeHandle(input.authorHandle),
    reporterHandle: reporter,
    reason: input.reason ?? "spam",
    createdAt: new Date().toISOString(),
    status: "open",
  };
  writeJson(REPORTS_KEY, [report, ...reports].slice(0, 200));
  shareLater("/api/yards/mod/report", {
    yardId: getHomeYardId(),
    postId: report.postId,
    authorHandle: report.authorHandle,
    reason: report.reason,
  });
  return report;
}

function patchReport(id: string, status: YardReport["status"]) {
  writeJson(
    REPORTS_KEY,
    listReports().map((r) => (r.id === id ? { ...r, status } : r)),
  );
}

export function hiddenPostIds(): number[] {
  return readJson<number[]>(HIDDEN_KEY, []);
}

export function isPostHidden(postId: number): boolean {
  return hiddenPostIds().includes(postId);
}

export function hidePost(postId: number, reportId?: string) {
  if (!isYardMod()) throw new Error("Only a yard mod can hide a post");
  const ids = hiddenPostIds();
  if (!ids.includes(postId)) writeJson(HIDDEN_KEY, [...ids, postId]);
  if (reportId) patchReport(reportId, "hidden");
  shareLater("/api/yards/mod/hide", {
    yardId: getHomeYardId(),
    postId,
    reportId,
  });
}

export function bannedHandles(): string[] {
  return readJson<string[]>(BANS_KEY, []);
}

export function isHandleBanned(handle: string): boolean {
  return bannedHandles().includes(normalizeHandle(handle));
}

export function banHandle(handle: string, reportId?: string) {
  if (!isYardMod()) throw new Error("Only a yard mod can ban");
  const h = normalizeHandle(handle);
  if ((FOUNDER_MODS as readonly string[]).includes(h)) {
    throw new Error("The founder mod cannot be banned");
  }
  const bans = bannedHandles();
  if (!bans.includes(h)) writeJson(BANS_KEY, [...bans, h]);
  if (reportId) patchReport(reportId, "banned");
  shareLater("/api/yards/mod/ban", {
    yardId: getHomeYardId(),
    handle: h,
    reportId,
  });
}

export function dismissReport(reportId: string) {
  if (!isYardMod()) throw new Error("Only a yard mod can dismiss a report");
  patchReport(reportId, "dismissed");
  shareLater("/api/yards/mod/dismiss", {
    yardId: getHomeYardId(),
    reportId,
  });
}

export function postVisible(post: {
  id: number;
  authorHandle: string;
}): boolean {
  return !isPostHidden(post.id) && !isHandleBanned(post.authorHandle);
}

const SCORE_KEY = "blkspace_midf_you_v1";
const APPEALS_KEY = "blkspace_mod_appeals_v1";

export interface YardAppeal {
  id: string;
  handle: string;
  note: string;
  createdAt: string;
}

export interface YardScore {
  overall: number;
  risk: "low" | "medium" | "high";
  paused: boolean;
}

interface SharedMod {
  ok?: boolean;
  earnCapWb?: number;
  hiddenPostIds?: number[];
  bannedHandles?: string[];
  reports?: YardReport[];
  appeals?: YardAppeal[];
  you?: YardScore;
}

export function readYourScore(): YardScore | null {
  return readJson<YardScore | null>(SCORE_KEY, null);
}

export function readAppeals(): YardAppeal[] {
  return readJson<YardAppeal[]>(APPEALS_KEY, []);
}

function shareLater(path: string, input: unknown) {
  if (!hasWebKey()) return;
  void hostedPost(path, input)
    .then(() => syncYardMod(getHomeYardId(), true))
    .catch(() => undefined);
}

/** Pull the yard desk into this browser. A failed fetch leaves the local queue. */
export async function syncYardMod(yardId: string, auth = false): Promise<void> {
  const yard = yardId.trim().toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(yard)) return;
  const path = `/api/yards/mod?yard=${encodeURIComponent(yard)}`;
  try {
    const headers: Record<string, string> = {};
    if (auth && hasWebKey()) {
      headers.authorization = createHttpAuthHeader(path, "GET", "");
    }
    const res = await fetch(path, { headers });
    if (!res.ok) return;
    const body = (await res.json()) as SharedMod;
    if (!body?.ok) return;
    if (Array.isArray(body.hiddenPostIds)) {
      writeJson(
        HIDDEN_KEY,
        body.hiddenPostIds.map((id) => Number(id)).filter((id) => id > 0),
      );
    }
    if (Array.isArray(body.bannedHandles)) {
      writeJson(
        BANS_KEY,
        body.bannedHandles
          .map((handle) => normalizeHandle(handle))
          .filter(Boolean),
      );
    }
    if (typeof body.earnCapWb === "number") {
      localStorage.setItem(CAP_KEY, String(clampEarnCap(body.earnCapWb)));
    }
    if (Array.isArray(body.reports)) {
      writeJson(REPORTS_KEY, body.reports);
    }
    if (body.you && typeof body.you.overall === "number") {
      writeJson(SCORE_KEY, body.you);
    }
    if (Array.isArray(body.appeals)) writeJson(APPEALS_KEY, body.appeals);
    window.dispatchEvent(new Event("blkspace-mod"));
  } catch {
    return;
  }
}
