# IEEE-style use-case review: Fisk finance major (brokerage-curious)

**Persona:** Fisk University undergrad · **Finance major** · loves markets, stocks, brokerage careers, financial literacy  
**Goals:** Learn how brokerages work, practice money skills, find finance clubs/internships/research, talk markets with peers — **without** treating BlkSpace as a real brokerage or crypto exchange  
**Product claim under test:** BlkSpace supports **finance education + professional opportunity matching** via soft credits, Yard Cred, and Markets 101 — settlement (BKSPC) stays gated and non-advisory  

**Related:** [`four-pillar-economy.md`](four-pillar-economy.md) · [`wb-progression-v2.md`](wb-progression-v2.md) · [`use-case-omega-psi-phi-meharry-ieee.md`](use-case-omega-psi-phi-meharry-ieee.md) · wallet **Learn markets** tab

---

## 1. Goals → product surface map

| Finance-major goal | Best surface **today** | Must **not** be |
|--------------------|------------------------|-----------------|
| Learn stocks / NASDAQ / crypto **concepts** | Wallet → **Learn markets** · Markets 101 cards | Live order tickets, portfolio of real assets |
| Practice budgeting / fees / caps | **Practice credits (WeixBucks)** earn + shop + tip fees | “Guaranteed returns” |
| Finance **club / org** peers | **Connect** org (professional / peer) · feed Fellowship rail filter **Finance** | Pump group chat only |
| Internships / research / case comps | Connect **opportunities** | Unregistered securities offers |
| Brokerage **career** curiosity | Literacy + pro profile + opp “mock desk / mentor” | Fake “open a Robinhood account here” |
| Credibility for future settlement | **Yard Cred** from real completions | Buying Cred with WB |

**IEEE honesty line:**  
*Educational + campus professional network* ✅  
*In-app brokerage / investment solicitation* ❌  

---

## 2. Pre-test setup

| Item | Action |
|------|--------|
| Home yard | **Fisk** (`fisk`) |
| Build | Yard or `bun run dev` |
| Handle | `________________` |
| Device / RAM | ______ |
| Clock | Start ______ End ______ |
| Reviewer | ______ |

---

## 3. Use-case script (score P / W / F)

### UC-FI-01 · Join Fisk yard (place)

| Step | Action | Expected | Score | Notes |
|------|--------|----------|-------|-------|
| 1 | Welcome / settings → home yard **Fisk** | Yard label Fisk / Fisk Yard | | |
| 2 | Home feed loads | Posts or empty state without crash | | |

---

### UC-FI-02 · Discover finance on the feed (not only /wallet)

| Step | Action | Expected | Score | Notes |
|------|--------|----------|-------|-------|
| 1 | Home → **Fellowship · orgs & opportunities** rail | Rail visible under people strip | | |
| 2 | Filter **Finance** | Finance club + market literacy opps prefer Fisk | | |
| 3 | Open an opp card | `/connect/opportunities/:id` | | |
| 4 | Open org card | `/connect/orgs/:id` e.g. Fisk Investment / Finance Club | | |

**Pass bar:** Finance path is discoverable from **Home**, not hidden in wallet only.

---

### UC-FI-03 · Markets 101 literacy (brokerage education)

| Step | Action | Expected | Score | Notes |
|------|--------|----------|-------|-------|
| 1 | Open **Wallet / Earnings** | Four pillars (practice / reliability / learn / settlement) | | |
| 2 | Tab **Learn markets** | Markets 101: brokerage, stocks, crypto risk, “we are not a brokerage” | | |
| 3 | Read “What a brokerage does” | Mentions KYC/AML, orders, licensed firms — **no** trade button | | |
| 4 | Confirm no NASDAQ order entry | No buy/sell stock UI | | |

**Pass bar:** User can **learn** brokerage role without being able to **trade** securities in-app.

---

### UC-FI-04 · Practice credits as “finance gym”

| Step | Action | Expected | Score | Notes |
|------|--------|----------|-------|-------|
| 1 | Note **tier / daily cap** on wallet progression card | Newcomer/Contributor caps clear | | |
| 2 | Earn WB (post or Connect interest) | Soft credit increases; toast optional | | |
| 3 | See fee language on Send | Platform fee % published | | |
| 4 | Attempt settlement dialog (do not complete if ineligible) | Gated language; Cred requirements listed | | |

**Pass bar:** Soft money feels like **practice**, not a stock portfolio.

---

### UC-FI-05 · Finance club org + peer fellowship

| Step | Action | Expected | Score | Notes |
|------|--------|----------|-------|-------|
| 1 | Create or open **Fisk Investment / Finance Club** org | Org page exists | | |
| 2 | Type **professional** or **peer** | Clear campus purpose | | |
| 3 | Second student (or second browser) finds org via Connect / rail | Discoverable | | |

---

### UC-FI-06 · Internship / case / research opportunities

| Step | Action | Expected | Score | Notes |
|------|--------|----------|-------|-------|
| 1 | Open demo opp e.g. equity research micro-lab or mock trading **simulation discussion** (not real money) | Description is educational / campus | | |
| 2 | Express interest | Skills: Excel, accounting, markets | | |
| 3 | Lead inbox sees applicant + Yard Cred | Structured apply | | |
| 4 | Complete + endorse (if lead) | Cred/completions move | | |

**Pass bar:** Career/research path uses **Connect**, not fake portfolio PnL.

---

### UC-FI-07 · Ethical red lines (must pass)

| Check | Expected | Score |
|-------|----------|-------|
| No “buy TSLA here” | True | |
| No guaranteed returns language on settlement | True | |
| Scholarship/intern opps don’t require buying WB/BKSPC | True | |
| Crypto discussed only as **risk education** | True | |

Any **F** here → overall **Fail** for legitimacy review.

---

## 4. IEEE evaluation sheet

### Claim

> A Fisk finance major can discover finance orgs and opportunities from the Home feed, complete Markets 101 literacy, practice soft-credit economics, and apply to campus finance pathways—without BlkSpace operating as a brokerage or investment platform.

### Results

| UC | P/W/F | Minutes | Notes |
|----|-------|---------|-------|
| FI-01 Yard | | | |
| FI-02 Feed Finance rail | | | |
| FI-03 Markets 101 | | | |
| FI-04 Practice credits | | | |
| FI-05 Finance org | | | |
| FI-06 Opportunities | | | |
| FI-07 Red lines | | | |

**Overall:** ☐ Pass · ☐ Partial · ☐ Fail  

### Gaps backlog

| Gap | H/M/L | Fix idea |
|-----|-------|----------|
| | | |

---

## 5. Seed copy (if creating live content)

**Org:** `Fisk Investment & Finance Club`  
**Bio:** Markets literacy, case comps, brokerage career prep. Soft credits on the yard — real brokerage accounts stay off-platform.

**Opps:**  
1. *Mock equity research note (demo)* — write a 1-pager on a public company; peer review. Educational only.  
2. *Brokerage career panel interest* — alumni/mentor AMAs; no securities sold.  
3. *Personal finance clinic volunteer* — teach budgeting with WB metaphors; service + Cred.

---

## 6. Relationship to four pillars

| Pillar | Fisk finance major experience |
|--------|-------------------------------|
| Practice credits | Earn/spend WB; feel fees & caps |
| Reliability | Cred from finishing opps / club work |
| Learn markets | Brokerage & risk education |
| Settlement | Optional later; never the first promise |
