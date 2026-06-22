# BlkSpace — Beta Tokenomics + Launch Strategy

**Date:** 2026-06-22  
**Question:** What's the best beta-hosting option to secure domain + token + website link, with optimal tokenomics for all use cases (student → faculty → professional → admin → investor), and how does profit actually flow through Solana?  
**Identity:** BLKSPACE — aggregate amalgamation social network for HBCU creators. Student-first. Faculty-adjacent. Investor-aware.  

**Related:** [`tokenomics-policy.md`](tokenomics-policy.md) · [`reward-formulas.md`](reward-formulas.md) · [`bkspc-pumpfun-launch.md`](bkspc-pumpfun-launch.md) · [`mvp-timeline-and-onchain-roadmap.md`](mvp-timeline-and-onchain-roadmap.md) · [`onboarding-and-competitive-review.md`](onboarding-and-competitive-review.md)

---

## 1. The beta-hosting decision (domain + website + token link)

### What you need for a credible pump.fun launch

When BKSPC launches on pump.fun, the token page shows three things buyers check:
1. **Name + symbol** — BKSPC / BLKSPACE COIN ✅ (metadata ready)
2. **Image** — BlkSpace logo ⚠️ (needs a final logo file uploaded)
3. **Website link** — `external_url` in metadata ❌ (currently `https://weixblack.net` — **domain not registered, NXDOMAIN**)

A dead link on a pump.fun token page kills credibility instantly. Buyers assume it's a rug.

### The optimal beta-hosting stack (free, fast, credible)

| Piece | Tool | Cost | Why |
|-------|------|------|-----|
| **Domain** | Namecheap or Cloudflare Registrar | ~$12/yr | `.net` or `.app` — `weixblack.net` matches your branding |
| **Web hosting** | **GitHub Pages** (free) or **Cloudflare Pages** (free) | $0 | Push `dist/public/` → auto-hosted. No server to run. |
| **DNS** | Cloudflare (free) | $0 | Point `weixblack.net` → GitHub Pages. Adds free SSL + DDoS protection. |
| **Token metadata URL** | Same domain | $0 | `external_url: https://weixblack.net` resolves to the real app |

**Why not Vercel/Netlify?** They work, but GitHub Pages is simplest for a repo you already push to. Cloudflare Pages is the best free tier with custom domains + SSL. Either is fine — pick one and go.

### Beta-hosting timeline (do this today)

1. **Register `weixblack.net`** on Namecheap (~$12) — or `blkspace.app` if `.net` is taken
2. **Push `dist/public/` to a `gh-pages` branch** — one command: `git subtree push --prefix Code-Companion/artifacts/blkspace/dist/public origin gh-pages`
3. **Enable GitHub Pages** in repo Settings → Pages → source: `gh-pages` branch
4. **Point domain** — Cloudflare DNS: `A weixblack.net → GitHub Pages IP`, `CNAME www → er1cbrown.github.io`
5. **Update token metadata** — `external_url: https://weixblack.net` now resolves
6. **Then launch BKSPC** on pump.fun — website link works

**Stopgap (if you launch before hosting):** Change `external_url` to `https://github.com/er1cbrown/BlkSpace` — a real link is better than a dead one.

---

## 2. The landing page — what every visitor sees first

The landing page (`/`) is the front door for **all user types**: students, faculty, professionals, admins, investors, and pump.fun buyers. Today it's a marketing page ("The Digital Yard"). For beta + token launch, it needs to serve four audiences simultaneously.

### Optimal landing page structure

```
┌─────────────────────────────────────────────────┐
│  BlkSpace — The Digital Yard                     │
│  [Enter the Yard →]  [Create account]  [Sign in] │  ← Primary CTAs
├─────────────────────────────────────────────────┤
│                                                  │
│  HERO: "Scroll the yard for free.                │
│         Earn when you're ready.                  │
│         Built for HBCU, on the laptops           │
│         you already own."                        │
│                                                  │
│  [Enter as guest]  [Download app]                │  ← Guest = no friction
│                                                  │
├─────────────────────────────────────────────────┤
│  FOR STUDENTS          FOR CREATORS              │
│  • Post, earn WB       • Monetize your media     │
│  • Join your yard      • Marketplace listings    │
│  • Customize profile   • NFT tickets (Phase 4)   │
│  • MySpace themes      • 85% revenue share       │
├─────────────────────────────────────────────────┤
│  FOR ALUMNI / FACULTY  FOR PROFESSIONALS         │
│  • Alumni networking   • Pro profile + portfolio │
│  • Mentor a student    • Career fair pipeline     │
│  • Yard events         • Resume + project grid    │
│  • Verified badges     • LinkedIn-style presence  │
├─────────────────────────────────────────────────┤
│  FOR INVESTORS / IEEE / SHARK TANK               │
│  • BKSPC token → pump.fun link                   │
│  • Whitepaper → architecture docs                │
│  • Tokenomics summary → reward-formulas.md       │
│  • GitHub → code + CI proof                       │
│  • Tier 0 hardware demo → benchmark results      │
├─────────────────────────────────────────────────┤
│  THE ECONOMY                                      │
│  Earn WB (free) → Spend in marketplace           │
│  → Optional BKSPC settlement on Solana           │
│  → 1,000 WB = 1 BKSPC (after eligibility)       │
│                                                  │
│  [How earn works]  [Tokenomics policy]           │
├─────────────────────────────────────────────────┤
│  FOOTER: built by the community, owned by the    │
│  community. BKSPC on Solana. GitHub.             │
└─────────────────────────────────────────────────┘
```

**Key change from current:** Add a "For investors" section with the BKSPC pump.fun link + whitepaper + tokenomics. Today the landing page is student-only; an IEEE reviewer or pump.fun buyer lands and sees no token info, no architecture, no economics. That's a missed conversion.

---

## 3. Tokenomics audit — current model vs. optimal

### What exists today (from `tokenomics-policy.md` + `reward-formulas.md`)

| Layer | Token | Current state |
|-------|-------|---------------|
| **WeixBucks (WB)** | Off-chain credits | ✅ Live — earn from posts/likes/uploads/yards, capped 250/day, spend on tips/boosts/themes/marketplace |
| **Karma** | Off-chain reputation | ✅ Live — not spendable, not convertible, affects FYP ranking + leaderboard |
| **BKSPC** | Solana SPL token | 🟡 Stub — pump.fun metadata ready, Anchor program designed, devnet scripts exist, **not launched** |

**Conversion:** 1,000 WB → 1 BKSPC (fixed, after eligibility: 7-day age, 10 karma, 3 posts, 1,000 WB/week cap, 7-day cooldown, 1% settlement fee).

### The current model is **legally careful but economically thin**

**Strengths:**
- ✅ Earn-only WB (no USD purchase) → avoids money transmission / MSB issues
- ✅ BKSPC as settlement receipt → avoids Howey test (not an investment contract)
- ✅ Published fees (2% tip, 5% marketplace, 1% withdrawal) → transparent
- ✅ MIDF anti-abuse → prevents farming
- ✅ Hard cap + mint authority revocation → no inflation abuse

**Weaknesses (the gaps the user is pointing at):**
- ❌ **No path for investors to profit** — BKSPC is explicitly "not an investment." If an IEEE/Shark Tank investor buys BKSPC, there's no mechanism for the token to appreciate. It's a settlement rail, not a value accrual asset.
- ❌ **No faculty/professional use case** — tokenomics is student-only (post → earn WB → spend WB). A faculty member or alum has no reason to hold BKSPC.
- ❌ **No revenue buyback/burn** — platform fees are burned in WB (off-chain), not used to buy back BKSPC. So BKSPC has no demand sink tied to platform growth.
- ❌ **No "instant return" loop** — a user earns WB today but can't withdraw to BKSPC for 7 days + needs 10 karma + 3 posts. That's a friction wall, not an instant loop.
- ❌ **No investor-aligned metric** — an investor wants to see "platform revenue → token value." Today platform revenue = burned WB, which doesn't touch BKSPC.

---

## 4. The optimal tokenomics — robust, simple, effective

The goal: a model where **students earn, creators monetize, professionals participate, admins govern, and investors can back growth** — without crossing into securities territory.

### 4.1 The three-layer model (upgraded)

```
LAYER 1 — WeixBucks (WB) [off-chain, earn-only, free]
  Students + creators earn from activity (capped 250/day)
  Spend on tips, boosts, themes, marketplace (fees burned)
  → This is the engagement engine. Never purchasable with USD.

LAYER 2 — BKSPC [Solana SPL, settlement + utility]
  Minted ONLY from earned WB (1,000 WB → 1 BKSPC, eligibility-gated)
  Used for: premium features, NFT tickets, governance votes, exclusive yards
  → This is the creator/professional layer. Earn it by contributing.

LAYER 3 — BKSPC market [pump.fun → Raydium, free-floating]
  BKSPC trades on open market (pump.fun launch, then DEX)
  Price discovers naturally from: platform growth + utility demand + scarcity
  → This is the investor layer. Investors buy on the open market.
```

### 4.2 How each user type profits

| User type | How they earn WB | How they get BKSPC | How they profit |
|-----------|------------------|--------------------|-----------------|
| **Student** | Posts, likes, uploads, yard join, RSVP | Withdraw WB → BKSPC (1,000:1) | Sell BKSPC on DEX for SOL/USDC, OR spend BKSPC on premium features |
| **Creator** | Viral content, marketplace sales, DJ mixes | Same + bonus BKSPC for top-1% weekly content | NFT ticket sales in BKSPC; marketplace revenue; BKSPC appreciates if platform grows |
| **Alumni / Faculty** | Mentorship, verified badges, yard events | Buy BKSPC on DEX (they don't earn WB from posting) | Access to alumni network; sponsor a yard event (pay BKSPC); governance votes |
| **Professional** | Pro profile, portfolio, career fair | Buy BKSPC on DEX for premium listing | Hire students (pay BKSPC for job posts); professional credibility badge |
| **Admin / Yard Mod** | Node operation, relay uptime, validation | Node rewards → WB → BKSPC | Earn BKSPC for infrastructure work; governance over yard rules |
| **Investor (IEEE/Shark Tank)** | N/A (doesn't post) | Buy BKSPC on pump.fun / DEX | Profit if platform growth → BKSPC demand increases → price appreciates |

### 4.3 The demand sink — what makes BKSPC valuable

This is the missing piece. Today BKSPC has no utility beyond "settlement receipt." For BKSPC to have value, there must be **reasons to buy and hold it**.

| BKSPC utility | Who pays | Why | Demand driver |
|---------------|----------|-----|---------------|
| **Premium yard events** | Creators / orgs | Host a paid event (homecoming, concert) — attendees pay BKSPC | Event-driven demand |
| **NFT DJ tickets** | Fans | Buy a ticket to a DJ mix drop — minted as NFT, priced in BKSPC | Creator drops |
| **Marketplace premium listings** | Sellers | Featured placement in marketplace costs BKSPC | Commerce demand |
| **Boosted posts (cross-yard)** | Creators | Push a post to all yards — costs BKSPC, not just WB | Visibility demand |
| **Verified badge** | Professionals / faculty | One-time BKSPC payment for verified status | Trust demand |
| **Job / internship posts** | Employers | Post a job to HBCU yards — costs BKSPC | Recruiting demand |
| **Governance votes** | All holders | Vote on yard rules, feature priorities, fee changes | Governance demand |
| **Exclusive yards** | Creators | Patreon-style subscriber-only yards — access costs BKSPC/month | Subscription demand |
| **Burn (deflation)** | All transactions | % of every BKSPC transaction is burned → supply shrinks | Scarcity |

**The key insight:** BKSPC demand comes from **utility (people buying it to use features)**, not from speculation. But utility demand → price appreciation → investors profit from growth. That's the legal-safe loop: **investors profit because the platform grows, not because they were promised ROI.**

### 4.4 The "instant return" loop (what the user asked for)

The current 7-day cooldown + 10 karma + 3 posts eligibility is good for anti-abuse but kills the "instant" feeling. The optimal balance:

| Tier | Requirement | Withdrawal limit | Speed |
|------|-------------|------------------|-------|
| **New user** | Just created account | 0 (earn WB, can't withdraw yet) | — |
| **Active user** (default) | 3 posts + 7-day age | 500 WB/week → 0.5 BKSPC | 7-day cooldown |
| **Verified creator** | 10 karma + 10 posts + 30-day age | 2,000 WB/week → 2 BKSPC | 3-day cooldown |
| **Node operator** | Running relay/pin for 7+ days | 5,000 WB/week → 5 BKSPC | 1-day cooldown |

**Why this is better:** A student who posts for a week can withdraw their first BKSPC in 3–7 days. A creator with karma gets faster access. A node operator (the most committed) gets near-instant settlement. This is "instant enough" without being farmable.

### 4.5 The investor narrative (IEEE / Shark Tank)

When an investor asks "how do I profit from BKSPC?", the answer is:

> *"BKSPC is the utility token for the BlkSpace creator economy. As more HBCU students join, post, and transact, demand for BKSPC increases (event tickets, marketplace listings, boosted posts, premium yards). A fixed percentage of every BKSPC transaction is burned, so supply shrinks as usage grows. You profit by buying BKSPC on the open market and holding it as the platform's user base grows from hundreds to tens of thousands of HBCU students."*

**What makes this legally defensible:**
- You're **not promising ROI** — you're describing a utility-demand-driven market
- BKSPC has **real utility** (events, marketplace, governance, premium features)
- The token is **earned** (by users) and **bought** (by investors) — two demand sources
- Burns create **deflation** — supply shrinks with usage
- No presale, no insider allocation → **fair launch** on pump.fun

**What an IEEE reviewer sees:**
- A peer-to-peer Nostr/Iroh mesh that works on 2GB laptops (novel systems contribution)
- A creator economy with published, audited reward formulas (novel economics)
- Anti-abuse via MIDF + caps + eligibility (novel security)
- Town-federated relay routing avoiding O(N²) flooding (novel networking)

**What a Shark Tank investor sees:**
- 100+ HBCUs × ~3,000 students avg = ~300K addressable users per cohort
- Creator marketplace = take rate (5%) on every transaction
- Token = upside on platform growth without equity dilution
- Cultural moat: HBCU-specific, not generic "Web3 social"

---

## 5. Use-case tokenomics — the full workflow

### 5.1 Student (the core loop)

```
Open app (guest) → scroll FYP → "Create free account"
  → Post → earn 5 WB
  → Upload media → earn 10 WB
  → Join yard → earn 5 WB
  → Like others → they earn 1 WB
  → RSVP to event → earn 2 WB
  → Daily cap: 250 WB

  → Spend WB: tip a creator (2% fee), boost a post (15 WB), unlock theme (20 WB)
  → List in marketplace: sell a DJ mix for 50 WB (5% fee)
  → After 7 days + 3 posts: withdraw 500 WB → 0.5 BKSPC to Solana wallet
  → Sell BKSPC on DEX for SOL, OR hold, OR spend on premium features
```

### 5.2 Creator (the monetization loop)

```
Build audience on yard → viral post → top-1% weekly → bonus BKSPC grant
  → Marketplace: sell mixes, themes, services for WB
  → NFT tickets: mint a DJ mix as NFT, priced in BKSPC
  → Exclusive yard: subscribers pay BKSPC/month for access
  → Cross-yard boost: pay BKSPC to push content to all yards
  → Revenue: 85% to creator, 5% platform fee, 10% burn
```

### 5.3 Alumni / Faculty (the networking loop)

```
Verify alumni status (.edu email or manual) → verified badge (one-time BKSPC)
  → Join alumni yard → mentor students
  → Sponsor a yard event: pay BKSPC to host a career fair / networking night
  → Post a job: pay BKSPC to list on HBCU yards
  → Governance: vote on yard rules (1 BKSPC = 1 vote)
  → No need to earn WB — they buy BKSPC on DEX with SOL
```

### 5.4 Professional (the career loop)

```
Create pro profile (ProProfileTab) → portfolio + resume
  → Buy BKSPC on DEX → post a job listing (costs BKSPC)
  → Browse student portfolios → recruit directly
  → Verified professional badge (one-time BKSPC)
  → Premium yard access (BKSPC/month)
```

### 5.5 Admin / Yard Mod (the governance loop)

```
Run a relay → earn 1–5 WB/hour + pin serves (0.1 WB each)
  → Validate reward batches → earn 0.5 WB/batch
  → Withdraw WB → BKSPC (node operator tier: faster, higher cap)
  → Governance: mods vote on yard rules, bans, event approvals
  → Admin: platform admins manage node roles, treasury multisig
```

### 5.6 Investor (the growth loop)

```
Buy BKSPC on pump.fun / Raydium with SOL
  → Hold as platform grows (HBCU adoption → more users → more BKSPC utility)
  → Burn mechanism: every transaction burns % → supply shrinks
  → No promised ROI — profit from organic demand growth
  → Can also use BKSPC: sponsor events, buy premium listings, governance votes
```

---

## 6. The Karma → WB → BKSPC → Solana flow (the robust simple workflow)

```
KARMA (reputation, off-chain, never spendable)
  ↓ affects FYP ranking + leaderboard + withdrawal eligibility
  ↓
WEIXBUCKS (off-chain credits, earn-only, capped 250/day)
  ↓ spend on tips (2% fee), marketplace (5% fee), themes, boosts
  ↓ withdraw after eligibility (age + karma + posts + cooldown)
  ↓ 1,000 WB → 1 BKSPC (1% settlement fee burned)
  ↓
BKSPC (Solana SPL token, on-chain)
  ↓ hold for utility: events, NFT tickets, premium yards, governance
  ↓ sell on DEX (pump.fun → Raydium) for SOL/USDC
  ↓ burn: % of every transaction → supply shrinks over time
  ↓
SOL / USDC (real value, user's wallet)
```

**Why this is robust:**
- Karma can't be bought → reputation is earned (anti-Sybil)
- WB can't be bought → no money transmission issue
- BKSPC can't be minted without earned WB → no inflation abuse
- Burns create deflation → supply shrinks as usage grows
- Eligibility gates prevent farm-and-dump

**Why this is simple:**
- Users only see: "post → earn WB → spend or withdraw to BKSPC"
- Investors only see: "buy BKSPC → hold → sell"
- Admins only see: "moderate yard → earn WB → withdraw"
- Three tokens, three roles, one flow

---

## 7. Beta launch sequence — what to do in order

### Phase 1 — Hosting + domain (today)
1. Register `weixblack.net` (or alternative)
2. Deploy `dist/public/` to GitHub Pages / Cloudflare Pages
3. Point domain to hosted build
4. Update `bkspc-token.json` `external_url` to the real domain

### Phase 2 — Landing page upgrade (1 day)
5. Add "For investors" section with BKSPC pump.fun link + whitepaper + tokenomics
6. Add "For alumni/faculty" section with networking value prop
7. Add "For professionals" section with career value prop
8. Add economy explainer (earn WB → BKSPC → Solana)

### Phase 3 — BKSPC launch (after hosting works)
9. Run `pnpm --filter @workspace/solana run prepare-bkspc-pumpfun-launch`
10. Upload logo to pump.fun
11. Paste metadata (name, symbol, description, website = `weixblack.net`)
12. Submit + sign → record mint address
13. Update `bkspc-token.json` with mint address

### Phase 4 — Beta testing (after token exists)
14. Device 2 Tier 0 beta (guest mode + P0 features)
15. Student onboarding test (create account → post → earn WB)
16. Creator test (marketplace listing → sell → earn)
17. Investor check (pump.fun page → website → app → tokenomics doc)

### Phase 5 — Devnet bridge (after beta validates)
18. Phantom connect (read-only devnet)
19. Anchor `mint_rewards` on devnet
20. `withdraw_to_solana` WB → BKSPC flow
21. Legal review for mainnet

### Phase 6 — Mainnet (after legal sign-off)
22. Mainnet BKSPC settlement live
23. BKSPC utility features (events, NFT tickets, premium yards)
24. Governance votes
25. Mobile app

---

## 8. The one-paragraph tokenomics thesis

> BlkSpace's economy runs on three layers: **WeixBucks** (off-chain credits students earn by posting, uploading, and participating — capped at 250/day, never purchasable with USD), **Karma** (off-chain reputation that affects visibility and withdrawal eligibility — never spendable), and **BKSPC** (a Solana SPL token minted only from earned WB at a fixed 1,000:1 ratio after eligibility checks). Students earn WB → withdraw to BKSPC → sell on DEX or spend on premium features (events, NFT tickets, exclusive yards, boosted posts). Professionals and alumni buy BKSPC on the open market to access recruiting, networking, and verified badges. Investors buy BKSPC to back HBCU creator-economy growth — a fixed % of every transaction is burned, so supply shrinks as usage grows, and price discovers naturally from utility demand. No presale, no insider allocation, no promised ROI — just a fair-launch utility token where **everyone profits when the platform grows, because the token is the platform.**

---

## 9. What to do right now

1. **Register the domain** — without this, the pump.fun launch has a dead link
2. **Deploy to GitHub Pages** — free, instant, credible
3. **Upgrade the landing page** — add investor + faculty + professional sections
4. **Then launch BKSPC on pump.fun** — website link works, token page is credible
5. **Run Device 2 beta** — validate the student loop (browse → account → post → earn)
6. **Wire the devnet bridge** — make WB → BKSPC real on Solana devnet

*This document is the beta tokenomics + launch playbook. The code is ready; the distribution is the gap.*
