# Feature Spec: Creative Content Pipeline

**Sources:** Bible DJ, Religious Text GUI, Genesis XML, Music Playlist, Python DJ conversion, myBibleNLP (external), Camera Roll videos (external)  
**BlkSpace phases:** 2–5  
**Status:** Concept → spec

---

## Overview

BlkSpace creative pipeline turns existing personal/cultural assets into **EB Productions** — hosted media that earns WeixBucks/BlkCoin on the hub.

---

## Content Verticals

### 1. Scripture Creative (LogosDecks)
- **Assets:** myBibleNLP models, Genesis XML summaries, Bible DJ concept
- **Output:** Verse mixes, sermon sets, cross-ref playlists
- **Spec:** [logos-decks.md](./logos-decks.md)

### 2. DJ / Music
- **Assets:** 6,213-track playlist metadata, DJ mixes, Python conversion scripts
- **Output:** Published mixes, profile embeds, NFT editions (Phase 4)
- **Spec:** [nft-dj-mixes.md](./nft-dj-mixes.md)

### 3. Videography
- **Assets:** Camera Roll .mp4 files (external Documents/)
- **Output:** Short/long video on Iroh; engagement rewards
- **Processing:** ffmpeg multi-res locally before upload

### 4. Visual / Branding
- **Assets:** hotencoderpy/ B.L.A.C.K. logos (blk999, emblem, panafricanism, etc.)
- **Output:** Profile themes, community badges, marketplace assets
- **Storage:** Iroh CIDs referenced in Nostr profile events

### 5. Cultural / Educational
- **Assets:** AA literature essays, ethics notes, TSU project patterns
- **Output:** Posts, essays, community circle content
- **Circles:** TSU/Black creative spaces (initial niche — pending user confirm)

---

## Ingest Flow ("Add Bloat Back")

Per plan.md workspace cleanup — content returns via upload, not folder sync:

```
Local file (user machine)
    → Tauri upload command
    → Optional ffmpeg transcode
    → Iroh store → CID
    → Nostr publish event (kind + tags + reward request)
    → SQLite local cache
    → WeixBucks credit (reward engine)
```

---

## Metadata & ML (Phase 5)

| Pipeline | weixinfo source | Use |
|----------|-----------------|-----|
| Tabular → embeddings | Transforming Tabular Data to LLM Embeddings | Content recommendation |
| Text distillation | DistillGPT2.0 | Lightweight classification |
| PySpark sentences | Convert Tabular to Structured Sentences | Bulk metadata generation |
| Bible author prediction | myBibleNLP (external) | LogosDecks tagging |

**Not MVP.** Phase 1–3 use manual tags + rule-based cross-refs.

---

## Religious Text GUI → BlkSpace Reader

From `Building Religious Text Analysis GUI Project.md`:

- DataFrame query: book → chapter → page → verse
- Cross-book analysis view
- **BlkSpace version:** Built into Tauri client as scripture browser feeding LogosDecks

---

## Reward Triggers (Creative)

| Content type | Upload reward | Engagement bonus |
|--------------|---------------|------------------|
| First upload of type | WeixBucks base | — |
| Video > 1 min watch | — | Per-minute micro-reward |
| DJ mix完整 playthrough | — | Listener pool split |
| Scripture mix shares | — | Cross-ref discovery bonus |
| Viral (top 1% weekly) | — | BlkCoin grant |

Exact formulas: open decision in `hub-theory.md`.

---

## Ethical Guardrails

From weixinfo ethics essays:

- No children's facial recognition features
- Transparent reward math published in client
- Cultural content moderated respectfully in community circles
- Copyright: user attests rights on upload; report flow for DMCA