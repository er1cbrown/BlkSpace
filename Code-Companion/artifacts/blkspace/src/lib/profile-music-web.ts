/**
 * Web-preview profile song storage (data URLs).
 * Desktop continues to use Tauri blob hashes + Iroh/local blob store.
 */

const key = (handle: string) => `blkspace_profile_music_web_${handle}`;

export type WebProfileMusic = {
  /** Synthetic id used as musicHash on web */
  id: string;
  trackName: string;
  dataUrl: string;
  savedAt: string;
};

export function loadWebProfileMusic(handle: string): WebProfileMusic | null {
  if (!handle) return null;
  try {
    const raw = localStorage.getItem(key(handle));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WebProfileMusic;
    if (!parsed?.dataUrl || !parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
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
  localStorage.setItem(key(handle), JSON.stringify(rec));
  window.dispatchEvent(
    new CustomEvent("blkspace-profile-music", { detail: { handle } }),
  );
  return rec;
}

export function clearWebProfileMusic(handle: string) {
  localStorage.removeItem(key(handle));
  window.dispatchEvent(
    new CustomEvent("blkspace-profile-music", { detail: { handle } }),
  );
}
