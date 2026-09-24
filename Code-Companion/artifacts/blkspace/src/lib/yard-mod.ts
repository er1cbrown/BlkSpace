/**
 * Yard moderation for the browser app.
 * Founder mods can hide posts, ban handles, and move the daily earn cap
 * inside a fixed band so a mod cannot starve the yard or open a farm.
 */

import { getCurrentHandle } from "@/lib/auth";

export const FOUNDER_MODS = ["er1cbrown"] as const;

/** Default daily WeixBucks cap. Matches the desktop economy. */
export const EARN_CAP_DEFAULT = 250;
/** Floor. Below this, posting stops feeling worth it. */
export const EARN_CAP_MIN = 100;
/** Ceiling. Above this, repeat posting farms the yard. */
export const EARN_CAP_MAX = 400;
export const EARN_CAP_STEP = 25;

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

export function clampEarnCap(value: number): number {
  if (!Number.isFinite(value)) return EARN_CAP_DEFAULT;
  const stepped = Math.round(value / EARN_CAP_STEP) * EARN_CAP_STEP;
  return Math.min(EARN_CAP_MAX, Math.max(EARN_CAP_MIN, stepped));
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
}

export function dismissReport(reportId: string) {
  if (!isYardMod()) throw new Error("Only a yard mod can dismiss a report");
  patchReport(reportId, "dismissed");
}

export function postVisible(post: {
  id: number;
  authorHandle: string;
}): boolean {
  return !isPostHidden(post.id) && !isHandleBanned(post.authorHandle);
}
