/**
 * Perfect mesh skeleton — one social network, four scale rungs.
 * Intra-town → HBCU intranet → internet. Never pairwise N².
 * docs/mesh-perfect-skeleton.md
 */
import { INTRANET_PLATFORM_TAGS, townTagForYard } from "@/lib/hbcu-intranet";
import { CONNECTIVITY_ROUTES } from "@/lib/secure-connectivity-routes";

export const MESH_RUNGS = [
  {
    id: 0,
    name: "device",
    pipe: "Turso / SQLite",
    tag: null as string | null,
    role: "offline cache + queue — not a mesh peer",
  },
  {
    id: 1,
    name: "town",
    pipe: "Nostr + town relay",
    tag: "t:hbcu-town:<id>",
    role: "intra-campus wall",
  },
  {
    id: 2,
    name: "intranet",
    pipe: "shared relays",
    tag: "t:hbcu-intranet",
    role: "all yards, not Y² tunnels",
  },
  {
    id: 3,
    name: "internet",
    pipe: "public Nostr WS + Iroh",
    tag: "same events as 1–2",
    role: "WAN — not a new app",
  },
] as const;

/** Tags every Route A social note must carry (intranet + platform + town). */
export function meshTagsForYard(yardId: string): string[] {
  return [...INTRANET_PLATFORM_TAGS, townTagForYard(yardId)];
}

export function pairwiseYardTunnelsForbidden(yardCount: number): number {
  return (yardCount * (yardCount - 1)) / 2;
}

export function skeletonRoutes() {
  return CONNECTIVITY_ROUTES.map((r) => ({
    id: r.id,
    title: r.title,
    transport: r.transport,
  }));
}

/**
 * Use-case palette U is O(1) — one product, many rooms.
 * n users each running U is Θ(n|U|) = Θ(n). That meets Ω(n)
 * (must serve every user) and forbids Ω(n²) (a fork per persona).
 */
export const USE_CASE_PALETTE = [
  "guest-wall",
  "video-like-x",
  "visit-myyard",
  "own-myyard",
  "tribute-gold",
  "connect-cred",
  "arcade-newgrounds",
  "clinyard-focus",
  "omega-org", // e.g. ΩΨΦ / NSBE — still a w vector, not an app
] as const;

/** Ω(n): at least one unit of work per user. */
export function omegaNUsers(n: number): number {
  return Math.max(0, n);
}

/** Θ(n): palette is constant, so n users × |U| is linear. */
export function thetaNUseCases(n: number): number {
  return omegaNUsers(n) * USE_CASE_PALETTE.length;
}

export function workLooksQuadratic(n: number, measured: number): boolean {
  return n > 1 && measured >= n * n;
}
