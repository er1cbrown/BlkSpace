# MVP Timeline & Ethical On-Chain Roadmap

**Created:** 2026-06-19  
**Source:** Planning notes from contributor session (timeline evaluation + tokenomics / on-chain wallet path)  
**Related:** [`phase-0-status.md`](phase-0-status.md) · [`reward-formulas.md`](reward-formulas.md) · [`solana-blueprint.md`](solana-blueprint.md) · [`solana-security.md`](solana-security.md) · [`blkspace-ui-system-plan.md`](../blkspace-ui-system-plan.md)

> **Disclaimer:** Tokenomics and regulatory notes below are engineering/product planning only — not legal advice. Engage securities/crypto counsel before mainnet or public token marketing.

---

## Context

Two planning threads were captured here:

1. **How long to finish the build aligned with project goals?**
2. **How to fix P8 (wallet provider), keep Phase 3 before Phase 4, and move toward an on-chain wallet with ethical, abuse-resistant tokenomics?**

---

## Part 1 — Timeline to Finish (Goal-Aligned)

### What “finish” means per project goals

**MVP cutoff = end of Phase 3** (`docs/plan.md`, `FLESHTHEORY.md`):

> Working clients + live hub-connected rewards economy (earn from uploads + engagement, spend, transparent history) on the WeixNet foundation — **simulated WeixBucks**, not on-chain BlkCoin yet.

“Finish the build” in goal terms = **MVP pilot-ready**, not Phase 4/5.

### Current progress vs MVP

| Phase | Weight toward MVP | Status | Remaining |
|-------|-------------------|--------|-----------|
| 0 — Theory / CI | Done | ✅ 100% | — |
| 1 — Auth, feed, economy, security | Done | ✅ 100% | — |
| 2 — Iroh, Nostr mesh, offline | ~35% of remaining work | 🟡 ~90% | Device B manual (M0) |
| 3 — Communities, rewards, themes | ~65% of remaining work | 🟡 ~55% | Events, roles, earn polish, cross-town |

**Rough overall: ~72–75% to MVP.** Backend/automation is ahead of manual proof and community UI polish.

### Time to MVP (solo dev, realistic)

| Work block | Focused days | What it closes |
|------------|--------------|----------------|
| Device B manual matrix (M0) | 2–3 | Phase 2 → 100%, Tier 0 claim |
| Pilot release + smoke fixes | 1 | Installable `.msi` for HBCU test |
| Quick bugs (wallet provider, stale toasts) | 0.5 | No crashes on pilot |
| Community events UI | 2–3 | Phase 3 yard completeness |
| Role management UI | 1–2 | Phase 3 admin flows |
| Earn path audit | 1 | Full rewards loop per MVP definition |
| Cross-town polish | 1–2 | Bridge tab usable |
| Pilot feedback + fixes | 3–5 | Real user breakage |
| Doc/status sync | 0.5 | Honest ship checklist |

**Total: ~12–18 focused dev days** (~2.5–4 calendar weeks full-time).

### Calendar by pace

| Pace | Hours/week | Time to MVP | Target (from 2026-06-19) |
|------|------------|-------------|--------------------------|
| Full-time sprint | 35–40 hrs | **3–4 weeks** | Mid–late July 2026 |
| Serious part-time | 15–20 hrs | **6–8 weeks** | Early Aug – mid Sep 2026 |
| Side project | 5–10 hrs | **12–16 weeks** | Sep – Oct 2026 |

**Best estimate:** **4–6 weeks** at ~20 hrs/week, or **3 weeks** full-time with Device B available soon.

### Critical path

```
Device B M0 manual → Tagged pilot build → Phase 3 UI gaps → 1-yard pilot → MVP sign-off
```

1. **Device B** — without it, Phase 2 never officially closes; Tier 0 stays theoretical.
2. **Events + roles + earn** — without them, Phase 3 stays ~55%; yards feel stubbed.
3. **One real pilot** (e.g. TSU yard, 5–10 users) — MVP isn’t done until someone besides the dev runs it on target hardware.

### Beyond MVP (full vision — not required for MVP goal)

| Milestone | Extra time (solo, after MVP) | Cumulative from Jun 2026 |
|-----------|------------------------------|--------------------------|
| Phase 4 — BlkCoin, NFT shop, on-chain wallet | +6–10 weeks | ~3–4 months |
| Phase 5 — LogosDecks, scripture NLP, release ops | +8–12 weeks | ~5–7 months |
| Full amalgamation vision | +6+ months | **9–12+ months** |

### Priority list (condensed)

**Tier 0 — Do first**

| # | Task | Effort |
|---|------|--------|
| P1 | Device B manual matrix (`DEVICE_MESH_TESTING.md`) | 2–3 days |
| P2 | Tagged pilot build (`v0.x` → `release.yml`) | 0.5 day |
| P3 | Update `phase-0-status.md` after P1 | 30 min |

**Tier 1 — MVP gaps**

| # | Task | Effort |
|---|------|--------|
| P4 | Community events UI | 2–3 days |
| P5 | Community role management UI | 1–2 days |
| P6 | Earn path audit | 1 day |
| P7 | Cross-town polish | 1–2 days |

**Tier 2 — Fix before users hit them**

| # | Task | Effort | Status |
|---|------|--------|--------|
| P8 | Wire `WalletContextProvider` in `wallet.tsx` | 1–2 hrs | ✅ Done 2026-06-19 |
| P9 | Remove stale “Phase 2” toasts in `community.tsx` | 30 min | Open |
| P10 | Story / create honesty | 1 hr | Open |
| P11 | `/architecture` API fallback | 2–4 hrs | Open |

**Defer until MVP ships:** Phase 4 BlkCoin depth, NFT marketplace, M2 LAN / BLE mesh, LogosDecks, heritage hub.

### Recommended tracks

- **Track A — “Prove it” (recommended):** P1 → P2 → P3 → P8 → P9 (~3–4 days)
- **Track B — “Ship MVP UI”:** P4 → P5 → P6 → P7 → P8 (~1–2 weeks; risk: unvalidated hardware)
- **Track C — “Pilot in 2 weeks”:** Week 1 = P1+P2+P8+P9; Week 2 = P4+P5+P6

---

## Part 2 — Ethical Tokenomics & On-Chain Wallet Path

### Decision: finish Phase 3 before Phase 4

- **Do:** P8 wallet provider early (foundation for later Solana connect).
- **Don’t:** Launch or market BlkCoin / mainnet before Phase 3 MVP + legal review.

### Architecture already favors ethical design

| Layer | What it is | Regulatory posture (draft) |
|-------|------------|----------------------------|
| **WeixBucks (WB)** | Off-chain utility points — earn from creation, spend in-app | Closer to platform credits than a security |
| **Karma** | Reputation only — never bought, never sold | Not a currency |
| **BlkCoin** | On-chain SPL — premium **settlement**, not daily earn | Highest risk if marketed as investment |

**Rule:** WB is the economy. BlkCoin is **optional withdrawal of earned value**, not a hyped memecoin launch.

Aligns with `docs/solana-blueprint.md` — **lazy settlement (pull-based)**:

```
Earn WB off-chain (free, capped, audited)
  → user opts in (connect Phantom)
  → backend validates eligibility
  → treasury mints BLKCOIN (capped, logged)
```

### Why typical memecoins get into legal / ethical trouble

| Bad pattern | Risk |
|-------------|------|
| “Buy early, moon soon” | Investment contract (Howey test) |
| Large insider allocation | Rug / unfair launch |
| Unlimited mint | Inflation abuse |
| Promised cashout / ROI | Securities marketing |
| Mint-only, no sinks | Farm-and-dump |
| WB purchasable with real money | Money transmission / MSB issues |

**Fix:** Treat BlkCoin as **settlement rail for verified platform earnings**, not a speculative asset.

### Abuse prevention

**Already implemented**

- 250 WB/day cap (`db.rs`)
- MIDF throttle (score > 0.7 → 0 reward)
- Karma ≠ WB (karma never spendable)
- Signed Nostr events + SQLite audit trail
- Self-reply / self-like blocks
- Node per-serve caps

**Add before real on-chain (Phase 4 gate)**

| Control | Purpose |
|---------|---------|
| No WB purchase | Earn-only until counsel approves otherwise |
| Withdrawal eligibility | Min account age, min karma, min real posts |
| Conversion ratio + cap | e.g. 1000 WB → 1 BLK, max 1 BLK/week per pubkey |
| Cooldown | e.g. 7 days between withdrawals |
| Treasury mint authority | Multisig + timelock (`solana-security.md`) |
| Vesting | Large BlkCoin grants vest on-chain (e.g. 30 days) |
| Fixed supply | Hard cap; revoke mint authority after distribution phase |
| Burn sinks | Marketplace fees, boosts; on-chain burns for premium items |
| Published math | `reward-formulas.md` + in-app “how earn works” |
| Disclaimers | Utility credits, not investment; Devnet only until counsel approves |

**User-facing framing**

> WeixBucks = credits for creating and participating on the yard.  
> BlkCoin = optional on-chain receipt of **earned** value — not an investment product.

### Proposed tokenomics policy (ethical default)

```
WEIXBUCKS (off-chain)
├── Earn: creation, engagement, node work (capped 250/day)
├── Spend: tips, boosts, themes, marketplace (sinks)
├── Never: purchasable, transferable off-platform, promised USD value
└── Audit: signed Nostr events + SQLite

BLKCOIN (on-chain, Phase 4+)
├── Mint: ONLY via treasury after WB withdrawal + eligibility check
├── Ratio: fixed (e.g. 1000 WB = 1 BLK) — published, not pump-driven
├── Cap: max withdrawal per user per week
├── Supply: hard cap; mint authority revoked at cap
├── Sinks: NFT tickets, premium themes, burn on settlement
└── No: presale, insider airdrop, “investment” marketing

KARMA — off-chain forever (ranking only)
```

### Phased path to on-chain wallet

```
Phase 3 MVP (simulated WB + P8 provider ✅)
    ↓
Phase 4a — Connect only (~1 week)
    Phantom connect, devnet pubkey + ATA read-only
    ↓
Phase 4b — Devnet settlement (2–3 weeks)
    Anchor mint_rewards on devnet
    Tauri withdraw_to_solana: validate WB debit + eligibility in Rust
    ↓
Phase 4c — Legal gate
    Tokenomics doc + counsel review, ToS, disclaimers
    Mainnet only after sign-off
```

| Step | Work | Time | Blocker |
|------|------|------|---------|
| 0 | Finish Phase 3 (events, roles, earn, Device B) | 3–4 weeks | MVP |
| 1 | P8 wallet provider | ✅ 2026-06-19 | — |
| 2 | Wallet UI: Connect Phantom + show pubkey (devnet) | 2–3 days | — |
| 3 | Tokenomics in `reward-formulas.md` + wallet disclaimer | 1 day | — |
| 4 | Deploy Anchor `blkcoin` to devnet only | ~1 week | Rust/Anchor |
| 5 | Wire `withdraw_to_solana`: WB validate → CPI mint | 1–2 weeks | Eligibility in Rust |
| 6 | Legal review | 2–4 weeks external | Counsel |
| 7 | Mainnet | After step 6 | — |

**Do not mainnet or publicly “launch BlkCoin” before step 6.**

### On-chain timeline (from Jun 2026)

| Milestone | Calendar |
|-----------|----------|
| Phase 3 MVP complete | ~4–6 weeks (part-time) |
| Devnet wallet connect (read-only) | +1 week after MVP |
| Devnet WB→BLK withdrawal (full bridge) | +2–3 weeks after that |
| Mainnet-ready (legal + tokenomics signed off) | +1–2 months after devnet works |

**Devnet on-chain wallet:** ~**8–10 weeks** from 2026-06-19 if Phase 3 finishes on schedule.  
**Mainnet with defensible tokenomics:** add legal review (often 4–8 weeks).

### Implementation note — P8 (2026-06-19)

`WalletContextProvider` was wired in `Code-Companion/artifacts/blkspace/src/pages/wallet.tsx`:

- `WalletPageContent` — page logic
- `WalletPage` (default export) — wraps content in `WalletContextProvider`

`useWallet()` in withdraw/send flows now has a valid provider ancestor. Solana tab no longer crashes from missing context; full mint/withdraw still requires Phase 4b backend + devnet program.

### Next engineering actions (this thread)

1. Finish Phase 3 UI gaps (events, roles, earn audit).
2. Add wallet disclaimer + “How earn works” in-app copy.
3. Implement withdraw **eligibility** in Rust (before devnet mint).
4. Phantom connect button on wallet (read-only devnet).
5. Extend `reward-formulas.md` with BlkCoin conversion rules for counsel.

---

## Summary

| Question | Answer |
|----------|--------|
| How long to MVP? | **3–4 weeks** full-time · **4–6 weeks** at ~20 hrs/week |
| What blocks MVP most? | Device B manual matrix + Phase 3 community UI |
| How to do on-chain ethically? | WB = earn-only utility; BlkCoin = gated treasury mint, not memecoin hype |
| What was fixed immediately? | **P8** — `WalletContextProvider` mounted on wallet page |
| When mainnet? | After Phase 3 MVP + devnet bridge + **legal review** |

---

## Maintenance

When progress moves:

1. Update P8–P11 status in this doc or mark items done in `phase-0-status.md`.
2. Sync phase % with `docs/phase-0-status.md`.
3. Add BlkCoin conversion numbers to `reward-formulas.md` when approved (not before counsel).