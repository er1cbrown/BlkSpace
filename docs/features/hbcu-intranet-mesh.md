# HBCU Intranet Mesh — how all yards connect

## Short answer

**103 yards do not open 103×102 private tunnels.**  
They share an **intranet backbone** on Nostr relays:

| Tag | Role |
|-----|------|
| `t:hbcu-intranet` | **Backbone** — every BlkSpace social note; all HBCUs |
| `t:blkspace` | App identity |
| `t:hbcu-town:<id>` | **Campus partition** — TSU, Howard, Xavier, … |

Clients connect to the **same relay set**. Background sync (~60s) pulls backbone + home yard. Bridge feed shows cross-yard traffic.

```
103 yards × 1 shared wire  ≈  connected intranet
103 yards × full mesh      ≈  ~5,253 links (we do NOT do this)
```

## Layers

1. **Wire** — Public (or town) Nostr relays WebSocket  
2. **Intranet** — `hbcu-intranet` + `blkspace` tags (platform-wide)  
3. **Campus LAN** — `hbcu-town:tsu` etc. for local feed  
4. **Media** — Iroh CIDs on notes (optional Full build)  
5. **Offline** — SQLite queue → flush when online  

## What ships in code

| Piece | Behavior |
|-------|----------|
| Post publish | Tags town + `blkspace` + `hbcu-intranet` |
| App start | Seeds subscriptions for intranet tags |
| `join_hbcu_intranet` | Connect path: backbone + home yard |
| `get_hbcu_intranet_status` | UI / Sync Test health |
| Welcome join | Calls `ensureIntranetConnected(homeYard)` |
| Bridge feed | Cross-yard discovery on intranet |

## Not this

- BLE dorm mesh as primary transport  
- Auto full-firehose of every yard into every client  
- Institutional campus VPN / school SSO  

## Operator notes

- **Town relays (future):** may only accept their `hbcu-town:<id>`; still should forward or mirror `hbcu-intranet` for Bridge.  
- **Harvest nodes:** pin CIDs; earn WB for uptime.  
- **Clients:** join home yard + intranet; extra yards only if user follows/subscribes.
