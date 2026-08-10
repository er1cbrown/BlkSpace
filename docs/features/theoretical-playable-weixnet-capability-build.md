# Theoretical build · Capability 15 / 15b · Current tech (vision kept, GitHub out)

**Purpose:** Review use-case capability rows **15** and **15b**, map a **theoretical** product path that preserves the student-creator vision **without** GitHub-as-forge, and conclude from **current external technology** (not only in-repo research).

**Status:** Theoretical design + **T1 implementation landed** (2026-08) — share card, profile external links, Hub `playable` + `/play` shell, systems club kit, no client AI.  
**Last updated:** 2026-08-09  
**AI policy:** No client AI required. Tier 0 / Yard runs without any model API.

### T1 shipped (code)

| Item | Location |
|------|----------|
| Share card | `src/lib/share-card.ts`, `ShareCardButton` on feed/post/hub/play |
| Profile external links | Settings + MyYard (web patch); forge is link-out only |
| Hub `systems` + kind `playable` | `content-hub.ts` + hub UI |
| Play shell | `/play?url=` sandboxed iframe — `pages/play.tsx` |
| Systems club kit | `club-activities.ts` template `systems` |
| Client AI | **Not in product** — Tier 0 runs without models |

**Not in T1:** live iroh provider for N, git forge, client API keys.

**Related sheets**

| Doc | Role |
|-----|------|
| [`use-case-rust-templeos-hacker.md`](use-case-rust-templeos-hacker.md) | Row **15** · Discord + portfolio + X |
| [`use-case-playable-sendme-yard.md`](use-case-playable-sendme-yard.md) | Row **15b** · browser play + Sendme Slack-N |
| [`use-case-capability-log.md`](use-case-capability-log.md) | Living matrix |
| [`sendme-iroh-transfer.md`](sendme-iroh-transfer.md) | Shipped ticket pattern |
| [`../IEEE_CONFERENCE_PACK.md`](../IEEE_CONFERENCE_PACK.md) | SpaceXAI = optional, server-side |

---

## 1. Capability review (what we claim today)

| Row | Persona | Log status | Shipped core | Vision gap |
|-----|---------|------------|--------------|------------|
| **15** | Young Rust OS hacker · yard as Discord/GitHub-home · X updates | **Partial** | Feed, Studio, clubs/DMs, Connect Cred, WB, live **link-out** | Share card, profile external links, systems club kit, optional X bridge |
| **15b** | Browser-playable on WeixNet · Sendme multi-user (Slack-N) · short+long | **Partial / theoretical** | `blkspace1.` tickets, optional sendme CLI, web preview surface | Playable kind, browser Play shell, pin-for-N session, club auto-announce |

### Explicit exclusions (do not build)

| Out of scope | Why |
|--------------|-----|
| **GitHub replacement** (repos, PRs, issues, CI, Releases host) | Forge stays external; BlkSpace is campus stage + social + drop |
| Global CDN / Netflix-class media | Capability log rows 12 / 14 |
| Native live ingest / voice rooms | Rows 6d / 11 |
| Mandatory AI in client | IEEE honesty; Tier 0 offline / no-key students |
| Mainnet BKSPC for “demo drops” | Cred-before-finance |

### Vision lock (keep)

```
Short form  →  yard feed (X-class micro updates)
Long form   →  Studio / Hub (portfolio, essays, demo reels)
Playable    →  browser shell + content-addressed ticket (Newgrounds-class)
Room        →  club / yard (Slack-range N ≈ 5–50)
Transfer    →  WeixNet Sendme-pattern (iroh-class blob tickets)
Identity    →  Nostr handle + Yard Cred
Economy     →  soft WB optional; no coin required to play
```

**One-line narrative (unchanged):**  
*GitHub is the forge. X is the megaphone. BlkSpace is the yard where N peers open a WeixNet ticket and play what a student made.*

---

## 2. Outside research · current tech (2025–2026)

Research used to ground “is this fantasy or buildable?” — not to adopt every feature.

### 2.1 Iroh / Sendme · multi-receiver drops

| Finding | Implication for 15b |
|---------|---------------------|
| [n0-computer/sendme](https://github.com/n0-computer/sendme) is the reference app: iroh + iroh-blobs, ticket, NAT hole-punch, relay fallback | Product pattern is **real and production-proven as a pattern**, not a paper |
| Public reports (e.g. HN / user notes on sendme): **one sender → many receivers**, resumable, folder support | **Slack-N multi-user pull while pin is up** is current tech, not theoretical networking |
| Iroh 1.0 roadmap / ecosystem: many sendme clones; tickets still need live endpoint info (IP/relay can move) | “Always-on global pin” is hard; **time-boxed host session** matches campus club nights |
| BlkSpace today: `blkspace1.` tickets + store-only Iroh; **no** in-process provider on Yard | Gap is **product + feature-flag Full**, not inventing a new P2P stack |

**Conclusion:** Multi-user N at Slack range is **buildable with current Iroh/sendme-class tech** once a pin node serves blobs. Yard can stay ticket + announce only; Full/lab hosts.

### 2.2 Browser playables · WASM (Flash-class *feel*, not Flash product)

| Finding | Implication |
|---------|-------------|
| WASM is production-ready in major browsers (2025–2026 surveys; Unity/Godot/WebGL stacks ship games in-tab) | **Playable demos in browser** = current mainstream web, not research |
| Sandbox model (iframe / CSP / no native plugins) replaces old Adobe Flash plugin model | Prefer **student-shipped HTML+WASM zip** over hosting a full Flash emulator (Ruffle-class) in MVP |
| Large AAA ports need bandwidth/RAM | **Tier 0 budget:** small demos (target e.g. ≤ 10–25 MB) or progressive load; huge ISOs stay Full/external |

**Conclusion:** A **sandboxed Play shell** (static host or blob → object URL → iframe) is **current tech**. Flash *emulator* is optional culture later, not required for vision.

### 2.3 Short + long social in one app

| Finding | Implication |
|---------|-------------|
| Amalgamation apps already mix microblog + portfolio + communities (product pattern, not novel CS) | BlkSpace already ships most of short (feed) + long (Studio/Hub) |
| Cross-post to X remains OAuth + policy surface | **Share card / clipboard** is enough for vision without X API day one |

**Conclusion:** Short+long is **already product strategy**; playable is the missing third rail, not a rewrite of social.

### 2.4 SpaceXAI (optional · operator / server only)

Per skill + live [xAI docs](https://docs.x.ai/developers/quickstart) / [models](https://docs.x.ai/developers/models) (fetched 2026-08):

| Item | Value |
|------|--------|
| Provider name in product docs | **SpaceXAI** |
| Env | `XAI_API_KEY` (git-ignored; **server or operator machine only**) |
| Base URL | `https://api.x.ai/v1` |
| Default model | `grok-4.5` |
| Client rule | **Never** embed key in Tauri/Vite; product pass **does not** depend on AI |

**Allowed theoretical AI jobs (non-core):**

| Job | Why optional |
|-----|----------------|
| Draft short-form yard post / X caption from changelog text | Creator convenience |
| Suggest playable metadata tags (yard, club, size class) | Discovery hygiene |
| Overclaim check on long-form Studio writeups (IEEE path) | Research honesty |

**Forbidden:** AI required to open a ticket, play a demo, join a club, or earn WB.

Minimal operator probe (not product code):

```bash
export XAI_API_KEY=...   # console.x.ai — never commit
curl https://api.x.ai/v1/responses \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"grok-4.5","input":"Draft a 2-sentence campus yard post for a student WASM OS demo under 20MB. No token hype."}'
```

---

## 3. Theoretical architecture (vision-preserving)

```
                    ┌──────────────────────────────────────┐
                    │  OUT OF SCOPE                        │
                    │  git · PR · CI · GitHub Releases host│
                    └──────────────────────────────────────┘

 Creator (Full/lab optional pin)              N peers (Yard or web)
 ──────────────────────────────              ─────────────────────
 1. Pack playable.zip (html+wasm)            4. Open club / feed link
 2. Store blob → ticket blkspace1.…          5. receive / fetch blob
 3. Nostr announce: kind=playable            6. Play shell (iframe sandbox)
    + yard + club + size + title             7. Short reply / tip WB optional
 3b. Studio long-form notes                  8. DMs / club debrief (Slack-N)
 3c. Optional SpaceXAI caption (server)         (no git required)
```

### Stack mapping (current BlkSpace + current industry)

| Layer | Technology | Yard | Full / lab |
|-------|------------|------|------------|
| Identity / announce | Nostr events | ✅ | ✅ |
| Short social | Feed composer | ✅ | ✅ |
| Long social | Studio / Hub | ✅ | ✅ |
| Ticket codec | `blkspace1.` / sendme CLI | ✅ partial | ✅ |
| Blob serve to N | iroh-blobs provider / sendme-class | ❌ default off | ✅ theoretical target |
| Play UI | Web iframe sandbox + CSP | web preview path | same |
| Soft economy | WeixBucks | optional | optional |
| AI assist | SpaceXAI `grok-4.5` | off | operator-only |

### Content object (theoretical schema)

```json
{
  "kind": "playable",
  "title": "TempleOS-RS demo · shell boot",
  "yard": "tsu",
  "club": "systems-lab",
  "ticket": "blkspace1.…",
  "entry": "index.html",
  "size_bytes": 12_000_000,
  "runtime": "wasm-static",
  "sha256": "…",
  "issuer": "<nostr-pubkey>",
  "expires_at": 0
}
```

No git URL required. Optional `external_forge_url` on profile only (link-out), never first-class forge.

---

## 4. Theoretical build phases (no GitHub scope)

### Phase T0 · Spec + honesty (docs only) — **this document**

- [x] Capability review 15 / 15b  
- [x] Outside tech conclusion (Iroh multi-recv, WASM play, AI optional)  
- [x] Scope fence: forge out  

### Phase T1 · Product surface without mesh upgrade (Yard-safe)

| Item | Current tech | Notes |
|------|--------------|-------|
| Content kind `playable` / `demo` in feed + Studio | App schema + UI | Can point at **HTTPS static URL** or ticket |
| Share card (copy post / ticket / play URL) | Clipboard API | Unblocks X without OAuth |
| Profile links: GitHub, X, site | URL fields | Forge stays external |
| Systems / Retro club kit | Same pattern as Chess/Study kits | Slack-range home |
| Web Play shell for **HTTPS-hosted** static zip | iframe + sandbox | Works before live iroh provider |

### Phase T2 · Sendme multi-user (Slack-N) on Full

| Item | Current tech | Notes |
|------|--------------|-------|
| Time-boxed **pin session** UI (“hosting 2h”) | iroh provider / sendme | Matches real sendme one→many |
| Club auto-post on new ticket | Nostr + club channel | Discover without GitHub |
| Size class gates for Yard consumers | Policy | Protect 4–8 GB peers |
| Pin serve WB (optional) | Existing pin economy hooks | Incentive, not requirement |

### Phase T3 · Optional SpaceXAI assist (server)

| Item | Model | Guardrail |
|------|-------|-----------|
| Caption / changelog → short post draft | `grok-4.5` via `api.x.ai` | User edits before publish |
| Long-form overclaim lint | same | Operator/research path |
| Never block play/ticket without key | — | Product works offline of AI |

### Explicitly never in this track

- In-app git, PR review, Actions UI  
- Guaranteed 24/7 global pin of every student game  
- Flash plugin / mandatory SWF runtime  
- Client-side `XAI_API_KEY`  

---

## 5. Capability matrix · theoretical target vs log

| Capability | Log now | After T1 | After T2 | After T3 |
|------------|---------|----------|----------|----------|
| Short form yard | Done | Done | Done | Done |
| Long form Studio | Partial | Stronger (playable attach) | Same | + optional AI draft |
| Share → X manual | Missing | **Done** (share card) | Done | + optional caption AI |
| Browser play (static URL) | Missing | **Partial** | Partial | Partial |
| Browser play (ticket blob) | Theoretical | Thin | **Partial** | Partial |
| N peers same drop (Slack) | Theoretical | Announce only | **Partial** | Partial |
| GitHub-scale collab | Out of scope | Out | Out | Out |
| SpaceXAI | Operator IEEE only | Same | Same | Optional creator assist (server) |

---

## 6. Risk register (theoretical)

| Risk | Mitigation |
|------|------------|
| Yard binary size if iroh provider always on | Keep provider **Full / `iroh-net` only**; Yard stays announce + receive-if-local |
| Malicious WASM in iframe | CSP sandbox, no `allow-same-origin` + `allow-scripts` careful pair; size + mime gates; yard mod report |
| Ticket expiry while class still open | Session TTL UI; re-issue ticket; club pin node |
| Students confuse BlkSpace with git host | Copy: “Link your forge on profile; drops live here” |
| AI hype in promos | IEEE line: optional, server-side, non-mandatory |
| Huge TempleOS images on Tier 0 | Size class; recommend Full pin or external host for multi-100MB |

---

## 7. Conclusion (answer)

### Is the vision buildable with **current** tech (outside research)?

**Yes — with the right scope.**

| Claim | Conclusion |
|-------|------------|
| Short + long social in one student-first space | **Already aligned**; ship polish, not a new stack |
| Slack-range multi-user file/playable drop (Sendme-class) | **Current tech** (iroh/sendme one→many + relays). BlkSpace gap is **pin session + product UX**, not inventing P2P |
| Browser “Flash-class” **feel** for student demos | **Current tech** via **WASM + sandboxed web shell**. Full Flash emulator is optional later |
| WeixNet as service rail on BlkSpace | **Partial now** (Nostr + tickets); **theoretically complete** when Full pin + playable kind + club announce land |
| Replace GitHub | **No — correctly out of scope.** Keep forge external; optional profile link only |
| Require AI | **No.** SpaceXAI (`XAI_API_KEY`, `grok-4.5`, `https://api.x.ai/v1`) may draft captions / lint writeups **server-side only**; product must work without it |

### Final verdict for capability log

| Row | Keep status | Theoretical next status if T1+T2 land |
|-----|-------------|----------------------------------------|
| **15** | **Partial** | Move toward **Done** for campus social+portfolio (X still manual share unless OAuth) |
| **15b** | **Partial / theoretical** | Move to **Partial** (static play + time-boxed pin), not “Done,” until provider + size policy proven on Device B |

### What to build when (priority for vision, not finance)

1. **Share card + profile external links** (unlocks X + honest “GitHub is forge”)  
2. **`playable` kind + web Play shell (HTTPS static first)**  
3. **Systems club kit**  
4. **Full pin session for Slack-N tickets** (real Sendme wrapper productization)  
5. **Optional SpaceXAI caption assist** (last; never blocks Tier 0)

**Bottom line:** The theoretical build that keeps the vision is a **yard-scoped playable drop network** — short posts, long portfolios, Sendme-class multi-receiver tickets, browser WASM play — **not** a forge, **not** a token pitch, **not** an AI social network. Current industry tech (WASM + iroh/sendme + Nostr) is sufficient; BlkSpace work is **integration and student-facing UX under Yard constraints**.
