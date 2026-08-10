/**
 * Yard Arcade — campus homebrew games shelf (Newgrounds/Y8 class).
 * Not Steam. Not Roblox. Optional vertical on Hub playables + Play shell.
 *
 * Scope: in-product vertical A+B (catalog + free/WB list hooks).
 * Out: global CDN store, multiplayer cloud, licensed Steam-class platform.
 */

import {
  injectHubItemsIfAbsent,
  listHubItems,
  publishHubItem,
  type HubItem,
  type HubTopic,
} from "@/lib/content-hub";
import { isSafeHttpUrl } from "@/lib/amalgamation-meta";
import { playShellPath } from "@/lib/share-card";
import { loadUiPrefs } from "@/lib/ui-prefs";

export const YARD_ARCADE_NAME = "Yard Arcade";

/** Soft size guidance — not enforced bytes on HTTPS links (client-side honesty). */
export type ArcadeSizeClass = "micro" | "tier0" | "full";

export type ArcadeRuntime = "wasm-static" | "external" | "swf-optional";

export interface ArcadeSizeMeta {
  id: ArcadeSizeClass;
  label: string;
  blurb: string;
  /** Soft max hint for authors (MB) */
  softMaxMb: number;
}

export const ARCADE_SIZE_CLASSES: ArcadeSizeMeta[] = [
  {
    id: "micro",
    label: "Micro",
    blurb: "Jam games · under a few MB · great on Tier 0",
    softMaxMb: 5,
  },
  {
    id: "tier0",
    label: "Tier 0",
    blurb: "Everyday laptop demos · keep packages lean",
    softMaxMb: 25,
  },
  {
    id: "full",
    label: "Full / lab",
    blurb: "Heavier builds — prefer Full pin nights, not every Yard install",
    softMaxMb: 100,
  },
];

export function sizeMeta(id: ArcadeSizeClass): ArcadeSizeMeta {
  return ARCADE_SIZE_CLASSES.find((s) => s.id === id) || ARCADE_SIZE_CLASSES[1];
}

/** Parse size class from earnHint / body tags [[size:micro]] */
export function parseArcadeSize(item: HubItem): ArcadeSizeClass {
  const blob = `${item.earnHint || ""} ${item.body || ""}`;
  if (/\[\[size:micro\]\]/i.test(blob) || /\bmicro\b/i.test(item.earnHint || ""))
    return "micro";
  if (/\[\[size:full\]\]/i.test(blob) || /\bfull\b/i.test(item.earnHint || ""))
    return "full";
  return "tier0";
}

export function parseArcadeRuntime(item: HubItem): ArcadeRuntime {
  const url = (item.mediaUrl || "").toLowerCase();
  if (url.endsWith(".swf") || /\[\[runtime:swf\]\]/i.test(item.body || ""))
    return "swf-optional";
  if (/\[\[runtime:external\]\]/i.test(item.body || "")) return "external";
  return "wasm-static";
}

/** Items that belong on Yard Arcade (homebrew play shelf). */
export function isArcadeItem(item: HubItem): boolean {
  if (item.kind === "playable") return true;
  if (
    (item.topic === "gaming" || item.topic === "systems") &&
    item.mediaUrl &&
    isSafeHttpUrl(item.mediaUrl)
  ) {
    return true;
  }
  return false;
}

export function listArcadeGames(filter?: {
  yardId?: string | "all";
  size?: ArcadeSizeClass | "all";
  q?: string;
}): HubItem[] {
  const all = listHubItems("all").filter(isArcadeItem);
  const yard = filter?.yardId && filter.yardId !== "all" ? filter.yardId : null;
  const size = filter?.size && filter.size !== "all" ? filter.size : null;
  const q = (filter?.q || "").trim().toLowerCase();

  return all.filter((item) => {
    if (yard && item.yardId !== yard) return false;
    if (size && parseArcadeSize(item) !== size) return false;
    if (q) {
      const hay =
        `${item.title} ${item.body} ${item.authorHandle} ${item.yardId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function arcadePlayPath(item: HubItem): string | null {
  const url = (item.mediaUrl || "").trim();
  if (!url || !isSafeHttpUrl(url)) return null;
  const base = playShellPath(url);
  const title = encodeURIComponent(item.title.slice(0, 80));
  return `${base}&title=${title}`;
}

export function publishArcadeGame(input: {
  title: string;
  body: string;
  playUrl: string;
  sizeClass?: ArcadeSizeClass;
  topic?: Extract<HubTopic, "gaming" | "systems">;
  yardId?: string;
  /** Soft WB list price — 0 free; storefront hook only (Yard Sale is separate) */
  listPriceWb?: number;
}): HubItem {
  const playUrl = input.playUrl.trim();
  if (!isSafeHttpUrl(playUrl)) {
    throw new Error("Play URL must be http(s) — host static/WASM demos safely");
  }
  const size = input.sizeClass || "tier0";
  const price = Math.max(0, Math.floor(input.listPriceWb || 0));
  const yard =
    input.yardId || loadUiPrefs().homeYardId || "tsu";
  const sizeTag = `[[size:${size}]]`;
  const priceHint =
    price > 0
      ? `List on Yard Sale ~${price} WB (soft) · free play link here`
      : "Free homebrew on Yard Arcade";

  const body = [input.body.trim(), sizeTag].filter(Boolean).join("\n\n");

  return publishHubItem({
    topic: input.topic || "gaming",
    kind: "playable",
    title: input.title,
    body,
    mediaUrl: playUrl,
    yardId: yard,
    earnHint: `${priceHint} · ${sizeMeta(size).label}`,
  });
}

/** One-line scope for UI honesty banners */
export function arcadeScopeLine(): string {
  return (
    "Yard Arcade = campus homebrew (Newgrounds/Y8 class). " +
    "Not Steam, not Roblox. Small packages on Tier 0; Full pin for heavy builds."
  );
}

/** Ensure seed catalog has arcade demos even if Hub was seeded earlier without them */
export function ensureArcadeSeeds(): void {
  try {
    const flag = "blkspace_yard_arcade_seeds_v1";
    if (localStorage.getItem(flag)) return;
    const existing = listArcadeGames();
    if (existing.length >= 2) {
      localStorage.setItem(flag, "1");
      return;
    }
    const now = Date.now();
    const seeds: HubItem[] = [
      {
        id: `arcade_seed_${now}_1`,
        topic: "gaming",
        kind: "playable",
        title: "Yard Arcade · WASM playground (sample)",
        body: "Campus homebrew sample — open in Play shell. [[size:micro]]\nNot Steam. Not Roblox. Your jam builds go here.",
        mediaUrl: "https://webassembly.github.io/wabt/demo/",
        authorHandle: "yard_arcade",
        authorDisplayName: "Yard Arcade",
        yardId: "tsu",
        createdAt: new Date(now - 3_600_000).toISOString(),
        earnHint: "Free homebrew · Micro · Yard Arcade",
      },
      {
        id: `arcade_seed_${now}_2`,
        topic: "systems",
        kind: "playable",
        title: "Systems jam · static demo link",
        body: "Systems / retro energy playable. Keep under Tier 0 when you can. [[size:tier0]]",
        mediaUrl: "https://webassembly.github.io/wabt/demo/",
        authorHandle: "yard_arcade",
        authorDisplayName: "Yard Arcade",
        yardId: "tsu",
        createdAt: new Date(now - 7_200_000).toISOString(),
        earnHint: "Free homebrew · Tier 0 · share card",
      },
      {
        id: `arcade_seed_${now}_3`,
        topic: "gaming",
        kind: "playable",
        title: "Club night · external play URL pattern",
        body: "External browser games welcome if https. Prefer self-hosted static for longevity. [[size:tier0]]",
        mediaUrl: "https://lichess.org/",
        authorHandle: "campus_king",
        authorDisplayName: "Campus King",
        yardId: "howard",
        createdAt: new Date(now - 10_800_000).toISOString(),
        earnHint: "Free · link-out style · tournaments optional",
      },
    ];
    injectHubItemsIfAbsent(seeds);
    localStorage.setItem(flag, "1");
  } catch {
    /* ignore storage */
  }
}
