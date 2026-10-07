/**
 * A prepared digiKam publish, written by tools/yard_photo_loop.py.
 * Posting still goes through the normal pic path.
 */

export type YardPhotoStatus =
  | "ready"
  | "needs-darktable"
  | "missing"
  | "too-big";

export interface YardPhotoItem {
  id: number;
  name: string;
  album: string;
  rating: number;
  tags: string[];
  source: string;
  status: YardPhotoStatus;
  detail: string;
  file: string;
  bytes: number;
  mime: string;
  width: number;
  height: number;
  caption: string;
}

export interface YardPhotoManifest {
  ok: boolean;
  missing?: boolean;
  error?: string;
  database?: string;
  generatedAt?: string;
  items: YardPhotoItem[];
}

const POSTED_KEY = "blkspace_yard_photo_posted_v1";

export function readyYardPhotos(items: YardPhotoItem[]): YardPhotoItem[] {
  return items.filter((item) => item.status === "ready" && item.file);
}

export function loadPostedYardIds(): number[] {
  try {
    const raw = localStorage.getItem(POSTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === "number");
  } catch {
    return [];
  }
}

export function rememberPostedYardId(id: number): number[] {
  const next = Array.from(new Set([...loadPostedYardIds(), id]));
  localStorage.setItem(POSTED_KEY, JSON.stringify(next));
  return next;
}
