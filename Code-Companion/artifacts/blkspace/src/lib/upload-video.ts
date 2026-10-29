/**
 * Wall video upload. Stream is used when this host has it. Otherwise the
 * bytes go to the yard and come back as a link anyone on this host can play.
 */
import { createHttpAuthHeader } from "@/lib/auth";
import { uploadHostedMedia } from "@/lib/remote-media";

const EXT_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/x-msvideo": "avi",
  "video/x-matroska": "mkv",
};

function uploadName(file: File): string {
  const base = (file.name.split(/[/\\]/).pop() || "clip").slice(0, 80);
  if (/\.(mp4|m4v|webm|mov|avi|mkv)$/i.test(base)) return base;
  const ext = EXT_BY_MIME[file.type.toLowerCase().split(";", 1)[0].trim()];
  return ext ? `${base.replace(/\.$/, "")}.${ext}` : base;
}

async function postYardVideo(file: File): Promise<string> {
  const name = uploadName(file);
  const route = `/api/yards/video?name=${encodeURIComponent(name)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = file.type.toLowerCase().startsWith("video/")
    ? file.type
    : "application/octet-stream";
  let res: Response;
  try {
    res = await fetch(route, {
      method: "POST",
      headers: {
        "content-type": mime,
        authorization: createHttpAuthHeader(route, "POST", bytes),
      },
      body: bytes,
    });
  } catch {
    throw new Error("Could not reach the yard to upload this video.");
  }
  const body = (await res.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;
  const url = String(body?.url || "");
  if (!res.ok || !url.startsWith("/api/yards/video/")) {
    throw new Error(body?.error || `Video upload failed (${res.status}).`);
  }
  return new URL(url, window.location.origin).href;
}

/** Public URL for one video. Throws when the bytes did not land. */
export async function uploadVideoFile(file: File): Promise<string> {
  try {
    const hosted = await uploadHostedMedia(file);
    if (hosted) return hosted;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.startsWith("Sign in")) throw err;
  }
  return postYardVideo(file);
}
