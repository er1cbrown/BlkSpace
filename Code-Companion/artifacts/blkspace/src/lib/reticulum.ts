import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri-api";

/** Optional Reticulum (RNS) bridge status — Route B, never required on Tier 0. */
export interface ReticulumStatus {
  ok: boolean;
  available: boolean;
  reason: string;
  detail: string;
  python?: string | null;
  install?: string | null;
}

export async function getReticulumStatus(): Promise<ReticulumStatus> {
  if (!isTauri()) {
    return {
      ok: true,
      available: false,
      reason: "web_only",
      detail: "RNS bridge is desktop-only. Tier 0 feed does not need it.",
      install: "pip install rns",
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
