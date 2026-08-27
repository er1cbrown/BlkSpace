# Perfect mesh skeleton

**Status:** Canonical topology (2026-08-26)  
**Job:** One **intra-connected** network that **scales onto the internet** without a full pairwise mesh.

A “good skeleton” is rooms in the app.  
A **perfect skeleton** is how **user \(n\)** on any device talks to the rest: same tags, more pipes, never \(N_u^2\).

**Code:** `src/lib/mesh-skeleton.ts`  
**Related:** [`architecture-blueprint.md`](architecture-blueprint.md) · [`federated-college-towns.md`](federated-college-towns.md) · [`features/secure-connectivity-three-routes.md`](features/secure-connectivity-three-routes.md) · [`implementation/MESH_ARCHITECTURE.md`](implementation/MESH_ARCHITECTURE.md)

---

## 1. One network, four scale rungs

Not four products. One social graph, **wider pipes**.

```
[device Turso]     offline cache — not a peer
        │  flush when a path exists
        ▼
[rung 1  TOWN]     t:hbcu-town:<id>     intra-campus
        │  same relays, extra tag
        ▼
[rung 2  INTRANET] t:hbcu-intranet      all HBCU yards, still not pairwise
        │  public Nostr + Iroh when WAN is up
        ▼
[rung 3  INTERNET] same events, public relays / CID fetch
        │
        ├─ optional B  Reticulum when easy net fails
        └─ optional C  play P2P; results re-enter A as signed events
```

| Rung | Name | Tag / pipe | What user \(n\) gets |
|---|---|---|---|
| 0 | Device | SQLite / Turso | Read last yard offline; queue posts |
| 1 | Town | `t:hbcu-town:tsu` | Intra-connected campus wall |
| 2 | Intranet | `t:hbcu-intranet` + `t:blkspace` | Other yards without \(Y(Y-1)/2\) tunnels |
| 3 | Internet | Public Nostr WS + Iroh | Same posts on the WAN |

**Internet is not a new app.** It is rung 3 of the same mesh: the event already has town + intranet tags; a public relay + blob fetch is enough.

---

## 2. Intra-connected (what “working mesh” means)

Intra = **inside a town first**, then **between towns on a backbone**, not every laptop to every laptop.

```
TSU phones/laptops ──┐
                     ├── town relay(s) ── intranet tag ── other yards
FAMU …               ┘         │
                               └── internet relays (when online)
```

**Always on every social note:**

```
t:blkspace
t:hbcu-intranet
t:hbcu-town:<yard>
```

- Town feed: subscribe town tag.  
- Bridge / other yards: subscribe intranet.  
- Follow a person in another town: pull that pubkey (explicit), not the whole town firehose.

Kind `1030` trending summaries are **optional compression**, not a second network.

---

## 3. Why this scales (and pairwise does not)

Let \(Y\) = yards, \(N_u\) = users, \(d\) = degree in a town.

| Design | Links / work |
|---|---|
| Full user mesh | \(\Theta(N_u^2)\) — **forbidden** |
| Full yard mesh | \(\Theta(Y^2)\) tunnels — **forbidden** |
| **This skeleton** | \(O(\text{relays})\) connections per client + tag partition \(O(\|V_y\| d_y)\) per town |

100 HBCUs do **not** need 4,950 private bridges. They share the **intranet tag** on a small relay set. That is the perfect skeleton.

---

## 4. Three routes stay parallel (do not merge)

| Route | Role in the skeleton |
|---|---|
| **A** Social | Default: Nostr + tags + Iroh blobs. This *is* the internet-connected mesh. |
| **B** Reticulum | Spare rib: hard-path notes when A’s internet dies. Not the feed. |
| **C** Play | Fight/netplay. Match results **sign into A**. Not Connect, not MyYard. |

Connect, ClinYard, Arcade, BI9, rustytemple **ride Route A** (identity + tags). They are rooms. They are not extra meshes.

---

## 5. What is already a skeleton vs still soft

| Piece | Skeleton? | Working intra → internet? |
|---|---|---|
| Town + intranet tags in clients | **Yes** (`hbcu-intranet.ts`) | Posts must actually carry all three tags on publish |
| Join intranet + default relays | **Yes** (Tauri `join_hbcu_intranet`) | Web preview is **not** the mesh |
| Offline queue → flush | **Yes** | Device → town when A is up |
| Iroh CID on notes | Partial | Internet blob fetch when Full build |
| Reticulum B | Optional probe | Not required for scale |
| Town relays that **reject** missing town tags | Spec | Must be true on real town strfry, not only public Damus |
| MyYard / song / video for user \(m\) on another device | Partial | Must be events + CIDs on A, not only localStorage |

**Perfect skeleton gate:** a post made on a TSU laptop appears (1) on another TSU device on the same LAN/relay, (2) on a Howard client via intranet tag, (3) on a phone with public internet, **without** building TSU↔Howard as a custom bridge.

---

## 6. Product rule

Do not add a fifth mesh (BLE-as-home, libp2p-as-home, HyperEVM-as-social).  
BLE / RNS / play are **rungs or ribs**. Social truth is **signed Nostr + town/intranet tags + Iroh**. That is how intra becomes internet: **same object, bigger pipe.**

---

## 7. n users optimized for Ω(n) use cases

Palette \(U\) is fixed (guest wall, X-style video, visit/own MyYard, tribute, Connect, Arcade, ClinYard, org/Ω).  
User \(n\) is a weight vector on \(U\), not a fork.

\[
\text{work}(n) = \Theta(n \cdot |U|) = \Theta(n)
\quad\text{since } |U| = O(1)
\]

- \(\Omega(n)\): you cannot skip a user and still say they have a yard life.  
- \(O(n)\): same rooms, yard-local rank.  
- **Not** \(\Omega(n^2)\): no pairwise mesh, no “Dolly app” + “meme app” + “ΩΨΦ app”.

Code: `USE_CASE_PALETTE` in `src/lib/mesh-skeleton.ts`.
