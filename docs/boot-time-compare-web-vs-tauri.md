# Boot / load-time compare — Web static vs Tauri (Yard / Full)

**Date:** 2026-08-08 (UTC) · **Host git:** `a2b3991`  
**Machine (this session):** macOS arm64 · ~8 GB RAM · 8 cores  
**Context:** Session served BlkSpace as a **static Python HTTP preview** of `dist/public` on `127.0.0.1:24442` after Vite HMR hung. Documenting measured web transfer times vs **documented / designed** Tauri boot targets before terminating that run.

**Related:** [`TIER0_DEV.md`](TIER0_DEV.md) · [`tier0-load-optimization.md`](tier0-load-optimization.md) · [`device-b-m0-results.md`](device-b-m0-results.md) · `src-tauri/src/tier0_benchmark.rs`

---

## What was running this session

| Mode | How | Port | Process RSS (spot) | Notes |
|------|-----|------|--------------------|--------|
| **Web static (measured)** | `python3 -m http.server 24442` over `artifacts/blkspace/dist/public` | `127.0.0.1:24442` | ~17 MB | Last production **build** of dist (index/assets dated ~Aug 3–5), **not** live Vite HMR of `a2b3991` source |
| **Vite dev** | `bunx vite … --port 24442` | — | — | **Failed / hung** (esbuild “service was stopped” / idle event-loop). Not usable for fair boot timing this session |
| **Tauri Yard / Full** | Desktop app (`tauri:dev` or release `.app`/`.msi`) | — | — | **Not launched** this session (no local release binary timed). Targets from docs + code |

---

## Measured — Web static document load (localhost)

Method: `curl` TTFB/total on HTML + listed entry assets (same machine as server → network ≈ 0).

### HTML document

| Metric | Value |
|--------|-------|
| Size | **3 587 B** |
| TTFB (sample) | **~0.6–0.8 ms** |
| Total time mean (n=10) | **~0.65 ms** |
| p95 (n=10) | **~0.68 ms** |

### Critical path assets (from `index.html`)

| Asset | Size | Total (sample) |
|-------|------|----------------|
| `assets/index-*.js` | ~203 KiB | ~1.0 ms |
| `assets/query-*.js` | ~45 KiB | ~0.8 ms |
| `assets/radix-*.js` | ~144 KiB | ~0.8 ms |
| `assets/icons-*.js` | ~23 KiB | ~0.8 ms |
| `assets/feed-*.js` | ~471 KiB | ~1.1 ms |
| `assets/index-*.css` | ~143 KiB | ~0.9 ms |
| **Sum (serial curl)** | **~1.0 MiB** | **~5.4 ms** |

### Estimates (transfer only, localhost)

| Model | Estimate |
|-------|----------|
| Serial waterfall (HTML + all listed assets) | **~6 ms** |
| Parallel (HTML + slowest asset) | **~2 ms** |

### What this does **not** include

- Browser parse / JS execute / React hydrate / first paint  
- Fonts, lazy route chunks, API/seed data after paint  
- Cold disk if dist not in page cache  
- Real campus Wi‑Fi / Windows Tier 0 disk  

**Practical takeaway:** for a **prebuilt** web shell on localhost, **network+serve is sub‑10 ms**. User-visible “app ready” is dominated by **JS parse + React + data**, typically **hundreds of ms–a few seconds** on good hardware — still usually **faster wall-clock than cold Tauri process start** (see below).

---

## Documented / designed — Tauri boot

Targets and architecture (not re-measured on this host this session):

### Product targets (Device B / Tier 0)

From `device-b-m0-results.md` + `tier0_benchmark.rs`:

| Metric | Target | What it measures |
|--------|--------|------------------|
| **App startup** | **&lt; 5 s** | Cold launch → usable shell (manual / Device B) |
| Feed load (50 posts) | **&lt; 2 s** | SQLite list after seed (in-process bench) |
| Post create | **&lt; 1 s** | DB write |
| Blob round-trip 512 KiB | **&lt; 30 s** | Local blob store |
| Memory (feed use) | **&lt; 500 MB** | Task Manager spot-check |
| CPU (feed use) | **&lt; 50%** | Spot-check |

### Startup shape (Yard vs Full)

| Build | Startup intent | Cost drivers |
|-------|----------------|--------------|
| **Yard** (`--no-default-features`, `VITE_TIER0_LITE`) | Thin shell: local yard, deferred relays/seed | SQLite migrate/open, WebView load of bundled assets, **1** relay deferred |
| **Full** (Iroh default) | Power path: mesh + blobs | Heavier binary, more crates, optional multi-relay / Iroh store |

From `tier0-load-optimization.md` / Yard work already shipped:

- Schema-versioned migrations (skip long ALTER chains on **warm** boot)  
- Relay connect: Full = parallel + ~6 s timeout; Yard = deferred (~300 ms)  
- Feed queries tab-gated (don’t fetch all feeds on first paint)

### Dev-time vs product-time (do not confuse)

| Path | Typical pain | Who feels it |
|------|--------------|--------------|
| `bun run tauri:dev` / full Iroh **compile** | Minutes–hours cold; multi‑GB `target/` | Developers |
| **Release** Yard installer | Aim &lt; 5 s cold start (Device B gate) | Students |
| `bun run dev` (Vite HMR) | Transform graph; **hung** this session | Devs only |
| **Static dist serve** (this run) | Sub‑ms document + ~ms assets localhost | Preview only |

---

## Side-by-side comparison (honest)

| Dimension | Web static (this run) | Tauri Yard (target / design) | Tauri Full (design) |
|-----------|------------------------|------------------------------|---------------------|
| **Process model** | Browser already open + tiny HTTP server | New OS process + WebView + Rust | Same + Iroh/mesh |
| **Document transfer (localhost)** | **~0.7 ms** HTML | N/A (assets from app bundle / custom protocol) | Same |
| **Asset transfer (localhost)** | **~2–6 ms** critical set | Bundle I/O (disk), not HTTP | Heavier if more features |
| **Cold “app usable” wall-clock** | **Not fully instrumented**; expected **&lt; 2–3 s** first paint on this Mac if browser warm | **&lt; 5 s** target (Device B) | Often **slower** than Yard if mesh boots eagerly |
| **Warm re-open** | Tab restore / cache | Skip migrations; SQLite warm | Same + optional mesh warm |
| **RSS server (this run)** | **~17 MB** Python static | App **&lt; 500 MB** target under feed use | Higher with Iroh |
| **Offline / local DB** | Web seed / limited | **Full** local SQLite + recovery keys | Full + P2P paths |
| **Fairness** | Dist may lag `main` source | Matches installer you ship | Lab / power users |

### Interpretation

1. **HTTP document load for static web is not the bottleneck** (~1 ms localhost).  
2. **Tauri’s extra cost is process + WebView + Rust init + DB**, not “HTML is slow.”  
3. **Yard exists so student cold start stays under ~5 s** while Full can pay for mesh later.  
4. **This session’s static preview is not a substitute for Device B Tauri timing** — fill `device-b-m0-results.md` on a real Yard install for ship gate.

---

## How to re-measure (next time)

### Web (production-like)

```bash
cd Code-Companion/artifacts/blkspace
bun run build:tier0          # or build
python3 -m http.server 24442 --bind 127.0.0.1 --directory dist/public
# then browser Performance: DOMContentLoaded / LCP
# or curl as above for transfer-only
```

### Tauri Yard cold start

```bash
# Release installer preferred over tauri:dev
# 1) Launch app → open /feed (marks feed interactive on process clock)
# 2) Sync Test → Performance → Run Tier 0 Benchmark
#    Metrics: Tauri shell ready (process) <3s, Feed interactive (process) <3s
# 3) Optional stopwatch: dock click → first interactive feed (legacy <5s Device B gate)
bun run test:tier0           # cargo: SQLite/blob gates only (no process boot marks)
```

Process marks live in `tier0_benchmark.rs` (`mark_process_start` / `mark_shell_ready` / `mark_feed_interactive`) and IPC `get_tier0_boot_timing`.

Record into [`device-b-m0-results.md`](device-b-m0-results.md) §6.

---

## Session actions after this doc

- Terminate static server on **port 24442** (this run).  
- Vite HMR remains unreliable under memory pressure here; prefer **`build` + static serve** or **CI/release Yard** for demos.

---

## Summary table (one glance)

| Path | Document TTFB (this host) | Critical assets (localhost) | Cold “usable app” target / expectation |
|------|---------------------------|-----------------------------|----------------------------------------|
| Web static preview | **~0.7 ms** | **~2–6 ms** transfer | First paint not instrumented; usually &lt; few s |
| Tauri Yard | n/a (bundled) | disk WebView load | **&lt; 5 s** (Device B gate) |
| Tauri Full | n/a | disk + mesh | Higher; defer mesh for Tier 0 |
| Vite dev (this session) | **failed** | — | Do not use for boot claims |

**Bottom line:** Web static **loads documents extremely fast** on localhost; Tauri **should still hit &lt; 5 s cold** on Yard by design, but pays for a real desktop runtime and local database. This run **measured web transfer only** and **did not time a Tauri process boot**.
