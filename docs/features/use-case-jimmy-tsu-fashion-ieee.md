# IEEE-style use-case review: Jimmy @ TSU Fashion Society (campus brand)

**Persona:** TSU student · **Fashion Society** · shoots for his own brand · sold on **Fizz** · wants a **first real campus venture** with a **credible portfolio** buyers and hosts can trust · expand sales to **Fisk**  
**Product claim under test:** BlkSpace supports **creator commerce + multi-yard expansion** via Studio/MyYard portfolio, Yard Sale (soft WB + escrow), Connect collabs, and Yard Cred — not anonymous social classifieds alone  

**Related:** [`myyard-yard-sale-architecture.md`](myyard-yard-sale-architecture.md) · [`four-pillar-economy.md`](four-pillar-economy.md) · feed **Fashion** filter on `ConnectDiscoveryRail`

---

## 1. Why he leaves Fizz (success criteria)

| Fizz-style pain | BlkSpace target |
|-----------------|-----------------|
| Anonymous / low trust buyers | Handle + profile + Yard Cred trail |
| No portable portfolio | **MyYard / Studio** grid + lookbook posts |
| Hard to prove past sales | Yard Sale history + escrow complete |
| Campus-only silo | Cross-yard (TSU → Fisk) with same identity |
| “Just a post” | Org (Fashion Society) + opportunities + listings |

---

## 2. Goals → product surface map

| Jimmy’s goal | Surface | Notes |
|--------------|---------|--------|
| Chapter / society home | **Connect** org `TSU Fashion Society` | Club type |
| Show work (photoshoots) | **Profile → Studio / Photos / Music** MyYard | Credible lookbook |
| Sell merch / digital drops | **Wallet → Yard Sale** | Soft WB, fees, escrow |
| Hire models / crew | Connect **opportunity** | Structured interest |
| Expand to Fisk | Fisk org/host opp + yard tag on listings | Multi-campus |
| Reputation | Completions, sales, **Yard Cred** | Not purchasable |
| Soft practice money | WeixBucks | Not BKSPC day one |

**BKSPC / settlement:** optional later after Cred + eligibility. Venture success **must not** require mainnet.

---

## 3. Pre-test setup

| Item | Value |
|------|-------|
| Home yard | **TSU** (`tsu`) |
| Second context | Browse **Fisk** yard / Connect filter Fashion |
| Handle | `________________` (Jimmy test) |
| Device | ______ |
| Clock | ______ |

---

## 4. Use-case script (P / W / F)

### UC-JM-01 · Society + brand identity

| Step | Action | Expected | Score |
|------|--------|----------|-------|
| 1 | Join/create **TSU Fashion Society** org | Org page exists | |
| 2 | Pro/profile bio mentions brand name | Visible on profile | |
| 3 | Upload or post **photoshoot** samples to MyYard / grid | Portfolio trail | |

---

### UC-JM-02 · Feed discovery (Fashion)

| Step | Action | Expected | Score |
|------|--------|----------|-------|
| 1 | Home → Fellowship rail → **Fashion** | Fashion society + shoot/host opps | |
| 2 | Banner: Studio → Yard Sale → Connect hosts | Clear venture path | |
| 3 | Open “Brand lookbook photoshoot” | Apply interest as model/crew | |

---

### UC-JM-03 · First Yard Sale listing (venture)

| Step | Action | Expected | Score |
|------|--------|----------|-------|
| 1 | Wallet → **Yard Sale** | Marketplace UI | |
| 2 | Create listing (digital merch / lookbook pack / service shoot) | Soft WB price, fee transparent | |
| 3 | Town tag **TSU** (and note Fisk expansion later) | Campus context | |
| 4 | Buyer (2nd account) purchases or opens escrow if available | Trust path > Fizz DM | |

**Pass bar:** At least **list** succeeds; full escrow may be **W** if UI partial.

---

### UC-JM-04 · Expand to Fisk (cross-yard)

| Step | Action | Expected | Score |
|------|--------|----------|-------|
| 1 | Open opp **Cross-yard seller intro · expand to Fisk** | Interest as seller | |
| 2 | Open **Fisk Campus Creatives Market** / host opp | Fisk host can interest | |
| 3 | Same Jimmy handle visible on both yards | Portable identity | |
| 4 | Optional: listing `town_tag` fisk or multi-campus post | Expansion visible | |

**Pass bar:** Cross-yard is **structured** (Connect host + seller), not only “post on Fisk Fizz.”

---

### UC-JM-05 · Credible portfolio for hosts & buyers

| Step | Action | Expected | Score |
|------|--------|----------|-------|
| 1 | Profile shows work + org affiliation | Hosts can inspect | |
| 2 | Completions / Cred after shoot collab | Reliability moves | |
| 3 | No requirement to cash out BKSPC to sell | Soft commerce only | |

---

### UC-JM-06 · Red lines

| Check | Expected | Score |
|-------|----------|-------|
| Not forced into crypto hype to list | True | |
| Escrow/fees disclosed if sale path used | True | |
| Cross-yard doesn’t wipe identity | True | |

---

## 5. IEEE results sheet

### Claim

> A TSU Fashion Society creator can establish a campus brand presence, recruit shoot talent, list on Yard Sale with soft credits, and expand sales collaboration to Fisk with a portable, credible identity—improving on anonymous Fizz-style selling.

### Results

| UC | P/W/F | Notes |
|----|-------|-------|
| JM-01 Society + portfolio | | |
| JM-02 Fashion rail | | |
| JM-03 Yard Sale listing | | |
| JM-04 Fisk expansion | | |
| JM-05 Credibility | | |
| JM-06 Red lines | | |

**Overall:** ☐ Pass · ☐ Partial · ☐ Fail  

---

## 6. Jimmy’s “venture stack” (one sentence)

**Shoot → Studio portfolio → Fashion Society org → Yard Sale listing → Connect host on Fisk → Yard Cred from deliveries.**

That is the productive path. Feed Fashion filter is how he **discovers** crew and hosts; Fizz is what he **graduates from**.
