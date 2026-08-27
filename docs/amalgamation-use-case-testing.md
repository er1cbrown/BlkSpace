# Amalgamation use-case testing + strengthen-each-piece

**Date:** 2026-08-26  
**Status:** Partial in code — Device B smoke + new guest-room walk  
**Why now:** Mobile is when **ads and boots on the ground** show up. The skeleton is good. Each room has to hold a real phone + a real yard, without going \(O(N_u^2)\).

**Related:** [`amalgamation-honest-competitive-review.md`](amalgamation-honest-competitive-review.md) · [`theory-of-computing-scale.md`](theory-of-computing-scale.md) · [`features/scale-matrix-complexity-compare.md`](features/scale-matrix-complexity-compare.md) · [`features/use-case-capability-log.md`](features/use-case-capability-log.md) · [`device-b-student-smoke.md`](device-b-student-smoke.md)

---

## 1. Have we accounted for \(n\), \(n^2\), \(\log n\)?

**Yes, on paper. Only partly in tests.**

The scale model says the product is a **sparse, block-diagonal yard graph** \(A_y\), not a dense \(N_u \times N_u\) social matrix.

| Operation | Bound we claim | What the code does | Tested? |
|---|---|---|---|
| Append post | \(O(1)\)–\(O(\log N_p)\) with indexes | SQLite insert | Device B post timing &lt; 15s (too loose) |
| Feed page | \(O(k + \log N_p)\) yard window | Local posts + FYP rank | Partial (`blog-fyp` unit) |
| Rank \(n\) items | \(O(n \log n)\) sort + \(O(1)\) score | `sparseLinearScore` + `sortBySparseScore` | **Yes** (`sparse-rank.test.ts`) |
| Engagement | \(\log(1+e)\), not \(e^2\) | `Math.log1p` | **Yes** |
| Connect rail | Scan open opps in yard, not global \(N_u\) | filters + sparse score | Partial |
| Dense reputation \(R \in \mathbb{R}^{N_u \times N_u}\) | **Forbidden** \(O(N_u^2)\) space | We store a scalar Cred, not a matrix | By construction |
| Global flood “everyone sees every post” | \(\Omega(N_u)\) per event — **avoided** | Town tags | Manual / Device B |
| Media blobs | \(O(B)\) selective, not all CIDs on Tier 0 | Iroh Full vs Yard | CI flavors, not e2e |

**Rule for mobile:** a phone is a **tiny \(A_y\)** (one yard, dozens of follows). If any screen loops users×users or posts×users, it will jank on first campus demo. Strengthen = keep work **yard-local**.

Ads (if any) must **not** become a dense “buy rank” matvec on the FYP. That is \(n^2\) socially *and* a thesis violation (`buy rank` already banned in discipline-track tests).

---

## 2. What already runs

| Suite | Command | Covers |
|---|---|---|
| Device B student smoke | `bunx playwright test e2e/device-b.browser.spec.ts --project=browser` | Guest → TSU join → post → Customize → Live |
| Web smoke | `e2e/smoke.browser.spec.ts` | Landing + search seed |
| Amalgamation rooms (**new**) | `e2e/amalgamation.browser.spec.ts` | Guest walk of every campus room + **iPhone 13** nav |
| Sparse rank (**new**) | `bun run test:run` (`sparse-rank.test.ts`) | \(O(n \log n)\), log engagement, yard-scale metrics |
| Connect / escrow / arcade / tracks | existing Vitest | Slices in isolation |

**Gap:** rooms were **partial-done** as UI. Nobody walked **all of them in one guest session on a phone viewport**. That is the amalgamation test.

---

## 3. Scenario pack (run these before mobile ads)

Each scenario is one **persona × rooms**. Fail = crash, blank, GuestCTA missing, or a screen that needs the whole graph.

| # | Persona | Path | Pass if |
|---|---|---|---|
| S0 | Guest / phone | Welcome → browse → Home / Yards / Connect | Bottom nav works at 390×844; no error boundary |
| S1 | TSU student | Join → post → Customize → Live | Device B spec (already) |
| S2 | Fashion / sell | Yard Sale list or wallet marketplace (signed-in) | Escrow states legal; 5% fee visible |
| S3 | Research / Cred | `/connect` → one opp visible | Rank is yard-local, not global |
| S4 | Med / busy | `/focus` + `/clinyard` | Focus copy loads; **ClinYard is still a stub** — do not demo as full drills |
| S5 | Faculty | `/faculty` | Page lives; posting still identity-gated |
| S6 | Play | `/arcade` → `/play` | Homebrew shelf; play shell refuses `javascript:` |
| S7 | Literacy | `/wallet` as guest | **Gate**, not a coin ticker. WeixBucks only after account |
| S8 | Cross-room | Feed → Yards → Connect → Hub → Arcade | No “Something went wrong” (amalgamation spec) |

Run:

```bash
cd Code-Companion/artifacts/blkspace
bun run test:run
bun run e2e:browser -- e2e/amalgamation.browser.spec.ts e2e/device-b.browser.spec.ts
```

Phone-on-Mac (later, $0 Personal Team): same guest walk in Simulator, then `tauri ios dev --device`.

---

## 4. Strengthen each piece (skeleton → load-bearing)

Do **not** add BI9/ads here. Strengthen the rooms mobile will actually open.

| Piece | Skeleton today | Strengthen (before boots on the ground) | Complexity to protect |
|---|---|---|---|
| **Feed / FYP** | Watch + rank + guest | Cap window size \(k\); keep `log1p(eng)`; never buy-rank | \(O(k \log k)\) not \(O(N_u d)\) |
| **Yards** | List + TSU seed | One-tap join; channels don’t fetch other towns | Per-yard \(A_y\) |
| **Connect** | Orgs + opps + Cred | Phone layout; interest = one insert | \(O(N_{\mathrm{opp}})\) small |
| **Wallet / WB** | Live ledger, guest-gated | Mobile tab layout (known heavy page) | \(O(1)\) balances |
| **Studio / Yard Sale** | Escrow + portfolio | One “sell a file” happy path e2e | Per listing, not global shop crawl |
| **Hub** | Topic shelf | Don’t auto-play heavy video on 4G | Selective \(B\) |
| **Arcade / Play** | Catalog + sandbox | Keep URL allowlist; size classes | \(O(1)\) iframe |
| **ClinYard** | **Stub** | Either hide from nav or land real drills — stub will embarrass a Meharry demo | Local cards, offline |
| **Messages** | Handle DMs, guest-gated | Don’t promise iMessage; keep No-PHI | Per-thread |
| **Live** | Link-out rooms | Fine for v1; don’t fake ingest | — |
| **Myspace profile** | Themes + customize | Profile song chrome (still the cultural steal) | \(O(1)\) |
| **Ads** | None (correct) | If sponsors appear: **Connect/org cards**, never FYP rank. No \(n^2\) auction on the feed | Discrete listings |
| **BI9 / BLKSHI** | Spec + Solidity stub | Stay behind Advanced. Not a guest room | Rare map |

**ClinYard stub** is the honest weak slice for med personas. Arcade/rollback/SBF are extra rooms — strengthen **Feed + Yards + Connect + Wallet** first. That is the daily loop.

---

## 5. Mobile + ads + boots on the ground

Mobile is not a new amalgamation. It is the **same rooms at 390px**, on one yard’s worth of \(n\).

1. **Web on a phone** (Pages / Vite) — cheapest boots-on-the-ground.  
2. **Amalgamation e2e at iPhone 13 viewport** — this file.  
3. **Sideload** on your iPhone (free Personal Team) — S0 + S1 only.  
4. **Ads:** do not fund the FYP. If a campus org pays, it is a Connect/Yard card, labeled, not a rank feature.  
5. **n at a real yard:** plan \(N_u \approx 50\)–\(500\) in one town. If feed work grows with **all campuses**, you have already gone \(n^2\) socially.

Optimization that matters: **window + locality + log engagement**, not micro-benchmarks.

---

## 6. Pass / fail for “are we optimized?”

| Bar | Status |
|---|---|
| Guest can open every room without a crash | **Now tested** (amalgamation spec) |
| Phone nav: Home / Yards / Connect | **Now tested** |
| Rank is yard-local + \(O(n \log n)\) | **Now unit-tested** |
| Write path (post/customize) | Device B spec — still needs a real Device B |
| ClinYard real drills | **Fail** — stub |
| Wallet usable at 390px | **Unknown** — strengthen next |
| No ads in FYP | **Pass** (policy + tests) |
| BI9 not on guest home | **Pass** (not built) |

Skeleton is strong. Optimized means: **those bars stay green when 50 people in one yard are on phones.** Not when every tab exists.

---

*Use-case testing is how the amalgamation stops being a map and starts being a campus that doesn’t break.*
