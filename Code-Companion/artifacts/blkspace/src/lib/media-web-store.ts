/**
 * Browser portfolio store for attached post media.
 * Bytes live in IndexedDB so a post still has its photo, video, or file
 * after a reload. The in-memory map is the hot cache MediaDisplay reads.
 */

export interface WebBlobRecord {
  id: string;
  filename: string;
  mime: string;
  size: number;
  dataUrl: string;
}

const DB_NAME = "blkspace_portfolio";
const DB_STORE = "blobs";
const store = new Map<string, WebBlobRecord>();

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) {
        req.result.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function idbPut(rec: WebBlobRecord): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(rec, rec.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("portfolio write failed"));
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

let hydrated: Promise<void> | null = null;

/** Load saved files into memory before the feed paints them. */
export function whenWebBlobsReady(): Promise<void> {
  if (!hydrated) {
    hydrated = (async () => {
      const db = await openDb();
      if (!db) return;
      const rows = await new Promise<WebBlobRecord[]>((resolve) => {
        const tx = db.transaction(DB_STORE, "readonly");
        const req = tx.objectStore(DB_STORE).getAll();
        req.onsuccess = () => resolve((req.result as WebBlobRecord[]) ?? []);
        req.onerror = () => resolve([]);
      });
      for (const rec of rows) {
        if (rec?.id) store.set(rec.id, rec);
      }
    })();
  }
  return hydrated;
}

export async function webStoreFile(
  file: File,
  dataUrl: string,
): Promise<string> {
  const id = `web_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const rec: WebBlobRecord = {
    id,
    filename: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    dataUrl,
  };
  store.set(id, rec);
  await idbPut(rec);
  void fetch("/api/portfolio/blob", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(rec),
  }).catch(() => {});
  return id;
}

export function webGetBlob(id: string): WebBlobRecord | null {
  return store.get(id) ?? null;
}

export async function webGetBlobAsync(
  id: string,
): Promise<WebBlobRecord | null> {
  await whenWebBlobsReady();
  return store.get(id) ?? null;
}

/** Drop a file the user removed before posting. Posted files stay. */
export function webDeleteBlob(id: string): void {
  store.delete(id);
  void idbDelete(id);
}

export function isWebBlobId(id: string): boolean {
  return id.startsWith("web_");
}
