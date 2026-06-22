# BlkSpace — Pitch Concerns & Investor Use Cases

**Date:** 2026-06-22  
**Purpose:** Archive every honest pitch objection raised in strategy review, map each investor persona to a defensible use case, and define what evidence clears each hurdle.  
**Related:** [`beta-launch-research.md`](beta-launch-research.md) · [`beta-tokenomics-and-launch-strategy.md`](beta-tokenomics-and-launch-strategy.md) · [`onboarding-and-competitive-review.md`](onboarding-and-competitive-review.md) · [`optimal-ui-exploration.md`](optimal-ui-exploration.md) · [`../THEORY.md`](../THEORY.md)

---

## 1. Executive summary

BlkSpace has **strong architecture and weak proof**. The code, tokenomics policy, and amalgamation thesis are ahead of users. Investors (IEEE, Shark Tank, pump.fun buyers) will not fund tokenomics docs, UI polish, or decentralization rhetoric — they fund **traction, a story, and a number**.

The pitch fails today on three axes:

| Axis | Current state | What kills the pitch | What clears it |
|------|---------------|----------------------|----------------|
| **Product proof** | 0 real users, mock data in web preview | "Zero, but the app works" | 50+ students at one yard posting daily |
| **Perception** | Crypto jargon, wallet gates, disclaimers | "Looks like a scam space" | Looks like Instagram that pays you; crypto invisible until cash-out |
| **Economics** | WB → BKSPC math = ~$0.01 / 11 days | "Better tokenomics than Trump Coin" | One real marketplace sale + one real withdrawal on devnet |

---

## 2. Investor questions — honest answers today

### 2.1 Core metrics (what they ask first)

| Question | Answer today | Why it fails | Evidence that clears it |
|----------|--------------|--------------|-------------------------|
| How many users? | 0 | No traction = no business | Cohort dashboard: DAU, posts/day, yards active |
| Show me revenue | $0 | Designed ≠ realized | Screenshot: "Creator sold DJ mix for 500 WB" |
| Why not TikTok? | "We're decentralized" | Students don't care about protocol | Real story: banned content that survives on BlkSpace + student with 200 followers |
| Why will BKSPC go up? | "Burn mechanism" | No volume to burn | 50 users × 250 WB/day = measurable withdrawal demand |
| What's your moat? | "HBCU + low hardware" | No lock-in yet | Device 2 benchmark + yard density at one school |
| Why not Trump Coin? | "Better tokenomics" | Attention beats utility pre-traction | "Trump Coin has no product; we have 50 daily users" |

### 2.2 Hard objections (from strategy review)

#### "This website looks like a scam space"

**What a normie or pump.fun buyer sees today:**

1. Landing page → "decentralized," "Nostr," "Iroh," "cryptographic identity" → crypto jargon = scam signal
2. Welcome wizard → "generate your key," "12-word recovery phrase," "nsec" → terrifying
3. Wallet page → "connect Phantom," "Solana," "BKSPC," "Anchor CPI" → rug-pull aesthetic
4. Disclaimers → "not a security," "utility credits," "counsel gate" → saying it's not a scam makes it look like one

**Trump Coin contrast:** "Buy $TRUMP." No wizard. No counsel gate. Simple = pumped.

**Fix (perception layer — necessary, not sufficient):**

| Current (scam signal) | Replace with (normie-safe) |
|-----------------------|----------------------------|
| Generate your Nostr identity | Create your account |
| 12-word recovery phrase | Backup code (save this!) |
| Connect Phantom wallet | Claim your earnings |
| BKSPC settlement | Cash out |
| Solana SPL token | (hidden until cash-out) |
| Not a security disclaimer | (ToS only, not on wallet surface) |

**Rule:** If a word appears on pump.fun scam tokens, it does not appear in the BlkSpace consumer UI.

#### "Connect my digital wallet to even do anything"

**Current flow (kills adoption):**

```
Open app → Create account → Generate cryptographic key →
Write down 12 words → Connect Phantom → ???
```

**Optimal flow:**

```
Open app → Pick handle → Post → "You earned 5 WeixBucks!" →
Use app for days → "You have 2,000 WB = 2 BKSPC" → Connect Phantom to claim
```

Keys auto-generated in background. Mnemonic shown only after user has something to lose.

#### "Gated users to make money at dev preferred rate"

Eligibility gates (7-day wait, 10 karma, 3 posts, 250 WB/day cap, 7-day cooldown) are **technically correct, politically catastrophic** for a token launch.

**Investor read:** "Founders control when you cash out" = centralized money, not decentralized social.

**Student read:** "Why am I posting if I can't get paid for 11 days?"

**Beta compromise:** Relax gates for first 100 users (instant WB credit, 3-day withdrawal, no karma floor) while keeping abuse caps. Document that production gates tighten post-beta.

#### "Only for poor Black people" / charity positioning

**Problem:** "HBCU app for low-end laptops" sounds like charity. Shark Tank rejects in 30 seconds.

**Reframe:** HBCU is the **wedge**, not the ceiling.

> "We're a decentralized creator economy that runs on the weakest hardware. We prove it with HBCU first — 300K students per cohort, 100+ schools, culturally tight communities. Same architecture scales to AAPI, Latinx, gaming, music."

#### "Trump Coin already won — why BKSPC?"

| | Trump Coin | BKSPC (today) |
|---|------------|---------------|
| Attention | Millions | 0 |
| Liquidity | Millions | 0 |
| Utility | None | Designed, not live |
| Community | Political base | HBCU (not onboarded) |
| Price action | Pumped | N/A |

**Honest answer:** Right now there is no reason to buy BKSPC over Trump Coin. BKSPC has better design; Trump Coin has better everything that matters in a memecoin launch.

**Answer that works (only with users):**

> "Trump Coin is a meme with no product. BKSPC is the cash-out rail for a social network where students already earn. One is speculation. The other is revenue-linked utility."

#### "Nothing to prove" / bleeding-edge claim

**Theoretically strong, empirically unproven differentiators:**

| Claim | Status | Proof needed |
|-------|--------|--------------|
| Runs on 4GB laptops | Designed | Device 2 Tier 0 benchmark published |
| Town-federated relay mesh | Designed | Load test at one yard |
| Creator keeps 85% | Policy | One real marketplace transaction |
| Self-sovereign identity | Built | Student story: content survived a ban elsewhere |
| Decentralized, uncensorable | Thesis | Relay + signed post demo |

**The novel claim for IEEE:** A decentralized social network runs on a student's 4GB laptop and they actually use it. That is publishable. Tokenomics is supporting evidence.

### 2.3 Tokenomics reality check

**Student math (current model):**

- Max 250 WB/day
- 1,000 WB = 1 BKSPC → 4 days max earning
- 7-day cooldown → **1 BKSPC every ~11 days best case**
- At $0.01/BKSPC → **$0.01 for 11 days of posting**

No student cares. No investor is impressed.

**Investor math:**

- Burn mechanism needs **transaction volume**
- Utility demand needs **features people pay for** (events, boosts, marketplace, premium yards)
- Without users, tokenomics is a 386-line policy with zero demand curve

**What makes tokenomics relevant (post-traction):**

| User | Earns | Gets BKSPC | Profits by |
|------|-------|------------|------------|
| Student | Posts, yard activity | Withdraw WB → BKSPC | Spend on features or sell on DEX |
| Creator | Viral content, marketplace | Same + top-tier bonus | 85% revenue share, NFT sales |
| Alumni/Faculty | Mentorship, events | Buy on DEX | Network access, sponsor yards |
| Professional | Pro profile, recruiting | Buy on DEX | Verified badge, job posts |
| Admin/Mod | Node operation | WB → BKSPC (fast tier) | Infrastructure + governance |
| Investor | N/A | Buy on pump.fun/DEX | Platform growth → utility demand → burn |

---

## 3. Use cases by persona — what each user actually gets

### 3.1 Student (primary)

| Job to be done | BlkSpace surface | Competitor | Why switch |
|----------------|------------------|------------|------------|
| Scroll campus drama | FYP / Local / yards | Fizz, Sidechat | Earn while scrolling |
| Post photos, clips | Feed composer | IG, TikTok | Keep 85%, own content |
| Customize identity | MySpace themes | Myspace (dead), IG | Cultural self-expression |
| Find events | Events calendar | GroupMe, flyers | One app, not five |
| Earn spending money | WB earn loop | TikTok Creator Fund (gated) | Start earning day 1 |

**Pitch line:** "The yard in your pocket. Post. Earn. Nobody can take it down."

### 3.2 Creator / DJ / artist

| Job to be done | BlkSpace surface | Competitor | Why switch |
|----------------|------------------|------------|------------|
| Sell mixes, art | Marketplace | Bandcamp, Etsy | 85% share, yard audience |
| Ticket events | NFT tickets (Phase 4) | Eventbrite | BKSPC-priced, on-chain proof |
| Build fanbase | Profile + stories | TikTok | Portable identity (Nostr) |
| Cross-post | Bridge tab | Manual reposting | One composer, many surfaces |

**Pitch line:** "TikTok keeps 50–70%. We keep 85%. Your yard is your stage."

### 3.3 Alumni / faculty

| Job to be done | BlkSpace surface | Competitor | Why switch |
|----------------|------------------|------------|------------|
| Mentor students | Yard membership | LinkedIn (cold) | Warm yard context |
| Host events | Yard events | Facebook Events | Federated, student-owned |
| Stay connected | Alumni yards | Facebook groups | No Meta surveillance |
| Sponsor content | BKSPC yard boosts | Ads | Direct to community |

**Pitch line:** "Stay on the yard after graduation. Sponsor the next generation."

### 3.4 Professional / recruiter

| Job to be done | BlkSpace surface | Competitor | Why switch |
|----------------|------------------|------------|------------|
| Recruit HBCU talent | Pro profile + job posts | LinkedIn | Verified yard context |
| Portfolio showcase | Profile grid | Behance | Social + professional in one |
| Campus presence | Verified badge | Company pages | Authentic, not corporate |

**Pitch line:** "Hire from the yard, not from a keyword search."

### 3.5 Admin / yard mod

| Job to be done | BlkSpace surface | Competitor | Why switch |
|----------------|------------------|------------|------------|
| Moderate yard | Role-gated mod tools | Discord mods | On-platform, auditable |
| Run relay node | Node settings | Self-host Nostr | College-town mesh |
| Governance | BKSPC votes (future) | DAO tools | Built into social graph |

### 3.6 Investor / IEEE / Shark Tank

| What they need | What to show | Not enough |
|----------------|--------------|------------|
| Traction | Live feed with real posts | Architecture diagram |
| Revenue path | Marketplace transaction log | Tokenomics policy |
| Technical moat | Tier 0 benchmark PDF | "We use Nostr" |
| Market size | HBCU wedge + expansion map | "Only for Black students" |
| Token thesis | Utility spend + burn with volume | Fair launch with no users |

**Investor narrative (when proof exists):**

> "BKSPC is the utility token for the BlkSpace HBCU creator economy. Students earn WB by posting. They spend WB in the marketplace and on yard events. Withdrawals convert to BKSPC. A fixed % of every transaction burns supply. You profit when the platform grows — because the token *is* the platform's cash-out rail."

---

## 4. Competitive positioning — what makes BlkSpace special

### 4.1 vs mainstream (TikTok, Discord, Myspace aesthetic, IG)

| Dimension | TikTok/IG | Discord | BlkSpace |
|-----------|-----------|---------|----------|
| Ownership | Platform owns content | Server owners | User owns keys + content |
| Economics | 30–50% to creator | No earn loop | 85% + WB earn |
| Identity | Locked in platform | Per-server | Portable (Nostr) |
| Hardware | Phone-first, heavy | Desktop/phone | Tier 0 laptop + phone |
| Culture | Global algorithm | Niche servers | HBCU yard-first |

**Honest gap:** TikTok has infinite content. BlkSpace has zero posts. Breadth-of-surfaces only wins after density at one yard.

### 4.2 vs decentralized social (Bluesky, Farcaster, Lens, Nostr clients)

| Dimension | Bluesky/Farcaster | BlkSpace |
|-----------|-------------------|----------|
| Onboarding | Invite / wallet | Guest browse → handle (target) |
| Hardware | Modern phone | 4GB laptop |
| Economy | None native | WB + marketplace + BKSPC |
| Audience | Crypto-adjacent | HBCU students |
| UX | Twitter-like | Amalgamation (FYP + Myspace + marketplace) |

**Moat if proven:** Only decentralized social network optimized for Tier 0 hardware with a built-in creator economy.

### 4.3 vs memecoins (Trump Coin, pump.fun)

| Dimension | Trump Coin | BKSPC |
|-----------|------------|-------|
| Product | None | Social network |
| User loop | Buy → hope | Post → earn → spend → cash out |
| Due diligence | Meme + liquidity | App link + feed + users |
| Risk profile | Pure speculation | Speculation + utility (if used) |

**Launch order matters:** Product proof → token. Not token → hope for product.

---

## 5. Scam-perception audit checklist

Use this before any investor demo or pump.fun launch:

- [ ] Landing page has zero protocol jargon above the fold
- [ ] Guest can scroll feed without account (no wallet, no keys)
- [ ] Account creation = handle + name only (keys silent)
- [ ] No "connect wallet" on home screen or feed
- [ ] No visible disclaimers on wallet/earn surfaces
- [ ] Feed shows **real posts**, not mock users
- [ ] `external_url` resolves to a **live app** (not NXDOMAIN)
- [ ] First-post experience shows celebration + earn feedback
- [ ] "WeixBucks" in UI; "BKSPC" only at cash-out
- [ ] Screenshots ready: real students, real posts, real yard

---

## 6. What clears the pitch hurdle — evidence ladder

| Rung | Evidence | Unlocks |
|------|----------|---------|
| 0 (today) | Code + tests + docs | GitHub credibility only |
| 1 | 10 students, 10 real posts, 1 yard | "It's real" — friends & family pitch |
| 2 | 50 DAU, 30% D7 retention, 1 marketplace sale | Campus ambassador pitch |
| 3 | 500 users, 1 BKSPC devnet withdrawal, Tier 0 benchmark | IEEE / angel pitch |
| 4 | 5,000 users, measurable burn volume | Shark Tank / Series A / pump.fun with utility story |

**Critical insight:** UI fixes and jargon removal are **rung 0 → 1** enablers. They do not substitute for rung 1+.

---

## 7. Open concerns to resolve in beta

| # | Concern | Owner | Resolution path |
|---|---------|-------|-----------------|
| 1 | No hosted URL | DevOps | GitHub Pages + domain (see beta-launch-research.md) |
| 2 | Mock data in web preview | Engineering | Seed real yard OR label samples |
| 3 | API 404s on static host | Engineering | api-server sidecar OR offline-first mock with real shape |
| 4 | Wallet friction | Product | Invisible wallet pattern |
| 5 | Eligibility gates too harsh | Tokenomics | Beta-relaxed gates |
| 6 | No installer for end users | DevOps | Publish v0.1-beta release from CI |
| 7 | esbuild deadlock on dev Mac | Environment | CI build + Codespaces |
| 8 | Zero retention data | Growth | Instrument D1/D7/D30 before scaling |

---

## 8. Document history

| Date | Change |
|------|--------|
| 2026-06-22 | Initial compile from strategy review sessions |