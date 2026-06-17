# References — BlkSpace / WeixNet

**Academic papers, protocols, and foundational sources cited across BlkSpace documentation.**

**Format:** IEEE conference citations for technical papers; project URLs for protocols.

---

## Security & Cryptography

### [1] Kimura et al. 2025 — Nostr Attacks
H. Kimura, R. Ito, K. Minematsu, S. Shiraki, and T. Isobe, "Not in The Prophecies: Practical Attacks on Nostr," in *Proc. IEEE 10th European Symposium on Security and Privacy (EuroS&P)*, 2025.

**Cited in:** `security-considerations.md`, `architecture-blueprint.md`  
**Relevance:** Identified signature bypasses, unauthenticated CBC encryption in Nostr DMs, and confidentiality attacks via link previews. Directly shaped BlkSpace's policy: **Nostr encrypted DMs are untrusted for sensitive coordination.**

---

### [2] Fausak et al. 2024 — Malicious Intent Detection Framework (MIDF)
A. R. Fausak, C. Tunc, and A. T. Fausak, "Malicious Intent Detection Framework for Social Networks," in *Proc. IEEE/ACS 21st International Conference on Computer Systems and Applications (AICCSA)*, 2024.

**Cited in:** `reward-formulas.md`, `security-considerations.md`, `architecture-blueprint.md`  
**Relevance:** Relationship-based anomaly detection signals inform BlkSpace's **Engagement Quality** multipliers (Sybil spike detection, star-pattern farm indicators).

---

## Networking & Distributed Systems

### [3] Biagioni 2026 — BitChat Protocol Review
E. Biagioni, "Early Review of The BitChat Protocol," in *Proc. 2026 International Conference on Computing, Networking and Communications (ICNC)*, 2026.

**Cited in:** `architecture-blueprint.md`  
**Relevance:** Dual-transport philosophy (local BLE mesh + global internet) inspired BlkSpace's optional **Phase 2+ local mesh** design. BlkSpace borrows the philosophy, not the full BitChat stack.

---

### [4] Kurose & Ross — Computer Networking (Textbook)
J. F. Kurose and K. W. Ross, *Computer Networking: A Top-Down Approach*, 8th ed. Pearson, 2021.

**Cited in:** `architecture-blueprint.md`  
**Relevance:** Delay, P2P distribution, TCP/UDP foundations used for bandwidth modeling and relay mesh design.

---

## Decentralized Media & Predecessors

### [5] Odysee / LBRY Post-Mortem
Derived from internal analysis in `weixinfo/Odysee content creation legitimacy analysis.md` (2026).

**Cited in:** `decentralized-media.md`, `hub-theory.md`, `concepts-review.md`  
**Relevance:** LBRY Inc. defunct (SEC lawsuit), LBC token illiquid. Validates BlkSpace decision to **skip LBRY fork** and build on Nostr + Iroh instead.

---

## Protocols & Technical Specifications

### [6] Nostr Protocol
`nostr` — Notes and Other Stuff Transmitted by Relays.  
**URL:** https://github.com/nostr-protocol/nostr  
**NIPs:** https://github.com/nostr-protocol/nips

**Cited in:** Entire codebase and documentation.  
**Relevance:** Social event layer, authentication (kind 22242), relay mesh, DMs, relay lists (NIP-65), blob announcements (NIP-94).

---

### [7] Iroh Protocol
`iroh` — Peer-to-peer data transfer and storage.  
**URL:** https://iroh.computer

**Cited in:** `hub-theory.md`, `architecture-blueprint.md`, `decentralized-media.md`  
**Relevance:** Content blob storage (photos, audio, video), CID-based deduplication, modern Rust implementation replacing IPFS for BlkSpace.

---

### [8] Tauri Framework
`tauri` — Build smaller, faster, more secure desktop applications.  
**URL:** https://tauri.app  
**Version:** v2.x

**Cited in:** `AGENTS.md`, `STARTUP.md`, `DEVOPS.md`  
**Relevance:** Cross-platform desktop wrapper (Rust backend + Web frontend), security-hardened webview, SQLite integration.

---

### [9] Solana Blockchain
Solana Labs.  
**URL:** https://solana.com

**Cited in:** `solana-security.md`, `AGENTS.md`, `hub-theory.md`  
**Relevance:** Phase 4 settlement layer for BlkCoin meme-coin. Deferred until economy is proven off-chain.

---

### [10] Anchor Framework
`anchor` — Solana development framework.  
**URL:** https://www.anchor-lang.com

**Cited in:** `AGENTS.md`, `solana-security.md`  
**Relevance:** All Solana smart contract development (Phase 4) gated through Anchor for security.

---

## Cryptographic Primitives

### [11] BIP39 — Mnemonic Code for Generating Deterministic Keys
Bitcoin Improvement Proposal 39.  
**URL:** https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki

**Cited in:** `auth.ts`, `FIRST_RUN.md`, `signup.tsx`  
**Relevance:** 12-word recovery phrase for Nostr key backup. User-education cornerstone.

---

### [12] secp256k1 — Elliptic Curve Digital Signature Algorithm
Bitcoin curve; used in Nostr for Schnorr signatures (BIP340).

**Cited in:** `lib.rs` (Rust backend), `auth.ts` (frontend)  
**Relevance:** Nostr identity signing, authentication event verification, pubkey derivation.

---

## Additional Sources

| Source | Type | BlkSpace Use |
|--------|------|-------------|
| `weixinfo/` corpus (98 files) | Internal research archive | Skills transfer, creative vision, cultural grounding |
| `myBibleNLP` (external) | NLP project | LogosDecks tagging, scripture metadata |
| `hotencoderpy/` (external) | Design assets | B.L.A.C.K. branding, profile themes |
| `Grok-Computer Networking Top-Down Approach Overview.json` | Export | Architecture layer mapping |

---

## Citation Key

**IEEE Conference Format:**  
`A. B. Author and C. D. Author, "Title of Paper," in *Proc. Conference Name (Abbrev)*, Year.`

**IEEE Online / Project:**  
`Project Name. URL: https://...`

---

*Last updated: 2026-06-15*  
*Maintained as part of BlkSpace documentation.*
