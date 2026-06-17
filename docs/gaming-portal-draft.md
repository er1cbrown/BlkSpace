# Yard Arcade — Gaming Portal (Concept Draft)

**Status:** CONCEPT ONLY — do not implement until media-on-profile + economy loops are stable.

## Vision

Newgrounds / Y8-style creative gaming inside each HBCU yard, pinned on low-end WeixNet nodes.

## Portal structure

- Per-yard arcade hub (`/communities/:id/arcade`)
- WASM/HTML5 games (not Flash — browsers block plugins)
- Creator upload → moderation → age rating → featured slot
- Community judgment phase before homepage featuring
- Leaderboards with capped daily WB micro-rewards

## Economy hooks

| Action | WB (draft) | Karma |
|--------|------------|-------|
| Publish game | 15 | +10 post |
| Top-10 weekly score | 5 | +3 |
| Community rating | — | +1 |

## Node harvest

Student nodes pin popular game bundles; pin-serve rewards apply (existing `pin_serves` table).

## Out of scope (v1)

- Real-time multiplayer
- In-app purchases
- Flash plugin emulation