# BlkSpace use-case capability log

**Product:** **BlkSpace** (trademark-intent UI / app brand)  
**Coin ticker:** **BKSPC** = **BlkSpace Coin** (settlement rights path — gated)  
**Soft credits:** WeixBucks (WB)  
**Last updated:** 2026-08-09  
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
| 0 | TSU EE · IEEE Student Branch · eval/research opps | **Partial** | Seed org `IEEE Student Branch · TSU` + 3 eval opps; Connect interest/complete/Cred; Yard events; sheet [`use-case-tsu-ee-ieee-branch.md`](use-case-tsu-ee-ieee-branch.md) | Filled Device B evidence; optional SpaceXAI remains operator-only |
| 0b | Campus production · ~$1 mental-model photo · instant unlock | **Partial** | Studio + Yard Sale digital list; WB pay; 5% fee; instant grant path; theory scale sheet [`use-case-campus-production-photos.md`](use-case-campus-production-photos.md) | Real USD / card rails; official WB↔USD peg; native TikTok FYP + Creator Fund |
| 0c | Orgs · donors · investors · capital roles | **Partial** | Theory only: planes P/R/S, today/next/never — [`capital-roles-theoretical.md`](capital-roles-theoretical.md) | Live USD rails, sponsor registry UI, traction metrics page, counsel-reviewed PSP |
| 1 | Multi-campus fashion majors · P2P sell art/mockups/tech packs · club split | **Done** | Yard Sale types, 2-party escrow, org split, Cred withdraw gate | Physical shipping, card payments, mainnet BKSPC escrow |
| 2 | ProjectConnect · research / NSBE-style · GPA privacy | **Done** | Orgs, opportunities, interest, inbox, endorsements, Yard Cred, GPA modes | Official campus SSO / SIS |
| 3 | Billy post-internship · open to work / research · find labs | **Done** | Pro Profile flags, Connect talent board, express interest | Fortune-500 cold outreach, LinkedIn Recruiter |
| 3b | Meharry med · busy · study refresh + Connect + time/money | **Done** | `/focus` Path; **Meharry Yard** seed; welcome **Med school · Focus Path**; feed Focus banner; home yard prefs | Official LMS, Anki, SIS, native schedule import |
| 4 | Club XYZ exclusive service day · RSVP · headcount | **Done** | Yard Events, capacity/waitlist, club-only RSVP, guest list, check-in, free/paid pass | Full Eventbrite tiers, Stripe, public city discovery |
| 5 | Anime club · book group · publish manga pages | **Done** | Club kit, reading circles, publish/notes/recs | Licensed streaming, page-flip comic reader, series CMS |
| 6 | Gaming / chess tournament · 1v1 · rewards · merch | **Partial** | Register, R1 bracket, scores, prize WB, **play URL** (Lichess) + **live link-out**, Chess club kit | Native board, multi-round auto-bracket, prize escrow pot, stream ingest |
| 6b | Content Hub · topic media (chess, fashion, live, pro…) | **Done** | `/hub` topic shelf, publish, earn-angle copy, live/stream kinds | Full CDN, feed auto-mirror, native player |
| 6c | Financial literacy · how you make money | **Done** | Earnings → How to Earn: paths (create/community/live/compete/sell/portfolio/coin) | Interactive lessons, quizzes |
| 6d | Live as social basic | **Partial** | Event + tournament + Hub **link-out** (Twitch/YT/IG/Discord) | Native ingest / player / stream chat |
| 7 | Sarah · midterm study / decompress hour | **Done** | Event kind `study`, free pass, capacity, Study club kit | Voice rooms, Google Calendar sync |
| 8 | Faculty · scholarships / research / internships to campus | **Done** | Connect opps, lead inbox, Faculty kit, **broadcast to yard** | Official award disbursement, mass email, registrar proof |
| 8b | Private-uni faculty · pipeline to Meharry/HBCU via ProjectConnect | **Done** | Faculty Desk; host **yard events**; owner post gate; interest notify; Faculty badge; pipeline seed; broadcast | Full Workday ATS, campus IdP SSO |
| 8c | Secure handle DMs + ethical institutional identity | **Done** | `/messages` handle DMs, No-PHI filter, IEEE-aligned principles, domain-declared claims (not fake SSO), block | End-to-end NIP-44 production, real email delivery, registrar SSO |
| 9 | Billy photo/video studio · portfolio · client delivery · sell or free all-in-one | **Done** | Studio tab: portfolio collections, shoots, grant free access, paid WB unlock, export JSON | Pixieset CDN, ZIP host, proofing UI, contracts/invoices |
| 10 | Soft economy · tips · marketplace fees · withdraw gates | **Partial** | WB ledger, fees, Yard Cred on withdraw, marketplace | Mainnet BKSPC cash-out “rights” live for public |
| 11 | Live streaming (games, event, class) | **Not in product** | Link-out in event description only | Native ingest / player / stream chat |
| 12 | Licensed anime/TV / Netflix-class media | **Out of scope** | — | Rights + CDN product |
| 13 | University SIS / official transcript / legal ID | **Out of scope** | Nostr handle identity | Campus ERP integration |
| 14 | Global Eventbrite / Posh / LinkedIn / Twitch replacements | **Out of scope** | Campus amalgamation slices only | Full category products |
| 15 | Young Rust OS hacker · TempleOS rebuild · Discord+GitHub home · X updates | **Partial** | Share card (X paste); profile GitHub/X/site links; systems club kit; feed/Studio/Connect; sheet [`use-case-rust-templeos-hacker.md`](use-case-rust-templeos-hacker.md) | Native voice/live; git host/PRs; X OAuth; huge artifact path on Yard |
| 15b | Browser-playable on WeixNet · Sendme multi-user (Slack-N) · short+long social | **Partial** | Hub kind `playable` + `/play` sandbox shell; systems topic; share cards; tickets still thin; sheet [`use-case-playable-sendme-yard.md`](use-case-playable-sendme-yard.md) | Always-on pin for N; club ticket auto-announce; small-artifact Yard budget enforcement |
| 15c | Theoretical build path · 15/15b vision kept · GitHub out · optional SpaceXAI | **Partial** | T1 landed: share, links, play shell, systems kit; SpaceXAI proxy optional (`spacexai:assist`) — [`theoretical-playable-weixnet-capability-build.md`](theoretical-playable-weixnet-capability-build.md) | T2 pin-for-N; Device B proof |
| 16 | **Yard Arcade** · campus homebrew games shelf (Newgrounds/Y8 class) | **Partial** | `/arcade` catalog + publish; Play shell; size classes; Hub/nav/sidebar; not Steam/Roblox — [`yard-arcade.md`](yard-arcade.md) | Full pin nights; Yard Sale escrow deep-link; optional Ruffle SWF; byte-size enforce |

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

Schema versions (desktop Turso): through **v8** (`SCHEMA_VERSION = 8` in `db.rs`; escrow / events / clubs / studio / HBCU via `ensure_schema`).

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
| 2026-08-09 | Yard Arcade vertical (`/arcade`) — homebrew shelf, capability row 16 |
| 2026-08-09 | T1 implement: share card, profile links, Hub playable + /play, systems club, optional SpaceXAI proxy |
| 2026-08-09 | Theoretical playable WeixNet build (row 15c) — current tech conclusion, GitHub out, SpaceXAI optional |
| 2026-08-09 | Rust TempleOS hacker + playable Sendme yard use cases (rows 15 / 15b) |
| 2026-08-09 | Capital roles theoretical impl (org/donor/investor planes) |
| 2026-08-09 | Campus production photo micro-price use case (n) + scale note for \(N_u=50\) |
| 2026-08-09 | Theoretical TSU EE · IEEE Student Branch use-case sheet + capability row 0 |
| 2026-08-03 | Faculty events + secure handle DMs + ethical identity (No-PHI, IEEE principles, claim levels) |
| 2026-08-03 | Faculty harden: org lead post auth, connect_interest notify, faculty badge, Rust pipeline seed, broadcast-after-post |
| 2026-08-03 | Faculty Desk: private-uni → Meharry/HBCU pipeline; welcome faculty path; Connect CTA |
| 2026-08-03 | Meharry Yard + welcome med path → Focus; feed Focus banner; home yard prefs |
| 2026-08-03 | Focus Path: Meharry med / busy student — time budget, study refresh, low-bandwidth ProjectConnect, finance literacy |
| 2026-08-03 | Amalgamation: Content Hub, financial literacy panel, live/play link-out, chess + creators club kits |
| 2026-08-02 | Initial log: fashion escrow, Connect, events, clubs, studio; brand lock BlkSpace vs BKSPC |

Update this file whenever a major persona use case lands or is ruled out.
