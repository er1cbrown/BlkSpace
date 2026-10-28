/**
 * One clip plays in the post, the way a timeline does.
 * Sound stays off until the reader turns it on. A poster does not play.
 */

export type InlinePlayback = "inline" | "poster" | "stage";

let soundOn = false;
let current: HTMLVideoElement | null = null;
const listeners = new Set<() => void>();

export function inlineSoundOn(): boolean {
  return soundOn;
}

export function setInlineSound(on: boolean): void {
  soundOn = on;
  if (current) current.muted = !on;
  listeners.forEach((listener) => listener());
}

export function subscribeInlineSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function claimInlineVideo(el: HTMLVideoElement): void {
  if (current && current !== el) current.pause();
  current = el;
  el.muted = !soundOn;
}

export function releaseInlineVideo(el: HTMLVideoElement): void {
  if (current === el) current = null;
}

export function shouldInlinePlay(input: {
  mode: InlinePlayback;
  visible: boolean;
  active: boolean;
}): boolean {
  if (input.mode === "poster") return false;
  if (input.mode === "stage") return input.active;
  return input.visible;
}

/** Cloudflare Stream frame. Autoplay stays muted unless the reader turned sound on. */
export function streamPlayerSrc(src: string, sound: boolean): string {
  try {
    const url = new URL(src);
    url.searchParams.set("autoplay", "true");
    url.searchParams.set("muted", sound ? "false" : "true");
    url.searchParams.set("controls", "true");
    url.searchParams.set("preload", "metadata");
    return url.toString();
  } catch {
    return src;
  }
}
