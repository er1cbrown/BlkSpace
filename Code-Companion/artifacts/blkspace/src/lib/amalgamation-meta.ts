/**
 * Embed live / external-play links in existing description fields
 * without a schema migration. UI strips tags for display and surfaces buttons.
 *
 * Convention: [[live:https://...]]  [[play:https://lichess.org/...]]
 */

const LIVE_RE = /\[\[live:(https?:\/\/[^\]\s]+)\]\]/gi;
const PLAY_RE = /\[\[play:(https?:\/\/[^\]\s]+)\]\]/gi;

export type AmalgamationMeta = {
  liveUrl?: string;
  playUrl?: string;
  /** Description with meta tags removed */
  text: string;
};

export function parseAmalgamationMeta(description: string | null | undefined): AmalgamationMeta {
  const raw = description || "";
  let liveUrl: string | undefined;
  let playUrl: string | undefined;
  LIVE_RE.lastIndex = 0;
  PLAY_RE.lastIndex = 0;
  const liveM = LIVE_RE.exec(raw);
  if (liveM) liveUrl = liveM[1];
  const playM = PLAY_RE.exec(raw);
  if (playM) playUrl = playM[1];
  const text = raw
    .replace(LIVE_RE, "")
    .replace(PLAY_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { liveUrl, playUrl, text };
}

export function embedAmalgamationMeta(
  description: string,
  meta: { liveUrl?: string; playUrl?: string },
): string {
  let base = parseAmalgamationMeta(description).text;
  const live = (meta.liveUrl || "").trim();
  const play = (meta.playUrl || "").trim();
  if (live && /^https?:\/\//i.test(live)) {
    base = `${base}\n[[live:${live}]]`.trim();
  }
  if (play && /^https?:\/\//i.test(play)) {
    base = `${base}\n[[play:${play}]]`.trim();
  }
  return base;
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
