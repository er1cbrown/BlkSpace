# SBF Rollback Netplay — Tough Love Arena–class connectivity

**Status:** Design locked · **Not shipped**  
**Anchor product:** Super BlkSpace Fighters series (YDB1 → XQ5D → 5DXQ)  
**Reference (feel, not IP):** [Tough Love Arena](https://toughlovearena.com/) — free browser 1v1 fighter with **rollback netcode**

> Goal: online fights feel like **local delay-free play** on campus Wi‑Fi and decent home links — same *class* of connectivity FGC players expect from TLA / GGPO-style games — without putting every input frame through Nostr or a global TikTok CDN.

---

## What Tough Love Arena does (why it feels good)

| Piece | Meaning |
|-------|---------|
| **Rollback (GGPO-class)** | Each client predicts the remote player’s next inputs, simulates **now** (0 input lag on your stick), then if the real remote inputs differ, **rewinds** game state a few frames and **replays** with the truth |
| **vs delay-based** | Delay waits for both sides every frame → mushy “laggy buttons.” Rollback keeps buttons snappy |
| **Browser 1v1** | Both players run the **same deterministic sim**; network only carries **inputs + timing**, not full world snapshots every frame |
| **Match session** | Lobby/matchmaking is separate from the fighting loop; once connected, **peer path** carries the fight |

BlkSpace must copy this **architecture pattern**, not TLA art/code.

---

## BlkSpace split: control plane vs data plane

This is how rollback coexists with town mesh + local-first (see traffic model).

```
┌─────────────────────────────────────────────────────────────┐
│  CONTROL PLANE (WeixNet / BlkSpace social)                  │
│  Nostr events · Club night · Arcade catalog · tickets       │
│  Matchmaking: challenge, accept, yard, character select     │
│  Signaling: exchange peer endpoints / match id / seed       │
│  Rate: human pace (seconds), not 60 Hz                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ once match starts
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  DATA PLANE (rollback fight session)                        │
│  P2P inputs @ ~60 Hz · GGPO-style predict / rollback        │
│  WebRTC DataChannel (browser/WASM) or UDP (Tauri native)    │
│  Optional TURN relay only for NAT fail (small, per match)   │
│  NOT Nostr · NOT SQLite write-per-frame · NOT Iroh blobs    │
└─────────────────────────────────────────────────────────────┘
                           │ match ends
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  RESULT PLANE                                               │
│  Score, winner, replay hash → Club bracket + soft WB        │
│  One (or few) signed events — not the whole match stream    │
└─────────────────────────────────────────────────────────────┘
```

**Rule:** Nostr is for *finding* people and *recording* results.  
**Rollback sockets** are for *playing*. Mixing them kills both.

---

## Requirements for any SBF online binary

### Engine (hard)

1. **Deterministic simulation** — same inputs + same seed ⇒ same state on both machines (fixed-point or careful float policy; no wall-clock randomness mid-match).
2. **Serializable state** — can snapshot / restore ~8–12 frames of history for rollback.
3. **Input model** — compact input bitfield per frame (buttons + stick), not position sync of characters as authority.
4. **Frame budget** — rollback replay must finish within a frame on Tier 0 (keep 1.0 cast/systems lean enough).

### Net (hard)

| Item | Target |
|------|--------|
| Transport | **WebRTC unreliable/ordered-or-partial** for WASM; native UDP later |
| Topology | **P2P 1v1 first** (TLA class); 2v2 tag later (much harder) |
| Input delay | Prefer **0–2 frames** local buffer + rollback, not 6–8 frames delay-based |
| RTT comfort | Campus / metro good; document “recommended &lt;80–100 ms” honesty |
| NAT | STUN default; **TURN** fallback for dorm CGNAT (ops cost — town or club-run possible) |
| Desync | Frame checksum / state hash; on mismatch → pause + soft disconnect + optional resync protocol |

### BlkSpace shell (product)

| Item | Role |
|------|------|
| Arcade play shell | Host WASM + allow WebRTC permissions |
| Club “Challenge” | Control-plane match invite (Nostr / local event) |
| Lobby room | Character + stage select before data plane opens |
| Spectator (v1) | Optional later: input stream fan-out or delay spectator — **not** day-one |
| Ranked | Soft WB / spirit only after verified result event |

---

## Series rollout (when rollback lands)

| SKU | Online target | Why |
|-----|---------------|-----|
| **YDB1** 1.0 | **1v1 rollback first** (TLA-class) | Smallest cast = easiest determinism + netplay QA |
| **XQ5D** 2.0 | 1v1 + optional 2v2 stocks later | Platform fighter nets are harder (more free movement) |
| **5DXQ** 3.0 | Tag / assist needs **2-entity** rollback per side | After 1v1 is solid — Project L–class online is a *second* mountain |

Do **not** ship 4-player free-for-all rollback before 1v1 is trustworthy.

---

## Connectivity stack options (ordered)

### Path A — WASM + WebRTC (closest to TLA browser)

- Ship game as Arcade/Play shell WASM  
- Lobby in React; match uses DataChannel for inputs  
- Works in Tauri WebView **and** campus web preview  
- **Pros:** TLA-like UX, one build  
- **Cons:** WebRTC NAT pain; TURN needed for some dorms  

### Path B — Tauri native netplay lane

- Same deterministic core; UDP via Rust side  
- Better sockets / less browser weirdness  
- **Pros:** Stronger for club laptops  
- **Cons:** Desktop-first; web preview weaker  

### Path C — Hybrid (recommended long-term)

- Shared sim core (Rust or Godot deterministic)  
- WebRTC path for web · native UDP for Tauri Full  
- Identical rollback protocol version string in match handshake  

**Iroh / Reticulum:** fine for **shipping the game build** or resilient **lobby notes** — **not** for 60 Hz input.

---

## Match lifecycle (product UX)

1. **Find** — Club night, Arcade “Ranked/Casual”, or friend challenge (Connect / Nostr).  
2. **Ready** — Both load same **build id + ruleset hash** (desync prevention).  
3. **Signal** — Exchange SDP/ICE or hole-punch tickets via control plane (short-lived).  
4. **Fight** — Rollback loop; UI shows ping / rollback frames (optional debug for power users).  
5. **End** — Both sign result payload `{matchId, winner, scores, buildId, checksum}`; club accepts if consistent.  
6. **Prizes** — Soft WB / spirit only after dual-agree or host-of-record rule.

Anti-cheat v0: honor system + checksum; v1: limited input log review for club TO.

---

## What this is *not*

| Claim | Reality |
|-------|---------|
| “Nostr does rollback” | **No** — wrong latency/semantics |
| “WeixNet streams the match like Twitch” | Spectate is separate; play is P2P |
| “Unlimited global ranked like Steam FGC day one” | Start **town / friend code / club** |
| “Parsec is our netcode” | Last-resort remote desktop; not product path |
| “Copy TLA binary” | **Never** — original SBF engines only |

---

## Traffic honesty (ties to simultaneous load)

- **100 students on feed** → Nostr town relays (small events).  
- **8 concurrent 1v1 matches** → 8 P2P sessions; control plane barely notices.  
- **Heavy** = TURN relay minutes + download of game build once — not perpetual central sim.  
- Scale matches **horizontally by pairs**, not by central game server simulating every hitbox.

Same philosophy as Federated College-Town mesh: **don’t global-flood**; **don’t centralize the sim**.

---

## Implementation phases

| Phase | Deliverable | Done when |
|-------|-------------|-----------|
| **N0** | This doc + capability log · product requirement locked | ✅ |
| **N1** | Deterministic 1v1 offline + “input recording replay” (local rollback training) | ✅ `/rollback` · `sbf-rollback-core.ts` · Verify replay |
| **N2** | Local 2-instance netplay (loopback WebRTC/UDP) with rollback | Two windows fight with artificial latency |
| **N3** | Friend-code / Club challenge signaling on WeixNet | Real 2 devices, same LAN then WAN |
| **N4** | STUN + optional town TURN; ping display; desync detect | Dorm-to-dorm works often enough |
| **N5** | Result events → brackets / soft WB | Club night online pool |
| **N6** | 2v2 / tag rollback research (5DXQ) | Only after N4 stable |

**Engine choice note:** Godot 4 + custom rollback **or** Rust sim + canvas/WASM both viable; the **protocol + determinism** matter more than the logo on the engine.

Suggested open references (implementation research, not dependencies): GGPO concepts, rollback blogs (e.g. Core-A “Why Rollback”), browser WebRTC datachannel input sync patterns used by indie browser fighters.

---

## Acceptance criteria (TLA-class for BlkSpace)

A student should be able to say:

1. I challenged a clubmate from **Yard → ProjectB / Arcade**.  
2. Match connected without installing Discord + Parsec.  
3. Buttons felt **immediate**; rare rubber-banding only on bad Wi‑Fi (rollback, not mush delay).  
4. After the set, bracket / pin / WB updated on BlkSpace.  
5. Build was **our** SBF homebrew, not a third-party fighter rehost.

---

## Related

- [`super-blkspace-fighters-series.md`](super-blkspace-fighters-series.md)  
- [`yard-arcade.md`](yard-arcade.md)  
- [`architecture-blueprint.md`](../architecture-blueprint.md) — town mesh control plane  
- Capability log rows **19**, **19d**
