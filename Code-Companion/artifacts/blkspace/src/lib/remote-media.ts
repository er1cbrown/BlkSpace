/**
 * Phone-ready media. Photos and files go to Cloudflare R2.
 * Video goes to Cloudflare Stream. The browser only receives an upload URL.
 */

export function isRemoteMediaUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

export function isStreamUrl(value: string): boolean {
  return (
    value.includes("iframe.videodelivery.net") ||
    value.includes("cloudflarestream.com") ||
    value.includes("videodelivery.net")
  );
}

export interface UploadTarget {
  provider: "r2" | "stream";
  method: "PUT" | "POST";
  uploadUrl: string;
  publicUrl: string;
}

/** Upload one file. Returns the public URL, or null when R2/Stream is not configured. */
export async function uploadHostedMedia(file: File): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch("/api/media/upload-target", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        mime: file.type,
        size: file.size,
      }),
    });
  } catch {
    throw new Error("Could not reach the media upload service. Check your connection and try again.");
  }

  // Static previews and explicitly unconfigured hosts keep browser-local storage.
  // A configured provider's failure must never look like a successful local save.
  if (res.status === 404) return null;
  const body = await res.json().catch(() => null) as
    | (Partial<UploadTarget> & { ok?: boolean; error?: string })
    | null;
  if (
    res.status === 503 &&
    (body?.error === "stream not configured" || body?.error === "r2 not configured")
  ) return null;
  if (res.ok && !body && res.headers.get("content-type")?.includes("text/html")) {
    return null;
  }
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.error || `Media upload service failed (${res.status})`);
  }
  if (
    !body?.uploadUrl || !body.publicUrl ||
    (body.method !== "PUT" && body.method !== "POST") ||
    (body.provider !== "r2" && body.provider !== "stream")
  ) {
    throw new Error("Media upload service returned an invalid upload target.");
  }
  const target: UploadTarget = {
    provider: body.provider,
    method: body.method,
    uploadUrl: body.uploadUrl,
    publicUrl: body.publicUrl,
  };

  if (target.method === "PUT") {
    const put = await fetch(target.uploadUrl, {
      method: "PUT",
      body: file,
      headers: file.type ? { "content-type": file.type } : undefined,
    });
    if (!put.ok) {
      throw new Error(`R2 upload failed (${put.status})`);
    }
    return target.publicUrl;
  }

  const form = new FormData();
  form.append("file", file, file.name);
  const post = await fetch(target.uploadUrl, { method: "POST", body: form });
  if (!post.ok) {
    throw new Error(`Stream upload failed (${post.status})`);
  }
  return target.publicUrl;
}
