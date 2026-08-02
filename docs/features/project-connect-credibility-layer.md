# ProjectConnectBKSPC · Credibility Layer (before finance)

**Status:** Design / feature review — implement **before** mainnet BKSPC finance  
**Last updated:** 2026-08-02  
**Codename:** ProjectConnectBKSPC (legacy: ProjectConnectTSU · Team SET · NSBE 2024)  
**Depends on:** Yards, profiles, karma, guest mode, Turso local DB  
**Does not depend on:** Mainnet token launch, pump.fun, USD rails  

**Related**
- Origin mockups: `attachments (1)/` (ProjectConnect HTML + NSBE decks)  
- Economy policy (later layer): [`../tokenomics-policy.md`](../tokenomics-policy.md)  
- Student money language: [`../economy-student-terms.md`](../economy-student-terms.md)  
- Launch rule: social first — [`../beta-launch-research.md`](../beta-launch-research.md)  
- Amalgamation map: [`../amalgamation-feature-gap-and-mobile-roadmap.md`](../amalgamation-feature-gap-and-mobile-roadmap.md)  

---

## 1. Why this layer exists

BlkSpace is an **amalgamation** social network (feed, yards, chat-like channels, MyYard, marketplace).  
ProjectConnect is the missing **professional / org / opportunity** surface.

**Finance without credibility is a scam narrative.**  
Credibility without finance is still useful (LinkedIn-style matching, research, clubs, service).

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3 — Finance & tokenomics (LAST)                      │
│  WeixBucks settle → BKSPC (BlkSpace Coin) · marketplace $   │
│  Only after credibility + eligibility are real              │
└────────────────────────────▲────────────────────────────────┘
                             │ gates
┌────────────────────────────┴────────────────────────────────┐
│  LAYER 2 — CREDIBILITY (THIS DOC · BUILD NEXT)              │
│  Orgs · opportunities · interest · proof · reputation       │
│  ProjectConnectBKSPC                                        │
└────────────────────────────▲────────────────────────────────┘
                             │ needs
┌────────────────────────────┴────────────────────────────────┐
│  LAYER 1 — Social amalgamation (MOSTLY SHIPPED)             │
│  Feed · yards · profiles · guest · chat channels · Turso    │
└─────────────────────────────────────────────────────────────┘
```

**Rule (non-negotiable):**  
No mainnet BKSPC “cash-out story” until Layer 2 can answer: *Who is this person? What have they done on the yard? Who vouches for them? Did they game the system?*

---

## 2. Naming (currency & product)

| Name | Kind | Role | User-facing now? |
|------|------|------|------------------|
| **WeixBucks (WB)** | Soft credits | Earn/spend inside the app (like Robux) | ✅ Yes |
| **Karma** | Reputation points | Visibility / ranking only — never spendable | ✅ Yes |
| **BKSPC** | On-chain token | **BlkSpace Coin** — Solana settlement / community token | 🟡 Devnet only |
| **ProjectConnect** | Product surface | Orgs + opportunities + matching | ⬜ Build |
| **ProjectConnectBKSPC** | Brand for Connect inside BlkSpace | Amalgamation name (not TSU-only) | ⬜ Build |
| **ProjectConnectTSU** | Legacy seed | First-campus flavor of Connect | Archive / seed data |

**Abbreviation fairness**
- Ticker-style name: **BKSPC**  
- Long form: **BlkSpace Coin** (or “BlkSpace Settlement Coin” in legal copy)  
- Never imply BKSPC price, profit, or guaranteed conversion in UI until counsel signs off  
- Published policy already: **1,000 WB → 1 BKSPC** (earn-only path) — see `tokenomics-policy.md`

---

## 3. Problem statement (from ProjectConnect + BlkSpace gap)

### From ProjectConnectTSU (NSBE Team SET)
- Students want hands-on work / research but **can’t find open projects**  
- Faculty / leads need **motivated people**, not cold email chaos  
- Campus wants **more real collaboration**, not another dead bulletin board  

### From BlkSpace amalgamation (your product intent)
- Yards = **place** (TSU, Howard…)  
- People also need **purpose orgs**: professional clubs, fun clubs, service hubs, labs, peer cohorts  
- Chat-like features exist; **dedicated org pages + opportunity matching** do not  
- Professional opportunities must land **before** people treat the app as “just a coin”  

---

## 4. Product definition: ProjectConnectBKSPC

### What it is
A **credibility-first network of organizations and opportunities** living inside BlkSpace:

| Concept | Definition |
|---------|------------|
| **Org** | Dedicated page: club, lab, NSBE chapter, service hub, startup, peer group |
| **Opportunity** | Posting under an org: research, internship, volunteer, collab, event crew |
| **Interest** | Student/peer signals “I’m interested” with a credibility snapshot |
| **Connect** | Org lead reviews applicants and starts a real conversation (in-app) |
| **Proof** | Portable signals: karma, completed projects, endorsements, yard tenure |

### What it is not
- Not a second login / T-number campus SSO (optional school email later)  
- Not mainnet finance  
- Not a replacement for **Yards** (campus mesh)  
- Not LinkedIn clone outside HBCU / yard culture  

### Relationship to Yards

```
Yard (campus place)
  └── can host / affiliate Orgs
        └── post Opportunities
              └── Interests → Connect → (later) paid work in WB / BKSPC
```

A student can:
- Belong to **TSU Yard** (place)  
- Join **NSBE @ TSU** org (purpose)  
- Apply to **“Fraud Detection with ML”** opportunity (work)  

---

## 5. Credibility model (the layer that earns finance rights)

Credibility is **earned signal**, not bought WB.

### 5.1 Signal stack (already partly in code)

| Signal | Source today | Connect use |
|--------|--------------|-------------|
| **Account age** | User `created_at` | Withdraw + org-lead eligibility |
| **Karma** (post + comment) | `db.rs` karma | Ranking applicants; never money |
| **Engagement quality** | Scalar + MIDF path | Throttle fake hustle |
| **MIDF score** | Malicious-intent framework | Block earn/withdraw abuse; flag fake interest spam |
| **Yard membership** | `yard_memberships` | Prefer same-yard matches |
| **Guest vs identity** | Session / keys | Guests browse orgs; interest requires account |

### 5.2 New signals (build in credibility layer)

| Signal | Description | Finance gate later |
|--------|-------------|--------------------|
| **Org membership** | Joined / role in real orgs | Higher trust for marketplace sellers |
| **Opportunity completions** | Lead marks “completed” + optional endorsement | Strongest off-chain proof of work |
| **Endorsements** | Lead or peer short vouch (rate-limited) | Withdraw eligibility boost |
| **Interest quality** | Not spam-applying to everything | MIDF-adjacent throttle |
| **Profile completeness** | Skills, class year, bio, portfolio links | Required to apply to pro/research |
| **Connect response rate** | Org leads who ghost get soft ranking penalty | Healthy marketplace of attention |

### 5.3 Credibility score (product, not crypto)

**Working name:** **Yard Cred** (internal: `credibility_score` 0–100)

Illustrative composite (tunable; publish formula in-app like fees):

| Component | Weight (draft) | Notes |
|-----------|----------------|-------|
| Karma percentile (yard-scoped) | 25% | Cap influence; anti-whale |
| Account age + activity streak | 15% | Sybil friction |
| Completions + endorsements | 30% | ProjectConnect proof |
| MIDF cleanliness (1 − overall) | 20% | Abuse floor |
| Profile + org participation | 10% | Show up IRL-ish |

**Rules**
- **Not purchasable** with WB or BKSPC  
- **Not convertible** to WB or BKSPC  
- Visible on profile + applicant cards  
- Used to **gate** later finance features (withdraw, high-value listings), not to print money  

This is the bridge: *social truth → professional proof → optional settlement*.

---

## 6. Feature set (build order)

### Phase C0 — Foundation (MVP, no finance)

| # | Feature | User story | Credibility role |
|---|---------|------------|------------------|
| C0.1 | **Org create / page** | “I start NSBE chapter / research lab / service hub” | Named home for proof |
| C0.2 | **Org types** | research · professional · club · service · peer | Filters; not one-size yard |
| C0.3 | **Opportunity post** | “We’re hiring research help / volunteers / collab” | Real demand surface |
| C0.4 | **Browse / search opportunities** | “Show me open research on my yard” | Discovery without spam DMs |
| C0.5 | **Express interest** | Student applies with skills snapshot | Structured intent |
| C0.6 | **Applicant inbox** | Lead sees GPA/class year/experience + Cred | Faculty portal from NSBE demo |
| C0.7 | **Connect action** | Opens in-app thread / DM | Close the loop without email-only |

**Success metric:** A faculty/org lead and a student complete interest → connect **without** WB or chain.

### Phase C1 — Proof & reputation (still pre-finance)

| # | Feature | Credibility role |
|---|---------|------------------|
| C1.1 | Mark opportunity **completed** | Durable proof of work |
| C1.2 | **Endorsement** (one per completion) | Portable trust |
| C1.3 | **Yard Cred** on profile + applicant card | Visible integrity |
| C1.4 | Interest spam limits + MIDF hooks | Anti-farm applications |
| C1.5 | Org roles: owner / lead / member | Governance lite |

**Success metric:** Completions + endorsements show on profile; Cred moves for real activity only.

### Phase C2 — Soft economy hooks (WB only, no mainnet)

| # | Feature | Note |
|---|---------|------|
| C2.1 | Optional **WB bounty** on opportunity (escrow later) | Still soft currency |
| C2.2 | Small **WB grant** on verified completion | Earn path tied to real work |
| C2.3 | Marketplace listing prefers high Cred sellers | Commerce follows credibility |

**Still not:** USD purchase of WB, mainnet BKSPC hype in Connect UI.

### Phase F — Finance layer (AFTER C0–C1 proven)

| # | Feature | Gate |
|---|---------|------|
| F.1 | WB → **BKSPC** withdraw (devnet → mainnet) | Cred + existing eligibility |
| F.2 | On-chain settlement for opportunity bounties | Counsel + escrow design |
| F.3 | Public tokenomics / pump.fun only if launch checklist passes | [`beta-launch-research.md`](../beta-launch-research.md) |

---

## 7. Data model (Turso / local-first sketch)

Implement in Turso (desktop) with same schema spirit as yards.

```text
orgs
  id, slug, name, org_type, yard_id?, description, avatar_url,
  created_by, created_at, credibility_boost DEFAULT 0

org_members
  org_id, handle, role (owner|lead|member), joined_at

opportunities
  id, org_id, title, description, duration_text, tags_json,
  status (open|closed|filled), created_by, created_at,
  wb_bounty INTEGER DEFAULT 0   -- Phase C2 only

opportunity_interests
  opportunity_id, handle, message, skills_snapshot_json,
  status (pending|accepted|rejected|completed), created_at

endorsements
  from_handle, to_handle, opportunity_id, note, created_at
  UNIQUE(from_handle, to_handle, opportunity_id)

credibility_events  -- append-only audit (local + optional Nostr later)
  id, handle, kind, delta, ref_id, created_at
```

**Profile extensions** (Connect applicant card)
- `class_year` / classification  
- `skills_json`  
- `experience_blurb` (short)  
- Optional `gpa` — **private by default**; only shown to org leads on interest  

---

## 8. UI surfaces (BKSPC design system)

| Route (draft) | Screen | Inspired by |
|---------------|--------|-------------|
| `/connect` | Hub: browse orgs + opportunities | Student portal |
| `/connect/orgs/:id` | Org page | Dedicated page yards lack |
| `/connect/opportunities/:id` | Opportunity detail + Apply | — |
| `/connect/inbox` | Lead: applicants | Faculty portal |
| Profile tab **Cred** | Completions, orgs, Cred score | Reputation |
| Nav | **Connect** next to Yards | Discoverability |

**Tone:** Same dark BKSPC UI as feed/yards — not the old TSU-blue HTML mockups.  
Legacy blue `#00539f` may appear only as **TSU yard theme**, not global chrome.

**Guest mode**
- Browse orgs + opportunities: ✅  
- Apply / create org: ⬜ requires free account (same as post/wallet)  

---

## 9. Mapping from NSBE HTML mockups → BlkSpace

| Mockup | Maps to |
|--------|---------|
| `first.html` | Reuse BlkSpace welcome / guest / create account |
| `create_account.html` student fields | Profile skills + classification (not T-number) |
| `login.html` role student/faculty | Org **role**, not second auth system |
| `student_portal.html` | `/connect` + opportunity cards + Apply |
| `faculty_portal.html` | `/connect/inbox` + create opportunity |
| “Let’s Connect” email alert | In-app message / existing chat surface |
| Sample projects (MPC, fraud ML) | Seed opportunities under demo orgs |

---

## 10. Trust & abuse (credibility protects finance)

| Risk | Mitigation in Layer 2 |
|------|------------------------|
| Fake orgs for prestige | Rate-limit org create; yard affiliation; report |
| Application spam | Daily interest cap; MIDF on burst apply |
| Paid endorsements | Endorsements only after completion; 1 per pair/opportunity |
| Cred farming | Caps, decay optional, human appeal path |
| Premature token narrative | Connect UI copy never says “earn crypto”; only WB after C2 |

**Finance eligibility (future)** — draft gate:

```
can_request_bkspc_settlement =
  identity_ok
  AND midf_overall < 0.7
  AND karma >= MIN_WITHDRAW_KARMA
  AND posts >= MIN_WITHDRAW_POSTS
  AND credibility_score >= MIN_CRED_FOR_SETTLEMENT   -- NEW
  AND (completions >= 1 OR endorsements >= 1)        -- NEW soft proof
```

Exact numbers: publish in wallet policy when F-phase ships.

---

## 11. What NOT to build yet

- Mainnet BKSPC marketing inside Connect  
- Buying WB with USD  
- GPA public by default  
- Mandatory T-number / school SSO  
- AI résumé scoring that fails Tier 0  
- Separate mobile-only Connect app  

---

## 12. Implementation roadmap (engineering)

| Sprint | Deliverable | Exit criteria |
|--------|-------------|---------------|
| **S1** | Schema + Tauri CRUD orgs/opportunities/interests | Local Turso tests green |
| **S2** | React `/connect` browse + apply + inbox | E2E: apply → lead sees applicant |
| **S3** | Completions + endorsements + Cred display | Profile shows proof |
| **S4** | MIDF/rate limits + guest gates | Abuse paths blocked in tests |
| **S5** | Docs + README screenshots for Connect | Credibility story visible on GitHub |
| **F*** | Only then: WB bounty + BKSPC settlement gates | Finance layer checklist |

---

## 13. Success criteria (credibility layer “done enough” for finance)

Layer 2 is ready to unlock finance work when:

1. ≥1 real campus can host orgs + opportunities in production Yard build  
2. Interest → connect works end-to-end offline-friendly (Turso)  
3. Completions/endorsements affect visible Cred  
4. Abuse tests: spam apply and self-endorse fail  
5. Student copy is clear: **Cred ≠ money; WB ≠ investment; BKSPC later & optional**  
6. Device B checklist still passes with Connect enabled (Tier 0)  

---

## 14. One-page student language

> **ProjectConnect** helps you find research, clubs, service, and pro opportunities on your yard.  
> Build **Cred** by finishing real work and getting endorsements.  
> **WeixBucks** are app credits you earn.  
> **BKSPC (BlkSpace Coin)** is optional later settlement — not required to use Connect, and not a way to buy status.

---

## 15. Decision log

| Decision | Choice | Why |
|----------|--------|-----|
| Name | ProjectConnectBKSPC | Amalgamation brand; TSU is first seed not the whole product |
| Layer order | Credibility before finance | Anti-scam; product value without coin |
| Currency long name | BlkSpace Coin (BKSPC) | Matches existing tokenomics docs |
| Orgs vs yards | Orgs nest under / affiliate yards | Place + purpose |
| Cred purchasable? | No | Integrity of reputation |
| MVP connect channel | In-app, not email-only | Fits amalgamated social + chat |

---

## 16. Next action

1. **Approve** this review (org types + C0 scope).  
2. Implement **S1–S2** (schema + Connect UI).  
3. Keep finance/tokenomics docs as **downstream** of Cred gates.  
4. Archive ProjectConnect TSU artifacts under `docs/archive/project-connect-tsu/` when ready.

**Owner:** product + eng  
**Reviewers:** economy policy owner, campus pilot lead  
