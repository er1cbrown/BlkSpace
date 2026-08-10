# Yard Arcade

**Status:** In product (2026-08) · campus homebrew vertical  
**Route:** `/arcade`  
**Not:** Steam · Roblox · global game CDN  

## Claim

**Yard Arcade** is BlkSpace’s **homebrew games shelf** — Newgrounds / Y8 / Coolmath class for the yard. Students publish HTTPS static or WASM play URLs; peers open them in the **Play shell**. Soft WB list price is a hint toward **Yard Sale**, not a Valve-scale store.

## In scope

| Piece | Implementation |
|-------|----------------|
| Catalog | Hub items with `kind=playable` or gaming/systems + play URL |
| Play | `/play?url=` sandboxed iframe |
| Publish | Arcade form → `publishArcadeGame` → Content Hub |
| Size honesty | `micro` · `tier0` · `full` tags `[[size:…]]` |
| Nav | More → Arcade · top Navbar · Hub CTA · sidebar card |

## Out of scope

- Steam-class global store, DRM, refunds, Proton  
- Roblox multiplayer cloud / 3D studio  
- Mandatory Flash runtime (optional plugin later)  

## Code

| Path | Role |
|------|------|
| `src/lib/yard-arcade.ts` | Filter, publish, seeds, size classes |
| `src/pages/arcade.tsx` | UI |
| `src/pages/play.tsx` | Runtime shell |
| `src/lib/content-hub.ts` | Storage + inject seeds |

## IEEE one-liner

Campus homebrew playables and soft-currency storefront hooks — not a Steam replacement.
