# Referee report — BKSPC / BlkSpace (IEEE-style)

**Review type:** Full referee report against official IEEE forms (not a code review)  
**Date:** 2026-08-27  
**Work reviewed:** Operator pack + running Yard lite SPA + Device B evidence  
**HEAD:** `5e17d84` (`main`)  
**Pack freeze SHA:** `7df108d` (2026-08-26) — **these are not the same artifact**  
**Reviewer role:** Independent technical referee using published IEEE instruments  
**Recommended venues:** IEEE Student Paper Contest (Region) **or** systems/WIP track. Not FIE full paper. Not a finance journal.

**Recommendation:** **Weak accept with major revisions** as a student / demo paper. **Weak reject** as a research full paper. **Reject** if presented as on-chain finance (BI9, BLKSHI, HyperEVM, mainnet).

---

## 1. Summary for the editor

This is a **working campus social application** for HBCU yards on 4–8 GB Windows, with cryptographic identity, a closed-loop practice currency, and a credibility layer before settlement. The engineering is real. The **scientific manuscript is not yet written**, and the **evaluation is not yet a study**.

The contribution that could survive peer review is: *a hardware-aware federated campus social system that separates practice credits from on-chain assets and refuses to lead with a token.* The contribution that will not survive is: *an amalgamation of Instagram/TikTok/Discord plus a Hyperliquid desk.*

Device B student smoke (guest → TSU join → post → Customize → Live) is now **scripted and passing** on a Yard lite SPA (Playwright 2/2, post submit ~0.17 s, 2026-08-27). That is a validation **protocol**, not a user study. n = 1 machine, SPA ≠ native MSI for the HEAD customize/Live path, no scored persona sheets, no native Tier 0 process-clock table.

I recommend the authors (1) freeze one SHA for the talk, (2) pick **one** settlement sentence, (3) fill at least one persona sheet with screenshots, (4) keep HyperEVM off the podium.

---

## 2. What was actually reviewed

| Artifact | Role | Used? |
|----------|------|--------|
| `docs/IEEE_PREVIEW_2026-08-27.md` | Operator briefing | Yes — primary “paper” stand-in |
| `docs/IEEE_CONFERENCE_PACK.md` | Tracks A–D + abstract | Yes |
| `docs/ieee-review-brief.md` | Older one-pager | Yes — **stale vs pack** |
| `docs/ieee-features-review.md` | Feature matrix | Yes — dated 2026-08-03 |
| `docs/device-b-student-smoke.md` | Eval sheet | Yes — updated 2026-08-27 |
| `docs/YARD_RELEASE_CHECKLIST.md` | Part A | Yes — A1–A3b closed; A4 open |
| Persona sheets (Fisk / ΩΨΦ / Jimmy) | Evaluation scripts | Yes — **unscored** |
| `docs/amalgamation-honest-competitive-review.md` | Product honesty | Yes — stronger than the brief |
| `docs/tokenomics.md` + `finance-l1-strategy.md` | Canonical chain (BI9) | Yes — **conflicts with freeze briefing** |
| `e2e/device-b.browser.spec.ts` | Reproducible smoke | Yes — 2/2 on Yard lite SPA |
| Live HyperEVM deploy | On-chain evidence | **No** — not broadcast; cap 0 |
| Camera-ready IEEE PDF | Manuscript | **None** |

There is **no IEEE-formatted paper** in the tree. This report treats the 2026-08-27 briefing + conference pack as the manuscript.

---

## 3. IEEE conference paper review form

Instrument: [IEEE CEE Conference Paper Review Form](https://events.ieee.org/wp-content/uploads/paper-review-form.pdf) (double-blind template; 5 = excellent, 1 = poor).

| # | Criterion | Score | Detailed justification |
|---|-----------|-------|------------------------|
| 1 | Relevance to the conference | **4** | Socio-technical systems, constrained hardware, campus networks, and federated identity are in-scope for IEEE student / systems venues. Relevance **collapses** if the talk is Hyperliquid, Kalshi-inspired desks, or a ticker. HBCU-only yards are a legitimate scoping choice (`67ab264`), not a defect. |
| 2 | Contribution to academic debate | **3** | Two ideas are discussable: (a) **Yard vs Full** as an honest split of decentralization claims; (b) **Cred before finance** as product protocol against campus-token scams. Neither is situated in a related-work section that a referee can check (Nostr, community networks, community informatics, TAM/WOSP, closed-loop game currencies). Without that, the “contribution” is an engineering composition. |
| 3 | Structure of the paper | **3** | Pack outline (§12 of the preview briefing) is a standard IEEE paper skeleton. Failures: freeze SHA ≠ HEAD; `ieee-review-brief.md` still advertises pump.fun, 2 GB RAM, BLE mesh, and “decentralized social network that settles on a federated mesh” — that document would be desk-rejected against the pack’s own non-claims. |
| 4 | Standard of English | **4** | Operator copy is readable and mostly non-hype when the non-claims list is followed. In-app chrome still says BKSPC for settlement while `tokenomics.md` says BI9 is canonical. That is not an English problem; it is a consistency problem that reads as English-level confusion in a review. |
| 5 | Appropriateness of research / study method | **2** | There is a **protocol** (`device-b-student-smoke.md`, Playwright spec). There is not a **method**: no research question operationalized, no sampling, no independent observers, no native vs SPA factor, no pre-registration of metrics. Post 0.17 s is wall-clock from composer fill to DOM text — not mesh RTT, not p95, not cold vs warm. RAM 33 MB is a 2026-08-13 native launch spot-check, not a feed-scroll 30-minute sample. IEEE reviewers treat this as a **demo script**, which is acceptable for a student contest and insufficient for a full paper. |
| 6 | Drawings, graphs, tables | **3** | Capability matrices and Device B tables are the right genre. Missing for a conference: screenshots tied to steps, CI run IDs at freeze, a figure of Yard vs Full, a filled persona score table. Architecture “5-layer” map is claimed; it is not in the briefing as a numbered figure a referee can score. |
| 7 | Abstract as a description of the paper | **3** | Pack abstract (≤150 words) matches the *intended* paper. It promises “we evaluate student workflows with multi-persona scripts.” Those scripts exist; **scores are blank**. An abstract that claims evaluation the results section does not contain is a classic IEEE reject reason (Author Center: “overly preliminary”). |
| 8 | Keywords / key phrases | **3** | Suggested: `federated social networks`, `campus networks`, `constrained hardware`, `HBCU`, `practice economy`, `credibility`. Avoid: `HyperEVM`, `BLKSHI`, `pump.fun`, `Instagram killer`. |
| 9 | Discussion and conclusions | **2** | Pack lists threats (single-campus seed, local stories, synthetic MIDF, convert not on-chain) but does not **discuss** them with data. Conclusion in operator docs is “ready for campus demo.” That is a product conclusion, not a research conclusion. |
| 10 | Reference list | **2** | No IEEE-style bibliography in the pack. `ieee-review-brief.md` points at pump.fun launch notes. A systems paper needs: Nostr; Iroh or content-addressed storage; community networks (e.g. IEEE WiMob 2013 questionnaire on community nets); TAM (Davis); WOSP (IEEE TSMC-A 2008); community informatics evaluation (O’Neil 2002); Kurose/Ross if that mapping is kept. |

**Conference decision:** Accept **with major revisions** as student paper / WIP. Do not accept as full paper.

---

## 4. IEEE Student Paper Contest — item comments

Instruments: [IEEE Region 6 SPC guidelines](https://ewh.ieee.org/r6/montana/R6SPCGuidelines.pdf); [SoutheastCon 2015 student paper](https://ewh.ieee.org/reg/3/southeastcon2015/documents/2015%20Student%20Paper%20Competition.pdf). Scale 1–10; contest guidance is that a **solid paper is ~6**, 8–9 is superior, 10 is rare.

Written = 55% (Form 35% + Subject 20%). Oral = 45% (not observed).

### 4.1 Form (35%)

| Item | Score | Comment |
|------|-------|---------|
| Concise, informative abstract | **6** | Pack abstract is the right length and claim. It overstates evaluation (personas not run). |
| Adequacy of introduction | **7** | Problem table (revoke accounts, extractive ranking, token-first crypto social, 16 GB Mac assumption, flattening of HBCU space) is the strongest page in the pack. |
| Logical development and analytical treatment | **5** | Architecture is listed, not derived. No comparison experiment (Yard vs Full on the same Device B). No ablation (guest vs account, SPA vs MSI). |
| Adequacy of conclusion | **4** | Delivers “we built a campus app that runs.” Does not deliver on “we evaluated three personas.” |
| Compliance with contest format | **4** | No IEEE paper PDF, no 100-word contest abstract as a separate artifact, dual product names. |
| Clarity and direction | **7** | When the speaker stays on the 30-second line, direction is clear. |
| Grammar, spelling, style | **7** | Fine. |

**Form subtotal (unweighted mean ≈ 5.7).** Communication is contest-ready; the “paper” object is not.

### 4.2 Subject matter (20%)

| Item | Score | Comment |
|------|-------|---------|
| Originality of ideas / procedures / results **due to this author** | **6** | Original *treatment*: HBCU-only catalog, Yard vs Full binaries, guest-before-wallet, Device B as a first-class eval host, Cred gates before mint. Not original *inventions*: Nostr, Tauri, SQLite, Jitsi iframe, Token-2022. Contest rules allow non-original content if treatment is original — this fits, if the talk admits composition. |
| Originality of analysis / restatement of others’ work | **4** | Little engagement with federated social literature or community-network questionnaires. |
| Quality and level of technical **or social** content | **6** | Social content (Cred, fees, HBCU place) is the right level for a student paper. Technical depth of the mesh is Yard-honest (deferred relays) — good if said; fatal if “federated mesh” is the title. |
| Factual and technical accuracy | **4** | See §6 (accuracy findings). This is the score that will move the oral Q&A. |

**Subject subtotal (unweighted mean ≈ 5.0).**

### 4.3 Oral (45%) — predicted, not observed

Judges will ask: Discord vs this; is Live native; can I convert WB; is the mint the product; why TSU only; is 0.17 s networking. The preview briefing §13 is the correct Q&A set. If HyperEVM is opened, oral score will fall on “technical accuracy” and “level of content” (spec vs system).

---

## 5. IEEE Author Center — section-by-section (treating the pack as the article)

Instrument: [IEEE Author Center, Evaluating an Article](https://journals.ieeeauthorcenter.ieee.org/submit-your-article-for-peer-review/become-an-ieee-reviewer/).

### Abstract
Clear problem. Claim of evaluation is **not self-contained and accurate** (personas promised, not reported). ≤250 words is fine. **Revise** to: one Device B host, SPA Playwright, native bench not filled.

### Introduction
Context and novelty of *scoping* (HBCU + Tier 0) are clear. Research question is implicit. Make it explicit, e.g.:

> Can a federated campus social client support guest browse, yard-scoped posting, profile customization, and a practice economy on a 4–8 GB Windows laptop without requiring on-chain settlement?

That question is **answerable with the data you already have**. The amalgamation-of-media question is not.

### Methodology
Not replicable as science. Replicable as engineering smoke: `e2e/device-b.browser.spec.ts` against `bun run build:tier0` SPA on port 24442. State: browser, OS, RAM, commit, that native `/mesh-test` was **not** run. Independent lab could reproduce the SPA path; they could not reproduce “4 GB student MSI from HEAD” without a new installer.

### Results
Reportable results today:

- Playwright Device B: 2/2 pass (2026-08-27), guest 1.1 s, join+customize+live 4.0 s wall, `DEVICE_B_POST_MS=165–178`.
- Native launch RAM ~33–35 MB (2026-08-13), under 500 MB target.
- Photos: not exercised.
- A4 process clocks: empty.
- Persona P/W/F: empty.
- WB convert: eligibility UI; Token-2022 mint on Devnet; **user supply 0**; convert program **not deployed**.

Do not mix 2026-08-13 native RAM with 2026-08-27 SPA post times as one “Device B result.” They are different artifacts.

### Discussion
Should answer the research question and say what 0.17 s is **not**. Should contrast Yard (no Iroh) with Full. Should state empty-graph threat: seed orgs ≠ network effects.

### Conclusion
Must not introduce BI9, BLKSHI, or mobile. Must not claim amalgamation of TikTok-class media (`amalgamation-honest-competitive-review.md` already grades that **C− / F vs incumbents**).

### References
Inadequate. Also **internal contradiction**: briefing §6.4 is Solana Design 1; `docs/tokenomics.md` (2026-08-26) says HyperEVM BI9 is canonical and 1000 WB → 1 BKSPC is **not** the BI9 path. A referee who reads both will mark accuracy down.

---

## 6. Accuracy findings (factual)

These are the items I would list as **major comments to authors**.

1. **Two settlement ontologies.** Freeze briefing: BKSPC Token-2022, 1000 WB → 1 BKSPC, earned settlement. Canonical `tokenomics.md`: BI9 ERC-20 on HyperEVM 999, **no automatic WB conversion**, mint cap 0, not deployed. Wallet UI still has both a BKSPC panel and a HyperEVM panel. For IEEE, pick the briefing’s Devnet honesty **or** say “on-chain home redesigned, nothing in production.” Do not say both.

2. **Mint ≠ conversion.** Briefing already forbids this. Still a live risk in Q&A if Explorer is shown.

3. **ieee-review-brief.md is unsafe to hand out.** It still lists pump.fun as Phase 4, 2 GB RAM target, BLE mesh, Iroh as core contribution. The pack’s non-claims explicitly contradict it. Remove or stamp SUPERSEDED before the review.

4. **Live is link-out.** Jitsi iframe. Correct in the smoke sheet; easy to overclaim in a demo.

5. **Stories are local.** Pack is honest. Do not show Stories as federation.

6. **Faculty / institution is self-attested.** Do not claim registrar SSO.

7. **Unsigned MSI / SmartScreen.** Fine for OSS; say it.

8. **HEAD vs freeze.** Customize pimp/tape and Device B 2026-08-27 run are **after** `7df108d`. Either re-freeze or say “evaluation SHA `5e17d84`.”

---

## 7. FIE research rubric (if someone files this as education research)

Instrument: [IEEE Frontiers in Education](https://fie-conference.org/full-wip-guidelines) Discovery/Research (3 = excellent … 1 = missing).

| Criterion | Score | Note |
|-----------|-------|------|
| Research questions | **1** | Not stated as RQs; implied product goals |
| Theoretical framework | **1** | Kurose/Ross mapping is a teaching analogy, not a theory of campus networks |
| Methods match goals | **1** | Smoke test ≠ education-research method |
| Results answer RQs | **1** | No RQs, so cannot |
| Relevance to FIE | **2** | Tier 0 HBCU computing access could be FIE **if** rewritten as computing-education |
| Advance body of knowledge | **1** | Not yet |

**FIE decision:** Reject as Full Research. Possible **Work-in-Progress** only after RQs and a method (even a think-aloud n=6 on Device B).

---

## 8. Socio-technical *system* evaluation (not a paper form)

If the question is “how would IEEE literature evaluate the **app** as socio-technical software?”:

| Instrument | Fit | Today |
|------------|-----|-------|
| TAM (usefulness, ease of use) | High for students | **Not administered** |
| WOSP 8 criteria ([IEEE TSMC-A 2008](https://ieeexplore.ieee.org/document/4544888)) | Better than TAM for this stack | **Not administered** |
| SUS (10 items) | Fast poster metric | **Not administered** |
| Community informatics (democracy, social capital, empowerment, sense of community, economic opportunity) | Matches HBCU-yard claim | **Not measured** — Connect/Cred are product features, not survey constructs |

Without one of these, “students can use it” is an operator assertion. Device B Playwright shows **the operator’s script can drive the SPA**, which is necessary and not sufficient.

---

## 9. Threats to validity (referee-written)

| Threat | Severity | Effect |
|--------|----------|--------|
| Single host (5.9 GB, one Windows 11 EVOO) | High | Cannot generalize to 4 GB or to Mac/Linux labs |
| SPA vs native | High | 2026-08-27 customize/Live/pimp are SPA; installed BKSPC 0.1.1 may lag HEAD |
| Empty social graph | High | Seed content and IEEE demo org ≠ adoption |
| Author as tester | Medium | Playwright is unbiased mechanically; protocol choice is not |
| Metric construct | Medium | Post DOM time ≠ quality, safety, or mesh |
| Settlement construct | High | Two token stories; neither is a user-completed on-chain path |
| Amalgamation construct | High | Own honest review grades media amalgamation poorly; campus amalgamation better |

These belong in the paper’s Threats section **as written**, not as a footnote.

---

## 10. Required revisions (numbered)

**R1.** Freeze one SHA on the first slide and in the abstract.  
**R2.** Delete or stamp SUPERSEDED on `ieee-review-brief.md` (pump.fun / BLE / 2 GB).  
**R3.** One settlement paragraph. Recommended for today: *Devnet BKSPC mint exists; no user supply; convert not deployed; BI9/HyperEVM is a design decision with mint off; WeixBucks do not convert automatically.*  
**R4.** Rewrite abstract evaluation sentence to match Device B SPA + empty persona table.  
**R5.** Fill **one** persona sheet (Fisk **or** Jimmy TSU) with P/W/F and screenshots.  
**R6.** Separate native RAM (2026-08-13) from SPA post-ms (2026-08-27).  
**R7.** Add 8–12 real references.  
**R8.** Keep BLKSHI/BlkBridge off slides.  
**R9.** State Live = Jitsi link-out; Stories = local 24h.  
**R10.** Optional: run A4 `run_tier0_benchmark` on the installed Yard **or** explicitly list it as missing in Threats.

---

## 11. Questions for the authors (to appear in the review)

1. Which SHA is under review, `7df108d` or `5e17d84`?  
2. Is the canonical on-chain asset BKSPC-on-Solana or BI9-on-HyperEVM in the **talk**?  
3. What is the operational research question, in one sentence?  
4. Why is SPA Playwright an acceptable proxy for a 4 GB student MSI from HEAD?  
5. How should a referee interpret 0.17 s (which subsystem)?  
6. Will persona sheets be scored before camera-ready, or removed from the abstract?  
7. What related work distinguishes this from Discord + a spreadsheet of WeixBucks?  
8. If Iroh is not in the Yard binary, why is “federated mesh” in the title line of the old brief?

---

## 12. Points for (keep these)

- Guest-before-account is the correct onboarding for this hardware class.  
- HBCU-only yards after redacting SEC/NCAA is a values decision a referee can respect.  
- Published WB fees/caps (2% / 5% / 250 day) are more honest than an opaque creator fund.  
- Yard vs Full is an unusual and **good** systems claim.  
- Non-claims list in the 2026-08-27 briefing is what a careful author writes.  
- Device B is treated as first-class evaluation hardware, not an afterthought.  
- Connect + Yard Cred exist as product, not only as a slide.  
- Playwright spec makes the student path **auditable**.

---

## 13. Overall ratings

| Instrument | Verdict |
|------------|---------|
| IEEE conference form (mean of 10) | **~2.9 / 5** — major revisions |
| Student contest written (approx.) | **~5.4 / 10** — contest-typical if the PDF is written |
| FIE full research | **Reject** / WIP only |
| Journal (Author Center) | **Reject** — overly preliminary |
| **Today’s live demo** | **Proceed** on student path only |

**Confidential comment to chair:** This is a real piece of student systems work with unusual honesty in the 8/27 briefing and an unusual amount of self-refuting older docs still in the repo. The risk is not that the app is fake. The risk is that the authors will demo the finance hub or the amalgamation slogan and spend Q&A on claims their own `amalgamation-honest-competitive-review.md` already retracts.

---

*Referee instruments cited: IEEE CEE conference review form; IEEE Author Center reviewer guidelines; IEEE Region 6 / SoutheastCon student paper contest rubrics; IEEE FIE research rubric; IEEE TSMC-A 2008 WOSP vs TAM.*
