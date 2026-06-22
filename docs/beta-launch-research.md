# BlkSpace — Beta Launch Research & Optimal Strategy

**Date:** 2026-06-22  
**Purpose:** Synthesize research on successful (and failed) social app betas into an optimal BlkSpace beta launch plan that produces investor-grade proof.  
**Related:** [`pitch-concerns-and-investor-use-cases.md`](pitch-concerns-and-investor-use-cases.md) · [`beta-tokenomics-and-launch-strategy.md`](beta-tokenomics-and-launch-strategy.md) · [`onboarding-and-competitive-review.md`](onboarding-and-competitive-review.md)

---

## 1. Research summary — what actually works

### 1.1 Campus social apps that won

| App | Playbook | Key lesson for BlkSpace |
|-----|----------|-------------------------|
| **Facebook** | One school (Harvard) → density before expansion | **One yard first** (e.g., TSU, Howard, FAMU) — not "all HBCUs" |
| **BeReal** | Campus ambassadors at Rice, then French universities; authenticity hook | Ambassadors + **one clear daily habit** (BeReal had photo time; BlkSpace needs "post on the yard") |
| **Fizz** | Student ambassadors, Greek life + club targeting, school-verified identity | **Campus lead + 2–3 ambassadors** per school; school-specific feed is the hook |
| **Sidechat** | Invite codes + cash per referral on campus | Referral loops work **after** core loop is fun — not before |
| **TikTok** | Campus ambassadors (2019–2021), algorithm once density exists | Paid acquisition <10–20% of growth; product must be inherently viral |
| **Tinder** | 99.5% D1 retention with ~200 users **before** campus expansion | **Retention before scale** — ambassador programs fail without PMF (a16z/Future) |

### 1.2 Crypto-social apps — cautionary tales

| App | What happened | Lesson |
|-----|---------------|--------|
| **Friend.tech** | Explosive launch on Base, daily transactions collapsed within weeks | Token-first without retention = spike then death; **product retention > token hype** |
| **Own** (2025) | Tokenize creator economy — early hype | Investors want **users transacting**, not tokenize thesis alone |

**BlkSpace rule:** Launch the **social loop** before the **token loop**. BKSPC on pump.fun comes after rung 2 proof (see §4).

### 1.3 Investor benchmarks (a16z consumer social, seed stage)

| Metric | OK | Good | Great |
|--------|-----|------|-------|
| Monthly user growth | 20% | 35% | 50% |
| DAU/MAU | 25% | 40% | 50%+ |
| L5+ (5–7 days/week) | 30% | 40% | 50%+ |
| D1 retention | 50% | 60% | 70% |
| D7 retention | 35% | 40% | 50% |
| D30 retention | 20% | 25% | 30% |

**BlkSpace beta target (realistic for rung 2):**

- 50 WAU at one yard
- D7 ≥ 40%, D30 ≥ 25%
- 30%+ of WAUs posting ≥3×/week
- 80%+ organic acquisition (not paid)

### 1.4 Ambassador program timing (a16z Future)

> "If you don't yet have product-market fit, an ambassador program drives initial users who churn — burning your core audience."

**Sequence:**

1. **Closed beta** — 10–30 students, hand-picked, weekly feedback
2. **Iterate** until D7 retention ≥ 35%
3. **Campus lead + ambassadors** — scale to 200–500 at one school
4. **Second school** — only after first school flattens retention curve

---

## 2. Why "get 10 users" alone is not enough

The prior recommendation ("stop coding, get 10 users") is **directionally correct but operationally incomplete**. Ten users without instrumentation, hosting, or a defined success loop produces anecdotes, not a pitch.

**What's missing without a system:**

| Gap | Consequence |
|-----|-------------|
| No public URL | Can't send a link; can't put on pump.fun |
| No analytics | Can't show D7/D30 to IEEE |
| Mock data visible | Users think it's fake; investors agree |
| Wallet on step 1 | 8/10 bounce before posting |
| Token before users | Friend.tech trajectory |

**Optimal beta = infrastructure + single-yard density + proof artifacts.**

---

## 3. The optimal beta launch model for BlkSpace

### 3.1 Design principles

| # | Principle | Implementation |
|---|-----------|----------------|
| 1 | **Social first, crypto invisible** | WeixBucks in UI; BKSPC only at cash-out; silent key generation |
| 2 | **One yard, not one internet** | Launch at a single HBCU yard until 50 WAU |
| 3 | **Browse before belong** | Guest mode → post prompt → account in <30s |
| 4 | **Proof over polish** | Real posts screenshot > UI refactor |
| 5 | **Retention before token** | D7 ≥ 35% before pump.fun |
| 6 | **Hosted link always works** | GitHub Pages → custom domain; no localhost pitches |
| 7 | **Instrument everything** | D1/D7/D30, posts/user, time-to-first-post |

### 3.2 The "Invisible Wallet" pattern (solves scam perception)

```
Phase A — First session (0 crypto visible)
  Guest scroll → "Join TSU Yard" → handle only → post → "You earned 5 WB!"

Phase B — First week (game economy)
  WB balance, karma, leaderboard, marketplace browse
  "WeixBucks" language throughout

Phase C — First cash-out (crypto revealed)
  "You have 2,000 WB → convert to 2 BKSPC"
  NOW: connect Phantom, show backup code, explain Solana
```

This matches how Cash App, Venmo, and Robinhood onboarded normies — money first, plumbing later.

### 3.3 Beta-relaxed tokenomics (anti "dev-controlled payout" perception)

| Gate | Production | Beta (first 100 users) |
|------|------------|------------------------|
| WB daily cap | 250 | 500 |
| Withdrawal cooldown | 7 days | 3 days |
| Karma floor | 10 | 3 |
| Post count floor | 3 | 1 |
| First-post bonus | 5 WB | 50 WB (one-time) |

**Communicate clearly:** "Beta rewards are boosted. Production economics in [date]."

### 3.4 The "TSU Yard Pilot" (template for any HBCU)

**Week 0 — Infrastructure (parallel, 2–3 days)**

| Task | Owner | Output |
|------|-------|--------|
| Enable GitHub Pages | Maintainer | `er1cbrown.github.io/BlkSpace` live |
| Register `weixblack.net` | Maintainer | Domain → Pages |
| CI build fresh dist | CI | Latest guest mode + UI fixes deployed |
| Publish `v0.1-beta` installer | Maintainer | Windows `.msi` from release.yml |
| Add PostHog/Plausible | Engineering | D1/D7/D30 dashboard |
| Seed yard with 20 posts | Team + ambassadors | Real content, not mock |

**Week 1 — Closed beta (10 students)**

| Day | Action | Success signal |
|-----|--------|----------------|
| 1 | Recruit 10 from one org (DMV, Greek, radio station) | 10 installs or web signups |
| 2 | Watch them use it (Zoom or in-person) | Note #1 friction point |
| 3 | Fix #1 friction | Time-to-first-post < 2 min |
| 5 | Everyone posts ≥1 | 10 real posts in feed |
| 7 | Measure D7 | ≥5 of 10 return |

**Deliverable:** Screenshot of feed + friction log.

**Week 2–4 — Yard density (50 students)**

| Action | Detail |
|--------|--------|
| Hire campus lead | 1 student, $200/stipend or WB bonus |
| +2 ambassadors | Greek + creative org |
| Activation | Yard BBQ, radio shout-out, GroupMe drop |
| Daily habit | "Post your yard fit" / "Monday motivation" prompt |
| Marketplace | 1 real sale (DJ mix, art, notes) |

**Deliverable:** 50 WAU, 30+ posts/day, 1 marketplace transaction.

**Week 5–6 — Investor artifacts**

| Artifact | Format |
|----------|--------|
| Traction slide | DAU chart, retention cohort |
| Story slide | Student quote + ban-survival narrative |
| Technical slide | Tier 0 benchmark from Device 2 |
| Token slide | WB volume → BKSPC withdrawal math (with real n) |
| Live demo | 60-second scroll on phone |

**Week 7+ — Token launch (conditional)**

Launch BKSPC on pump.fun **only if**:

- [ ] D7 retention ≥ 35%
- [ ] 50+ WAU at one yard
- [ ] `weixblack.net` serves live app
- [ ] ≥1 marketplace transaction
- [ ] ≥1 devnet BKSPC withdrawal completed

---

## 4. Beta launch phases — decision gates

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 0: INFRASTRUCTURE                                     │
│  Hosted URL · CI build · analytics · seed content            │
│  GATE: link loads in <3s on phone, guest scroll works        │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: CLOSED BETA (n=10)                                 │
│  Hand-picked students · invisible wallet · friction fixes    │
│  GATE: 10 real posts · D7 ≥ 50% (lenient at n=10)           │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: YARD DENSITY (n=50)                                │
│  Campus lead · ambassadors · daily prompts · 1 sale          │
│  GATE: D7 ≥ 35% · 30+ posts/day · 1 marketplace tx           │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3: PROOF PACK                                         │
│  Screenshots · retention cohort · Tier 0 bench · demo video  │
│  GATE: investor can grok value in 60 seconds                 │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 4: BKSPC LAUNCH (pump.fun)                            │
│  Token with working app link · utility story · fair launch   │
│  GATE: all Phase 2 checkboxes                                │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 5: SECOND YARD + AMBASSADOR SCALE                     │
│  Only after retention curve flattens at yard 1               │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Hosting strategy for beta

### 5.1 Recommended stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | GitHub Pages (workflow exists) | Free, auto-deploy on push, credible URL |
| Domain | `weixblack.net` via Cloudflare | Matches branding + token metadata |
| API (web) | Cloudflare Worker or Railway free tier | Fixes /api 404s on static host |
| Desktop | GitHub Releases `v0.1-beta` | Tier 0 Windows path |
| Analytics | PostHog Cloud free tier | Retention cohorts for pitch |
| Feedback | Tally form or GitHub Discussions | Structured friction capture |

### 5.2 What NOT to do for beta

| Anti-pattern | Why |
|--------------|-----|
| Python `http.server` on localhost | Not shareable; proves nothing |
| pump.fun before hosted app | Dead `external_url` = rug signal |
| All-HBCU launch | No density anywhere |
| Ambassador program before D7 proof | Burns audience (a16z) |
| Feature coding during Week 1–2 | Fix friction only |

---

## 6. New-user value proposition — "what do I get in 30 seconds?"

This is what investors implicitly ask when they say "what's the use case?"

### 6.1 First 30 seconds (guest)

| Second | Experience | Emotion |
|--------|------------|---------|
| 0–5 | Land on yard feed with real posts | "This is alive" |
| 5–15 | Scroll FYP — video, text, events | "Familiar like TikTok/Twitter" |
| 15–25 | See "Trending on TSU Yard" | "My people" |
| 25–30 | Tap post → like prompt → "Join to earn" | "I want that" |

### 6.2 First 5 minutes (new account)

| Minute | Experience | Emotion |
|--------|------------|---------|
| 1 | Pick handle, no wallet | "That was easy" |
| 2 | First post | "I'm on the yard" |
| 3 | "You earned 50 WB!" + confetti | Dopamine (Trump Coin lesson) |
| 4 | See rank on leaderboard | Competition |
| 5 | Browse marketplace | "I could sell my beats here" |

### 6.3 First week (retained user)

| Day | Hook |
|-----|------|
| 1 | First post + earn |
| 2 | Notification: "Someone liked your post" |
| 3 | Daily prompt: "Yard fit check" |
| 5 | Friend joins via referral |
| 7 | "You have 500 WB" → marketplace or cash-out preview |

**Crypto is invisible until Day 7+.**

---

## 7. Competitive "why switch" one-liners (for ambassadors)

Train ambassadors to say these, not protocol jargon:

| vs | One-liner |
|----|-----------|
| TikTok | "TikTok keeps your money. BlkSpace pays you to post." |
| Instagram | "Your aesthetic, your rules — MySpace-style profile, 2026." |
| Discord | "Your whole yard in one feed, not 50 dead servers." |
| Fizz | "Fizz is anonymous chaos. BlkSpace is your yard with earnings." |
| Twitter/X | "Nobody can take your posts down. You own it." |
| Trump Coin | "That's a meme. This is a campus you can earn on." |

---

## 8. Proof artifacts checklist (the pitch deck in 6 images)

| # | Artifact | Captures |
|---|----------|----------|
| 1 | Feed screenshot | Real students, real posts, one yard |
| 2 | Retention cohort | D1/D7/D30 from analytics |
| 3 | Earn notification | "You earned 50 WB" on phone |
| 4 | Marketplace receipt | "DJ Kev sold mix for 500 WB" |
| 5 | Tier 0 benchmark | Device 2: cold start, RAM, FPS |
| 6 | Withdrawal tx | Devnet BKSPC withdrawal hash |

**These six images answer every investor question in pitch-concerns doc §2.**

---

## 9. Engineering priorities during beta (minimal, friction-only)

Do **not** build new features during Phase 1–2. Fix only what blocks the proof loop:

| Priority | Fix | Blocks |
|----------|-----|--------|
| P0 | Hosted deploy + domain | Sharing link |
| P0 | Silent key generation | 80% bounce at onboarding |
| P0 | Jargon removal (WeixBucks, cash out) | Scam perception |
| P0 | Seed real yard content | Empty feed |
| P1 | First-post celebration | No dopamine |
| P1 | Analytics events | No retention proof |
| P1 | api-server for web `/api/*` | Blank panels |
| P2 | Beta-relaxed withdrawal gates | "Dev controls my money" |
| P2 | Referral codes | Ambassador loop |
| P3 | Landing page investor section | Already shipped — keep updated |

---

## 10. Success metrics — beta complete definition

Beta is **successful** when all of these are true:

- [ ] **50 WAU** at a single named yard
- [ ] **D7 retention ≥ 35%** (bounded, n-day)
- [ ] **≥30 posts/day** from real users (not seed team)
- [ ] **≥1 marketplace transaction** completed
- [ ] **≥1 BKSPC withdrawal** on devnet
- [ ] **Time-to-first-post < 2 minutes** (measured)
- [ ] **Hosted URL** loads on 4GB Android browser + Windows laptop
- [ ] **6 proof artifacts** (§8) captured

At that point:

1. BKSPC pump.fun launch is justified
2. IEEE submission has empirical data
3. Shark Tank pitch has "50 students at TSU post daily" — not theory

---

## 11. What the maintainer does vs what engineering does

| Who | Week 0–1 | Week 2–4 |
|-----|----------|----------|
| **Maintainer** | Register domain, enable Pages, publish beta release, recruit first 10 students, attend user sessions | Hire campus lead, run activations, capture screenshots |
| **Engineering** | Deploy, silent wallet, jargon pass, seed content, analytics | Fix #1 friction each week, api-server, beta tokenomics flags |
| **Ambassadors** | — | GroupMe drops, table activations, daily prompts |

---

## 12. Research sources

| Source | Key takeaway |
|--------|--------------|
| [a16z — Benchmark Your Social App](https://a16z.com/do-you-have-lightning-in-a-bottle-how-to-benchmark-your-social-app/) | DAU/MAU, L5+, D1/D7/D30 benchmarks |
| [a16z Future — College Ambassador Programs](https://future.com/college-ambassador-program-how-to-for-startups/) | Retention before ambassadors; campus lead model |
| BeReal growth (First 1000, Business Insider) | Campus ambassadors, authenticity hook, density at one school |
| Fizz (Forbes 2025, Stanford ethics case) | School-specific feed, ambassador hiring, Greek/club targeting |
| Friend.tech (TechCrunch 2023) | Token spike without retention = collapse |
| BlkSpace internal docs | Tokenomics, onboarding audit, UI exploration, pitch concerns |

---

## 13. Document history

| Date | Change |
|------|--------|
| 2026-06-22 | Initial research synthesis + optimal beta plan |