/**
 * Web-preview profile song / tape storage (data URLs).
 * Desktop continues to use Tauri blob hashes + Iroh/local blob store.
 *
 * Playlist only exists when 2+ tracks are saved. One track stays a single song.
 */

const key = (handle: string) => `blkspace_profile_music_web_${handle}`;

export const MAX_WEB_TAPE = 3;

export type WebProfileMusic = {
  /** Synthetic id used as musicHash on web */
  id: string;
  trackName: string;
  dataUrl: string;
  savedAt: string;
};

type Stored =
  | WebProfileMusic
  | { tracks: WebProfileMusic[]; savedAt?: string };

function readStored(handle: string): WebProfileMusic[] {
  if (!handle) return [];
  try {
    const raw = localStorage.getItem(key(handle));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Stored;
    if (Array.isArray((parsed as { tracks?: WebProfileMusic[] }).tracks)) {
      return (parsed as { tracks: WebProfileMusic[] }).tracks.filter(
        (t) => t?.id && t?.dataUrl,
      );
    }
    const one = parsed as WebProfileMusic;
    if (one?.dataUrl && one?.id) return [one];
    return [];
  } catch {
    return [];
  }
}

function writeStored(handle: string, tracks: WebProfileMusic[]) {
  if (!handle) return;
  if (tracks.length === 0) {
    localStorage.removeItem(key(handle));
  } else if (tracks.length === 1) {
    localStorage.setItem(key(handle), JSON.stringify(tracks[0]));
  } else {
    localStorage.setItem(
      key(handle),
      JSON.stringify({ tracks, savedAt: new Date().toISOString() }),
    );
  }
  window.dispatchEvent(
    new CustomEvent("blkspace-profile-music", { detail: { handle } }),
  );
}

export function loadWebProfileTape(handle: string): WebProfileMusic[] {
  return readStored(handle);
}

export function loadWebProfileMusic(handle: string): WebProfileMusic | null {
  return readStored(handle)[0] ?? null;
}

export function saveWebProfileMusic(
  handle: string,
  input: { trackName: string; dataUrl: string },
): WebProfileMusic {
  const rec: WebProfileMusic = {
    id: `webmusic_${Date.now()}`,
    trackName: input.trackName || "Profile song",
    dataUrl: input.dataUrl,
    savedAt: new Date().toISOString(),
  };
  writeStored(handle, [rec]);
  return rec;
}

/** Append a track. No-ops at cap. Playlist chrome only after 2+ tracks. */
export function appendWebProfileTrack(
  handle: string,
  input: { trackName: string; dataUrl: string },
): WebProfileMusic[] {
  const rec: WebProfileMusic = {
    id: `webmusic_${Date.now()}`,
    trackName: input.trackName || "Profile song",
    dataUrl: input.dataUrl,
    savedAt: new Date().toISOString(),
  };
  const prev = readStored(handle);
  if (prev.length >= MAX_WEB_TAPE) return prev;
  const next = [...prev, rec];
  writeStored(handle, next);
  return next;
}

export function removeWebProfileTrack(handle: string, id: string): WebProfileMusic[] {
  const next = readStored(handle).filter((t) => t.id !== id);
  writeStored(handle, next);
  return next;
}

export function clearWebProfileMusic(handle: string) {
  writeStored(handle, []);
}
