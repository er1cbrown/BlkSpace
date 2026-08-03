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
| Custom CSS | Advanced tab, sanitized, scoped to `.myyard-root` |

Base skins still apply: Classic · Pro · Vibrant · MyYard Classic.

## Owner path

1. Open **You / Profile**  
2. **Customize** tab (or banner **Customize** button)  
3. **Look · Photos · Music · About · CSS · Extra**  
4. **Save MyYard**

## Storage

| Surface | Where |
|---------|--------|
| Desktop (Tauri) | `users.profile_layout_json` + `theme_id` / `music_hash` |
| Web preview | `localStorage` key `blkspace_myyard_layout_<handle>` |

## Safety (CSS)

`sanitizeCustomCss` strips `@import`, `expression(`, `javascript:`, bindings. Max ~4k chars. Injected under `.myyard-root[data-myyard]` only.

## Code map

| File | Role |
|------|------|
| `lib/myyard-layout.ts` | Aesthetic schema + sanitize |
| `lib/myyard-storage.ts` | Web local persist |
| `components/profile/CustomizeStation.tsx` | Hub UI |
| `components/profile/ProfileAestheticShell.tsx` | Apply look to visitors |
| `components/profile/ProfileGallery.tsx` | Featured photos |
| `pages/profile.tsx` | Wire-up |

## Related

- [myyard-yard-sale-architecture.md](./myyard-yard-sale-architecture.md)  
- [media-upload.md](./media-upload.md)
