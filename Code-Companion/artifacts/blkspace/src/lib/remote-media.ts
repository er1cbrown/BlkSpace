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
  let target: UploadTarget;
  try {
    const res = await fetch("/api/media/upload-target", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        mime: file.type,
        size: file.size,
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as UploadTarget & { ok?: boolean };
    if (!body.uploadUrl || !body.publicUrl) return null;
    target = body;
  } catch {
    return null;
  }

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
