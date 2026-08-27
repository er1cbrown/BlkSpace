# MyYard Customize Station

**Status:** Shipped (2026-08)  
**Goal:** MySpace-style personal pages without dumping raw CSS on every student by default — a **streamlined hub** so every profile can look different.

## What visitors see

Your public profile is a **MyYard** — not the campus yard skin:

| Element | Customizable |
|---------|----------------|
| Banner | Gradient presets · solid color · photo |
| Accent | Color (buttons/mood/borders) |
| Pattern | Dots / grid / stars / waves |
| Font & corners | Clean / serif / mono · sharp/soft/round |
| Mood line | Short status under @handle |
| About | Longer “about me” block |
| Photo gallery | Up to 8 featured images |
| Profile song | Audio from uploads |
| Top 8 | Toggle |
| Page templates | Campus wall · MyYard night · Clean notes · Portal neon · Tribute gold · **Y2K glitter** · **Cyber yard** |
| Profile song / tape | One track = song (play / pause / mute / **volume knob**). **Two or more** = tape (skip + playlist). Music tab only. |
| Pimp packs | Y2K glitter · Cyber yard · Vapor wave · Underground zine · Gold front — FX + cursor + name treatment + starter CSS |
| Page FX | Sparkle · glitter · scanlines · grain · VHS (built-in overlays, no remote GIFs) |
| Custom CSS | **Pimp / CSS** tab, sanitized, scoped to `.myyard-root`. `@keyframes` allowed. Remote `url(https)` + `@import` stripped. 24k cap. |
| CSS snippets | Neon name · sticky-note about · chrome player · banner stripe · mood ticker · hot links |
| LazyVim / file | Optional. Needs `nvim` on the machine. Save/load `.css`. Look only — not audio. |

Base skins still apply: Classic · Pro · Vibrant · MyYard Classic.

## Owner path

1. Open **You / Profile**  
2. **Customize** tab (or banner **Customize** button)  
3. **Look · Photos · Music · About · Pimp / CSS · Extra**  
4. **Save MyYard**

Students: Look templates. Power users: **Pimp / CSS** packs + FX, then raw CSS / LazyVim. Song is never in CSS.

## Storage

| Surface | Where |
|---------|--------|
| Desktop (Tauri) | `users.profile_layout_json` + `theme_id` / `music_hash` |
| Web preview | `localStorage` key `blkspace_myyard_layout_<handle>` |

## Safety (CSS)

`sanitizeCustomCss` strips `@import`, `expression(`, `javascript:`, bindings. Max ~12k chars. `scopeCustomCss` prefixes rules under `.myyard-root[data-myyard]`.

**LazyVim lesson (in-app):** Customize → CSS shows a 5-step teach card (`i` / `Esc` / `:w` / `:q` / Space). Starter CSS explains: song = Music tab, look = this file.

**Open in LazyVim:** writes `temp/blkspace-myyard/{handle}.css` (starter comments if empty) and launches `nvim` (`NVIM_APPNAME=lazyvim`, then default nvim). Classic `vim` is not used. Then Load CSS file + Save MyYard. Web: Paste starter + Save/Load CSS file.

## Code map

| File | Role |
|------|------|
| `lib/myyard-layout.ts` | Aesthetic schema + sanitize + keyframe-aware scope |
| `lib/myyard-pimp.ts` | Packs, FX engine, snippets |
| `lib/myyard-storage.ts` | Web local persist |
| `components/profile/CustomizeStation.tsx` | Hub UI |
| `components/profile/MyYardPimpStudio.tsx` | Advanced look studio |
| `components/profile/ProfileAestheticShell.tsx` | Apply look + FX to visitors |
| `components/profile/ProfileGallery.tsx` | Featured photos |
| `pages/profile.tsx` | Wire-up |

## Related

- [myyard-yard-sale-architecture.md](./myyard-yard-sale-architecture.md)  
- [media-upload.md](./media-upload.md)
