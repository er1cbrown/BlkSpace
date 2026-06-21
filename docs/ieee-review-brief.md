# BlkSpace — IEEE Review Brief

**One-sentence pitch:** BlkSpace is a decentralized social network for HBCU creators that runs on low-end student hardware and settles value through a federated Nostr/Iroh mesh, with an optional Solana token layer.

---

## 1. Problem

Existing social platforms are centralized, extractive, and ignore the hardware reality of low-income students. BlkSpace asks: *What if a college-town social network could run on old laptops, resist censorship, and let creators earn without selling access to their data?*

---

## 2. Core Contribution

A **Federated College-Town Relay Mesh** that combines:

- **Nostr** for identity, posts, and social graph (application layer)
- **Iroh** for content-addressed media blobs
- **Town-based relay routing** to avoid O(N²) global flooding
- **WeixBucks** closed-loop creator economy
- **BKSPC** on Solana as optional on-chain community/settlement layer

The architecture is deliberately hybrid: decentralize where it adds resilience, simulate where low-end hardware requires it.

---

## 3. Architecture (5 layers)

| Layer | Implementation |
|-------|----------------|
| Application | Nostr + Iroh + Solana (Phase 4) |
| Transport | TCP (relay sync) + UDP (local discovery) |
| Network | IPv4/IPv6 + town-based Nostr relay mesh |
| Link | Wi-Fi + optional BLE mesh (Phase 2+) |
| Physical | Tier 0 laptops, 2GB RAM minimum target |

Detailed mapping to Kurose & Ross: `docs/TOP_DOWN_APPROACH.md`

---

## 4. Current Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0 | ✅ Done | Rust backend, SQLite, Tauri 2 + React frontend |
| Phase 1 | ✅ Done | Nostr relay sync, posts, likes, follows |
| Phase 2 | ~90% | Iroh blobs, offline queue, BLE mesh planned |
| Phase 3 | ~75% | Communities, rewards, creator marketplace |
| Phase 4 | In progress | Solana BKSPC token, settlement, pump.fun launch |
| Phase 5 | Not started | NFT DJ mixes, scripture tools |

---

## 5. What an IEEE Reviewer Should Look At

| Topic | File |
|-------|------|
| Networking layer mapping | `docs/TOP_DOWN_APPROACH.md` |
| System architecture | `docs/architecture-blueprint.md` |
| Security / attack mitigations | `docs/security-considerations.md` |
| Economy model | `docs/economy-uniform-model.md`, `docs/tokenomics-policy.md` |
| BKSPC token launch | `docs/bkspc-pumpfun-launch.md` |
| Project status | `FLESHTHEORY.md` |

---

## 6. Repository Layout

```
BlkSpace/
├── Code-Companion/
│   ├── artifacts/blkspace/      # Tauri 2 app (React + Rust)
│   ├── artifacts/solana/        # Anchor/BKSPC token work
│   └── lib/                     # Shared packages
├── docs/                        # Architecture, security, economy
├── weixinfo/                    # 98 research notes
└── AGENTS.md, FLESHTHEORY.md    # Project operating context
```

---

## 7. Key Metrics / Constraints

- **Tier 0 target:** 2GB RAM, old CPU, 1 Mbps sustained
- **Daily WB earn cap:** 250
- **Fees:** 2% tip, 5% marketplace, 1% withdrawal settlement
- **BKSPC ratio:** 1,000 WB → 1 BKSPC (after eligibility)

---

## 8. Open Questions for Review

1. Does the town-based relay mesh provide sufficient decentralization for the stated threat model?
2. Is the economic model (earn-only WB + optional BKSPC settlement) compliant enough for student users?
3. How should the security model handle Nostr relay metadata leakage for sensitive coordination?

---

*Last updated: 2026-06-21*
