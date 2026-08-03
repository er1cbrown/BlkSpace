/**
 * In-memory web fallback when Tauri upload_blob is unavailable.
 * Same-session only — survives SPA navigation, not full reload.
 */

export interface WebBlobRecord {
  id: string;
  filename: string;
  mime: string;
  size: number;
  dataUrl: string;
}

const store = new Map<string, WebBlobRecord>();

export function webStoreFile(file: File, dataUrl: string): string {
  const id = `web_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  store.set(id, {
    id,
    filename: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    dataUrl,
  });
  return id;
}

export function webGetBlob(id: string): WebBlobRecord | null {
  return store.get(id) ?? null;
}

export function webDeleteBlob(id: string): void {
  store.delete(id);
}

export function isWebBlobId(id: string): boolean {
  return id.startsWith("web_");
}
