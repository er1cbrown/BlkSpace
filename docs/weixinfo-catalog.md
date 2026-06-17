# WeixInfo Catalog

Complete categorized inventory of `weixinfo/` (98 markdown exports).  
Each entry links concept → BlkSpace relevance.

---

## Summary

| Category | Count | BlkSpace relevance |
|----------|-------|-------------------|
| BlkSpace / WeixNet / Web3 | 3 | **Direct** — blueprint, NFT DJ, Odysee |
| Creative features | 10 | **High** — Bible DJ, music, scripture, culture |
| Tech stack | 49 | **Medium** — skills that inform client/hub design |
| DevOps / tools | 12 | **Low now** — defer until Phase 1+ per plan.md |
| Academic schoolwork | 9 | **Archive** — skills reference only |
| Personal / ethics | 10 | **Mission** — B.L.A.C.K. uplift, ethical guardrails |
| Misc other | 5 | **Skip** — unrelated to BlkSpace |

---

## BlkSpace / WeixNet / Web3 (3)

| File | Key concept | BlkSpace mapping |
|------|-------------|------------------|
| `BLKSPACE Blueprint Analysis.md` | Web3 BLGs, BLKCOIN, Proxmox, Rust blockchain stubs, Solana/Anchor, Foundry, IPFS | Informs BlkCoin; **superseded** by Nostr+Iroh hub in plan.md |
| `NFT DJ Mix Creation Guidance.md` | Mint DJ mixes as NFTs on WeixNet/BlkSpace | Phase 4 marketplace + music embeds |
| `Odysee content creation legitimacy analysis.md` | LBRY/Odysee viability; build-your-own Odysee | Validates **skip LBRY**; use Iroh+Nostr instead |

---

## Creative Features (10)

| File | Key concept | BlkSpace mapping |
|------|-------------|------------------|
| `Bible DJ Software Concept Design.md` | LogosDecks: chapters=albums, verses=tracks, Serato-like scripture mixing | Phase 5 creative module; see `features/logos-decks.md` |
| `Building Religious Text Analysis GUI Project.md` | Python GUI for book/chapter/verse DataFrame queries | Reuse myBibleNLP patterns |
| `Python Script for DJ Audio Conversion.md` | yt-dlp → MP3 for VirtualDJ/Mixxx | Local library ingest before upload rewards |
| `Music Playlist Analysis.md` | 6,213-track DJ metadata analysis (BPM, key, genre) | Profile music embeds; reward-eligible uploads |
| `Genesis Chapters 1-41 Summary Overview.md` | Genesis summaries from `gntDraft1.xml` | Seed content for scripture creative |
| `Religions and the concept of the Most High.md` | Comparative theology | Community/cultural circles |
| `Three Stories of Struggle and Identity.md` | Literary analysis (oppression, identity) | Cultural uplift content seeds |
| `Analyzing African American Literature Quiz.md` | AA literature homework | TSU/cultural education circles |
| `Delia's Struggle Against Abusive Husband.md` | Hurston "Sweat" summary | Cultural content archive |
| `Cotton Mather on Mental Illness and Witchcraft.md` | Historical ethics essay | Ethical content moderation context |

---

## Tech Stack (49)

### Networking / HTTP / TCP (15)
Apache, caravan delay, client web requests, checksums, datagram networks, HTTP cache RTT, HTTP protocol, persistent connections, Python multi-client server, sender error handling, software update distribution, TCP/UDP sockets, TCP flow control, transmission delay (×2).

**BlkSpace use:** Informs relay design, low-bandwidth node assumptions, CDN-less media delivery.

### Databases / SQL (14)
MySQL concat, invoice formatting, product ranking queries, 1NF, WHERE aggregate rules, SQL vs CSV, database switching, regex extraction.

**BlkSpace use:** SQLite schema design for balances, history, offline queue; ranking/leaderboards.

### Python / ML / NLP / Data (15)
PySpark→LLM, DistillGPT2, tabular embeddings, pandas splits, PDF→CSV, NLP/ML primers, abstract templates, CSV tools, PySpark data prep.

**BlkSpace use:** Phase 5 Bible NLP; ML-informed anti-abuse signals; content metadata tagging.

### Rust / Systems (2)
`Rebuild TempleOS in Rust, Run LLM.md` — bare-metal Rust OS guide  
`Python for OS Kernel_ Not Practical Choice.md` — kernel language tradeoffs

**BlkSpace use:** Rust for hub core; **not** rebuilding TempleOS — Tauri is the client shell.

### Full-stack / Dev Practices (3)
`Full Stack vs Minimal Development Needs.md` — MVP, solo PM, architectural awareness  
`GitHub Repositories for Documentation Examples.md`  
`Web Scraping Legal Issues and Alternatives.md`

**BlkSpace use:** Phased MVP discipline; legal guardrails for content ingestion.

---

## DevOps / Tools (12)

OpenClaw homelab, LazyVim, macOS Ventura, USB boot, Linux photo editor, Xcode for Python, etc.

**BlkSpace use:** Solo dev toolchain only. **Defer heavy homelab/devops** until hub theory approved (plan.md Phase 0).

---

## Personal / Ethics (10)

Ethical AI, facial recognition risks, children's wellbeing, cultural respect, personal statement, mental health, content blocker ethics, scholarship goals.

**BlkSpace use:** Mission alignment (B.L.A.C.K. uplift), anti-abuse ethics, transparent reward math, meme-coin disclaimers.

---

## Academic Schoolwork (9)

C/C++ arrays, polymorphism, memory leaks, DFA construction, LeetCode Two Sum, class override.

**BlkSpace use:** Archive per plan.md cleanup strategy. Skills transfer to Rust systems thinking.

---

## Misc Other (5)

AI jobs in China, dog evolution, PS4 exploit, LAN play, Greek name origin.

**BlkSpace use:** None.

---

## Files Not Yet Linked to a Feature Spec

These creative/tech files have high latent value but no dedicated spec yet:

- `DistillGPT2.0 for ML Text Analysis Pipelines.md` → anti-abuse text signals
- `Transforming Tabular Data to LLM Embeddings.md` → content recommendation engine
- `Full Stack vs Minimal Development Needs.md` → embedded in `concepts-review.md`
- `Personal Statement Revision and Analysis Summary.md` → EB Productions identity narrative