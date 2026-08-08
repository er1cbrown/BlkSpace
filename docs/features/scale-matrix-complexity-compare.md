# Scale via linear algebra & theory of computing  
## BlkSpace space/time model vs competing stacks

**Status:** Analytical framework (IEEE-style) — maps product claims to formal cost models · **implemented hooks** in `opportunity-domains.ts`, `sparse-rank.ts`, `yard-scale-metrics.ts`, `ConnectDiscoveryRail`  
**Audience:** Systems review, campus pilot sizing, comparison to Fizz / IG / LinkedIn / Discord / pure Nostr / SocialFi  
**Entry point:** [`../theory-of-computing-scale.md`](../theory-of-computing-scale.md)  
**Related:** [`../architecture-blueprint.md`](../architecture-blueprint.md) · [`../federated-college-towns.md`](../federated-college-towns.md) · [`four-pillar-economy.md`](four-pillar-economy.md)

---

## 1. Problem statement

At scale we care about:

| Quantity | Meaning |
|----------|---------|
| \(N_u\) | Users (handles / keys) |
| \(N_y\) | Yards (campuses / towns) |
| \(N_o\) | Orgs (purpose groups) |
| \(N_p\) | Posts / events in a window |
| \(N_k\) | Opportunity applications (interests) |
| \(d\) | Avg degree (follows / memberships) |
| \(B\) | Blob bytes (media) |
| \(R\) | Relays in a mesh |

**Goal:** Show how BlkSpace’s **partitioned** design bounds **time and space** relative to global-flood social and chain-first social, using:

- **Linear algebra** — state as vectors/matrices; ranking as sparse ops  
- **Theory of computing** — asymptotic complexity, locality, automata for workflows  

---

## 2. State as vectors and matrices (linear algebra)

### 2.1 User state vector

Each user \(i\) has a feature vector (illustrative):

\[
\mathbf{u}_i =
\begin{bmatrix}
\text{yard one-hot} \\
\text{org membership sparse} \\
\text{XP / tier} \\
\text{Yard Cred scalar} \\
\text{WB balance} \\
\text{MIDF / risk} \\
\text{interest domain tags}
\end{bmatrix}
\in \mathbb{R}^{m}
\]

- **Space per user:** \(O(m)\) with \(m\) small and **sparse** (few orgs, few tags).  
- **Not** a dense embedding of the whole network on Tier 0 clients.

### 2.2 Social graph

Follow / membership graph \(G=(V,E)\), adjacency matrix \(A \in \{0,1\}^{N_u \times N_u}\):

- Dense \(A\): \(\Theta(N_u^2)\) **space** — impossible on student devices and global flood relays.  
- BlkSpace practice: **sparse** \(A\) stored as adjacency lists; \(\|A\|_0 \approx N_u \cdot d\).

**Space:** \(O(N_u \cdot d)\) with \(d \ll N_u\) (typical campus \(d\) tens–hundreds, not millions).

### 2.3 Yard partition (block structure)

Order users by yard. Then \(A\) is **approximately block-diagonal**:

\[
A \approx
\begin{bmatrix}
A_{y_1} & \varepsilon_{12} & \cdots \\
\varepsilon_{21} & A_{y_2} & \cdots \\
\vdots & & \ddots
\end{bmatrix}
\]

- \(A_{y}\) = within-yard graph  
- \(\varepsilon\) = rare cross-yard (Bridge / explicit follows)

Town tag enforcement ≈ **projecting** events onto yard subspaces:

\[
P_y e = e \quad\text{iff event is tagged yard } y
\]

Cross-town summaries (kind 1030) ≈ **low-rank** or **aggregated** messages between blocks, not full \(A_{ij}\) flood.

**Complexity win:** work per town \(\approx O(|V_y| \cdot d_y + |E_y|)\), not \(O(N_u^2)\).

### 2.4 Persona as linear combination (N personas)

A “persona” is not a separate product; it is a **sparse mask / weight vector** \(\mathbf{w}\) on domains:

\[
\text{score}(item, i) = \mathbf{w}_i^\top \mathbf{f}(item) + \mathbf{u}_i^\top M \mathbf{f}(item)
\]

Examples:

| Persona | Large weights in \(\mathbf{w}\) |
|---------|----------------------------------|
| ΩΨΦ / fellowship | scholarship, service, professional org |
| Fisk finance | finance, literacy, career |
| Jimmy fashion | fashion, studio, marketplace |

**N personas** = N different \(\mathbf{w}\) (or learned sparse \(\mathbf{w}\)), **same** feature space \(\mathbf{f}\).  
**Space:** \(O(|\text{domains}|)\) per user preference, not a fork per persona.

### 2.5 Feed / FYP ranking (sparse matvecs)

Naive “global FYP” often looks like:

\[
\mathbf{r} = A \mathbf{s} \quad\text{or}\quad \mathbf{r} = A^k \mathbf{s}
\]

(personalized PageRank / multi-hop interest).

- Dense or global: **time** \(O(N_u \cdot d)\) per ranking pass over whole graph — expensive at web scale, catastrophic if every client recomputes.  
- BlkSpace Yard path: rank **inside** \(A_y\) (+ local DB posts + Connect rail queries):

\[
\mathbf{r}_y = A_y \mathbf{s}_y
\quad\Rightarrow\quad
\text{time } O(|V_y| d_y),\quad
\text{space } O(|V_y| + |E_y|)
\]

ConnectDiscoveryRail ≈ **hard filters** (boolean projection) + sort by yard locality — **not** full neural FYP on-device.

### 2.6 Credibility as a linear (then clipped) form

Yard Cred (simplified) is already a **linear combination of features** with caps:

\[
c_i = \sum_j \alpha_j \cdot \phi_j(i),\quad c_i \leftarrow \mathrm{clip}(c_i, 0, 100)
\]

- **Time:** \(O(1)\)–\(O(q)\) SQL aggregates per user (completions, endorsements, orgs).  
- **Space:** \(O(1)\) stored score + sparse event logs.  
- **Not** a dense reputation matrix \(R \in \mathbb{R}^{N_u \times N_u}\) (that would be \(O(N_u^2)\)).

WB progression v2: per-category day counts + diminishing returns ≈ **diagonal damping** of earn rate:

\[
g' = \frac{g}{1 + 0.15\, n_{\text{cat}}}
\]

Diagonal ops are \(O(1)\) per grant — scalable.

### 2.7 Economy circulation (conservation sketch)

Think of soft WB as a **flow** on a graph with sources (earn) and sinks (fees/burns):

\[
\mathbf{b}_{t+1} = \mathbf{b}_t + E_t\mathbf{1} - F_t\mathbf{1}
\]

Caps and MIDF are **nonlinear projectors** that keep \(\mathbf{b}\) in a feasible set (anti-farm).  
Settlement to BKSPC is a **rare, gated** map \(S: \text{eligible subset} \to \text{chain}\), not every social action.

---

## 3. Theory of computing: models and bounds

### 3.1 What problem class is “campus social + connect”?

| Subproblem | Model | Complexity (local yard) |
|------------|--------|-------------------------|
| Append post | Write to log / DB | Amortized \(O(1)\)–\(O(\log N_p)\) with indexes |
| List feed page | Range query by time/town | \(O(k + \log N_p)\) with index |
| Interest apply | Insert + notify leads | \(O(1)\) + \(O(\ell)\) notifies |
| Match rail filter | Scan open opps + tag match | \(O(N_{\text{opp}})\) small; or index by domain \(O(k)\) |
| Global “everyone sees everything” | Broadcast | \(\Omega(N_u)\) per event — **avoided** |
| Full graph reputation | Dense \(R\) | \(O(N_u^2)\) space — **avoided** |

### 3.2 Automata view of persona workflows (finite control)

Each use case is a **finite-state workflow** (regular structure), not arbitrary Turing computation on the client:

```text
Jimmy:   Idle → Portfolio → List → Fulfill → Cred↑
ΩΨΦ:     Idle → Org → Opp → Review → Complete → Cred↑
Finance: Idle → Literacy → Opp → Apply → (no trade)
```

- **Space:** \(O(1)\) control state + user DB rows.  
- **Decidable / checkable:** eligibility predicates (age, Cred, caps) are **Boolean combinations** of counters — easy to audit (IEEE reproducibility).

### 3.3 Communication complexity (why federation matters)

If every event is sent to every user:

\[
\text{bits} \approx N_p \cdot N_u \cdot s
\]

Federated towns with local relays:

\[
\text{bits} \approx \sum_y N_p^{(y)} \cdot N_u^{(y)} \cdot s
+ \underbrace{N_{\text{bridge}} \cdot s_{\text{summary}}}_{\text{cross-town}}
\]

With \(N_u^{(y)} \approx N_u / N_y\) under even split:

\[
\sum_y N_u^{(y)2} \;\ll\; N_u^2
\quad\text{when } N_y \text{ grows}
\]

This is the formal version of “**not O(N²) flood**” in federated-college-towns.md.

### 3.4 Space hierarchy (where data lives)

| Tier | Store | Typical space | Who pays |
|------|--------|---------------|----------|
| Tier 0 client | Local SQLite/Turso + app | Feed window + blobs policy | Student laptop RAM/disk |
| Yard | Membership, local posts | \(O(|V_y| + |E_y| + N_p^{(y)})\) | Device / optional small relay |
| Full / Iroh | Content-addressed blobs | \(O(B)\) selective pin | Creator + pins |
| Chain (BKSPC) | Settlement txs | \(O(\#\text{withdrawals})\) rare | Network fees / counsel path |

**Tier 0 invariant:** mandatory path must not require global \(A\) or full media graph in RAM.

### 3.5 Computational hardness we deliberately *don’t* solve on-device

| Hard / heavy | Competitors sometimes do | BlkSpace stance |
|--------------|--------------------------|-----------------|
| Global dense recsys | Large-scale matrix factorization / DNN FYP | Local + Connect filters first |
| On-chain every like | L2 spam / gas | Soft WB off-chain |
| Global Sybil graph mining | Datacenter | MIDF local + Cred gates |
| Full-text global search | Central index | Yard/org scoped queries |

---

## 4. Competitive space–time comparison

Legend: **S** = space at operator or client for core social loop; **T** = time to first useful feed; **G** = global consistency cost.

| System | Core model | Client space (order) | Sync / fanout | Cross-campus | Identity / trust | Soft economy | Notes vs BlkSpace |
|--------|------------|----------------------|---------------|--------------|------------------|--------------|-------------------|
| **Instagram / TikTok** | Central graph + recsys | App + CDN cache \(O(\text{window})\) | Datacenter \(O(E)\) train + serve | Global by default | Account, not campus-partitioned | Ads / IAP | Excellent T for FYP; **not** campus-partitioned; opaque ranking |
| **Fizz** | Campus-scoped social (central) | Light app | Central | Campus | Semi-anon culture | Weak portfolio/commerce | Low friction; **weak** portable Cred / multi-yard brand trail |
| **Discord** | Guild channels | Cache per guild | Per-server | Invite graphs | Server roles | Boosts | Great for orgs; **not** unified Cred/settlement; discovery weak |
| **LinkedIn** | Global professional graph | Heavy | Central \(A\) large | Global | Strong real-name | Premium | Strong jobs graph; **not** HBCU yard mesh or soft campus commerce |
| **Pure global Nostr** | Event flood / relays | Relay-dependent | Can approach \(O(N_p N_{\text{sub}})\) | Unbounded without tags | Keys | Wallets optional | Free; **O(N²)-class pain** without partitions |
| **SocialFi / token-first** | Chain + social | Wallet + chain state | Every action may hit chain | Global | Keys + token | Speculative | High G; **poor** Tier 0; retention risk |
| **BlkSpace Yard** | **Block-diagonal \(A_y\)** + local DB | \(O(\text{local } N_p + \text{blobs policy})\) | Local first | Explicit Bridge | Keys + Cred | WB + gated settlement | Optimizes **campus S/T**; FYP secondary to Connect |
| **BlkSpace Full** | Yard + Iroh pins | Larger \(B\) | P2P + relays | Stronger mesh | Same | Same | Higher S for creators/labs |

### 4.1 Asymptotic sketch (core social write)

| Design | Cost of one post reaching “relevant” users |
|--------|-----------------------------------------------|
| Global fanout | \(\Theta(N_u)\) deliveries worst case |
| Single global relay interest match | \(\Theta(N_{\text{subs}})\) |
| **Yard-tagged local** | \(\Theta(N_u^{(y)})\) or local DB only for offline-first |
| Chain-per-post | \(\Omega(\text{consensus})\) latency + fees |

### 4.2 Space comparison (operator)

| | Global social | Federated yards (BlkSpace target) |
|--|---------------|-------------------------------------|
| Graph store | \(O(N_u d)\) one pile | \(\sum_y O(N_u^{(y)} d_y)\) shardable |
| Viral global | Must hold hot set globally | Replicate summaries / bridges only |
| Media | Global CDN \(O(B)\) | Selective Iroh/local pin \(O(B_{\text{used}})\) |

### 4.3 Where BlkSpace wins / loses

| Wins (space/time/theory) | Loses (honest) |
|--------------------------|----------------|
| Avoids dense \(A\) and global flood | Central apps win raw FYP quality |
| Persona = sparse \(\mathbf{w}\), N personas without N apps | Recsys maturity lower |
| Cred = linear features \(O(1)\) | Network effects still require real \(N_u^{(y)}\) |
| Settlement rare → small chain footprint | Commerce/escrow UX still maturing |
| Tier 0 explicit space budget | Unsigned install / empty yard hurt adoption |

---

## 5. Scaling roadmap (matrix-aligned)

| Phase | Linear-algebra / ToC move | Engineering |
|-------|---------------------------|-------------|
| **Now** | Keep \(A\) block-diagonal; rail = sparse filters | Town tags, Connect indexes, local SQLite |
| **Next** | Domain feature vector \(\mathbf{f}\) on opps (not only regex) | `domain[]` column; index by domain |
| **Next** | Local \(\mathbf{r}_y = A_y s_y\) for following feed | Explicit sparse follow matvec metrics |
| **Later** | Cross-yard \(\varepsilon\) as low-rank bridge | Kind 1030 / bridge quotas |
| **Later** | Learned \(\mathbf{w}_i\) from interests (still sparse) | On-device or yard-level, not global DNN |
| **Never (Tier 0)** | Dense \(R\) or full \(A^k\) on client | — |

### Sizing example (order-of-magnitude)

Assume 50 yards × 2,000 active users × \(d=40\) follows:

- Edges: \(50 \times 2000 \times 40 = 4\times 10^6\) — fine sharded.  
- One global dense block: \(10^5\) users → \(10^{10}\) potential pairs — not stored.  
- Connect opps per yard: hundreds → rail scan \(O(N_{\text{opp}})\) fine; index when \(>10^4\).

---

## 6. IEEE evaluation hooks

| Criterion | How this doc helps |
|-----------|-------------------|
| Contribution | Formalizes campus federation as **block structure + sparse persona weights** |
| Soundness | Explicit space/time bounds vs flood and chain-per-action |
| Comparison | Table vs IG, Fizz, Discord, LinkedIn, Nostr, SocialFi |
| Reproducibility | Quantities \(N_u, N_y, d\) measurable in pilots |
| Honesty | States FYP/recsys gap vs centralized apps |

**Pilot metrics to collect:**

- \(|V_y|, |E_y|, N_p^{(y)}, N_{\text{opp}}\) per yard  
- p95 feed load, DB size on Tier 0  
- Fraction of sessions using Connect rail vs pure FYP  
- Cross-yard \(\varepsilon\) rate (should stay ≪ 1)

---

## 7. Bottom line

1. **Scale** is processed by treating the social system as a **sparse, yard-block-diagonal graph** plus **small feature vectors** for users/items—not a dense global matrix.  
2. **N users** scale with \(O(N_u d)\) edges and local DB windows; **N personas** scale as **sparse weight vectors** over shared domains.  
3. **Space** is spent on **local logs, memberships, selective blobs, rare settlement**—not global reputation matrices or per-like chain state.  
4. **Competitors** win on polished global recsys or ultra-light anonymous campus chat; BlkSpace’s theoretical niche is **partitioned campus mesh + composable credibility/commerce** with **sub-quadratic** federation and **Tier 0-bounded** client space.

This is the start of a **processing/scale theory** for BlkSpace; next engineering step is domain feature vectors + measured \((N_u, N_y, d)\) from real yard pilots.
