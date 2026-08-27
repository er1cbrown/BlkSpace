# Theory of computing & scale (entry point)

**Full analysis (matrices, asymptotics, competitor space/time table):**  
→ [`features/scale-matrix-complexity-compare.md`](features/scale-matrix-complexity-compare.md)

## One-paragraph summary

BlkSpace models the campus social system as a **sparse graph** \(A\) that is approximately **block-diagonal by yard** (not a dense \(N_u \times N_u\) matrix). Personas are **sparse weight vectors** over shared **domain features** \(\mathbf{f}\) (scholarship, fashion, finance, ΩΨΦ / org, tribute, …)—so **N users** and **N personas** share one product.

**n users · Ω(n) use cases:** the use-case palette \(U\) is **O(1)** (wall, video, MyYard, tribute, Connect, Arcade, ClinYard, org). Serving \(n\) users is \(\Theta(n|U|)=\Theta(n)\). That **meets** \(\Omega(n)\) (every user \(n\) must be touchable) and **forbids** \(\Omega(n^2)\) (a new app per persona). Code: `USE_CASE_PALETTE` in `mesh-skeleton.ts`.

Client **space** is bounded by local DB windows and selective media (Tier 0); **time** for feed/connect stays local \(O(|V_y| d_y)\) rather than global flood \(O(N_u)\) per event. Settlement (BKSPC / BI9) is a **rare** map, not chain-per-action.

## Formal quantities

| Symbol | Meaning |
|--------|---------|
| \(N_u\) | Users |
| \(N_y\) | Yards |
| \(d\) | Avg degree (follows / memberships) |
| \(N_p^{(y)}\) | Posts in yard \(y\) |
| \(A_y\) | Within-yard adjacency (sparse) |
| \(\mathbf{w}_i\) | Persona / preference weights |
| \(\mathbf{f}(item)\) | Domain feature vector of an opp/org/post |

## Implementation map (code)

| Idea | Code |
|------|------|
| Domain feature vector \(\mathbf{f}\) | `src/lib/opportunity-domains.ts` |
| Sparse rail ranking \(A_y\)-local + follow affinity | `ConnectDiscoveryRail` + `src/lib/sparse-rank.ts` |
| Yard scale metrics \((N_o, N_{\mathrm{opp}}, \ldots)\) | `src/lib/yard-scale-metrics.ts` · optional UI chip on feed |
| Block structure / federation | `docs/federated-college-towns.md` · town tags |

## Related product docs

- [`features/four-pillar-economy.md`](features/four-pillar-economy.md)  
- [`architecture-blueprint.md`](architecture-blueprint.md)  
- IEEE use cases under `features/use-case-*.md`  
