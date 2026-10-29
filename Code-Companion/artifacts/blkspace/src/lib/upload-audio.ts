/**
 * Records upload. R2 is used when this host has it. Otherwise the bytes go
 * to the yard and come back as a link anyone on this host can play.
 */
import { createHttpAuthHeader } from "@/lib/auth";
import { uploadHostedMedia } from "@/lib/remote-media";

const EXT_BY_MIME: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/x-aac": "aac",
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/webm": "webm",
};

function uploadName(file: File): string {
  const base = (file.name.split(/[/\\]/).pop() || "track").slice(0, 80);
  if (/\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(base)) return base;
  const ext = EXT_BY_MIME[file.type.toLowerCase().split(";", 1)[0].trim()];
  return ext ? `${base.replace(/\.$/, "")}.${ext}` : base;
}

function unconfigured(message: string): boolean {
  return (
    message === "Cloud file uploads are not configured." ||
    message === "r2 not configured"
  );
}

async function postYardAudio(file: File): Promise<string> {
  const name = uploadName(file);
  const route = `/api/yards/audio?name=${encodeURIComponent(name)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = file.type.toLowerCase().startsWith("audio/")
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
    throw new Error("Could not reach the yard to upload this audio.");
  }
  const body = (await res.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;
  const url = String(body?.url || "");
  if (!res.ok || !url.startsWith("/api/yards/audio/")) {
    throw new Error(body?.error || `Audio upload failed (${res.status}).`);
  }
  return new URL(url, window.location.origin).href;
}

/** Public URL for one audio file. Throws when the bytes did not land. */
export async function uploadAudioFile(file: File): Promise<string> {
  try {
    const hosted = await uploadHostedMedia(file);
    if (hosted) return hosted;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.startsWith("Sign in")) throw err;
    if (!unconfigured(message)) throw err;
  }
  return postYardAudio(file);
}
