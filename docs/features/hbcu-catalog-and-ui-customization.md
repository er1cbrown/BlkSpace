# HBCU catalog expansion & per-user UI customizability

## Why

BlkSpace was shipping ~5–6 hard-coded yards (TSU, Howard, Spelman, FAMU, Morehouse, Meharry). Real HBCU coverage needs **all** current public and private institutions, and each user’s app shell should feel tailored — not one global skin.

## Research notes (expansion)

| Source | Count (approx.) | Notes |
|--------|-----------------|--------|
| U.S. Dept of Education / NCES “historically Black” designation | ~100–107 | Authoritative federal list; includes 2-year and specialty schools |
| Wikipedia *List of HBCUs* (current institutions) | ~100–103 | Public + private + territories (e.g. UVI); good bootstrap for product catalog |
| UNCF / Thurgood Marshall College Fund | subset | Membership orgs — not the full federal list |

**Approach used in product**

1. Ship a **client catalog** (`src/lib/hbcu-catalog.ts`) with **103** institutions (50 public / 53 private), aligned to the Wikipedia current list + Lincoln University of Pennsylvania (degree-granting peer of Cheyney).
2. Stable **slug IDs** for legacy yards (`tsu`, `howard`, `famu`, …) so existing users/posts keep working.
3. **Generated skins** for non-featured schools (gradient/accent from id hash); **hand-tuned packs** for featured flagships.
4. **Search + state + public/private filters** on welcome, settings, and Yards directory — no need to render 100 cards without filters.
5. Refresh path: re-run `scripts/gen-hbcu-catalog.py` when DOE/NCES updates; prefer NCES IPEDS `HBCU` flag for production accuracy.

**Not claimed**

- Official school trademark licenses for every mark/mascot (UI uses generic labels + user-facing school names).
- Live institutional SSO or enrollment verification (identity remains self-attested / domain-declared elsewhere).

## UI customizability (per user)

Stored on-device as `blkspace_ui_prefs_v1` via `src/lib/ui-prefs.ts`, applied on load by `UiPrefsProvider`.

| Preference | Effect |
|------------|--------|
| Home yard | Any HBCU id; drives accent-when-“yard”, Communities pin |
| Accent | Brand / yard / gold / teal / violet / crimson / forest → CSS `--primary` |
| Density | comfortable / cozy / compact |
| Font scale | sm / md / lg → `--ui-font-scale` |
| Feed layout | cards / compact / magazine |
| Profile theme | classic / pro / vibrant / myspace (MyYard) |
| Reduce motion / calm campus skins | a11y + softer gradients |
| Start path | feed / hub / focus / yards / connect |
| Discipline track | general / finance / creative / research / faculty — reorders Hub (`discipline-track.ts`) |
| Pinned Hub modules | events, studio, clubs, yard sale, literacy |
| Focus / Faculty nav flags | shell navigation |

See also: [`bkspc-university-vision.md`](bkspc-university-vision.md) for feed tabs (Following · Yard · Blog FYP · Connect).

**Settings → Appearance** is the control surface. Welcome + med/faculty paths seed home yard and nav flags.

## Code map

| File | Role |
|------|------|
| `artifacts/blkspace/src/lib/hbcu-catalog.ts` | Full institution list + search (UI) |
| `artifacts/blkspace/scripts/gen-hbcu-catalog.py` | TS regenerator |
| `artifacts/blkspace/scripts/gen-hbcu-rust-seed.py` | Rust seed from TS catalog |
| `artifacts/blkspace/src-tauri/src/hbcu_catalog_seed.rs` | Embedded seed rows |
| SQLite `hbcus` table (schema v8) | DB-backed directory + joins |
| `yard_memberships` | User ↔ community_id membership |
| `get_communities` / `list_hbcus` | Tauri APIs over SQL |
| `artifacts/blkspace/src/lib/yard-themes.ts` | Theme packs for every catalog id |
| `artifacts/blkspace/src/lib/towns.ts` | Town options backed by catalog |
| `artifacts/blkspace/src/lib/ui-prefs.ts` | Personalization store + DOM apply |
| `artifacts/blkspace/src/components/ui-prefs/*` | Provider + YardPicker |
| Settings / Welcome / Communities | Wired UIs |

## SQLite (schema v8+)

```sql
hbcus (id PK, school, short_name, city, state, founded, control, yard_label)
yard_memberships (community_id, handle)  -- live member counts
users.town                                -- home yard id (catalog slug)
posts.town_tag                            -- campus partition
```

On open: upsert all seed rows; backfill `yard_memberships` from `users.town`.

## Next (optional)

- Sync prefs into `pro_profile_json` for multi-device.
- IPEDS CSV import CI check for catalog drift.
