# LogosDecks — DevOps track

**Status:** slice 1 reads the four typeverse SWORD modules locally · full deck UI not started · Phase 5 not started
**Branch:** `feat/logos-decks`
**Opened:** 2026-10-20
**Concept (do not relocate):** [`weixinfo/Bible DJ Software Concept Design.md`](../../weixinfo/Bible%20DJ%20Software%20Concept%20Design.md)
**Agreed phase:** [`FLESHTHEORY.md`](../../FLESHTHEORY.md) §9 — full deck UI is Phase 5; metadata was the Phase 2 stub
**Spec:** [`docs/features/logos-decks.md`](../features/logos-decks.md)

This track is how the unfinished feature enters CI. It does not build the instrument and it does not move Phase 5 in front of the yard.

`SOUL.md` stays the agent persona. It is not the LogosDecks spec.

---

## 1. What exists today

| Piece | Present | Notes |
|---|---|---|
| Profile module | ✅ stub | `LogosDeckPlayer` renders only when `myyardLayout.modules.logosDeck` is on |
| Default | ✅ off | `DEFAULT_MYYARD_LAYOUT.modules.logosDeck === false`, `audioHash` null, `trackIds` empty |
| Library | ✅ demo | `LOGOS_DECK_DEMO_CRATE` — six hardcoded verses |
| Cross-refs | ✅ crate-only | `crossRefsFor` returns hits inside that list and drops the rest |
| Audio | ⬜ | Play talks to an `<audio>` element only when a Tauri blob hash is passed. Otherwise the button toggles an icon |
| Hot cues | ⬜ labels | Eight pad names. They do not answer who spoke, the key verb, or a translation |
| Sermon constructor | ⬜ | Not in the client |
| Gospel vs Law battle | ⬜ | Two decks load demo tracks. They do not split Law and Gospel |
| `scripture-mix` upload / Nostr kind 30100 | ⬜ | Marketplace has a `logos-deck` item type label only |
| Rewards | ⬜ | No WeixBucks path for a scripture mix |

The June 2026 concept (lectio waveform, hermeneutical sync against a real corpus, liturgical sync, spoken or chanted audio) is not this stub.

---

## 2. CI

No new workflow. `.github/workflows/ci.yml` already runs on pull requests that touch `Code-Companion/`. Markdown-only changes are ignored (`paths-ignore: **.md`), so this track includes a unit test:

`Code-Companion/artifacts/blkspace/src/test/logos-deck.test.ts`

That test is the gate. It fails if the demo crate is treated as a full Bible, if cross-refs invent verses outside the crate, or if the profile module turns on by default.

Local:

```bash
cd Code-Companion/artifacts/blkspace
bun run test:run -- src/test/logos-deck.test.ts
```

Before a pull request that changes the app:

```bash
cd Code-Companion
bun run lint
bun run typecheck
bun run test
bun run format:check
```

Heavy jobs (Yard, Full, E2E, bundle budget) stay on the existing `needs: [lint, typecheck]` chain. Do not add a LogosDecks workflow, a native dependency, or a model weight.

---

## 3. Slice 1 — when implementation starts

Still inside BlkSpace. Still opt-in. Still not the full Phase 5 instrument.

The profile player asks `GET /api/logos/sword?module=KJV&ref=Isaiah%2053:5`. `scripts/logos-sword.py` reads that verse through pysword from `~/.sword`, the same library typeverse uses. GNT and RVG stay on this machine. If the library is missing, the six-verse starter crate stays on screen and sync does not invent a verse.

| In slice 1 | Out of slice 1 |
|---|---|
| The four typeverse SWORD modules, read from `~/.sword` on this machine: KJV, GNT, RVG, SpaRV | Copying GNT or RVG text into the repo. NIV, NRSV, Reina Valera Gómez |
| Hermeneutical sync that only returns verses present in the loaded text | A knowledge-graph service, myBibleNLP weights, or an external Bible API |
| Keep `modules.logosDeck` default **false** until the slice's tests pass | Turning the module on for every profile |
| Existing Vitest + `check:bundle:tier0` | Mixxx fork, Tone.js, a new npm or Rust crate |
| Player stays a profile module | A separate app, Electron, or a new route that pretends the deck is finished |

Typeverse (`/typeverse`) is a typing page. It is not this feature. Do not rename it to LogosDecks. A later slice may read the same public-domain files. It must not block on that page.

---

## 4. Done later (still Phase 5)

- Sermon constructor (problem → prophetic turn → fulfillment)
- Gospel vs Law as two real channels
- Spoken or chanted audio, stored like other media (not a new host)
- `scripture-mix` publish and the Nostr kind already reserved in `docs/nostr-event-kinds.md`
- WeixBucks for a published set, only after the yard earn path is the one under test

---

## 5. Guardrails

- Tier 0: no ML inference on the student laptop.
- Do not fork Mixxx. The concept names it as a UI metaphor. The agreed product decision is a React module inside BlkSpace.
- Do not mark `docs/ROADMAP.md` Phase 5 as started until slice 1 is merged and the contract test describes the new behavior instead of the six-verse crate.
- Leave unrelated dirty files (typeverse, ledger, `db.rs`) off this branch's commits.
