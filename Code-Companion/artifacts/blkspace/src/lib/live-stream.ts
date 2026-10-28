/**
 * In-room player for a yard stage link.
 * YouTube and Twitch play in the page. A direct media file plays in the video
 * element. BlkSpace does not run the broadcast and does not open a scrape CDN.
 */

import { isSafeExternalLiveUrl } from "@/lib/yard-live-rooms";
import { isScrapeWatchHost } from "@/lib/yard-room-watch";

export type LivePlayerModel =
  | { mode: "youtube"; embedUrl: string; watchUrl: string }
  | { mode: "twitch"; embedUrl: string; watchUrl: string }
  | { mode: "file"; src: string; watchUrl: string }
  | { mode: "link"; href: string }
  | { mode: "refuse"; reason: string };

const MEDIA_FILE = /\.(mp4|webm|ogg|m4v)$/i;

function hostOf(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function youtubeId(url: URL): string {
  const host = hostOf(url);
  let id = "";
  if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
  else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") id = url.searchParams.get("v") || "";
    if (parts[0] === "embed" || parts[0] === "live" || parts[0] === "shorts") {
      id = parts[1] || "";
    }
  }
  return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : "";
}

function twitchTarget(url: URL): { channel?: string; video?: string } | null {
  const host = hostOf(url);
  if (host === "player.twitch.tv") {
    const channel = url.searchParams.get("channel") || "";
    const video = (url.searchParams.get("video") || "").replace(/^v/, "");
    if (/^[a-zA-Z0-9_]{3,25}$/.test(channel)) return { channel };
    if (/^\d{6,12}$/.test(video)) return { video };
    return null;
  }
  if (host !== "twitch.tv") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "videos" && /^\d{6,12}$/.test(parts[1] || "")) {
    return { video: parts[1] };
  }
  if (parts.length === 1 && /^[a-zA-Z0-9_]{3,25}$/.test(parts[0] || "")) {
    return { channel: parts[0] };
  }
  return null;
}

function parentHost(value: string): string {
  const host = value.trim().toLowerCase().replace(/:\d+$/, "");
  return host || "localhost";
}

/** Turn an allowed stage link into a player. `parentHost` is this page's host. */
export function livePlayerFor(raw: string, pageHost = "localhost"): LivePlayerModel {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { mode: "refuse", reason: "That stage link is not a web address." };
  }
  if (isScrapeWatchHost(url.hostname)) {
    return { mode: "refuse", reason: "That site is not a yard stage." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { mode: "refuse", reason: "That stage link is not a web address." };
  }

  const videoId = youtubeId(url);
  if (videoId) {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return {
      mode: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
      watchUrl,
    };
  }

  const twitch = twitchTarget(url);
  if (twitch) {
    const parent = encodeURIComponent(parentHost(pageHost));
    const query = twitch.video
      ? `video=${twitch.video}`
      : `channel=${twitch.channel}`;
    const watchUrl = twitch.video
      ? `https://www.twitch.tv/videos/${twitch.video}`
      : `https://www.twitch.tv/${twitch.channel}`;
    return {
      mode: "twitch",
      embedUrl: `https://player.twitch.tv/?${query}&parent=${parent}&autoplay=false`,
      watchUrl,
    };
  }

  const loopback =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    MEDIA_FILE.test(url.pathname) &&
    (url.protocol === "https:" || (url.protocol === "http:" && loopback)) &&
    (isSafeExternalLiveUrl(url.toString()) || loopback)
  ) {
    return { mode: "file", src: url.toString(), watchUrl: url.toString() };
  }

  if (isSafeExternalLiveUrl(url.toString())) {
    return { mode: "link", href: url.toString() };
  }
  return { mode: "refuse", reason: "Use a YouTube, Twitch, Zoom, Discord, or .edu link." };
}
