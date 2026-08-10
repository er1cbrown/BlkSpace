# rustytempleOS

**er1cbrown version** — educational systems project in **Rust**, inspired by TempleOS / HolyC *ideas* (tiny interactive machine, own tools, simplicity).

| | |
|--|--|
| **Status** | Phase 0–1 scaffold · **active focus** |
| **Not** | Official TempleOS · HolyC binary rehost · BlkSpace fork |
| **License** | MIT (this tree’s original code) |

---

## Relation to BlkSpace

| Project | Role |
|---------|------|
| **BlkSpace** (parent monorepo social app) | Campus amalgamation social · MySpace/yards/economy · **DevOps / active feature work paused** while focus is here |
| **rustytempleOS** (this directory) | Systems lab / OS playground · bleeding-edge craft |

BlkSpace code stays in the monorepo; we are **not deleting** it or its CI. Focus for new work = **this directory**.

Optional later: demo a hosted binary or WASM build on BlkSpace Hub/Play — not required for Phase 1.

---

## Quick start

```bash
cd rustytempleOS
cargo run -p rtos-shell
```

Then: `help` · `about` · `version` · `quit`

```bash
cargo test -p rtos-shell
```

---

## Tracks (do not boil the ocean)

| Track | Name | Now |
|-------|------|-----|
| **H** | Hosted playground | `rtos-shell` REPL |
| **K** | Kernel lab (QEMU freestanding) | not started |
| **L** | HolyC-inspired language subset | not started |
| **C** | Docs / culture / non-goals | `docs/` |

See [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Non-goals (integrity)

- Not a 1:1 TempleOS source dump with a Rust coat  
- Not “AI social OS” / not SpaceXAI product  
- Not replacing Linux for daily driving in Phase 1–5  
- Not BlkSpace DevOps (CI installers, signing, Pages) in this tree  

---

## Layout

```
rustytempleOS/
├── Cargo.toml              workspace
├── crates/rtos-shell/      hosted interactive shell
├── docs/ROADMAP.md
└── README.md
```
