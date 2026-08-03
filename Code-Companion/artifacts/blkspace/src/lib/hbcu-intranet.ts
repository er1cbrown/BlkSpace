/**
 * HBCU Intranet mesh — how all yards stay connected without O(N²) links.
 *
 * Model: shared-relay intranet (not BLE peer mesh, not 103 private tunnels).
 *
 * ```
 *  [TSU client]──┐                    ┌──[Howard client]
 *  [FAMU client]─┼── Nostr relays ────┼──[Spelman client]
 *  [… 100 more]──┘  (public / town)   └──[… all HBCUs]
 *                      │
 *         tags: t:hbcu-intranet  (backbone — every post)
 *               t:blkspace       (app identity)
 *               t:hbcu-town:<id> (campus partition)
 * ```
 *
 * - **Intranet wire:** subscribe `hbcu-intranet` + `blkspace` → see all yards
 * - **Home yard LAN:** subscribe `hbcu-town:tsu` (etc.) → campus feed only
 * - **Bridge:** combined feed across yards (cross-town discovery)
 * - Media: Iroh CIDs on notes; not required for text mesh
 */

import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri-api";
import { getSessionToken } from "@/lib/auth";
import { catalogStats, HBCU_CATALOG } from "@/lib/hbcu-catalog";
import { loadUiPrefs } from "@/lib/ui-prefs";

/** Platform tags every BlkSpace note should carry. */
export const INTRANET_PLATFORM_TAGS = ["hbcu-intranet", "blkspace"] as const;

export const TOWN_TAG_PREFIX = "hbcu-town:";

export function townTagForYard(yardId: string): string {
  const id = yardId.trim().toLowerCase().replace(/^hbcu-town:/, "");
  return `${TOWN_TAG_PREFIX}${id}`;
}

export function yardIdFromTownTag(tag: string): string {
  if (!tag) return "";
  if (tag.includes(":")) return tag.split(":").pop() || tag;
  return tag.replace(/^hbcu-town-?/i, "").toLowerCase();
}

export interface IntranetStatus {
  connected: boolean;
  relayCount: number;
  hasIntranetTag: boolean;
  subscriptions: string[];
  yardSubscriptions: string[];
  platformTags: string[];
  model: string;
  description: string;
}

export function intranetTopologySummary() {
  const stats = catalogStats();
  return {
    totalYards: stats.total,
    publicYards: stats.public,
    privateYards: stats.private,
    /** Logical links if fully meshed pairwise — we deliberately avoid this */
    pairwiseLinksIfFullMesh: (stats.total * (stats.total - 1)) / 2,
    /** Actual mesh links: shared relays + tags (constant, not N²) */
    meshModel: "shared-relay-intranet" as const,
    backboneTags: [...INTRANET_PLATFORM_TAGS],
    howItConnects: [
      "1. Clients connect to the same Nostr relay set (intranet backbone).",
      "2. Every post is tagged t:hbcu-intranet + t:blkspace + t:hbcu-town:<yard>.",
      "3. Background sync pulls backbone + your home yard every ~60s.",
      "4. Bridge / combined feed shows cross-yard notes without leaving BlkSpace.",
      "5. Optional: subscribe extra yards for multi-campus follows.",
    ],
  };
}

/** Connect default relays (if Tauri) and join intranet + home yard. */
export async function ensureIntranetConnected(
  homeYard?: string,
): Promise<{ ok: boolean; status?: IntranetStatus; error?: string }> {
  if (!isTauri()) {
    return {
      ok: true,
      status: {
        connected: false,
        relayCount: 0,
        hasIntranetTag: true,
        subscriptions: [...INTRANET_PLATFORM_TAGS],
        yardSubscriptions: homeYard ? [townTagForYard(homeYard)] : [],
        platformTags: [...INTRANET_PLATFORM_TAGS],
        model: "shared-relay-intranet",
        description: "Web preview — mesh active only in Tauri desktop.",
      },
    };
  }

  const token = getSessionToken();
  if (!token) {
    return { ok: false, error: "Sign in to join the HBCU intranet mesh." };
  }

  const yard =
    homeYard?.trim() ||
    loadUiPrefs().homeYardId ||
    localStorage.getItem("blkspace_home_yard") ||
    "tsu";

  try {
    // Best-effort: public relays
    try {
      await invoke("connect_to_default_relays");
    } catch {
      /* may already be connected */
    }

    await invoke<string[]>("join_hbcu_intranet", {
      sessionToken: token,
      homeYard: yard,
    });

    // Pull backbone + home yard once
    try {
      await invoke("sync_town_events", {
        sessionToken: token,
        town: "hbcu-intranet",
      });
    } catch {
      /* relays may be offline */
    }
    try {
      await invoke("sync_town_events", {
        sessionToken: token,
        town: yard,
      });
    } catch {
      /* optional */
    }

    const status = await getIntranetStatus();
    return { ok: true, status: status ?? undefined };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function getIntranetStatus(): Promise<IntranetStatus | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<IntranetStatus>("get_hbcu_intranet_status");
  } catch {
    return null;
  }
}

/** All catalog yard ids that can appear on the mesh. */
export function allMeshYardIds(): string[] {
  return HBCU_CATALOG.map((h) => h.id);
}
