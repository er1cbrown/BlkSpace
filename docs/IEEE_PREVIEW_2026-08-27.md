# BKSPC — IEEE Preview Briefing

**Event:** IEEE preview — 2026-08-27  
**Product (UI / installers):** **BKSPC**  
**Repository (history):** [`er1cbrown/BlkSpace`](https://github.com/er1cbrown/BlkSpace)  
**Freeze SHA:** `7df108d` (`main` as of 2026-08-26 00:54 CDT)  
**Author / operator:** Eric Brown (`er1cbrown`)  
**Eval hardware:** Device B — EVOO EVC141-12, Windows 11, **5.9 GB RAM**, AMD Ryzen 5 3500U  

This packet is for **reviewers, judges, and the operator**. It is the single detailed preview of the whole system as it actually exists at the freeze SHA. Older docs that still say “BlkSpace” in the nav or “pump.fun as primary mint” are **superseded** here.

**Related:** [`IEEE_CONFERENCE_PACK.md`](IEEE_CONFERENCE_PACK.md) · [`ieee-review-brief.md`](ieee-review-brief.md) · [`ieee-features-review.md`](ieee-features-review.md) · [`bkspc-tokenomics-policy.md`](bkspc-tokenomics-policy.md) · [`bkspc-devnet-mint.md`](bkspc-devnet-mint.md)

---

## 0. What to say in 30 seconds

Hardware-constrained HBCU students still depend on centralized social apps that can revoke accounts and extract attention. **BKSPC** is a **local-first campus social system** for **HBCU yards only**. It runs on 4–8 GB Windows laptops (Tier 0), uses **Nostr keys** for identity (recovery phrase, no password), keeps a **practice economy** in WeixBucks (earn-only, not sold for USD), and treats **on-chain BKSPC** as **optional settlement of earned value** after **Yard Cred** gates. We do **not** claim mainnet cash-out, guaranteed token price, native livestreaming, or an all-campus (SEC/NCAA) product.

**Positioning line (required if settlement is shown):**  
> Optional on-chain settlement of earned value. No guaranteed value or price. Not investment advice. Devnet only.

---

## 1. One-sentence contribution (IEEE)

BKSPC is a **hardware-aware federated campus social system** for HBCU yards that supports real student workflows with a **practice economy** and **credibility-gated optional settlement**, without requiring day-one on-chain finance.

---

## 2. Problem

| Failure of status-quo platforms | BKSPC response |
|--------------------------------|----------------|
| Account is a company row; ban = social death | User holds Nostr keys + paper recovery phrase |
| Attention extraction, opaque ranking | Local-first feed; published earn caps; MIDF throttle |
| Crypto products that lead with a token | **Cred before finance**; WB first; BKSPC optional |
| Tools assume 16 GB MacBooks | **Tier 0**: 4–8 GB Windows first; CI builds installers |
| “For everyone” campus apps that flatten HBCU space | **HBCU-only yard catalog** (DOE/NCES-aligned) |

Research framing: socio-technical systems + constrained hardware + federated identity, not “we built Instagram + a coin.”

---

## 3. Product identity (do not mix)

| Layer | Canonical string | Where it appears |
|-------|------------------|------------------|
| **Product / app / window / welcome** | **BKSPC** | Tauri title, brand mark, student docs |
| **Settlement ticker** | **BKSPC** | Same mark on-chain |
| **Coin long name** | **BKSPC Coin** | Token-2022 metadata |
| **Soft credits** | WeixBucks (**WB**) | Tips, Yard Sale, escrow |
| **GitHub / history folder** | `er1cbrown/BlkSpace` | Repo path only — not UI chrome |

**Yards:** historically Black colleges and universities **only**. SEC / NCAA / PWI rows were added then **redacted** (`67ab264`) as a values decision. Do not demo Vanderbilt, Tennessee, UT Austin, etc. Home yard default: **Tennessee State (TSU)**.

---

## 4. Who it is for

| Audience | Path |
|----------|------|
| HBCU student on an old Windows laptop | Download **Yard** MSI — no Rust, no Git |
| IEEE evaluator | This packet + Device B or web preview |
| Faculty / org lead | ProjectConnect: orgs, opportunities, Yard Cred |
| Creator (fashion, photo, mix) | Studio + Yard Sale + escrow |
| Developer | Bun workspace under `Code-Companion/` |

**Not for (yet):** Chromebook-only PWA as primary (Tier C unbuilt); iOS/Android store builds; mainnet traders.

---

## 5. Architecture (five layers)

Mapped to a Kurose/Ross-style stack. Detail: [`TOP_DOWN_APPROACH.md`](TOP_DOWN_APPROACH.md).

| Layer | Implementation at freeze |
|-------|--------------------------|
| **Application** | React + TypeScript UI; Tauri 2 IPC; Nostr events; Turso/SQLite local DB; optional Solana |
| **Transport** | HTTPS/WSS to public Nostr relays; optional Iroh blobs (Full build only) |
| **Network** | IPv4/IPv6; town/yard-scoped tags (`t:hbcu-town`) to avoid global flood |
| **Link** | Campus Wi-Fi; BLE mesh **not** a shipping claim |
| **Physical** | Tier 0 laptops (4–8 GB); Device B is the reference Windows host |

**Hybrid honesty:** decentralize identity and signed posts; keep a **local ledger** so a 6 GB laptop feels instant; put **real minting** on Solana Devnet only after eligibility.

### 5.1 Two build flavors (do not confuse)

| | **Yard** (student / IEEE demo) | **Full** (lab) |
|--|-------------------------------|----------------|
| Tauri features | `--no-default-features` (no Iroh in binary) | `iroh` default |
| Frontend | `VITE_TIER0_LITE=1` | Full mesh flags |
| Relays | Deferred, fewer | Parallel mesh |
| Artifact | `BlkSpace-Yard-Windows-x64.msi` | `BlkSpace-Full-…` |
| Claim | Social loop on Tier 0 | P2P blobs / relay node |

**Demo Yard only.** Full/Iroh is a heavier binary and is not the student story.

### 5.2 Repository layout

```
BlkSpace/                          git root (this freeze)
├── Code-Companion/                Bun workspace
│   ├── artifacts/blkspace/        React UI + src-tauri (Rust)
│   ├── artifacts/solana/          Anchor program + Token-2022 scripts
│   ├── artifacts/api-server/      Express alt path
│   └── lib/                       api-zod, db, OpenAPI
├── docs/                          architecture, IEEE, economy, security
├── rustytempleOS/                 systems lab (not the IEEE demo)
└── .github/workflows/             CI: lint, test, Yard/Full multi-OS, release
```

All student CI commands run inside `Code-Companion/`.

---

## 6. What actually works today (honest matrix)

Statuses at freeze `7df108d`. “Done” means a student can click it in the Yard/SPA path. “Partial” means UI + local logic exist; protocol or Device B proof is incomplete.

### 6.1 Core social

| Capability | Status | Notes |
|------------|--------|--------|
| Welcome wizard, recovery phrase, TSU join | **Done** | Buffer polyfill so Join works on Yard/SPA (`v0.1.1-yard`) |
| Guest browse | **Done** | Composer gated; create-account CTA |
| Home / My Yard feed, posts, likes | **Done** | Local Turso; Nostr publish best-effort |
| Yards picker | **Done** | **HBCU catalog only** (~100+ DOE/NCES rows) |
| Profile / Customize MyYard | **Partial** | Mood/banner save; photos not Device-B automated |
| Messages (handle DMs) | **Partial** | No-PHI filter; not production NIP-44 E2E |
| 24h Stories | **Partial** | Device/browser-local; **not** multi-device Nostr kind |
| Live | **Partial** | Jitsi **link-out** iframe; not native ingest |

### 6.2 Campus amalgamation (IEEE personas)

| Use | Status | Where |
|-----|--------|--------|
| ProjectConnect · orgs · opps · interest · Yard Cred | **Done** | `/connect`, `YardCredCard` |
| IEEE Student Branch · TSU seed org + eval opps | **Partial** | Demo seed; fill evidence tomorrow if time |
| Events / RSVP / tickets | **Done** (campus slice) | Not Eventbrite-complete |
| Clubs, reading circles, tournaments | **Partial** | Chess often **link-out** to Lichess |
| Studio portfolio + WB unlock | **Done** (WB) | Not Pixieset/CDN |
| Yard Sale instant + 2-party escrow | **Done** (WB) | Fast+Transparent status UX (`3c36a19`) |
| ClinYard / Focus (med study) | **Done** | Offline drills; not an EMR |
| Yard Arcade / play shell | **Partial** | Homebrew WASM demos; not Steam |
| Rollback netplay lab | **Partial** | Local trainer `/rollback`; not WAN |

### 6.3 Economy (practice layer)

Implemented in `db.rs` → `TokenomicsPolicy::published()`:

| Rule | Value |
|------|--------|
| Daily WB earn cap | 250 / rolling 24h |
| Tip fee | 2% burned |
| Marketplace fee | 5% burned |
| Settlement fee (WB → BKSPC) | 1% burned |
| WB purchasable with USD | **No** |
| Ratio | **1,000 WB → 1 BKSPC** (one-way) |
| Withdraw min | 100 WB |
| Account age | 7 days |
| Karma / posts | 10 karma, 3 posts |
| Yard Cred floor | 15 |
| Weekly convert cap | 1,000 WB |
| Cooldown | 7 days |
| MIDF earn throttle | `overall_score > 0.7` → 0 WB earn |

Wallet at freeze includes **optimistic tips**, shared **escrow status**, fee breakdown, self-custody copy, filterable history (`3c36a19`).

### 6.4 On-chain (Phase A — Devnet)

| Item | Reality at freeze |
|------|-------------------|
| Policy | Design 1 locked: earned settlement + fee-burn. **Not** a bonding-curve dump of supply. [`bkspc-tokenomics-policy.md`](bkspc-tokenomics-policy.md) |
| Token-2022 mint | **Live on Devnet** |
| Mint address | `HBcTHr2LEC7wb1Y5Sni8pgBp8ChduHuf4sk2tLgykZPx` |
| Decimals | 6 |
| Metadata | Name **BKSPC Coin**, symbol **BKSPC** |
| Supply | **0** (nothing minted to users yet) |
| **Mint authority (on-chain)** | Deployer `3M29LLWvrrQf5Lf4cRqh3Yqw5SE1H2vBKtCCGyUipe1e` |
| Convert program | Source + IDL for `initialize_convert` + `convert_wb_to_bkspc` **in git**; **not deployed** to Devnet (this laptop cannot `cargo-build-sbf` without MSVC) |
| Target PDA (not live) | `55hw5PBVtYCxqgE6rjQrPuAXLtLhpYDxYyPT26bd8gcw` |
| Explorer | [mint](https://explorer.solana.com/address/HBcTHr2LEC7wb1Y5Sni8pgBp8ChduHuf4sk2tLgykZPx?cluster=devnet) · [init tx](https://explorer.solana.com/tx/3wzCi3qMAPZF197J6T2JH3ELJwwCB5TZfiK8f4ZTPNUjEK8pHLLa2EoxZpLJYvzVUZBD9wRmgWfotCtoDrM5gmQ?cluster=devnet) |

**If asked “can I convert WB to BKSPC in the app tomorrow?”**  
Eligibility UI exists. A **successful user mint** requires the upgraded program on-chain. Do **not** say conversion is live end-to-end. Say: **mint exists; convert instruction is implemented; authority has not moved; no user supply yet.**

**If asked why Solana and HyperEVM both exist (optional Track E):**  
They are **not** two primary settlement layers. Solana Devnet = student **micro-settlement** (1,000 WB → 1 BKSPC). HyperEVM BI9 = **institutional governance** and does **not** touch WeixBucks. Omit if time-short. Paper: [`features/comparative-multi-chain-prototyping-study.md`](features/comparative-multi-chain-prototyping-study.md).

---

## 7. Device B evaluation (this laptop)

| Field | Value |
|-------|--------|
| Role | Device B — Tier 0 Windows reference |
| Hardware | EVOO EVC141-12 · 5.9 GB RAM · Ryzen 5 3500U |
| OS | Windows 11 Home 64-bit |
| Smoke (2026-08-13) | Guest → TSU join → post (0.21–0.28 s) → Customize → Live **PASS on SPA** |
| Memory at launch | ~33–47 MB working set (well under 500 MB target) |
| Native Tier 0 benchmark | **Not filled** on `/mesh-test` |
| Photo upload | **Not exercised** |
| Installed desktop vs `HEAD` | Desktop **BKSPC 0.1.1** may **lag** git (HBCU redact + wallet UX + mint docs landed after last local Yard MSI) |

**For tomorrow:** prefer **web preview** `bun run dev` at `http://localhost:24442` **or** a Yard build from current `main` if time allows. If using the already-installed desktop app, expect possible older catalog/wallet. Window title is **BKSPC** (not “BlkSpace”).

**Do not** compile Tauri Full/Iroh or Visual Studio Build Tools on this 6 GB host during the preview.

---

## 8. DevOps / CI (what reviewers can verify without Device B)

| Item | Status |
|------|--------|
| Lint / typecheck / Vitest on PR | Live |
| Yard + Full multi-OS installers | Live (`ci.yml`) |
| Playwright E2E | Live |
| Tag `v*` draft GitHub Release | Live |
| Unsigned installers if signing secrets missing | Live (`264b5e6`) |
| GitHub Pages campus web preview | Workflow ready; **repo setting may still be pending** |
| Local SBF compile on Device B | **Blocked** (needs MSVC/Windows SDK; not installed on purpose) |

Remote: `https://github.com/er1cbrown/BlkSpace`

---

## 9. Security and ethics (talking points)

- **Keys:** 12/24-word recovery; no “forgot password.” See `FIRST_RUN.md`.
- **No PHI:** ClinYard / med path is study drills, not an EMR. Copy forbids patient identifiers in DMs.
- **Institutional claims:** self-attested / domain-declared — **not** campus SSO. Do not claim registrar-verified faculty.
- **MIDF:** engagement-farm throttle on WB earn; appeal path in-app.
- **Unsigned Windows MSI:** expected for OSS without a paid cert; SmartScreen → More info → Run anyway.
- **Settlement copy:** never price, yield, or ROI.

---

## 10. Explicit non-claims (read before demo)

Do **not** say any of the following:

1. BKSPC is an investment, security, or guaranteed store of value  
2. Mainnet cash-out is live  
3. Users can convert BKSPC back to WeixBucks  
4. Team/insider allocation or presale happened (policy is **0%**)  
5. Pump.fun / bonding curve is how BKSPC is issued (Design 1: **earned WB only**)  
6. The product is for SEC/NCAA/PWI campuses  
7. Yard MSI is a full Iroh P2P node  
8. Stories sync across devices  
9. Native Twitch-class livestreaming  
10. Official university payroll / scholarship bank  
11. Visual Studio is required for students  
12. Convert-to-chain is complete because the **mint exists** (mint ≠ user conversion)

---

## 11. Demo script (10–12 minutes)

**Prep (5 min before):** Charge Device B; close Chrome/Opera tabs; desktop shortcut **BKSPC** or `bun run dev`. Have Explorer mint URL ready on a second window. Paper for recovery phrase if creating a fresh account.

| Min | Action | What to say |
|-----|--------|-------------|
| 0–1 | Show window title **BKSPC** | Product mark; repo name is historical |
| 1–2 | Welcome / guest | Works without an account |
| 2–4 | Join **TSU** (or stay on existing `@demo_user`) | HBCU yard; recovery phrase is the account |
| 4–5 | Post on Yard | Local DB first; “practice economy” |
| 5–6 | Yards list | HBCU-only; search will **not** find Vanderbilt |
| 6–7 | Connect / Yard Cred | Credibility **before** any chain story |
| 7–8 | Wallet: fees, history, escrow states | 2% / 5% / 1%; burned; Fast+Transparent UX |
| 8–9 | Explorer: Token-2022 mint | Decimals 6; supply 0; authority still deployer |
| 9–10 | Non-claims | Devnet, no price, convert not deployed |
| 10–12 | Q&A | See §13 |

**Backup if desktop is stale:** `cd Code-Companion` → `bun run dev` → `http://localhost:24442`.

**Backup if Join hangs:** confirm `public/buffer-polyfill.js` / `window.Buffer` (fixed in `v0.1.1-yard`).

---

## 12. Suggested paper / poster outline

1. **Introduction** — extractive platforms + Tier 0 hardware at HBCUs  
2. **Related work** — Nostr, federated campus nets, closed-loop game currencies, Cred systems  
3. **Architecture** — 5-layer map; Yard vs Full  
4. **Identity** — keys, recovery, no password  
5. **Practice economy** — WB, published fees, daily cap  
6. **Credibility-before-settlement** — Yard Cred gates; Design 1 Token-2022  
7. **Evaluation** — Device B smoke; honesty about remaining gates  
8. **Threats to validity** — single-campus TSU seed; local stories; synthetic MIDF; convert not on-chain  
9. **Conclusion** — ship the social loop on poor hardware first; do not lead with a token  

Draft abstract (≤150 words) remains in [`IEEE_CONFERENCE_PACK.md`](IEEE_CONFERENCE_PACK.md) §4, with **BlkSpace → BKSPC** and **no SpaceXAI-as-contribution** when you camera-ready.

---

## 13. Likely questions and short answers

**Why not just use Discord + Venmo?**  
Discord is a company account. Venmo is not a campus creator ledger with published burn fees and Cred gates. BKSPC is local-first + user keys.

**Is this a security?**  
We do not offer it as one. WB is earn-only. BKSPC on Devnet is an optional receipt of earned WB. Counsel before mainnet.

**Where is the mint authority?**  
On-chain: deployer `3M29LLW…`. Program PDA is computed but **not** authority until BPF deploy + `initialize_convert`.

**Why HBCU-only?**  
Values and product scope. The catalog is HBCU campuses, not a generic NCAA network.

**Does it work offline?**  
Read/post queue is designed; Device B full mesh M0 sheet is still blank. Do not over-claim offline sync.

**Can I install on my phone?**  
Not a store build. Desktop Yard (Windows/macOS/Linux) is the shipping path.

**How do you make money?**  
Not the IEEE claim. Fees today **burn** WB (scarcity of the practice currency), they are not a shown USD take-rate.

---

## 14. Threats to validity (put on the poster)

- Evaluation is **one Windows laptop** and mostly **SPA/Playwright** plus a native launch, not a multi-yard field study.  
- Stories and some media are **local**.  
- Connect IEEE org is **seeded demo data**.  
- Token-2022 mint is real; **user conversion is not**.  
- Catalog redact is recent; any stale MSI may still show extra schools — use `HEAD` or web preview.  
- Solo developer + AI-assisted coding; CI is the reproducibility story, not a second hardware lab.

---

## 15. File map for the USB / laptop

| If they ask… | Open |
|--------------|------|
| This briefing | `docs/IEEE_PREVIEW_2026-08-27.md` |
| Operator pack | `docs/IEEE_CONFERENCE_PACK.md` |
| Use-case log | `docs/features/use-case-capability-log.md` |
| Token policy | `docs/bkspc-tokenomics-policy.md` |
| Live mint record | `docs/bkspc-devnet-mint.md` |
| Student install | `TIER0_USER.md`, `FIRST_RUN.md` |
| Device B form | `docs/device-b-student-smoke.md` |
| Brand lock | `docs/features/brand-trademark-and-bkspc-rights.md` |
| Source of truth UI name | `Code-Companion/artifacts/blkspace/src/lib/brand.ts` |

---

## 16. Freeze checklist (print)

- [x] Freeze SHA: **`7df108d`**  
- [x] Product name in UI: **BKSPC**  
- [x] Yards: **HBCU-only**  
- [x] Token-2022 mint URL bookmarked  
- [x] Non-claims §10 reviewed  
- [ ] Tomorrow: demo machine on **current** UI (web or rebuilt Yard)  
- [ ] Optional: one persona sheet screenshot (TSU IEEE / Fisk / fashion)  
- [ ] Optional: Task Manager RSS during feed < 500 MB  

---

## 17. After IEEE (not tomorrow)

1. CI (not Device B) builds `bkspc.so` → deploy → `wire-bkspc-token2022-convert`  
2. Ticket 0.3–1.4: convert helper, UI disclaimers, one documented Devnet conversion  
3. Device B native benchmark + photo path  
4. GitHub Pages campus preview  
5. Counsel before any mainnet sentence  

---

**End of IEEE preview briefing.**  
If a slide contradicts this file, **this file wins** for 2026-08-27.
