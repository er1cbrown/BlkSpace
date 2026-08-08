# IEEE-style use-case review: Omega Psi Phi @ Meharry

**Persona:** Meharry Medical College student · Omega Psi Phi (ΩΨΦ) · wants inter-org connection, fellowship, scholarships, community service, conventions/conferences  
**Discovery path they expect:** Feed / FYP (“see people and orgs, then connect”)  
**Product claim under test:** BlkSpace supports **productive campus social + professional fellowship** without requiring mainnet finance day one  
**Review standard:** Implemented / Partial / Fail · evidence · notes (no marketing inflation)

**Related:** [`use-case-capability-log.md`](use-case-capability-log.md) · [`project-connect-credibility-layer.md`](project-connect-credibility-layer.md) · [`four-pillar-economy.md`](four-pillar-economy.md) · [`../ieee-features-review.md`](../ieee-features-review.md)

**UI (2026-08):** Home feed includes **Fellowship · orgs & opportunities** rail (`ConnectDiscoveryRail`) with filters (Fellowship / Scholarships / Service / Research) → deep links to Connect. Demo seed: `Omega Psi Phi · Meharry` + scholarship / service / conference crew opps.

---

## 1. Goals → product surface map

| Brotherhood goal | Best BlkSpace surface **today** | Not the primary surface |
|------------------|----------------------------------|-------------------------|
| Connect with **other orgs** | **Connect** → create/join **Org** (`professional` / `service` / `peer`) · org page | Feed alone (no structured org graph) |
| **Fellowship** (brotherhood + peers) | Org membership · opportunities · inbox · DMs (messages) · yard channels | Wallet / BKSPC |
| **Scholarships** | Connect **Opportunity** (type via title/tags: scholarship, deadline) · interest → lead review | Marketplace coin |
| **Community service** | Opportunity (`service`) · event RSVP · posts with service tags | Node pin rewards |
| **Conventions / conferences** | **Yard events** (community/events) · Hub · posts + opportunity “crew / volunteer” | Native live streaming (link-out only) |
| “Use **FYP/feed** to connect” | Feed for **visibility** + soft discovery → **must hand off** to Connect / profile / event | Treating feed as LinkedIn-complete |

**IEEE note:** A productive org-fellowship product is **Connect + Events + identity**, with feed as **awareness**, not the sole workflow.

---

## 2. Pre-test setup (reproducibility)

| Item | Value / action |
|------|----------------|
| Build | **Yard** preferred (Tier 0 student path) or `bun run dev` for UI-only |
| Account | Fresh or clean guest → welcome → **Meharry** home yard if available |
| Identity | Complete **24-word recovery** step if prompted; store offline |
| Session | Sign-in retained; note handle: `________________` |
| Clock | Start: ______ End: ______ Device: ______ RAM: ______ |
| Reviewer | Name: ______ Role: Meharry / ΩΨΦ / IEEE student branch: ______ |

---

## 3. Use-case script (run in order)

Score each step: **P** = pass · **W** = partial/workaround · **F** = fail · **N/A**

### UC-Ω-01 · Join the Meharry yard (place)

| Step | Action | Expected | Score | Evidence (screenshot / notes) |
|------|--------|----------|-------|-------------------------------|
| 1 | Open app / web | Loads without white screen &lt; ~10s cold | | |
| 2 | Welcome or guest → create account | Handle + display name | | |
| 3 | Home yard **Meharry** (or closest) | Feed defaults to campus context | | |
| 4 | Open **Communities / Yards** | Meharry yard visible or joinable | | |

**Pass bar:** Student has a **place** (yard) before org work.

---

### UC-Ω-02 · Establish chapter presence (purpose org)

| Step | Action | Expected | Score | Evidence |
|------|--------|----------|-------|----------|
| 1 | Go to **`/connect`** | ProjectConnect hub; Yard Cred badge optional | | |
| 2 | **Create org** | Name e.g. `Omega Psi Phi · Meharry Graduate Chapter (test)` | | |
| 3 | Org type | Prefer **professional** or **service** (or peer) | | |
| 4 | Yard affiliation | `meharry` / Meharry if field exists | | |
| 5 | Open **`/connect/orgs/:id`** | Dedicated org page (not only a feed card) | | |

**Pass bar:** Chapter has a **named home** other orgs can find.

**If create fails:** Note error; try web vs Tauri; mark **F** with log.

---

### UC-Ω-03 · Scholarship opportunity (fellowship funding)

| Step | Action | Expected | Score | Evidence |
|------|--------|----------|-------|----------|
| 1 | From org, **post opportunity** | Title e.g. `ΩΨΦ Academic Fellowship / Scholarship interest (Meharry)` | | |
| 2 | Description | Eligibility, service expectation, deadline, how to apply | | |
| 3 | Tags | `scholarship`, `fellowship`, `meharry`, `omega` | | |
| 4 | Open **`/connect/opportunities/:id`** | Detail + apply/interest | | |
| 5 | Second account (or peer) **Express interest** | Skills snapshot + message; Cred shown to lead | | |
| 6 | Lead **inbox** `/connect/inbox` | Applicant visible; accept / contact / complete | | |

**Pass bar:** Scholarship path is **structured** (opp → interest → lead), not only a freeform post.

---

### UC-Ω-04 · Community service opportunity

| Step | Action | Expected | Score | Evidence |
|------|--------|----------|-------|----------|
| 1 | Post opp e.g. `Community health fair volunteers · Meharry / North Nashville` | Service framing clear | | |
| 2 | Type/tags | service · volunteer · date | | |
| 3 | Member expresses interest | Cap/spam rules don’t block first real app | | |
| 4 | Lead marks **completed** + short endorsement note | Yard Cred / completions move for applicant | | |

**Pass bar:** Service produces **proof** (completion/endorsement), not only likes.

---

### UC-Ω-05 · Convention / conference

| Step | Action | Expected | Score | Evidence |
|------|--------|----------|-------|----------|
| 1 | Create **yard event** (community / events UI) for e.g. `District Conclave watch + debrief` or conference prep | Event appears on yard | | |
| 2 | RSVP as member | RSVP recorded; optional soft WB | | |
| 3 | Optional: opportunity “Convention travel crew / logistics” under org | Links event purpose to Connect | | |
| 4 | Post to **feed** with yard tag announcing event | Visibility on My Yard | | |

**Pass bar:** Conference has a **calendar/event object** + optional Connect crew, not only a tweet-like post.

**Known partial:** Native live stream not required; link-out (Jitsi/external) OK if documented.

---

### UC-Ω-06 · Inter-org connection (other NPHC / campus orgs)

| Step | Action | Expected | Score | Evidence |
|------|--------|----------|-------|----------|
| 1 | Create or find second org e.g. `SNMA @ Meharry` or `Peer Circle` | Second purpose org | | |
| 2 | Browse Connect filters (professional / service / peer) | Both orgs discoverable | | |
| 3 | Cross-post or interest across orgs | Student can engage both without second app | | |
| 4 | Profile **Cred** tab | Completions/orgs visible for reliability | | |

**Pass bar:** At least **two orgs** coexist; discovery via Connect filters, not only following people.

---

### UC-Ω-07 · “Feed FYP to connect” (honest test)

Students often expect TikTok-style FYP to replace org systems. Score both paths.

| Step | Action | Expected | Score | Evidence |
|------|--------|----------|-------|----------|
| 1 | Open **Feed** · Local / My Yard | Campus posts load | | |
| 2 | Watch / trending / “people” strip if present | Real handles, not mock ghosts | | |
| 3 | From a post, navigate to **author profile** | Profile opens | | |
| 4 | From profile → **Connect / Cred / Pro** if available | Path toward professional context | | |
| 5 | Search for “Omega” or “scholarship” in Connect vs Feed | Connect finds structure; feed may miss | | |

**Pass bar (IEEE honesty):**  
- **P** if feed **discovers** people/events **and** clear CTA to Connect/org/event exists  
- **W** if feed works but org matching is only via manual `/connect` URL  
- **F** if user cannot get from “I saw a post” → “I applied to fellowship” without dead ends  

**Product rule to record:** FYP is **awareness**; Connect is **matching**. Expecting FYP alone to run scholarships is out of scope for v0 Yard.

---

### UC-Ω-08 · Economy literacy (do not block fellowship)

| Step | Action | Expected | Score | Evidence |
|------|--------|----------|-------|----------|
| 1 | Open **Wallet / Earnings** | Four pillars visible (practice / reliability / learn / settlement) | | |
| 2 | **Learn markets** tab | Markets 101; “not a brokerage” | | |
| 3 | Confirm fellowship flow never required BKSPC cash-out | No settlement needed for opps/events | | |

**Pass bar:** Productive social/fellowship works on **WB + Cred only**.

---

## 4. IEEE evaluation sheet (fill after run)

### 4.1 Claim under test

> A Meharry ΩΨΦ student can establish a chapter org, offer scholarship and service opportunities, coordinate conference-related activity, and discover peers/orgs—with feed supporting visibility—without mainnet settlement.

### 4.2 Results summary

| Use case | Result (P/W/F) | Minutes | Notes |
|----------|----------------|---------|-------|
| UC-Ω-01 Yard | | | |
| UC-Ω-02 Org create | | | |
| UC-Ω-03 Scholarship | | | |
| UC-Ω-04 Service | | | |
| UC-Ω-05 Conference | | | |
| UC-Ω-06 Inter-org | | | |
| UC-Ω-07 Feed→Connect | | | |
| UC-Ω-08 Economy literacy | | | |

**Overall:** ☐ Pass (all P/W, no F on critical path) · ☐ Partial · ☐ Fail  

**Critical path for this persona:** 01 → 02 → 03 or 04 → 06.  
**Feed path** is important for marketing honesty but secondary for scholarship ops.

### 4.3 Contribution / novelty (1 paragraph)

_What does this demonstrate that a generic feed or GroupMe does not?_  
_______________________________________________

### 4.4 Soundness / methods

- [ ] Steps reproducible from this doc alone  
- [ ] Screenshots or short video retained  
- [ ] Failures classified (UI / auth / empty data / performance / missing feature)  
- [ ] Tier 0 device noted if applicable  

### 4.5 Gaps observed (product backlog)

| Gap | Severity (H/M/L) | Suggested fix |
|-----|------------------|---------------|
| e.g. no Greek org template | | |
| e.g. FYP doesn’t surface orgs | | |
| e.g. scholarship deadline field missing | | |

### 4.6 Ethics / legitimacy notes (Meharry)

- [ ] No PHI required for this test  
- [ ] No pressure to cash out or buy token  
- [ ] Scholarship language is informational (not financial advice)  
- [ ] Recovery phrase handled offline  

---

## 5. Suggested content seeds (copy-paste)

**Org**  
- Name: `Omega Psi Phi · Meharry (IEEE test)`  
- Type: professional  
- Bio: Brotherhood, scholarship, service, uplift — Meharry graduate/professional students connecting across NPHC and campus orgs.

**Scholarship opp**  
- Title: `Academic fellowship interest · Spring (test)`  
- Body: For Meharry students in good standing. Service hours + GPA narrative. This is a **test opportunity** for IEEE review, not a funded award.

**Service opp**  
- Title: `Community service day · volunteer signup (test)`  
- Body: Sign up for a campus-adjacent service project. Completion may be endorsed for Yard Cred.

**Conference**  
- Event title: `Conference prep & debrief · ΩΨΦ (test)`  
- Description: Agenda, dress, carpool, volunteer roles. Link external registration if any.

---

## 6. After you run it

1. Fill the scores above (or a copy in your notes).  
2. List **top 3 gaps** that blocked brotherhood goals.  
3. Optional: open issues / send notes for product: org templates (NPHC), FYP “orgs & opportunities” rail, scholarship deadline field, convention event type.

**IEEE-ready outcome:** A filled sheet + screenshots beats a slide deck. This document is the method; your run is the result.
