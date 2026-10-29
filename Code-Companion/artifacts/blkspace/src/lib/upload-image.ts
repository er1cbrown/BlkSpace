/**
 * Photo upload. R2 is used when this host has it. Otherwise the bytes go
 * to the yard and come back as a link anyone on this host can open.
 */
import { createHttpAuthHeader } from "@/lib/auth";
import { uploadHostedMedia } from "@/lib/remote-media";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

function uploadName(file: File): string {
  const base = (file.name.split(/[/\\]/).pop() || "photo").slice(0, 80);
  if (/\.(jpe?g|png|gif|webp)$/i.test(base)) return base;
  const ext = EXT_BY_MIME[file.type.toLowerCase().split(";", 1)[0].trim()];
  return ext ? `${base.replace(/\.$/, "")}.${ext}` : base;
}

function unconfigured(message: string): boolean {
  return (
    message === "Cloud file uploads are not configured." ||
    message === "r2 not configured"
  );
}

async function postYardImage(file: File): Promise<string> {
  const name = uploadName(file);
  const route = `/api/yards/image?name=${encodeURIComponent(name)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = file.type.toLowerCase().startsWith("image/")
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
    throw new Error("Could not reach the yard to upload this image.");
  }
  const body = (await res.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;
  const url = String(body?.url || "");
  if (!res.ok || !url.startsWith("/api/yards/image/")) {
    throw new Error(body?.error || `Image upload failed (${res.status}).`);
  }
  return new URL(url, window.location.origin).href;
}

/** Public URL for one image. Throws when the bytes did not land. */
export async function uploadImageFile(file: File): Promise<string> {
  try {
    const hosted = await uploadHostedMedia(file);
    if (hosted) return hosted;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.startsWith("Sign in")) throw err;
    if (!unconfigured(message)) throw err;
  }
  return postYardImage(file);
}
