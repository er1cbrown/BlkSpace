# Feature Spec: LogosDecks (Bible DJ)

**Source:** `weixinfo/Bible DJ Software Concept Design.md`  
**BlkSpace phase:** 5 (scripture creative seeding) — stub metadata in Phase 2  
**Status:** Concept → spec

---

## Vision

**LogosDecks** maps DJ software metaphors onto scripture study and performance. Chapters are albums, verses are tracks, and mixing becomes hermeneutical discovery.

This is a **flagship creative vertical** for BlkSpace — aligned with B.L.A.C.K. mission, myBibleNLP assets, and EB Productions.

---

## Data Model (maps to WeixNet)

| DJ Concept | LogosDecks | WeixNet storage |
|------------|------------|-----------------|
| Track | Verse (e.g. John 3:16) | Iroh blob (audio TTS/chant) + Nostr kind for verse metadata |
| Album | Chapter (e.g. Psalm 23) | Nostr collection event |
| Artist | Author/tradition (David, Paul) | Profile tag |
| Genre | Literary genre (Law, Poetry, Gospel) | Content tag |
| BPM | SPM — sentences per minute | Computed metadata |
| Key | Emotional/theological key (valence × intensity) | ML tag from myBibleNLP |
| Crate | User playlist / sermon set | Nostr list event |

---

## Core Modes

### 1. Library Mode
Browse scripture like a DJ library. Filter by genre, author, SPM, theological key.

### 2. Hermeneutical Sync
Auto-suggest cross-references when a verse is loaded (Isaiah 53 → Psalm 22 → John 19).

### 3. Sermon Constructor
Theme-driven 3-act playlist: Problem (Law) → Prophetic Turn → Fulfillment (Gospel).

### 4. Gospel vs. Law Battle
Two-deck theological mix — Lex vs. Evangelion channels.

---

## DJ Controls → Scripture FX

| Control | Effect |
|---------|--------|
| Loop Roll | Repeat phrase ("Holy, holy, holy") |
| Reverb | Canonical echo (NT quotes of OT) |
| Filter | Covenantal lens (grace vs. judgment emphasis) |
| Beat Jump | Skip genealogy sections |
| Hot Cues (8 pads) | Who spoke, to whom, key verb, promise, command, etc. |

---

## BlkSpace Integration (not standalone app)

LogosDecks should **not** be a separate Electron app in MVP. Integrate as:

1. **Upload type:** `scripture-mix` — user publishes a sermon set or verse sequence
2. **Player skin:** Deck-style UI inside Tauri client for scripture content
3. **Rewards:** WeixBucks for publishing scripture creative; BlkCoin for viral/top sets
4. **Tags:** `logos-decks`, `sermon`, `cross-ref-mix` on Nostr events

### Phase rollout

| Phase | Deliverable |
|-------|-------------|
| 2 | Verse audio upload + chapter grouping metadata |
| 3 | Cross-ref suggestions (rule-based, myBibleNLP lookup) |
| 5 | Full deck UI, Hermeneutical Sync, Sermon Constructor |

---

## Technical Dependencies

| Need | Solution |
|------|----------|
| Verse text | myBibleNLP KJV data (external asset) |
| Audio | TTS or pre-recorded narration → Iroh CID |
| Cross-refs | Rule-based graph first; ML later |
| UI | React component in Tauri; Serato-like layout reference |

---

## Open Questions

- [ ] TTS voice per translation (KJV, NIV, NRSV)?
- [ ] Community moderation for theological content?
- [ ] Earn rewards for cross-ref mixes that get engagement?