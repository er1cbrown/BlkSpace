# WeixBucks progression v2 (fair earn)

**Status:** Implemented in `db.rs` (`grant_weix_bucks` + XP tables) · UI on wallet  
**Goal:** Fair on-ramps, anti-farm diminishing returns, multi-path XP (create · care · campus · connect · market)

---

## Numbers users see

| Concept | Spendable? | Role |
|---------|------------|------|
| **WB** | Yes (in-app) | Practice credits |
| **Contribution XP** | Never | Lifetime progress → tier |
| **Tier** | Never | Daily cap + CreatorSpace unlocks (UX) |
| **Yard Cred** | Never | Reliability (Connect); settlement gate |

---

## Tiers

| Tier | XP range | Daily WB cap |
|------|----------|--------------|
| Newcomer | 0–99 | 200 |
| Contributor | 100–399 | 250 |
| Creator | 400–1199 | 300 |
| Steward | 1200+ | 350 |

Legacy default cap of 250 remains the **Contributor** band.

---

## Diminishing returns (per category / UTC day)

\[
\text{adjusted} = \left\lceil \text{base} \times \frac{1}{1 + 0.15 \cdot n} \right\rceil
\]

where \(n\) = prior earns in that category today (before this grant).

Categories (from earn description keywords):

| Category | Keywords (examples) | XP weight per nominal WB |
|----------|---------------------|---------------------------|
| `connect` | connect, interest, endorsement, opportunity, completion | 1.5 |
| `create` | post, upload, media, mix, wall | 1.0 |
| `care` | reply, like, discussion | 1.0 |
| `campus` | yard, rsvp, event, join | 1.2 |
| `market` | sale, listing, marketplace, studio, tip received | 1.1 |
| `other` | fallback | 0.8 |

**Newcomer boost (account age ≤ 14 days):** ×1.25 on `create` and `connect` only (before daily cap).

---

## Daily cap

Applied **after** diminishing returns and boost, using the user’s **tier cap**.

---

## Design principles

1. First posts pay well; the 20th identical action barely pays.  
2. Connect completions remain high-value (XP weight + category).  
3. MIDF throttle still zeros WB when overall score &gt; 0.7.  
4. Transparent: wallet shows tier, XP, and cap.  
5. Not investment: progression never mints BKSPC.

---

## Code map

| Piece | Location |
|-------|----------|
| Cap / dim / XP | `Database::grant_weix_bucks` |
| Schema | `users.contribution_xp`, `earn_category_day` |
| Summary IPC | `get_earn_summary` → `contributionXp`, `tier`, `tierLabel`, `dailyCapWb` |
| Spec | this file |
