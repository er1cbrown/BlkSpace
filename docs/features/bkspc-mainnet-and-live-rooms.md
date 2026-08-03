# BKSPC mainnet path + Yard Live Rooms

## BKSPC (mainnet-ready settlement UI)

| Layer | Role |
|-------|------|
| **WeixBucks (WB)** | Soft credits — earn/spend in-app |
| **BKSPC** | Optional Solana settlement after Cred gates |

### Config

| Source | Keys |
|--------|------|
| Build env | `VITE_SOLANA_CLUSTER=mainnet-beta` · `VITE_BKSPC_MINT=<mint>` · `VITE_BKSPC_PUMPFUN=<url>` |
| Operator UI | Earnings → BKSPC panel → “operator network settings” |

Default cluster remains **devnet** until you switch. Empty mint = not launched (honest UI).

### Wallet

- **BkspcMainnetPanel** — cluster badge, WB→BKSPC estimate, gates copy, explorer/pump.fun links  
- Withdraw dialog shows **cluster + mint** status (not “always devnet”)  
- Wallet adapter endpoint follows `getBkspcConfig().cluster`

### Not included (by design)

- Auto-launch on pump.fun  
- Guaranteed mainnet withdraw without mint + Tauri settlement feature  
- Legal opinion (counsel still required)

---

## Live rooms (Discord / Slack-style)

**Where:** Yard → **Live** tab  

| Room type | Connectivity |
|-----------|----------------|
| **Stage** | In-app iframe → [Jitsi Meet](https://meet.jit.si) (video + screen) |
| **Voice** | Same Jitsi (audio-first room name) |
| **External** | Paste Discord / Zoom / YouTube / Twitch / Meet / .edu HTTPS link |

### Storage

Rooms + soft presence in `localStorage` (`blkspace_yard_live_rooms_v1`) per yard id.

### Not included

- Native RTMP / TikTok-style broadcast ingest  
- Server-side SFU (uses public Jitsi)  
- Persistent multi-device presence mesh  

---

## Related

- [`brand-trademark-and-bkspc-rights.md`](brand-trademark-and-bkspc-rights.md)  
- [`bkspc-pumpfun-launch.md`](../bkspc-pumpfun-launch.md)  
- [`media-upload.md`](media-upload.md) — VOD files, not live  
