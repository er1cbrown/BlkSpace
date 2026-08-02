# BlkSpace use-case capability log

**Product:** **BlkSpace** (trademark-intent UI / app brand)  
**Coin ticker:** **BKSPC** = **BlkSpace Coin** (settlement rights path — gated)  
**Soft credits:** WeixBucks (WB)  
**Last updated:** 2026-08-02  
**Repo:** [er1cbrown/BlkSpace](https://github.com/er1cbrown/BlkSpace)

This log is the living answer to: *“Can this campus story run on BlkSpace?”*  
Statuses: **Done** · **Partial** · **Not in product** · **Out of scope**

---

## Brand lock (do not muddle)

| Mark | Use for |
|------|---------|
| **BlkSpace** | App chrome, README, installers, GitHub repo name, UI product mark |
| **BKSPC** | Solana ticker, withdraw-to-settlement, “coin rights” docs only |
| **WeixBucks / WB** | In-app earn/spend credits |

Trademark intent: protect **BlkSpace** as product. **BKSPC** is the short ticker for BlkSpace Coin — not a replacement product name in the nav.

---

## Capability matrix (promo + shipped code)

| # | Persona / use case | Status | What works on BlkSpace | Still missing |
|---|-------------------|--------|------------------------|---------------|
| 1 | Multi-campus fashion majors · P2P sell art/mockups/tech packs · club split | **Done** | Yard Sale types, 2-party escrow, org split, Cred withdraw gate | Physical shipping, card payments, mainnet BKSPC escrow |
| 2 | ProjectConnect · research / NSBE-style · GPA privacy | **Done** | Orgs, opportunities, interest, inbox, endorsements, Yard Cred, GPA modes | Official campus SSO / SIS |
| 3 | Billy post-internship · open to work / research · find labs | **Done** | Pro Profile flags, Connect talent board, express interest | Fortune-500 cold outreach, LinkedIn Recruiter |
| 4 | Club XYZ exclusive service day · RSVP · headcount | **Done** | Yard Events, capacity/waitlist, club-only RSVP, guest list, check-in, free/paid pass | Full Eventbrite tiers, Stripe, public city discovery |
| 5 | Anime club · book group · publish manga pages | **Done** | Club kit, reading circles, publish/notes/recs | Licensed streaming, page-flip comic reader, series CMS |
| 6 | Gaming tournament · 1v1 · rewards · merch (no stream) | **Done** | Tournament register, R1 bracket, score report, prize text/WB, Yard Sale merch | Live stream, multi-round auto-bracket, prize escrow pot |
| 7 | Sarah · midterm study / decompress hour | **Done** | Event kind `study`, free pass, capacity, Study club kit | Voice rooms, Google Calendar sync |
| 8 | Faculty · scholarships / research / internships to campus | **Done** | Connect opps, lead inbox, Faculty kit, **broadcast to yard** | Official award disbursement, mass email, registrar proof |
| 9 | Billy photo/video studio · portfolio · client delivery · sell or free all-in-one | **Done** | Studio tab: portfolio collections, shoots, grant free access, paid WB unlock, export JSON | Pixieset CDN, ZIP host, proofing UI, contracts/invoices |
| 10 | Soft economy · tips · marketplace fees · withdraw gates | **Partial** | WB ledger, fees, Yard Cred on withdraw, marketplace | Mainnet BKSPC cash-out “rights” live for public |
| 11 | Live streaming (games, event, class) | **Not in product** | Link-out in event description only | Native ingest / player / stream chat |
| 12 | Licensed anime/TV / Netflix-class media | **Out of scope** | — | Rights + CDN product |
| 13 | University SIS / official transcript / legal ID | **Out of scope** | Nostr handle identity | Campus ERP integration |
| 14 | Global Eventbrite / Posh / LinkedIn / Twitch replacements | **Out of scope** | Campus amalgamation slices only | Full category products |

---

## Explicitly not completable (do not claim in promo)

1. **Live streaming** inside BlkSpace  
2. **Mainnet coin launch** without Cred gates + counsel + checklist  
3. **Guaranteed BKSPC price / returns**  
4. **Official university money / scholarship payout** as a bank  
5. **Full Pixieset / Eventbrite / Challonge / Twitch** as category clones  
6. **Real-time voice/video rooms** (still “later”)  

---

## Ship map (code modules)

| Feature area | Primary code |
|--------------|--------------|
| Escrow marketplace | `escrow.rs`, `marketplace-escrow.ts` |
| Events + tickets | `events_ticketing.rs`, `yard-events.ts`, `YardEventsPanel` |
| Clubs / reading / tournaments | `club_activities.rs`, `club-activities.ts`, `ClubActivitiesPanel` |
| Studio portfolio + delivery | `studio.rs`, `studio.ts`, `StudioPanel` |
| Connect + Cred | `connect.rs`, `project-connect.ts`, connect page |
| Brand | `src/lib/brand.ts` → **BlkSpace** + **BKSPC** |

Schema versions (desktop Turso): through **v7** (studio).

---

## Coin rights path (BKSPC) — reminder

Credibility **before** finance. See [`bkspc-rights-path.md`](bkspc-rights-path.md).

```
BlkSpace product use (yards, Connect, studio, escrow)
  → Yard Cred + real users
  → Devnet BKSPC settlement proof
  → Counsel
  → Optional mainnet BKSPC (ticker only; product name stays BlkSpace)
```

---

## Change log (this document)

| Date | Note |
|------|------|
| 2026-08-02 | Initial log: fashion escrow, Connect, events, clubs, studio; brand lock BlkSpace vs BKSPC |

Update this file whenever a major persona use case lands or is ruled out.
