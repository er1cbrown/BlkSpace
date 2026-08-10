# Secure connectivity — three routes

**Goal:** Signed, campus-first connectivity without one kill-switch company — and without one spaghetti pipe.

```
Route A ∥ Route B ∥ Route C → secure WeixNet connectivity
```

| Id | Name | Transport | Local memory | Status |
|----|------|-----------|--------------|--------|
| **A** | Social mesh | Nostr relays + town/intranet tags | **Turso** (per device) | Live / partial |
| **B** | Resilient mesh | Optional Reticulum (RNS) | Separate RNS id | Optional |
| **C** | Play mesh | P2P + rollback (TLA class) | RAM sim only | Design locked |

**Turso is not in the mesh.** It stores what Route A (and match results from C) already accepted on *this* device.

## UI

**Mesh Test → 3 Routes** tab  
- Probe status for A / B / C  
- Code: `src/lib/secure-connectivity-routes.ts`  
- Panel: `SecureConnectivityRoutesPanel.tsx`

## Related

- [`sbf-rollback-netplay.md`](sbf-rollback-netplay.md) — Route C  
- [`../implementation/RETICULUM_INTEGRATION.md`](../implementation/RETICULUM_INTEGRATION.md) — Route B  
- [`../architecture-blueprint.md`](../architecture-blueprint.md) — Route A  

## Product AI

**None.** This is connectivity plumbing, not SpaceXAI / LLM product features.
