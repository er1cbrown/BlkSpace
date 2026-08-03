/**
 * Persist MyYard layout on web when Tauri is unavailable.
 * Desktop still uses profile_layout_json via Tauri.
 */

import {
  parseMyYardLayout,
  serializeMyYardLayout,
  type MyYardLayout,
} from "@/lib/myyard-layout";

const key = (handle: string) => `blkspace_myyard_layout_${handle}`;

export function loadLocalMyYard(handle: string): MyYardLayout | null {
  try {
    const raw = localStorage.getItem(key(handle));
    if (!raw) return null;
    return parseMyYardLayout(raw);
  } catch {
    return null;
  }
}

export function saveLocalMyYard(handle: string, layout: MyYardLayout): void {
  try {
    localStorage.setItem(key(handle), serializeMyYardLayout(layout));
    window.dispatchEvent(
      new CustomEvent("blkspace-myyard", { detail: { handle } }),
    );
  } catch {
    /* quota */
  }
}
