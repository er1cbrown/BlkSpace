/** In-app LazyVim lesson for MyYard look. Music stays on the Music tab. */

export const LAZYVIM_KEYS = [
  { keys: "i", does: "Start typing (insert)" },
  { keys: "Esc", does: "Stop typing (normal)" },
  { keys: ":w", does: "Save the file, then Enter" },
  { keys: ":q", does: "Quit. Use :wq to save and quit" },
  { keys: "Space", does: "Leader — LazyVim menus (optional)" },
] as const;

export const MYYARD_LAZYVIM_STARTER_CSS = `/* BKSPC MyYard — advanced look (scoped to .myyard-root)
 *
 * LazyVim (this file):
 *   i     type
 *   Esc   stop typing
 *   :w    save
 *   :q    quit
 *   :wq   save and quit
 *
 * After you quit: Customize → Pimp / CSS → Load CSS file → Save MyYard.
 *
 * NOT in this file:
 *   Music tab  = profile song (play / pause / mute / seek)
 *   Photos tab = pics
 *   Pimp packs = FX overlays, cursor, name treatment (no nvim required)
 *
 * Hooks visitors actually have:
 *   .myyard-name .myyard-mood .myyard-about .myyard-banner .myyard-player
 *   var(--myyard-accent)
 *
 * Remote url(https://…) and @import are stripped. @keyframes are allowed.
 */

.myyard-name {
  letter-spacing: -0.04em;
}

.myyard-player {
  border-color: var(--myyard-accent);
}
`;

export function cssForLazyVimOpen(current: string): string {
  const trimmed = (current || "").trim();
  if (trimmed.length > 0) return current;
  return MYYARD_LAZYVIM_STARTER_CSS;
}
