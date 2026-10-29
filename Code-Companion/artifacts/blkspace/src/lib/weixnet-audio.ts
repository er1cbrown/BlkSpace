/**
 * WeixNet carries the disc note. The yard market prices the copy in WeixBucks.
 * A relay note names a hosted master and never includes the audio bytes.
 * A pass pays the sleeve again.
 */
import { signWebNote } from "@/lib/auth";
import { isSafeHttpUrl } from "@/lib/amalgamation-meta";
import { listingPriceSymbol } from "@/lib/blkcore-finance";
import { publishToRelays } from "@/lib/weixnet-relays";
import { WEIXSOUND_LABEL } from "@/lib/weixsound";

export type AudioFileLane = "https" | "yard" | "device";
export type AudioMove = "release" | "pass";

export interface WeixNetDisc {
  id: string;
  title: string;
  authorHandle: string;
  priceWb: number;
  editionSize: number;
  tracks: { src: string }[];
}

export interface WeixNetAudioPlan {
  fileLane: AudioFileLane;
  symbol: "WB";
  priceWb: number;
  content: string;
  tags: string[][];
}

function hostedMasters(disc: WeixNetDisc): string[] {
  return disc.tracks
    .map((track) => track.src.trim())
    .filter((src) => isSafeHttpUrl(src));
}

export function weixnetAudioPlan(
  disc: WeixNetDisc,
  move: AudioMove,
  askWb?: number,
): WeixNetAudioPlan {
  const symbol = listingPriceSymbol();
  const masters = hostedMasters(disc);
  const allHosted =
    disc.tracks.length > 0 && masters.length === disc.tracks.length;
  const fileLane: AudioFileLane = !allHosted
    ? "device"
    : masters.every((src) => src.startsWith("https://"))
      ? "https"
      : "yard";
  const priceWb =
    move === "pass"
      ? Math.max(0, Math.floor(Number(askWb) || 0))
      : Math.max(0, Math.floor(Number(disc.priceWb) || 0));
  const title = disc.title.trim() || "Untitled";
  const artist = disc.authorHandle.trim() || "artist";
  const fileLine =
    fileLane === "device"
      ? "The file stays on the releasing device."
      : `Master ${masters[0]}`;
  const marketLine =
    move === "pass"
      ? `A numbered copy is offered at ${priceWb} ${symbol}. The sleeve is paid again. The holder is not paid.`
      : priceWb > 0
        ? `Free play. The market asks ${priceWb} ${symbol} for one of ${Math.max(1, disc.editionSize)} numbered copies.`
        : "Free play. The market has no priced copy.";
  const content = `${WEIXSOUND_LABEL} · @${artist} · ${title}. ${marketLine} ${fileLine}`;
  const tags = [
    ["t", "weixnet-audio"],
    ["t", move],
    ["d", disc.id],
    ["price", symbol, String(priceWb)],
  ];
  return { fileLane, symbol, priceWb, content, tags };
}

export function weixnetAudioLine(disc: WeixNetDisc): string {
  const plan = weixnetAudioPlan(disc, "release");
  const file =
    plan.fileLane === "https"
      ? "WeixNet carries the master."
      : plan.fileLane === "yard"
        ? "The yard hosts this file."
        : "WeixNet carries the disc. The file stays on the releasing device.";
  const market =
    plan.priceWb > 0
      ? `The market asks ${plan.priceWb} ${plan.symbol}.`
      : "Play is free.";
  return `${file} ${market}`;
}

/** Send the catalog note. Unsigned browsers keep the disc on the yard. */
export async function publishAudioOnWeixNet(
  disc: WeixNetDisc,
  move: AudioMove,
  askWb?: number,
): Promise<WeixNetAudioPlan & { sent: boolean; reason: string }> {
  const plan = weixnetAudioPlan(disc, move, askWb);
  const note = signWebNote(plan.content, plan.tags);
  if (!note) {
    return {
      ...plan,
      sent: false,
      reason: "Sign in to send this disc on WeixNet.",
    };
  }
  try {
    const result = await publishToRelays(note);
    return {
      ...plan,
      sent: result.ok,
      reason: result.ok
        ? ""
        : result.reason || "No WeixNet relay accepted the note.",
    };
  } catch (err) {
    return {
      ...plan,
      sent: false,
      reason:
        err instanceof Error ? err.message : "WeixNet did not take the note.",
    };
  }
}
