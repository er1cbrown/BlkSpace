# Stack Reconciliation: BLKSPACE Blueprint vs Plan.md

**Source:** `weixinfo/BLKSPACE Blueprint Analysis.md` + `plan.md`  
**Status:** Decision record — Phase 0

---

## Two Visions, One Project

| Aspect | BLKSPACE Blueprint (Apr 2026) | plan.md (Jun 2026) | **Decision** |
|--------|------------------------------|-------------------|--------------|
| Core identity | Web3 BLGs, customizable blogs, GitHub sync | Decentralized social amalgamation on WeixNet | **Merge:** customizable profiles (MySpace) + BLG-style ownership |
| Networking | Unclear / LBRY-adjacent | Nostr + Iroh | **Nostr + Iroh** |
| Client | Not specified | Tauri v2 + React 18 + Tailwind | **Tauri** |
| Blockchain | Custom Rust PoW chain, Solana/Anchor, Foundry | Simulated SQLite → Solana Phase 4 | **Simulated first** |
| Token | BLKCOIN | WeixBucks + BlkCoin (two-tier) | **Two-tier** — BLKCOIN evolves into BlkCoin premium tier |
| Infra | Proxmox, Cozystack, Harbor, GitLab CI | Defer devops until hub solid | **Defer** |
| Storage | IPFS + Filecoin, web3.storage | Iroh (modern Rust IPFS) | **Iroh** |
| Security | aws-lc-rs, rustls, MONEROCHAN zkVM | Secure by default in Rust hub | **rustls + nostr crypto**; zk optional later |
| Database | Xata, Convex | SQLite local cache | **SQLite** for MVP |

---

## What to Keep from Blueprint

### BLKCOIN → BlkCoin
- Premium meme-coin tier with utility (NFT, governance, prestige)
- Solana/Anchor as Phase 4 target (not custom PoW chain)
- Foundry useful for smart contract testing on devnet

### BLGs (Blogs) → Customizable Profiles
- User-owned pages with themes, music embeds, creative uploads
- Nostr profile + theme CID replaces centralized blog host

### Rust Blockchain Stubs
- SHA256, serde patterns from blueprint Colab demo → reference for reward event signing
- **Do not ship** custom PoW chain to production

### Open Source Stack Awareness
- GitLab/Codeberg for hosting (when ready)
- IPFS concepts → Iroh implementation
- Foundry for Phase 4 contract work

---

## What to Reject from Blueprint

| Blueprint item | Why reject |
|----------------|------------|
| Custom PoW blockchain | Hub uses Nostr events, not new chain |
| Proxmox VM matrix | Overkill for Phase 0–3; conflicts with low-end node vision |
| Cozystack PaaS now | Devops deferred |
| Google Colab as dev env | Local Tauri + Rust workspace instead |
| Convex/Xata as primary DB | SQLite local-first per plan |
| MONEROCHAN zkVM (now) | Scope creep; privacy later if needed |

---

## Unified Stack (Authoritative)

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri Client                          │
│              React 18 + TS + Tailwind                    │
└────────────────────────┬────────────────────────────────┘
                         │ Rust commands
┌────────────────────────▼────────────────────────────────┐
│                   WeixNet Hub (Rust)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │ nostr-sdk   │  │ iroh        │  │ economy-engine   │  │
│  │ relays/events│  │ blobs/CIDs  │  │ WeixBucks/BlkCoin│  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐                        │
│  │ sqlite      │  │ ffmpeg CLI  │  (local transcode)    │
│  └─────────────┘  └─────────────┘                        │
└─────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Low-End Nodes (harvest)                     │
│         relay · pin · validate · optional transcode      │
└─────────────────────────────────────────────────────────┘

Phase 4 addition: Solana SDK (BlkCoin SPL, NFT tickets)
Phase 5 addition: ML pipelines (Bible NLP, anti-abuse)
```

---

## Dependency Manifest (when scaffolded)

### Rust (`Cargo.toml` workspace)
- `tauri` 2.x
- `nostr-sdk`
- `iroh` / `iroh-blobs`
- `rusqlite` or `sqlx`
- `serde`, `tokio`, `tracing`
- Phase 4: `solana-sdk`, `anchor-lang`

### Frontend (`package.json`)
- `react` 18, `typescript`, `tailwindcss`
- `@tauri-apps/api`
- Router (react-router or tanstack-router)
- Video/audio players

### System
- `ffmpeg` (PATH)
- No Node server required (Tauri embedded)

---

## Migration Notes

Blueprint Rust demo code in weixinfo can be archived as learning reference. When Phase 1 starts, init fresh Tauri project — do not port PoW chain.

**BLKSPACE PDF concepts** (BLGs, EBPRODUCTIONS architecture diagram) remain valid at product level; implementation path is plan.md + hub-theory.md.