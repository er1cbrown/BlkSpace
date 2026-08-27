/** In-app LazyVim lesson for MyYard look. Music stays on the Music tab. */

export const LAZYVIM_KEYS = [
  { keys: "i", does: "Start typing (insert)" },
  { keys: "Esc", does: "Stop typing (normal)" },
  { keys: ":w", does: "Save the file, then Enter" },
  { keys: ":q", does: "Quit. Use :wq to save and quit" },
  { keys: "Space", does: "Leader — LazyVim menus (optional)" },
] as const;

export const MYYARD_LAZYVIM_STARTER_CSS = `/* BKSPC MyYard — your page look
 *
 * LazyVim (this file):
 *   i     type
 *   Esc   stop typing
 *   :w    save
 *   :q    quit
 *   :wq   save and quit
 *
 * After you quit: Customize → CSS → Load CSS file → Save MyYard.
 *
 * Song / memes are NOT in this file.
 *   Music tab  = profile song
 *   Photos tab = pics
 *   Look tab   = templates (easier than CSS)
 */

/* Mood-colored name vibe */
color: #fafafa;

h1 {
  letter-spacing: -0.04em;
}
`;

export function cssForLazyVimOpen(current: string): string {
  const trimmed = (current || "").trim();
  if (trimmed.length > 0) return current;
  return MYYARD_LAZYVIM_STARTER_CSS;
}
