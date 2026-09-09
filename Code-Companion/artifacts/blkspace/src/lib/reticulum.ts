import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri-api";

/** Optional Reticulum (RNS) Route B — bundled native rns/rnsd, never required on Tier 0. */
export interface ReticulumStatus {
  ok: boolean;
  available: boolean;
  reason: string;
  detail: string;
  rnsd?: string | null;
  rns?: string | null;
  bundled?: boolean;
  lxmf?: boolean;
  rnode?: boolean;
  pythonSidecar?: boolean;
  spoolDir?: string;
  keysDir?: string;
  install?: string | null;
}

export const RNS_INSTALL_HINT =
  "Full: drop native rnsd/rns next to the app (or set BLKSPACE_RNSD). Do not pip install rns.";

export const RNS_POLICY = {
  pythonSidecar: false,
  lxmfIdentityStore: false,
  rnodeSerialBle: false,
  destHashesNextToNostrKeys: false,
} as const;

export async function getReticulumStatus(): Promise<ReticulumStatus> {
  if (!isTauri()) {
    return {
      ok: true,
      available: false,
      reason: "web_only",
      detail:
        "RNS is desktop Full only. Bundled native rnsd — no Python sidecar, no LXMF store, no RNode.",
      bundled: false,
      lxmf: false,
      rnode: false,
      pythonSidecar: false,
      install: RNS_INSTALL_HINT,
    };
  }
  return invoke<ReticulumStatus>("reticulum_status");
}

export async function reticulumAnnounceYard(
  yard: string,
  handle: string,
): Promise<unknown> {
  return invoke("reticulum_announce_yard", { yard, handle });
}

export async function reticulumSendYardNote(
  yard: string,
  handle: string,
  text: string,
): Promise<unknown> {
  return invoke("reticulum_send_yard_note", { yard, handle, text });
}
