# Use-case review · Part 2  
**Playable web artifact (Rust / Flash-class) on WeixNet · Sendme-style multi-user · short + long form in one space**

**Persona continuity:** Same young systems creator as [`use-case-rust-templeos-hacker.md`](use-case-rust-templeos-hacker.md) (TempleOS-in-Rust energy).

**This slice is not “replace GitHub.”** It is: *publish something peers can open in a browser, share as a ticket, hang in a Slack-sized room about it, and still post short + long social around it — all under BlkSpace / WeixNet.*

**Verdict:** **In-scope as vision · Partial as product · Not out of scope.**  
GitHub stays out. What *is* in scope is a **yard-ranged playable drop** (Newgrounds + Slack + Sendme DNA), not a global source forge.

**Related:**  
[`use-case-rust-templeos-hacker.md`](use-case-rust-templeos-hacker.md) ·  
[`use-case-capability-log.md`](use-case-capability-log.md) ·  
[`theoretical-playable-weixnet-capability-build.md`](theoretical-playable-weixnet-capability-build.md) (current-tech theoretical build · SpaceXAI optional) ·  
[`sendme-iroh-transfer.md`](sendme-iroh-transfer.md) ·  
[`decentralized-media.md`](decentralized-media.md) ·  
[`../future-social-features.md`](../future-social-features.md) ·  
[`../implementation/IROH_INTEGRATION.md`](../implementation/IROH_INTEGRATION.md)

**Last updated:** 2026-08-09

---

## 1. Three layers (what you’re actually describing)

```
┌─────────────────────────────────────────────────────────────┐
│ SHORT FORM social     Feed · updates · X-style micro posts  │  ← shipped (Yard)
│ LONG FORM social      Studio · essays · demos · Hub topics  │  ← partial
│ PLAYABLE / transfer   Browser play + Sendme-class tickets   │  ← theoretical+thin
└──────────────────────────┬──────────────────────────────────┘
                           │ hosted as
                    WeixNet services on BlkSpace
              (Nostr events + blob tickets + yard scope)
```

| Layer | Analogue | BlkSpace / WeixNet today | Part 2 intent |
|-------|----------|---------------------------|---------------|
| Short form | X / IG story | Feed composer, Local / Following | “Shipped a boot fix” posts |
| Long form | YouTube / blog / portfolio | Studio, Hub, media upload | Writeups, demo videos, essays |
| Playable drop | **Newgrounds + Flash** | **Not a first-class player** | Rust/WASM (or Flash-class) **in browser** |
| Share / fetch | **Sendme / airdrop** | `blkspace1.` tickets + optional sendme CLI | Peers pull the playable blob |
| Collab room | **Slack**, not GitHub | Yards, clubs, DMs | N users in a **ranged** channel |
| Source control | GitHub | **Out of scope** (correct) | Keep external |

Student-creator push is already the product north star (`THEORY`, `future-social-features`, capability log). This Part 2 is the **systems / playable** expression of the same amalgamation — not a second product.

---

## 2. “Adobe Flash (Rust clone) in the browser on WeixNet”

Two honest variants (both valid; do not merge them in promo):

| Variant | What it is | Fit on WeixNet | Status |
|---------|------------|----------------|--------|
| **A. Playable WASM / canvas game or demo** | Student ships `.wasm` + HTML shell; BlkSpace/web loads it from a blob/CID | Strong Newgrounds energy; Tier 0–friendly if small | **Not in product** as a first-class “Play” surface |
| **B. Flash emulator in browser (Ruffle-class)** | Play legacy SWF via WASM player hosted by BlkSpace web | Cool for culture/history clubs; heavy/legal/content risk | **Later / careful** — not student MVP |
| **C. Full OS rebuild in browser** | TempleOS-class in WASM | Possible as *his* project; BlkSpace only **hosts ticket + social** | **His app, your rail** |

**Product claim that stays true:**

> WeixNet does not *be* the Flash runtime or the git forge.  
> WeixNet **hosts the blob, announces it with Nostr, scopes it to a yard/club (Slack-range), and wraps social short + long around it.**

Web preview (Pages / Vite) is the right *surface* for “open in browser.” Full desktop + Iroh is the right *rail* for fat artifacts. Yard stays lean (no Iroh default) — so **playables for N students on 4 GB should be small packages or progressive download**, not multi‑GB ISOs on every open.

---

## 3. Sendme wrapper · theoretical but real pattern

The **pattern** exists; the full multi-user “service host” does not.

| Piece | Today | Multi-user (N) gap |
|-------|--------|---------------------|
| `blkspace1.` signed tickets | Share / receive in app | 1:1 / small peer; no “room of N all online on one ticket service” |
| Local blob store | Materialize if you have the bytes | Miss → “keep sender online / mesh / CLI” |
| Optional `sendme` CLI | True hole-punch P2P | Operator path; not student default |
| Live iroh **provider** loop | Roadmap (`iroh-net`) | Needed for “service stays up for N” without CLI |

See [`sendme-iroh-transfer.md`](sendme-iroh-transfer.md) for ticket format, Tauri commands, and UI (`SendmeSharePanel`).

### Slack-ranged multi-user (correct scale)

```
N ≈ club / class / lab  (≈ 5–50)
not
N ≈ GitHub public (unbounded)
```

| Scale | Model | Matches intent? |
|-------|--------|-----------------|
| **N_slack** | Yard/club channel + one pin node (creator or yard lab) serving ticket | ✅ Yes |
| **N_github** | Global clone / issues / PR graph | ❌ Out of scope |
| **N_cdn** | Always-on global media CDN | ❌ Out of scope for Yard; Full/lab later |

### Could it operate for multiple users N?

**Yes, in theory, if “operate” means:**

1. Creator publishes **playable ticket** (blob + Nostr event: title, yard, club, kind=`playable`/`demo`)  
2. **One pin** stays up (creator Full node, campus lab, or temporary session)  
3. N peers in the same **yard/club** open web play shell → fetch blob by ticket/CID  
4. Chat / feed / long posts stay on Nostr around that object  

**Not yet**, if “operate” means always-on multi-tenant WeixNet game servers with matchmaking. That is a different product (game backend), not a Sendme wrapper.

### Honest formula

```
WeixNet playable service (theoretical)
  = Sendme-class ticket
  + yard-scoped announce (Nostr)
  + optional pin reward (WB)
  + browser shell (web preview)
  + short feed + long Studio
  − git / PR / issues
  − global CDN guarantee
```

---

## 4. Short form + long form in one space

Many apps *concept* amalgamation. BlkSpace’s edge is **student creators on WeixNet**, hardware-aware:

| Form | Job for this dev | Surface | Status |
|------|------------------|---------|--------|
| **Short** | “Boot fixed; screenshot” | Feed / Local | ✅ |
| **Long** | Design notes, essay, demo reel | Studio / Hub | ✅ / partial |
| **Play** | “Open this in browser and try it” | *Missing first-class* | ⬜ theoretical |
| **Room** | N peers debriefing the build | Club / yard / DMs | ✅ Partial (no voice) |
| **Transfer** | Get the package to peers | Sendme-class tickets | ✅ Thin / Full-heavy |

### Amalgamation rule (keep promo honest)

| Do claim | Don’t claim |
|----------|-------------|
| One app for campus **create · show · talk · drop files** | Replace Flash, Steam, GitHub, Slack, X |
| Slack-range collab on a playable | Infinite global multiplayer OS hosting |
| Short + long social **around** student work | Native live stream / voice as core |
| Student creators first (inspired the stack) | Token-first or enterprise-first |

**Filter for every new surface:** if a 4–8 GB laptop student creator cannot use it, it is Full-lab or later — not Yard default.

---

## 5. Capability scorecard (Part 2 only)

| # | Capability | Status | Note |
|---|------------|--------|------|
| 1 | Short-form yard social | **Done** | Feed loop |
| 2 | Long-form portfolio / notes | **Partial** | Studio + posts; weak “release notes” type |
| 3 | Browser-open playable (WASM/demo) | **Not in product** | Web can host static; no product “Play” kind |
| 4 | Flash-class emulator host | **Out of core / later** | Culture nice-to-have; not MVP |
| 5 | Sendme-style ticket drop | **Partial** | `blkspace1.` + CLI; no always-on provider |
| 6 | Multi-user N (Slack range) on one drop | **Theoretical** | Needs pin + club announce + web shell |
| 7 | Multi-user N (GitHub scale) | **Out of scope** | Correct exclusion |
| 8 | WeixNet “service” = social + blob rail | **Partial** | Events + tickets; not game servers |
| 9 | Student-creator north star | **Done (strategy)** | Docs + Yard SKU |

---

## 6. Architecture sketch (keeps Tier 0)

```
[Creator Full or lab pin]          [N peers · Yard or web]
        │                                    │
   pack playable (wasm/html/zip)        open link / ticket
        │                                    │
   Iroh/local blob ── ticket ──► receive / progressive fetch
        │                                    │
   Nostr: kind playable + yard + club   feed short “try this”
        │                                    │
   Studio long: notes / video           club channel debrief
```

| Build | Role |
|-------|------|
| **Yard** (default student) | Announce + short/long social + small ticket; pin optional / deferred |
| **Full / lab** | Pin serve for N during club night |
| **Never** | Force every student to run Full to *watch* a small WASM demo — only the pin node needs weight |

---

## 7. What’s next (ordered, student-creator filter)

| P | Ship | Why |
|---|------|-----|
| **P0** | Content kind **`playable` / `demo`**: ticket or URL + title + yard + size | Makes the story real without Flash |
| **P0** | **Share card** (post + Studio + ticket → copy for X/Slack-out) | Short form leaves the app |
| **P1** | Web **Play shell** (iframe/sandbox for static HTML+WASM from blob or Pages) | “Flash-class *feel*” without claiming Flash |
| **P1** | Club kit **Systems / Retro / Playables** | Slack-range home for N |
| **P2** | Ticket → **club channel auto-post** (“new drop”) | Multi-user discover without GitHub |
| **P2** | Pin session UI (“I’m hosting for 2h — N can pull”) | Theoretical Sendme wrapper → usable |
| **P3** | Live iroh provider (`iroh-net`) when Windows/Yard budget allows | True multi-peer without CLI |
| **Out** | Git forge, PR, global game servers, mandatory Flash emulator | Scope guard |

---

## 8. Straight answers

| Question | Answer |
|----------|--------|
| **Is this out of scope?** | No — **minus GitHub**, this is amalgamation: Newgrounds play + Slack room + Sendme drop + short/long social, student-first. |
| **Could it operate for multiple users N?** | **Yes at Slack range (club/class)** with one pin + tickets + yard announce. **No at GitHub scale** (and you shouldn’t try). |
| **Is the Sendme wrapper only theoretical?** | **Half.** Ticket UX exists; **multi-user always-on WeixNet service + browser Play** is the theoretical half — correct roadmap seam. |
| **Short + long in one space?** | Already the strategy. Part 2 adds the third: **playable**. Feed for short, Studio for long, Play/ticket for the artifact. |
| **Why student creators?** | They’re the reason WeixNet is hardware-aware and yard-scoped. This persona proves BlkSpace isn’t only fashion/events — it’s where **student-built software gets a campus stage**. |

---

## 9. Narrative lock

> **GitHub is the forge. X is the megaphone. BlkSpace is the yard: short posts, long portfolios, and Slack-sized rooms where N peers open a WeixNet ticket and *play* what a student made.**

---

## 10. Capability-log row

| # | Persona / use case | Status | What works | Still missing |
|---|-------------------|--------|------------|---------------|
| 15b | Rust systems creator · browser-playable on WeixNet · Sendme multi-user (Slack-N) · short+long social | **Partial / theoretical** | Feed short, Studio long, clubs/DMs, `blkspace1.` tickets, web preview surface | Playable content kind + browser shell, always-on pin for N, club-scoped ticket rooms, small-artifact budget for Yard |
