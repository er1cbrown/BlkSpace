/**
 * First-run Yard orientation — dismissible “you are here” state.
 * Keeps power features (Drop tickets, MIDF, Bridge) out of the default path.
 */

const KEY_DISMISSED = "blkspace_yard_orientation_done";
const KEY_JUST_JOINED = "blkspace_just_joined";
const KEY_FIRST_POST = "blkspace_first_post_done";

export function isOrientationDismissed(): boolean {
  try {
    return localStorage.getItem(KEY_DISMISSED) === "1";
  } catch {
    return true;
  }
}

export function dismissOrientation(): void {
  try {
    localStorage.setItem(KEY_DISMISSED, "1");
    localStorage.removeItem(KEY_JUST_JOINED);
    window.dispatchEvent(new Event("blkspace-orientation"));
  } catch {
    /* ignore */
  }
}

/** Call after welcome wizard join so Home can show the tour once. */
export function markJustJoined(yardId: string): void {
  try {
    localStorage.setItem(KEY_JUST_JOINED, yardId || "tsu");
    localStorage.removeItem(KEY_DISMISSED);
  } catch {
    /* ignore */
  }
}

export function consumeJustJoined(): string | null {
  try {
    const y = localStorage.getItem(KEY_JUST_JOINED);
    return y;
  } catch {
    return null;
  }
}

export function shouldShowOrientation(): boolean {
  if (isOrientationDismissed()) return false;
  // Show until dismissed — also for first open after join
  return true;
}

export function markFirstPostDone(): void {
  try {
    localStorage.setItem(KEY_FIRST_POST, "1");
  } catch {
    /* ignore */
  }
}

export function hasFirstPost(): boolean {
  try {
    return localStorage.getItem(KEY_FIRST_POST) === "1";
  } catch {
    return false;
  }
}

/** Student-facing plain labels for primary nav. */
export const YARD_NAV_COPY = {
  home: {
    label: "Home",
    hint: "Scroll posts from your campus",
  },
  yards: {
    label: "Yards",
    hint: "Every HBCU campus space",
  },
  create: {
    label: "Create",
    hint: "Write a post or add a photo",
  },
  connect: {
    label: "Connect",
    hint: "Jobs, research, opportunities",
  },
  profile: {
    label: "You",
    hint: "Your profile and posts",
  },
} as const;
