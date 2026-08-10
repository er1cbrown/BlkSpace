# BKSPC University — product vision & differentiation

**Status:** Product north star (implemented in feed IA + discipline track, 2026-08)  
**Audience:** Faculty, IEEE-style reviewers, students, contributors  
**Related:** [`four-pillar-economy.md`](four-pillar-economy.md) · [`project-connect-credibility-layer.md`](project-connect-credibility-layer.md) · [`hbcu-catalog-and-ui-customization.md`](hbcu-catalog-and-ui-customization.md) · [`../theory-of-computing-scale.md`](../theory-of-computing-scale.md) · [`../future-social-features.md`](../future-social-features.md)

---

## One claim

**BlkSpace is a campus operating surface — not an attention marketplace.**

N users each own N creator surfaces (MyYard / blog / portfolio). Feeds look familiar (Following, Yard, Blog FYP, Connect) so onboarding is cheap. What must never collapse into Instagram is the **economic and ranking rule**:

> Money and attention never buy trust or rank.  
> Spend buys community goods and human access.  
> Growth is measured in completions, gatherings, and literacy — not doomscroll.

“BKSPC University” is the **discipline-skinned campus mode** of that claim: finance majors, creatives, researchers, and faculty get different Hub ordering and emphasis, same four-pillar economy underneath.

---

## What ships in product IA

| Surface | Role | Analogy |
|---------|------|---------|
| **Following** | Chronological people you chose | Twitter Following |
| **My Yard** | Home campus mesh only | Fizz / town board |
| **Blog FYP** | Ranked long-form / text discovery (not buyable rank) | GitHub activity + blog discovery |
| **Connect** | Fellowships, research, faculty paths → Cred | Handshake / faculty desk |
| **Watch** (secondary) | Video-first scroll | Reels-style |
| **Hub** | Topic shelf reordered by **discipline track** | Campus catalog |
| **MyYard** | Personal creator page | GitHub profile + MySpace chrome |
| **Events / tickets** | Validated gatherings | Ticketing, not vague RSVP |
| **WeixBucks → Cred → Literacy → BKSPC** | Four pillars | Roblox earn loop **without** buyable trust |

---

## Differentiation matrix

| Mainstream social | BlkSpace / BKSPC University |
|-------------------|----------------------------|
| Sell attention to advertisers | Circulate earned soft value to creators / hosts |
| Rank you can buy | **Yard Cred is non-purchasable** |
| Infinite scroll as the product | Scroll is the **surface**; product is **pathways** |
| Spend = boost / ads | Spend = tickets, creator work, access to people |
| One UI for everyone | **Discipline track** reorders Hub + emphasis |
| Cloud-only share | Hub-sync default + Sendme-class tickets on Full |

---

## Live N users × N personas (compositional)

```text
User U
  ├── Student persona   → Yard feed, clubs, events
  ├── Creator persona   → MyYard, Blog FYP posts, Yard Sale
  ├── Pro persona       → Connect, portfolio, Faculty-clean chrome
  └── Surfaces          → page · blog · listings · hosted events
```

Ranking stays **yard-block-diagonal** (see theory-of-computing-scale): local first, follow affinity, domain weights — not a global surveillance FYP.

**“Live track” means product activity** (presence, posts, ticket check-ins, Connect completions) — **not** selling behavioral dossiers.

---

## Spend that should feel obligated but good

| Allowed spend story | Forbidden story |
|---------------------|-----------------|
| Event tickets with check-in codes | Buy my post to top of FYP |
| Creator tips / marketplace (WB) | Buy Yard Cred |
| Soft access to pipeline nights / office-hour events | In-app securities trading |
| Future gated research interest → Cred | “Invest in BKSPC for guaranteed ROI” |

Settlement (BKSPC) remains **counsel / devnet gated** and only after Cred + literacy gates.

---

## Discipline tracks (UI prefs)

Stored as `disciplineTrack` in `blkspace_ui_prefs_v1`:

| Track | Hub priority | Default emphasis |
|-------|--------------|------------------|
| `general` | Culture, live, study… | Balanced campus |
| `social` | Culture, live, fashion, music… | **Your yard** — clubs/nights; not wallet-first ([her path](use-case-her-yard-path.md)) |
| `finance` | Pro, study, culture | Literacy + Connect finance domain |
| `creative` | Fashion, music, live, culture | Studio / Yard Sale |
| `research` | Med, study, pro | Connect research + Focus |
| `faculty` | Pro, med, study | Faculty Desk, lead inbox |

Code: `src/lib/discipline-track.ts` · Settings → Appearance · Hub reorders topics.

---

## North-star metrics (uplift over attention)

| Primary | Secondary (hygiene only) |
|---------|---------------------------|
| Connect completions / endorsements | DAU |
| Ticket check-ins | Session time |
| Creator WB tips / marketplace volume | FYP impressions |
| Literacy module before settlement | Posts/day |
| Cred distribution (anti-game) | — |

If session time rises and completions stay flat, the product is failing its claim.

---

## Code map

| Piece | Path |
|-------|------|
| Feed tabs IA | `src/pages/feed.tsx` |
| Blog FYP ranking | `src/lib/blog-fyp.ts` |
| Discipline tracks | `src/lib/discipline-track.ts` |
| UI prefs field | `src/lib/ui-prefs.ts` → `disciplineTrack` |
| Hub reorder | `src/pages/hub.tsx` |
| Settings control | `src/pages/settings.tsx` (Appearance) |
| Connect rail | `src/components/social/ConnectDiscoveryRail.tsx` |
| Four pillars | `docs/features/four-pillar-economy.md` |

---

## Honest gaps

- Formal “BKSPC University” brand package beyond discipline skins  
- Priced professor 1:1 commerce SKU (events + Connect exist first)  
- External placement rates as outcome metrics  
- Mainnet settlement still gated  
- Device B multi-user live proof for scale claims  

---

## Evaluation bars

| Bar | Pass condition |
|-----|----------------|
| Feed IA clarity | Four primary tabs: Following · Yard · Blog FYP · Connect |
| No buy-rank copy | Boost/tips are creator transfer language, not “promote post” |
| Discipline UX | Changing track reorders Hub topics without separate apps |
| Cred before coin | Unchanged four-pillar docs + wallet gates |
| Anti-surveillance | No new location/ad-tracking pipeline for FYP |
