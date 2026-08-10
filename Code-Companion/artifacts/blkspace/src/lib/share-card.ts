/**
 * Share card — clipboard text + deep path for posts, hub items, playables.
 * Unblocks X/Twitter and Discord without OAuth (manual paste).
 * See docs/features/theoretical-playable-weixnet-capability-build.md (T1).
 */

import { BRAND } from "@/lib/brand";

export type ShareCardKind = "post" | "profile" | "hub" | "playable" | "ticket";

export interface ShareCardInput {
  kind: ShareCardKind;
  title?: string;
  body?: string;
  /** App path e.g. /posts/12 or /play?url=… */
  path?: string;
  /** External media / play URL (https only preferred) */
  externalUrl?: string;
  authorHandle?: string;
  yardId?: string;
  /** Sendme / blkspace1 ticket string */
  ticket?: string;
}

/** Absolute or root-relative URL for this session (Vite BASE_URL aware). */
export function appAbsoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return p;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const joined = `${base}${p}`.replace(/([^:]\/)\/+/g, "$1");
  try {
    return new URL(joined, window.location.origin).href;
  } catch {
    return `${window.location.origin}${joined}`;
  }
}

/** Path to sandboxed Play shell for a static HTTPS demo. */
export function playShellPath(playUrl: string): string {
  const q = new URLSearchParams({ url: playUrl.trim() });
  return `/play?${q.toString()}`;
}

export function buildShareText(input: ShareCardInput): string {
  const lines: string[] = [];
  const brand = BRAND.name || "BlkSpace";
  const handle = input.authorHandle ? `@${input.authorHandle.replace(/^@/, "")}` : "";

  switch (input.kind) {
    case "post":
      lines.push(
        input.title?.trim() ||
          (input.body?.trim().slice(0, 120) || "Yard post") +
            (input.body && input.body.length > 120 ? "…" : ""),
      );
      if (input.body && input.title) {
        lines.push(input.body.trim().slice(0, 200));
      }
      if (handle) lines.push(`— ${handle}${input.yardId ? ` · ${input.yardId}` : ""}`);
      break;
    case "profile":
      lines.push(`${handle || "Profile"} on ${brand}`);
      if (input.body?.trim()) lines.push(input.body.trim().slice(0, 160));
      break;
    case "hub":
      lines.push(input.title?.trim() || "Content Hub drop");
      if (input.body?.trim()) lines.push(input.body.trim().slice(0, 180));
      if (handle) lines.push(`— ${handle}`);
      break;
    case "playable":
      lines.push(input.title?.trim() || "Playable demo on the yard");
      if (input.body?.trim()) lines.push(input.body.trim().slice(0, 140));
      lines.push("Open in browser Play shell (WASM/static — not a git forge).");
      break;
    case "ticket":
      lines.push(input.title?.trim() || "WeixNet drop ticket");
      if (input.ticket) lines.push(input.ticket.trim());
      break;
  }

  if (input.path) {
    lines.push("");
    lines.push(appAbsoluteUrl(input.path));
  } else if (input.externalUrl) {
    lines.push("");
    lines.push(input.externalUrl.trim());
  }

  lines.push("");
  lines.push(`#${brand.replace(/\s+/g, "")} #HBCU`);
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

export async function copyShareCard(input: ShareCardInput): Promise<string> {
  const text = buildShareText(input);
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return text;
  }
  // Fallback for restricted contexts
  if (typeof document !== "undefined") {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  return text;
}
