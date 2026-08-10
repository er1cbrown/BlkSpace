# Use-case review: Young Rust hacker · TempleOS rebuild · WeixNet as Discord + GitHub · X updates

**Persona:** Undergrad / self-taught systems dev who rebuilt **TempleOS in Rust**. Wants **WeixNet / BlkSpace** as home base (Discord-style community + GitHub-style project surface) and a clean path to **post progress on X/Twitter**.

**Product claim under test:** Can a “ship weird systems software + build an audience” student live on **Yard** without needing Full/Iroh, Discord, GitHub, *and* X as three separate homes?

**Verdict:** **Partial — strong campus amalgamation; weak “GitHub for source” and “one-click X.”** High-signal creator persona; do not over-promise.

**Related:**  
[`use-case-playable-sendme-yard.md`](use-case-playable-sendme-yard.md) (Part 2 · browser playable + Sendme multi-user) ·  
[`theoretical-playable-weixnet-capability-build.md`](theoretical-playable-weixnet-capability-build.md) (theoretical build · current tech · GitHub out) ·  
[`use-case-capability-log.md`](use-case-capability-log.md) ·  
[`project-connect-credibility-layer.md`](project-connect-credibility-layer.md) ·  
[`sendme-iroh-transfer.md`](sendme-iroh-transfer.md) ·  
[`../future-social-features.md`](../future-social-features.md) ·  
[`../pitch-concerns-and-investor-use-cases.md`](../pitch-concerns-and-investor-use-cases.md)

**Last updated:** 2026-08-09

---

## 1. Jobs to be done → product map

| Job | Discord / GitHub / X today | BlkSpace surface **today** | Fit |
|-----|----------------------------|----------------------------|-----|
| Hang with peers who get the joke | Discord server | **Yard** + **Clubs** + `/messages` DMs | ✅ Partial (no native voice rooms) |
| Drop build notes / screenshots | Discord #updates + X | **Feed** composer (text/media) | ✅ Core loop |
| Show the project as a portfolio | GitHub README + releases | **Studio** collections + profile posts | ✅ Portfolio yes; **not** a git host |
| Get collaborators / recruiters | GitHub issues + LinkedIn | **Connect** orgs/opps + **Yard Cred** + Pro flags | ✅ Credibility path exists |
| Ship binaries to peers | GitHub Releases | **Yard Sale** / Studio paid-unlock / Sendme (Full) | ⚠️ Partial (WB/digital, not CI releases) |
| Live demos / streams | Discord stage + Twitch | **Link-out** only (Twitch/YT/Discord) | ❌ Native live not in product |
| Tell the world on X | Twitter/X | Manual copy/paste (or external tools) | ❌ No X API / cross-post |

**Honest one-liner for the student:**

> **BlkSpace is your yard + portfolio + soft economy. Keep GitHub for source/releases and X for broadcast — until we ship share/bridge.**

---

## 2. Why this persona matters (for the product)

He is not “scroll campus drama.” He is:

- **Tier 0-capable creator** (Rust on a laptop — cares about lean builds; Yard matches that)
- **Cultural outlier content** (TempleOS lineage = cult-nerd energy that belongs on an amalgamation hub, not only LinkedIn)
- **Proof that BlkSpace is more than fashion/events** — systems engineering sits next to IEEE Branch and Studio
- **Bridge to open source** without becoming GitHub

### IEEE-style honesty

| Claim | OK? |
|-------|-----|
| Campus social home + portfolio + soft WB | ✅ |
| Discord-class community for a project club | ✅ Partial |
| GitHub replacement (repos, PRs, CI, releases) | ❌ Out of scope |
| Auto-post every commit to X | ❌ Not in product |
| Mainnet cash for “rebuilding TempleOS” | ❌ Finance after Cred |

---

## 3. Happy path he can run this week (student “what’s next”)

Assume **Yard** installer from [Releases](https://github.com/er1cbrown/BlkSpace/releases) — not Full, not a local Rust build of BlkSpace.

1. **Install Yard** → welcome → home yard (campus or general) → write recovery phrase  
2. **Profile** — handle + bio: *“TempleOS in Rust · systems · open demos”*  
3. **Studio** — collection *TempleOS-RS* (screenshots, boot clips under size caps, design notes PDF if allowed)  
4. **Feed** — short update loop: *what shipped / what broke / screenshot* (earn WB, build karma)  
5. **Club or Connect org** — e.g. “Systems / Retro OS lab” or piggyback **IEEE Student Branch** if EE-adjacent — post collab opp *“Test boot on 4 GB laptop”*  
6. **Yard Cred** — complete opps, get endorsements (on-platform analogue of GitHub stars)  
7. **X** — manual: screenshot Studio/feed + link to public web preview / profile when Pages is live  

**Do not:** make him clone BlkSpace, run `tauri build`, or chase BKSPC. He is a *user* of WeixNet unless he opts into core contribution.

### Ideal weekly rhythm

| Day | BlkSpace | X (manual) | GitHub (keep) |
|-----|----------|------------|---------------|
| Ship night | Feed post + Studio asset | “Boot to shell in N ms” + screenshot | Tag `v0.x` release |
| Collab | Connect interest / club | Quote yard peers if any | Issues for real bugs |
| Demo | Event + Twitch/YT **link-out** | “Live tonight” | Release notes |

---

## 4. Gaps (score like capability log)

| # | Need | Status | Notes |
|---|------|--------|-------|
| A | Discord-like hang | **Partial** | Yards, clubs, DMs; no voice rooms / native live |
| B | GitHub-like *presence* | **Partial** | Studio + profile + Cred; **no git, PRs, CI** |
| C | GitHub-like *binary distribution* | **Partial** | Yard Sale / Studio unlock / Sendme Full — not Releases |
| D | Twitter-like *short-form broadcast* | **Partial** | Feed is the in-yard microblog; **no X API** |
| E | One composer → many surfaces (“Bridge”) | **Not in product** | Pitch doc mentions Bridge; treat as roadmap, not shipped |
| F | Soft economy for OSS demos | **Partial** | Tips / WB for posts & sales; no “star bounty” product |
| G | Large ISO / disk images | **Risk** | Tier 0 media caps — Full/Iroh or external host for huge artifacts |

**Overall status:** **Partial** — same band as “Live as social basic,” not “Done” like Billy Studio or fashion escrow.

---

## 5. What’s next

### A. For the student (next 7 days)

1. Install **Yard** only; guest → real handle  
2. One Studio collection + three feed updates  
3. One club or Connect opp so peers can “star” via interest/complete  
4. X thread: *why TempleOS in Rust* + BlkSpace as the **campus home**, GitHub as **source of truth**  
5. Optional: Device B smoke if he has a 4–8 GB box — OS rebuild + BlkSpace on the same machine is a dual demo  

### B. For the product (ship order if this persona should stick)

| Priority | Build | Why |
|----------|-------|-----|
| **P0** | **Share card** — copy link / image of post or Studio item (clipboard + optional “Open in browser”) | Unblocks X without API keys |
| **P1** | **Dev / systems club kit** (like Chess / Study kits) — “Retro OS / Systems lab” | Makes Discord-home feel intentional |
| **P1** | **Portfolio → Connect** handoff (“Open to collab” on Studio projects) | GitHub-profile-ish without git |
| **P2** | **External links on profile** (GitHub, X, website) | He keeps GitHub/X; BlkSpace becomes hub |
| **P2** | **“Release note” post type** (changelog + asset) | Mimics GH Releases socially |
| **P3** | Optional **X cross-post** (user OAuth, opt-in) | Real Bridge; do not force for Tier 0 |
| **Never claim** | BlkSpace replaces GitHub source control or X global reach | Scope honesty |

Roadmap alignment: **finish Phase 3 product gaps** + **credibility before finance** — not Phase 4 mainnet.

---

## 6. Pitch lines

- **To the student:** *“Yard is your clubhouse. Studio is your show floor. GitHub stays the forge. X is the loudspeaker — we’ll make share one-tap.”*  
- **To IEEE / investors:** *“Systems creators need social + portfolio + soft rewards on 4–8 GB machines. We don’t replace git; we own the campus surface they lose between Discord and LinkedIn.”*

---

## 7. Capability-log row

| # | Persona / use case | Status | What works | Still missing |
|---|-------------------|--------|------------|---------------|
| 15 | Young Rust OS hacker · TempleOS rebuild · Discord+GitHub home · X updates | **Partial** | Yard feed, Studio portfolio, clubs/DMs, Connect Cred, WB earn, live **link-out** | Native voice/live; git host/PRs; GitHub Releases analogue; X API / Bridge composer; huge artifact path on Yard |

---

## 8. Bottom line

He can **start now** on Yard for community + portfolio + soft economy, keep **GitHub for code** and **X for reach**, and treat BlkSpace as the missing middle. **What’s next for product** is not coin — it’s **share links, profile external URLs, and a systems-lab club kit** so this persona doesn’t bounce back to Discord-only.

**Part 2 (playable browser drops + Sendme multi-user Slack-range):** see [`use-case-playable-sendme-yard.md`](use-case-playable-sendme-yard.md).
