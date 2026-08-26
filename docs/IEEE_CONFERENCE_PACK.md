# IEEE Conference Pack — BlkSpace (all tracks)

**Purpose:** Single operator pack to compete on a **systems / socio-technical** IEEE-style submission without marketing inflation.  
**Freeze baseline (code):** `7df108d` on `main` (2026-08-26).  
**Operator briefing for 2026-08-27:** [`IEEE_PREVIEW_2026-08-27.md`](IEEE_PREVIEW_2026-08-27.md)  
**Date:** 2026-08-26 (preview event 2026-08-27)  

**Related:** [`ieee-review-brief.md`](ieee-review-brief.md) · [`ieee-features-review.md`](ieee-features-review.md) · [`YARD_RELEASE_CHECKLIST.md`](YARD_RELEASE_CHECKLIST.md) · use-case sheets under [`features/`](features/)

---

## 0. One-sentence contribution

BlkSpace is a **hardware-aware federated campus social system** for HBCU yards that supports real student workflows with a **practice economy** and **credibility-gated optional settlement**, without requiring day-one on-chain finance.

---

## 1. Track A — Device B / Yard smoke (validation)

**Why it wins IEEE:** Filled evaluation sheets beat architecture slides.

| Gate | Doc | Owner run | Pass |
|------|-----|-----------|------|
| Part A student smoke (4–8 GB Windows) | [`YARD_RELEASE_CHECKLIST.md`](YARD_RELEASE_CHECKLIST.md) · [`device-b-student-smoke.md`](device-b-student-smoke.md) | Human on Device B | ☐ |
| Tier 0 benchmark numbers | Sync Test → Performance | Device B | ☐ |
| CI green on `main` | GitHub Actions | CI | ☐ |
| Installer downloadable | Releases / Actions Yard MSI | Operator | ☐ |

**Cannot automate here:** Physical Windows Device B. This pack documents the protocol; checkbox fill is the result.

**Operator steps (short):**

1. Download `BlkSpace-Yard-Windows-x64.msi` (not Full/Iroh).  
2. Guest browse → TSU account → post → Customize → Live (if build ≥ `267cf41`).  
3. Run Tier 0 benchmark; record feed / post / blob times + RAM spot-check.  
4. Attach screenshots + table to camera-ready appendix.

---

## 2. Track B — Phase 3 product gaps (this pack)

| Gap | Status after pack | Where |
|-----|-------------------|--------|
| **Stories** | **Shipped (dual-mode 24h local)** — Create → Story; Home ring + viewer; no WB farm | `lib/yard-stories.ts`, `StoryStrip`, `create.tsx` |
| **Marketplace** | Already dual-mode with demo listings + escrow UI | `marketplace-escrow.ts`, Wallet Yard Sale |
| **MyYard music** | **Web path added** (browser data URL); desktop still blob hashes | `profile-music-web.ts`, CustomizeStation, profile |

**Honesty:** Stories are **device/browser-local** (Tier 0 safe), not yet a Nostr kind. Do not claim multi-device story sync until a protocol kind + tests exist.

---

## 3. Track C — Credibility (ProjectConnect)

| Piece | Status |
|-------|--------|
| Orgs / opps / interest / complete / endorse | Shipped (C0 + C1.x) |
| Yard Cred on profile | Shipped (`YardCredCard`) |
| **IEEE Student Branch · TSU** demo org + 3 evaluation opps | **Added** (web demo seed + Connect browse) |

**Rule:** No mainnet BKSPC cash-out narrative until Cred answers *who / what completed / who vouches*.

**Connect seed opportunities for evaluators:**

1. Device B Tier 0 smoke crew  
2. Federated campus mesh · abstract dry-run  
3. Persona use-case runner (Fisk / Meharry / Fashion)

---

## 4. Track D — Conference artifacts

### Draft abstract (≤150 words)

Hardware-constrained students at HBCUs still depend on centralized social platforms that revoke accounts and extract attention. We present **BlkSpace**, a hybrid **local-first campus social system** combining cryptographic identity, yard-scoped federation (Nostr events; optional content-addressed media), and a **four-pillar practice economy**: soft credits (WeixBucks), non-purchasable **Yard Cred**, markets literacy, and **optional** on-chain settlement only after credibility gates. We evaluate student workflows with multi-persona scripts (finance literacy, NPHC fellowship, campus creator commerce) and a **Tier 0** install path for 4–8 GB devices. Results emphasize **honesty of decentralization claims** (Yard vs Full builds) and **Cred-before-finance** as an anti-scam product protocol. Optional AI assistance, if used, remains server-side and non-mandatory (SpaceXAI / xAI API); it is not the core contribution.

### Explicit non-claims

- Not a brokerage or investment platform  
- Not mainnet-ready cash-out without counsel + Device B gates  
- Yard install is not full P2P mesh  
- Stories (this pack) are not yet multi-device protocol  
- No guaranteed token returns  

### Persona result shells (fill after run)

| Persona | Sheet | P/W/F overall | Notes / screenshots |
|---------|-------|---------------|---------------------|
| Fisk finance | [`features/use-case-fisk-finance-ieee.md`](features/use-case-fisk-finance-ieee.md) | ☐ | |
| ΩΨΦ Meharry | [`features/use-case-omega-psi-phi-meharry-ieee.md`](features/use-case-omega-psi-phi-meharry-ieee.md) | ☐ | |
| Jimmy TSU fashion | [`features/use-case-jimmy-tsu-fashion-ieee.md`](features/use-case-jimmy-tsu-fashion-ieee.md) | ☐ | |

### SpaceXAI role (optional, not the paper)

| Use | Env | Model |
|-----|-----|-------|
| Research co-pilot (abstract overclaim check, related work drafts) | `XAI_API_KEY` server/research only | `grok-4.5` |
| Product AI | **Out of scope for this freeze** unless measured server-side assist | — |

Base URL: `https://api.x.ai/v1` — never ship keys in the Tauri/Vite bundle.

---

## 5. Suggested paper outline

1. Introduction — campus extractive platforms + hardware reality  
2. Related work — federated social, Nostr, campus nets, soft currencies  
3. Architecture — 5-layer map; Yard vs Full  
4. Credibility-before-settlement protocol  
5. Evaluation — Device B + three personas + Tier 0 metrics  
6. Threats to validity — single-campus demos, local stories, synthetic MIDF  
7. Conclusion  

---

## 6. Definition of done for “IEEE ready”

- [ ] Freeze SHA recorded above  
- [ ] Device B Part A filled **or** explicit “lab Mac only” limitation in threats  
- [ ] ≥1 persona sheet fully scored with screenshots  
- [ ] Non-claims section matches product UI copy  
- [ ] CI green; no mainnet cash-out claims in abstract  

---

*This pack implements the “all tracks” execution plan: validation protocol + product gaps + credibility seeds + conference freeze artifacts.*
